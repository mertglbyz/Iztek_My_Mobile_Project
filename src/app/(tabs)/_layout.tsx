import { Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.gray500,
                tabBarStyle: {
                    backgroundColor: Colors.white,
                    borderTopColor: Colors.gray200,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 85 : 65,
                    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Ana Sayfa',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="nearby"
                options={{
                    title: 'Yakındaki',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="location" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="directions"
                options={{
                    title: 'Nasıl Giderim',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="navigate" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="routes"
                options={{
                    title: 'Hatlar',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="bus" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
