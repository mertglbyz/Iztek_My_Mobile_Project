import { BusStop, BusStopWithDistance, UserLocation } from '@/types';

/**
 * Haversine formülü ile iki koordinat arasındaki mesafeyi hesaplar (metre)
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371000; // Dünya yarıçapı (metre)
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Mesafeyi kullanıcı dostu formatta gösterir
 * - 1000m altı: "250 m"
 * - 1000m üstü: "1.2 km"
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Durakları verilen konuma göre mesafeyle birlikte hesaplar ve sıralar
 */
export function getSortedStopsByDistance(
    stops: BusStop[],
    userLocation: UserLocation
): BusStopWithDistance[] {
    return stops
        .map((stop) => ({
            ...stop,
            distanceMeters: calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                stop.latitude,
                stop.longitude
            ),
        }))
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/**
 * Durakları isim veya numara ile filtreler
 */
export function filterStops(stops: BusStop[], query: string): BusStop[] {
    const q = query.toLowerCase().trim();
    if (!q) return stops;
    return stops.filter(
        (stop) =>
            stop.name.toLowerCase().includes(q) ||
            stop.id.toString().includes(q) ||
            stop.routes.some((r) => r.toLowerCase().includes(q))
    );
}

/**
 * Tahmini varış süresini formatlar
 */
export function formatArrivalTime(minutes: number): string {
    if (minutes <= 0) return 'Yaklaşıyor';
    if (minutes === 1) return '1 dk';
    return `${minutes} dk`;
}
