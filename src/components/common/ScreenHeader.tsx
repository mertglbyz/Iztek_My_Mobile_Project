import FocusStatusBar from '@/components/common/FocusStatusBar';
import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    showBackButton?: boolean;
}

export default function ScreenHeader({ title, subtitle, showBackButton = false }: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.push('/');
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
            <FocusStatusBar style="dark" />
            <View style={styles.headerRow}>
                {showBackButton && (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                )}
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.base,
        paddingBottom: Spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: Spacing.sm,
        padding: Spacing.xs,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: 4,
    },
});
