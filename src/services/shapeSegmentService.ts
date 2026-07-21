import plannerStopsRaw from '@/data/gtfs/planner_stops.json';
import routeShapesRaw from '@/data/gtfs/route_shapes.json';

type Coordinate = [number, number]; // [lat, lon]

const routeShapes: Record<string, Record<string, Coordinate[]>> = routeShapesRaw as any;
const plannerStops = plannerStopsRaw as any[];

const deg2rad = (deg: number) => deg * (Math.PI / 180);

const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
};

const getStopCoordinates = (stopId: string): Coordinate | null => {
    const stop = plannerStops.find(s => s.id === stopId);
    if (stop) {
        return [stop.latitude, stop.longitude];
    }
    return null;
};

const findClosestPointIndex = (shape: Coordinate[], lat: number, lon: number): number => {
    let minDistance = Infinity;
    let minIndex = 0;

    for (let i = 0; i < shape.length; i++) {
        const dist = getDistanceMeters(shape[i][0], shape[i][1], lat, lon);
        if (dist < minDistance) {
            minDistance = dist;
            minIndex = i;
        }
    }

    return minIndex;
};

/**
 * İki durak arasındaki koordinatları, yön ID'sini koruyarak ve sadece shape keserek döndürür.
 * @param routeId Araştırılacak hat numarası
 * @param directionId Hattın yönü (0 veya 1)
 * @param startStopId Başlangıç durak ID'si
 * @param endStopId Varış durak ID'si
 * @returns Kesilmiş [lat, lon] dizisi (haritada render için)
 */
export const getShapeSegment = (
    routeId: string,
    directionId: string,
    startStopId: string,
    endStopId: string
): Coordinate[] => {
    const shape = routeShapes[routeId]?.[directionId];
    if (!shape || shape.length === 0) {
        return [];
    }

    const startCoords = getStopCoordinates(startStopId);
    const endCoords = getStopCoordinates(endStopId);

    if (!startCoords || !endCoords) {
        return [];
    }

    const startIdx = findClosestPointIndex(shape, startCoords[0], startCoords[1]);
    const endIdx = findClosestPointIndex(shape, endCoords[0], endCoords[1]);

    if (startIdx <= endIdx) {
        return shape.slice(startIdx, endIdx + 1);
    } else {
        console.warn(`[ShapeSegment] Olası yanlış shape veya yön seçimi! routeId:${routeId}, dir:${directionId}, startIdx:${startIdx}, endIdx:${endIdx}. Geçersiz segment.`);
        return [];
    }
};
