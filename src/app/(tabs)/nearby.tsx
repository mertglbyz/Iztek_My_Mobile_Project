import ScreenHeader from '@/components/common/ScreenHeader';
import StopCard from '@/components/stops/StopCard';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { useStops } from '@/context/StopsContext';
import { useLocation } from '@/hooks/useLocation';
import { BusStopWithDistance } from '@/types';
import { getSortedStopsByDistance } from '@/utils/distance';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';

const MAX_NEARBY_STOPS = 15;

export default function NearbyScreen() {
    const { location, isLoading, error, permissionStatus, requestPermission } = useLocation();
    const { addFavoriteStop, removeFavoriteStop, isFavoriteStop } = useFavorites();
    const { stops: allStops, isLoadingStops } = useStops();
    const mapRef = useRef<MapView>(null);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Konum bazlı mesafe hesaplaması
    const nearbyStops = useMemo(() => {
        if (!location || isLoadingStops) return [];
        return getSortedStopsByDistance(allStops, location).slice(0, MAX_NEARBY_STOPS);
    }, [location, allStops, isLoadingStops]);

    // Rate Limit & Anti-Spam Cooldown Mekanizması
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (cooldown > 0) {
            timer = setTimeout(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearTimeout(timer); // Unmount durumunda timer temizlenir (Memory Leak önleyici)
    }, [cooldown]);

    const handleRefresh = useCallback(async () => {
        if (cooldown > 0) return;
        setIsRefreshing(true);
        await requestPermission(true); // Haritayı unmount etmeden sadece veriyi yenile
        setIsRefreshing(false);
        setCooldown(15); // 15 Saniyelik bekleme süresi eklendi
    }, [requestPermission, cooldown]);

    const handleToggleFavorite = useCallback(
        (stop: BusStopWithDistance) => {
            if (isFavoriteStop(stop.id)) {
                removeFavoriteStop(stop.id);
            } else {
                addFavoriteStop(stop);
            }
        },
        [isFavoriteStop, addFavoriteStop, removeFavoriteStop]
    );

    // Konum izni henüz verilmediyse
    if (permissionStatus === 'undetermined' || permissionStatus === 'denied') {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Yakındaki Duraklar" subtitle="Konumunuza en yakın duraklar" />
                <View style={styles.permissionContainer}>
                    <View style={styles.permissionIconContainer}>
                        <Ionicons name="location-outline" size={48} color={Colors.primary} />
                    </View>
                    <Text style={styles.permissionTitle}>Konum İzni Gerekli</Text>
                    <Text style={styles.permissionText}>
                        Yakınızdaki durakları gösterebilmemiz için konum izninize ihtiyacımız var.
                    </Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={() => requestPermission()} activeOpacity={0.8}>
                        <Ionicons name="navigate" size={18} color={Colors.white} />
                        <Text style={styles.permissionButtonText}>Konumu Etkinleştir</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Yükleniyor
    if (isLoading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Yakındaki Duraklar" subtitle="Konum alınıyor..." />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Konumunuz belirleniyor...</Text>
                </View>
            </View>
        );
    }

    // Hata durumu
    if (error && !location) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Yakındaki Duraklar" subtitle="Hata oluştu" />
                <View style={styles.permissionContainer}>
                    <Ionicons name="warning-outline" size={48} color={Colors.error} />
                    <Text style={styles.permissionTitle}>Konum Alınamadı</Text>
                    <Text style={styles.permissionText}>{error}</Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={() => requestPermission()} activeOpacity={0.8}>
                        <Text style={styles.permissionButtonText}>Tekrar Dene</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Yakındaki Duraklar"
                subtitle={`${nearbyStops.length} durak bulundu`}
            />

            {/* Harita Entegrasyonu */}
            {location && (
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={{
                            latitude: location.latitude,
                            longitude: location.longitude,
                            latitudeDelta: 0.015,
                            longitudeDelta: 0.015,
                        }}
                        showsUserLocation={true}
                        showsMyLocationButton={true}
                    >
                        {nearbyStops.map((stop) => (
                            <Marker
                                key={`map-marker-${stop.id}`}
                                coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                                onPress={() => {
                                    mapRef.current?.animateToRegion({
                                        latitude: stop.latitude,
                                        longitude: stop.longitude,
                                        latitudeDelta: 0.005,
                                        longitudeDelta: 0.005
                                    }, 400);
                                }}
                            >
                                <Callout tooltip onPress={() => router.push(`/stop/${stop.id}` as any)}>
                                    <View style={styles.calloutContainer}>
                                        <Text style={styles.calloutTitle}>{stop.name}</Text>
                                        <Text style={styles.calloutSubtitle}>Durak ID: {stop.id}</Text>
                                        <Text style={styles.calloutSubtitle}>{stop.routes.length} hat geçiyor</Text>
                                        <View style={styles.calloutButton}>
                                            <Text style={styles.calloutButtonText}>Detaya Git</Text>
                                        </View>
                                    </View>
                                </Callout>
                            </Marker>
                        ))}
                    </MapView>
                </View>
            )}

            {/* Manuel Yenileme Banner'ı (Cooldown Entegreli) */}
            {location && (
                <View style={styles.locationBanner}>
                    <Ionicons name="location" size={16} color={Colors.primary} />
                    <Text style={styles.locationText}>
                        Konum: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </Text>
                    <TouchableOpacity
                        style={[styles.refreshButton, cooldown > 0 && styles.refreshButtonDisabled]}
                        onPress={handleRefresh}
                        disabled={cooldown > 0}
                    >
                        <Ionicons name="refresh" size={16} color={Colors.white} />
                        <Text style={styles.refreshButtonText}>
                            {cooldown > 0 ? `${cooldown} sn` : 'Taramayı Yenile'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Durak Listesi */}
            <View style={{ flex: 1 }}>
                <FlatList
                    data={nearbyStops}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <StopCard
                            stop={item}
                            isFavorite={isFavoriteStop(item.id)}
                            onPress={() => router.push(`/stop/${item.id}` as any)}
                            onPressFavorite={() => handleToggleFavorite(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={[Colors.primary]}
                            tintColor={Colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="bus-outline" size={48} color={Colors.gray400} />
                            <Text style={styles.emptyText}>Durak bulunamadı</Text>
                        </View>
                    }
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    listContent: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxxl,
    },
    mapContainer: {
        height: '40%',
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    locationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
        gap: Spacing.sm,
    },
    locationText: {
        flex: 1,
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
        gap: 4,
    },
    refreshButtonDisabled: {
        backgroundColor: Colors.gray400,
    },
    refreshButtonText: {
        color: Colors.white,
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.bold,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    calloutContainer: {
        backgroundColor: Colors.white,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.md,
        minWidth: 140,
        alignItems: 'center',
    },
    calloutTitle: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: 2,
        textAlign: 'center',
    },
    calloutSubtitle: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        marginBottom: 1,
    },
    calloutButton: {
        marginTop: Spacing.xs,
        backgroundColor: Colors.primarySoft,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    calloutButtonText: {
        fontSize: 10,
        color: Colors.primary,
        fontWeight: FontWeights.bold,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.base,
    },
    loadingText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxl,
        gap: Spacing.md,
    },
    permissionIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    permissionTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    permissionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.xl,
        gap: Spacing.sm,
        marginTop: Spacing.sm,
        ...Shadows.md,
    },
    permissionButtonText: {
        color: Colors.white,
        fontSize: FontSizes.base,
        fontWeight: FontWeights.semibold,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        gap: Spacing.md,
    },
    emptyText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
});
