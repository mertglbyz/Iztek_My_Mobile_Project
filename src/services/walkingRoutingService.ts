/**
 * Yürüyüş Rotaları Servisi (Walking Routing Service)
 *
 * Faz 13: Provider mimarisi ile yeniden yapılandırılmıştır.
 * - Backend tabanlı gerçek yaya güzergâhı (OSM/OSRM/Valhalla)
 * - Haversine tabanlı yaklaşık fallback
 * - Mock provider (backend hazır olmadığında test için)
 * - Bellek içi LRU cache
 * - Timeout ve otomatik fallback yönetimi
 *
 * Ortam değişkeni: EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL
 */

import {
    WalkingRouteProvider,
    WalkingRouteResult,
} from '@/types';

// ============================
// YARDIMCI FONKSİYONLAR
// ============================

const deg2rad = (deg: number) => deg * (Math.PI / 180);

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const WALK_SPEED_MPS = 1.4; // Ortalama yürüme hızı (m/s)

const generateIsoTimestamp = (): string => new Date().toISOString();

// ============================
// HAVERSINE FALLBACK PROVIDER
// ============================

class HaversineWalkingProvider implements WalkingRouteProvider {
  readonly providerName = 'HaversineFallback';

  async getRoute(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
    fromStopId?: string,
    toStopId?: string
  ): Promise<WalkingRouteResult> {
    const distanceMeters = haversineDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    );

    const durationSeconds = Math.round(distanceMeters / WALK_SPEED_MPS);

    return {
      fromStopId,
      toStopId,
      distanceMeters,
      durationSeconds,
      source: 'approximate-haversine',
      isApproximate: true,
      retrievedAt: generateIsoTimestamp(),
      geometry:
        distanceMeters > 0
          ? [
              { latitude: from.latitude, longitude: from.longitude },
              { latitude: to.latitude, longitude: to.longitude },
            ]
          : [],
    };
  }
}

// ============================
// BACKEND API PROVIDER
// ============================

const DEFAULT_TIMEOUT_MS = 3000;

class BackendWalkingProvider implements WalkingRouteProvider {
  readonly providerName = 'BackendAPI';
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl?: string, timeoutMs?: number) {
    this.baseUrl =
      baseUrl ||
      process.env.EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL ||
      '';
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async getRoute(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
    fromStopId?: string,
    toStopId?: string
  ): Promise<WalkingRouteResult> {
    if (!this.baseUrl) {
      throw new Error(
        '[BackendWalkingProvider] EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL tanımlı değil.'
      );
    }

    // Koordinat geçerlilik kontrolü
    if (
      from.latitude === to.latitude &&
      from.longitude === to.longitude
    ) {
      throw new Error(
        '[BackendWalkingProvider] Başlangıç ve varış koordinatları aynı.'
      );
    }

    const url = `${this.baseUrl}/api/v1/routing/walk`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: from.latitude, lng: from.longitude },
          destination: { lat: to.latitude, lng: to.longitude },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // HTTP 4xx / 5xx
        let errorBody: any = null;
        try {
          errorBody = await response.json();
        } catch {
          // parse edilemezse boş
        }
        const errorCode = errorBody?.error || `HTTP_${response.status}`;
        const errorMsg =
          errorBody?.message ||
          `Backend yürüyüş servisi hata döndü (${response.status})`;
        throw new Error(
          `[BackendWalkingProvider] ${errorCode}: ${errorMsg}`
        );
      }

      const data = await response.json();

      // Response validasyonu
      if (!data || typeof data.distanceMeters !== 'number') {
        throw new Error(
          '[BackendWalkingProvider] Geçersiz response: distanceMeters eksik.'
        );
      }

      if (!Array.isArray(data.geometry) || data.geometry.length === 0) {
        throw new Error(
          '[BackendWalkingProvider] Boş veya geçersiz geometry.'
        );
      }

      // Geometry'deki her noktada latitude/longitude alanları kontrolü
      const validGeometry = data.geometry.every(
        (pt: any) =>
          typeof pt?.latitude === 'number' &&
          typeof pt?.longitude === 'number'
      );
      if (!validGeometry) {
        throw new Error(
          '[BackendWalkingProvider] Geometry içinde geçersiz koordinat noktası var.'
        );
      }

      return {
        fromStopId,
        toStopId,
        distanceMeters: data.distanceMeters,
        durationSeconds: data.durationSeconds ?? 0,
        geometry: data.geometry.map((pt: any) => ({
          latitude: pt.latitude,
          longitude: pt.longitude,
        })),
        source: 'backend-osm',
        isApproximate: data.isApproximate ?? false,
        retrievedAt: data.retrievedAt ?? generateIsoTimestamp(),
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error?.name === 'AbortError') {
        throw new Error(
          `[BackendWalkingProvider] Timeout: ${this.timeoutMs}ms içinde yanıt alınamadı.`
        );
      }

      throw error;
    }
  }
}

// ============================
// MOCK PROVIDER (Geliştirme ve test için)
// ============================

class MockWalkingProvider implements WalkingRouteProvider {
  readonly providerName = 'MockProvider';

  async getRoute(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
    fromStopId?: string,
    toStopId?: string
  ): Promise<WalkingRouteResult> {
    // API sözleşmesine uygun sentetik response
    const distanceMeters = haversineDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    );

    // Sentetik bir yaya rotası oluştur: başlangıç ve varış arasında
    // 3 ara nokta ekleyerek düz çizgi yerine kırık bir hat simüle et
    const midLat1 = from.latitude + (to.latitude - from.latitude) * 0.3;
    const midLon1 = from.longitude + (to.longitude - from.longitude) * 0.3;
    const midLat2 = from.latitude + (to.latitude - from.latitude) * 0.6;
    const midLon2 = from.longitude + (to.longitude - from.longitude) * 0.6;

    return {
      fromStopId,
      toStopId,
      distanceMeters,
      durationSeconds: Math.round(distanceMeters / WALK_SPEED_MPS),
      source: 'mock-provider',
      isApproximate: false,
      retrievedAt: generateIsoTimestamp(),
      geometry: [
        { latitude: from.latitude, longitude: from.longitude },
        { latitude: midLat1, longitude: midLon1 },
        { latitude: midLat2, longitude: midLon2 },
        { latitude: to.latitude, longitude: to.longitude },
      ],
    };
  }
}

// ============================
// CACHE KATMANI
// ============================

interface CacheEntry {
  result: WalkingRouteResult;
  timestamp: number;
}

/**
 * Bellek içi LRU cache.
 * - Cache anahtarı: başlangıç ve varış koordinatları (sıralı)
 * - A→B ≠ B→A (yön duyarlı)
 * - Maksimum 200 kayıt
 * - TTL: 5 dakika (300.000 ms)
 */
class WalkingRouteCache {
  private store = new Map<string, CacheEntry>();
  private readonly maxSize = 200;
  private readonly ttlMs = 5 * 60 * 1000; // 5 dakika

  private buildKey(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number
  ): string {
    // Koordinatları 5 ondalık basamağa yuvarlayarak key üret
    const round = (n: number) => Math.round(n * 100000) / 100000;
    return `${round(fromLat)},${round(fromLon)}|${round(toLat)},${round(toLon)}`;
  }

  get(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): WalkingRouteResult | null {
    const key = this.buildKey(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    );

    const entry = this.store.get(key);
    if (!entry) return null;

    // TTL kontrolü
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(key);
      return null;
    }

    return entry.result;
  }

  set(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
    result: WalkingRouteResult
  ): void {
    const key = this.buildKey(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    );

    // LRU: maksimum kapasiteye ulaşıldıysa en eski kaydı sil
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /** TTL'si dolmuş tüm kayıtları temizler */
  evictExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.store) {
      if (now - entry.timestamp > this.ttlMs) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Cache'teki toplam kayıt sayısı */
  get size(): number {
    return this.store.size;
  }

  /** Tüm cache'i temizler */
  clear(): void {
    this.store.clear();
  }
}

// ============================
// ANA SERVİS
// ============================

const cache = new WalkingRouteCache();

// Singleton provider'lar
let backendProvider: BackendWalkingProvider | null = null;
let haversineProvider: HaversineWalkingProvider | null = null;
let mockProvider: MockWalkingProvider | null = null;

function getBackendProvider(): BackendWalkingProvider {
  if (!backendProvider) {
    backendProvider = new BackendWalkingProvider();
  }
  return backendProvider;
}

function getHaversineProvider(): HaversineWalkingProvider {
  if (!haversineProvider) {
    haversineProvider = new HaversineWalkingProvider();
  }
  return haversineProvider;
}

function getMockProvider(): MockWalkingProvider {
  if (!mockProvider) {
    mockProvider = new MockWalkingProvider();
  }
  return mockProvider;
}

/**
 * Hangi provider'ın kullanılacağını belirler.
 *
 * Öncelik sırası:
 * 1. EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL tanımlıysa → Backend API
 * 2. EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED tanımlıysa → Mock Provider
 * 3. Hiçbiri yoksa → Haversine (doğrudan fallback)
 */
function resolvePrimaryProvider(): WalkingRouteProvider {
  const backendUrl = process.env.EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL;
  if (backendUrl) {
    return getBackendProvider();
  }

  const mockEnabled =
    process.env.EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED === 'true';
  if (mockEnabled) {
    console.log(
      '[WalkingRouting] Mock provider etkin — gerçek backend simüle ediliyor.'
    );
    return getMockProvider();
  }

  console.log(
    '[WalkingRouting] Backend URL tanımlı değil — doğrudan Haversine fallback kullanılıyor.'
  );
  return getHaversineProvider();
}

/**
 * İki koordinat arasındaki yaya rotasını döndürür.
 *
 * Akış:
 * 1. Cache kontrolü
 * 2. Aynı koordinat → sıfır mesafe
 * 3. Primary provider (backend veya mock) dene
 * 4. Başarısız olursa Haversine fallback'e geç
 * 5. Sonucu cache'e yaz
 *
 * @param fromCoordinate Başlangıç koordinatı
 * @param toCoordinate Varış koordinatı
 * @param fromStopId Opsiyonel başlangıç durak ID'si
 * @param toStopId Opsiyonel varış durak ID'si
 */
export const getWalkingRoute = async (
  fromCoordinate: { latitude: number; longitude: number },
  toCoordinate: { latitude: number; longitude: number },
  fromStopId?: string,
  toStopId?: string
): Promise<WalkingRouteResult> => {
  // 1. Cache kontrolü
  const cached = cache.get(fromCoordinate, toCoordinate);
  if (cached) {
    return cached;
  }

  // 2. Aynı koordinat → sıfır mesafe
  if (
    fromCoordinate.latitude === toCoordinate.latitude &&
    fromCoordinate.longitude === toCoordinate.longitude
  ) {
    const zeroResult: WalkingRouteResult = {
      fromStopId,
      toStopId,
      distanceMeters: 0,
      durationSeconds: 0,
      geometry: [],
      source: 'approximate-haversine',
      isApproximate: false,
      retrievedAt: generateIsoTimestamp(),
    };
    return zeroResult;
  }

  const primaryProvider = resolvePrimaryProvider();
  let result: WalkingRouteResult;
  let usedFallback = false;

  try {
    // 3. Primary provider'ı dene
    result = await primaryProvider.getRoute(
      fromCoordinate,
      toCoordinate,
      fromStopId,
      toStopId
    );

    // Ek validasyon: boş geometry kontrolü
    if (!result.geometry || result.geometry.length === 0) {
      throw new Error(
        `[WalkingRouting] ${primaryProvider.providerName} boş geometry döndü.`
      );
    }
  } catch (error: any) {
    // 4. Fallback: Haversine
    console.warn(
      `[WalkingRouting] ${primaryProvider.providerName} başarısız: ${error?.message || error}. Haversine fallback'e geçiliyor.`
    );
    usedFallback = true;

    result = await getHaversineProvider().getRoute(
      fromCoordinate,
      toCoordinate,
      fromStopId,
      toStopId
    );
  }

  // 5. Cache'e yaz (yalnızca mesafe > 0 ise)
  if (result.distanceMeters > 0) {
    cache.set(fromCoordinate, toCoordinate, result);
  }

  return result;
};

/**
 * Kullanıcıya gösterilecek fallback uyarı mesajını döndürür.
 * Eğer sonuç Haversine kaynaklı ise true döner.
 */
export const isApproximateRoute = (result: WalkingRouteResult): boolean => {
  return result.source === 'approximate-haversine';
};

/**
 * Yürüyüş rotası sonucunun UI'da nasıl gösterileceğini belirten durum bilgisi.
 */
export type WalkingRouteUIState =
  | 'loading'            // Rota hesaplanıyor
  | 'ready'              // Gerçek yaya rotası hazır
  | 'fallback'           // Yaklaşık fallback kullanılıyor
  | 'unavailable'        // Yaya rotası alınamadı
  | 'invalid_geometry'   // Geometry geçersiz
  | 'not_needed';        // Yürüyüş gerekmiyor

export const getWalkingUIState = (
  result: WalkingRouteResult | null,
  isLoading: boolean,
  distanceMeters: number | undefined
): WalkingRouteUIState => {
  if (isLoading) return 'loading';
  if (distanceMeters !== undefined && distanceMeters === 0) return 'not_needed';
  if (!result) return 'unavailable';
  if (result.geometry.length === 0) return 'invalid_geometry';
  if (result.source === 'approximate-haversine') return 'fallback';
  return 'ready';
};

// ============================
// CACHE YARDIMCI FONKSİYONLARI (Test ve debug için)
// ============================

export const getWalkingCacheSize = (): number => cache.size;
export const clearWalkingCache = (): void => cache.clear();
export const evictExpiredWalkingCache = (): number => cache.evictExpired();

// ============================
// TEST YARDIMCILARI (Test ortamında provider override için)
// ============================

/** Test ortamında singleton provider'ları sıfırlar */
export const _resetProviders = () => {
  backendProvider = null;
  haversineProvider = null;
  mockProvider = null;
};

export const _testing = {
  getBackendProvider,
  getHaversineProvider,
  getMockProvider,
  resolvePrimaryProvider,
  cache,
  DEFAULT_TIMEOUT_MS,
  _resetProviders,
};
