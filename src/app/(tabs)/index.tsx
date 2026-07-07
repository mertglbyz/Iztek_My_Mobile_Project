import FocusStatusBar from '@/components/common/FocusStatusBar';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ActionCard from '@/components/home/ActionCard';
import FavoriteListItem from '@/components/home/FavoriteListItem';
import Header from '@/components/home/Header';
import SearchBar from '@/components/home/SearchBar';
import TabbedList from '@/components/home/TabbedList';

import HomeSearchOverlay from '@/components/home/HomeSearchOverlay';
import StopDetailSheet from '@/components/stops/StopDetailSheet';
import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { BusStopWithDistance } from '@/types';

export default function HomeScreen() {
    const { favoriteRoutes, favoriteStops, removeFavoriteRoute, addFavoriteStop, removeFavoriteStop, isFavoriteStop } = useFavorites();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    const [selectedStop, setSelectedStop] = useState<BusStopWithDistance | null>(null);

    const handlePressRoute = (routeId: string) => {
        setSearchQuery('');
        router.push(`/route/${routeId}`);
    };

    const handlePressStop = (stop: BusStopWithDistance) => {
        setSearchQuery('');
        setSelectedStop(stop);
    };

    return (
        <View style={styles.container}>
            <FocusStatusBar style="dark" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <Header userName="Mert" />
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onPressQr={() => console.log('QR tarayıcı açıldı')}
                />
                <HomeSearchOverlay
                    searchQuery={searchQuery}
                    onClose={() => setSearchQuery('')}
                    onPressRoute={handlePressRoute}
                    onPressStop={handlePressStop}
                />

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
                            onPress={() => router.push('/(tabs)/directions')}
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
                                favoriteRoutes.length > 0 ? favoriteRoutes.map((route) => (
                                    <FavoriteListItem
                                        key={route.id}
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
                                favoriteStops.length > 0 ? favoriteStops.map((stop) => (
                                    <FavoriteListItem
                                        key={stop.id}
                                        variant="stop"
                                        badgeText="D"
                                        title={stop.name}
                                        metaLabel={`Durak ID: ${stop.id}`}
                                        subtitle={stop.district}
                                        onPress={() => handlePressStop({ ...stop, distanceMeters: 0 })}
                                    />
                                )) : (
                                    <Text style={styles.emptyText}>Henüz favori durağınız yok.</Text>
                                )
                            )}
                        </TabbedList>
                    </View>
                </ScrollView>

                <StopDetailSheet
                    stop={selectedStop}
                    visible={selectedStop !== null}
                    isFavorite={selectedStop ? isFavoriteStop(selectedStop.id) : false}
                    onClose={() => setSelectedStop(null)}
                    onToggleFavorite={() => {
                        if (selectedStop) {
                            if (isFavoriteStop(selectedStop.id)) {
                                removeFavoriteStop(selectedStop.id);
                            } else {
                                addFavoriteStop(selectedStop);
                            }
                        }
                    }}
                />
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
