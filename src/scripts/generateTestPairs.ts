import * as fs from 'fs';
import * as path from 'path';

const patterns = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/gtfs/route_patterns.json'), 'utf8'));
const stops = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/gtfs/planner_stops.json'), 'utf8'));

const getStopName = (id: string) => stops[id]?.name || id;

let routesCache = Object.values(patterns).flatMap((dirs: any) => Object.values(dirs).flatMap((variants: any) => variants));

const findDirectPair = () => {
    for (let variant of routesCache) {
        if (variant.stopIds.length > 10) {
            const start = variant.stopIds[0];
            const end = variant.stopIds[5];
            return {
                start, end, desc: `${getStopName(start)} -> ${getStopName(end)}`
            }
        }
    }
    return null;
}

const findPairs = () => {
    const directPairs = [];
    const transferPairs = [];

    // Find 5 random direct pairs
    let i = 0;
    for (let variant of routesCache) {
        if (variant.stopIds.length > 15) {
            const sId = variant.stopIds[2];
            const eId = variant.stopIds[8];
            directPairs.push({ start: sId, end: eId, desc: `${getStopName(sId)} -> ${getStopName(eId)}` });
            i++;
            if (i > 5) break;
        }
    }

    // Output raw to terminal so AI can read it and put into benchmark
    console.log("=== DIRECT PAIRS ===");
    console.log(JSON.stringify(directPairs, null, 2));

    // Finding transfers is harder mechanically without running tripPlanner, let's just use cross-routes
    // Two routes that don't share start/end but share a middle stop
    const arr = routesCache;
    let foundTransfers = 0;
    for (let r1 of arr) {
        if (r1.stopIds.length < 10) continue;
        for (let r2 of arr) {
            if (r2.stopIds.length < 10) continue;
            const intersection = r1.stopIds.filter((s: string) => r2.stopIds.includes(s));
            if (intersection.length > 0 && intersection.length < 3) {
                // They intersect. Pick start of r1 and end of r2
                const sId = r1.stopIds[0];
                const eId = r2.stopIds[r2.stopIds.length - 1];
                if (!r1.stopIds.includes(eId) && !r2.stopIds.includes(sId)) {
                    transferPairs.push({ start: sId, end: eId, desc: `${getStopName(sId)} -> ${getStopName(eId)}` });
                    foundTransfers++;
                    if (foundTransfers > 5) break;
                }
            }
        }
        if (foundTransfers > 5) break;
    }

    console.log("=== TRANSFER PAIRS ===");
    console.log(JSON.stringify(transferPairs, null, 2));
}

findPairs();
