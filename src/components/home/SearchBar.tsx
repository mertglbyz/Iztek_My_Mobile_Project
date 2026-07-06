import { BorderRadius, Colors, FontSizes, Shadows, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    onPressQr: () => void;
}

export default function SearchBar({ value, onChangeText, onPressQr }: SearchBarProps) {
    return (
        <View style={styles.container}>
            <View style={styles.inputWrapper}>
                <Ionicons name="search-outline" size={20} color={Colors.gray500} />
                <TextInput
                    style={styles.input}
                    placeholder="Hat no, durak adı veya durak ID"
                    placeholderTextColor={Colors.textDisabled}
                    value={value}
                    onChangeText={onChangeText}
                    returnKeyType="search"
                />
                {value.length > 0 && (
                    <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={18} color={Colors.gray400} />
                    </TouchableOpacity>
                )}
            </View>
            <TouchableOpacity style={styles.qrButton} onPress={onPressQr} activeOpacity={0.8}>
                <Ionicons name="qr-code-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.base,
        marginTop: Spacing.lg,
        gap: Spacing.sm,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        height: 48,
        borderWidth: 1,
        borderColor: Colors.gray200,
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    input: {
        flex: 1,
        fontSize: FontSizes.base,
        color: Colors.textPrimary,
        padding: 0,
    },
    qrButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primaryLight,
    },
});
