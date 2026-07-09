import FocusStatusBar from '@/components/common/FocusStatusBar';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ActionCard from '@/components/home/ActionCard';
import FavoriteListItem from '@/components/home/FavoriteListItem';
import Header from '@/components/home/Header';
import SearchBar from '@/components/home/SearchBar';
import TabbedList from '@/components/home/TabbedList';

import HomeSearchOverlay from '@/components/home/HomeSearchOverlay';
import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { useStops } from '@/context/StopsContext';
import { BusStopWithDistance } from '@/types';

export default function HomeScreen() {
    const { favoriteRoutes, favoriteStops, removeFavoriteRoute, addFavoriteStop, removeFavoriteStop, isFavoriteStop } = useFavorites();
    const { stops: allStops } = useStops();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    const handlePressRoute = (routeId: string) => {
        setSearchQuery('');
        router.push(`/route/${routeId}`);
    };

    const handlePressStop = (stop: BusStopWithDistance) => {
        setSearchQuery('');
        router.push(`/stop/${stop.id}` as any);
    };

    return (
        <View style={styles.container}>
            <FocusStatusBar style="dark" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <Header />
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onPressQr={() => Alert.alert('Yakında', 'QR okuyucu özelliği yakında eklenecektir.')}
                />

                {/* Alt kısımdaki her şeyi (liste ve arama sonucu) kapsayan Wrapper */}
                <View style={styles.contentWrapper}>
                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.actionCardsScroll}
                        >
                            <ActionCard
                                title="Yakınımdaki Duraklar"
                                description="Konumunuza en yakın durakları görün"
                                iconName="navigate-circle-outline"
                                iconColor={Colors.primary}
                                iconBg={Colors.primarySoft}
                                onPress={() => router.push('/(tabs)/nearby')}
                            />
                            <View style={styles.cardGap} />
                            <ActionCard
                                title="Nasıl Giderim"
                                description="Başlangıç ve varış noktası seçin"
                                iconName="map-outline"
                                iconColor={Colors.accent}
                                iconBg={Colors.accentSoft}
                                onPress={() => Alert.alert('Yakında', 'Rota planlama (Nasıl Giderim) özelliği geliştirme aşamasındadır.')}
                            />
                            <View style={styles.cardGap} />
                            <ActionCard
                                title="Hatlar"
                                description="Tüm ESHOT hatlarını keşfedin"
                                iconName="bus-outline"
                                iconColor={Colors.success}
                                iconBg={Colors.successSoft}
                                onPress={() => router.push('/(tabs)/routes')}
                            />
                        </ScrollView>

                        <View style={styles.favoritesSection}>
                            <TabbedList
                                tabs={['Favori Hatlar', 'Favori Duraklar']}
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                            >
                                {activeTab === 0 ? (
                                    favoriteRoutes.length > 0 ? favoriteRoutes.map((route, index) => (
                                        <FavoriteListItem
                                            key={`${route?.id || 'route'}-${index}`}
                                            variant="route"
                                            badgeText={route.routeNumber}
                                            title={route.title}
                                            subtitle={route.operatingHours}
                                            onPress={() => router.push(`/route/${route.id}`)}
                                            hasAnnouncement={route.hasAnnouncement}
                                        />
                                    )) : (
                                        <Text style={styles.emptyText}>Henüz favori hattınız yok.</Text>
                                    )
                                ) : (
                                    favoriteStops.length > 0 ? favoriteStops.map((stop, index) => {
                                        if (!stop || typeof stop !== 'object') return null;
                                        return (
                                            <FavoriteListItem
                                                key={`${stop?.id || 'stop'}-${index}`}
                                                variant="stop"
                                                badgeText="D"
                                                title={stop.name || 'Bilinmeyen Durak'}
                                                metaLabel={`Durak ID: ${stop.id || '-'}`}
                                                subtitle={`Lat: ${Number(stop.latitude || 0).toFixed(2)} - Lon: ${Number(stop.longitude || 0).toFixed(2)}`}
                                                onPress={() => handlePressStop({ ...stop, distanceMeters: 0 })}
                                            />
                                        );
                                    }) : (
                                        <Text style={styles.emptyText}>Favori durak yok</Text>
                                    )
                                )}
                            </TabbedList>
                        </View>
                    </ScrollView>

                    {/* Arama Motoru Overlay'ı */}
                    <HomeSearchOverlay
                        searchQuery={searchQuery}
                        onClose={() => setSearchQuery('')}
                        onPressRoute={handlePressRoute}
                        onPressStop={handlePressStop}
                        allStops={allStops}
                    />
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    safeArea: {
        flex: 1,
    },
    contentWrapper: {
        flex: 1,
        position: 'relative',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Spacing.xxl,
    },
    sectionHeader: {
        paddingHorizontal: Spacing.base,
        marginTop: Spacing.xl,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.textPrimary,
    },
    actionCardsScroll: {
        paddingHorizontal: Spacing.base,
    },
    cardGap: {
        width: Spacing.sm,
    },
    favoritesSection: {
        flex: 1,
        marginTop: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.xl,
    },
});
