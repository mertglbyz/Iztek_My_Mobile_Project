import { BusRoute } from '@/types';

export const MOCK_ROUTES: BusRoute[] = [];

export interface TripSuggestion {
    id: string;
    durationMinutes: number;
    transfers: number;
    lines: string[];
    walkingMinutes: number;
    summary: string;
}

export const MOCK_TRIP_SUGGESTIONS: TripSuggestion[] = [];
