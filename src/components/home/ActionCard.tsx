import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActionCardProps {
    title: string;
    description: string;
    iconName: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    iconColor?: string;
    iconBg?: string;
}

export default function ActionCard({
    title,
    description,
    iconName,
    onPress,
    iconColor = Colors.primary,
    iconBg = Colors.primarySoft,
}: ActionCardProps) {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
            <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                <Ionicons name={iconName} size={24} color={iconColor} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description} numberOfLines={2}>{description}</Text>
            <View style={styles.arrow}>
                <Ionicons name="chevron-forward" size={16} color={Colors.gray400} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 155,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    description: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        lineHeight: 16,
        paddingRight: Spacing.lg,
    },
    arrow: {
        position: 'absolute',
        right: Spacing.md,
        top: Spacing.md,
    },
});
