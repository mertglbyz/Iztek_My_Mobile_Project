import ScreenHeader from '@/components/common/ScreenHeader';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { MOCK_TRIP_SUGGESTIONS } from '@/data/mockRoutes';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function DirectionsScreen() {
    const [origin, setOrigin] = useState('Konak Meydan');
    const [destination, setDestination] = useState('Bostanlı İskele');
    const [showResults, setShowResults] = useState(false);

    const handleSearch = () => {
        Alert.alert('Yakında', 'Rota planlama (Nasıl Giderim) özelliği henüz entegre edilmemiştir.');
        setShowResults(false);
    };

    const swapLocations = () => {
        setOrigin(destination);
        setDestination(origin);
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Nasıl Giderim"
                subtitle="Başlangıç ve varış noktanızı seçin"
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formCard}>
                    <View style={styles.inputRow}>
                        <View style={styles.dotGreen} />
                        <TextInput
                            style={styles.input}
                            value={origin}
                            onChangeText={setOrigin}
                            placeholder="Nereden?"
                            placeholderTextColor={Colors.textDisabled}
                        />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.inputRow}>
                        <View style={styles.dotRed} />
                        <TextInput
                            style={styles.input}
                            value={destination}
                            onChangeText={setDestination}
                            placeholder="Nereye?"
                            placeholderTextColor={Colors.textDisabled}
                        />
                    </View>
                    <TouchableOpacity style={styles.swapButton} onPress={swapLocations}>
                        <Ionicons name="swap-vertical" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.searchButton} onPress={handleSearch} activeOpacity={0.85}>
                    <Ionicons name="search" size={20} color={Colors.white} />
                    <Text style={styles.searchButtonText}>Rota Ara</Text>
                </TouchableOpacity>

                {showResults && (
                    <View style={styles.resultsSection}>
                        <Text style={styles.resultsTitle}>Önerilen Rotalar</Text>
                        {MOCK_TRIP_SUGGESTIONS.map((trip, index) => (
                            <TouchableOpacity key={trip.id} style={styles.tripCard} activeOpacity={0.85}>
                                {index === 0 && (
                                    <View style={styles.bestBadge}>
                                        <Text style={styles.bestBadgeText}>En hızlı</Text>
                                    </View>
                                )}
                                <View style={styles.tripHeader}>
                                    <Text style={styles.tripDuration}>{trip.durationMinutes} dk</Text>
                                    <Text style={styles.tripTransfers}>
                                        {trip.transfers === 0 ? 'Aktarmasız' : `${trip.transfers} aktarma`}
                                    </Text>
                                </View>
                                <Text style={styles.tripSummary}>{trip.summary}</Text>
                                <View style={styles.linesRow}>
                                    {trip.lines.map((line) => (
                                        <View key={line} style={styles.lineBadge}>
                                            <Text style={styles.lineBadgeText}>{line}</Text>
                                        </View>
                                    ))}
                                    <Text style={styles.walkingText}>
                                        · {trip.walkingMinutes} dk yürüme
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
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
    formCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
        position: 'relative',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    dotGreen: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.success,
    },
    dotRed: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.error,
    },
    input: {
        flex: 1,
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
        padding: 0,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.gray200,
        marginLeft: 22,
    },
    swapButton: {
        position: 'absolute',
        right: Spacing.md,
        top: '50%',
        marginTop: -18,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    searchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        marginTop: Spacing.md,
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    searchButtonText: {
        fontSize: FontSizes.base,
        fontWeight: FontWeights.semibold,
        color: Colors.white,
    },
    resultsSection: {
        marginTop: Spacing.xl,
    },
    resultsTitle: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    tripCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
        ...Shadows.sm,
    },
    bestBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.successSoft,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        marginBottom: Spacing.sm,
    },
    bestBadgeText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.semibold,
        color: Colors.success,
    },
    tripHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: Spacing.sm,
        marginBottom: 4,
    },
    tripDuration: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
    },
    tripTransfers: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    tripSummary: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    linesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    lineBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    lineBadgeText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.bold,
        color: Colors.white,
    },
    walkingText: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
});
