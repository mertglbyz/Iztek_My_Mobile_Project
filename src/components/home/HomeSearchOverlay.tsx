import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { getAllRoutes } from '@/services/transportApi';
import { BusRouteSummary, BusStop, BusStopWithDistance } from '@/types';
import { getRoutesFromStops } from '@/utils/routeData';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SearchResult {
    type: 'route' | 'stop';
    item: any;
}

interface HomeSearchOverlayProps {
    searchQuery: string;
    onClose: () => void;
    onPressRoute: (routeId: string) => void;
    onPressStop: (stop: BusStopWithDistance) => void;
    allStops: BusStop[];
}

export default function HomeSearchOverlay({
    searchQuery,
    onClose,
    onPressRoute,
    onPressStop,
    allStops,
}: HomeSearchOverlayProps) {
    const [routeNames, setRouteNames] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        getAllRoutes().then(setRouteNames).catch(console.warn);
    }, []);

    const results = useMemo(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) return [];

        // Türkçe karakterleri de destekleyen küçültme
        const q = searchQuery.toLocaleLowerCase('tr-TR').trim();
        const dynamicRoutes = getRoutesFromStops(allStops, routeNames);

        const foundRoutes = dynamicRoutes.filter((r) => {
            if (r.routeNumber.toString().includes(q)) return true;
            if (r.routeName && r.routeName.toLocaleLowerCase('tr-TR').includes(q)) return true;
            return false;
        }).map((r) => ({ type: 'route' as const, item: r }));

        const foundStops = allStops.filter(s => {
            if (s.name.toLocaleLowerCase('tr-TR').includes(q)) return true;
            if (s.id.toString().includes(q)) return true;

            const qNum = Number(q);
            if (!isNaN(qNum) && s.routes.includes(qNum)) return true;

            return false;
        }).map((s) => ({
            type: 'stop' as const,
            item: { ...s, distanceMeters: 0 },
        }));

        // Limit the rendering to top 50 items so the app doesn't freeze when searching a short string among 11000 items
        return [...foundRoutes, ...foundStops].slice(0, 50);
    }, [searchQuery, allStops]);

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
                    <FlatList
                        data={results}
                        keyExtractor={(res, i) => `${res.type}-${res.type === 'route' ? res.item.routeNumber : res.item.id}-${i}`}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item: res }) => {
                            if (res.type === 'route') {
                                const route = res.item as BusRouteSummary;
                                return (
                                    <TouchableOpacity
                                        style={styles.resultItem}
                                        onPress={() => onPressRoute(route.routeNumber.toString())}
                                    >
                                        <View style={[styles.iconBox, styles.routeIconBox]}>
                                            <Ionicons name="bus" size={16} color={Colors.white} />
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemTitle}>
                                                {route.routeName ? `${route.routeNumber} - ${route.routeName}` : `Hat ${route.routeNumber}`}
                                            </Text>
                                            <Text style={styles.itemSubtitle}>{route.stopCount} duraktan geçiyor</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={Colors.gray400} />
                                    </TouchableOpacity>
                                );
                            } else {
                                const stop = res.item as BusStopWithDistance;
                                return (
                                    <TouchableOpacity
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
                        }}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={32} color={Colors.gray400} />
                        <Text style={styles.emptyText}>Arama sonucu yok</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
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
