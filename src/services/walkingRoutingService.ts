/**
 * Yürüyüş Rotaları Servisi (Walking Routing Service)
 * Gelecekte OSM tabanlı gerçek yol ağı kullanan bir backend API'sine bağlanılacaktır.
 * Bu fazda (Faz 12) geçici olarak yaklaşık mesafe (Haversine) ve kuş uçuşu geometri sunar.
 */

export interface WalkingRouteSegment {
    fromStopId?: string;
    toStopId?: string;
    distanceMeters: number;
    durationSeconds?: number;
    geometry?: {
        latitude: number;
        longitude: number;
    }[];
    source: 'backend-osm' | 'approximate-haversine';
}

interface Coordinate {
    latitude: number;
    longitude: number;
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

/**
 * İki koordinat arasındaki yaya rotasını döndürür.
 * Geçici olarak kuş uçuşu (approximate-haversine) kaynaklı iki noktalı geometri üretir.
 * 
 * @param fromCoordinate Başlangıç koordinatı
 * @param toCoordinate Varış koordinatı
 * @param fromStopId Opsiyonel olarak başlangıç durak ID'si
 * @param toStopId Opsiyonel olarak varış durak ID'si
 */
export const getWalkingRoute = async (
    fromCoordinate: Coordinate,
    toCoordinate: Coordinate,
    fromStopId?: string,
    toStopId?: string
): Promise<WalkingRouteSegment> => {
    const distanceMeters = getDistanceMeters(
        fromCoordinate.latitude,
        fromCoordinate.longitude,
        toCoordinate.latitude,
        toCoordinate.longitude
    );

    // Yürüme hızı ortalama saniyede 1.4 metredir.
    const durationSeconds = Math.round(distanceMeters / 1.4);

    return {
        fromStopId,
        toStopId,
        distanceMeters,
        durationSeconds,
        source: 'approximate-haversine',
        geometry: [
            { latitude: fromCoordinate.latitude, longitude: fromCoordinate.longitude },
            { latitude: toCoordinate.latitude, longitude: toCoordinate.longitude }
        ]
    };
};
