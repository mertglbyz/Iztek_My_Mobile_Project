import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useActiveJourney } from '@/contexts/ActiveJourneyContext';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius } from '@/constants/theme';
import { ExpoLocationProvider } from '@/services/location/ExpoLocationProvider';
import { MockJourneyLocationProvider } from '@/services/location/MockJourneyLocationProvider';
import { LocationProvider } from '@/services/location/LocationProvider';
import { calculateProgress, StopCoordinate, calculateDistanceMeters } from '@/services/location/progressAlgorithm';
import { JourneyConstants } from '@/config/journeyConstants';
import plannerStopsRaw from '@/data/gtfs/planner_stops.json';
import { getShapeSegment } from '@/services/shapeSegmentService';
import { DirectRouteResult, TransferRouteResult } from '@/services/tripPlanner';

// ── O(1) durak lookup map'i ──
const stopMap = new Map<string, { id: string; name: string; latitude: number; longitude: number }>();
for (const s of plannerStopsRaw as any[]) {
    stopMap.set(String(s.id), { id: s.id, name: s.name, latitude: Number(s.latitude), longitude: Number(s.longitude) });
    if (s.stopId && String(s.stopId) !== String(s.id)) {
        stopMap.set(String(s.stopId), { id: s.id, name: s.name, latitude: Number(s.latitude), longitude: Number(s.longitude) });
    }
}

function lookupStop(stopId: string) {
    return stopMap.get(String(stopId)) ?? null;
}

export default function ActiveJourneyScreen() {
    const { activeJourney, dispatch } = useActiveJourney();
    const router = useRouter();
    const mapRef = useRef<MapView>(null);
    const locationProvider = useRef<LocationProvider | null>(null);

    const [providerError, setProviderError] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // Güncel state'i mock provider'a iletmek için ref kullanıyoruz
    const activeJourneyRef = useRef(activeJourney);
    useEffect(() => {
        activeJourneyRef.current = activeJourney;
    }, [activeJourney]);

    // Eğer aktif yolculuk yoksa (iptal edildiyse vs.) ana sayfaya dön
    useEffect(() => {
        if (!activeJourney) {
            router.replace('/(tabs)');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeJourney]);

    const route = activeJourney?.route ?? null;
    const progress = activeJourney?.progress ?? null;
    const lastKnownLocation = activeJourney?.lastKnownLocation ?? null;
    const currentState = activeJourney?.currentState ?? 'idle';

    // ── Mevcut segment durakları ──
    const currentSegmentStops = useMemo<StopCoordinate[]>(() => {
        if (!route) return [];
        if (route.type === 'direct') {
            return route.segmentStopIds
                .map(id => lookupStop(id))
                .filter((s): s is NonNullable<typeof s> => s !== null);
        } else {
            const t = route as TransferRouteResult;
            const isFirstLeg = progress?.remainingTransfers !== 0;
            const stopIds = isFirstLeg ? t.firstSegmentStopIds : t.secondSegmentStopIds;
            return stopIds
                .map(id => lookupStop(id))
                .filter((s): s is NonNullable<typeof s> => s !== null);
        }
    }, [route, progress?.remainingTransfers]);

    // ── Otobüs rota çizgisi (Polyline) ──
    const shapePoints = useMemo(() => {
        if (!route) return [];
        let shapeId: string | null = null;
        if (route.type === 'direct') {
            shapeId = route.shapeId;
        } else {
            const tr = route as TransferRouteResult;
            shapeId = (progress?.remainingTransfers === 0) ? tr.secondShapeId : tr.firstShapeId;
        }
        
        if (!shapeId || currentSegmentStops.length < 2) return [];
        try {
            const segment = getShapeSegment({
                shapeId, 
                boardingStopId: currentSegmentStops[0].id, 
                alightingStopId: currentSegmentStops[currentSegmentStops.length - 1].id
            });
            return segment.map(p => ({ latitude: p[0], longitude: p[1] }));
        } catch {
            return [];
        }
    }, [route, progress?.remainingTransfers, currentSegmentStops]);

    // ── Yürüyüş polyline'ları ──
    const walkingPolylines = useMemo(() => {
        if (!route) return { toBoarding: [] as { latitude: number; longitude: number }[], fromAlighting: [] as { latitude: number; longitude: number }[] };
        
        const toBoarding: { latitude: number; longitude: number }[] = [];
        const fromAlighting: { latitude: number; longitude: number }[] = [];

        // Başlangıç yürüyüşü: boardingStopId (kullanıcı konumu) → actualBoardingStopId (otobüs durağı)
        if (route.walkingToBoardingMeters && route.walkingToBoardingMeters > 0) {
            const p1 = lookupStop(route.boardingStopId);
            const actualId = (route as any).actualBoardingStopId;
            const p2 = actualId ? lookupStop(actualId) : null;
            if (p1 && p2) {
                toBoarding.push(
                    { latitude: p1.latitude, longitude: p1.longitude },
                    { latitude: p2.latitude, longitude: p2.longitude }
                );
            }
        }

        // Varış yürüyüşü: actualAlightingStopId (otobüs durağı) → alightingStopId (hedef)
        if (route.walkingFromAlightingMeters && route.walkingFromAlightingMeters > 0) {
            const actualId = (route as any).actualAlightingStopId;
            const p1 = actualId ? lookupStop(actualId) : null;
            const p2 = lookupStop(route.alightingStopId);
            if (p1 && p2) {
                fromAlighting.push(
                    { latitude: p1.latitude, longitude: p1.longitude },
                    { latitude: p2.latitude, longitude: p2.longitude }
                );
            }
        }

        return { toBoarding, fromAlighting };
    }, [route]);

    // ── Harita odaklama ──
    useEffect(() => {
        if (mapReady && mapRef.current && currentSegmentStops.length > 0) {
            const coords = currentSegmentStops.map(s => ({ latitude: s.latitude, longitude: s.longitude }));
            if (lastKnownLocation) coords.push(lastKnownLocation);
            // Yürüyüş noktalarını da dahil et
            if (walkingPolylines.toBoarding.length > 0) coords.push(...walkingPolylines.toBoarding);
            if (walkingPolylines.fromAlighting.length > 0) coords.push(...walkingPolylines.fromAlighting);
            mapRef.current.fitToCoordinates(coords, { 
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, 
                animated: true 
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, currentSegmentStops]);

    // ── Provider başlatma ──
    useEffect(() => {
        if (!activeJourney || !route) return;

        const isMock = process.env.EXPO_PUBLIC_MOCK_LOCATION === 'true';

        if (isMock) {
            let coords: { latitude: number; longitude: number }[] = [];

            // 1. Başlangıç yürüyüşü (kullanıcı konumu → otobüs durağı)
            if (route.walkingToBoardingMeters && route.walkingToBoardingMeters > 0) {
                const userLocStop = lookupStop(route.boardingStopId);
                const actualId = (route as any).actualBoardingStopId;
                const busStop = actualId ? lookupStop(actualId) : null;
                if (userLocStop && busStop) {
                    for (let i = 0; i <= 5; i++) {
                        coords.push({
                            latitude: userLocStop.latitude + (busStop.latitude - userLocStop.latitude) * (i / 5),
                            longitude: userLocStop.longitude + (busStop.longitude - userLocStop.longitude) * (i / 5),
                        });
                    }
                }
            }

            const trueBoardingStop = (route as any).actualBoardingStopId || route.boardingStopId;
            const trueAlightingStop = (route as any).actualAlightingStopId || route.alightingStopId;

            if (route.type === 'direct') {
                const dir = route as DirectRouteResult;
                const seg = getShapeSegment({ shapeId: dir.shapeId, boardingStopId: trueBoardingStop, alightingStopId: trueAlightingStop, directionId: dir.directionId, routeId: dir.routeId });
                coords = coords.concat(seg.map((x: any) => ({ latitude: x[0], longitude: x[1] })));
            } else {
                const tr = route as TransferRouteResult;
                const seg1 = getShapeSegment({ shapeId: tr.firstShapeId, boardingStopId: trueBoardingStop, alightingStopId: tr.transferStopId, directionId: tr.firstDirectionId, routeId: tr.firstRouteId });
                const seg2 = getShapeSegment({ shapeId: tr.secondShapeId, boardingStopId: tr.transferStopId, alightingStopId: trueAlightingStop, directionId: tr.secondDirectionId, routeId: tr.secondRouteId });
                
                coords = coords.concat(seg1.map((x: any) => ({ latitude: x[0], longitude: x[1] })));
                
                // Aktarma yürüyüşünü simüle et
                if (coords.length > 0 && seg2.length > 0) {
                    const s1 = coords[coords.length - 1];
                    const s2 = { latitude: seg2[0][0], longitude: seg2[0][1] };
                    for (let i = 1; i <= 3; i++) {
                        coords.push({
                            latitude: s1.latitude + (s2.latitude - s1.latitude) * (i / 3),
                            longitude: s1.longitude + (s2.longitude - s1.longitude) * (i / 3),
                        });
                    }
                }
                
                coords = coords.concat(seg2.map((x: any) => ({ latitude: x[0], longitude: x[1] })));
            }

            if (coords.length === 0) {
                coords = currentSegmentStops.map(s => ({ latitude: s.latitude, longitude: s.longitude }));
            }

            // Varış yürüyüşü mock'u
            if (route.walkingFromAlightingMeters && route.walkingFromAlightingMeters > 0) {
                const finalStop = lookupStop(route.alightingStopId);
                if (finalStop && coords.length > 0) {
                    const startNode = coords[coords.length - 1];
                    for (let i = 1; i <= 5; i++) {
                        coords.push({
                            latitude: startNode.latitude + (finalStop.latitude - startNode.latitude) * (i / 5),
                            longitude: startNode.longitude + (finalStop.longitude - startNode.longitude) * (i / 5),
                        });
                    }
                }
            }

            locationProvider.current = new MockJourneyLocationProvider(
                coords,
                () => {
                    const state = activeJourneyRef.current?.currentState;
                    const remaining = activeJourneyRef.current?.progress?.remainingStopsCount;
                    
                    if (state === 'waiting_for_boarding') {
                        // Sadece durağa gerçekten çok yakınsak (örn: 20 metre) konumu dondur.
                        // Yoksa "Bindim" butonu çıksa bile kullanıcı durağa yürümeye devam edebilsin.
                        const dist = distanceToBoardingRef.current;
                        return dist !== null && dist <= 20;
                    }
                    
                    if (state === 'on_first_vehicle' || state === 'on_second_vehicle') {
                        // Eğer iniş durağına çok yaklaştıysak (<= 20m), kullanıcı "İndim" butonuna basana kadar mock'u beklet.
                        const distToAlighting = distanceToAlightingRef.current;
                        if (distToAlighting !== null && distToAlighting <= 20) {
                            return true;
                        }
                    }

                    return false;
                }
            );
        } else {
            locationProvider.current = new ExpoLocationProvider();
        }

        locationProvider.current.start(
            (loc) => {
                dispatch({ type: 'UPDATE_LOCATION', payload: loc });
            },
            (error) => {
                setProviderError(error.message);
            }
        );

        return () => {
            if (locationProvider.current) {
                locationProvider.current.stop();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Sadece ilk mount'ta çalışsın

    // ── completed/cancelled state'inde provider'ı durdur ──
    useEffect(() => {
        if (currentState === 'completed' || currentState === 'cancelled') {
            if (locationProvider.current) {
                locationProvider.current.stop();
            }
        }
    }, [currentState]);

    // ── Konum değiştiğinde ilerleme algoritmasını çalıştır ──
    useEffect(() => {
        if (!lastKnownLocation || !currentSegmentStops.length || !activeJourney || !progress) return;

        // Sadece otobüs içindeyken ilerleme hesapla
        const canCalculateProgress = ['on_first_vehicle', 'on_second_vehicle'].includes(currentState);
        if (!canCalculateProgress) return;

        const result = calculateProgress(
            lastKnownLocation, 
            currentSegmentStops, 
            progress.passedStopsCount,
            progress.candidateStopIndex,
            progress.consecutiveHits
        );
        
        if (result) {
            // Sadece gerçekten durak ilerlemesi olduysa VEYA consecutive state değiştiyse güncelle
            const hasNewStop = result.passedStopsCount !== progress.passedStopsCount;
            const hasNewConsecutive = result.consecutiveHits !== progress.consecutiveHits || result.candidateStopIndex !== progress.candidateStopIndex;

            if (hasNewStop || hasNewConsecutive) {
                dispatch({
                    type: 'UPDATE_PROGRESS',
                    payload: {
                        currentStopId: result.currentStopId,
                        nextStopId: result.nextStopId,
                        passedStopsCount: result.passedStopsCount,
                        remainingStopsCount: result.remainingStopsCount,
                        consecutiveHits: result.consecutiveHits,
                        candidateStopIndex: result.candidateStopIndex
                    }
                });
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastKnownLocation, currentSegmentStops, currentState]);

    // ── Gerçek otobüs durağı (biniş noktası) ──
    const busStopForBoarding = useMemo(() => {
        if (!route) return null;
        let stopId = '';
        if (route.type === 'direct') {
            stopId = (route as any).actualBoardingStopId || route.boardingStopId;
        } else {
            const t = route as TransferRouteResult;
            if (progress?.remainingTransfers === 0) {
                stopId = t.transferStopId; // İkinci ayak biniş durağı
            } else {
                stopId = (route as any).actualBoardingStopId || t.boardingStopId;
            }
        }
        return lookupStop(stopId);
    }, [route, progress?.remainingTransfers]);

    // ── Gerçek otobüs durağı (iniş / aktarma noktası) ──
    const busStopForAlighting = useMemo(() => {
        if (!route) return null;
        let stopId = '';
        if (route.type === 'direct') {
            stopId = (route as any).actualAlightingStopId || route.alightingStopId;
        } else {
            const t = route as TransferRouteResult;
            if (progress?.remainingTransfers === 0) {
                stopId = (route as any).actualAlightingStopId || t.alightingStopId; // İkinci ayak
            } else {
                stopId = t.transferStopId; // İlk ayak için iniş noktası aktarma durağıdır
            }
        }
        return lookupStop(stopId);
    }, [route, progress?.remainingTransfers]);

    // ── Nihai varış hedefi ──
    const finalDestinationStop = useMemo(() => {
        if (!route) return null;
        return lookupStop(route.alightingStopId);
    }, [route]);

    // ── Biniş durağına mesafe ──
    const [distanceToBoarding, setDistanceToBoarding] = useState<number | null>(null);
    const distanceToBoardingRef = useRef<number | null>(null);

    // ── İniş/Aktarma durağına mesafe ──
    const distanceToAlightingRef = useRef<number | null>(null);

    useEffect(() => {
        if (!lastKnownLocation) return;
        
        if (busStopForBoarding) {
            const distB = calculateDistanceMeters(
                lastKnownLocation.latitude, lastKnownLocation.longitude,
                busStopForBoarding.latitude, busStopForBoarding.longitude
            );
            setDistanceToBoarding(distB);
            distanceToBoardingRef.current = distB;

            // GPS'e dayalı state geçişleri — sadece YÜRÜYÜŞ durumlarında, 
            // kullanıcıyı otomatik otobüse bindirmez (Faz 14 Madde 5)
            if (currentState === 'preparing') {
                if (distB <= JourneyConstants.BOARDING_SUGGESTION_THRESHOLD_METERS) {
                    dispatch({ type: 'SET_STATE', payload: 'waiting_for_boarding' });
                } else {
                    dispatch({ type: 'SET_STATE', payload: 'walking_to_boarding' });
                }
            } else if (currentState === 'walking_to_boarding' || currentState === 'transferring') {
                if (distB <= JourneyConstants.BOARDING_SUGGESTION_THRESHOLD_METERS) {
                    dispatch({ type: 'SET_STATE', payload: 'waiting_for_boarding' });
                }
            }
        }

        if (busStopForAlighting) {
            const distA = calculateDistanceMeters(
                lastKnownLocation.latitude, lastKnownLocation.longitude,
                busStopForAlighting.latitude, busStopForAlighting.longitude
            );
            distanceToAlightingRef.current = distA;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastKnownLocation, busStopForBoarding, busStopForAlighting, currentState]);

    // ── İniş / Aktarma Uyarıları ──
    useEffect(() => {
        if (!progress || !activeJourney || !route) return;
        
        const rem = progress.remainingStopsCount;
        let alertKey: string | null = null;
        let alertMessage: string | null = null;

        if (currentState === 'on_first_vehicle') {
            if (route.type === 'transfer') {
                if (rem === JourneyConstants.STOPS_REMAINING_WARNING_2) {
                    alertKey = 'transfer_warning_2';
                    alertMessage = 'Aktarma durağına 2 durak kaldı. Lütfen hazırlanmaya başlayın.';
                } else if (rem === JourneyConstants.STOPS_REMAINING_WARNING_1) {
                    alertKey = 'transfer_warning_1';
                    alertMessage = 'İnmeye hazırlanın! Sıradaki durak aktarma noktanız.';
                }
            } else {
                if (rem === JourneyConstants.STOPS_REMAINING_WARNING_2) {
                    alertKey = 'dest_warning_2';
                    alertMessage = 'İniş durağına 2 durak kaldı.';
                } else if (rem === JourneyConstants.STOPS_REMAINING_WARNING_1) {
                    alertKey = 'dest_warning_1';
                    alertMessage = 'İnmeye hazırlanın! Sıradaki durak iniş noktanız.';
                }
            }
        } else if (currentState === 'on_second_vehicle') {
            if (rem === JourneyConstants.STOPS_REMAINING_WARNING_2) {
                alertKey = 'dest_warning_2_2nd';
                alertMessage = 'İniş durağına 2 durak kaldı.';
            } else if (rem === JourneyConstants.STOPS_REMAINING_WARNING_1) {
                alertKey = 'dest_warning_1_2nd';
                alertMessage = 'İnmeye hazırlanın! Sıradaki durak iniş noktanız.';
            }
        }

        if (alertKey && alertMessage && !progress.alertsTriggered?.includes(alertKey)) {
            Alert.alert("Yolculuk Bilgisi", alertMessage, [{ text: "Anladım" }]);
            dispatch({
                type: 'UPDATE_PROGRESS',
                payload: {
                    alertsTriggered: [...(progress.alertsTriggered || []), alertKey]
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progress?.remainingStopsCount, currentState]);

    // ── Hedefe Yürüme Kontrolü ──
    useEffect(() => {
        if (currentState === 'walking_to_destination' && lastKnownLocation && finalDestinationStop) {
            const dist = calculateDistanceMeters(
                lastKnownLocation.latitude, lastKnownLocation.longitude,
                finalDestinationStop.latitude, finalDestinationStop.longitude
            );
            
            if (dist <= 50) {
                dispatch({ type: 'SET_STATE', payload: 'completed' });
                Alert.alert("Tebrikler", "Varış noktasına ulaştınız. Yolculuğunuz tamamlandı!", [
                    { text: "Bitir", onPress: () => {
                        dispatch({ type: 'COMPLETE_JOURNEY' });
                        router.replace('/(tabs)');
                    }}
                ]);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentState, lastKnownLocation, finalDestinationStop]);

    // ── Aktif hat rengi ──
    const activeRouteColor = useMemo(() => {
        if (!route) return Colors.primary;
        if (route.type === 'direct') return '#000000';
        return (progress?.remainingTransfers === 0) ? '#2E7D32' : '#000000';
    }, [route, progress?.remainingTransfers]);

    // ── İniş Butonu Gösterim Mantığı ──
    const showAlightButton = (currentState === 'on_first_vehicle' || currentState === 'on_second_vehicle') 
        && progress && progress.remainingStopsCount <= 1;

    // ── Bindim butonu aktif mi? (GPS öneri) ──
    const canBoard = currentState === 'waiting_for_boarding' 
        || (currentState === 'transferring' && distanceToBoarding !== null && distanceToBoarding <= JourneyConstants.BOARDING_SUGGESTION_THRESHOLD_METERS);

    if (!activeJourney || !route) return null;

    // ── Handlers ──
    const handleBoarding = () => {
        if (route.type === 'transfer' && progress?.remainingTransfers === 0) {
            dispatch({ type: 'SET_STATE', payload: 'on_second_vehicle' });
        } else {
            dispatch({ type: 'SET_STATE', payload: 'on_first_vehicle' });
        }
    };

    const handleAlighting = () => {
        // Erken iniş doğrulaması
        if (progress && progress.remainingStopsCount > 1) {
            Alert.alert(
                "Erken İniş", 
                `İniş durağınıza henüz ulaşmadınız (Kalan: ${progress.remainingStopsCount} Durak).\n\nRotadan çıkmak ve yolculuğu iptal etmek istiyor musunuz?`, 
                [
                    { text: "Vazgeç", style: "cancel" },
                    { text: "Evet, İptal Et", style: "destructive", onPress: () => {
                        dispatch({ type: 'CANCEL_JOURNEY' });
                        router.replace('/(tabs)');
                    }}
                ]
            );
            return;
        }

        if (route.type === 'transfer' && currentState === 'on_first_vehicle') {
            dispatch({ type: 'SET_STATE', payload: 'transferring' });
            // Aktarma: 2. segment'e geçiş — sayaçları sıfırla ve yeni segment durak sayısını set et
            const tr = route as TransferRouteResult;
            dispatch({ 
                type: 'UPDATE_PROGRESS', 
                payload: { 
                    remainingTransfers: 0, 
                    passedStopsCount: 0, 
                    remainingStopsCount: tr.secondSegmentStopIds.length,
                    currentStopId: null, 
                    nextStopId: tr.secondSegmentStopIds[0] || null,
                    consecutiveHits: 0,
                    candidateStopIndex: -1,
                    alertsTriggered: [...(progress?.alertsTriggered || [])] // Mevcut alert'leri koru
                } 
            });
        } else {
            const hasWalk = route.walkingFromAlightingMeters && route.walkingFromAlightingMeters > 0;
            if (hasWalk) {
                dispatch({ type: 'SET_STATE', payload: 'walking_to_destination' });
            } else {
                dispatch({ type: 'SET_STATE', payload: 'completed' });
                Alert.alert("Tebrikler", "Varış noktasına ulaştınız. Yolculuğunuz tamamlandı!", [
                    { text: "Bitir", onPress: () => {
                        dispatch({ type: 'COMPLETE_JOURNEY' });
                        router.replace('/(tabs)');
                    }}
                ]);
            }
        }
    };

    const handleCancel = () => {
        Alert.alert("Yolculuğu İptal Et", "Aktif yolculuğunuzu sonlandırmak istiyor musunuz?", [
            { text: "Hayır", style: "cancel" },
            { text: "Evet, İptal Et", style: "destructive", onPress: () => {
                dispatch({ type: 'CANCEL_JOURNEY' });
                router.replace('/(tabs)');
            }}
        ]);
    };

    // ── UI Metinleri ──
    let statusText = "Yolculuk Başlıyor";
    let nextStopName = "Durak Bekleniyor";
    
    if (progress?.nextStopId) {
        const fullStop = lookupStop(progress.nextStopId);
        if (fullStop) nextStopName = fullStop.name;
    }

    if (currentState === 'preparing') statusText = "Konumunuz aranıyor...";
    if (currentState === 'walking_to_boarding') statusText = `Biniş durağına yürüyün (${distanceToBoarding ? Math.round(distanceToBoarding) + 'm' : '?'})`;
    if (currentState === 'waiting_for_boarding') statusText = "Otobüs bekleniyor — Bindiyseniz dokunun";
    if (currentState === 'on_first_vehicle') statusText = "Otobüstesiniz";
    if (currentState === 'transferring') statusText = `İkinci biniş durağına yürüyün (${distanceToBoarding ? Math.round(distanceToBoarding) + 'm' : '?'})`;
    if (currentState === 'on_second_vehicle') statusText = "İkinci otobüstesiniz";
    if (currentState === 'walking_to_destination') statusText = "Varış noktasına yürüyün";
    if (currentState === 'completed') statusText = "Yolculuk tamamlandı";

    const isLowAccuracy = lastKnownLocation && lastKnownLocation.accuracy > JourneyConstants.MIN_REQUIRED_ACCURACY_METERS;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Aktif Yolculuk</Text>
                    <Text style={styles.headerSubtitle}>{statusText}</Text>
                </View>
                <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
            </View>

            {isLowAccuracy && (
                <View style={styles.warningBanner}>
                    <Ionicons name="warning" size={20} color={Colors.warning} />
                    <Text style={styles.warningBannerText}>GPS Sinyali Zayıf (Sapma: {Math.round(lastKnownLocation.accuracy)}m). Lütfen açık alana geçin.</Text>
                </View>
            )}
            
            {providerError && (
                <View style={[styles.warningBanner, { backgroundColor: Colors.errorSoft }]}>
                    <Ionicons name="alert-circle" size={20} color={Colors.error} />
                    <Text style={[styles.warningBannerText, { color: Colors.error }]}>{providerError}</Text>
                </View>
            )}

            <View style={styles.mapContainer}>
                <MapView 
                    ref={mapRef}
                    style={StyleSheet.absoluteFillObject}
                    showsUserLocation={false} 
                    onMapReady={() => setMapReady(true)}
                    initialRegion={lastKnownLocation ? {
                        latitude: lastKnownLocation.latitude,
                        longitude: lastKnownLocation.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    } : undefined}
                >
                    {/* Başlangıç yürüyüş çizgisi */}
                    {walkingPolylines.toBoarding.length > 0 && (
                        <Polyline 
                            coordinates={walkingPolylines.toBoarding}
                            strokeColor="#FF6B35"
                            strokeWidth={3}
                        />
                    )}

                    {/* Otobüs rota çizgisi */}
                    {shapePoints.length > 0 && (
                        <Polyline 
                            coordinates={shapePoints}
                            strokeColor={activeRouteColor}
                            strokeWidth={4}
                        />
                    )}

                    {/* Varış yürüyüş çizgisi */}
                    {walkingPolylines.fromAlighting.length > 0 && (
                        <Polyline 
                            coordinates={walkingPolylines.fromAlighting}
                            strokeColor="#FF6B35"
                            strokeWidth={3}
                        />
                    )}

                    {/* Biniş Durağı */}
                    {busStopForBoarding && (
                        <Marker coordinate={{ latitude: busStopForBoarding.latitude, longitude: busStopForBoarding.longitude }} tracksViewChanges={false}>
                            <View style={[styles.stopPin, { backgroundColor: Colors.success }]}>
                                <MaterialCommunityIcons name="bus-stop" size={16} color="white" />
                            </View>
                        </Marker>
                    )}

                    {/* Segment Durakları */}
                    {currentSegmentStops.map((stop, index) => {
                        const isDestination = index === currentSegmentStops.length - 1;
                        if (index === 0) return null;
                        
                        return (
                            <Marker 
                                key={stop.id}
                                coordinate={{ latitude: stop.latitude, longitude: stop.longitude }} 
                                tracksViewChanges={false}
                            >
                                <View style={[styles.stopPin, { 
                                    backgroundColor: isDestination ? Colors.error : Colors.primary, 
                                    width: isDestination ? 28 : 20, 
                                    height: isDestination ? 28 : 20, 
                                    borderRadius: isDestination ? 14 : 10 
                                }]}>
                                    <MaterialCommunityIcons name={isDestination ? "flag-variant" : "bus-stop"} size={isDestination ? 16 : 12} color="white" />
                                </View>
                            </Marker>
                        );
                    })}

                    {/* Kullanıcı Konumu */}
                    {lastKnownLocation && (
                        <Marker coordinate={lastKnownLocation} anchor={{ x: 0.5, y: 0.5 }} flat>
                            <View style={styles.userDot}>
                                <View style={styles.userDotInner} />
                            </View>
                        </Marker>
                    )}
                </MapView>
            </View>

            <View style={styles.bottomPanel}>
                <View style={styles.progressInfo}>
                    <Text style={styles.nextStopLabel}>Sıradaki Durak:</Text>
                    <Text style={styles.nextStopName} numberOfLines={1}>{nextStopName}</Text>
                    <Text style={styles.remainingStops}>Kalan: {progress?.remainingStopsCount ?? '?'} Durak</Text>
                </View>

                <View style={styles.actions}>
                    {/* Bindim Butonu — sadece durağa yakınken aktif */}
                    {(currentState === 'preparing' || currentState === 'walking_to_boarding' || currentState === 'waiting_for_boarding' || currentState === 'transferring') ? (
                        <TouchableOpacity 
                            style={[
                                styles.actionBtn, 
                                !canBoard && { backgroundColor: Colors.gray400 }
                            ]} 
                            onPress={handleBoarding}
                            disabled={!canBoard}
                        >
                            <MaterialCommunityIcons name="bus" size={24} color={Colors.white} />
                            <Text style={styles.actionBtnText}>
                                {canBoard ? 'Otobüse Bindim' : 'Durağa Yaklaşın'}
                            </Text>
                        </TouchableOpacity>
                    ) : showAlightButton ? (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: Colors.warning }]} 
                            onPress={handleAlighting}
                        >
                            <MaterialCommunityIcons 
                                name={progress?.remainingStopsCount === 0 ? "check-circle" : "exit-run"} 
                                size={24} color={Colors.white} 
                            />
                            <Text style={styles.actionBtnText}>
                                {progress?.remainingStopsCount === 0 
                                    ? (route.type === 'transfer' && currentState === 'on_first_vehicle' ? "Aktarma Noktası - İndim" : "Hedefe Ulaştın - Bitir")
                                    : "İndim"}
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.gray300, backgroundColor: Colors.white },
    headerTitleContainer: { flex: 1 },
    headerTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.textPrimary },
    headerSubtitle: { fontSize: FontSizes.sm, color: Colors.primary, marginTop: 2, fontWeight: FontWeights.medium },
    cancelBtn: { padding: Spacing.sm },
    cancelBtnText: { color: Colors.error, fontWeight: FontWeights.semibold },
    warningBanner: { flexDirection: 'row', padding: Spacing.sm, backgroundColor: Colors.warningSoft, alignItems: 'center' },
    warningBannerText: { flex: 1, marginLeft: Spacing.sm, fontSize: FontSizes.sm, color: Colors.textSecondary },
    mapContainer: { flex: 1, backgroundColor: Colors.gray300 },
    userDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0, 122, 255, 0.3)', justifyContent: 'center', alignItems: 'center' },
    userDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#007AFF', borderWidth: 2, borderColor: 'white' },
    stopPin: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
    bottomPanel: { backgroundColor: Colors.white, padding: Spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 15 },
    progressInfo: { marginBottom: Spacing.md },
    nextStopLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: 4 },
    nextStopName: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.textPrimary, marginBottom: 4 },
    remainingStops: { fontSize: FontSizes.md, color: Colors.primary, fontWeight: FontWeights.semibold },
    actions: { flexDirection: 'row', justifyContent: 'center' },
    actionBtn: { flex: 1, backgroundColor: Colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: BorderRadius.md },
    actionBtnText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginLeft: Spacing.sm }
});
