import FocusStatusBar from '@/components/common/FocusStatusBar';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useStops } from '@/context/StopsContext';
import { getRouteVehicles } from '@/services/transportApi';
import { ApiResponseState, ApproachingBus } from '@/types';
import { getStopsForRoute } from '@/utils/routeData';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RouteDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>(); // Tıklanan Hat Numarası
    const insets = useSafeAreaInsets();
    const { stops: allStops } = useStops();

    // Mock sistemi kaldırıldığı için dinamik olarak bu hattan geçen durakları bul
    const routeStops = useMemo(() => getStopsForRoute(id, allStops), [id, allStops]);

    // Canlı Araçlar State Yönetimi
    const [vehiclesState, setVehiclesState] = useState<ApiResponseState<ApproachingBus[]>>({
        isLoading: true,
        isSuccess: false,
        isEmpty: false,
        errorMessage: null,
        data: []
    });

    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [refreshCountdown, setRefreshCountdown] = useState(0);
    const isFetchingRef = useRef(false);
    const mapRef = useRef<MapView>(null); // Harita kontrolü için Referans

    // 15 Saniyelik Geri Sayım (Cooldown) Efekti
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (refreshCountdown > 0) {
            timer = setTimeout(() => {
                setRefreshCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearTimeout(timer);
    }, [refreshCountdown]);

    const fetchVehicles = useCallback(async (isAutoRefresh = false) => {
        // Zaten çekiyorsa veya kullanıcı manuel basıp cooldowndaysa iptal et
        if (isFetchingRef.current || (!isAutoRefresh && refreshCountdown > 0)) return;
        isFetchingRef.current = true;

        if (!isAutoRefresh) {
            setRefreshCountdown(15); // Kullanıcı kendi bastıysa 15 sn ceza kes
        }

        setVehiclesState(prev => ({ ...prev, isLoading: true, errorMessage: null }));
        try {
            const data = await getRouteVehicles(id);
            setVehiclesState({
                isLoading: false,
                isSuccess: true,
                isEmpty: data.length === 0,
                errorMessage: null,
                data
            });
            setLastUpdated(new Date());
        } catch (error: any) {
            const isRateLimit = error?.message?.includes('429');
            setVehiclesState({
                isLoading: false,
                isSuccess: false,
                isEmpty: false,
                errorMessage: isRateLimit
                    ? 'Güvenlik Sistemi: Çok fazla istek atıldı. Lütfen 30 saniye bekleyip tekrar deneyin.'
                    : 'Araç konumları alınamadı. Lütfen tekrar deneyin.',
                data: []
            });
        } finally {
            isFetchingRef.current = false;
        }
    }, [id]);

    // Araç listesindeki karta tıklanınca o otobüse (haritada) yakınlaşma
    const handleVehiclePress = useCallback((bus: ApproachingBus) => {
        if (!bus.latitude || !bus.longitude) return;

        mapRef.current?.animateToRegion({
            latitude: bus.latitude as number,
            longitude: bus.longitude as number,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
        }, 800); // 800ms yumuşak geçiş
    }, []);

    // Ekrana ilk girişte ve 60 saniyede bir araçları güncelle
    useEffect(() => {
        fetchVehicles(true); // Auto-refresh sayılır
        const interval = setInterval(() => fetchVehicles(true), 60000); // UI Perfonmansı için süre 60 saniyeye çıkarıldı
        return () => clearInterval(interval);
    }, [fetchVehicles]);

    // Eğer bu numaradan geçen hiçbir durak yoksa (veya geçersiz input ise) Hata Ekranı
    if (routeStops.length === 0) {
        return (
            <View style={[styles.container, styles.centered]}>
                <FocusStatusBar style="dark" />
                <Ionicons name="warning-outline" size={48} color={Colors.error} />
                <Text style={styles.errorText}>Hat bulunamadı veya durak bilgisi yok</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleToggleFavorite = () => {
        Alert.alert("Yakında", "Hat favorileme sistemi gerçek sunucuya geçişte aktif edilecektir.");
    };

    return (
        <View style={styles.container}>
            <FocusStatusBar style="light" />

            {/* HEADER */}
            <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerRouteNumber}>{id}</Text>
                </View>

                <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconButton}>
                    <Ionicons name="star-outline" size={24} color={Colors.white} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* HAT BİLGİSİ */}
                <View style={styles.infoCard}>
                    <Text style={styles.routeTitle}>Hat {id}</Text>
                    <View style={styles.timeRow}>
                        <Ionicons name="bus-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.timeText}>Toplam {routeStops.length} duraktan geçiyor</Text>
                    </View>
                </View>

                {/* AKTİF ARAÇLAR */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Aktif Araçlar</Text>
                        <TouchableOpacity
                            onPress={() => fetchVehicles(false)}
                            disabled={vehiclesState.isLoading || refreshCountdown > 0}
                            style={[
                                styles.refreshButton,
                                (vehiclesState.isLoading || refreshCountdown > 0) && { opacity: 0.6 }
                            ]}
                        >
                            <Ionicons
                                name="refresh"
                                size={18}
                                color={(vehiclesState.isLoading || refreshCountdown > 0) ? Colors.gray400 : Colors.primary}
                            />
                            <Text style={[
                                styles.refreshText,
                                (vehiclesState.isLoading || refreshCountdown > 0) && { color: Colors.gray400 }
                            ]}>
                                {vehiclesState.isLoading
                                    ? 'Yükleniyor...'
                                    : refreshCountdown > 0
                                        ? `Yenile (${refreshCountdown}s)`
                                        : 'Yenile'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {lastUpdated && (
                        <Text style={styles.lastUpdateText}>
                            Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </Text>
                    )}

                    {vehiclesState.isLoading && !vehiclesState.data?.length ? (
                        <View style={styles.stateCard}>
                            <Ionicons name="bus-outline" size={32} color={Colors.gray400} />
                            <Text style={styles.stateText}>Araç konumları aranıyor...</Text>
                        </View>
                    ) : vehiclesState.errorMessage ? (
                        <View style={[styles.stateCard, { borderColor: Colors.error }]}>
                            <Ionicons name="warning-outline" size={32} color={Colors.error} />
                            <Text style={[styles.stateText, { color: Colors.error }]}>{vehiclesState.errorMessage}</Text>
                        </View>
                    ) : vehiclesState.isEmpty ? (
                        <View style={styles.stateCard}>
                            <Ionicons name="moon-outline" size={32} color={Colors.gray400} />
                            <Text style={styles.stateText}>Şu an hatta aktif araç bulunmuyor.</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.mapContainer}>
                                <MapView
                                    ref={mapRef}
                                    style={styles.map}
                                    initialRegion={{
                                        latitude: vehiclesState.data?.[0]?.latitude || 38.4237,
                                        longitude: vehiclesState.data?.[0]?.longitude || 27.1428,
                                        latitudeDelta: 0.05,
                                        longitudeDelta: 0.05,
                                    }}
                                >
                                    {vehiclesState.data?.map((bus, idx) => (
                                        <Marker
                                            key={`bus-${bus.busId}-${idx}`}
                                            coordinate={{ latitude: bus.latitude as number, longitude: bus.longitude as number }}
                                        >
                                            <View style={styles.busMarker}>
                                                <Ionicons name="bus" size={16} color={Colors.white} />
                                            </View>
                                            <Callout tooltip>
                                                <View style={styles.calloutContainer}>
                                                    <Text style={styles.calloutTitle}>Araç No: {bus.busId}</Text>
                                                    {bus.direction && <Text style={styles.calloutSubtitle}>Yön: {bus.direction}</Text>}
                                                </View>
                                            </Callout>
                                        </Marker>
                                    ))}
                                </MapView>
                            </View>

                            {/* AKTİF ARAÇLARIN LİSTE (KART) GÖRÜNÜMÜ - Yatay Scroll UI/UX */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.vehiclesListHorizontal}
                            >
                                {vehiclesState.data?.map((bus, idx) => (
                                    <TouchableOpacity
                                        key={`bus-card-${bus.busId}-${idx}`}
                                        style={styles.vehicleCardHorizontal}
                                        onPress={() => handleVehiclePress(bus)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.vehicleIconBox}>
                                            <Ionicons name="bus" size={16} color={Colors.white} />
                                        </View>
                                        <View style={styles.vehicleInfo}>
                                            <Text style={styles.vehicleId}>Araç No: {bus.busId}</Text>
                                            <Text style={styles.vehicleLocation} numberOfLines={1}>
                                                {bus.direction ? `Yön: ${bus.direction}` : `GPS: ${bus.latitude?.toFixed(2)}, ${bus.longitude?.toFixed(2)}`}
                                            </Text>
                                        </View>
                                        <View style={styles.liveBadgeSmall}>
                                            <View style={styles.liveDot} />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )}
                </View>

                {/* GÜZERGAH */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Hat Güzergahı</Text>

                    <View style={styles.timeline}>
                        {routeStops.map((stop, index) => {
                            const isFirst = index === 0;
                            const isLast = index === routeStops.length - 1;

                            return (
                                <TouchableOpacity
                                    key={`route-stop-${stop.id}-${index}`}
                                    style={styles.timelineItem}
                                    onPress={() => router.push(`/stop/${stop.id}`)}
                                >
                                    <View style={styles.timelineGraphic}>
                                        {!isFirst && <View style={styles.timelineLineTop} />}
                                        <View style={[styles.timelineDot, (isFirst || isLast) && styles.timelineDotActive]} />
                                        {!isLast && <View style={styles.timelineLineBottom} />}
                                    </View>

                                    <View style={styles.timelineContent}>
                                        <Text style={styles.stopName}>{stop.name}</Text>
                                        <Text style={styles.stopDistrict}>ID: {stop.id}</Text>
                                    </View>

                                    <View style={styles.chevronBox}>
                                        <Ionicons name="chevron-forward" size={16} color={Colors.gray200} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
        gap: Spacing.md,
    },
    errorText: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
    },
    backButton: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
    },
    backButtonText: {
        color: Colors.white,
        fontWeight: FontWeights.bold,
    },
    header: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerRouteNumber: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.extrabold,
        color: Colors.white,
    },
    scrollView: {
        flex: 1,
    },
    infoCard: {
        backgroundColor: Colors.white,
        margin: Spacing.base,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.md,
    },
    routeTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.xs,
    },
    timeText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    sectionContainer: {
        paddingHorizontal: Spacing.base,
        paddingBottom: Spacing.xxxl,
    },
    sectionTitle: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
    },
    // ---- YENİ EKLENEN AKTİF ARAÇLAR STİLLERİ ----
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        backgroundColor: Colors.primarySoft,
        borderRadius: BorderRadius.full,
        gap: 4,
    },
    refreshText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
    },
    lastUpdateText: {
        fontSize: FontSizes.xs,
        color: Colors.textDisabled,
        marginBottom: Spacing.sm,
        textAlign: 'right',
    },
    stateCard: {
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.base,
    },
    stateText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    mapContainer: {
        height: 300,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.gray200,
        marginBottom: Spacing.base,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    busMarker: {
        backgroundColor: Colors.primary,
        padding: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Colors.white,
        ...Shadows.sm,
    },
    calloutContainer: {
        backgroundColor: Colors.white,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.md,
        minWidth: 120,
        alignItems: 'center',
    },
    calloutTitle: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    calloutSubtitle: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    vehiclesListHorizontal: {
        gap: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    vehicleCardHorizontal: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
        width: 160,
    },
    vehicleIconBox: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    vehicleInfo: {
        flex: 1,
    },
    vehicleId: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
    },
    vehicleLocation: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    liveBadgeSmall: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Spacing.xs,
    },
    liveDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#EF4444',
    },
    // ---- TİMELİNE STİLLERİ ----
    timeline: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
    },
    timelineItem: {
        flexDirection: 'row',
        minHeight: 56,
        alignItems: 'center',
    },
    timelineGraphic: {
        width: 24,
        alignItems: 'center',
        marginRight: Spacing.md,
        height: '100%',
    },
    timelineLineTop: {
        position: 'absolute',
        top: 0,
        bottom: '50%',
        width: 2,
        backgroundColor: Colors.gray300,
    },
    timelineLineBottom: {
        position: 'absolute',
        top: '50%',
        bottom: 0,
        width: 2,
        backgroundColor: Colors.gray300,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.gray400,
        position: 'absolute',
        top: '50%',
        marginTop: -5,
        zIndex: 1,
    },
    timelineDotActive: {
        backgroundColor: Colors.primary,
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: -6,
    },
    timelineContent: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
        justifyContent: 'center',
    },
    stopName: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    stopDistrict: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    chevronBox: {
        paddingLeft: Spacing.sm,
        justifyContent: 'center',
    }
});
