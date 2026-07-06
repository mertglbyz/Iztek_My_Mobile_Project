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

import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { BusRoute } from '@/types';

interface FavoriteStopPreview {
    id: number;
    name: string;
    nextArrival: string;
}

export default function HomeScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    const favoriteRoutes: BusRoute[] = [
        {
            id: 'route-72',
            routeNumber: '72',
            title: 'İŞÇİEVLERİ — KONAK',
            operatingHours: '06:05 – 23:12',
            hasAnnouncement: true,
        },
        {
            id: 'route-35',
            routeNumber: '35',
            title: 'KARŞIYAKA — ALSANCAK',
            operatingHours: '06:30 – 23:45',
            hasAnnouncement: false,
        },
    ];

    const favoriteStops: FavoriteStopPreview[] = [
        { id: 12234, name: 'Bostanlı İskele', nextArrival: 'En yakın: 3 dk' },
        { id: 40328, name: 'Karşıyaka İskele', nextArrival: 'En yakın: 7 dk' },
    ];

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
                                favoriteRoutes.map((route) => (
                                    <FavoriteListItem
                                        key={route.id}
                                        variant="route"
                                        badgeText={route.routeNumber}
                                        title={route.title}
                                        subtitle={route.operatingHours}
                                        onPress={() => console.log(`Hat: ${route.routeNumber}`)}
                                        hasAnnouncement={route.hasAnnouncement}
                                        onPressAnnouncement={() => console.log('Duyuru')}
                                    />
                                ))
                            ) : (
                                favoriteStops.map((stop) => (
                                    <FavoriteListItem
                                        key={stop.id}
                                        variant="stop"
                                        badgeText="D"
                                        title={stop.name}
                                        metaLabel={`Durak ID: ${stop.id}`}
                                        subtitle={stop.nextArrival}
                                        onPress={() => console.log(`Durak: ${stop.id}`)}
                                    />
                                ))
                            )}
                        </TabbedList>
                    </View>
                </ScrollView>
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
});
