import ScreenHeader from '@/components/common/ScreenHeader';
import FavoriteListItem from '@/components/home/FavoriteListItem';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useStops } from '@/context/StopsContext';
import { getRoutesFromStops } from '@/utils/routeData';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function RoutesScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const { stops } = useStops();

    // Mevcut durak verilerinden dinamik olarak gerçek hat dizisini (routes array) üret
    const dynamicRoutes = useMemo(() => getRoutesFromStops(stops), [stops]);

    // Arama fonksiyonu: string bazlı filtreleme
    const filteredRoutes = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return dynamicRoutes;
        return dynamicRoutes.filter(
            (route) => route.routeNumber.toString().includes(q)
        );
    }, [searchQuery, dynamicRoutes]);

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Hatlar"
                subtitle="Gerçek durak verilerinden üretilmiş aktif hat listesi"
            />

            {/* Sabit Arama Çubuğu ve İstatistikler - ScrollView'un Dışında */}
            <View style={styles.fixedHeaderArea}>
                <View style={styles.searchWrapper}>
                    <Ionicons name="search-outline" size={20} color={Colors.gray500} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Hat numarası ara (Örn: 304)..."
                        placeholderTextColor={Colors.textDisabled}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statChip}>
                        <Ionicons name="bus" size={14} color={Colors.primary} />
                        <Text style={styles.statText}>{dynamicRoutes.length} aktif hat</Text>
                    </View>
                    <View style={styles.statChip}>
                        <Ionicons name="analytics-outline" size={14} color={Colors.primary} />
                        <Text style={styles.statText}>Dinamik Üretim</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                automaticallyAdjustKeyboardInsets={true}
            >
                {filteredRoutes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="search" size={40} color={Colors.gray300} />
                        <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                    </View>
                ) : (
                    filteredRoutes.map((route) => (
                        <FavoriteListItem
                            key={`route-${route.routeNumber}`}
                            variant="route"
                            badgeText={route.routeNumber.toString()}
                            title={`Hat ${route.routeNumber}`}
                            subtitle={`${route.stopCount} duraktan geçiyor`}
                            onPress={() => router.push(`/route/${route.routeNumber}`)}
                        />
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    fixedHeaderArea: {
        paddingHorizontal: Spacing.base,
        paddingTop: Spacing.md,
        backgroundColor: Colors.background,
        zIndex: 10,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.base,
        paddingBottom: Spacing.xxxl,
        // DİKKAT: KeyboardAvoidingView kullandığımız için devasa padding (örn: 300) sildik!
        // Klavye kapalıyken gereksiz dev boşlukları çözer.
        // Klavye açıkken KeyboardAvoiding ekranı yukarı ittiğinden son satır tıklanabilir olur.
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        height: 48,
        borderWidth: 1,
        borderColor: Colors.gray200,
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
        padding: 0,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.primarySoft,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    statText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: Spacing.xxxl,
        gap: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSizes.base,
        color: Colors.textSecondary,
    },
});
