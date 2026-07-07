import { MOCK_ROUTES } from '@/data/mockRoutes';
import { MOCK_STOPS } from '@/data/mockStops';
import { BusStop } from '@/types';

// Belirtilen route ID'sine ait durakları getirir
export function getStopsForRoute(routeId: string): BusStop[] {
    const route = MOCK_ROUTES.find((r) => r.id === routeId);
    if (!route || !route.stops) return [];

    // Mevcut tüm duraklardan rote içindeki durakları map'le
    return route.stops
        .map((stopId) => MOCK_STOPS.find((s) => s.id === stopId))
        .filter((s): s is BusStop => s !== undefined);
}
