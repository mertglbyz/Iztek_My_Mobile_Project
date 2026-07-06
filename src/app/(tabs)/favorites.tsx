import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Favori Duraklar</Text>
            </View>
            <View style={styles.body}>
                <Text style={styles.placeholder}>⭐ Favoriler hazırlanıyor...</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.base,
        paddingBottom: Spacing.lg,
        paddingTop: Spacing.sm,
    },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.white,
    },
    body: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholder: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
    },
});
