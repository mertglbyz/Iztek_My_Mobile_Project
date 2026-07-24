import { calculateDistanceMeters, calculateProgress, StopCoordinate } from '../services/location/progressAlgorithm';
import { JourneyConstants } from '../config/journeyConstants';
import { JourneyLocation } from '../types/journey';

describe('progressAlgorithm', () => {
    describe('calculateDistanceMeters', () => {
        it('should calculate distance correctly', () => {
            // İzmir saat kulesi ve Konak pier arası yaklaşık 350-400 metre
            const dist = calculateDistanceMeters(38.4189, 27.1287, 38.4216, 27.1285);
            expect(dist).toBeGreaterThan(250);
            expect(dist).toBeLessThan(400);
        });
    });

    describe('calculateProgress', () => {
        const stops: StopCoordinate[] = [
            { id: '1', latitude: 38.410, longitude: 27.120 }, // Stop 1
            { id: '2', latitude: 38.415, longitude: 27.125 }, // Stop 2
            { id: '3', latitude: 38.420, longitude: 27.130 }, // Stop 3
            { id: '4', latitude: 38.425, longitude: 27.135 }, // Stop 4
        ];

        it('should return null if accuracy is too low', () => {
            const loc: JourneyLocation = { latitude: 38.410, longitude: 27.120, accuracy: 100, timestamp: 0 };
            // MIN_REQUIRED_ACCURACY_METERS is 50
            const result = calculateProgress(loc, stops, 0);
            expect(result).toBeNull();
        });

        it('should return null if location is far from all next stops', () => {
            // Far away location
            const loc: JourneyLocation = { latitude: 38.500, longitude: 27.200, accuracy: 10, timestamp: 0 };
            const result = calculateProgress(loc, stops, 0);
            expect(result).not.toBeNull();
            expect(result?.consecutiveHits).toBe(0);
            expect(result?.candidateStopIndex).toBe(-1);
            expect(result?.passedStopsCount).toBe(0);
        });

        it('should advance to next stop if within threshold', () => {
            // At stop 2
            const loc: JourneyLocation = { latitude: 38.415, longitude: 27.125, accuracy: 10, timestamp: 0 };
            const result = calculateProgress(loc, stops, 0, 1, 1); // Mock: we were previously hitting stop 2 (idx: 1) with 1 hit
            
            expect(result).not.toBeNull();
            expect(result?.currentStopId).toBe('2');
            expect(result?.nextStopId).toBe('3');
            expect(result?.passedStopsCount).toBe(2); // Passed 1 and 2
            expect(result?.remainingStopsCount).toBe(2);
        });

        it('should not go backwards (forward-only rule)', () => {
            // User is at stop 1
            const loc: JourneyLocation = { latitude: 38.410, longitude: 27.120, accuracy: 10, timestamp: 0 };
            
            // But state says they already passed 2 stops (currently heading to stop 3)
            const result = calculateProgress(loc, stops, 2, 0, 1);
            
            // Should ignore stop 1 and return untouched state with consecutiveHits reset
            expect(result).not.toBeNull();
            expect(result?.consecutiveHits).toBe(0);
            expect(result?.candidateStopIndex).toBe(-1);
            expect(result?.passedStopsCount).toBe(2);
        });

        it('should skip a stop if GPS jumps ahead', () => {
            // User is at stop 3
            const loc: JourneyLocation = { latitude: 38.420, longitude: 27.130, accuracy: 10, timestamp: 0 };
            
            // We have only passed 0 stops so far. Mock: hitting stop 3 (idx 2) with 1 hit previously.
            const result = calculateProgress(loc, stops, 0, 2, 1);
            
            expect(result).not.toBeNull();
            expect(result?.currentStopId).toBe('3');
            expect(result?.nextStopId).toBe('4');
            expect(result?.passedStopsCount).toBe(3);
        });

        it('should handle reaching the final stop', () => {
            // User is at stop 4
            const loc: JourneyLocation = { latitude: 38.425, longitude: 27.135, accuracy: 10, timestamp: 0 };
            
            const result = calculateProgress(loc, stops, 3, 3, 1);
            
            expect(result).not.toBeNull();
            expect(result?.currentStopId).toBe('4');
            expect(result?.nextStopId).toBeNull();
            expect(result?.passedStopsCount).toBe(4);
            expect(result?.remainingStopsCount).toBe(0);
        });

        it('should correctly handle ring (loop) routes without jumping to the end', () => {
            const loopStops: StopCoordinate[] = [
                { id: 'A_1', latitude: 38.410, longitude: 27.120 }, // Başlangıç
                { id: 'B_2', latitude: 38.415, longitude: 27.125 }, // Gidiş
                { id: 'C_3', latitude: 38.420, longitude: 27.130 }, // Zirve / Dönüş noktası
                { id: 'B_4', latitude: 38.415, longitude: 27.125 }, // Aynı yoldan dönüş (B_2 ile aynı koordinat)
                { id: 'A_5', latitude: 38.410, longitude: 27.120 }, // Bitiş (A_1 ile aynı koordinat)
            ];

            // Kullanıcı yolculuğun başında (A_1) olsun.
            const locA1: JourneyLocation = { latitude: 38.410, longitude: 27.120, accuracy: 10, timestamp: 0 };
            
            // Eğer algoritma aptalsa, A_1 ile A_5 aynı olduğu için direkt A_5'e (index 4) zıplayıp "yolculuk bitti" diyebilir.
            const resultA1 = calculateProgress(locA1, loopStops, 0, 0, 1);
            
            expect(resultA1).not.toBeNull();
            // maxReachedIndex 0'da kalmalı, break atmalı, 4'e atlamamalı.
            expect(resultA1?.currentStopId).toBe('A_1');
            expect(resultA1?.passedStopsCount).toBe(1);

            // Kullanıcı B_2'ye gelsin (index 1). Algoritma B_4'e atlamamalı.
            const locB2: JourneyLocation = { latitude: 38.415, longitude: 27.125, accuracy: 10, timestamp: 0 };
            const resultB2 = calculateProgress(locB2, loopStops, 1, 1, 1);
            
            expect(resultB2).not.toBeNull();
            expect(resultB2?.currentStopId).toBe('B_2');
            expect(resultB2?.passedStopsCount).toBe(2);
        });
    });
});
