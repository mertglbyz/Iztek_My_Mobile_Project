import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { getMockApproachingBuses } from '@/data/mockStops';
import { BusStopWithDistance } from '@/types';
import { formatArrivalTime, formatDistance } from '@/utils/distance';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StopDetailSheetProps {
    stop: BusStopWithDistance | null;
    visible: boolean;
    isFavorite: boolean;
    onClose: () => void;
    onToggleFavorite: () => void;
}

export default function StopDetailSheet({
    stop,
    visible,
    isFavorite,
    onClose,
    onToggleFavorite,
}: StopDetailSheetProps) {
    const buses = useMemo(() => {
        if (!stop) return [];
        return getMockApproachingBuses(stop.id);
    }, [stop]);

    if (!stop) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
                <View style={styles.sheet}>
                    {/* Tutma çubuğu */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.stopName}>{stop.name}</Text>
                            <Text style={styles.stopMeta}>
                                Durak ID: {stop.id} · {stop.district} · {formatDistance(stop.distanceMeters)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.favoriteButton}
                            onPress={onToggleFavorite}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isFavorite ? 'star' : 'star-outline'}
                                size={24}
                                color={isFavorite ? Colors.accent : Colors.gray400}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Hatlar */}
                    <View style={styles.routesSection}>
                        <Text style={styles.sectionTitle}>Geçen Hatlar</Text>
                        <View style={styles.routesRow}>
                            {stop.routes.map((route) => (
                                <View key={route} style={styles.routeChip}>
                                    <Text style={styles.routeChipText}>{route}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Yaklaşan Otobüsler */}
                    <View style={styles.busesSection}>
                        <Text style={styles.sectionTitle}>Yaklaşan Otobüsler</Text>
                        {buses.length > 0 ? (
                            <ScrollView style={styles.busList} showsVerticalScrollIndicator={false}>
                                {buses.map((bus) => (
                                    <View key={bus.id} style={styles.busItem}>
                                        <View style={styles.busRouteContainer}>
                                            <Text style={styles.busRouteNumber}>{bus.routeNumber}</Text>
                                        </View>
                                        <View style={styles.busInfo}>
                                            <Text style={styles.busDestination}>{bus.destination}</Text>
                                            <View style={styles.busIcons}>
                                                {bus.isAccessible && (
                                                    <Ionicons name="accessibility" size={14} color={Colors.success} />
                                                )}
                                                {bus.isLowFloor && (
                                                    <Ionicons name="resize" size={14} color={Colors.primary} />
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.arrivalBadge}>
                                            <Text style={styles.arrivalText}>
                                                {formatArrivalTime(bus.estimatedMinutes)}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="time-outline" size={36} color={Colors.gray400} />
                                <Text style={styles.emptyText}>Şu an yaklaşan otobüs yok</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: Spacing.base,
        paddingBottom: Spacing.xxxl,
        maxHeight: '70%',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.gray300,
        alignSelf: 'center',
        marginTop: Spacing.md,
        marginBottom: Spacing.base,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: Spacing.base,
    },
    headerLeft: {
        flex: 1,
        paddingRight: Spacing.md,
    },
    stopName: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    stopMeta: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    favoriteButton: {
        padding: Spacing.xs,
    },
    routesSection: {
        marginBottom: Spacing.base,
    },
    sectionTitle: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    routesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    routeChip: {
        backgroundColor: Colors.primarySoft,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    routeChipText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: Colors.primary,
    },
    busesSection: {
        flex: 1,
    },
    busList: {
        flex: 1,
    },
    busItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray50,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    busRouteContainer: {
        width: 48,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    busRouteNumber: {
        color: Colors.white,
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
    },
    busInfo: {
        flex: 1,
    },
    busDestination: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.medium,
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    busIcons: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    arrivalBadge: {
        backgroundColor: Colors.successSoft,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.md,
        marginLeft: Spacing.sm,
    },
    arrivalText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.success,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        gap: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
});
