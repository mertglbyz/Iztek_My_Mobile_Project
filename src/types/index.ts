// ============================
// Durak Yakınımda - Type Definitions
// ============================

/** ESHOT durak bilgisi */
export interface BusStop {
  id: string | number;
  name: string;
  latitude: number;
  longitude: number;
  routes: number[];
  isFavorite?: boolean;
}

/** Favori hat bilgisi */
export interface BusRoute {
  id: string;
  routeNumber: string;
  title: string;
  operatingHours: string;
  hasAnnouncement?: boolean;
  stops?: number[]; // Hangi duraklardan geçtiği (id listesi)
}

/** 9 Temmuz Görev Listesi: Hatlar Modülü */
export type BusRouteSummary = {
  routeNumber: number;
  stopCount: number;
  routeName?: string;
};

/** Durağa yaklaşan otobüs (API Veri Modeli) */
export interface ApproachingBus {
  busId: string | number;
  routeNumber: string | number;
  routeName: string;
  remainingStopCount: number | null;
  direction: string | number | null;
  latitude: number | null;
  longitude: number | null;
  isAccessible: boolean;
  hasBicycleRack: boolean;
}

/** API Durum Modeli (UI Yönetimi İçin) */
export interface ApiResponseState<T = any> {
  isLoading: boolean;
  isSuccess: boolean;
  isEmpty: boolean;
  errorMessage: string | null;
  data?: T;
}

/** Kullanıcı konumu */
export interface UserLocation {
  latitude: number;
  longitude: number;
}

/** Durak + mesafe birleşik tipi (yakındaki listede kullanılır) */
export interface BusStopWithDistance extends BusStop {
  distanceMeters: number;
}

/** Favori context tipi */
export interface FavoritesContextType {
  favoriteStops: BusStop[];
  favoriteRoutes: BusRoute[];
  addFavoriteStop: (stop: BusStop) => Promise<void>;
  removeFavoriteStop: (stopId: string | number) => Promise<void>;
  isFavoriteStop: (stopId: string | number) => boolean;
  addFavoriteRoute: (route: BusRoute) => Promise<void>;
  removeFavoriteRoute: (routeId: string) => Promise<void>;
  isFavoriteRoute: (routeId: string) => boolean;
  isLoading: boolean;
}

/** Konum izin durumu */
export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

// ============================
// Faz 13: Yürüyüş Rotaları
// ============================

/** Yürüyüş rotası sonuç modeli (Walking Route Result) */
export interface WalkingRouteResult {
  /** Metre cinsinden yürüme mesafesi */
  distanceMeters: number;
  /** Saniye cinsinden tahmini yürüme süresi */
  durationSeconds: number;
  /** React Native Maps Polyline için normalize edilmiş koordinat dizisi */
  geometry: { latitude: number; longitude: number }[];
  /** Sağlayıcı kaynağı */
  source: 'backend-osm' | 'approximate-haversine' | 'mock-provider';
  /** Gerçek rota mı yoksa yaklaşık mı? */
  isApproximate: boolean;
  /** Yanıtın alındığı ISO 8601 zaman damgası */
  retrievedAt: string;
  /** Opsiyonel: Başlangıç durak ID'si */
  fromStopId?: string;
  /** Opsiyonel: Varış durak ID'si */
  toStopId?: string;
}

/** Yürüyüş rotası sağlayıcı arayüzü */
export interface WalkingRouteProvider {
  /** Sağlayıcı adı (debug ve loglama için) */
  readonly providerName: string;
  /** Koordinat çifti için yürüyüş rotası hesapla */
  getRoute(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
    fromStopId?: string,
    toStopId?: string
  ): Promise<WalkingRouteResult>;
}
