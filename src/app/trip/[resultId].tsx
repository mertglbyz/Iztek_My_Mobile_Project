import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import plannerStopsRaw from '@/data/gtfs/planner_stops.json';
import { getShapeSegment } from '@/services/shapeSegmentService';
import { DirectRouteResult, findRoutes, TransferRouteResult, TripPlanResult } from '@/services/tripPlanner';
import { getWalkingRoute } from '@/services/walkingRoutingService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, FlatList, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MapData {
    markers: { id: string, coord: { latitude: number, longitude: number }, title: string, type: 'start' | 'transfer' | 'end' }[];
    busPolylines: { coords: { latitude: number, longitude: number }[], color: string }[];
    walkPolylines: { coords: { latitude: number, longitude: number }[] }[];
}

const getStopNameById = (id: string) => {
    const s = (plannerStopsRaw as any[]).find(x => x.id === id);
    return s ? s.name : id;
};

export default function TripDetailScreen() {
    const { resultId, startStopId, endStopId } = useLocalSearchParams();
    const router = useRouter();

    const [route, setRoute] = useState<TripPlanResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapData, setMapData] = useState<MapData | null>(null);
    const [shapeMissingWarning, setShapeMissingWarning] = useState(false);
    const mapRef = useRef<MapView>(null);

    // Bottom Sheet Animation
    const INITIAL_SHEET_Y = 260; // Start offset
    const MIN_SHEET_Y = 50; // Maximum top reach
    const MAX_SHEET_Y = SCREEN_HEIGHT - 200; // Maximum bottom reach
    const sheetY = useRef(new Animated.Value(INITIAL_SHEET_Y)).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_: any, gesture: any) => Math.abs(gesture.dy) > 5,
            onPanResponderGrant: () => {
                sheetY.setOffset((sheetY as any)._value);
                sheetY.setValue(0);
            },
            onPanResponderMove: Animated.event([null, { dy: sheetY }], { useNativeDriver: false }),
            onPanResponderRelease: (_: any, gesture: any) => {
                sheetY.flattenOffset();
                // Simple bounding logic without spring for instant smooth finish
                if ((sheetY as any)._value < MIN_SHEET_Y) {
                    Animated.timing(sheetY, { toValue: MIN_SHEET_Y, duration: 200, useNativeDriver: false }).start();
                } else if ((sheetY as any)._value > MAX_SHEET_Y) {
                    Animated.timing(sheetY, { toValue: MAX_SHEET_Y, duration: 200, useNativeDriver: false }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        // Explicit parametre validasyonu
        if (!resultId || typeof resultId !== 'string') {
            setLoading(false);
            return;
        }
        const sId = typeof startStopId === 'string' ? startStopId : '';
        const eId = typeof endStopId === 'string' ? endStopId : '';
        if (!sId || !eId) {
            // Geçersiz stopId — fallback ekranı gösterilecek
            setLoading(false);
            return;
        }

        findRoutes(sId, eId).then(results => {
            const found = results.find(r => r.resultId === resultId);
            setRoute(found || null);
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    }, [resultId, startStopId, endStopId]);

    useEffect(() => {
        if (!route) return;

        let isMounted = true;
        const loadMap = async () => {
            const mData: MapData = { markers: [], busPolylines: [], walkPolylines: [] };
            let missingShape = false;
            const fullCoords: { latitude: number, longitude: number }[] = [];

            // Marker sayacı — Math.random() yerine sabit ve benzersiz key
            let markerCounter = 0;
            const addMarker = (stopId: string, type: 'start' | 'transfer' | 'end') => {
                const s = (plannerStopsRaw as any[]).find(x => x.id === stopId);
                if (!s) return;
                mData.markers.push({ id: `${stopId}-${type}-${markerCounter++}`, coord: { latitude: s.latitude, longitude: s.longitude }, title: s.name, type });
                fullCoords.push({ latitude: s.latitude, longitude: s.longitude });
            };

            const addWalk = async (fromId: string, toId: string) => {
                const fs = (plannerStopsRaw as any[]).find(x => x.id === fromId);
                const ts = (plannerStopsRaw as any[]).find(x => x.id === toId);
                if (!fs || !ts) return;
                const walk = await getWalkingRoute(
                    { latitude: fs.latitude, longitude: fs.longitude },
                    { latitude: ts.latitude, longitude: ts.longitude },
                    fromId, toId
                );
                if (walk.geometry) {
                    mData.walkPolylines.push({ coords: walk.geometry });
                    fullCoords.push(...walk.geometry);
                }
            };

            const addBus = (shapeId: string | null, rId: string, dirId: string, boardId: string, alightId: string, color: string) => {
                const seg = getShapeSegment({ shapeId, boardingStopId: boardId, alightingStopId: alightId, directionId: dirId, routeId: rId });
                if (seg.length > 0) {
                    const mapped = seg.map(x => ({ latitude: x[0], longitude: x[1] }));
                    mData.busPolylines.push({ coords: mapped, color });
                    fullCoords.push(...mapped);
                } else {
                    missingShape = true;
                }
            };

            if (route.type === 'direct') {
                const dir = route as DirectRouteResult;
                const boardStop = dir.actualBoardingStopId || dir.boardingStopId;
                const alightStop = dir.actualAlightingStopId || dir.alightingStopId;

                addMarker(dir.boardingStopId, 'start');
                if (dir.walkingToBoardingMeters && dir.actualBoardingStopId) await addWalk(dir.boardingStopId, boardStop);
                if (boardStop !== dir.boardingStopId) addMarker(boardStop, 'start');

                // shapeId öncelikli olarak kullanılır
                addBus(dir.shapeId, dir.routeId, dir.directionId, boardStop, alightStop, Colors.primary);

                addMarker(alightStop, 'end');
                if (dir.walkingFromAlightingMeters && dir.actualAlightingStopId) await addWalk(alightStop, dir.alightingStopId);
                // Varış durağı her zaman eklenir (yürüyüş olsun ya da olmasın)
                if (alightStop !== dir.alightingStopId) addMarker(dir.alightingStopId, 'end');
            } else {
                const trans = route as TransferRouteResult;
                const boardStop = trans.actualBoardingStopId || trans.boardingStopId;
                const alightStop = trans.actualAlightingStopId || trans.alightingStopId;

                addMarker(trans.boardingStopId, 'start');
                if (trans.walkingToBoardingMeters && trans.actualBoardingStopId) await addWalk(trans.boardingStopId, boardStop);
                if (boardStop !== trans.boardingStopId) addMarker(boardStop, 'start');

                addBus(trans.firstShapeId, trans.firstRouteId, trans.firstDirectionId, boardStop, trans.transferStopId, Colors.primary);
                addMarker(trans.transferStopId, 'transfer');
                addBus(trans.secondShapeId, trans.secondRouteId, trans.secondDirectionId, trans.transferStopId, alightStop, Colors.accent || '#9b59b6');

                addMarker(alightStop, 'end');
                if (trans.walkingFromAlightingMeters && trans.actualAlightingStopId) await addWalk(alightStop, trans.alightingStopId);
                // Varış durağı her zaman eklenir
                if (alightStop !== trans.alightingStopId) addMarker(trans.alightingStopId, 'end');
            }

            if (isMounted) {
                setMapData(mData);
                setShapeMissingWarning(missingShape);

                setTimeout(() => {
                    if (mapRef.current && fullCoords.length > 0) {
                        mapRef.current.fitToCoordinates(fullCoords, {
                            edgePadding: { top: 40, right: 40, bottom: (SCREEN_HEIGHT - INITIAL_SHEET_Y) + 40, left: 40 },
                            animated: true,
                        });
                    }
                }, 600);
            }
        };

        loadMap();
        return () => { isMounted = false; };
    }, [route]);

    const buildTimeline = (r: TripPlanResult) => {
        const steps: any[] = [];

        if (r.type === 'direct') {
            const dir = r as DirectRouteResult;
            // 1. Başlangıç durağı (kullanıcının seçtiği)
            steps.push({ id: 'start', type: 'origin', title: getStopNameById(dir.boardingStopId), stopId: dir.boardingStopId, icon: 'location' });

            // 2. Gerekliyse gerçek biniş durağına yürüyüş
            if (dir.walkingToBoardingMeters) {
                steps.push({
                    id: 'walk1', type: 'walk',
                    title: `Yaklaşık ${dir.walkingToBoardingMeters}m yürüyün`,
                    subtitle: 'Yaklaşık kuş uçuşu bağlantıdır; gerçek yaya güzergâhı değildir.',
                    icon: 'walk'
                });
            }

            // 3. Otobüse biniş durağı
            const boardStop = dir.actualBoardingStopId || dir.boardingStopId;
            steps.push({ id: 'board', type: 'board', title: `${getStopNameById(boardStop)} durağından binin`, subtitle: `${dir.routeId} numaralı hat`, stopId: boardStop, routeId: dir.routeId, routeDir: dir.directionId, icon: 'bus' });

            // 4. Aradaki duraklar
            if (dir.stopCount > 1) {
                steps.push({ id: 'ride', type: 'ride', title: `${dir.stopCount - 1} durak (Otobüs yolculuğu)`, routeId: dir.routeId, routeDir: dir.directionId, icon: 'git-commit' });
            }

            // 5. İniş durağı
            const alightStop = dir.actualAlightingStopId || dir.alightingStopId;
            steps.push({ id: 'alight', type: 'alight', title: `${getStopNameById(alightStop)} durağında inin`, stopId: alightStop, icon: 'exit' });

            // 6. Gerekliyse varış durağına yürüyüş
            if (dir.walkingFromAlightingMeters) {
                steps.push({
                    id: 'walk2', type: 'walk',
                    title: `Yaklaşık ${dir.walkingFromAlightingMeters}m yürüyün`,
                    subtitle: 'Yaklaşık kuş uçuşu bağlantıdır; gerçek yaya güzergâhı değildir.',
                    icon: 'walk'
                });
            }

            // 7. Kullanıcının seçtiği varış durağı — HER ZAMAN son adım olarak eklenir
            if (alightStop !== dir.alightingStopId) {
                // İniş durağından farklıysa (yürüyüş gerektiren senaryo)
                steps.push({ id: 'end', type: 'destination', title: getStopNameById(dir.alightingStopId), stopId: dir.alightingStopId, icon: 'flag' });
            } else {
                // İniş durağı zaten varış durağıysa sadece 'destination' ikonu ekle
                steps.push({ id: 'end', type: 'destination', title: getStopNameById(dir.alightingStopId), stopId: dir.alightingStopId, icon: 'flag' });
            }
        } else {
            const trans = r as TransferRouteResult;
            // 1. Başlangıç durağı
            steps.push({ id: 'start', type: 'origin', title: getStopNameById(trans.boardingStopId), stopId: trans.boardingStopId, icon: 'location' });

            // 2. Gerekliyse ilk durağa yürüyüş
            if (trans.walkingToBoardingMeters) {
                steps.push({
                    id: 'walk1', type: 'walk',
                    title: `Yaklaşık ${trans.walkingToBoardingMeters}m yürüyün`,
                    subtitle: 'Yaklaşık kuş uçuşu bağlantıdır; gerçek yaya güzergâhı değildir.',
                    icon: 'walk'
                });
            }

            // 3. Birinci hatta biniş
            const boardStop = trans.actualBoardingStopId || trans.boardingStopId;
            steps.push({ id: 'board1', type: 'board', title: `${getStopNameById(boardStop)} durağından binin`, subtitle: `${trans.firstRouteId} numaralı hat`, stopId: boardStop, routeId: trans.firstRouteId, routeDir: trans.firstDirectionId, icon: 'bus' });

            // 4. İlk hat üzerindeki duraklar
            if (trans.firstSegmentStopCount > 1) {
                steps.push({ id: 'ride1', type: 'ride', title: `${trans.firstSegmentStopCount - 1} durak (Otobüs yolculuğu)`, routeId: trans.firstRouteId, routeDir: trans.firstDirectionId, icon: 'git-commit' });
            }

            // 5. Aktarma durağı
            steps.push({ id: 'transfer', type: 'transfer', title: `${getStopNameById(trans.transferStopId)} durağında inin ve aktarma yapın`, stopId: trans.transferStopId, icon: 'swap-horizontal' });

            // 6. İkinci hatta biniş
            steps.push({ id: 'board2', type: 'board', title: `${getStopNameById(trans.transferStopId)} durağından binin`, subtitle: `${trans.secondRouteId} numaralı hat`, stopId: trans.transferStopId, routeId: trans.secondRouteId, routeDir: trans.secondDirectionId, icon: 'bus' });

            // 7. İkinci hat üzerindeki duraklar
            if (trans.secondSegmentStopCount > 1) {
                steps.push({ id: 'ride2', type: 'ride', title: `${trans.secondSegmentStopCount - 1} durak (Otobüs yolculuğu)`, routeId: trans.secondRouteId, routeDir: trans.secondDirectionId, icon: 'git-commit' });
            }

            // 8. İniş durağı
            const alightStop = trans.actualAlightingStopId || trans.alightingStopId;
            steps.push({ id: 'alight', type: 'alight', title: `${getStopNameById(alightStop)} durağında inin`, stopId: alightStop, icon: 'exit' });

            // 9. Gerekliyse varış durağına yürüyüş
            if (trans.walkingFromAlightingMeters) {
                steps.push({
                    id: 'walk2', type: 'walk',
                    title: `Yaklaşık ${trans.walkingFromAlightingMeters}m yürüyün`,
                    subtitle: 'Yaklaşık kuş uçuşu bağlantıdır; gerçek yaya güzergâhı değildir.',
                    icon: 'walk'
                });
            }

            // 10. Kullanıcının seçtiği varış durağı — HER ZAMAN son adım
            steps.push({ id: 'end', type: 'destination', title: getStopNameById(trans.alightingStopId), stopId: trans.alightingStopId, icon: 'flag' });
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
                    {item.subtitle && (
                        <Text style={item.type === 'walk' ? styles.stepSubtitleWalk : styles.stepSubtitle}>
                            {item.subtitle}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* 1) Static Absolute Map Background */}
            <View style={styles.mapBackgroundContainer}>
                {mapData ? (
                    <MapView
                        ref={mapRef}
                        style={StyleSheet.absoluteFillObject}
                        initialRegion={mapData.markers[0] ? {
                            latitude: mapData.markers[0].coord.latitude,
                            longitude: mapData.markers[0].coord.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        } : undefined}
                    >
                        {mapData.walkPolylines.map((wp, i) => (
                            <Polyline key={`walk-${i}`} coordinates={wp.coords} strokeColor={Colors.textSecondary} strokeWidth={3} lineDashPattern={[5, 10]} />
                        ))}
                        {mapData.busPolylines.map((bp, i) => (
                            <Polyline key={`bus-${i}`} coordinates={bp.coords} strokeColor={bp.color} strokeWidth={5} />
                        ))}
                        {mapData.markers.map((m) => (
                            <Marker key={m.id} coordinate={m.coord} title={m.title} description={m.type === 'start' ? 'Başlangıç' : m.type === 'transfer' ? 'Aktarma' : 'Varış'} pinColor={m.type === 'start' ? Colors.success : m.type === 'transfer' ? Colors.warning : Colors.primary} />
                        ))}
                    </MapView>
                ) : (
                    <View style={styles.mapPlaceholder}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                )}
            </View>

            {/* 2) Draggable Bottom Sheet */}
            <Animated.View style={[styles.bottomSheetContainer, { transform: [{ translateY: sheetY }] }]}>

                {/* Header containing PanResponder */}
                <View {...panResponder.panHandlers} style={styles.sheetHeaderWrapper}>
                    <View style={styles.sheetGrabber} />

                    {shapeMissingWarning && (
                        <View style={styles.warningBanner}>
                            <Ionicons name="alert-circle" size={18} color={Colors.warning} />
                            <Text style={styles.warningBannerText}>
                                GTFS güzergâhı eksik (Kuş uçuşu iptal).
                            </Text>
                        </View>
                    )}

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
                </View>

                {/* Content (Timline FlatList) */}
                <FlatList
                    data={steps}
                    keyExtractor={(item) => (item as any).id}
                    renderItem={renderStep}
                    contentContainerStyle={styles.timelineList}
                    bounces={false}
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
    errorText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginVertical: Spacing.md },
    fallbackBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
    fallbackBtnText: { color: Colors.white, fontWeight: FontWeights.bold },
    mapBackgroundContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: '100%' },
    mapPlaceholder: { flex: 1, backgroundColor: Colors.gray300, justifyContent: 'center', alignItems: 'center' },
    bottomSheetContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: -SCREEN_HEIGHT, // Extra bottom padding for translating
        backgroundColor: Colors.background,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 10
    },
    sheetHeaderWrapper: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
    },
    sheetGrabber: { width: 40, height: 5, backgroundColor: Colors.gray300, borderRadius: 3, alignSelf: 'center', marginTop: Spacing.sm },
    warningBanner: { flexDirection: 'row', backgroundColor: '#FFF3CD', padding: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#FFEEBA', alignItems: 'center', marginTop: Spacing.sm },
    warningBannerText: { flex: 1, marginLeft: Spacing.sm, fontSize: FontSizes.sm, color: Colors.textSecondary },
    header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.gray300 },
    backBtn: { marginRight: Spacing.md },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.textPrimary },
    headerSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
    timelineList: { paddingBottom: Spacing.xxl + 200, paddingTop: Spacing.md },
    stepContainer: { flexDirection: 'row', minHeight: 60, paddingHorizontal: Spacing.lg },
    stepLeft: { width: 40, alignItems: 'center' },
    stepIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
    stepLine: { width: 2, flex: 1, backgroundColor: Colors.primary, marginTop: -4, marginBottom: -4, zIndex: 1 },
    stepRight: { flex: 1, paddingLeft: Spacing.md, paddingBottom: Spacing.lg, justifyContent: 'center' },
    stepTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: Colors.textPrimary },
    touchableText: { textDecorationLine: 'underline' },
    stepSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 4, fontWeight: FontWeights.medium },
    stepSubtitleWalk: { fontSize: FontSizes.xs, color: Colors.textDisabled, marginTop: 2, fontStyle: 'italic' }
});
