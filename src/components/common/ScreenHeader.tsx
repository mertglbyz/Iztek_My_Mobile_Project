import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import FocusStatusBar from '@/components/common/FocusStatusBar';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
}

export default function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
            <FocusStatusBar style="light" />
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.base,
        paddingBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.white,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 4,
    },
});
