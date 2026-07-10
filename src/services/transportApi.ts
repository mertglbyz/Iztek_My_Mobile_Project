// src/services/transportApi.ts

/**
 * ESHOT Ulaşım Servis Katmanı
 * Uygulamanın dış kaynaklarla (API ve JSON) olan bağlantısını güvence altında tutar.
 */

import stopsJson from '@/data/stops.json';
import { ApproachingBus, BusStop } from '@/types';

// ============================
// HELPER FONKSİYONLAR
// ============================

export const parseCoordinate = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseFloat(String(value).replace(',', '.'));
  return isNaN(parsed) ? null : parsed;
};

export const parseRoutes = (value: any): number[] => {
  if (Array.isArray(value)) {
    return value.map(Number).filter(n => !isNaN(n));
  }
  if (typeof value === 'string') {
    return value.split('-').map(Number).filter(n => !isNaN(n));
  }
  return [];
};

export const normalizeStop = (rawStop: any): BusStop => {
  return {
    id: rawStop.id ? String(rawStop.id) : String(Math.random()),
    name: rawStop.name || 'Bilinmiyor',
    latitude: parseCoordinate(rawStop.latitude) || 0,
    longitude: parseCoordinate(rawStop.longitude) || 0,
    routes: parseRoutes(rawStop.routes)
  };
};

export const normalizeApproachingBus = (rawBus: any): ApproachingBus => {
  return {
    busId: rawBus.OtobusId ? String(rawBus.OtobusId) : '0',
    routeNumber: rawBus.HatNumarasi ? String(rawBus.HatNumarasi) : '?',
    routeName: rawBus.HatAdi ? String(rawBus.HatAdi) : 'Bilinmeyen Hat',
    remainingStopCount: rawBus.KalanDurakSayisi !== null && rawBus.KalanDurakSayisi !== undefined ? Number(rawBus.KalanDurakSayisi) : null,
    direction: rawBus.HattinYonu !== null && rawBus.HattinYonu !== undefined ? String(rawBus.HattinYonu) : null,
    latitude: parseCoordinate(rawBus.KoorX),
    longitude: parseCoordinate(rawBus.KoorY),
    isAccessible: Boolean(rawBus.EngelliMi),
    hasBicycleRack: Boolean(rawBus.BisikletAparatliMi)
  };
};

/** Hat Lokasyon API'sinden gelen farklı field yapıları için özel dönüştürücü */
export const normalizeRouteVehicle = (rawVehicle: any): ApproachingBus => {
  return {
    busId: rawVehicle.OtobusId ? String(rawVehicle.OtobusId) : '0',
    routeNumber: rawVehicle.HatNumarasi ? String(rawVehicle.HatNumarasi) : '?',
    routeName: '', // Konum API'sinden ad dönmeyebiliyor
    remainingStopCount: null, // Duraksal bir tahmin yok, sadece GPS var
    direction: rawVehicle.Yon !== undefined ? String(rawVehicle.Yon) : null,
    latitude: parseCoordinate(rawVehicle.KoorX),
    longitude: parseCoordinate(rawVehicle.KoorY),
    isAccessible: false,
    hasBicycleRack: false
  };
};

// ============================
// ANA SERVİS METOTLARI
// ============================

let cachedStops: BusStop[] | null = null;

/**
 * 50 kayıtlık JSON'dan tüm durakları çeker ve normalize eder.
 */
export const getStops = async (): Promise<BusStop[]> => {
  if (cachedStops) return cachedStops;

  try {
    const rawStops = stopsJson as any[];

    const validStops = rawStops
      .map(normalizeStop)
      .filter(s => s.latitude !== 0 && s.longitude !== 0 && s.id);

    cachedStops = validStops;
    return validStops;
  } catch (error) {
    console.error("Duraklar yüklenirken hata oluştu:", error);
    return [];
  }
};

/**
 * Durak arama metodu (Ad, ID veya Geçen Hatta Göre)
 */
export const searchStops = async (query: string): Promise<BusStop[]> => {
  const stops = await getStops();
  const q = query.toLocaleLowerCase('tr-TR').trim();
  if (!q) return [];

  return stops.filter(s => {
    if (s.name.toLocaleLowerCase('tr-TR').includes(q)) return true;
    if (String(s.id).includes(q)) return true;

    const qNum = Number(q);
    if (!isNaN(qNum) && s.routes.includes(qNum)) return true;

    return false;
  });
};

/**
 * ID ile durak bulma
 */
export const getStopById = async (stopId: string | number): Promise<BusStop | undefined> => {
  const stops = await getStops();
  return stops.find(s => String(s.id) === String(stopId));
};

/**
 * Yaklaşan otobüsleri API'den çeker ve temiz modele dönüştürür.
 */
export const getApproachingBuses = async (stopId: string | number): Promise<ApproachingBus[]> => {
  try {
    const response = await fetch(`https://openapi.izmir.bel.tr/api/iztek/duragayaklasanotobusler/${stopId}`);

    if (!response.ok) {
      throw new Error(`API Hatası: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(normalizeApproachingBus);
  } catch (error) {
    console.warn(`Durak ${stopId} için araçlar getirilirken hata:`, error);
    throw error;
  }
};

/**
 * 4. MADDE: Hat numarasına göre canlı araç konumlarını getir.
 * ESHOT API'sindeki Ping-Trail (Tekrarlayan Otobüs ID) hatasını Deduplication ile engeller.
 */
export const getRouteVehicles = async (routeNumber: string | number): Promise<ApproachingBus[]> => {
  try {
    const response = await fetch(`https://openapi.izmir.bel.tr/api/iztek/hatotobuskonumlari/${routeNumber}`);

    if (!response.ok) {
      throw new Error(`Route API Hatası: ${response.status}`);
    }

    const data = await response.json();

    if (data.HataVarMi || !Array.isArray(data.HatOtobusKonumlari)) {
      return [];
    }

    const uniqueVehiclesMap = new Map<string, ApproachingBus>();

    data.HatOtobusKonumlari.forEach((rawItem: any) => {
      // HatNumarasi API formatında bazen dönmeyebiliyor, routeNumber takviyesi yapıldı
      const vehicle = normalizeRouteVehicle({ ...rawItem, HatNumarasi: routeNumber });

      // Geçerli koordinatı yoksa dikkate alma (Null Koruma)
      if (vehicle.latitude === null || vehicle.longitude === null || vehicle.latitude === 0) return;

      // Map "set" metodu, aynı busId'ye sahip olan verilerin sonuncusunu ezip geçer. Duplicate önlenir.
      uniqueVehiclesMap.set(String(vehicle.busId), vehicle);
    });

    return Array.from(uniqueVehiclesMap.values());
  } catch (error) {
    console.warn(`Hat ${routeNumber} için aktif araçlar yüklenemedi:`, error);
    throw error;
  }
};