import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { MOCK_ROUTES } from '@/data/mockRoutes';
import { MOCK_STOPS } from '@/data/mockStops';
import { BusRoute, BusStopWithDistance } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SearchResult {
    type: 'route' | 'stop';
    item: any;
}

interface HomeSearchOverlayProps {
    searchQuery: string;
    onClose: () => void;
    onPressRoute: (routeId: string) => void;
    onPressStop: (stop: BusStopWithDistance) => void;
}

export default function HomeSearchOverlay({
    searchQuery,
    onClose,
    onPressRoute,
    onPressStop,
}: HomeSearchOverlayProps) {

    const results = useMemo(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) return [];

        const q = searchQuery.toLowerCase().trim();
        const foundRoutes = MOCK_ROUTES.filter(
            (r) => r.routeNumber.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)
        ).map((r) => ({ type: 'route' as const, item: r }));

        const foundStops = MOCK_STOPS.filter(
            (s) => s.id.toString().includes(q) || s.name.toLowerCase().includes(q)
        ).map((s) => ({
            type: 'stop' as const,
            item: { ...s, distanceMeters: 0 }, // Search overlay'de mesafe 0 gösterilebilir veya opsiyonel kalır
        }));

        return [...foundRoutes, ...foundStops];
    }, [searchQuery]);

    if (!searchQuery.trim() || searchQuery.length < 2) {
        return null; // En az 2 karakter girilmemişse overlay gösterme
    }

    return (
        <View style={styles.container}>
            {/* Arkaplan kapatıcı */}
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

            {/* Sonuç Listesi */}
            <View style={styles.resultsContainer}>
                <Text style={styles.headerTitle}>Arama Sonuçları</Text>
                {results.length > 0 ? (
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {results.map((res, i) => {
                            if (res.type === 'route') {
                                const route = res.item as BusRoute;
                                return (
                                    <TouchableOpacity
                                        key={`route-${route.id}-${i}`}
                                        style={styles.resultItem}
                                        onPress={() => onPressRoute(route.id)}
                                    >
                                        <View style={[styles.iconBox, styles.routeIconBox]}>
                                            <Ionicons name="bus" size={16} color={Colors.white} />
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemTitle}>{route.routeNumber} - {route.title}</Text>
                                            <Text style={styles.itemSubtitle}>Hat</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={Colors.gray400} />
                                    </TouchableOpacity>
                                );
                            } else {
                                const stop = res.item as BusStopWithDistance;
                                return (
                                    <TouchableOpacity
                                        key={`stop-${stop.id}-${i}`}
                                        style={styles.resultItem}
                                        onPress={() => onPressStop(stop)}
                                    >
                                        <View style={[styles.iconBox, styles.stopIconBox]}>
                                            <Text style={styles.stopIconText}>D</Text>
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemTitle}>{stop.name}</Text>
                                            <Text style={styles.itemSubtitle}>Durak ID: {stop.id}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={Colors.gray400} />
                                    </TouchableOpacity>
                                );
                            }
                        })}
                    </ScrollView>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={32} color={Colors.gray400} />
                        <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 140, // Header ve SearchBar'ın yaklaşık boyutu
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    resultsContainer: {
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.xs,
        borderRadius: BorderRadius.xl,
        maxHeight: '60%',
        padding: Spacing.sm,
        ...Shadows.lg,
    },
    headerTitle: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.textSecondary,
        marginLeft: Spacing.sm,
        marginBottom: Spacing.sm,
        marginTop: Spacing.sm,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    routeIconBox: {
        backgroundColor: Colors.primary,
    },
    stopIconBox: {
        backgroundColor: Colors.accentSoft,
        borderWidth: 1,
        borderColor: Colors.accentLight,
    },
    stopIconText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.accent,
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    itemSubtitle: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    emptyContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
});
