import ScreenHeader from '@/components/common/ScreenHeader';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { getApproachingBuses, getStopById } from '@/services/transportApi';
import { ApiResponseState, ApproachingBus, BusStop } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';

export default function StopDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { isFavoriteStop, addFavoriteStop, removeFavoriteStop } = useFavorites();
    const [stop, setStop] = useState<BusStop | null>(null);
    const [isLoadingStop, setIsLoadingStop] = useState(true);

    const [apiState, setApiState] = useState<ApiResponseState<ApproachingBus[]>>({
        isLoading: false,
        isSuccess: false,
        isEmpty: false,
        errorMessage: null,
        data: []
    });

    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [refreshCountdown, setRefreshCountdown] = useState(0);
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);
    const isFetchingRef = useRef(false);
    const mapRef = useRef<MapView>(null);

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

    useEffect(() => {
        if (!id) return;
        getStopById(id).then(found => {
            setStop(found || null);
            setIsLoadingStop(false);
        });
    }, [id]);

    const fetchBuses = (isAutoRefresh = false) => {
        if (!id || isFetchingRef.current || (!isAutoRefresh && refreshCountdown > 0)) return;
        isFetchingRef.current = true;

        if (!isAutoRefresh) {
            setRefreshCountdown(15);
        }

        setApiState(prev => ({ isLoading: true, isSuccess: false, isEmpty: false, errorMessage: null, data: prev.data }));

        getApproachingBuses(id)
            .then(buses => {
                // Kalan durak sayısına göre küçükten büyüğe sırala (null ise 999 vererek en sona at)
                const sortedBuses = [...buses].sort((a, b) => {
                    const countA = a.remainingStopCount !== null && a.remainingStopCount !== undefined ? a.remainingStopCount : 999;
                    const countB = b.remainingStopCount !== null && b.remainingStopCount !== undefined ? b.remainingStopCount : 999;
                    return countA - countB;
                });

                setApiState({
                    isLoading: false,
                    isSuccess: true,
                    isEmpty: sortedBuses.length === 0,
                    errorMessage: null,
                    data: sortedBuses
                });
                setLastUpdated(new Date());
            })
            .catch((err: any) => {
                const isRateLimit = err?.message?.includes('429');
                setApiState({
                    isLoading: false,
                    isSuccess: false,
                    isEmpty: false,
                    errorMessage: isRateLimit
                        ? 'Güvenlik Sistemi: Çok fazla istek atıldı. Lütfen 30 saniye bekleyip tekrar deneyin.'
                        : 'Yaklaşan otobüs bilgisi alınamadı. Lütfen tekrar deneyin.',
                    data: []
                });
            })
            .finally(() => {
                isFetchingRef.current = false;
            });
    };

    useEffect(() => {
        if (stop) {
            fetchBuses(true); // Ekrana girildiğinde ilk çağrıyı oto yenileme say
            const interval = setInterval(() => {
                fetchBuses(true);
            }, 60000); // 60 Saniyede bir arka planda yenile (Cooldown'ı tetiklemez)
            return () => clearInterval(interval);
        }
    }, [stop]);

    // Kullanıcının isteği üzerine otomatik odaklama (fitToCoordinates) kaldırıldı.

    if (isLoadingStop) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Yükleniyor..." showBackButton={true} />
                <View style={styles.centerParams}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </View>
        );
    }

    if (!stop) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Durak Bilgisi" showBackButton={true} />
                <View style={styles.centerParams}>
                    <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
                    <Text style={styles.emptyText}>Durak bulunamadı</Text>
                </View>
            </View>
        );
    }

    const isFavorite = isFavoriteStop(stop.id);

    const toggleFavorite = () => {
        if (isFavorite) removeFavoriteStop(stop.id);
        else addFavoriteStop(stop);
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                title={stop.name}
                subtitle={`ID: ${stop.id}`}
                showBackButton={true}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={isScrollEnabled}
            >
                {/* Meta Bilgiler ve Favoriye Ekleme */}
                <View style={styles.metadataCard}>
                    <View style={styles.metaRow}>
                        <View style={styles.metaInfo}>
                            <Text style={styles.metaLabel}>Enlem</Text>
                            <Text style={styles.metaValue}>{stop.latitude !== 0 ? stop.latitude.toFixed(5) : 'Geçersiz'}</Text>
                        </View>
                        <View style={styles.metaInfo}>
                            <Text style={styles.metaLabel}>Boylam</Text>
                            <Text style={styles.metaValue}>{stop.longitude !== 0 ? stop.longitude.toFixed(5) : 'Geçersiz'}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.favoriteButton}
                            onPress={toggleFavorite}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isFavorite ? 'star' : 'star-outline'}
                                size={28}
                                color={isFavorite ? Colors.accent : Colors.gray400}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Durak ve Yaklaşan Otobüsler Haritası */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Harita Görünümü</Text>
                    <View
                        style={styles.mapContainer}
                        onTouchStart={() => setIsScrollEnabled(false)}
                        onTouchEnd={() => setIsScrollEnabled(true)}
                        onTouchCancel={() => setIsScrollEnabled(true)}
                    >
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            showsCompass={true}
                            showsUserLocation={true}
                            showsMyLocationButton={true}
                            initialRegion={{
                                latitude: stop.latitude !== 0 ? stop.latitude : 38.4237,
                                longitude: stop.longitude !== 0 ? stop.longitude : 27.1428,
                                latitudeDelta: 0.015,
                                longitudeDelta: 0.015,
                            }}
                        >
                            {/* Durağın Kendi Konumu */}
                            {stop.latitude !== 0 && (
                                <Marker
                                    key={`stop-marker-main-${stop.id}`}
                                    coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                                    zIndex={999}
                                    onPress={() => {
                                        mapRef.current?.animateToRegion({
                                            latitude: stop.latitude,
                                            longitude: stop.longitude,
                                            latitudeDelta: 0.005,
                                            longitudeDelta: 0.005
                                        }, 400);
                                    }}
                                >
                                    <View style={[styles.busMarker, { backgroundColor: Colors.accent }]}>
                                        <Ionicons name="location" size={16} color={Colors.white} />
                                    </View>
                                    <Callout tooltip>
                                        <View style={styles.calloutContainer}>
                                            <Text style={styles.calloutTitle}>{stop.name}</Text>
                                            <Text style={styles.calloutSubtitle}>Durak Konumu</Text>
                                        </View>
                                    </Callout>
                                </Marker>
                            )}

                            {/* Yaklaşan Otobüsler (Koordinatı Olanlar) */}
                            {apiState.data?.map((bus, idx) => {
                                if (!bus.latitude || !bus.longitude) return null;

                                // Araçlar terminalde veya aynı yerde bekleme yapıyorsa üst üste binmesin diye hafif offset
                                const offsetLat = (idx % 3 === 0 ? 0.00005 : (idx % 3 === 1 ? -0.00005 : 0)) * idx;
                                const offsetLon = (idx % 2 === 0 ? 0.00005 : -0.00005) * idx;
                                const finalLat = bus.latitude + offsetLat;
                                const finalLon = bus.longitude + offsetLon;

                                return (
                                    <Marker
                                        key={`bus-marker-${bus.busId}-${idx}`}
                                        coordinate={{ latitude: finalLat, longitude: finalLon }}
                                        onPress={() => {
                                            mapRef.current?.animateToRegion({
                                                latitude: finalLat,
                                                longitude: finalLon,
                                                latitudeDelta: 0.005,
                                                longitudeDelta: 0.005
                                            }, 400);
                                        }}
                                    >
                                        <View style={styles.busMarker}>
                                            <Ionicons name="bus" size={14} color={Colors.white} />
                                        </View>
                                        <Callout tooltip>
                                            <View style={styles.calloutContainer}>
                                                <Text style={styles.calloutTitle} numberOfLines={1}>Hat {bus.routeNumber}</Text>
                                                <Text style={styles.calloutSubtitle} numberOfLines={1}>Araç No: {bus.busId}</Text>
                                                {bus.remainingStopCount !== null && (
                                                    <Text style={styles.calloutSubtitle} numberOfLines={1}>Kalan: {bus.remainingStopCount}</Text>
                                                )}
                                            </View>
                                        </Callout>
                                    </Marker>
                                );
                            })}
                        </MapView>
                    </View>
                </View>

                {/* Geçen Hatlar */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Geçen Hatlar ({stop.routes.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routesScroll}>
                        {stop.routes.length > 0 ? stop.routes.map((route) => (
                            <TouchableOpacity
                                key={route}
                                style={styles.routeChip}
                                onPress={() => router.push(`/route/${route}`)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.routeChipText}>{route}</Text>
                            </TouchableOpacity>
                        )) : (
                            <Text style={styles.metaLabel}>Hat bilgisi bulunmuyor</Text>
                        )}
                    </ScrollView>
                </View>

                {/* Yaklaşan Otobüsler */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Yaklaşan Otobüsler</Text>
                        <TouchableOpacity
                            onPress={() => fetchBuses(false)}
                            disabled={apiState.isLoading || refreshCountdown > 0}
                            style={[
                                styles.refreshButton,
                                (apiState.isLoading || refreshCountdown > 0) && { opacity: 0.6 }
                            ]}
                        >
                            <Ionicons
                                name="refresh"
                                size={18}
                                color={(apiState.isLoading || refreshCountdown > 0) ? Colors.gray400 : Colors.primary}
                            />
                            <Text style={[
                                styles.refreshText,
                                (apiState.isLoading || refreshCountdown > 0) && { color: Colors.gray400 }
                            ]}>
                                {apiState.isLoading
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

                    {apiState.isLoading ? (
                        <View style={styles.emptyState}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                            <Text style={styles.emptyText}>Yaklaşan otobüsler yükleniyor.</Text>
                        </View>
                    ) : apiState.errorMessage ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="alert-circle-outline" size={36} color={Colors.error} />
                            <Text style={[styles.emptyText, { color: Colors.error }]}>{apiState.errorMessage}</Text>
                            <TouchableOpacity onPress={() => fetchBuses(false)} style={[styles.refreshButton, { marginTop: Spacing.sm, backgroundColor: Colors.error + '20' }]}>
                                <Ionicons name="refresh" size={16} color={Colors.error} />
                                <Text style={[styles.refreshText, { color: Colors.error }]}>Yeniden Dene</Text>
                            </TouchableOpacity>
                        </View>
                    ) : apiState.isEmpty ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="time-outline" size={36} color={Colors.gray400} />
                            <Text style={styles.emptyText}>Bu durağa yaklaşan otobüs bulunamadı.</Text>
                        </View>
                    ) : (
                        <View style={styles.busList}>
                            {apiState.data?.map((bus, index) => (
                                <TouchableOpacity
                                    key={`${bus.busId}-${index}`}
                                    style={styles.newBusCard}
                                    onPress={() => router.push(`/route/${bus.routeNumber}`)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.newBusTitle}>{bus.routeNumber} - {bus.routeName}</Text>
                                    <Text style={styles.newBusDetail}>
                                        {bus.remainingStopCount !== null && bus.remainingStopCount !== undefined
                                            ? `Kalan durak: ${bus.remainingStopCount}`
                                            : 'Kalan durak bilgisi yok'}
                                    </Text>
                                    <Text style={styles.newBusDetail}>Yön: {bus.direction}</Text>
                                    <Text style={styles.newBusDetail}>Engelli erişimi: {bus.isAccessible ? 'Var' : 'Yok'}</Text>
                                    <Text style={styles.newBusDetail}>Bisiklet aparatı: {bus.hasBicycleRack ? 'Var' : 'Yok'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxxl,
    },
    centerParams: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
    },
    metadataCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metaInfo: {
        flex: 1,
    },
    metaLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    metaValue: {
        fontSize: FontSizes.base,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
    },
    favoriteButton: {
        padding: Spacing.xs,
        backgroundColor: Colors.primarySoft,
        borderRadius: BorderRadius.md,
    },
    sectionContainer: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: FontSizes.base,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    routesScroll: {
        flexDirection: 'row',
        paddingVertical: Spacing.xs,
    },
    routeChip: {
        backgroundColor: Colors.primarySoft,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        marginRight: Spacing.xs,
    },
    routeChipText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: Spacing.xs,
        backgroundColor: Colors.primarySoft,
        borderRadius: BorderRadius.md,
    },
    refreshText: {
        fontSize: FontSizes.sm,
        color: Colors.primary,
        fontWeight: FontWeights.bold,
    },
    lastUpdateText: {
        fontSize: FontSizes.xs,
        color: Colors.textDisabled,
        marginBottom: Spacing.sm,
        textAlign: 'right',
    },
    busList: {
        flex: 1,
        gap: Spacing.sm,
    },
    newBusCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    newBusTitle: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    newBusDetail: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    emptyState: {
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingVertical: Spacing.xxl,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        gap: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    mapContainer: {
        height: 250,
        width: '100%',
        marginVertical: Spacing.sm,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Colors.gray200,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    busMarker: {
        backgroundColor: Colors.primary,
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
    },
    calloutContainer: {
        minWidth: 140,
        backgroundColor: Colors.white,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calloutTitle: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: 2,
        textAlign: 'center',
        width: '100%',
    },
    calloutSubtitle: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        textAlign: 'center',
        width: '100%',
    },
});
