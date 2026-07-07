// ============================
// Durak Yakınımda - Type Definitions
// ============================

/** ESHOT durak bilgisi */
export interface BusStop {
  /** 5 haneli durak kimliği (ör. 12234) */
  id: number;
  /** Durak adı (ör. "Konak İskele") */
  name: string;
  latitude: number;
  longitude: number;
  district: string;
  routes: string[];
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

/** Durağa yaklaşan otobüs */
export interface ApproachingBus {
  id: string;
  routeNumber: string;
  destination: string;
  estimatedMinutes: number;
  isAccessible: boolean;
  isLowFloor: boolean;
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
  removeFavoriteStop: (stopId: number) => Promise<void>;
  isFavoriteStop: (stopId: number) => boolean;
  addFavoriteRoute: (route: BusRoute) => Promise<void>;
  removeFavoriteRoute: (routeId: string) => Promise<void>;
  isFavoriteRoute: (routeId: string) => boolean;
  isLoading: boolean;
}

/** Konum izin durumu */
export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';
