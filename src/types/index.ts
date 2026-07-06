// ============================
// Durak Yakınımda - Type Definitions
// ============================

/** ESHOT durak bilgisi */
export interface BusStop {
  id: string;
  name: string;
  stopNumber: string;
  latitude: number;
  longitude: number;
  district: string;
  routes: string[];
  isFavorite?: boolean;
}

/** Durağa yaklaşan otobüs */
export interface ApproachingBus {
  id: string;
  routeNumber: string;
  destination: string;
  estimatedMinutes: number;   // dakika cinsinden tahmini süre
  isAccessible: boolean;       // engelli erişimi var mı
  isLowFloor: boolean;         // alçak tabanlı mı
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
  favorites: BusStop[];
  addFavorite: (stop: BusStop) => Promise<void>;
  removeFavorite: (stopId: string) => Promise<void>;
  isFavorite: (stopId: string) => boolean;
  isLoading: boolean;
}

/** Konum izin durumu */
export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';
