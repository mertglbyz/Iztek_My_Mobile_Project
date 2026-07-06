import ScreenHeader from '@/components/common/ScreenHeader';
import { MOCK_STOPS } from '@/data/mockStops';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NearbyScreen() {
    const nearbyStops = useMemo(
        () => MOCK_STOPS.slice(0, 5).map((stop, index) => ({
            ...stop,
            distance: [120, 250, 410, 580, 720][index],
        })),
        []
    );

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Yakındaki Duraklar"
                subtitle="Konumunuza en yakın 5 durak"
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.locationCard}>
                    <Ionicons name="location" size={20} color={Colors.primary} />
                    <View style={styles.locationText}>
                        <Text style={styles.locationLabel}>Mevcut konum</Text>
                        <Text style={styles.locationValue}>Konak, İzmir (mock)</Text>
                    </View>
                    <TouchableOpacity style={styles.refreshButton}>
                        <Ionicons name="refresh" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                {nearbyStops.map((stop) => (
                    <TouchableOpacity key={stop.id} style={styles.stopCard} activeOpacity={0.85}>
                        <View style={styles.stopBadge}>
                            <Text style={styles.stopBadgeText}>D</Text>
                        </View>
                        <View style={styles.stopInfo}>
                            <Text style={styles.stopName}>{stop.name}</Text>
                            <Text style={styles.stopMeta}>ID: {stop.id} · {stop.district}</Text>
                            <Text style={styles.stopRoutes}>
                                Hatlar: {stop.routes.slice(0, 3).join(', ')}
                            </Text>
                        </View>
                        <View style={styles.distanceBadge}>
                            <Text style={styles.distanceValue}>{stop.distance}</Text>
                            <Text style={styles.distanceUnit}>m</Text>
                        </View>
                    </TouchableOpacity>
                ))}
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
        paddingBottom: Spacing.xxl,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
        gap: Spacing.sm,
    },
    locationText: {
        flex: 1,
    },
    locationLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    locationValue: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.medium,
        color: Colors.textPrimary,
    },
    refreshButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
    },
    stopBadge: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    stopBadgeText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
    },
    stopInfo: {
        flex: 1,
    },
    stopName: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: Colors.textPrimary,
    },
    stopMeta: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    stopRoutes: {
        fontSize: FontSizes.xs,
        color: Colors.primary,
        marginTop: 4,
    },
    distanceBadge: {
        alignItems: 'center',
        backgroundColor: Colors.primarySoft,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    distanceValue: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
    },
    distanceUnit: {
        fontSize: FontSizes.xs,
        color: Colors.primary,
    },
});
