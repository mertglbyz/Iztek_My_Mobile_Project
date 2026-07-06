import { FavoritesProvider } from '@/context/FavoritesContext';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <FavoritesProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </FavoritesProvider>
  );
}
