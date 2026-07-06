import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Durak Yakınımda</Text>
                <Text style={styles.subtitle}>İzmir ESHOT Durak Bulucu</Text>
            </View>
            <View style={styles.body}>
                <Text style={styles.placeholder}>🚌 Ana Sayfa hazırlanıyor...</Text>
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
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.primarySoft,
        marginTop: 2,
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
