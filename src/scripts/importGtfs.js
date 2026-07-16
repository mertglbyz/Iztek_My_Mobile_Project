const fs = require('fs');
const readline = require('readline');
const path = require('path');

const GTFS_DIR = path.join(__dirname, '../data/gtfs-raw');
const OUT_DIR = path.join(__dirname, '../data/gtfs');

// Ensure output dir exists
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

// ------------------------------------------------------------------
// UTILITY: Stream-based CSV/TXT Parser (Memory Efficient limit)
// ------------------------------------------------------------------
async function parseGtfsFile(filename, onRowCallback) {
    const filePath = path.join(GTFS_DIR, filename);
    if (!fs.existsSync(filePath)) {
        return { success: false, status: 'not_found', rowCount: 0 };
    }

    console.log(`[INFO] İşleniyor: ${filename}...`);
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let headers = null;
    let rowCount = 0;

    for await (const line of rl) {
        if (!line.trim()) continue;

        let row = [];
        let insideQuotes = false;
        let currentValue = "";

        // GTFS comma parser with quote support
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                row.push(currentValue.trim());
                currentValue = "";
            } else {
                currentValue += char;
            }
        }
        row.push(currentValue.trim());

        if (!headers) {
            // Trim and clean BOM characters from headers
            headers = row.map(h => h.replace(/^\uFEFF/g, '').replace(/[^a-zA-Z0-9_]/g, ''));
        } else {
            const rowObj = {};
            headers.forEach((h, i) => {
                rowObj[h] = row[i] || "";
            });
            onRowCallback(rowObj);
            rowCount++;
        }
    }
    return { success: true, rowCount };
}

// ------------------------------------------------------------------
// MAIN EXECUTION FLOW
// ------------------------------------------------------------------
async function runImport() {
    const report = {
        executionTime: new Date().toISOString(),
        filesProcessed: {},
        stats: {
            routesCount: 0,
            representativeTripsCount: 0,
            totalTripsFound: 0,
            gtfsStopsCount: 0,
            shapePointsCount: 0
        },
        warnings: []
    };

    console.log("=== İZTEK GTFS COMPILER BAŞLATILIYOR ===");

    // EK DOSYA KONTROLLERİ (agency, feed_info, calendar_dates)
    report.filesProcessed['agency.txt'] = await parseGtfsFile('agency.txt', (row) => { });
    report.filesProcessed['feed_info.txt'] = await parseGtfsFile('feed_info.txt', (row) => { });
    report.filesProcessed['calendar_dates.txt'] = await parseGtfsFile('calendar_dates.txt', (row) => { });

    // 1. ROUTES.TXT
    const routesData = {}; // { route_short_name: { id, shortName, longName, routeType } }
    const routeIdToShortName = {}; // internal gtfs_id -> Hat Numarası map'i

    const resRoutes = await parseGtfsFile('routes.txt', (row) => {
        const shortName = row.route_short_name;
        routeIdToShortName[row.route_id] = shortName;

        routesData[shortName] = {
            id: shortName,
            gtfsInternalId: row.route_id,
            shortName: shortName,
            longName: row.route_long_name,
            routeType: row.route_type
        };
        report.stats.routesCount++;
    });
    report.filesProcessed['routes.txt'] = resRoutes;

    // 2. TRIPS.TXT -> Store ALL trips
    const allTrips = {}; // { trip_id: { routeShortName, direction_id, shape_id } }
    const tripsMaxStops = {}; // { routeShortName: { "0": { maxCount: 0, bestTripId: null, shapeId: null } } }

    const resTrips = await parseGtfsFile('trips.txt', (row) => {
        report.stats.totalTripsFound++;
        const routeId = row.route_id;
        const shortName = routeIdToShortName[routeId];

        if (!shortName) return; // Rota yoksa atla

        const dirId = row.direction_id || "0";
        const tripId = row.trip_id;
        const shapeId = row.shape_id;
        const serviceId = row.service_id;

        allTrips[tripId] = { routeShortName: shortName, directionId: dirId, shapeId, serviceId };
    });
    report.filesProcessed['trips.txt'] = resTrips;

    // 2.5. STOP_TIMES.TXT (PASS 1) -> Temsilci seferleri bulmak ve Kalkış Saatlerini (Departures) ayıklamak için sayım yap
    console.log("Sefer uzunlukları ve Kalkış Saatleri analiz ediliyor...");
    const tripCounts = {};
    const tripStarts = {}; // { tripId: { minSeq: 999, time: "06:00:00" } }

    await parseGtfsFile('stop_times.txt', (row) => {
        tripCounts[row.trip_id] = (tripCounts[row.trip_id] || 0) + 1;

        const seq = parseInt(row.stop_sequence, 10);
        if (!tripStarts[row.trip_id] || seq < tripStarts[row.trip_id].minSeq) {
            tripStarts[row.trip_id] = { minSeq: seq, time: row.departure_time };
        }
    });

    const representativeTrips = {}; // { trip_id: { routeShortName, directionId, shapeId } }

    // Her Hat ve Yön için en fazla durağı olan Trip'i seç
    for (const [tripId, count] of Object.entries(tripCounts)) {
        const trip = allTrips[tripId];
        if (trip) {
            const { routeShortName, directionId, shapeId } = trip;
            if (!tripsMaxStops[routeShortName]) tripsMaxStops[routeShortName] = {};
            if (!tripsMaxStops[routeShortName][directionId]) {
                tripsMaxStops[routeShortName][directionId] = { maxCount: 0, bestTripId: null, shapeId: null };
            }
            if (count > tripsMaxStops[routeShortName][directionId].maxCount) {
                tripsMaxStops[routeShortName][directionId] = { maxCount: count, bestTripId: tripId, shapeId };
            }
        }
    }

    // Seçilen en iyi seferleri (Representative) kaydet
    for (const shortName in tripsMaxStops) {
        for (const dir in tripsMaxStops[shortName]) {
            const best = tripsMaxStops[shortName][dir];
            if (best.bestTripId) {
                representativeTrips[best.bestTripId] = {
                    routeShortName: shortName,
                    directionId: dir,
                    shapeId: best.shapeId
                };
                report.stats.representativeTripsCount++;
            }
        }
    }

    // Sefer Saatleri (Departures) objesini derleme (Hat -> Yön -> Service Id -> Kalkış Saatleri)
    console.log("Sefer Saatleri (Departures) JSON için derleniyor...");
    const routeDepartures = {};
    for (const [tripId, startData] of Object.entries(tripStarts)) {
        const trip = allTrips[tripId];
        if (trip && startData.time) {
            const { routeShortName, directionId, serviceId } = trip;
            if (!routeDepartures[routeShortName]) routeDepartures[routeShortName] = {};
            if (!routeDepartures[routeShortName][directionId]) routeDepartures[routeShortName][directionId] = {};
            if (!routeDepartures[routeShortName][directionId][serviceId]) routeDepartures[routeShortName][directionId][serviceId] = [];

            // 24 saat formatına uygun kırpma ve kaydetme
            const hmMatch = startData.time.match(/^(\d{2}:\d{2})/);
            if (hmMatch) {
                routeDepartures[routeShortName][directionId][serviceId].push(hmMatch[1]);
            }
        }
    }
    // Remove duplicates and sort
    for (const r in routeDepartures) {
        for (const d in routeDepartures[r]) {
            for (const s in routeDepartures[r][d]) {
                routeDepartures[r][d][s] = [...new Set(routeDepartures[r][d][s])].sort();
            }
        }
    }

    // 3. STOPS.TXT (GTFS Durakları)
    const gtfsStops = {};
    const resStops = await parseGtfsFile('stops.txt', (row) => {
        gtfsStops[row.stop_id] = {
            id: row.stop_id,
            name: row.stop_name,
            lat: parseFloat(row.stop_lat),
            lon: parseFloat(row.stop_lon)
        };
        report.stats.gtfsStopsCount++;
    });
    report.filesProcessed['stops.txt'] = resStops;

    // 4. STOP_TIMES.TXT -> Sadece (Representative Trips) için durak dizilimini al
    const routeStopsData = {}; // { route_short_name: { "0": [ {stop_id, seq} ] } }
    const resStopTimes = await parseGtfsFile('stop_times.txt', (row) => {
        const tripId = row.trip_id;
        // Sadece ana temsilci seferin durak sırasıyla ilgileniyoruz (Performans!)
        if (representativeTrips[tripId]) {
            const rep = representativeTrips[tripId];
            if (!routeStopsData[rep.routeShortName]) routeStopsData[rep.routeShortName] = {};
            if (!routeStopsData[rep.routeShortName][rep.directionId]) routeStopsData[rep.routeShortName][rep.directionId] = [];

            routeStopsData[rep.routeShortName][rep.directionId].push({
                stop_id: row.stop_id,
                sequence: parseInt(row.stop_sequence, 10)
            });
        }
    });
    report.filesProcessed['stop_times.txt'] = resStopTimes;

    // Durak sekanslarını numaraya göre sırala
    for (const rId in routeStopsData) {
        for (const dId in routeStopsData[rId]) {
            routeStopsData[rId][dId].sort((a, b) => a.sequence - b.sequence);
            // Sadece ID mapine vur (Hafifletme)
            routeStopsData[rId][dId] = routeStopsData[rId][dId].map(s => s.stop_id);
        }
    }

    // 5. SHAPES.TXT -> Sadece Temsilci Seferlerin (Representative Trips) Shape_id'sini okur
    const targetShapeIds = new Set();
    Object.values(representativeTrips).forEach(rep => {
        if (rep.shapeId) targetShapeIds.add(rep.shapeId);
    });

    const shapeGroups = {}; // { shape_id: [ {lat, lon, seq} ] }
    const resShapes = await parseGtfsFile('shapes.txt', (row) => {
        const sId = row.shape_id;
        if (targetShapeIds.has(sId)) {
            if (!shapeGroups[sId]) shapeGroups[sId] = [];
            shapeGroups[sId].push({
                lat: parseFloat(row.shape_pt_lat),
                lon: parseFloat(row.shape_pt_lon),
                seq: parseInt(row.shape_pt_sequence, 10)
            });
            report.stats.shapePointsCount++;
        }
    });
    report.filesProcessed['shapes.txt'] = resShapes;

    // Yön bazlı route_shapes oluştur
    const routeShapesData = {}; // { route_short_name: { "0": [ [lat, lon] ] } }
    let rawShapePointsCount = 0;
    let writtenShapePointsCount = 0;

    Object.values(representativeTrips).forEach(rep => {
        if (rep.shapeId && shapeGroups[rep.shapeId]) {
            if (!routeShapesData[rep.routeShortName]) routeShapesData[rep.routeShortName] = {};
            // Sıralayıp compress edilmiş matrix dizilimine geçir
            const sortedShape = shapeGroups[rep.shapeId].sort((a, b) => a.seq - b.seq);
            rawShapePointsCount += sortedShape.length;

            // Haversine süzgeci atıldı; Sadece ondalık yuvarlaması yaparak tüm orijinal koordinatları koru
            const finalizedShape = sortedShape.map(p => [Number(p.lat.toFixed(5)), Number(p.lon.toFixed(5))]);
            writtenShapePointsCount += finalizedShape.length;
            routeShapesData[rep.routeShortName][rep.directionId] = finalizedShape;
        }
    });

    report.polyLineOptimization = {
        rawShapePointsCount,
        writtenShapePointsCount,
        reductionMethod: "5 Decimal Truncation (No Point Deletion)",
        distanceThresholdMeters: 0,
        outputFileSizeMB: 0 // Will be overwritten when saving
    };

    // 6. CALENDAR dosyaları
    const serviceCalendar = {};
    const resCalendar = await parseGtfsFile('calendar.txt', (row) => {
        serviceCalendar[row.service_id] = row;
    });
    report.filesProcessed['calendar.txt'] = resCalendar;


    // ============================================
    // ÇIKTILARI (JSON) KAYDETME
    // ============================================
    console.log("JSON Çıktıları Yazdırılıyor...");
    fs.writeFileSync(path.join(OUT_DIR, 'routes.json'), JSON.stringify(routesData), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'route_stops.json'), JSON.stringify(routeStopsData), 'utf8');

    const shapesOutputPath = path.join(OUT_DIR, 'route_shapes.json');
    fs.writeFileSync(shapesOutputPath, JSON.stringify(routeShapesData), 'utf8');
    const shapesFileSizeMB = (fs.statSync(shapesOutputPath).size / 1024 / 1024).toFixed(3);
    report.polyLineOptimization.outputFileSizeMB = `${shapesFileSizeMB} MB`;

    fs.writeFileSync(path.join(OUT_DIR, 'trips_index.json'), JSON.stringify(representativeTrips), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'service_calendar.json'), JSON.stringify(serviceCalendar), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'route_departures.json'), JSON.stringify(routeDepartures), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'gtfs_stops.json'), JSON.stringify(gtfsStops), 'utf8');

    // MADDE 4: Eski stops.json ile GTFS kıyası
    const oldStopsPath = path.join(__dirname, '../data/stops.json');
    if (fs.existsSync(oldStopsPath)) {
        const oldStopsText = fs.readFileSync(oldStopsPath, 'utf8');
        try {
            const oldStopsArr = typeof JSON.parse(oldStopsText) === 'array' ? JSON.parse(oldStopsText) : Object.values(JSON.parse(oldStopsText)); // Eğer array degilse obj map
            // Note: Our stops.json is an array of objects
            const oldStopsData = JSON.parse(oldStopsText);

            let missingInGtfs = 0;
            let newlyDiscoveredInGtfs = 0;
            let nameMismatchCount = 0;
            let coordMismatchCount = 0;
            let perfectlyMatched = 0;

            const existingIds = new Set(oldStopsData.map(s => String(s.id)));
            const gtfsIds = new Set(Object.keys(gtfsStops));

            oldStopsData.forEach(oldStop => {
                const gtfsStop = gtfsStops[String(oldStop.id)];
                if (!gtfsStop) {
                    missingInGtfs++;
                } else {
                    let mismatch = false;
                    // Isim karşılaştırma
                    if (oldStop.name && gtfsStop.name && oldStop.name.trim().toLocaleLowerCase('tr-TR') !== gtfsStop.name.trim().toLocaleLowerCase('tr-TR')) {
                        nameMismatchCount++;
                        mismatch = true;
                    }
                    // Koordinat karşılaştırma (hassasiyet ~10 metre: 0.0001)
                    const latDiff = Math.abs((oldStop.lat || oldStop.latitude) - gtfsStop.lat);
                    const lonDiff = Math.abs((oldStop.lon || oldStop.longitude) - gtfsStop.lon);
                    if (latDiff > 0.0001 || lonDiff > 0.0001) {
                        coordMismatchCount++;
                        mismatch = true;
                    }
                    if (!mismatch) perfectlyMatched++;
                }
            });

            gtfsIds.forEach(id => {
                if (!existingIds.has(id)) newlyDiscoveredInGtfs++;
            });

            report.stopsComparison = {
                oldStopsCount: existingIds.size,
                gtfsStopsCount: gtfsIds.size,
                missingInGtfs,
                newlyDiscoveredInGtfs,
                nameMismatchCount,
                coordMismatchCount,
                perfectlyMatched
            };
        } catch (e) {
            report.warnings.push("Eski stops.json okunurken/karşılaştırılırken hata: " + e.message);
        }
    }


    fs.writeFileSync(path.join(OUT_DIR, 'import_report.json'), JSON.stringify(report, null, 2), 'utf8');

    console.log("=== İŞLEM TAMAMLANDI ===");
    console.log(JSON.stringify(report.stats, null, 2));
    if (report.stopsComparison) {
        /*
          MADDE 4 - KIYASLAMA RAPORU (Teslim Maili İçin Notlar):
          - Eski stops.json: 11.783
          - Yeni GTFS Stops: 11.510
          - Kusursuz Eşleşen: 11.476
          - Sadece Eskisinde olan (Silinmiş): 286
          - Yeni Keşfedilen (Sadece GTFS'te): 13
          - İsim (Türkçe vb.) Mismatch: 3
          - GPS Koordinatı Değişen (>10m): 18
        */
        console.log("Durak Kıyaslama Raporu (Madde 4):", report.stopsComparison);
    }
}

runImport().catch(err => {
    console.error("FATAL ERROR:", err);
});
