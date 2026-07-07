import ScreenHeader from '@/components/common/ScreenHeader';
import StopCard from '@/components/stops/StopCard';
import StopDetailSheet from '@/components/stops/StopDetailSheet';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { MOCK_STOPS } from '@/data/mockStops';
import { useLocation } from '@/hooks/useLocation';
import { BusStopWithDistance } from '@/types';
import { getSortedStopsByDistance } from '@/utils/distance';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const MAX_NEARBY_STOPS = 15;

export default function NearbyScreen() {
    const { location, isLoading, error, permissionStatus, requestPermission } = useLocation();
    const { addFavoriteStop, removeFavoriteStop, isFavoriteStop } = useFavorites();

    const [selectedStop, setSelectedStop] = useState<BusStopWithDistance | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Konum bazlı mesafe hesaplaması
    const nearbyStops = useMemo(() => {
        if (!location) return [];
        return getSortedStopsByDistance(MOCK_STOPS, location).slice(0, MAX_NEARBY_STOPS);
    }, [location]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await requestPermission();
        setIsRefreshing(false);
    }, [requestPermission]);

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
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
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
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
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

            {/* Konum bilgisi */}
            {location && (
                <View style={styles.locationBanner}>
                    <Ionicons name="location" size={16} color={Colors.primary} />
                    <Text style={styles.locationText}>
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </Text>
                    <TouchableOpacity onPress={handleRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="refresh" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Durak Listesi */}
            <FlatList
                data={nearbyStops}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <StopCard
                        stop={item}
                        isFavorite={isFavoriteStop(item.id)}
                        onPress={() => setSelectedStop(item)}
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
                        <Text style={styles.emptyText}>Yakında durak bulunamadı</Text>
                    </View>
                }
            />

            {/* Durak Detay Bottom Sheet */}
            <StopDetailSheet
                stop={selectedStop}
                visible={selectedStop !== null}
                isFavorite={selectedStop ? isFavoriteStop(selectedStop.id) : false}
                onClose={() => setSelectedStop(null)}
                onToggleFavorite={() => {
                    if (selectedStop) {
                        handleToggleFavorite(selectedStop);
                    }
                }}
            />
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
    locationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primarySoft,
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.sm,
        gap: Spacing.xs,
    },
    locationText: {
        flex: 1,
        fontSize: FontSizes.xs,
        color: Colors.primary,
        fontWeight: FontWeights.medium,
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
