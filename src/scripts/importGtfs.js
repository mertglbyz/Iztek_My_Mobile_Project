/* global __dirname, require, module, console, process, Buffer */
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

    // 4. STOP_TIMES.TXT (PASS 2) -> Temsilci sefer (Harita) + TÜM sefer (Pattern) durak dizilimleri
    const routeStopsData = {}; // { route_short_name: { "0": [stop_id, ...] } } (Temsilci - Harita için)
    const allTripStops = {};   // { trip_id: [ {stop_id, sequence} ] } (Tüm seferler - Pattern için)

    const resStopTimes = await parseGtfsFile('stop_times.txt', (row) => {
        const tripId = row.trip_id;
        const trip = allTrips[tripId];
        if (!trip) return; // Tanınmayan sefer

        // Temsilci sefer: Harita için routeStopsData (eski davranış korunuyor)
        if (representativeTrips[tripId]) {
            const rep = representativeTrips[tripId];
            if (!routeStopsData[rep.routeShortName]) routeStopsData[rep.routeShortName] = {};
            if (!routeStopsData[rep.routeShortName][rep.directionId]) routeStopsData[rep.routeShortName][rep.directionId] = [];
            routeStopsData[rep.routeShortName][rep.directionId].push({
                stop_id: row.stop_id,
                sequence: parseInt(row.stop_sequence, 10)
            });
        }

        // TÜM seferler: Pattern çıkarma için durak dizisini topla
        if (!allTripStops[tripId]) allTripStops[tripId] = [];
        allTripStops[tripId].push({
            stop_id: row.stop_id,
            sequence: parseInt(row.stop_sequence, 10)
        });
    });
    report.filesProcessed['stop_times.txt'] = resStopTimes;

    // Temsilci sefer durak sekanslarını sırala ve ID dizisine dönüştür (Harita içindir, değişmez)
    for (const rId in routeStopsData) {
        for (const dId in routeStopsData[rId]) {
            routeStopsData[rId][dId].sort((a, b) => a.sequence - b.sequence);
            routeStopsData[rId][dId] = routeStopsData[rId][dId].map(s => s.stop_id);
        }
    }

    // ============================================
    // FAZ 11 MADDE 2: ROUTE_PATTERNS.JSON (Güzergâh Varyantları)
    // ============================================
    console.log("[FAZ 11] route_patterns.json üretiliyor...");

    // Her seferin durak dizisini sıralayıp, aynı diziye sahip seferleri tek pattern altında birleştir
    const routePatterns = {}; // { routeShortName: { dirId: [ {patternId, stopIds, tripCount} ] } }
    let totalPatternCount = 0;

    for (const tripId in allTripStops) {
        const trip = allTrips[tripId];
        if (!trip) continue;

        const { routeShortName, directionId } = trip;
        const stops = allTripStops[tripId].sort((a, b) => a.sequence - b.sequence);
        const stopIds = stops.map(s => s.stop_id);
        const seqKey = stopIds.join(','); // Hash olarak virgülle birleştirilmiş durak dizisi

        if (!routePatterns[routeShortName]) routePatterns[routeShortName] = {};
        if (!routePatterns[routeShortName][directionId]) routePatterns[routeShortName][directionId] = {};

        if (!routePatterns[routeShortName][directionId][seqKey]) {
            totalPatternCount++;
            routePatterns[routeShortName][directionId][seqKey] = {
                patternId: `${routeShortName}-${directionId}-${Object.keys(routePatterns[routeShortName][directionId]).length + 1}`,
                stopIds: stopIds,
                tripCount: 0,
                // Faz 12: Relationship keeping
                representativeTripId: tripId,
                shapeId: trip.shapeId || null
            };
        }
        routePatterns[routeShortName][directionId][seqKey].tripCount++;
    }

    // seqKey bazlı objeyi array'e dönüştür ve tripCount'a göre sırala (en çok kullanılan en üstte)
    const routePatternsOutput = {};
    const patternTripShapeIndex = {}; // Faz 12 Madde 2
    let routeDirectionCombinationCount = 0;
    let multiPatternRouteDirectionCount = 0;
    const multiPatternList = [];

    for (const rId in routePatterns) {
        routePatternsOutput[rId] = {};
        for (const dId in routePatterns[rId]) {
            const patterns = Object.values(routePatterns[rId][dId]).sort((a, b) => b.tripCount - a.tripCount);

            // Generate patternTripShapeIndex simultaneously and clean output for route_patterns.json
            const cleanedPatterns = [];
            for (const p of patterns) {
                patternTripShapeIndex[p.patternId] = {
                    routeId: rId,
                    directionId: dId,
                    representativeTripId: p.representativeTripId,
                    shapeId: p.shapeId
                };

                cleanedPatterns.push({
                    patternId: p.patternId,
                    stopIds: p.stopIds,
                    tripCount: p.tripCount
                });
            }

            routePatternsOutput[rId][dId] = cleanedPatterns;

            routeDirectionCombinationCount++;
            if (cleanedPatterns.length > 1) {
                multiPatternRouteDirectionCount++;
                multiPatternList.push(`${rId} (Yön: ${dId}) - ${cleanedPatterns.length} Farklı Pattern`);
            }
        }
    }

    console.log(`[FAZ 11] Toplam ${totalPatternCount} benzersiz güzergâh pattern'ı bulundu.`);

    // Aşama 4 logları
    report.stats.routeDirectionCombinationCount = routeDirectionCombinationCount;
    report.stats.totalPatternCount = totalPatternCount; // Same as totalPatternCount defined above
    report.stats.multiPatternRouteDirectionCount = multiPatternRouteDirectionCount;
    report.stats.multiPatternList = multiPatternList;

    if (multiPatternRouteDirectionCount === 0) {
        console.log("[FAZ 11] Raporlanacak NOT: İncelenen GTFS arşivinde birden fazla durak pattern’ına sahip hat/yön kombinasyonu tespit edilmedi.");
        report.stats.note = "İncelenen GTFS arşivinde birden fazla durak pattern’ına sahip hat/yön kombinasyonu tespit edilmedi.";
    } else {
        console.log(`[FAZ 11] Birden fazla pattern içeren hat/yön sayısı: ${multiPatternRouteDirectionCount}`);
    }

    // Belleği temizle - artık allTripStops'a ihtiyaç yok
    for (const key in allTripStops) delete allTripStops[key];

    // ============================================
    // TERS İNDEKS: Tüm pattern'lardan üret (Madde 1 retroaktif düzeltme)
    // ============================================
    // Eski yaklaşım: Sadece temsilci sefer duraklarını indeksliyordu.
    // Yeni yaklaşım: TÜM benzersiz pattern dizilimlerini tarayarak, bir durağa uğrayan her hat+yön+sıra bilgisini üretir.
    const stopRoutesIndex = {};
    for (const rId in routePatternsOutput) {
        for (const dId in routePatternsOutput[rId]) {
            const patterns = routePatternsOutput[rId][dId];
            // Her pattern'ın duraklarını indeksle (aynı hat+yön+durak ikilisi zaten Set ile filtrelenecek)
            const addedKeys = new Set(); // "stopId-routeId-dirId" duplikasyon engeli
            for (const pattern of patterns) {
                pattern.stopIds.forEach((stopId, idx) => {
                    const dupKey = `${stopId}-${rId}-${dId}`;
                    if (!addedKeys.has(dupKey)) {
                        addedKeys.add(dupKey);
                        if (!stopRoutesIndex[stopId]) stopRoutesIndex[stopId] = [];
                        stopRoutesIndex[stopId].push({
                            routeId: rId,
                            directionId: dId,
                            sequence: idx
                        });
                    }
                });
            }
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
    fs.writeFileSync(path.join(OUT_DIR, 'stop_routes_index.json'), JSON.stringify(stopRoutesIndex), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'route_patterns.json'), JSON.stringify(routePatternsOutput), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'pattern_trip_shape_index.json'), JSON.stringify(patternTripShapeIndex), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'service_calendar.json'), JSON.stringify(serviceCalendar), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'route_departures.json'), JSON.stringify(routeDepartures), 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'gtfs_stops.json'), JSON.stringify(gtfsStops), 'utf8');

    // MADDE 4: Eski stops.json ile GTFS kıyası
    const oldStopsPath = path.join(__dirname, '../data/stops.json');
    if (fs.existsSync(oldStopsPath)) {
        const oldStopsText = fs.readFileSync(oldStopsPath, 'utf8');
        try {
            const parsedOld = JSON.parse(oldStopsText);
            const oldStopsData = Array.isArray(parsedOld) ? parsedOld : Object.values(parsedOld);
            
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


    // ============================================
    // FAZ 11 MADDE 1: PLANNER_STOPS.JSON (Birleşik Durak Kaynağı)
    // ============================================
    // Kaynak önceliği: GTFS stops.txt → CSV stops.json (sadece fallback)
    // CSV-only duraklar hariç tutulur, GTFS-only duraklar dahil edilir.
    console.log("[FAZ 11] planner_stops.json üretiliyor...");

    // Her durağa uğrayan hatları hesapla (TÜM PATTERN'lardan - Madde 1 retroaktif düzeltme)
    const stopToRoutes = {}; // { stopId: Set<routeId> }
    for (const routeId in routePatternsOutput) {
        for (const dirId in routePatternsOutput[routeId]) {
            for (const pattern of routePatternsOutput[routeId][dirId]) {
                pattern.stopIds.forEach(sId => {
                    if (!stopToRoutes[sId]) stopToRoutes[sId] = new Set();
                    stopToRoutes[sId].add(routeId);
                });
            }
        }
    }

    // Eski CSV durakları yükle (fallback için)
    let oldStopsMap = {};
    const oldStopsPathPlanner = path.join(__dirname, '../data/stops.json');
    if (fs.existsSync(oldStopsPathPlanner)) {
        try {
            const oldArr = JSON.parse(fs.readFileSync(oldStopsPathPlanner, 'utf8'));
            if (Array.isArray(oldArr)) {
                oldArr.forEach(s => {
                    oldStopsMap[String(s.id)] = s;
                });
            }
        } catch (e) {
            console.warn("[WARN] Eski stops.json fallback için okunamadı:", e.message);
        }
    }

    // Birleşik durak listesi oluştur (Sadece GTFS durakları)
    const plannerStops = [];
    for (const stopId in gtfsStops) {
        const gs = gtfsStops[stopId];
        let name = gs.name;
        let lat = gs.lat;
        let lon = gs.lon;
        let source = "gtfs";

        // GTFS'te ad veya koordinat eksikse CSV fallback
        if ((!name || !lat || !lon) && oldStopsMap[stopId]) {
            const csv = oldStopsMap[stopId];
            if (!name) name = csv.name || 'Bilinmiyor';
            if (!lat) lat = parseFloat(csv.latitude) || parseFloat(csv.lat) || 0;
            if (!lon) lon = parseFloat(csv.longitude) || parseFloat(csv.lon) || 0;
            source = "gtfs+csv_fallback";
        }

        // Koordinatı olmayanları atla
        if (!lat || !lon) continue;

        const routes = stopToRoutes[stopId] ? Array.from(stopToRoutes[stopId]).sort((a, b) => Number(a) - Number(b)) : [];

        plannerStops.push({
            id: stopId,
            name: name || 'Bilinmiyor',
            latitude: Number(lat.toFixed(5)),
            longitude: Number(lon.toFixed(5)),
            routeCount: routes.length,
            routes: routes,
            source: source
        });
    }

    // İsme göre sırala
    plannerStops.sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));

    // ============================================
    // FAZ 11 MADDE 3: DURAK YAKINLIK İNDEKSİ (nearby_stops_index.json)
    // ============================================
    console.log("[FAZ 11] nearby_stops_index.json üretiliyor (Grid Spatial Hashing ile)...");

    // Haversine fonksiyonları
    function deg2rad(deg) { return deg * (Math.PI / 180); }
    function getDistanceMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Yarıçap (m)
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

    // Grid ayarlaması ~0.002 = ~200 metre (Izmir enleminde)
    const CELL_SIZE = 0.002;
    const grid = {}; // { "lat_lon": [stop1, stop2] }

    plannerStops.forEach(stop => {
        const latCell = Math.floor(stop.latitude / CELL_SIZE);
        const lonCell = Math.floor(stop.longitude / CELL_SIZE);
        const cellKey = `${latCell}_${lonCell}`;
        if (!grid[cellKey]) grid[cellKey] = [];
        grid[cellKey].push(stop);
    });

    const nearbyStopsIndex = {}; // { stopId: [{stopId, distanceMeters}] }
    let totalConnections = 0;

    plannerStops.forEach(stop => {
        const latCell = Math.floor(stop.latitude / CELL_SIZE);
        const lonCell = Math.floor(stop.longitude / CELL_SIZE);
        const nearby = [];

        // Kendi hücresi dahil 9 komşu hücreyi tara
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const neighborKey = `${latCell + i}_${lonCell + j}`;
                if (grid[neighborKey]) {
                    grid[neighborKey].forEach(neighborStop => {
                        if (stop.id !== neighborStop.id) {
                            const dist = getDistanceMeters(stop.latitude, stop.longitude, neighborStop.latitude, neighborStop.longitude);
                            if (dist <= 150) {
                                nearby.push({
                                    stopId: neighborStop.id,
                                    distanceMeters: dist
                                });
                            }
                        }
                    });
                }
            }
        }

        if (nearby.length > 0) {
            // Mesafeye göre artan sıraya koy
            nearby.sort((a, b) => a.distanceMeters - b.distanceMeters);
            nearbyStopsIndex[stop.id] = nearby;
            totalConnections += nearby.length;
        }
    });

    console.log(`[FAZ 11] Toplam ${totalConnections} yürüme bağlantısı bulundu.`);
    report.stats.nearbyConnectionsCount = totalConnections;
    fs.writeFileSync(path.join(OUT_DIR, 'nearby_stops_index.json'), JSON.stringify(nearbyStopsIndex), 'utf8');

    fs.writeFileSync(path.join(OUT_DIR, 'planner_stops.json'), JSON.stringify(plannerStops), 'utf8');
    console.log(`[FAZ 11] planner_stops.json yazıldı. Toplam: ${plannerStops.length} durak`);
    report.stats.plannerStopsCount = plannerStops.length;

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
