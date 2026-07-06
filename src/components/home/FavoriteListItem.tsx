import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ListItemVariant = 'route' | 'stop';

interface FavoriteListItemProps {
    variant: ListItemVariant;
    badgeText: string;
    title: string;
    subtitle?: string;
    metaLabel?: string;
    onPress: () => void;
    onPressAnnouncement?: () => void;
    hasAnnouncement?: boolean;
}

export default function FavoriteListItem({
    variant,
    badgeText,
    title,
    subtitle,
    metaLabel,
    onPress,
    onPressAnnouncement,
    hasAnnouncement = false,
}: FavoriteListItemProps) {
    const badgeStyle = variant === 'route' ? styles.routeBadge : styles.stopBadge;
    const badgeTextStyle = variant === 'route' ? styles.routeBadgeText : styles.stopBadgeText;

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
            <View style={[styles.badgeContainer, badgeStyle]}>
                <Text style={badgeTextStyle}>{badgeText}</Text>
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                {metaLabel && (
                    <Text style={styles.metaLabel}>{metaLabel}</Text>
                )}
                {subtitle && (
                    <View style={styles.subtitleRow}>
                        <Ionicons
                            name={variant === 'stop' ? 'bus-outline' : 'time-outline'}
                            size={13}
                            color={Colors.textSecondary}
                        />
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    </View>
                )}
            </View>
            <View style={styles.trailing}>
                {hasAnnouncement && (
                    <TouchableOpacity
                        style={styles.announcementButton}
                        onPress={onPressAnnouncement}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="megaphone-outline" size={20} color={Colors.accent} />
                    </TouchableOpacity>
                )}
                <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
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
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    routeBadge: {
        backgroundColor: Colors.primary,
    },
    stopBadge: {
        backgroundColor: Colors.accentSoft,
        borderWidth: 1,
        borderColor: Colors.accentLight,
    },
    routeBadgeText: {
        color: Colors.white,
        fontSize: FontSizes.md,
        fontWeight: FontWeights.bold,
    },
    stopBadgeText: {
        color: Colors.accent,
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.bold,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    metaLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    subtitle: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    trailing: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginLeft: Spacing.sm,
    },
    announcementButton: {
        padding: Spacing.xs,
    },
});
