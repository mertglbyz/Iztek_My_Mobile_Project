import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { BusStopWithDistance } from '@/types';
import { formatDistance } from '@/utils/distance';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StopCardProps {
    stop: BusStopWithDistance;
    isFavorite: boolean;
    onPress: () => void;
    onPressFavorite: () => void;
}

export default function StopCard({ stop, isFavorite, onPress, onPressFavorite }: StopCardProps) {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
            {/* Sol taraf: Durak badge */}
            <View style={styles.badgeContainer}>
                <Ionicons name="bus" size={18} color={Colors.primary} />
                <Text style={styles.badgeId}>{stop.id}</Text>
            </View>

            {/* Orta: Durak bilgileri */}
            <View style={styles.infoContainer}>
                <Text style={styles.stopName} numberOfLines={1}>{stop.name}</Text>
                <View style={styles.routesRow}>
                    {stop.routes.slice(0, 4).map((route) => (
                        <View key={route} style={styles.routeBadge}>
                            <Text style={styles.routeText}>{route}</Text>
                        </View>
                    ))}
                    {stop.routes.length > 4 && (
                        <Text style={styles.moreRoutes}>+{stop.routes.length - 4}</Text>
                    )}
                </View>
            </View>

            {/* Sağ: Mesafe + Favori */}
            <View style={styles.rightSection}>
                <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{formatDistance(stop.distanceMeters)}</Text>
                </View>
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={onPressFavorite}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons
                        name={isFavorite ? 'star' : 'star-outline'}
                        size={20}
                        color={isFavorite ? Colors.accent : Colors.gray400}
                    />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
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
    badgeContainer: {
        width: 52,
        height: 52,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    badgeId: {
        fontSize: 10,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
        marginTop: 2,
    },
    infoContainer: {
        flex: 1,
    },
    stopName: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    district: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        marginBottom: 6,
    },
    routesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
    },
    routeBadge: {
        backgroundColor: Colors.primarySoft,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    routeText: {
        fontSize: 10,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
    },
    moreRoutes: {
        fontSize: 10,
        color: Colors.textSecondary,
    },
    rightSection: {
        alignItems: 'center',
        marginLeft: Spacing.sm,
        gap: Spacing.xs,
    },
    distanceBadge: {
        backgroundColor: Colors.primarySoft,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.md,
    },
    distanceText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
    },
    favoriteButton: {
        padding: Spacing.xs,
    },
});
