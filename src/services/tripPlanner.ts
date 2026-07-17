import nearbyStopsIndexRaw from '@/data/gtfs/nearby_stops_index.json';
import routePatternsRaw from '@/data/gtfs/route_patterns.json';
import stopRoutesIndexRaw from '@/data/gtfs/stop_routes_index.json';

interface RouteSequenceInfo {
    routeId: string;
    directionId: string;
    sequence: number;
}

interface PatternInfo {
    patternId: string;
    stopIds: string[];
    tripCount: number;
}

interface NearbyStopInfo {
    stopId: string;
    distanceMeters: number;
}

const stopRoutesIndex: Record<string, RouteSequenceInfo[]> = stopRoutesIndexRaw as any;
const routePatterns: Record<string, Record<string, PatternInfo[]>> = routePatternsRaw as any;
const nearbyStopsIndex: Record<string, NearbyStopInfo[]> = nearbyStopsIndexRaw as any;

export interface DirectRouteResult {
    type: 'direct';
    routeId: string;
    directionId: string;
    boardingStopId: string;
    alightingStopId: string;
    actualBoardingStopId?: string;
    actualAlightingStopId?: string;
    walkingToBoardingMeters?: number;
    walkingFromAlightingMeters?: number;
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
    actualBoardingStopId?: string;
    actualAlightingStopId?: string;
    walkingToBoardingMeters?: number;
    walkingFromAlightingMeters?: number;
    firstSegmentStopCount: number;
    secondSegmentStopCount: number;
    totalStopCount: number;
}

export type TripPlanResult = DirectRouteResult | TransferRouteResult;

interface StopCandidate {
    id: string;
    walkMeters: number;
}

/**
 * GTFS Ters İndeks ve Hat Durakları listelerini kullanarak
 * Aktarmasız (Direct) ve 1 Aktarmalı (Transfer) rotaları hesaplar.
 */
export const findRoutes = async (startStopId: string, endStopId: string): Promise<TripPlanResult[]> => {
    if (startStopId === endStopId) {
        return [];
    }

    const getCandidates = (baseStopId: string): StopCandidate[] => {
        const candidates: StopCandidate[] = [{ id: baseStopId, walkMeters: 0 }];
        const nearby = nearbyStopsIndex[baseStopId];
        if (nearby) {
            nearby.forEach(n => {
                candidates.push({ id: n.stopId, walkMeters: n.distanceMeters });
            });
        }
        return candidates;
    };

    const startCandidates = getCandidates(startStopId);
    const endCandidates = getCandidates(endStopId);

    const directMap = new Map<string, DirectRouteResult>();
    const transferMap = new Map<string, TransferRouteResult>();

    // 1. AKTARMASIZ (Tüm pattern'lar ve yakın duraklar taranarak)
    for (const startCand of startCandidates) {
        const startInfo = stopRoutesIndex[startCand.id];
        if (!startInfo) continue;

        for (const endCand of endCandidates) {
            const endInfo = stopRoutesIndex[endCand.id];
            if (!endInfo) continue;

            for (const start of startInfo) {
                for (const end of endInfo) {
                    if (start.routeId === end.routeId && start.directionId === end.directionId) {
                        const patterns = routePatterns[start.routeId]?.[start.directionId];
                        if (!patterns) continue;

                        for (const pattern of patterns) {
                            const startIdx = pattern.stopIds.indexOf(startCand.id);
                            const endIdx = pattern.stopIds.indexOf(endCand.id);

                            if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
                                const dupKey = `${start.routeId}-${start.directionId}`;
                                const totalWalk = startCand.walkMeters + endCand.walkMeters;

                                const existing = directMap.get(dupKey);
                                const existingWalk = existing ? ((existing.walkingToBoardingMeters || 0) + (existing.walkingFromAlightingMeters || 0)) : Infinity;

                                if (!existing || totalWalk < existingWalk || (totalWalk === existingWalk && (endIdx - startIdx) < existing.stopCount)) {
                                    directMap.set(dupKey, {
                                        type: 'direct',
                                        routeId: start.routeId,
                                        directionId: start.directionId,
                                        boardingStopId: startStopId,
                                        alightingStopId: endStopId,
                                        actualBoardingStopId: startCand.id !== startStopId ? startCand.id : undefined,
                                        actualAlightingStopId: endCand.id !== endStopId ? endCand.id : undefined,
                                        walkingToBoardingMeters: startCand.walkMeters > 0 ? startCand.walkMeters : undefined,
                                        walkingFromAlightingMeters: endCand.walkMeters > 0 ? endCand.walkMeters : undefined,
                                        stopCount: endIdx - startIdx
                                    });
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. TEK AKTARMALI (Transfer)
    for (const startCand of startCandidates) {
        const startInfo = stopRoutesIndex[startCand.id];
        if (!startInfo) continue;

        for (const endCand of endCandidates) {
            const endInfo = stopRoutesIndex[endCand.id];
            if (!endInfo) continue;

            for (const start of startInfo) {
                const startPatterns = routePatterns[start.routeId]?.[start.directionId];
                if (!startPatterns) continue;

                for (const end of endInfo) {
                    if (start.routeId === end.routeId) continue;

                    const endPatterns = routePatterns[end.routeId]?.[end.directionId];
                    if (!endPatterns) continue;

                    for (const startPattern of startPatterns) {
                        const startIdx = startPattern.stopIds.indexOf(startCand.id);
                        if (startIdx === -1) continue;

                        for (const endPattern of endPatterns) {
                            const endIdx = endPattern.stopIds.indexOf(endCand.id);
                            if (endIdx === -1) continue;

                            let bestTransferStopId: string | null = null;
                            let bestTotalStops = Infinity;
                            let firstSegmentStops = 0;
                            let secondSegmentStops = 0;

                            for (let i = startIdx + 1; i < startPattern.stopIds.length; i++) {
                                const contenderStop = startPattern.stopIds[i];
                                const j = endPattern.stopIds.indexOf(contenderStop);

                                if (j !== -1 && j < endIdx) {
                                    const currentFirstStops = i - startIdx;
                                    const currentSecondStops = endIdx - j;
                                    const totalStops = currentFirstStops + currentSecondStops;

                                    if (totalStops < bestTotalStops) {
                                        bestTotalStops = totalStops;
                                        bestTransferStopId = contenderStop;
                                        firstSegmentStops = currentFirstStops;
                                        secondSegmentStops = currentSecondStops;
                                    }
                                }
                            }

                            if (bestTransferStopId) {
                                const dupKey = `${start.routeId}-${start.directionId}-${end.routeId}-${end.directionId}`;
                                const totalWalk = startCand.walkMeters + endCand.walkMeters;
                                const existing = transferMap.get(dupKey);
                                const existingWalk = existing ? ((existing.walkingToBoardingMeters || 0) + (existing.walkingFromAlightingMeters || 0)) : Infinity;

                                if (!existing || totalWalk < existingWalk || (totalWalk === existingWalk && bestTotalStops < existing.totalStopCount)) {
                                    transferMap.set(dupKey, {
                                        type: 'transfer',
                                        firstRouteId: start.routeId,
                                        firstDirectionId: start.directionId,
                                        secondRouteId: end.routeId,
                                        secondDirectionId: end.directionId,
                                        boardingStopId: startStopId,
                                        transferStopId: bestTransferStopId,
                                        alightingStopId: endStopId,
                                        actualBoardingStopId: startCand.id !== startStopId ? startCand.id : undefined,
                                        actualAlightingStopId: endCand.id !== endStopId ? endCand.id : undefined,
                                        walkingToBoardingMeters: startCand.walkMeters > 0 ? startCand.walkMeters : undefined,
                                        walkingFromAlightingMeters: endCand.walkMeters > 0 ? endCand.walkMeters : undefined,
                                        firstSegmentStopCount: firstSegmentStops,
                                        secondSegmentStopCount: secondSegmentStops,
                                        totalStopCount: bestTotalStops
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. KATEGORİK SIRALAMA (Önce Aktarmasız, Sonra Aktarmalı)
    const allResults: TripPlanResult[] = [...Array.from(directMap.values()), ...Array.from(transferMap.values())];

    allResults.sort((a, b) => {
        // Öncelik 1: Kategori (Direct rotalar her zaman üstte olmalı)
        if (a.type !== b.type) {
            return a.type === 'direct' ? -1 : 1;
        }

        // Öncelik 2: Toplam yürüme mesafesi
        const walkA = (a.walkingToBoardingMeters || 0) + (a.walkingFromAlightingMeters || 0);
        const walkB = (b.walkingToBoardingMeters || 0) + (b.walkingFromAlightingMeters || 0);
        if (walkA !== walkB) return walkA - walkB;

        // Öncelik 3: Aynı kategoride ve aynı yürüme mesafesindeyse Durak Sayısı
        const stopsA = a.type === 'direct' ? a.stopCount : a.totalStopCount;
        const stopsB = b.type === 'direct' ? b.stopCount : b.totalStopCount;
        return stopsA - stopsB;
    });

    // 4. SONUÇ LİMİTLEME
    return allResults.slice(0, 10);
};
