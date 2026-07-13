import ScreenHeader from '@/components/common/ScreenHeader';
import FavoriteListItem from '@/components/home/FavoriteListItem';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useStops } from '@/context/StopsContext';
import { getAllRoutes } from '@/services/transportApi';
import { getRoutesFromStops } from '@/utils/routeData';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RoutesScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const { stops } = useStops();
    const [routeNames, setRouteNames] = useState<{ id: string, name: string }[]>([]);

    // Asenkron olarak hat isimlerini önbellekten veya lokal JSON'dan yükle
    useEffect(() => {
        getAllRoutes().then(setRouteNames).catch(console.warn);
    }, []);

    // Mevcut durak verilerinden dinamik olarak gerçek hat dizisini (routes array) üret
    const dynamicRoutes = useMemo(() => getRoutesFromStops(stops, routeNames), [stops, routeNames]);

    // Arama fonksiyonu: string bazlı filtreleme ve performans için max 50 sonuç
    const filteredRoutes = useMemo(() => {
        // Türkçe karakterleri destekleyen küçültme
        const q = searchQuery.toLocaleLowerCase('tr-TR').trim();
        // Arama yapılmamışsa tüm hatları göster (FlatList sanallaştırmasıyla performansı yönetir)
        if (!q) return dynamicRoutes;

        return dynamicRoutes.filter(
            (route) => {
                if (route.routeNumber.toString().includes(q)) return true;
                if (route.routeName && route.routeName.toLocaleLowerCase('tr-TR').includes(q)) return true;
                return false;
            }
        ).slice(0, 50);
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
                        placeholder="Hat numarası veya adı ara..."
                        placeholderTextColor={Colors.textDisabled}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close-circle" size={20} color={Colors.gray400} />
                        </TouchableOpacity>
                    )}
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

            {filteredRoutes.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="search" size={40} color={Colors.gray300} />
                    <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                </View>
            ) : (
                <FlatList
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    automaticallyAdjustKeyboardInsets={true}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    data={filteredRoutes}
                    keyExtractor={(item) => `route-${item.routeNumber}`}
                    renderItem={({ item: route }) => (
                        <FavoriteListItem
                            variant="route"
                            badgeText={route.routeNumber.toString()}
                            title={route.routeName || `Hat ${route.routeNumber}`}
                            subtitle={`${route.stopCount} duraktan geçiyor`}
                            onPress={() => {
                                Keyboard.dismiss();
                                setSearchQuery('');
                                router.push(`/route/${route.routeNumber}`);
                            }}
                        />
                    )}
                />
            )}
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
