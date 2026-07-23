/**
 * Faz 13: Yürüyüş Rotaları Servisi Kapsamlı Testleri
 */

import {
  getWalkingRoute,
  isApproximateRoute,
  getWalkingUIState,
  getWalkingCacheSize,
  clearWalkingCache,
  _testing,
  _resetProviders,
} from '@/services/walkingRoutingService';

import type { WalkingRouteResult } from '@/types';

describe('Faz 13 — Walking Routing Service (Provider + Cache + Fallback)', () => {

  beforeEach(() => {
    clearWalkingCache();
    _resetProviders();
    delete (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL;
    delete (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED;
  });

  afterAll(() => {
    clearWalkingCache();
  });

  // ========================
  // HAVERSINE TEMEL TESTLER
  // ========================

  describe('Haversine Fallback Provider', () => {

    it('koordinatlar arasi yaklasik rotayi (approximate-haversine) hesaplar', async () => {
      const fromCoord = { latitude: 38.4237, longitude: 27.1428 };
      const toCoord = { latitude: 38.4111, longitude: 27.1352 };
      const result = await getWalkingRoute(fromCoord, toCoord, 'STOP_A', 'STOP_B');

      expect(result).toBeDefined();
      expect(result.fromStopId).toBe('STOP_A');
      expect(result.toStopId).toBe('STOP_B');
      expect(result.distanceMeters).toBeGreaterThan(0);
      expect(result.distanceMeters).toBeLessThan(5000);
      expect(result.source).toBe('approximate-haversine');
      expect(result.isApproximate).toBe(true);
      expect(result.geometry.length).toBe(2);
      expect(result.durationSeconds).toBeGreaterThan(0);
      expect(result.retrievedAt).toBeDefined();
    });

    it('ayni koordinatlar verildiginde mesafe ve sure sifir donmelidir', async () => {
      const coord = { latitude: 38.4237, longitude: 27.1428 };
      const result = await getWalkingRoute(coord, coord);
      expect(result.distanceMeters).toBe(0);
      expect(result.durationSeconds).toBe(0);
      expect(result.geometry.length).toBe(0);
    });

    it('isApproximateRoute yardimci fonksiyonu dogru calisir', async () => {
      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );
      expect(isApproximateRoute(result)).toBe(true);
    });

  });

  // ========================
  // PROVIDER MIMARISI
  // ========================

  describe('Provider Architecture', () => {

    it('Haversine provider her zaman kullanilabilir olmalidir', () => {
      const provider = _testing.getHaversineProvider();
      expect(provider).toBeDefined();
      expect(provider.providerName).toBe('HaversineFallback');
    });

    it('Mock provider API sozlesmesine uygun response uretir', async () => {
      const provider = _testing.getMockProvider();
      const result = await provider.getRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 },
        'S1', 'S2'
      );
      expect(result.source).toBe('mock-provider');
      expect(result.isApproximate).toBe(false);
      expect(result.fromStopId).toBe('S1');
      expect(result.toStopId).toBe('S2');
      expect(result.geometry.length).toBeGreaterThan(2);
      expect(result.distanceMeters).toBeGreaterThan(0);
      expect(result.durationSeconds).toBeGreaterThan(0);
      expect(result.retrievedAt).toBeDefined();
    });

    it('Backend URL tanimli degilse Haversine provider kullanilir', () => {
      const provider = _testing.resolvePrimaryProvider();
      expect(provider.providerName).toBe('HaversineFallback');
    });

    it('MOCK_ENABLED tanimliysa Mock provider kullanilir', () => {
      (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED = 'true';
      const provider = _testing.resolvePrimaryProvider();
      expect(provider.providerName).toBe('MockProvider');
    });

    it('Backend provider ayni koordinatlarda kontrollu davranir', async () => {
      // getWalkingRoute aynı koordinatlarda 0 mesafe dönüp çökmez
      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.4, longitude: 27.1 }
      );
      expect(result.distanceMeters).toBe(0);
      expect(result.durationSeconds).toBe(0);
    });

  });

  // ========================
  // TIMEOUT VE HATA YONETIMI
  // ========================

  describe('Timeout & Error Handling', () => {

    it('timeout durumunda Haversine fallback devreye girer', async () => {
      (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL = 'http://localhost:9999';

      jest.useFakeTimers();

      const originalFetch = global.fetch;
      // AbortError simülasyonu — signal tetiklenince fetch reject olur
      global.fetch = jest.fn((url: any, options: any) =>
        new Promise((resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
            });
          }
        })
      ) as any;

      const promise = getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );

      // 3 saniye ileri sar ve timeout'u tetikle
      jest.advanceTimersByTime(3000);

      const result = await promise;

      expect(result.source).toBe('approximate-haversine');
      expect(result.isApproximate).toBe(true);

      global.fetch = originalFetch;
      delete (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL;
      jest.useRealTimers();
    });

    it('network hatasinda (fetch reject) Haversine fallback devreye girer', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as any;

      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );

      expect(result.source).toBe('approximate-haversine');
      expect(result.isApproximate).toBe(true);

      global.fetch = originalFetch;
    });

    it('HTTP 5xx hatasinda Haversine fallback devreye girer', async () => {
      (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL = 'http://localhost:9999';

      const originalFetch = global.fetch;
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false, status: 500,
          json: () => Promise.resolve({ error: 'INTERNAL_ERROR', message: 'Sunucu hatası' }),
        })
      ) as any;

      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );

      expect(result.source).toBe('approximate-haversine');
      expect(result.isApproximate).toBe(true);

      global.fetch = originalFetch;
      delete (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL;
    });

    it('HTTP 4xx hatasinda Haversine fallback devreye girer', async () => {
      (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL = 'http://localhost:9999';

      const originalFetch = global.fetch;
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false, status: 404,
          json: () => Promise.resolve({ error: 'ROUTE_NOT_FOUND', message: 'Rota bulunamadı' }),
        })
      ) as any;

      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );

      expect(result.source).toBe('approximate-haversine');

      global.fetch = originalFetch;
      delete (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL;
    });

    it('bos geometry durumunda Haversine fallback devreye girer', async () => {
      (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL = 'http://localhost:9999';

      const originalFetch = global.fetch;
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            distanceMeters: 1500, durationSeconds: 1000,
            geometry: [], source: 'backend-osm', isApproximate: false,
            retrievedAt: '2026-07-22T10:00:00Z',
          }),
        })
      ) as any;

      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );

      expect(result.source).toBe('approximate-haversine');

      global.fetch = originalFetch;
      delete (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL;
    });

    it('gecersiz geometry (eksik latitude/longitude) durumunda fallback calisir', async () => {
      (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL = 'http://localhost:9999';

      const originalFetch = global.fetch;
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            distanceMeters: 1500, durationSeconds: 1000,
            geometry: [{ lat: 38.4, lng: 27.1 }],
            source: 'backend-osm',
          }),
        })
      ) as any;

      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );

      expect(result.source).toBe('approximate-haversine');

      global.fetch = originalFetch;
      delete (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL;
    });

    it('backend bulunmadiginda uygulama yaklasik yontemle calismaya devam eder', async () => {
      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );

      expect(result.source).toBe('approximate-haversine');
      expect(result.isApproximate).toBe(true);
      expect(result.geometry.length).toBeGreaterThan(0);
    });

    it('gecersiz koordinat (NaN) durumunda da cökmez', async () => {
      const result = await getWalkingRoute(
        { latitude: NaN, longitude: NaN },
        { latitude: 38.5, longitude: 27.2 }
      );
      expect(result).toBeDefined();
    });

  });

  // ========================
  // CACHE TESTLERI
  // ========================

  describe('Cache Mechanism', () => {

    it('cache hit durumunda ikinci istek provider getRoute metodunu cagirmaz', async () => {
      (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED = 'true';
      const mockProvider = _testing.getMockProvider();
      const spy = jest.spyOn(mockProvider, 'getRoute');

      const fromCoord = { latitude: 38.4, longitude: 27.1 };
      const toCoord = { latitude: 38.5, longitude: 27.2 };

      await getWalkingRoute(fromCoord, toCoord);
      expect(getWalkingCacheSize()).toBe(1);
      expect(spy).toHaveBeenCalledTimes(1);

      // İkinci çağrı aynı → cache'ten gelmeli
      await getWalkingRoute(fromCoord, toCoord);
      expect(getWalkingCacheSize()).toBe(1);
      expect(spy).toHaveBeenCalledTimes(1); // artmamalı

      spy.mockRestore();
      delete (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED;
    });

    it('cache key yon duyarlidir — A→B ile B→A farkli kayitlardir', async () => {
      (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED = 'true';
      const coordA = { latitude: 38.4, longitude: 27.1 };
      const coordB = { latitude: 38.5, longitude: 27.2 };

      await getWalkingRoute(coordA, coordB);
      const size1 = getWalkingCacheSize();
      await getWalkingRoute(coordB, coordA);
      const size2 = getWalkingCacheSize();

      expect(size2).toBe(size1 + 1);
      delete (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED;
    });

    it('0 mesafeli sonuclar cache e yazilmaz', async () => {
      const coord = { latitude: 38.4, longitude: 27.1 };
      await getWalkingRoute(coord, coord);
      expect(getWalkingCacheSize()).toBe(0);
    });

    it('TTL (5 dk) suresi dolmus veriler get edildiginde silinir ve null doner', async () => {
      jest.useFakeTimers();
      (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED = 'true';
      
      const fromCoord = { latitude: 38.4, longitude: 27.1 };
      const toCoord = { latitude: 38.5, longitude: 27.2 };

      await getWalkingRoute(fromCoord, toCoord);
      expect(getWalkingCacheSize()).toBe(1);

      // 5 dakika 1 saniye ileri sar
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

      const cached = _testing.cache.get(fromCoord, toCoord);
      expect(cached).toBeNull();
      expect(getWalkingCacheSize()).toBe(0);

      delete (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED;
      jest.useRealTimers();
    });

    it('LRU kapasitesi 200 ile sinirlidir ve en eskiler silinir', () => {
      // Doğrudan cache üzerinde test edeceğiz
      const { cache } = _testing;
      
      // 205 tane kayıt ekleyelim
      for (let i = 1; i <= 205; i++) {
        cache.set(
          { latitude: 38.4, longitude: 27.1 + i * 0.0001 },
          { latitude: 38.5, longitude: 27.2 },
          { distanceMeters: 100, durationSeconds: 50, geometry: [], source: 'mock', isApproximate: false, retrievedAt: 'date' } as any
        );
      }

      // Kapasite 200'ü geçmemeli
      expect(getWalkingCacheSize()).toBe(200);

      // İlk eklenen (i=1..5) kayıtlar silinmiş olmalı
      const firstOldest = cache.get(
        { latitude: 38.4, longitude: 27.1 + 1 * 0.0001 },
        { latitude: 38.5, longitude: 27.2 }
      );
      expect(firstOldest).toBeNull();
    });

    it('Cache hit oldugunda LRU siralamasinda en sona (MRU) tasinir', () => {
      const { cache } = _testing;
      
      const coordA = { latitude: 10, longitude: 10 };
      const coordB = { latitude: 20, longitude: 20 };
      const coordC = { latitude: 30, longitude: 30 };
      const to = { latitude: 0, longitude: 0 };
      
      const res = { distanceMeters: 100, durationSeconds: 50, geometry: [], source: 'mock', isApproximate: false, retrievedAt: 'date' } as any;

      // 1. Kapasiteyi tam 200'e dolduralım (197 tane dummy ekleyelim)
      for (let i = 1; i <= 197; i++) {
        cache.set({ latitude: 1, longitude: i }, to, res);
      }

      // 2. Şimdi A, B, C'yi ekleyelim. Toplam 200 oldu.
      // Sıra: [..., A, B, C]
      cache.set(coordA, to, res);
      cache.set(coordB, to, res);
      cache.set(coordC, to, res);

      // 3. A'yı okuyalım (Cache hit). A sıranın en sonuna geçmeli.
      // Sıra: [..., B, C, A]
      cache.get(coordA, to);

      // 4. Şimdi kapasiteyi zorlamak için 199 yeni kayıt ekleyelim.
      // Toplam kapasite 200 olduğu için en eski 199 kayıt silinecek.
      // Mevcut sıra: [197 eski dummy, B, C, A] idi.
      // 199 yeni kayıt eklendiğinde silinecekler: 197 eski dummy + B + C.
      // Geriye sadece A (1) ve 199 yeni kayıt (toplam 200) kalmalı.
      for (let i = 1; i <= 199; i++) {
        cache.set({ latitude: 2, longitude: i }, to, res);
      }
      
      // Artık B ve C silindi.
      expect(cache.get(coordB, to)).toBeNull();
      expect(cache.get(coordC, to)).toBeNull();
      // A hala hayatta olmalı çünkü hit olduğu için MRU'ya taşınmıştı ve silinmekten kurtuldu.
      expect(cache.get(coordA, to)).not.toBeNull();
    });

  });

  // ========================
  // UI DURUM TESTLERI
  // ========================

  describe('UI State Management (getWalkingUIState)', () => {

    it('loading durumunda "loading" doner', () => {
      expect(getWalkingUIState(null, true, undefined)).toBe('loading');
    });

    it('mesafe 0 ise "not_needed" doner', () => {
      expect(getWalkingUIState(null, false, 0)).toBe('not_needed');
    });

    it('sonuc null ise "unavailable" doner', () => {
      expect(getWalkingUIState(null, false, 100)).toBe('unavailable');
    });

    it('geometry bossa "invalid_geometry" doner', () => {
      const emptyResult: WalkingRouteResult = {
        distanceMeters: 100, durationSeconds: 70, geometry: [],
        source: 'backend-osm', isApproximate: false,
        retrievedAt: new Date().toISOString(),
      };
      expect(getWalkingUIState(emptyResult, false, 100)).toBe('invalid_geometry');
    });

    it('Haversine kaynakli sonuc "fallback" doner', () => {
      const approxResult: WalkingRouteResult = {
        distanceMeters: 100, durationSeconds: 70,
        geometry: [{ latitude: 38.4, longitude: 27.1 }, { latitude: 38.5, longitude: 27.2 }],
        source: 'approximate-haversine', isApproximate: true,
        retrievedAt: new Date().toISOString(),
      };
      expect(getWalkingUIState(approxResult, false, 100)).toBe('fallback');
    });

    it('backend-osm kaynakli sonuc "ready" doner', () => {
      const backendResult: WalkingRouteResult = {
        distanceMeters: 100, durationSeconds: 70,
        geometry: [{ latitude: 38.4, longitude: 27.1 }, { latitude: 38.5, longitude: 27.2 }],
        source: 'backend-osm', isApproximate: false,
        retrievedAt: new Date().toISOString(),
      };
      expect(getWalkingUIState(backendResult, false, 100)).toBe('ready');
    });

    it('mock-provider kaynakli sonuc "ready" doner', () => {
      const mockResult: WalkingRouteResult = {
        distanceMeters: 100, durationSeconds: 70,
        geometry: [{ latitude: 38.4, longitude: 27.1 }, { latitude: 38.5, longitude: 27.2 }],
        source: 'mock-provider', isApproximate: false,
        retrievedAt: new Date().toISOString(),
      };
      expect(getWalkingUIState(mockResult, false, 100)).toBe('ready');
    });

  });

  // ========================
  // MODEL DOGRULAMA
  // ========================

  describe('WalkingRouteResult Model Validation', () => {

    it('distanceMeters sayisal ve pozitif olmalidir (mesafe > 0 ise)', async () => {
      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );
      expect(typeof result.distanceMeters).toBe('number');
      expect(result.distanceMeters).toBeGreaterThan(0);
    });

    it('durationSeconds sayisal ve >= 0 olmalidir', async () => {
      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );
      expect(typeof result.durationSeconds).toBe('number');
      expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
    });

    it('geometry dizisindeki her nokta latitude ve longitude icermelidir', async () => {
      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );
      expect(Array.isArray(result.geometry)).toBe(true);
      result.geometry.forEach(pt => {
        expect(typeof pt.latitude).toBe('number');
        expect(typeof pt.longitude).toBe('number');
      });
    });

    it('source gecerli bir enum degeridir', async () => {
      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );
      expect(['backend-osm', 'approximate-haversine', 'mock-provider']).toContain(result.source);
    });

    it('retrievedAt gecerli bir ISO 8601 zaman damgasidir', async () => {
      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 }
      );
      expect(isNaN(Date.parse(result.retrievedAt))).toBe(false);
    });

  });

  // ========================
  // MOCK BAŞARILI RESPONSE
  // ========================

  describe('Mock Provider Integration', () => {

    it('mock provider ile gercek yaya rotasi simule edilir', async () => {
      (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED = 'true';

      const result = await getWalkingRoute(
        { latitude: 38.4, longitude: 27.1 },
        { latitude: 38.5, longitude: 27.2 },
        'STOP_START', 'STOP_END'
      );

      expect(result.source).toBe('mock-provider');
      expect(result.isApproximate).toBe(false);
      expect(result.fromStopId).toBe('STOP_START');
      expect(result.toStopId).toBe('STOP_END');
      expect(result.geometry.length).toBe(3);

      delete (process.env as any).EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED;
    });

  });

});
