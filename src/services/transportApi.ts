// src/services/transportApi.ts

/**
 * ESHOT Ulaşım Servis Katmanı
 * Uygulamanın dış kaynaklarla (API ve JSON) olan bağlantısını güvence altında tutar.
 */

import routeDeparturesRaw from '@/data/gtfs/route_departures.json';
import serviceCalendarRaw from '@/data/gtfs/service_calendar.json';
import routesJson from '@/data/routes.json';
import stopsJson from '@/data/stops.json';
import { ApproachingBus, BusStop } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  // `duragayaklasanotobusler` API'si genelde 1 (Gidiş) ve 2 (Dönüş) döner.
  let dirText = 'Bilinmiyor';
  if (rawBus.HattinYonu === 1 || rawBus.HattinYonu === '1') dirText = 'Gidiş';
  if (rawBus.HattinYonu === 2 || rawBus.HattinYonu === '2') dirText = 'Dönüş';

  const busId = rawBus.OtobusId ? String(rawBus.OtobusId) : '0';



  return {
    busId,
    routeNumber: rawBus.HatNumarasi ? String(rawBus.HatNumarasi) : '?',
    routeName: rawBus.HatAdi ? String(rawBus.HatAdi) : 'Bilinmeyen Hat',
    remainingStopCount: rawBus.KalanDurakSayisi !== null && rawBus.KalanDurakSayisi !== undefined ? Number(rawBus.KalanDurakSayisi) : null,
    direction: dirText,
    latitude: parseCoordinate(rawBus.KoorX),
    longitude: parseCoordinate(rawBus.KoorY),
    isAccessible: Boolean(rawBus.EngelliMi),
    hasBicycleRack: Boolean(rawBus.BisikletAparatliMi)
  };
};

/** Hat Lokasyon API'sinden gelen farklı field yapıları için özel dönüştürücü */
export const normalizeRouteVehicle = (rawVehicle: any): ApproachingBus => {
  // `hatotobuskonumlari` API'si genelde 1 (Gidiş) ve 0 (Dönüş) döner.
  let dirText = 'Bilinmiyor';
  if (rawVehicle.Yon === 1 || rawVehicle.Yon === '1') dirText = 'Gidiş';
  if (rawVehicle.Yon === 0 || rawVehicle.Yon === '0') dirText = 'Dönüş';

  return {
    busId: rawVehicle.OtobusId ? String(rawVehicle.OtobusId) : '0',
    routeNumber: rawVehicle.HatNumarasi ? String(rawVehicle.HatNumarasi) : '?',
    routeName: '', // Konum API'sinden ad dönmeyebiliyor
    remainingStopCount: null, // Duraksal bir tahmin yok, sadece GPS var
    direction: dirText,
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

// ============================
// HAT İSİMLENDİRME (HYBRID SYNC)
// ============================

const ROUTES_CACHE_KEY = '@eshot_routes_cache';
let memCachedRoutes: { id: string; name: string }[] | null = null;

/** 
 * Hatların isimlerini ve ID'lerini döner.
 * Önce RAM'e (memCachedRoutes), sonra Local Storage'a, o da yoksa gömülü routes.json'a bakar.
 */
export const getAllRoutes = async (): Promise<{ id: string; name: string }[]> => {
  if (memCachedRoutes) return memCachedRoutes;

  try {
    const cachedString = await AsyncStorage.getItem(ROUTES_CACHE_KEY);
    if (cachedString) {
      memCachedRoutes = JSON.parse(cachedString);
      return memCachedRoutes!;
    }
  } catch (err) {
    console.warn("AsyncStorage route cache okunamadı:", err);
  }

  // AsyncStorage boşsa lokal JSON'ı kullan
  memCachedRoutes = routesJson as { id: string; name: string }[];
  return memCachedRoutes;
};

/**
 * Spesifik bir hattın ismini bulur
 */
export const getRouteName = async (routeId: string | number): Promise<string> => {
  const routes = await getAllRoutes();
  const route = routes.find(r => String(r.id) === String(routeId));
  return route ? route.name : `Hat ${routeId}`;
};

/**
 * Arka planda sessizce çalışıp yeni/farklı hat isimlerini sunucudan (veya CSV url vs) çekip Local Storage'a yazar.
 * (Gerçek API URL'si buraya eklenecektir, şimdilik mockup niteliğinde CKAN veya statik bir check konulabilir)
 */
export const syncRouteNamesInBackground = async () => {
  try {
    // Burada ileride direkt olarak ESHOT Hat Listesi API'si çağrılacak. ESHOT CKAN Datastore request:
    const response = await fetch('https://openfiles.izmir.bel.tr/211488/docs/eshot-otobus-hatlari.csv');
    if (!response.ok) return;

    const text = await response.text();
    const lines = text.split('\n');
    const data: { id: string; name: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(';');
      if (parts.length >= 2) {
        data.push({ id: parts[0].trim(), name: parts[1].trim() });
      }
    }

    if (data.length > 0) {
      await AsyncStorage.setItem(ROUTES_CACHE_KEY, JSON.stringify(data));
      memCachedRoutes = data; // RAM cache'i de tazele
    }
  } catch (error) {
    // Sessizce başarısız ol. Offline mode (JSON) olduğu için UX zarar görmez.
  }
};

// ============================
// MADDE 7: SEFER SAATLERİ
// ============================

/**
 * 1. Hafta İçi, Cumartesi ve Pazar için geçerli Service ID'lerini gruplar.
 */
export const getServiceIdsByDayType = () => {
  const calendar: Record<string, any> = serviceCalendarRaw as any;
  const groups: Record<string, string[]> = { weekday: [], saturday: [], sunday: [] };

  // YYYYMMDD formati hazirla
  const today = new Date();
  const currentDate = Number(
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')
  );

  // GTFS veri setinin eskimiş olma durumuna karşı maksimum Bitiş Tarihini bul:
  let maxEndDate = 0;
  Object.values(calendar).forEach((s: any) => {
    if (s.end_date && Number(s.end_date) > maxEndDate) {
      maxEndDate = Number(s.end_date);
    }
  });

  // ========================================================================
  // GTFS TAKVİM GEÇERLİLİK KONTROLÜ
  // ========================================================================
  // GTFS takvimi güncel değilse (tüm service_id'lerin end_date'i geçmişte
  // kalmışsa) iki seçenek mevcuttur:
  //
  //  A) Tüm servisleri geçersiz say → uygulama boş görünür
  //  B) Tarih filtresini atla, eski programı göster (Graceful Fallback)
  //
  // Bu uygulama B seçeneğini uygular. Mevcut GTFS arşivinin son bitiş tarihi
  // Mayıs 2026'dır; ancak uygulama Temmuz 2026+ tarihinde çalıştığında
  // isGtfsCalendarExpired = true olur ve tarih filtresi devre dışı kalır.
  //
  // ⚠️  UYARI: Bu fallback etkin olduğunda kullanıcıya sunulan sefer saatleri
  //     GÜNCEL GTFS TAKVİMİNDEN DEĞİL, SÜRESİ GEÇMİŞ ESKİ ARŞİVDEN gelir.
  //     Bu durum README > "Veri güncelliği notu" bölümünde kullanıcıya açıkça
  //     bildirilmektedir.
  // ========================================================================
  //     bildirilmektedir.
  // ========================================================================
  const isGtfsCalendarExpired = checkIsGtfsCalendarExpired();

  if (isGtfsCalendarExpired) {
    // Geliştirici konsoluna uyarı: fallback'in devrede olduğunu açıkça belirt
    console.warn(
      `[transportApi] ⚠️ GTFS takvimi süresi doldu. ` +
      `Son geçerli tarih: ${maxEndDate}, Bugün: ${currentDate}. ` +
      `Tarih filtresi devre dışı — tüm servisler fallback olarak gösteriliyor.`
    );
  }

  Object.values(calendar).forEach(s => {
    // start_date / end_date kontrolü: GTFS takvimi hâlâ geçerliyse filtrele.
    // isGtfsCalendarExpired = true ise bu koşul atlanır (fallback modu aktif).
    if (s.start_date && s.end_date && !isGtfsCalendarExpired) {
      if (currentDate < Number(s.start_date) || currentDate > Number(s.end_date)) {
        return;
      }
    }

    // Sadece monday degil, tum hafta ici gunleri birlikte degerlendirilir
    const isWeekday = s.monday === '1' || s.tuesday === '1' || s.wednesday === '1' || s.thursday === '1' || s.friday === '1';
    const isSaturday = s.saturday === '1';
    const isSunday = s.sunday === '1';

    if (isWeekday) groups.weekday.push(s.service_id);
    if (isSaturday) groups.saturday.push(s.service_id);
    if (isSunday) groups.sunday.push(s.service_id);
  });

  return { groups, isFallback: isGtfsCalendarExpired };
};

/**
 * 2. Belirtilen Hat ve Yön için Gün gruplarına göre Tüm Sefer Saatlerini getirir.
 */
export const getAllDepartures = (routeId: string | number, directionId: string) => {
  const { groups: serviceGroups, isFallback } = getServiceIdsByDayType();
  const departuresData: any = routeDeparturesRaw as any;
  const routeDirData = departuresData[String(routeId)]?.[directionId];

  if (!routeDirData) return { weekday: [], saturday: [], sunday: [], isFallback };

  const extractTimes = (serviceIds: string[]) => {
    const times = new Set<string>();
    serviceIds.forEach(id => {
      if (routeDirData[id]) routeDirData[id].forEach((t: string) => times.add(t));
    });
    return Array.from(times).sort();
  };

  return {
    weekday: extractTimes(serviceGroups.weekday),
    saturday: extractTimes(serviceGroups.saturday),
    sunday: extractTimes(serviceGroups.sunday),
    isFallback
  };
};

/**
 * GTFS Takviminin süresinin dolup dolmadığını (tüm end_date'lerin geçmişte kalıp kalmadığını) kontrol eder.
 * @returns boolean
 */
export const checkIsGtfsCalendarExpired = (): boolean => {
  const calendar: Record<string, any> = serviceCalendarRaw as any;
  const today = new Date();
  const currentDate = Number(
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')
  );

  let maxEndDate = 0;

  Object.values(calendar).forEach((s: any) => {
    if (s.end_date) {
      const eDate = Number(s.end_date);
      if (eDate > maxEndDate) {
        maxEndDate = eDate;
      }
    }
  });

  return maxEndDate > 0 && currentDate > maxEndDate;
};
