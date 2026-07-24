import nearbyStopsIndexRaw from '@/data/gtfs/nearby_stops_index.json';
import patternTripShapeIndexRaw from '@/data/gtfs/pattern_trip_shape_index.json';
import routePatternsRaw from '@/data/gtfs/route_patterns.json';
import stopRoutesIndexRaw from '@/data/gtfs/stop_routes_index.json';
import plannerStopsRaw from '@/data/gtfs/planner_stops.json';
import { getWalkingRoute } from './walkingRoutingService';

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

interface PatternContext {
    routeId: string;
    directionId: string;
    representativeTripId: string;
    shapeId: string | null;
}

const stopRoutesIndex: Record<string, RouteSequenceInfo[]> = stopRoutesIndexRaw as any;
const routePatterns: Record<string, Record<string, PatternInfo[]>> = routePatternsRaw as any;
const nearbyStopsIndex: Record<string, NearbyStopInfo[]> = nearbyStopsIndexRaw as any;
const patternTripShapeIndex: Record<string, PatternContext> = patternTripShapeIndexRaw as any;

export interface DirectRouteResult {
    resultId: string;
    type: 'direct';
    routeId: string;
    directionId: string;
    patternId: string;
    tripId: string;
    shapeId: string | null;
    segmentStopIds: string[];
    boardingStopId: string;
    alightingStopId: string;
    actualBoardingStopId?: string;
    actualAlightingStopId?: string;
    walkingToBoardingMeters?: number;
    walkingToBoardingDuration?: number;
    walkingFromAlightingMeters?: number;
    walkingFromAlightingDuration?: number;
    totalWalkingMeters: number;
    isApproximate: boolean;
    stopCount: number;
    totalStopCount: number;
    transferCount: number;
}

export interface TransferRouteResult {
    resultId: string;
    type: 'transfer';
    firstRouteId: string;
    firstDirectionId: string;
    secondRouteId: string;
    secondDirectionId: string;
    firstPatternId: string;
    secondPatternId: string;
    firstTripId: string;
    secondTripId: string;
    firstShapeId: string | null;
    secondShapeId: string | null;
    firstSegmentStopIds: string[];
    secondSegmentStopIds: string[];
    boardingStopId: string;
    transferStopId: string;
    alightingStopId: string;
    actualBoardingStopId?: string;
    actualAlightingStopId?: string;
    walkingToBoardingMeters?: number;
    walkingToBoardingDuration?: number;
    walkingFromAlightingMeters?: number;
    walkingFromAlightingDuration?: number;
    totalWalkingMeters: number;
    isApproximate: boolean;
    firstSegmentStopCount: number;
    secondSegmentStopCount: number;
    totalStopCount: number;
    transferCount: number;
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

    // Pre-aggregate best candidate per route+direction for start to prevent combinatorial explosion
    const bestStartRoutes = new Map<string, { candId: string, walkMeters: number, routeId: string, directionId: string }>();
    for (const cand of startCandidates) {
        const info = stopRoutesIndex[cand.id];
        if (!info) continue;
        for (const r of info) {
            const key = `${r.routeId}-${r.directionId}`;
            const existing = bestStartRoutes.get(key);
            if (!existing || cand.walkMeters < existing.walkMeters) {
                bestStartRoutes.set(key, { candId: cand.id, walkMeters: cand.walkMeters, routeId: r.routeId, directionId: r.directionId });
            }
        }
    }

    // Pre-aggregate best candidate per route+direction for end
    const bestEndRoutes = new Map<string, { candId: string, walkMeters: number, routeId: string, directionId: string }>();
    for (const cand of endCandidates) {
        const info = stopRoutesIndex[cand.id];
        if (!info) continue;
        for (const r of info) {
            const key = `${r.routeId}-${r.directionId}`;
            const existing = bestEndRoutes.get(key);
            if (!existing || cand.walkMeters < existing.walkMeters) {
                bestEndRoutes.set(key, { candId: cand.id, walkMeters: cand.walkMeters, routeId: r.routeId, directionId: r.directionId });
            }
        }
    }

    const directMap = new Map<string, DirectRouteResult>();
    const transferMap = new Map<string, TransferRouteResult>();

    // 1. AKTARMASIZ (Tüm pattern'lar ve benzersiz rotalar taranarak)
    for (const start of bestStartRoutes.values()) {
        const end = bestEndRoutes.get(`${start.routeId}-${start.directionId}`);
        if (!end) continue;

        const patterns = routePatterns[start.routeId]?.[start.directionId];
        if (!patterns) continue;

        for (const pattern of patterns) {
            const startIdx = pattern.stopIds.indexOf(start.candId);
            const endIdx = pattern.stopIds.indexOf(end.candId);

            if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
                const dupKey = `${start.routeId}-${start.directionId}`;
                const totalWalk = start.walkMeters + end.walkMeters;

                const existing = directMap.get(dupKey);
                const existingWalk = existing ? existing.totalWalkingMeters : Infinity;

                if (!existing || totalWalk < existingWalk || (totalWalk === existingWalk && (endIdx - startIdx) < existing.stopCount)) {
                    const tripContext = patternTripShapeIndex[pattern.patternId];
                    const segmentStopIds = pattern.stopIds.slice(startIdx, endIdx + 1);

                    // Deterministik resultId
                    const resultId = `${start.routeId}_${start.directionId}_${pattern.patternId}_${start.candId}_${end.candId}`;

                    directMap.set(dupKey, {
                        resultId,
                        type: 'direct',
                        routeId: start.routeId,
                        directionId: start.directionId,
                        patternId: pattern.patternId,
                        tripId: tripContext?.representativeTripId || '',
                        shapeId: tripContext?.shapeId || null,
                        segmentStopIds,
                        boardingStopId: startStopId,
                        alightingStopId: endStopId,
                        actualBoardingStopId: start.candId !== startStopId ? start.candId : undefined,
                        actualAlightingStopId: end.candId !== endStopId ? end.candId : undefined,
                        walkingToBoardingMeters: start.walkMeters > 0 ? start.walkMeters : undefined,
                        walkingFromAlightingMeters: end.walkMeters > 0 ? end.walkMeters : undefined,
                        walkingToBoardingDuration: start.walkMeters > 0 ? Math.round(start.walkMeters / 1.4) : undefined,
                        walkingFromAlightingDuration: end.walkMeters > 0 ? Math.round(end.walkMeters / 1.4) : undefined,
                        totalWalkingMeters: totalWalk,
                        isApproximate: true,
                        stopCount: endIdx - startIdx,
                        totalStopCount: endIdx - startIdx,
                        transferCount: 0
                    });
                }
                break;
            }
        }
    }

    // 2. TEK AKTARMALI (Transfer)
    for (const start of bestStartRoutes.values()) {
        const startPatterns = routePatterns[start.routeId]?.[start.directionId];
        if (!startPatterns) continue;

        for (const end of bestEndRoutes.values()) {
            if (start.routeId === end.routeId) continue;

            const endPatterns = routePatterns[end.routeId]?.[end.directionId];
            if (!endPatterns) continue;

            for (const startPattern of startPatterns) {
                const startIdx = startPattern.stopIds.indexOf(start.candId);
                if (startIdx === -1) continue;

                for (const endPattern of endPatterns) {
                    const endIdx = endPattern.stopIds.indexOf(end.candId);
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
                        const totalWalk = start.walkMeters + end.walkMeters;
                        const existing = transferMap.get(dupKey);
                        const existingWalk = existing ? existing.totalWalkingMeters : Infinity;

                        if (!existing || totalWalk < existingWalk || (totalWalk === existingWalk && bestTotalStops < existing.totalStopCount)) {
                            const firstTripContext = patternTripShapeIndex[startPattern.patternId];
                            const secondTripContext = patternTripShapeIndex[endPattern.patternId];

                            const firstSegmentStopIds = startPattern.stopIds.slice(startIdx, startPattern.stopIds.indexOf(bestTransferStopId) + 1);
                            const secondSegmentStopIds = endPattern.stopIds.slice(endPattern.stopIds.indexOf(bestTransferStopId), endIdx + 1);

                            const resultId = `${start.routeId}_${start.directionId}_${startPattern.patternId}_${start.candId}_${bestTransferStopId}_${end.routeId}_${end.directionId}_${endPattern.patternId}_${end.candId}`;

                            transferMap.set(dupKey, {
                                resultId,
                                type: 'transfer',
                                firstRouteId: start.routeId,
                                firstDirectionId: start.directionId,
                                secondRouteId: end.routeId,
                                secondDirectionId: end.directionId,
                                firstPatternId: startPattern.patternId,
                                secondPatternId: endPattern.patternId,
                                firstTripId: firstTripContext?.representativeTripId || '',
                                secondTripId: secondTripContext?.representativeTripId || '',
                                firstShapeId: firstTripContext?.shapeId || null,
                                secondShapeId: secondTripContext?.shapeId || null,
                                firstSegmentStopIds,
                                secondSegmentStopIds,
                                boardingStopId: startStopId,
                                transferStopId: bestTransferStopId,
                                alightingStopId: endStopId,
                                actualBoardingStopId: start.candId !== startStopId ? start.candId : undefined,
                                actualAlightingStopId: end.candId !== endStopId ? end.candId : undefined,
                                walkingToBoardingMeters: start.walkMeters > 0 ? start.walkMeters : undefined,
                                walkingFromAlightingMeters: end.walkMeters > 0 ? end.walkMeters : undefined,
                                walkingToBoardingDuration: start.walkMeters > 0 ? Math.round(start.walkMeters / 1.4) : undefined,
                                walkingFromAlightingDuration: end.walkMeters > 0 ? Math.round(end.walkMeters / 1.4) : undefined,
                                totalWalkingMeters: totalWalk,
                                isApproximate: true,
                                firstSegmentStopCount: firstSegmentStops,
                                secondSegmentStopCount: secondSegmentStops,
                                totalStopCount: bestTotalStops,
                                transferCount: 1
                            });
                        }
                    }
                }
            }
        }
    }

    // 3. KATEGORİK SIRALAMA — İlk Yaklaşık Sıralama (Haversine Ön Filtre)
    let allResults: TripPlanResult[] = [...Array.from(directMap.values()), ...Array.from(transferMap.values())];

    allResults.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'direct' ? -1 : 1;
        }
        const walkA = (a.walkingToBoardingMeters || 0) + (a.walkingFromAlightingMeters || 0);
        const walkB = (b.walkingToBoardingMeters || 0) + (b.walkingFromAlightingMeters || 0);
        if (walkA !== walkB) {
            return walkA - walkB;
        }
        const stopsA = a.type === 'direct' ? a.stopCount : a.totalStopCount;
        const stopsB = b.type === 'direct' ? b.stopCount : b.totalStopCount;
        if (stopsA !== stopsB) {
            return stopsA - stopsB;
        }
        const idA = a.type === 'direct' ? a.routeId : a.firstRouteId;
        const idB = b.type === 'direct' ? b.routeId : b.firstRouteId;
        return idA.localeCompare(idB);
    });

    // En güçlü adayları al (Performans için top 10) ve Backend doğrulaması yap (Faz 13)
    let topCandidates = allResults.slice(0, 10);

    await Promise.all(topCandidates.map(async (result) => {
        let realTotalWalk = 0;
        let isApprox = false;

        const processWalk = async (
            fromId: string,
            toId: string,
            isBoarding: boolean
        ) => {
            const fs = (plannerStopsRaw as any[]).find(x => x.id === fromId);
            const ts = (plannerStopsRaw as any[]).find(x => x.id === toId);
            if (fs && ts) {
                try {
                    const walk = await getWalkingRoute(
                        { latitude: fs.latitude, longitude: fs.longitude },
                        { latitude: ts.latitude, longitude: ts.longitude },
                        fromId, toId
                    );
                    if (isBoarding) {
                        result.walkingToBoardingMeters = walk.distanceMeters;
                        result.walkingToBoardingDuration = walk.durationSeconds;
                    } else {
                        result.walkingFromAlightingMeters = walk.distanceMeters;
                        result.walkingFromAlightingDuration = walk.durationSeconds;
                    }
                    if (walk.isApproximate) isApprox = true;
                    realTotalWalk += walk.distanceMeters;
                } catch(e) {
                    if (isBoarding) realTotalWalk += (result.walkingToBoardingMeters || 0);
                    else realTotalWalk += (result.walkingFromAlightingMeters || 0);
                    isApprox = true;
                }
            }
        };

        const walks: Promise<void>[] = [];
        if (result.walkingToBoardingMeters && result.actualBoardingStopId) {
            walks.push(processWalk(startStopId, result.actualBoardingStopId, true));
        }
        if (result.walkingFromAlightingMeters && result.actualAlightingStopId) {
            walks.push(processWalk(result.actualAlightingStopId, endStopId, false));
        }

        await Promise.all(walks);

        result.totalWalkingMeters = realTotalWalk;
        if (!result.walkingToBoardingMeters && !result.walkingFromAlightingMeters) {
            result.isApproximate = false;
        } else {
            result.isApproximate = isApprox;
        }
    }));

    // 4. Nihai Sıralama (Gerçek Yürüyüş Değerleriyle)
    topCandidates.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'direct' ? -1 : 1;
        const walkA = (a.walkingToBoardingMeters || 0) + (a.walkingFromAlightingMeters || 0);
        const walkB = (b.walkingToBoardingMeters || 0) + (b.walkingFromAlightingMeters || 0);
        if (walkA !== walkB) return walkA - walkB;
        const stopsA = a.type === 'direct' ? a.stopCount : a.totalStopCount;
        const stopsB = b.type === 'direct' ? b.stopCount : b.totalStopCount;
        if (stopsA !== stopsB) return stopsA - stopsB;
        const idA = a.type === 'direct' ? a.routeId : a.firstRouteId;
        const idB = b.type === 'direct' ? b.routeId : b.firstRouteId;
        return idA.localeCompare(idB);
    });

    // 5. SONUÇ LİMİTLEME
    return topCandidates.slice(0, 10);
};
