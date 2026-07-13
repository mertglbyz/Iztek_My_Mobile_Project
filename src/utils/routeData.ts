import { BusRouteSummary, BusStop } from '@/types';

/**
 * Mevcut durak verilerinden (routes alanı array olan) benzersiz (unique) hat listesi üretir.
 * Mühendisin maildeki isteği üzerine, elimizdeki durakları tarayarak "Tersine Mühendislik (Reverse Mapping)" yapılır.
 */
export const getRoutesFromStops = (stops: BusStop[], routeNamesData?: { id: string, name: string }[]): BusRouteSummary[] => {
    const routeMap = new Map<number, number>(); // Map<Route Numarası, Durak Sayısı>

    // 1. Tüm durakları tek tek dön
    stops.forEach((stop) => {
        if (!stop.routes || !Array.isArray(stop.routes)) return;

        // 2. Durağın içindeki hat numaralarını topla (Gidiş-Dönüş Kopyalarını Engellemek İçin Tekilleştir - Set)
        const uniqueRoutesObj = new Set(
            stop.routes.map(Number).filter((n) => !isNaN(n))
        );

        uniqueRoutesObj.forEach((num) => {
            // 3. Daha önceden bu hat eklendiyse, durak sayısını (stopCount) 1 artır. Eklenmediyse 1 yap.
            const currentCount = routeMap.get(num) || 0;
            routeMap.set(num, currentCount + 1);
        });
    });

    // 4. Map yapısını istenen modele (BusRouteSummary dizisine) dönüştür
    const routesArray: BusRouteSummary[] = Array.from(routeMap.entries()).map(([routeNumber, stopCount]) => {
        const foundName = routeNamesData?.find(r => String(r.id) === String(routeNumber))?.name;
        return {
            routeNumber,
            stopCount,
            routeName: foundName || `Hat ${routeNumber}`
        };
    });

    // 5. Hatları küçükten büyüğe sırala
    routesArray.sort((a, b) => a.routeNumber - b.routeNumber);

    return routesArray;
};

/**
 * Belirtilen hat numarasına sahip olan tüm durakları bulur ve döndürür.
 * (MOCK_ROUTES sisteminden dinamik sisteme geçiş)
 */
export const getStopsForRoute = (routeId: string | number, allStops: BusStop[]): BusStop[] => {
    const targetRouteNum = Number(routeId);

    return allStops.filter((stop) => {
        if (!stop.routes || !Array.isArray(stop.routes)) return false;

        // Durağın içindeki `routes` array'sinde aradığımız hat varsa bu durağı listeye dahil et
        return stop.routes.some((r) => Number(r) === targetRouteNum);
    });
};
