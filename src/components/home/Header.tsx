import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HeaderProps { }

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
}

export default function Header({ }: HeaderProps) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <Text style={styles.userName}>{getGreeting()}</Text>
                    <Text style={styles.subtitle}>İzmir ulaşımına hoş geldiniz</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                        <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.base,
        paddingTop: Spacing.md,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    textContainer: {
        flex: 1,
        paddingRight: Spacing.md,
    },
    greeting: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.medium,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    userName: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingTop: Spacing.xs,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
});
