import { FavoritesProvider } from '@/context/FavoritesContext';
import { StopsProvider } from '@/context/StopsContext';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActiveJourneyProvider } from '@/contexts/ActiveJourneyContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ActiveJourneyProvider>
      <StopsProvider>
        <FavoritesProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </FavoritesProvider>
      </StopsProvider>
    </ActiveJourneyProvider>
  );
}
