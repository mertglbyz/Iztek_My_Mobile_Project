import routeStopsRaw from '@/data/gtfs/route_stops.json';
import { BusStop } from '@/types';
import { getStops } from './transportApi';

const routeStopsData: Record<string, Record<string, string[]>> = routeStopsRaw as any;

export interface DirectTripResult {
    routeId: string;
    directionId: string;
    startSequence: number;
    endSequence: number;
    stopCount: number;
}

/**
 * Başlangıç ve Varış durakları arasında (Aktarmasız) doğrudan bağlanan hatları bulur.
 * Sadece "tek hatla gidilebilen" senaryoları destekler.
 * Yön sırasını kontrol eder: startStop, endStop'tan ÖNCE gelmelidir.
 */
export const findDirectRoutes = async (startStopId: string, endStopId: string): Promise<DirectTripResult[]> => {
    const stops = await getStops();
    const startStop = stops.find((s: BusStop) => String(s.id) === String(startStopId));
    const endStop = stops.find((s: BusStop) => String(s.id) === String(endStopId));

    if (!startStop || !endStop) {
        throw new Error('Başlangıç veya varış durağı bulunamadı.');
    }

    // Ortak hatları bul (Her iki durağın routes alanında olanlar)
    // Eski JSON sisteminde `routes` dizisi hatları tutar. Yeni GTFS uyumlu versiyonda ise routeStopsData'da (O(1)) tararız.
    const commonRoutes = startStop.routes.filter(r => endStop.routes.includes(r)).map(String);

    const validDirectTrips: DirectTripResult[] = [];

    commonRoutes.forEach(routeId => {
        const directions = routeStopsData[routeId];
        if (!directions) return;

        // Yönleri kontrol et
        Object.keys(directions).forEach(dirId => {
            const stopList = directions[dirId];

            const startIndex = stopList.indexOf(String(startStopId));
            const endIndex = stopList.indexOf(String(endStopId));

            // Eğer her iki durak da bu yönde varsa VE başlangıç durağı varıştan ÖNCE geliyorsa
            if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
                validDirectTrips.push({
                    routeId,
                    directionId: dirId,
                    startSequence: startIndex + 1,
                    endSequence: endIndex + 1,
                    stopCount: endIndex - startIndex
                });
            }
        });
    });

    return validDirectTrips.sort((a, b) => a.stopCount - b.stopCount);
};

// Bu aşamada test hazırlığı tamamlanmıştır. UI tetiklenmeyecektir.
