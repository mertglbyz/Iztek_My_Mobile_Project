const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'src', 'assets', 'data', 'eshot-otobus-duraklari.csv');
const jsonPath = path.join(__dirname, 'src', 'data', 'stops.json');

const csvData = fs.readFileSync(csvPath, 'utf8');
const lines = csvData.split('\n').filter(line => line.trim() !== '');

// Header: DURAK_ID, DURAK_ADI, ENLEM, BOYLAM, DURAKTAN_GECEN_HATLAR
const header = lines[0].split(';').map(h => h.trim());

// We need ALL valid stops
const stops = [];

for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(';');
    if (rawCols.length < 5) continue;

    // We might have commas or semicolons inside names but assume clean since standard ESHOT dataset
    const id = Number(rawCols[0].trim());
    const name = rawCols[1].trim();
    const lat = parseFloat(rawCols[2].trim());
    const lng = parseFloat(rawCols[3].trim());
    const routesStr = rawCols[4].trim();

    if (isNaN(lat) || isNaN(lng) || !id) continue;

    let routes = [];
    if (routesStr && routesStr !== 'null' && routesStr !== 'NaN') {
        routes = routesStr.split('-').map(r => Number(r)).filter(r => !isNaN(r));
    }

    stops.push({
        id: String(id), // Can be string or number, let's use string
        name,
        latitude: lat,
        longitude: lng,
        routes
    });
}

// Ensure the directory exists
const dir = path.dirname(jsonPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(jsonPath, JSON.stringify(stops, null, 2));
console.log(`Generated stops.json with ${stops.length} records at ${jsonPath}`);
