import FocusStatusBar from '@/components/common/FocusStatusBar';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { useStops } from '@/context/StopsContext';
import gtfsStopsRaw from '@/data/gtfs/gtfs_stops.json';
import routeShapesRaw from '@/data/gtfs/route_shapes.json';
import routeStopsRaw from '@/data/gtfs/route_stops.json';
import { getAllDepartures, getRouteName, getRouteVehicles } from '@/services/transportApi';
import { ApiResponseState, ApproachingBus } from '@/types';
import { getStopsForRoute } from '@/utils/routeData';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const routeShapes: Record<string, Record<string, number[][]>> = routeShapesRaw as any;
const routeStopsData: Record<string, Record<string, string[]>> = routeStopsRaw as any;
const gtfsStops: Record<string, { id: string, name: string, lat: number, lon: number }> = gtfsStopsRaw as any;

const CustomPin = ({ iconName, color, size = 12 }: { iconName: string, color: string, size?: number }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size * 2.5, height: size * 2.5 }}>
        <MaterialCommunityIcons name="map-marker" size={size * 2.5} color={color} style={{ position: 'absolute' }} />
        <Ionicons name={iconName as any} size={size * 1.3} color={Colors.white} style={{ position: 'absolute', top: size * 0.3 }} />
    </View>
);

const BusPin = () => (
    <View style={styles.liveBusPin}>
        <Ionicons name="bus" size={14} color={Colors.white} />
    </View>
);

export default function RouteDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>(); // Tıklanan Hat Numarası
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { stops: allStops } = useStops();
    const { addFavoriteRoute, removeFavoriteRoute, isFavoriteRoute } = useFavorites();
    const [routeName, setRouteName] = useState<string>('');

    // Yön 0 var mı? Yoksa Yön 1'i başlat. (Hata 1'in Kesin Çözümü)
    const initialDir = routeStopsData[id] && !routeStopsData[id]['0'] && routeStopsData[id]['1'] ? '1' : '0';
    const [selectedDirection, setSelectedDirection] = useState<string>(initialDir);

    // Madde 7 Gün Geliştirmesi
    const [selectedDayType, setSelectedDayType] = useState<'weekday' | 'saturday' | 'sunday'>('weekday');

    // Seçili yana göre GTFS Duraklarını getir
    const gtfsRouteStops = useMemo(() => {
        const directionData = routeStopsData[id]?.[selectedDirection] || [];
        return directionData.map(stopId => gtfsStops[stopId]).filter(Boolean);
    }, [id, selectedDirection]);

    // GTFS'te hat yoksa: Eski yöntemle durakları bul (Fallback Mechanism for Missing routes like 21)
    const fallbackStops = useMemo(() => getStopsForRoute(id, allStops), [id, allStops]);

    // Nihai ekrana basılacak durak listesi
    const routeStops = (gtfsRouteStops.length > 0 ? gtfsRouteStops : fallbackStops) as any[];

    // Seçili yana ve Hatta ait (Eğer varsa) Polyline Data
    const routeCoords = useMemo(() => {
        const shapeData = routeShapes[id]?.[selectedDirection];
        if (!shapeData) return [];
        return shapeData.map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
    }, [id, selectedDirection]);

    // Madde 7: Bugüne ait o yöndeki ilk hareket saatlerinin tamamı
    const allDepartures = useMemo(() => {
        return getAllDepartures(id, selectedDirection);
    }, [id, selectedDirection]);

    const activeDepartures = allDepartures[selectedDayType] || [];

    // Yön 0 boş ise ve Yön 1 varsa sekme düzeltmesi sadece veriler geldikten sonra kontrol amaçlı
    useEffect(() => {
        if (routeStopsData[id]) {
            const dirs = Object.keys(routeStopsData[id]);
            if (dirs.length > 0 && !dirs.includes(selectedDirection)) {
                setSelectedDirection(dirs[0]);
            }
        }
    }, [id, selectedDirection]);

    useEffect(() => {
        getRouteName(id).then(name => setRouteName(name)).catch(console.warn);
    }, [id]);

    // Canlı Araçlar State Yönetimi
    const [vehiclesState, setVehiclesState] = useState<ApiResponseState<ApproachingBus[]>>({
        isLoading: true,
        isSuccess: false,
        isEmpty: false,
        errorMessage: null,
        data: []
    });

    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [refreshCountdown, setRefreshCountdown] = useState(0);
    const isScrollEnabled = useState(true);
    // Destructuring scroll hack
    const isScrollEnabledVal = isScrollEnabled[0];
    const setIsScrollEnabled = isScrollEnabled[1];

    const isFetchingRef = useRef(false);
    const mapRef = useRef<MapView>(null); // Harita kontrolü için Referans
    const timeListRef = useRef<FlatList>(null);
    const [visibleStops, setVisibleStops] = useState<any[]>([]);
    const [mapReady, setMapReady] = useState(false);
    const [markerCounter, setMarkerCounter] = useState(0);

    // Initial marker rendering fix
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (mapReady) {
            interval = setInterval(() => {
                setMarkerCounter(prev => {
                    if (prev >= 4) {
                        clearInterval(interval);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 500);
        }
        return () => clearInterval(interval);
    }, [mapReady]);

    const [nextDepartureIndex, setNextDepartureIndex] = useState<number>(-1);

    // Otobüs marker'larının render sorunu için özel izleme durumu
    const [busTracksViewChanges, setBusTracksViewChanges] = useState(true);

    useEffect(() => {
        setBusTracksViewChanges(true);
        const timer = setTimeout(() => {
            setBusTracksViewChanges(false);
        }, 1000); // Veri geldikten sonra 1 saniye boyunca render izni ver
        return () => clearTimeout(timer);
    }, [filteredVehicles]);

    // Otomatik odaklama (Auto-Scroll) - Sefer Saatleri İçin
    useEffect(() => {
        if (activeDepartures.length === 0) {
            setNextDepartureIndex(-1);
            return;
        }
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        // En yakın ileriki saatin index'ini bul
        let nextIndex = activeDepartures.findIndex((time: string) => {
            const [h, m] = time.split(':').map(Number);
            return (h * 60 + m) >= currentMins;
        });

        if (nextIndex === -1 && activeDepartures.length > 0) {
            nextIndex = activeDepartures.length - 1; // Hepsi geçtiyse sona git
        }

        setNextDepartureIndex(nextIndex);

        if (nextIndex > 0 && timeListRef.current) {
            setTimeout(() => {
                try {
                    timeListRef.current?.scrollToIndex({ index: nextIndex, animated: true, viewPosition: 0.5 });
                } catch (e) {
                    console.warn('Sefer saatleri scroll hatasi', e);
                }
            }, 600); // Popup çiziminden sonra kaydır
        }
    }, [activeDepartures, selectedDayType, selectedDirection]);

    // 15 Saniyelik Geri Sayım (Cooldown) Efekti
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (refreshCountdown > 0) {
            timer = setTimeout(() => {
                setRefreshCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearTimeout(timer);
    }, [refreshCountdown]);

    // Performans Optimizasyonu: Yüzlerce durağı haritaya yavaş yavaş (chunking) ekle
    useEffect(() => {
        if (!routeStops || routeStops.length === 0 || !mapReady) {
            setVisibleStops([]);
            return;
        }
        
        let currentIndex = 0;
        const chunkSize = 20; // Her 100ms'de 20 durak çiz
        
        // Ekran geçişi (transition) ve harita yüklemesi (native rendering) tamamen bitsin diye bekle
        const initialDelay = setTimeout(() => {
            const interval = setInterval(() => {
                currentIndex += chunkSize;
                setVisibleStops(routeStops.slice(0, currentIndex));
                
                if (currentIndex >= routeStops.length) {
                    clearInterval(interval);
                }
            }, 100);

            return () => clearInterval(interval);
        }, 300);

        return () => clearTimeout(initialDelay);
    }, [routeStops, mapReady]);

    const fetchVehicles = useCallback(async (isAutoRefresh = false) => {
        // Zaten çekiyorsa veya kullanıcı manuel basıp cooldowndaysa iptal et
        if (isFetchingRef.current || (!isAutoRefresh && refreshCountdown > 0)) return;
        isFetchingRef.current = true;

        if (!isAutoRefresh) {
            setRefreshCountdown(15); // Kullanıcı kendi bastıysa 15 sn ceza kes
        }

        setVehiclesState(prev => ({ ...prev, isLoading: true, errorMessage: null }));
        try {
            const data = await getRouteVehicles(id);
            setVehiclesState({
                isLoading: false,
                isSuccess: true,
                isEmpty: data.length === 0,
                errorMessage: null,
                data
            });
            setLastUpdated(new Date());
        } catch (error: any) {
            const isRateLimit = error?.message?.includes('429');
            setVehiclesState({
                isLoading: false,
                isSuccess: false,
                isEmpty: false,
                errorMessage: isRateLimit
                    ? 'Güvenlik Sistemi: Çok fazla istek atıldı. Lütfen 30 saniye bekleyip tekrar deneyin.'
                    : 'Araç konumları alınamadı. Lütfen tekrar deneyin.',
                data: []
            });
        } finally {
            isFetchingRef.current = false;
        }
    }, [id]);

    // Araç listesindeki karta tıklanınca o otobüse (haritada) yakınlaşma
    const handleVehiclePress = useCallback((bus: ApproachingBus) => {
        if (!bus.latitude || !bus.longitude) return;

        mapRef.current?.animateToRegion({
            latitude: bus.latitude as number,
            longitude: bus.longitude as number,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
        }, 800); // 800ms yumuşak geçiş
    }, []);

    // Ekrana ilk girişte ve araçları daha sık güncelle ki Vektör (Hareket yönü) hızlı saptansın!
    useEffect(() => {
        fetchVehicles(true); // Auto-refresh sayılır
        const interval = setInterval(() => fetchVehicles(true), 15000); // UI Perfonmansı ve Canlı Vektör için 15 saniyeye düşürüldü
        return () => clearInterval(interval);
    }, [fetchVehicles]);

    const filteredVehicles = useMemo(() => {
        if (!vehiclesState.data) return [];
        const expectedDirStr = selectedDirection === '0' ? 'Gidiş' : 'Dönüş';

        return vehiclesState.data.filter(bus => {
            if (!bus.latitude || !bus.longitude) return false;
            return String(bus.direction) === expectedDirStr;
        });
    }, [vehiclesState.data, selectedDirection]);

    // Eğer bu numaradan geçen hiçbir durak yoksa (veya geçersiz input ise) Hata Ekranı
    if (routeStops.length === 0) {
        return (
            <View style={[styles.container, styles.centered]}>
                <FocusStatusBar style="dark" />
                <Ionicons name="warning-outline" size={48} color={Colors.error} />
                <Text style={styles.errorText}>Hat bulunamadı veya durak bilgisi yok</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isFavorite = isFavoriteRoute(id);

    const handleToggleFavorite = () => {
        if (isFavorite) {
            removeFavoriteRoute(id);
        } else {
            addFavoriteRoute({
                id,
                routeNumber: id,
                title: `Hat ${id}`,
                operatingHours: gtfsRouteStops.length > 0 ? `GTFS Entegre Rota` : `Eski Veri Sistemi`
            } as any);
        }
    };



    return (
        <View style={styles.container}>
            <FocusStatusBar style="light" />

            {/* HEADER */}
            <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerRouteNumber}>{routeName ? `${id} - ${routeName}` : id}</Text>
                </View>

                <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconButton}>
                    <Ionicons name={isFavorite ? "star" : "star-outline"} size={24} color={isFavorite ? Colors.accent : Colors.white} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={routeStops}
                keyExtractor={(item, index) => `route-stop-${item.id}-${index}`}
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
                showsVerticalScrollIndicator={false}
                scrollEnabled={isScrollEnabledVal}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                ListHeaderComponent={
                    <>
                        {/* AKTİF ARAÇLAR VE HARİTA BÖLÜMÜ (Artık Üstte) */}
                        <View style={[styles.sectionContainer, { paddingTop: Spacing.md, paddingBottom: Spacing.md }]}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Aktif Araçlar</Text>
                                <TouchableOpacity
                                    onPress={() => fetchVehicles(false)}
                                    disabled={vehiclesState.isLoading || refreshCountdown > 0}
                                    style={[
                                        styles.refreshButton,
                                        (vehiclesState.isLoading || refreshCountdown > 0) && { opacity: 0.6 }
                                    ]}
                                >
                                    <Ionicons
                                        name="refresh"
                                        size={18}
                                        color={(vehiclesState.isLoading || refreshCountdown > 0) ? Colors.gray400 : Colors.primary}
                                    />
                                    <Text style={[
                                        styles.refreshText,
                                        (vehiclesState.isLoading || refreshCountdown > 0) && { color: Colors.gray400 }
                                    ]}>
                                        {vehiclesState.isLoading
                                            ? 'Yükleniyor...'
                                            : refreshCountdown > 0
                                                ? `Yenile (${refreshCountdown}s)`
                                                : 'Yenile'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {lastUpdated && (
                                <Text style={styles.lastUpdateText}>
                                    Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </Text>
                            )}

                            {vehiclesState.isLoading && !vehiclesState.data?.length && routeCoords.length === 0 ? (
                                <View style={styles.stateCard}>
                                    <Ionicons name="bus-outline" size={32} color={Colors.gray400} />
                                    <Text style={styles.stateText}>Araç konumları aranıyor...</Text>
                                </View>
                            ) : vehiclesState.errorMessage && routeCoords.length === 0 ? (
                                <View style={[styles.stateCard, { borderColor: Colors.error }]}>
                                    <Ionicons name="warning-outline" size={32} color={Colors.error} />
                                    <Text style={[styles.stateText, { color: Colors.error }]}>{vehiclesState.errorMessage}</Text>
                                </View>
                            ) : (
                                <>
                                    {vehiclesState.isEmpty && (
                                        <Text style={[styles.lastUpdateText, { color: Colors.gray400, marginTop: -Spacing.xs, marginBottom: Spacing.sm }]}>
                                            Şu an hatta aktif araç bulunmuyor, ancak güzergah haritada gösterilmektedir.
                                        </Text>
                                    )}
                                    <View
                                        style={styles.mapContainer}
                                        onTouchStart={() => setIsScrollEnabled(false)}
                                        onTouchEnd={() => setIsScrollEnabled(true)}
                                        onTouchCancel={() => setIsScrollEnabled(true)}
                                    >
                                        <MapView
                                            ref={mapRef}
                                            style={styles.map}
                                            showsCompass={true}
                                            showsUserLocation={true}
                                            showsMyLocationButton={true}
                                            onMapReady={() => setMapReady(true)}
                                            initialRegion={{
                                                latitude: filteredVehicles?.[0]?.latitude || routeCoords[0]?.latitude || 38.4237,
                                                longitude: filteredVehicles?.[0]?.longitude || routeCoords[0]?.longitude || 27.1428,
                                                latitudeDelta: 0.05,
                                                longitudeDelta: 0.05,
                                            }}
                                        >
                                            {routeCoords.length > 0 && (
                                                <Polyline
                                                    coordinates={routeCoords}
                                                    strokeColor="#000000"
                                                    strokeWidth={4}
                                                />
                                            )}
                                            {filteredVehicles?.map((bus, idx) => (
                                                <Marker
                                                    key={`bus-${bus.busId}`}
                                                    coordinate={{ latitude: bus.latitude as number, longitude: bus.longitude as number }}
                                                    tracksViewChanges={busTracksViewChanges}
                                                    onPress={() => {
                                                        mapRef.current?.animateToRegion({
                                                            latitude: bus.latitude as number,
                                                            longitude: bus.longitude as number,
                                                            latitudeDelta: 0.005,
                                                            longitudeDelta: 0.005
                                                        }, 400);
                                                    }}
                                                >
                                                    <BusPin />
                                                    <Callout tooltip>
                                                        <View style={styles.eshotCalloutContainer}>
                                                            <View style={styles.eshotCallout}>
                                                                <View style={[styles.eshotCalloutLeft, { backgroundColor: '#E63946' }]}>
                                                                    <MaterialCommunityIcons name="bus" size={16} color="white" />
                                                                </View>
                                                                <View style={styles.eshotCalloutRight}>
                                                                    <Text style={styles.eshotCalloutId} numberOfLines={1}>{bus.busId}</Text>
                                                                    {bus.direction && <Text style={styles.eshotCalloutName} numberOfLines={1}>Yön: {bus.direction}</Text>}
                                                                </View>
                                                            </View>
                                                            <MaterialCommunityIcons name="menu-down" size={30} color="white" style={styles.eshotCalloutArrow} />
                                                        </View>
                                                    </Callout>
                                                </Marker>
                                            ))}
                                            {visibleStops.map((stop, idx) => {
                                                const lat = Number(stop.lat || stop.latitude);
                                                const lon = Number(stop.lon || stop.longitude);
                                                if (isNaN(lat) || isNaN(lon)) return null;
                                                return (
                                                    <Marker
                                                        key={`stop-${stop.id || stop.stopId}-${idx}`}
                                                        coordinate={{ latitude: lat, longitude: lon }}
                                                        tracksViewChanges={markerCounter < 4}
                                                    >
                                                        <CustomPin iconName="bus" color="#1877F2" size={14} />
                                                        <Callout tooltip onPress={() => router.push(`/stop/${stop.id || stop.stopId}`)}>
                                                            <View style={styles.eshotCalloutContainer}>
                                                                <View style={styles.eshotCallout}>
                                                                    <View style={styles.eshotCalloutLeft}>
                                                                        <Text style={styles.eshotCalloutIndex}>{idx + 1}</Text>
                                                                    </View>
                                                                    <View style={styles.eshotCalloutRight}>
                                                                        <Text style={styles.eshotCalloutId} numberOfLines={1}>{stop.id || stop.stopId}</Text>
                                                                        <Text style={styles.eshotCalloutName} numberOfLines={1}>{stop.name}</Text>
                                                                    </View>
                                                                </View>
                                                                <MaterialCommunityIcons name="menu-down" size={30} color="white" style={styles.eshotCalloutArrow} />
                                                            </View>
                                                        </Callout>
                                                    </Marker>
                                                );
                                            })}
                                        </MapView>
                                    </View>

                                    {/* AKTİF ARAÇLARIN LİSTE (KART) GÖRÜNÜMÜ - Yatay Scroll UI/UX */}
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.vehiclesListHorizontal}
                                    >
                                        {filteredVehicles?.map((bus, idx) => (
                                            <TouchableOpacity
                                                key={`bus-card-${bus.busId}-${idx}`}
                                                style={styles.vehicleCardHorizontal}
                                                onPress={() => handleVehiclePress(bus)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.vehicleIconBox}>
                                                    <Ionicons name="bus" size={16} color={Colors.white} />
                                                </View>
                                                <View style={styles.vehicleInfo}>
                                                    <Text style={styles.vehicleId}>Araç No: {bus.busId}</Text>
                                                    <Text style={styles.vehicleLocation} numberOfLines={1}>
                                                        {bus.direction ? `Yön: ${bus.direction}` : `GPS: ${bus.latitude?.toFixed(2)}, ${bus.longitude?.toFixed(2)}`}
                                                    </Text>
                                                </View>
                                                <View style={styles.liveBadgeSmall}>
                                                    <View style={styles.liveDot} />
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                        {filteredVehicles?.length === 0 && (
                                            <View style={{ padding: Spacing.sm }}>
                                                <Text style={{ color: Colors.textSecondary }}>Bu yönde aktif araç bulunmuyor.</Text>
                                            </View>
                                        )}
                                    </ScrollView>
                                </>
                            )}
                        </View>

                        {/* ALTTA: HAT BİLGİSİ VE SEKMELER */}
                        <View style={[styles.infoCard, { marginTop: 0, marginBottom: Spacing.md }]}>
                            {/* YÖN SEKMELERİ (GTFS TRIPS) SADECE GTFS DATA VARSA GÖSTER */}
                            {routeStopsData[id] && Object.keys(routeStopsData[id]).length > 1 ? (
                                <View style={[styles.tabsContainer, { marginTop: 0, marginBottom: Spacing.md }]}>
                                    {Object.keys(routeStopsData[id]).sort().map(dir => (
                                        <TouchableOpacity
                                            key={`dir-tab-${dir}`}
                                            style={[styles.tabButton, selectedDirection === dir && styles.tabButtonActive]}
                                            onPress={() => setSelectedDirection(dir)}
                                        >
                                            <Text style={[styles.tabButtonText, selectedDirection === dir && styles.tabButtonTextActive]}>
                                                {dir === '0' ? 'Gidiş Yönü' : dir === '1' ? 'Dönüş Yönü' : `Yön ${dir}`}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : gtfsRouteStops.length === 0 ? (
                                <View style={{ marginBottom: Spacing.sm }}>
                                    <Text style={{ fontSize: FontSizes.sm, color: Colors.error, fontWeight: FontWeights.medium }}>
                                        Bu hattın güncel ESHOT GTFS sisteminde durak sıralaması bulunamadı. Aşağıdaki veriler eski sisteme ait yedek verilerdir.
                                    </Text>
                                </View>
                            ) : null}

                            <View style={styles.timeRow}>
                                <Ionicons name="bus-outline" size={16} color={Colors.textSecondary} />
                                <Text style={styles.timeText}>Toplam {routeStops.length} duraktan geçiyor</Text>
                            </View>
                        </View>

                        {/* YENİ (MADDE 7): SEFER SAATLERİ (SADECE GTFS DATA VARSA) */}
                        {routeStopsData[id] && (allDepartures.weekday.length > 0 || allDepartures.saturday.length > 0 || allDepartures.sunday.length > 0) && (
                            <View style={[styles.sectionContainer, { paddingBottom: Spacing.md }]}>
                                <Text style={styles.sectionTitle}>Sefer Saatleri</Text>

                                {allDepartures.isFallback && (
                                    <View style={{ backgroundColor: '#fff3cd', padding: 12, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#ffe69c' }}>
                                        <Text style={{ fontSize: 13, color: '#664d03', fontWeight: 'bold' }}>
                                            ⚠️ GTFS Takvim Süresi Geçmiş
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#664d03', marginTop: 4 }}>
                                            Güncel takvim süresi dolduğu için eski sefer programı gösterilmektedir. Saatler gerçeği yansıtmayabilir.
                                        </Text>
                                    </View>
                                )}

                                {/* GÜN TİPİ SEKMELERİ */}
                                <View style={styles.dayTabsContainer}>
                                    <TouchableOpacity style={[styles.dayTab, selectedDayType === 'weekday' && styles.dayTabActive]} onPress={() => setSelectedDayType('weekday')}>
                                        <Text style={[styles.dayTabText, selectedDayType === 'weekday' && styles.dayTabTextActive]}>Hafta İçi</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.dayTab, selectedDayType === 'saturday' && styles.dayTabActive]} onPress={() => setSelectedDayType('saturday')}>
                                        <Text style={[styles.dayTabText, selectedDayType === 'saturday' && styles.dayTabTextActive]}>Cumartesi</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.dayTab, selectedDayType === 'sunday' && styles.dayTabActive]} onPress={() => setSelectedDayType('sunday')}>
                                        <Text style={[styles.dayTabText, selectedDayType === 'sunday' && styles.dayTabTextActive]}>Pazar</Text>
                                    </TouchableOpacity>
                                </View>

                                {activeDepartures.length > 0 ? (
                                    <FlatList
                                        ref={timeListRef}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        onScrollToIndexFailed={info => {
                                            const wait = new Promise(resolve => setTimeout(resolve, 500));
                                            wait.then(() => {
                                                try {
                                                    timeListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                                                } catch (e) { }
                                            });
                                        }}
                                        style={{ marginTop: Spacing.sm }}
                                        contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.xs }}
                                        data={activeDepartures}
                                        keyExtractor={(item, idx) => `time-${idx}`}
                                        renderItem={({ item: time, index }) => {
                                            const isNext = index === nextDepartureIndex;
                                            return (
                                                <View style={[styles.timeBadge, isNext && { backgroundColor: Colors.primary }]}>
                                                    <Ionicons name="time-outline" size={14} color={isNext ? Colors.white : Colors.primary} style={{ marginRight: 4 }} />
                                                    <Text style={[styles.timeBadgeText, isNext && { color: Colors.white, fontWeight: FontWeights.bold }]}>{time}</Text>
                                                </View>
                                            );
                                        }}
                                    />
                                ) : (
                                    <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.sm }}>
                                        <Text style={{ color: Colors.textSecondary }}>Bu gün tipi için sefer bilgisi bulunamadı.</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* GÜZERGAH BAŞLIĞI */}
                        <View style={[styles.sectionContainer, { paddingBottom: Spacing.md }]}>
                            <Text style={styles.sectionTitle}>Hat Güzergahı</Text>
                        </View>
                    </>
                }
                renderItem={({ item: stop, index }) => {
                    const isFirst = index === 0;
                    const isLast = index === routeStops.length - 1;

                    return (
                        <View style={{ paddingHorizontal: Spacing.base }}>
                            <View style={{ paddingLeft: Spacing.sm }}>
                                <TouchableOpacity
                                    style={styles.timelineItem}
                                    onPress={() => router.push(`/stop/${stop.id}`)}
                                >
                                    <View style={styles.timelineGraphic}>
                                        {!isFirst && <View style={styles.timelineLineTop} />}
                                        <View style={[styles.timelineDot, (isFirst || isLast) && styles.timelineDotActive]} />
                                        {!isLast && <View style={styles.timelineLineBottom} />}
                                    </View>

                                    <View style={styles.timelineContent}>
                                        <Text style={styles.stopName}>{stop.name}</Text>
                                        <Text style={styles.stopDistrict}>ID: {stop.id}</Text>
                                    </View>

                                    <View style={styles.chevronBox}>
                                        <Ionicons name="chevron-forward" size={16} color={Colors.gray200} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
        gap: Spacing.md,
    },
    errorText: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
    },
    backButton: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
    },
    backButtonText: {
        color: Colors.white,
        fontWeight: FontWeights.bold,
    },
    header: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
    },
    stopMarker: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: Colors.white,
        borderWidth: 3,
        borderColor: Colors.primary,
    },
    liveBusPin: {
        backgroundColor: '#E63946',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    eshotCalloutContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    eshotCallout: {
        flexDirection: 'row',
        backgroundColor: 'white',
        overflow: 'hidden',
        borderRadius: 2,
        width: 170,
        height: 44,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    eshotCalloutLeft: {
        width: 36,
        backgroundColor: '#555555',
        justifyContent: 'center',
        alignItems: 'center',
    },
    eshotCalloutIndex: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    eshotCalloutRight: {
        flex: 1,
        paddingHorizontal: 8,
        justifyContent: 'center',
    },
    eshotCalloutId: {
        fontWeight: 'bold',
        fontSize: 13,
        color: '#000',
    },
    eshotCalloutName: {
        fontSize: 11,
        color: '#333',
        marginTop: 1,
    },
    eshotCalloutArrow: {
        marginTop: -14,
    },
    headerRouteNumber: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.extrabold,
        color: Colors.white,
        textAlign: 'center',
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primarySoft,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    timeBadgeText: {
        fontSize: FontSizes.sm,
        color: Colors.textPrimary,
        fontWeight: FontWeights.medium,
    },
    dayTabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.sm,
        gap: Spacing.sm,
    },
    dayTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.gray300,
        borderRadius: BorderRadius.md,
    },
    dayTabActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    dayTabText: {
        fontSize: FontSizes.sm,
        color: Colors.gray700,
        fontWeight: FontWeights.medium,
    },
    dayTabTextActive: {
        color: Colors.white,
    },
    scrollView: {
        flex: 1,
    },
    infoCard: {
        backgroundColor: Colors.white,
        margin: Spacing.base,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.md,
    },
    tabsContainer: {
        flexDirection: 'row',
        marginTop: Spacing.md,
        backgroundColor: Colors.gray100,
        padding: 4,
        borderRadius: BorderRadius.lg,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.md,
    },
    tabButtonActive: {
        backgroundColor: Colors.white,
        ...Shadows.sm,
    },
    tabButtonText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        fontWeight: FontWeights.medium,
    },
    tabButtonTextActive: {
        color: Colors.primaryDark,
        fontWeight: FontWeights.bold,
    },
    routeTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.xs,
    },
    timeText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    sectionContainer: {
        paddingHorizontal: Spacing.base,
        paddingBottom: Spacing.xxxl,
    },
    sectionTitle: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
    },
    // ---- YENİ EKLENEN AKTİF ARAÇLAR STİLLERİ ----
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        backgroundColor: Colors.primarySoft,
        borderRadius: BorderRadius.full,
        gap: 4,
    },
    refreshText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
    },
    lastUpdateText: {
        fontSize: FontSizes.xs,
        color: Colors.textDisabled,
        marginBottom: Spacing.sm,
        textAlign: 'right',
    },
    stateCard: {
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.base,
    },
    stateText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    mapContainer: {
        height: 300,
        width: '100%',
        marginVertical: Spacing.sm,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Colors.gray200,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    busMarker: {
        backgroundColor: Colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
        ...Shadows.sm,
    },
    calloutContainer: {
        backgroundColor: Colors.white,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.md,
        minWidth: 120,
        alignItems: 'center',
    },
    calloutTitle: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    calloutSubtitle: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    vehiclesListHorizontal: {
        gap: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    vehicleCardHorizontal: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
        width: 160,
    },
    vehicleIconBox: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    vehicleInfo: {
        flex: 1,
    },
    vehicleId: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
    },
    vehicleLocation: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    liveBadgeSmall: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Spacing.xs,
    },
    liveDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#EF4444',
    },
    // ---- TİMELİNE STİLLERİ ----
    timeline: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
    },
    timelineItem: {
        flexDirection: 'row',
        minHeight: 56,
        alignItems: 'center',
    },
    timelineGraphic: {
        width: 24,
        alignItems: 'center',
        marginRight: Spacing.md,
        height: '100%',
    },
    timelineLineTop: {
        position: 'absolute',
        top: 0,
        bottom: '50%',
        width: 2,
        backgroundColor: Colors.gray300,
    },
    timelineLineBottom: {
        position: 'absolute',
        top: '50%',
        bottom: 0,
        width: 2,
        backgroundColor: Colors.gray300,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.gray400,
        position: 'absolute',
        top: '50%',
        marginTop: -5,
        zIndex: 1,
    },
    timelineDotActive: {
        backgroundColor: Colors.primary,
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: -6,
    },
    timelineContent: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
        justifyContent: 'center',
    },
    stopName: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.semibold,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    stopDistrict: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    chevronBox: {
        paddingLeft: Spacing.sm,
        justifyContent: 'center',
    }
});
