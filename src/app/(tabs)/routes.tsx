import ScreenHeader from '@/components/common/ScreenHeader';
import FavoriteListItem from '@/components/home/FavoriteListItem';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { MOCK_ROUTES } from '@/data/mockRoutes';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function RoutesScreen() {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredRoutes = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return MOCK_ROUTES;
        return MOCK_ROUTES.filter(
            (route) =>
                route.routeNumber.toLowerCase().includes(q) ||
                route.title.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Hatlar"
                subtitle="ESHOT hatlarını arayın ve inceleyin"
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.searchWrapper}>
                    <Ionicons name="search-outline" size={20} color={Colors.gray500} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Hat numarası veya güzergah ara..."
                        placeholderTextColor={Colors.textDisabled}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statChip}>
                        <Ionicons name="bus" size={14} color={Colors.primary} />
                        <Text style={styles.statText}>{MOCK_ROUTES.length} hat</Text>
                    </View>
                    <View style={styles.statChip}>
                        <Ionicons name="time-outline" size={14} color={Colors.primary} />
                        <Text style={styles.statText}>Canlı saatler (mock)</Text>
                    </View>
                </View>

                {filteredRoutes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="search" size={40} color={Colors.gray300} />
                        <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                    </View>
                ) : (
                    filteredRoutes.map((route) => (
                        <FavoriteListItem
                            key={route.id}
                            variant="route"
                            badgeText={route.routeNumber}
                            title={route.title}
                            subtitle={route.operatingHours}
                            onPress={() => router.push(`/route/${route.id}`)}
                            hasAnnouncement={route.hasAnnouncement}
                            onPressAnnouncement={() => console.log('Duyuru')}
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxl,
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
