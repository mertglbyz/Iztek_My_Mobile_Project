import { MOCK_ROUTES } from '@/data/mockRoutes';
import { BusStop } from '@/types';

// Belirtilen route ID'sine ait durakları getirir
export function getStopsForRoute(routeId: string, allStops: BusStop[]): BusStop[] {
    const route = MOCK_ROUTES.find((r) => r.id === routeId);
    if (!route || !route.stops) return [];

    // Mevcut tüm duraklardan rote içindeki durakları map'le
    return route.stops
        .map((stopId) => allStops.find((s) => s.id === stopId))
        .filter((s): s is BusStop => s !== undefined);
}
