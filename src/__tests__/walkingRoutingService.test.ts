import { getWalkingRoute } from '@/services/walkingRoutingService';

describe('Walking Routing Service Tests', () => {

    it('getWalkingRoute basarili bir sekilde kordinatlar arasi yaklasik rotayi (approximate) hesaplar', async () => {
        const fromCoord = { latitude: 38.4237, longitude: 27.1428 };
        const toCoord = { latitude: 38.4111, longitude: 27.1352 };

        const result = await getWalkingRoute(fromCoord, toCoord, 'STOP_A', 'STOP_B');

        expect(result).toBeDefined();
        expect(result.fromStopId).toBe('STOP_A');
        expect(result.toStopId).toBe('STOP_B');

        // Mesafe hesaplaması beklenen sınırlar içerisinde olmalı
        expect(result.distanceMeters).toBeGreaterThan(0);
        expect(result.distanceMeters).toBeLessThan(2000); // Ortalama bu iki nokta arası 1.5km civarıdır

        // Kuş uçuşu (approximate) kaynak kullanılıyor
        expect(result.source).toBe('approximate');

        // Geometri noktaları barındırmalı
        expect(result.geometry).toBeDefined();
        expect(result.geometry?.length).toBe(2);

        // Süre sıfırdan büyük olmalı (saniye)
        expect(result.durationSeconds).toBeGreaterThan(0);
    });

    it('Ayni koordinatlar verildiginde mesafe ve sure sifir donmelidir', async () => {
        const fromCoord = { latitude: 38.4237, longitude: 27.1428 };

        const result = await getWalkingRoute(fromCoord, fromCoord);

        expect(result.distanceMeters).toBe(0);
        expect(result.durationSeconds).toBe(0);
    });

});
