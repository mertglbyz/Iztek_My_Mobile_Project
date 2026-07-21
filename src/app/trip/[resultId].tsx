import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import plannerStopsRaw from '@/data/gtfs/planner_stops.json';
import { DirectRouteResult, findRoutes, TransferRouteResult, TripPlanResult } from '@/services/tripPlanner';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const getStopNameById = (id: string) => {
    const s = (plannerStopsRaw as any[]).find(x => x.id === id);
    return s ? s.name : id;
};

export default function TripDetailScreen() {
    const { resultId, startStopId, endStopId } = useLocalSearchParams();
    const router = useRouter();

    const [route, setRoute] = useState<TripPlanResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!startStopId || !endStopId || !resultId) {
            setLoading(false);
            return;
        }

        findRoutes(startStopId as string, endStopId as string).then(results => {
            const found = results.find(r => r.resultId === resultId);
            setRoute(found || null);
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    }, [resultId, startStopId, endStopId]);

    const buildTimeline = (r: TripPlanResult) => {
        const steps = [];

        if (r.type === 'direct') {
            const dir = r as DirectRouteResult;
            steps.push({ id: 'start', type: 'origin', title: getStopNameById(dir.boardingStopId), stopId: dir.boardingStopId, icon: 'location' });

            if (dir.walkingToBoardingMeters) {
                steps.push({ id: 'walk1', type: 'walk', title: `Yaklaşık ${dir.walkingToBoardingMeters}m yürüyün`, icon: 'walk' });
            }

            const boardStop = dir.actualBoardingStopId || dir.boardingStopId;
            steps.push({ id: 'board', type: 'board', title: `${getStopNameById(boardStop)} durağından binin`, subtitle: `${dir.routeId} numaralı hat`, stopId: boardStop, routeId: dir.routeId, routeDir: dir.directionId, icon: 'bus' });

            if (dir.stopCount > 1) {
                steps.push({ id: 'ride', type: 'ride', title: `${dir.stopCount - 1} durak (Otobüs yolculuğu)`, routeId: dir.routeId, routeDir: dir.directionId, icon: 'git-commit' });
            }

            const alightStop = dir.actualAlightingStopId || dir.alightingStopId;
            steps.push({ id: 'alight', type: 'alight', title: `${getStopNameById(alightStop)} durağında inin`, stopId: alightStop, icon: 'exit' });

            if (dir.walkingFromAlightingMeters) {
                steps.push({ id: 'walk2', type: 'walk', title: `Yaklaşık ${dir.walkingFromAlightingMeters}m yürüyün`, icon: 'walk' });
            }

            if (dir.actualAlightingStopId && dir.actualAlightingStopId !== dir.alightingStopId) {
                steps.push({ id: 'end', type: 'destination', title: getStopNameById(dir.alightingStopId), stopId: dir.alightingStopId, icon: 'flag' });
            }
        } else {
            const trans = r as TransferRouteResult;
            steps.push({ id: 'start', type: 'origin', title: getStopNameById(trans.boardingStopId), stopId: trans.boardingStopId, icon: 'location' });

            if (trans.walkingToBoardingMeters) {
                steps.push({ id: 'walk1', type: 'walk', title: `Yaklaşık ${trans.walkingToBoardingMeters}m yürüyün`, icon: 'walk' });
            }

            const boardStop = trans.actualBoardingStopId || trans.boardingStopId;
            steps.push({ id: 'board1', type: 'board', title: `${getStopNameById(boardStop)} durağından binin`, subtitle: `${trans.firstRouteId} numaralı hat`, stopId: boardStop, routeId: trans.firstRouteId, routeDir: trans.firstDirectionId, icon: 'bus' });

            if (trans.firstSegmentStopCount > 1) {
                steps.push({ id: 'ride1', type: 'ride', title: `${trans.firstSegmentStopCount - 1} durak (Otobüs yolculuğu)`, routeId: trans.firstRouteId, routeDir: trans.firstDirectionId, icon: 'git-commit' });
            }

            steps.push({ id: 'transfer', type: 'transfer', title: `${getStopNameById(trans.transferStopId)} durağında inin ve aktarma yapın`, stopId: trans.transferStopId, icon: 'swap-horizontal' });

            steps.push({ id: 'board2', type: 'board', title: `${getStopNameById(trans.transferStopId)} durağından binin`, subtitle: `${trans.secondRouteId} numaralı hat`, stopId: trans.transferStopId, routeId: trans.secondRouteId, routeDir: trans.secondDirectionId, icon: 'bus' });

            if (trans.secondSegmentStopCount > 1) {
                steps.push({ id: 'ride2', type: 'ride', title: `${trans.secondSegmentStopCount - 1} durak (Otobüs yolculuğu)`, routeId: trans.secondRouteId, routeDir: trans.secondDirectionId, icon: 'git-commit' });
            }

            const alightStop = trans.actualAlightingStopId || trans.alightingStopId;
            steps.push({ id: 'alight', type: 'alight', title: `${getStopNameById(alightStop)} durağında inin`, stopId: alightStop, icon: 'exit' });

            if (trans.walkingFromAlightingMeters) {
                steps.push({ id: 'walk2', type: 'walk', title: `Yaklaşık ${trans.walkingFromAlightingMeters}m yürüyün`, icon: 'walk' });
            }

            if (trans.actualAlightingStopId && trans.actualAlightingStopId !== trans.alightingStopId) {
                steps.push({ id: 'end', type: 'destination', title: getStopNameById(trans.alightingStopId), stopId: trans.alightingStopId, icon: 'flag' });
            }
        }

        return steps;
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!route) {
        return (
            <View style={styles.center}>
                <Ionicons name="warning" size={48} color={Colors.warning} />
                <Text style={styles.errorText}>Rota hesaplanırken bir hata oluştu veya sonuç bulunamadı.</Text>
                <TouchableOpacity style={styles.fallbackBtn} onPress={() => router.back()}>
                    <Text style={styles.fallbackBtnText}>Rota Sonuçlarına Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const steps = buildTimeline(route);

    const renderStep = ({ item, index }: { item: any, index: number }) => {
        const isLast = index === steps.length - 1;

        const handlePress = () => {
            if (item.stopId) {
                router.push(`/stop/${item.stopId}`);
            } else if (item.routeId) {
                router.push(`/route/${item.routeId}?directionId=${item.routeDir || '0'}`);
            }
        };

        const isTouchable = !!item.stopId || !!item.routeId;

        return (
            <TouchableOpacity
                style={styles.stepContainer}
                onPress={handlePress}
                disabled={!isTouchable}
                activeOpacity={0.7}
            >
                <View style={styles.stepLeft}>
                    <View style={[styles.stepIconContainer, item.type === 'walk' && { backgroundColor: Colors.gray300 }]}>
                        <Ionicons name={item.icon} size={18} color={item.type === 'walk' ? Colors.textSecondary : Colors.primary} />
                    </View>
                    {!isLast && <View style={[styles.stepLine, item.type === 'walk' && { borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.textDisabled, backgroundColor: 'transparent' }]} />}
                </View>
                <View style={styles.stepRight}>
                    <Text style={[styles.stepTitle, isTouchable && styles.touchableText]}>{item.title}</Text>
                    {item.subtitle && <Text style={styles.stepSubtitle}>{item.subtitle}</Text>}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Map will be added in Phase 12 - Part 6 */}
            <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderText}>Harita (Faz 12 Bölüm 6'da eklenecek)</Text>
            </View>

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>{route.type === 'direct' ? 'Aktarmasız Yolculuk' : 'Tek Aktarmalı Yolculuk'}</Text>
                    <Text style={styles.headerSubtitle}>
                        {route.type === 'direct' ? (route as DirectRouteResult).routeId : `${(route as TransferRouteResult).firstRouteId} + ${(route as TransferRouteResult).secondRouteId}`} Numaralı Hat
                    </Text>
                </View>
            </View>

            {/* Timeline List */}
            <FlatList
                data={steps}
                keyExtractor={(item) => item.id}
                renderItem={renderStep}
                contentContainerStyle={styles.timelineList}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
    errorText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginVertical: Spacing.md },
    fallbackBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
    fallbackBtnText: { color: Colors.white, fontWeight: FontWeights.bold },
    mapPlaceholder: { height: 200, backgroundColor: Colors.gray300, justifyContent: 'center', alignItems: 'center' },
    mapPlaceholderText: { color: Colors.textDisabled, fontWeight: FontWeights.semibold },
    header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.gray300 },
    backBtn: { marginRight: Spacing.md },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.textPrimary },
    headerSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
    timelineList: { padding: Spacing.lg },
    stepContainer: { flexDirection: 'row', minHeight: 60 },
    stepLeft: { width: 40, alignItems: 'center' },
    stepIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
    stepLine: { width: 2, flex: 1, backgroundColor: Colors.primary, marginTop: -4, marginBottom: -4, zIndex: 1 },
    stepRight: { flex: 1, paddingLeft: Spacing.md, paddingBottom: Spacing.lg, justifyContent: 'center' },
    stepTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: Colors.textPrimary },
    touchableText: { textDecorationLine: 'underline' },
    stepSubtitle: { fontSize: FontSizes.sm, color: Colors.primary, marginTop: 4, fontWeight: FontWeights.medium }
});
