import FocusStatusBar from '@/components/common/FocusStatusBar';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { MOCK_ROUTES } from '@/data/mockRoutes';
import { getStopsForRoute } from '@/utils/routeData';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RouteDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();

    const { isFavoriteRoute, addFavoriteRoute, removeFavoriteRoute } = useFavorites();

    const route = useMemo(() => MOCK_ROUTES.find((r) => r.id === id), [id]);
    const stops = useMemo(() => getStopsForRoute(id as string), [id]);

    if (!route) {
        return (
            <View style={[styles.container, styles.centered]}>
                <FocusStatusBar style="dark" />
                <Ionicons name="warning-outline" size={48} color={Colors.error} />
                <Text style={styles.errorText}>Hat bulunamadı</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isFavorite = isFavoriteRoute(route.id);

    const handleToggleFavorite = () => {
        if (isFavorite) {
            removeFavoriteRoute(route.id);
        } else {
            addFavoriteRoute(route);
        }
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
                    <Text style={styles.headerRouteNumber}>{route.routeNumber}</Text>
                </View>

                <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconButton}>
                    <Ionicons
                        name={isFavorite ? 'star' : 'star-outline'}
                        size={24}
                        color={isFavorite ? Colors.accent : Colors.white}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* HAT BİLGİSİ */}
                <View style={styles.infoCard}>
                    <Text style={styles.routeTitle}>{route.title}</Text>
                    <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.timeText}>Çalışma Saatleri: {route.operatingHours}</Text>
                    </View>
                    {route.hasAnnouncement && (
                        <View style={styles.announcementRow}>
                            <Ionicons name="warning" size={16} color={Colors.warning} />
                            <Text style={styles.announcementText}>Bu hatla ilgili duyuru bulunmaktadır.</Text>
                        </View>
                    )}
                </View>

                {/* GÜZERGAH */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Güzergah ({stops.length} durak)</Text>

                    <View style={styles.timeline}>
                        {stops.length > 0 ? stops.map((stop, index) => {
                            const isFirst = index === 0;
                            const isLast = index === stops.length - 1;

                            return (
                                <View key={`stop-${stop.id}-${index}`} style={styles.timelineItem}>
                                    <View style={styles.timelineGraphic}>
                                        {!isFirst && <View style={styles.timelineLineTop} />}
                                        <View style={[styles.timelineDot, (isFirst || isLast) && styles.timelineDotActive]} />
                                        {!isLast && <View style={styles.timelineLineBottom} />}
                                    </View>

                                    <View style={styles.timelineContent}>
                                        <Text style={styles.stopName}>{stop.name}</Text>
                                        <Text style={styles.stopDistrict}>{stop.district} · ID: {stop.id}</Text>
                                    </View>
                                </View>
                            );
                        }) : (
                            <Text style={styles.emptyStopsText}>Güzergah bilgisi henüz eklenmemiş.</Text>
                        )}
                    </View>
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
    announcementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.md,
        backgroundColor: Colors.warningSoft,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    announcementText: {
        fontSize: FontSizes.xs,
        color: Colors.warning,
        fontWeight: FontWeights.medium,
    },
    sectionContainer: {
        paddingHorizontal: Spacing.base,
        paddingBottom: Spacing.xxxl,
    },
    sectionTitle: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
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
    },
    timelineGraphic: {
        width: 24,
        alignItems: 'center',
        marginRight: Spacing.md,
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
        marginTop: 22,
        zIndex: 1,
    },
    timelineDotActive: {
        backgroundColor: Colors.primary,
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: 21,
    },
    timelineContent: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
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
    emptyStopsText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        padding: Spacing.base,
    },
});
