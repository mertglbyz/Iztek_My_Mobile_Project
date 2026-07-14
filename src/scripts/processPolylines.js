const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Haversine distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function processPolylines() {
    console.log("Loading polyline CSV data...");
    const csvPath = path.join(__dirname, '../../eshot-otobus-hat-guzergahlari.csv');

    // Structure: { routeId: { "1": [], "2": [] } }
    const polylines = {};

    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let isHeader = true;
    let counts = { total: 0, kept: 0 };
    let lastPoints = {}; // { "72-1": {lat, lon} }

    for await (const line of rl) {
        if (isHeader) { isHeader = false; continue; }

        const parts = line.split(';');
        if (parts.length < 4) continue;

        const routeId = parts[0].trim();
        const yon = parts[1].trim();
        const lon = parseFloat(parts[2].trim());
        const lat = parseFloat(parts[3].trim());

        if (!polylines[routeId]) polylines[routeId] = { "1": [], "2": [] };
        if (!polylines[routeId][yon]) polylines[routeId][yon] = [];

        counts.total++;
        const key = `${routeId}-${yon}`;
        const lastPt = lastPoints[key];

        // Distance Thinning: Only keep point if it's > 15 meters from last kept point.
        // This dramatically reduces file size but keeps the shape accurate enough for mobile maps.
        let shouldKeep = false;
        if (!lastPt) {
            shouldKeep = true;
        } else {
            const dist = getDistance(lastPt.lat, lastPt.lon, lat, lon);
            if (dist > 15) shouldKeep = true;
        }

        if (shouldKeep) {
            // Keep precision to 5 decimals (~1 meter accuracy) to save json characters
            polylines[routeId][yon].push([
                Number(lat.toFixed(5)),
                Number(lon.toFixed(5))
            ]);
            lastPoints[key] = { lat, lon };
            counts.kept++;
        }
    }

    console.log(`Parsed ${counts.total} points. Kept ${counts.kept} points after 20m distance thinning.`);

    const outputPath = path.join(__dirname, '../data/route_polylines.json');
    fs.writeFileSync(outputPath, JSON.stringify(polylines), 'utf8');

    console.log("Success! Output written to: " + outputPath);
    const stats = fs.statSync(outputPath);
    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

processPolylines().catch(console.error);
