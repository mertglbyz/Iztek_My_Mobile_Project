import { BusRoute, BusStop, FavoritesContextType } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const FAVORITES_STOPS_KEY = '@durak_yakinimda:favorite_stops';
const FAVORITES_ROUTES_KEY = '@durak_yakinimda:favorite_routes';

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favoriteStops, setFavoriteStops] = useState<BusStop[]>([]);
    const [favoriteRoutes, setFavoriteRoutes] = useState<BusRoute[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Uygulama açılışında favorileri yükle
    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            const [storedStops, storedRoutes] = await Promise.all([
                AsyncStorage.getItem(FAVORITES_STOPS_KEY),
                AsyncStorage.getItem(FAVORITES_ROUTES_KEY)
            ]);

            if (storedStops) setFavoriteStops(JSON.parse(storedStops));
            if (storedRoutes) setFavoriteRoutes(JSON.parse(storedRoutes));
        } catch (error) {
            console.error('Favoriler yüklenemedi:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveFavoriteStops = async (newFavorites: BusStop[]) => {
        try {
            await AsyncStorage.setItem(FAVORITES_STOPS_KEY, JSON.stringify(newFavorites));
        } catch (error) {
            console.error('Favori duraklar kaydedilemedi:', error);
        }
    };

    const saveFavoriteRoutes = async (newFavorites: BusRoute[]) => {
        try {
            await AsyncStorage.setItem(FAVORITES_ROUTES_KEY, JSON.stringify(newFavorites));
        } catch (error) {
            console.error('Favori hatlar kaydedilemedi:', error);
        }
    };

    // ----- DURAKLAR İÇİN -----
    const addFavoriteStop = useCallback(async (stop: BusStop) => {
        setFavoriteStops((prev) => {
            const alreadyExists = prev.some((s) => s.id === stop.id);
            if (alreadyExists) return prev;
            const updated = [...prev, { ...stop, isFavorite: true }];
            saveFavoriteStops(updated);
            return updated;
        });
    }, []);

    const removeFavoriteStop = useCallback(async (stopId: number) => {
        setFavoriteStops((prev) => {
            const updated = prev.filter((s) => s.id !== stopId);
            saveFavoriteStops(updated);
            return updated;
        });
    }, []);

    const isFavoriteStop = useCallback(
        (stopId: number) => favoriteStops.some((s) => s.id === stopId),
        [favoriteStops]
    );

    // ----- HATLAR İÇİN -----
    const addFavoriteRoute = useCallback(async (route: BusRoute) => {
        setFavoriteRoutes((prev) => {
            const alreadyExists = prev.some((r) => r.id === route.id);
            if (alreadyExists) return prev;
            const updated = [...prev, { ...route, isFavorite: true }];
            saveFavoriteRoutes(updated);
            return updated;
        });
    }, []);

    const removeFavoriteRoute = useCallback(async (routeId: string) => {
        setFavoriteRoutes((prev) => {
            const updated = prev.filter((r) => r.id !== routeId);
            saveFavoriteRoutes(updated);
            return updated;
        });
    }, []);

    const isFavoriteRoute = useCallback(
        (routeId: string) => favoriteRoutes.some((r) => r.id === routeId),
        [favoriteRoutes]
    );

    return (
        <FavoritesContext.Provider
            value={{
                favoriteStops,
                favoriteRoutes,
                addFavoriteStop,
                removeFavoriteStop,
                isFavoriteStop,
                addFavoriteRoute,
                removeFavoriteRoute,
                isFavoriteRoute,
                isLoading
            }}
        >
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites(): FavoritesContextType {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites, FavoritesProvider içinde kullanılmalıdır');
    }
    return context;
}
