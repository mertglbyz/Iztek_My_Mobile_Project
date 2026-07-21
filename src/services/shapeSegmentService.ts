import patternTripShapeIndexRaw from '@/data/gtfs/pattern_trip_shape_index.json';
import plannerStopsRaw from '@/data/gtfs/planner_stops.json';
import routeShapesRaw from '@/data/gtfs/route_shapes.json';

type Coordinate = [number, number]; // [lat, lon]

interface PatternContext {
    routeId: string;
    directionId: string;
    representativeTripId: string;
    shapeId: string | null;
}

const routeShapes: Record<string, Record<string, Coordinate[]>> = routeShapesRaw as any;
const plannerStops = plannerStopsRaw as any[];
const patternTripShapeIndex: Record<string, PatternContext> = patternTripShapeIndexRaw as any;

// shapeId → { routeId, directionId } ters-indeksi: shape'e ait route ve yönü bulmak için
const shapeIdToRouteDirection: Record<string, { routeId: string; directionId: string }> = {};
for (const [, ctx] of Object.entries(patternTripShapeIndex)) {
    if (ctx.shapeId) {
        shapeIdToRouteDirection[ctx.shapeId] = { routeId: ctx.routeId, directionId: ctx.directionId };
    }
}

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

export interface GetShapeSegmentParams {
    /** GTFS pattern_trip_shape_index'ten gelen shapeId */
    shapeId: string | null;
    /** Gerçek biniş durak ID'si */
    boardingStopId: string;
    /** Gerçek iniş durak ID'si */
    alightingStopId: string;
    /** Yön ID'si (0 veya 1) — shapeId bulunamazsa fallback için kullanılır */
    directionId?: string;
    /** Hat ID'si — shapeId bulunamazsa fallback için kullanılır */
    routeId?: string;
}

/**
 * Gerçek GTFS shape verisi üzerinden biniş ve iniş durakları arasındaki
 * koordinat segmentini döndürür. shapeId öncelikli kullanılır;
 * bulunamazsa routeId + directionId ile fallback yapılır.
 *
 * @returns [lat, lon] koordinat dizisi. Shape bulunamaz veya indeks hatası
 *          oluşursa boş dizi döner — asla kuş uçuşu çizgi üretilmez.
 */
export const getShapeSegment = ({
    shapeId,
    boardingStopId,
    alightingStopId,
    directionId,
    routeId,
}: GetShapeSegmentParams): Coordinate[] => {
    // 1. shapeId üzerinden route + direction bul (öncelikli yol)
    let resolvedRouteId: string | undefined = routeId;
    let resolvedDirId: string | undefined = directionId;

    if (shapeId) {
        const mapped = shapeIdToRouteDirection[shapeId];
        if (mapped) {
            resolvedRouteId = mapped.routeId;
            resolvedDirId = mapped.directionId;
        } else {
            console.warn(`[ShapeSegment] shapeId "${shapeId}" ters-indekste bulunamadı. Fallback: routeId=${routeId}, directionId=${directionId}`);
        }
    }

    if (!resolvedRouteId || !resolvedDirId) {
        console.warn('[ShapeSegment] routeId veya directionId belirlenemedi. Boş segment döndürülüyor.');
        return [];
    }

    const shape = routeShapes[resolvedRouteId]?.[resolvedDirId];
    if (!shape || shape.length === 0) {
        console.warn(`[ShapeSegment] Shape bulunamadı: routeId=${resolvedRouteId}, directionId=${resolvedDirId}`);
        return [];
    }

    const boardingCoords = getStopCoordinates(boardingStopId);
    const alightingCoords = getStopCoordinates(alightingStopId);

    if (!boardingCoords || !alightingCoords) {
        console.warn(`[ShapeSegment] Durak koordinatları bulunamadı: boarding=${boardingStopId}, alighting=${alightingStopId}`);
        return [];
    }

    const startIdx = findClosestPointIndex(shape, boardingCoords[0], boardingCoords[1]);
    const endIdx = findClosestPointIndex(shape, alightingCoords[0], alightingCoords[1]);

    if (startIdx <= endIdx) {
        return shape.slice(startIdx, endIdx + 1);
    } else {
        // Biniş indeksi > iniş indeksi: yanlış shape veya yön seçimi ihtimali
        console.warn(
            `[ShapeSegment] Olası yanlış shape veya yön seçimi! ` +
            `routeId:${resolvedRouteId}, dir:${resolvedDirId}, ` +
            `boarding="${boardingStopId}" (idx:${startIdx}), alighting="${alightingStopId}" (idx:${endIdx}). ` +
            `Geçersiz segment — boş dizi döndürülüyor.`
        );
        return [];
    }
};
