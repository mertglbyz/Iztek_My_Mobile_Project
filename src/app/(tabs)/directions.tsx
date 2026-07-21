import ScreenHeader from '@/components/common/ScreenHeader';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import plannerStopsRaw from '@/data/gtfs/planner_stops.json';
import { checkIsGtfsCalendarExpired, getAllRoutes } from '@/services/transportApi';
import { DirectRouteResult, findRoutes, TransferRouteResult, TripPlanResult } from '@/services/tripPlanner';
import { BusStop } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type SearchState = 'idle' | 'searching' | 'results' | 'not_found' | 'error';

export default function DirectionsScreen() {
    const router = useRouter();
    const [stops, setStops] = useState<BusStop[]>([]);
    const [routesCache, setRoutesCache] = useState<{ id: string; name: string }[]>([]);

    const [originStop, setOriginStop] = useState<BusStop | null>(null);
    const [destStop, setDestStop] = useState<BusStop | null>(null);

    const [isFallback, setIsFallback] = useState(false);

    const [originSearch, setOriginSearch] = useState('');
    const [destSearch, setDestSearch] = useState('');

    const [activeInput, setActiveInput] = useState<'origin' | 'dest' | null>(null);
    const [suggestions, setSuggestions] = useState<BusStop[]>([]);

    const [tripResults, setTripResults] = useState<TripPlanResult[]>([]);
    const [searchState, setSearchState] = useState<SearchState>('idle');

    useEffect(() => {
        // Planner durakları: GTFS birleşik kaynağından yükle, BusStop tipine uyumla
        const mapped: BusStop[] = (plannerStopsRaw as any[]).map(s => ({
            id: s.id,
            name: s.name,
            latitude: s.latitude,
            longitude: s.longitude,
            routes: (s.routes || []).map(Number),
        }));
        setStops(mapped);
        getAllRoutes().then(setRoutesCache);

        setIsFallback(checkIsGtfsCalendarExpired());
    }, []);

    const handleSearchInput = (text: string, type: 'origin' | 'dest') => {
        if (type === 'origin') {
            setOriginSearch(text);
            if (originStop && text !== originStop.name) setOriginStop(null);
        } else {
            setDestSearch(text);
            if (destStop && text !== destStop.name) setDestStop(null);
        }

        setActiveInput(type);
        setSearchState('idle');

        if (text.length >= 2) {
            const q = text.toLocaleLowerCase('tr-TR').trim();
            const filtered = stops.filter(s => s.name.toLocaleLowerCase('tr-TR').includes(q) || String(s.id).includes(q)).slice(0, 5);
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const selectStop = (stop: BusStop) => {
        if (activeInput === 'origin') {
            setOriginStop(stop);
            setOriginSearch(stop.name);
        } else {
            setDestStop(stop);
            setDestSearch(stop.name);
        }
        setSuggestions([]);
        setActiveInput(null);
        Keyboard.dismiss();
    };

    const swapLocations = () => {
        const tempStop = originStop;
        const tempSearch = originSearch;
        setOriginStop(destStop);
        setOriginSearch(destSearch);
        setDestStop(tempStop);
        setDestSearch(tempSearch);
        setSearchState('idle');
    };

    const executeSearch = () => {
        if (!originStop || !destStop) {
            return Alert.alert("Seçim Eksik", "Lütfen listeden başlangıç ve varış duraklarını seçiniz.");
        }
        if (originStop.id === destStop.id) {
            return Alert.alert("Geçersiz Rota", "Başlangıç ve varış durağı aynı olamaz.");
        }

        setSearchState('searching');
        setTripResults([]);
        setSuggestions([]);
        setActiveInput(null);
        Keyboard.dismiss();

        // UI thread'in loading state'ini render etmesi için tek bir frame bekletilir
        setTimeout(async () => {
            try {
                const results = await findRoutes(String(originStop.id), String(destStop.id));
                setTripResults(results);
                setSearchState(results.length > 0 ? 'results' : 'not_found');
            } catch (error) {
                console.error(error);
                setSearchState('error');
            }
        }, 50);
    };

    const getRouteNameById = (id: string) => {
        const route = routesCache.find(r => String(r.id) === String(id));
        return route ? route.name : `Hat ${id}`;
    };

    const getStopNameById = (id: string) => {
        const stop = stops.find(s => String(s.id) === String(id));
        return stop ? stop.name : `Durak ${id}`;
    };

    const renderTripCard = ({ item: trip, index: idx }: { item: TripPlanResult, index: number }) => {
        if (trip.type === 'direct') {
            const direct = trip as DirectRouteResult;
            return (
                <TouchableOpacity
                    style={styles.tripCard}
                    onPress={() => router.push(`/trip/${direct.resultId}?startStopId=${originStop?.id || ''}&endStopId=${destStop?.id || ''}` as any)}
                >
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                        {idx === 0 && (
                            <View style={[styles.bestBadge, { backgroundColor: Colors.success, marginBottom: 0 }]}>
                                <Text style={[styles.bestBadgeText, { color: Colors.white }]}>🌟 Önerilen</Text>
                            </View>
                        )}
                        <View style={[styles.bestBadge, { marginBottom: 0 }]}>
                            <Text style={styles.bestBadgeText}>Aktarmasız</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.tripHeader}
                        onPress={() => router.push(`/route/${direct.routeId}`)}
                    >
                        <Text style={styles.tripRouteName}>{direct.routeId} - {getRouteNameById(direct.routeId)}</Text>
                    </TouchableOpacity>
                    {direct.walkingToBoardingMeters ? (
                        <Text style={[styles.tripSummary, { color: Colors.primary }]}>
                            🚶 {getStopNameById(direct.actualBoardingStopId!)} durağına {direct.walkingToBoardingMeters}m yürü
                        </Text>
                    ) : (
                        <Text style={styles.tripSummary}>
                            {getStopNameById(direct.boardingStopId)} durağından bin
                        </Text>
                    )}
                    {direct.walkingFromAlightingMeters ? (
                        <>
                            <Text style={styles.tripSummary}>
                                {getStopNameById(direct.actualAlightingStopId!)} durağında in
                            </Text>
                            <Text style={[styles.tripSummary, { color: Colors.primary }]}>
                                🚶 {getStopNameById(direct.alightingStopId)} noktasına {direct.walkingFromAlightingMeters}m yürü
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.tripSummary}>
                            {getStopNameById(direct.alightingStopId)} durağında in
                        </Text>
                    )}
                    <View style={styles.linesRow}>
                        <Text style={styles.stopCountText}>{direct.stopCount} durak mesafe</Text>
                    </View>
                </TouchableOpacity>
            );
        } else {
            const transfer = trip as TransferRouteResult;
            return (
                <TouchableOpacity
                    style={styles.tripCard}
                    onPress={() => router.push(`/trip/${transfer.resultId}?startStopId=${originStop?.id || ''}&endStopId=${destStop?.id || ''}` as any)}
                >
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                        {idx === 0 && (
                            <View style={[styles.bestBadge, { backgroundColor: Colors.success, marginBottom: 0 }]}>
                                <Text style={[styles.bestBadgeText, { color: Colors.white }]}>🌟 Önerilen</Text>
                            </View>
                        )}
                        <View style={[styles.bestBadge, { backgroundColor: Colors.warningSoft, marginBottom: 0 }]}>
                            <Text style={[styles.bestBadgeText, { color: Colors.warning }]}>1 Aktarma</Text>
                        </View>
                    </View>

                    <TouchableOpacity onPress={() => router.push(`/route/${transfer.firstRouteId}`)}>
                        <Text style={styles.tripRouteName}>{transfer.firstRouteId} numaralı hat</Text>
                    </TouchableOpacity>
                    {transfer.walkingToBoardingMeters ? (
                        <Text style={[styles.tripSummary, { color: Colors.primary }]}>
                            🚶 {getStopNameById(transfer.actualBoardingStopId!)} durağına {transfer.walkingToBoardingMeters}m yürü
                        </Text>
                    ) : (
                        <Text style={styles.tripSummary}>
                            {getStopNameById(transfer.boardingStopId)} durağından bin
                        </Text>
                    )}
                    <Text style={styles.tripSummary}>
                        {getStopNameById(transfer.transferStopId)} yönüne git
                    </Text>

                    <View style={styles.transferZone}>
                        <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
                        <Text style={styles.transferZoneText}>{getStopNameById(transfer.transferStopId)} durağında aktarma yap</Text>
                    </View>

                    <TouchableOpacity onPress={() => router.push(`/route/${transfer.secondRouteId}`)}>
                        <Text style={styles.tripRouteName}>{transfer.secondRouteId} numaralı hat</Text>
                    </TouchableOpacity>

                    {transfer.walkingFromAlightingMeters ? (
                        <>
                            <Text style={styles.tripSummary}>
                                {getStopNameById(transfer.actualAlightingStopId!)} durağında in
                            </Text>
                            <Text style={[styles.tripSummary, { color: Colors.primary }]}>
                                🚶 {getStopNameById(transfer.alightingStopId)} noktasına {transfer.walkingFromAlightingMeters}m yürü
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.tripSummary}>
                            {getStopNameById(transfer.alightingStopId)} durağında in
                        </Text>
                    )}

                    <View style={styles.linesRow}>
                        <Text style={styles.stopCountText}>Toplam {transfer.totalStopCount} durak mesafe</Text>
                    </View>
                </TouchableOpacity>
            );
        }
    };

    const renderHeader = () => (
        <>
            <View style={[styles.formCard, { marginHorizontal: 0, marginTop: 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <View style={[styles.inputRow, activeInput === 'origin' && { zIndex: 50, elevation: 5 }]}>
                            <View style={styles.dotGreen} />
                            <TextInput
                                style={styles.input}
                                value={originSearch}
                                onChangeText={(text) => handleSearchInput(text, 'origin')}
                                onFocus={() => { setActiveInput('origin'); handleSearchInput(originSearch, 'origin'); }}
                                placeholder="Nereden? (Durak adı veya ID girin)"
                                placeholderTextColor={Colors.textDisabled}
                            />
                            {originStop && originSearch === originStop.name && (
                                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                            )}
                            {originSearch.length > 0 && (
                                <TouchableOpacity onPress={() => handleSearchInput('', 'origin')} style={{ padding: 4 }}>
                                    <Ionicons name="close-circle" size={18} color={Colors.textDisabled} />
                                </TouchableOpacity>
                            )}

                            {activeInput === 'origin' && suggestions.length > 0 && (
                                <View style={[styles.dropdown, styles.dropdownFloating]}>
                                    {suggestions.map((s, idx) => (
                                        <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => selectStop(s)}>
                                            <View style={styles.dropdownItemTop}>
                                                <Text style={styles.dropdownStopName} numberOfLines={1}>{s.name}</Text>
                                                <Text style={styles.dropdownStopId}>({s.id})</Text>
                                            </View>
                                            <Text style={styles.dropdownRoutes} numberOfLines={1}>
                                                Hatlar: {s.routes.slice(0, 4).join(', ')} {s.routes.length > 4 ? '...' : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                        <View style={styles.divider} />
                        <View style={[styles.inputRow, activeInput === 'dest' && { zIndex: 50, elevation: 5 }]}>
                            <View style={styles.dotRed} />
                            <TextInput
                                style={styles.input}
                                value={destSearch}
                                onChangeText={(text) => handleSearchInput(text, 'dest')}
                                onFocus={() => { setActiveInput('dest'); handleSearchInput(destSearch, 'dest'); }}
                                placeholder="Nereye? (Durak adı veya ID girin)"
                                placeholderTextColor={Colors.textDisabled}
                            />
                            {destStop && destSearch === destStop.name && (
                                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                            )}
                            {destSearch.length > 0 && (
                                <TouchableOpacity onPress={() => handleSearchInput('', 'dest')} style={{ padding: 4 }}>
                                    <Ionicons name="close-circle" size={18} color={Colors.textDisabled} />
                                </TouchableOpacity>
                            )}

                            {activeInput === 'dest' && suggestions.length > 0 && (
                                <View style={[styles.dropdown, styles.dropdownFloating]}>
                                    {suggestions.map((s, idx) => (
                                        <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => selectStop(s)}>
                                            <View style={styles.dropdownItemTop}>
                                                <Text style={styles.dropdownStopName} numberOfLines={1}>{s.name}</Text>
                                                <Text style={styles.dropdownStopId}>({s.id})</Text>
                                            </View>
                                            <Text style={styles.dropdownRoutes} numberOfLines={1}>
                                                Hatlar: {s.routes.slice(0, 4).join(', ')} {s.routes.length > 4 ? '...' : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={{ paddingLeft: Spacing.sm, justifyContent: 'center' }}>
                        <TouchableOpacity style={styles.swapButton} onPress={swapLocations}>
                            <Ionicons name="swap-vertical" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={[styles.searchButton, { marginHorizontal: 0, marginBottom: Spacing.xl }]} onPress={executeSearch} activeOpacity={0.85}>
                <Ionicons name="search" size={20} color={Colors.white} />
                <Text style={styles.searchButtonText}>Rota Ara</Text>
            </TouchableOpacity>

            {searchState === 'searching' && (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.infoText}>Alternatif Rotalar Hesaplanıyor...</Text>
                </View>
            )}

            {searchState === 'not_found' && (
                <View style={styles.centerBox}>
                    <Ionicons name="bus-outline" size={48} color={Colors.textDisabled} />
                    <Text style={styles.infoText}>Bu duraklar arasında doğrudan veya tek aktarmalı sefer bulunamamıştır.</Text>
                </View>
            )}

            {searchState === 'error' && (
                <View style={styles.centerBox}>
                    <Ionicons name="warning" size={48} color={Colors.error} />
                    <Text style={styles.infoText}>Algoritma taramasında bir hata oluştu.</Text>
                </View>
            )}
        </>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader title="Nasıl Giderim" subtitle="GTFS Tabanlı Rota Planlama" />

            {isFallback && (
                <View style={{ backgroundColor: Colors.warningSoft, padding: Spacing.sm, marginHorizontal: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md }}>
                    <Text style={{ color: Colors.warning, fontSize: FontSizes.sm, textAlign: 'center' }}>
                        ⚠️ GTFS takvim süresi geçmiş olduğu için eski program gösteriliyor.
                    </Text>
                </View>
            )}

            {searchState === 'results' && tripResults.length > 0 && (
                <View style={{ backgroundColor: Colors.primarySoft, padding: Spacing.sm, marginHorizontal: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md }}>
                    <Text style={{ color: Colors.primary, fontSize: FontSizes.sm, textAlign: 'center' }}>
                        ℹ️ Bu sonuçlar planlanmış (statik) GTFS verileridir. Canlı trafik yoğunluğunu veya anlık varış sürelerini (ETA) içermez.
                    </Text>
                </View>
            )}

            <FlatList
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                data={searchState === 'results' ? tripResults : []}
                keyExtractor={(_, index) => index.toString()}
                ListHeaderComponent={<View>{renderHeader()}</View>}
                renderItem={renderTripCard}
            />
        </View>

    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    formCard: {
        backgroundColor: Colors.white,
        margin: Spacing.md,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
        zIndex: 10,
    },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
    dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
    dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.error },
    input: { flex: 1, fontSize: FontSizes.base, color: Colors.textPrimary, padding: Spacing.sm },
    divider: { height: 1, backgroundColor: Colors.gray200, marginLeft: 22, marginVertical: 4 },
    swapButton: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.primarySoft,
        justifyContent: 'center', alignItems: 'center'
    },
    dropdown: {
        backgroundColor: Colors.white,
    },
    dropdownFloating: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.md,
        ...Shadows.md,
        paddingHorizontal: Spacing.sm,
        paddingBottom: Spacing.sm,
        marginTop: 4,
        zIndex: 100,
        elevation: 10
    },
    dropdownItem: {
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    dropdownItemTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    dropdownStopName: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, color: Colors.textPrimary, flexShrink: 1 },
    dropdownStopId: { fontSize: FontSizes.xs, color: Colors.textSecondary },
    dropdownRoutes: { fontSize: FontSizes.xs, color: Colors.primary, marginTop: 2 },
    searchButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md, marginHorizontal: Spacing.md,
        gap: Spacing.sm, ...Shadows.sm, zIndex: 1
    },
    searchButtonText: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold, color: Colors.white },
    scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },
    centerBox: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
    infoText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center' },
    tripCard: {
        backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
        padding: Spacing.md, marginBottom: Spacing.md,
        borderWidth: 1, borderColor: Colors.gray200, ...Shadows.sm,
    },
    bestBadge: { alignSelf: 'flex-start', backgroundColor: Colors.successSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8 },
    bestBadgeText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, color: Colors.success },
    tripHeader: { marginBottom: 4 },
    tripRouteName: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: Colors.primary, marginBottom: 2 },
    tripSummary: { fontSize: FontSizes.sm, color: Colors.textPrimary, marginBottom: 2 },
    transferZone: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primarySoft, padding: Spacing.sm, borderRadius: BorderRadius.sm, marginVertical: Spacing.sm },
    transferZoneText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: FontWeights.medium },
    linesRow: { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.gray200, paddingTop: Spacing.sm },
    stopCountText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontStyle: 'italic' }
});
