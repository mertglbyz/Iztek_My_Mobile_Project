import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import plannerStopsRaw from '@/data/gtfs/planner_stops.json';
import { getShapeSegment } from '@/services/shapeSegmentService';
import { DirectRouteResult, findRoutes, TransferRouteResult, TripPlanResult } from '@/services/tripPlanner';
import { getWalkingRoute, isApproximateRoute } from '@/services/walkingRoutingService';
import { WalkingRouteResult } from '@/types';
import { getStopsForRoute } from '@/utils/routeData';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, Animated, Dimensions, FlatList, PanResponder, StyleSheet, Text, TouchableOpacity, View, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import { useActiveJourney } from '@/contexts/ActiveJourneyContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MapData {
    markers: { id: string, stopId?: string, coord: { latitude: number, longitude: number }, title: string, type: 'start' | 'transfer' | 'end' | 'waypoint', color?: string }[];
    busPolylines: { coords: { latitude: number, longitude: number }[], color: string }[];
    walkPolylines: { coords: { latitude: number, longitude: number }[], isApproximate: boolean }[];
    fullCoords: { latitude: number, longitude: number }[];
}

const getStopNameById = (id: string) => {
    const s = (plannerStopsRaw as any[]).find(x => x.id === id);
    return s ? s.name : id;
};

export default function TripDetailScreen() {
    const { resultId, startStopId, endStopId } = useLocalSearchParams();
    const router = useRouter();
    const { dispatch } = useActiveJourney();

    const [route, setRoute] = useState<TripPlanResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapData, setMapData] = useState<MapData | null>(null);
    const [shapeMissingWarning, setShapeMissingWarning] = useState(false);
    const [loadingWalking, setLoadingWalking] = useState(false);
    const [mapReady, setMapReady] = useState(false);
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

    const handleStartJourney = async () => {
        if (!route) return;
        
        try {
            const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (canAskAgain) {
                    const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
                    if (newStatus !== 'granted') {
                        Alert.alert("Konum İzni Gerekli", "Yolculuk takibi yapabilmek için konum iznine ihtiyacımız var. Lütfen ayarlardan izin verin.", [
                            { text: "İptal", style: "cancel" },
                            { text: "Ayarlar", onPress: () => Linking.openSettings() }
                        ]);
                        return;
                    }
                } else {
                    Alert.alert("Konum İzni Gerekli", "Yolculuk takibi yapabilmek için konum iznine ihtiyacımız var. Lütfen ayarlardan izin verin.", [
                        { text: "İptal", style: "cancel" },
                        { text: "Ayarlar", onPress: () => Linking.openSettings() }
                    ]);
                    return;
                }
            }
        } catch (e) {
            console.warn("Konum izni alınırken hata oluştu", e);
        }

        Alert.alert(
            "Yolculuğu Başlat",
            "Bu rota için aktif navigasyonu başlatmak istiyor musunuz?",
            [
                { text: "İptal", style: "cancel" },
                { 
                    text: "Başlat", 
                    style: "default",
                    onPress: () => {
                        dispatch({ 
                            type: 'START_JOURNEY', 
                            payload: { route, journeyId: Date.now().toString() } 
                        });
                        router.push('/journey/active');
                    }
                }
            ]
        );
    };

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

        const fetchData = async () => {
            const sId = typeof startStopId === 'string' ? startStopId : '';
            const eId = typeof endStopId === 'string' ? endStopId : '';
            if (!resultId || typeof resultId !== 'string' || !sId || !eId) {
                setLoading(false);
                return;
            }

            try {
                const results = await findRoutes(sId, eId);
                const found = results.find(r => r.resultId === resultId);
                setRoute(found || null);
            } catch {
                // handle error
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [resultId, startStopId, endStopId]);

    // Render optimization removed to prevent iOS marker dropping bugs.

    useEffect(() => {
        if (!route) return;

        let isMounted = true;
        let timer: NodeJS.Timeout;
        const loadMap = async () => {
            const mData: Omit<MapData, 'fullCoords'> = { markers: [], busPolylines: [], walkPolylines: [] };
            let missingShape = false;
            const fullCoords: { latitude: number, longitude: number }[] = [];

            let markerCounter = 0;
            const addMarker = (stopId: string, type: 'start' | 'transfer' | 'end' | 'waypoint', color?: string) => {
                const s = (plannerStopsRaw as any[]).find(x => String(x.id) === String(stopId) || String(x.stopId) === String(stopId));
                if (!s) return;
                // Aynı rotanın aynı duraktan iki kez geçme (loop) ihtimaline karşı stabil ve benzersiz sayaç (Math.random() kullanılmaz)
                const uniqueKey = `${stopId}-${type}-${markerCounter++}`;
                mData.markers.push({ id: uniqueKey, stopId, coord: { latitude: Number(s.latitude), longitude: Number(s.longitude) }, title: s.name, type, color });
                fullCoords.push({ latitude: Number(s.latitude), longitude: Number(s.longitude) });
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
                    mData.walkPolylines.push({ coords: walk.geometry, isApproximate: walk.isApproximate });
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

            setLoadingWalking(true);

                const addIntermediateStops = (stopIds: string[]) => {
                    if (!stopIds || stopIds.length <= 2) return;
                    
                    // İlk ve son duraklar zaten Başlangıç/Varış/Aktarma olarak ekleniyor, aradakileri alıyoruz
                    for (let i = 1; i < stopIds.length - 1; i++) {
                        const stopId = stopIds[i];
                        addMarker(stopId, 'waypoint', Colors.primary);
                    }
                };

                if (route.type === 'direct') {
                    const dir = route as DirectRouteResult;
                    const boardStop = dir.actualBoardingStopId || dir.boardingStopId;
                    const alightStop = dir.actualAlightingStopId || dir.alightingStopId;

                    addMarker(dir.boardingStopId, 'start');
                    if (dir.walkingToBoardingMeters && dir.actualBoardingStopId) await addWalk(dir.boardingStopId, boardStop);
                    if (boardStop !== dir.boardingStopId) addMarker(boardStop, 'waypoint', Colors.primary);

                    addIntermediateStops(dir.segmentStopIds);

                    addBus(dir.shapeId, dir.routeId, dir.directionId, boardStop, alightStop, '#000000');

                    if (alightStop !== dir.alightingStopId) addMarker(alightStop, 'waypoint', Colors.primary);
                    if (dir.walkingFromAlightingMeters && dir.actualAlightingStopId) await addWalk(alightStop, dir.alightingStopId);
                    addMarker(dir.alightingStopId, 'end');
                } else {
                    const trans = route as TransferRouteResult;
                    const boardStop = trans.actualBoardingStopId || trans.boardingStopId;
                    const alightStop = trans.actualAlightingStopId || trans.alightingStopId;

                    addMarker(trans.boardingStopId, 'start');
                    if (trans.walkingToBoardingMeters && trans.actualBoardingStopId) await addWalk(trans.boardingStopId, boardStop);
                    if (boardStop !== trans.boardingStopId) addMarker(boardStop, 'waypoint', Colors.primary);

                    addIntermediateStops(trans.firstSegmentStopIds);

                    // Aktarma 1. Ayak: Siyah Çizgi (Kullanıcı talebi)
                    addBus(trans.firstShapeId, trans.firstRouteId, trans.firstDirectionId, boardStop, trans.transferStopId, '#000000');
                    addMarker(trans.transferStopId, 'transfer');
                    
                    addIntermediateStops(trans.secondSegmentStopIds);

                    // Aktarma 2. Ayak: Kalın Yeşil (Siyahla uyumlu)
                    addBus(trans.secondShapeId, trans.secondRouteId, trans.secondDirectionId, trans.transferStopId, alightStop, '#2E7D32');

                    if (alightStop !== trans.alightingStopId) addMarker(alightStop, 'waypoint', Colors.primary);
                    if (trans.walkingFromAlightingMeters && trans.actualAlightingStopId) await addWalk(alightStop, trans.alightingStopId);
                    addMarker(trans.alightingStopId, 'end');
                }

            if (isMounted) {
                // Tüm duraklar, otobüs hatları ve yürüyüş yolları tamamlandıktan sonra haritayı güncelle
                setMapData({...mData, fullCoords});
                setShapeMissingWarning(missingShape);
                setLoadingWalking(false);
            }
        };

        loadMap();
        return () => { 
            isMounted = false;
        };
    }, [route]);

    useEffect(() => {
        if (mapReady && mapData && mapData.fullCoords.length > 0 && mapRef.current) {
            // Harita render olduktan hemen sonra koordinatlara fit ediyoruz.
            // Timeout kullanıyoruz çünkü layout'un tamamen hesaplanması için ufak bir bekleme (100ms) gerekiyor.
            const fitTimer = setTimeout(() => {
                mapRef.current?.fitToCoordinates(mapData.fullCoords, {
                    edgePadding: { top: 40, right: 40, bottom: (SCREEN_HEIGHT - INITIAL_SHEET_Y) + 40, left: 40 },
                    animated: true,
                });
            }, 100);
            return () => clearTimeout(fitTimer);
        }
    }, [mapReady, mapData]);

    const buildTimeline = (r: TripPlanResult) => {
        const steps: any[] = [];

        if (r.type === 'direct') {
            const dir = r as DirectRouteResult;
            const boardStop = dir.actualBoardingStopId || dir.boardingStopId;
            const isSameNameBoard = (dir.walkingToBoardingMeters && boardStop !== dir.boardingStopId && getStopNameById(dir.boardingStopId) === getStopNameById(boardStop));

            // 1. Başlangıç durağı (kullanıcının seçtiği)
            steps.push({ id: 'start', type: 'origin', title: isSameNameBoard ? `${getStopNameById(dir.boardingStopId)} – Seçilen durak` : getStopNameById(dir.boardingStopId), stopId: dir.boardingStopId, icon: 'location' });

            // 2. Gerekliyse gerçek biniş durağına yürüyüş
            if (dir.walkingToBoardingMeters) {
                const durationText = dir.walkingToBoardingDuration ? ` (${Math.ceil(dir.walkingToBoardingDuration / 60)} dk)` : '';
                steps.push({
                    id: 'walk1', type: 'walk',
                    title: `Yaklaşık ${dir.walkingToBoardingMeters}m yürüyün${durationText}`,
                    subtitle: dir.isApproximate ? 'Yaklaşık kuş uçuşu bağlantıdır; gerçek yaya güzergâhı değildir.' : 'Gerçek yaya güzergâhı',
                    icon: 'walk',
                    isApproximate: dir.isApproximate
                });
            }

            // 3. Otobüse biniş durağı
            let boardTitle = `${getStopNameById(boardStop)} durağından binin`;
            if (isSameNameBoard) {
                boardTitle = `${getStopNameById(boardStop)} – Durak ID: ${boardStop} (Yön: ${dir.directionId}) – Biniş yapılacak durak`;
            }
            steps.push({ id: 'board', type: 'board', title: boardTitle, subtitle: `${dir.routeId} numaralı hat`, stopId: boardStop, routeId: dir.routeId, routeDir: dir.directionId, icon: 'bus' });

            // 4. Aradaki duraklar
            if (dir.stopCount > 1) {
                steps.push({ id: 'ride', type: 'ride', title: `${dir.stopCount - 1} durak (Otobüs yolculuğu)`, routeId: dir.routeId, routeDir: dir.directionId, icon: 'git-commit' });
            }

            // 5. İniş durağı
            const alightStop = dir.actualAlightingStopId || dir.alightingStopId;
            const isSameNameAlight = (dir.walkingFromAlightingMeters && alightStop !== dir.alightingStopId && getStopNameById(dir.alightingStopId) === getStopNameById(alightStop));

            let alightTitle = `${getStopNameById(alightStop)} durağında inin`;
            if (isSameNameAlight) {
                alightTitle = `${getStopNameById(alightStop)} – Durak ID: ${alightStop} (Yön: ${dir.directionId}) – İniş yapılacak durak`;
            }
            steps.push({ id: 'alight', type: 'alight', title: alightTitle, stopId: alightStop, icon: 'exit' });

            // 6. Gerekliyse varış durağına yürüyüş
            if (dir.walkingFromAlightingMeters) {
                const durationText = dir.walkingFromAlightingDuration ? ` (${Math.ceil(dir.walkingFromAlightingDuration / 60)} dk)` : '';
                steps.push({
                    id: 'walk2', type: 'walk',
                    title: `Yaklaşık ${dir.walkingFromAlightingMeters}m yürüyün${durationText}`,
                    subtitle: dir.isApproximate ? 'Yaklaşık kuş uçuşu bağlantıdır; gerçek yaya güzergâhı değildir.' : 'Gerçek yaya güzergâhı',
                    icon: 'walk',
                    isApproximate: dir.isApproximate
                });
            }

            // 7. Kullanıcının seçtiği varış durağı — HER ZAMAN son adım olarak eklenir
            const targetEndTitle = isSameNameAlight ? `${getStopNameById(dir.alightingStopId)} – Seçilen durak` : getStopNameById(dir.alightingStopId);
            steps.push({ id: 'end', type: 'destination', title: targetEndTitle, stopId: dir.alightingStopId, icon: 'flag' });
        } else {
            const trans = r as TransferRouteResult;
            const boardStop = trans.actualBoardingStopId || trans.boardingStopId;
            const isSameNameBoardT = (trans.walkingToBoardingMeters && boardStop !== trans.boardingStopId && getStopNameById(trans.boardingStopId) === getStopNameById(boardStop));

            // 1. Başlangıç durağı
            steps.push({ id: 'start', type: 'origin', title: isSameNameBoardT ? `${getStopNameById(trans.boardingStopId)} – Seçilen durak` : getStopNameById(trans.boardingStopId), stopId: trans.boardingStopId, icon: 'location' });

            // 2. Gerekliyse ilk durağa yürüyüş
            if (trans.walkingToBoardingMeters) {
                const durationText = trans.walkingToBoardingDuration ? ` (${Math.ceil(trans.walkingToBoardingDuration / 60)} dk)` : '';
                steps.push({
                    id: 'walk1', type: 'walk',
                    title: `Yaklaşık ${trans.walkingToBoardingMeters}m yürüyün${durationText}`,
                    subtitle: trans.isApproximate ? 'Yaklaşık kuş uçuşu bağlantıdır; gerçek yaya güzergâhı değildir.' : 'Gerçek yaya güzergâhı',
                    icon: 'walk',
                    isApproximate: trans.isApproximate
                });
            }

            // 3. Birinci hatta biniş
            let board1Title = `${getStopNameById(boardStop)} durağından binin`;
            if (isSameNameBoardT) {
                board1Title = `${getStopNameById(boardStop)} – Durak ID: ${boardStop} (Yön: ${trans.firstDirectionId}) – Biniş yapılacak durak`;
            }
            steps.push({ id: 'board1', type: 'board', title: board1Title, subtitle: `${trans.firstRouteId} numaralı hat`, stopId: boardStop, routeId: trans.firstRouteId, routeDir: trans.firstDirectionId, icon: 'bus' });

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
            const isSameNameAlightT = (trans.walkingFromAlightingMeters && alightStop !== trans.alightingStopId && getStopNameById(trans.alightingStopId) === getStopNameById(alightStop));

            let alightTitle = `${getStopNameById(alightStop)} durağında inin`;
            if (isSameNameAlightT) {
                alightTitle = `${getStopNameById(alightStop)} – Durak ID: ${alightStop} (Yön: ${trans.secondDirectionId}) – İniş yapılacak durak`;
            }
            steps.push({ id: 'alight', type: 'alight', title: alightTitle, stopId: alightStop, icon: 'exit' });

            // 9. Gerekliyse varış durağına yürüyüş
            if (trans.walkingFromAlightingMeters) {
                const durationText = trans.walkingFromAlightingDuration ? ` (${Math.ceil(trans.walkingFromAlightingDuration / 60)} dk)` : '';
                steps.push({
                    id: 'walk2', type: 'walk',
                    title: `Yaklaşık ${trans.walkingFromAlightingMeters}m yürüyün${durationText}`,
                    subtitle: trans.isApproximate ? 'Yaklaşık kuş uçuşu bağlantıdır; gerçek yaya güzergâhı değildir.' : 'Gerçek yaya güzergâhı',
                    icon: 'walk',
                    isApproximate: trans.isApproximate
                });
            }

            // 10. Kullanıcının seçtiği varış durağı — HER ZAMAN son adım
            const targetEndTitleT = isSameNameAlightT ? `${getStopNameById(trans.alightingStopId)} – Seçilen durak` : getStopNameById(trans.alightingStopId);
            steps.push({ id: 'end', type: 'destination', title: targetEndTitleT, stopId: trans.alightingStopId, icon: 'flag' });
        }

        return steps;
    };

    const CustomPin = ({ iconName, color, size = 12 }: { iconName: string, color: string, size?: number }) => (
        <View style={{ alignItems: 'center', justifyContent: 'center', width: size * 2.5, height: size * 2.5 }}>
            <MaterialCommunityIcons name="map-marker" size={size * 2.5} color={color} style={{ position: 'absolute' }} />
            <Ionicons name={iconName as any} size={size * 1.3} color={Colors.white} style={{ position: 'absolute', top: size * 0.3 }} />
        </View>
    );

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
                    <View style={[styles.stepIconContainer, item.type === 'walk' && { backgroundColor: item.isApproximate ? Colors.gray300 : Colors.accentSoft }]}>
                        <Ionicons name={item.icon} size={18} color={item.type === 'walk' ? (item.isApproximate ? Colors.textSecondary : Colors.accent) : Colors.primary} />
                    </View>
                    {!isLast && (
                        <View style={[
                            styles.stepLine, 
                            (item.type === 'walk' || (steps[index + 1] && steps[index + 1].type === 'walk')) 
                                ? (item.isApproximate || (steps[index + 1] && steps[index + 1].isApproximate) 
                                    ? { borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.textDisabled, backgroundColor: 'transparent' } 
                                    : { backgroundColor: Colors.accent })
                                : {}
                        ]} />
                    )}
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
            <View style={styles.mapBackgroundContainer}>
                {mapData ? (
                    <MapView
                        ref={mapRef}
                        style={StyleSheet.absoluteFillObject}
                        onMapReady={() => setMapReady(true)}
                        initialRegion={mapData.markers[0] ? {
                            latitude: mapData.markers[0].coord.latitude,
                            longitude: mapData.markers[0].coord.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        } : undefined}
                    >
                        {mapData.walkPolylines.map((wp, i) => (
                            <Polyline 
                                key={`walk-${i}-${wp.coords.length}`} 
                                coordinates={wp.coords} 
                                strokeColor={wp.isApproximate ? Colors.textSecondary : Colors.accent} 
                                strokeWidth={wp.isApproximate ? 4 : 6} 
                                lineDashPattern={wp.isApproximate ? [5, 10] : undefined} 
                                zIndex={2} 
                            />
                        ))}
                        {mapData.busPolylines.map((bp, i) => (
                            <Polyline key={`bus-${i}`} coordinates={bp.coords} strokeColor={bp.color} strokeWidth={5} zIndex={1} />
                        ))}
                        {mapData.markers.map((m) => {
                            if (m.type === 'waypoint') {
                                return (
                                    <Marker 
                                        key={m.id} 
                                        coordinate={m.coord} 
                                        zIndex={10}
                                    >
                                        <CustomPin iconName="bus" color={m.color || '#1877F2'} size={14} />
                                        <Callout tooltip onPress={() => router.push(`/stop/${m.stopId}`)}>
                                            <View style={styles.eshotCalloutContainer}>
                                                <View style={styles.eshotCallout}>
                                                    <View style={styles.eshotCalloutLeft}>
                                                        <MaterialCommunityIcons name="bus" size={16} color="white" />
                                                    </View>
                                                    <View style={styles.eshotCalloutRight}>
                                                        <Text style={styles.eshotCalloutId} numberOfLines={1}>{m.stopId || ''}</Text>
                                                        <Text style={styles.eshotCalloutName} numberOfLines={1}>{m.title}</Text>
                                                    </View>
                                                </View>
                                                <MaterialCommunityIcons name="menu-down" size={30} color="white" style={styles.eshotCalloutArrow} />
                                            </View>
                                        </Callout>
                                    </Marker>
                                );
                            }
                            
                            const isStart = m.type === 'start';
                            const isEnd = m.type === 'end';
                            const pinColor = isStart ? Colors.success : isEnd ? Colors.error : Colors.warning;
                            const iconName = isStart ? 'location' : isEnd ? 'flag' : 'git-compare';

                            return (
                                <Marker 
                                    key={m.id} 
                                    coordinate={m.coord} 
                                    zIndex={20}
                                >
                                    <CustomPin iconName={iconName} color={pinColor} size={16} />
                                    <Callout tooltip onPress={m.stopId ? () => router.push(`/stop/${m.stopId}`) : undefined}>
                                        <View style={styles.eshotCalloutContainer}>
                                            <View style={styles.eshotCallout}>
                                                <View style={[styles.eshotCalloutLeft, { backgroundColor: pinColor }]}>
                                                    <Ionicons name={iconName} size={16} color="white" />
                                                </View>
                                                <View style={styles.eshotCalloutRight}>
                                                    <Text style={styles.eshotCalloutId} numberOfLines={1}>{m.title}</Text>
                                                    <Text style={styles.eshotCalloutName} numberOfLines={1}>{isStart ? 'Başlangıç Noktası' : isEnd ? 'Varış Noktası' : 'Aktarma Noktası'}</Text>
                                                </View>
                                            </View>
                                            <MaterialCommunityIcons name="menu-down" size={30} color="white" style={styles.eshotCalloutArrow} />
                                        </View>
                                    </Callout>
                                </Marker>
                            );
                        })}
                    </MapView>
                ) : (
                    <ActivityIndicator size="large" color={Colors.primary} />
                )}
            </View>

            <Animated.View style={[styles.bottomSheetContainer, { top: sheetY }]}>

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

                    {loadingWalking && (
                        <View style={[styles.warningBanner, { backgroundColor: Colors.primarySoft, borderBottomColor: Colors.primary }]}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                            <Text style={[styles.warningBannerText, { color: Colors.primaryDark }]}>
                                Yaya rotası hesaplanıyor...
                            </Text>
                        </View>
                    )}

                    {!loadingWalking && route.totalWalkingMeters > 0 && route.isApproximate && (
                        <View style={[styles.warningBanner, { backgroundColor: Colors.warningSoft, borderBottomColor: Colors.warning }]}>
                            <Ionicons name="walk" size={18} color={Colors.warning} />
                            <Text style={styles.warningBannerText}>
                                Gerçek yaya güzergâhı alınamadı. Yaklaşık bağlantı gösteriliyor.
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

                <FlatList
                    style={{ flex: 1 }}
                    data={steps}
                    keyExtractor={(item) => (item as any).id}
                    renderItem={renderStep}
                    contentContainerStyle={styles.timelineList}
                    bounces={true}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        <View style={{ padding: Spacing.lg, paddingBottom: Spacing.xl * 2 }}>
                            <TouchableOpacity 
                                style={styles.startJourneyBtn} 
                                onPress={handleStartJourney}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="navigate" size={24} color={Colors.white} style={{ marginRight: 8 }} />
                                <Text style={styles.startJourneyBtnText}>Yolculuğu Başlat</Text>
                            </TouchableOpacity>
                        </View>
                    }
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
    startJourneyBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: BorderRadius.lg,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    startJourneyBtnText: {
        color: Colors.white,
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold
    },
    mapBackgroundContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: '100%' },
    mapPlaceholder: { flex: 1, backgroundColor: Colors.gray300, justifyContent: 'center', alignItems: 'center' },
    bottomSheetContainer: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
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
    calloutSubtitle: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
    eshotCalloutContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    eshotCallout: {
        flexDirection: 'row',
        backgroundColor: 'white',
        overflow: 'hidden',
        borderRadius: 2,
        width: 170,
        height: 44,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    eshotCalloutLeft: {
        width: 36,
        backgroundColor: '#555555',
        justifyContent: 'center',
        alignItems: 'center',
    },
    eshotCalloutRight: {
        flex: 1,
        paddingHorizontal: 8,
        justifyContent: 'center',
    },
    eshotCalloutId: {
        fontWeight: 'bold',
        fontSize: 13,
        color: '#000',
    },
    eshotCalloutName: {
        fontSize: 11,
        color: '#333',
        marginTop: 1,
    },
    eshotCalloutArrow: {
        marginTop: -14,
    },
    timelineList: { paddingBottom: Spacing.xl, paddingTop: Spacing.md },
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
