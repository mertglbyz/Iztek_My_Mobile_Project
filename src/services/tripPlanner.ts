import routeStopsRaw from '@/data/gtfs/route_stops.json';
import stopRoutesIndexRaw from '@/data/gtfs/stop_routes_index.json';

interface RouteSequenceInfo {
    routeId: string;
    directionId: string;
    sequence: number;
}

const stopRoutesIndex: Record<string, RouteSequenceInfo[]> = stopRoutesIndexRaw as any;
const routeStopsData: Record<string, Record<string, string[]>> = routeStopsRaw as any;

export interface DirectRouteResult {
    type: 'direct';
    routeId: string;
    directionId: string;
    boardingStopId: string;
    alightingStopId: string;
    stopCount: number;
}

export interface TransferRouteResult {
    type: 'transfer';
    firstRouteId: string;
    firstDirectionId: string;
    secondRouteId: string;
    secondDirectionId: string;
    boardingStopId: string;
    transferStopId: string;
    alightingStopId: string;
    firstSegmentStopCount: number;
    secondSegmentStopCount: number;
    totalStopCount: number;
}

export type TripPlanResult = DirectRouteResult | TransferRouteResult;

/**
 * GTFS Ters İndeks ve Hat Durakları listelerini kullanarak
 * Aktarmasız (Direct) ve 1 Aktarmalı (Transfer) rotaları hesaplar.
 */
export const findRoutes = async (startStopId: string, endStopId: string): Promise<TripPlanResult[]> => {
    if (startStopId === endStopId) {
        return []; // Aynı durak seçilirse rota aranmaz.
    }

    const startInfo = stopRoutesIndex[startStopId];
    const endInfo = stopRoutesIndex[endStopId];

    if (!startInfo || !endInfo) {
        return []; // Başlangıç veya varış durağı GTFS indeksinde bulunamadı.
    }

    const directResults: DirectRouteResult[] = [];
    const directSet = new Set<string>();

    // 1. AKTARMASIZ 
    for (const start of startInfo) {
        for (const end of endInfo) {
            // Aynı hat, ayni yön ve başlangıç varıştan önce gelmeli
            if (start.routeId === end.routeId && start.directionId === end.directionId && start.sequence < end.sequence) {
                const dupKey = `${start.routeId}-${start.directionId}`;
                if (!directSet.has(dupKey)) {
                    directSet.add(dupKey);
                    directResults.push({
                        type: 'direct',
                        routeId: start.routeId,
                        directionId: start.directionId,
                        boardingStopId: startStopId,
                        alightingStopId: endStopId,
                        stopCount: end.sequence - start.sequence
                    });
                }
            }
        }
    }

    // 2. TEK AKTARMALI (Transfer) - OPTİMİZE EDİLMİŞ VERSİYON
    const transferMap = new Map<string, TransferRouteResult>();

    // Başlangıç duraklarından kalkan hatlar ile Varış duraklarına giden hatları çapraz (Intersection) mantığıyla O(n*m) seviyesinde matrisliyoruz.
    for (const start of startInfo) {
        const startRouteStops = routeStopsData[start.routeId]?.[start.directionId];
        if (!startRouteStops) continue;

        for (const end of endInfo) {
            if (start.routeId === end.routeId) continue; // Aktarma hatları farklı olmalı

            const endRouteStops = routeStopsData[end.routeId]?.[end.directionId];
            if (!endRouteStops) continue;

            let bestTransferStopId: string | null = null;
            let bestTotalStops = Infinity;
            let firstSegmentStops = 0;
            let secondSegmentStops = 0;

            // 1. Hat üzerindeki tüm durakları geziyoruz (bindiği duraktan sonrakileri)
            for (let i = start.sequence + 1; i < startRouteStops.length; i++) {
                const contenderStop = startRouteStops[i];

                // Bu durak 2. hatta varsa VE varacağı noktadan önce kalıyorsa, aktarma noktasıdır!
                const j = endRouteStops.indexOf(contenderStop); // indexOf V8'de küçük (60elemanlı) arraylerde aşırı hızlıdır

                if (j !== -1 && j < end.sequence) {
                    const currentFirstStops = i - start.sequence;
                    const currentSecondStops = end.sequence - j;
                    const totalStops = currentFirstStops + currentSecondStops;

                    if (totalStops < bestTotalStops) {
                        bestTotalStops = totalStops;
                        bestTransferStopId = contenderStop;
                        firstSegmentStops = currentFirstStops;
                        secondSegmentStops = currentSecondStops;
                    }
                }
            }

            // En iyi kesişimi haritaya kaydediyoruz
            if (bestTransferStopId) {
                const dupKey = `${start.routeId}-${start.directionId}-${end.routeId}-${end.directionId}`;
                const existing = transferMap.get(dupKey);
                if (!existing || existing.totalStopCount > bestTotalStops) {
                    transferMap.set(dupKey, {
                        type: 'transfer',
                        firstRouteId: start.routeId,
                        firstDirectionId: start.directionId,
                        secondRouteId: end.routeId,
                        secondDirectionId: end.directionId,
                        boardingStopId: startStopId,
                        transferStopId: bestTransferStopId,
                        alightingStopId: endStopId,
                        firstSegmentStopCount: firstSegmentStops,
                        secondSegmentStopCount: secondSegmentStops,
                        totalStopCount: bestTotalStops
                    });
                }
            }
        }
    }

    // 3. KATEGORİK SIRALAMA (Önce Aktarmasız, Sonra Aktarmalı)
    const allResults: TripPlanResult[] = [...directResults, ...Array.from(transferMap.values())];

    allResults.sort((a, b) => {
        // Öncelik 1: Kategori (Direct rotalar her zaman üstte olmalı)
        if (a.type !== b.type) {
            return a.type === 'direct' ? -1 : 1;
        }
        // Öncelik 2: Aynı kategorideyse Durak Sayısı (Az olan üstte)
        const stopsA = a.type === 'direct' ? a.stopCount : a.totalStopCount;
        const stopsB = b.type === 'direct' ? b.stopCount : b.totalStopCount;
        return stopsA - stopsB;
    });

    // 4. SONUÇ LİMİTLEME
    // Kullanıcıya sonsuz loop izletmemek ve hızlı render için ilk 10 sonuç dönüyor.
    return allResults.slice(0, 10);
};
