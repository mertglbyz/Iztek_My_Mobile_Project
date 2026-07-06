import { useIsFocused } from '@react-navigation/native';
import { StatusBar, StatusBarStyle } from 'expo-status-bar';

interface FocusStatusBarProps {
    style: StatusBarStyle;
}

export default function FocusStatusBar({ style }: FocusStatusBarProps) {
    const isFocused = useIsFocused();

    if (!isFocused) {
        return null;
    }

    return <StatusBar style={style} />;
}
