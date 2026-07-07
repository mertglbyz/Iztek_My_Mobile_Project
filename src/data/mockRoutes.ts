import { BusRoute } from '@/types';

export const MOCK_ROUTES: BusRoute[] = [
    {
        id: 'route-35',
        routeNumber: '35',
        title: 'KARŞIYAKA — ALSANCAK',
        operatingHours: '06:30 – 23:45',
        stops: [40328, 40312, 60551, 60534, 70612, 10187],
    },
    {
        id: 'route-54',
        routeNumber: '54',
        title: 'KONAK — BORNOVA',
        operatingHours: '06:00 – 23:30',
        hasAnnouncement: true,
        stops: [10123, 10145, 10156, 70612, 30241, 30256],
    },
    {
        id: 'route-72',
        routeNumber: '72',
        title: 'İŞÇİEVLERİ — KONAK',
        operatingHours: '06:05 – 23:12',
        stops: [50489, 50512, 10178, 10123],
    },
    {
        id: 'route-33',
        routeNumber: '33',
        title: 'KONAK — KARŞIYAKA İSKELE',
        operatingHours: '05:45 – 23:50',
        stops: [10123, 10156, 70612, 60534, 40312, 40328],
    },
    {
        id: 'route-52a',
        routeNumber: '52/A',
        title: 'BORNOVA — KONAK',
        operatingHours: '06:15 – 22:40',
        stops: [30278, 30256, 30241, 70612, 10123],
    },
    {
        id: 'route-13',
        routeNumber: '13',
        title: 'KARŞIYAKA — KONAK',
        operatingHours: '06:20 – 23:00',
        stops: [12234, 40312, 60551, 10145, 10123],
    },
];

export interface TripSuggestion {
    id: string;
    durationMinutes: number;
    transfers: number;
    lines: string[];
    walkingMinutes: number;
    summary: string;
}

export const MOCK_TRIP_SUGGESTIONS: TripSuggestion[] = [
    {
        id: 'trip-1',
        durationMinutes: 28,
        transfers: 0,
        lines: ['35'],
        walkingMinutes: 4,
        summary: '35 hattı ile doğrudan',
    },
    {
        id: 'trip-2',
        durationMinutes: 35,
        transfers: 1,
        lines: ['54', '33'],
        walkingMinutes: 6,
        summary: '54 → Konak aktarma → 33',
    },
    {
        id: 'trip-3',
        durationMinutes: 42,
        transfers: 1,
        lines: ['72', '35'],
        walkingMinutes: 8,
        summary: '72 → Halkapınar aktarma → 35',
    },
];
