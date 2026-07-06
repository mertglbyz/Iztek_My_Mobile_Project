import { BusStop, FavoritesContextType } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const FAVORITES_KEY = '@durak_yakinimda:favorites';

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favorites, setFavorites] = useState<BusStop[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Uygulama açılışında favorileri yükle
    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            const stored = await AsyncStorage.getItem(FAVORITES_KEY);
            if (stored) {
                setFavorites(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Favoriler yüklenemedi:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveFavorites = async (newFavorites: BusStop[]) => {
        try {
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
        } catch (error) {
            console.error('Favoriler kaydedilemedi:', error);
        }
    };

    const addFavorite = useCallback(async (stop: BusStop) => {
        setFavorites((prev) => {
            const alreadyExists = prev.some((s) => s.id === stop.id);
            if (alreadyExists) return prev;
            const updated = [...prev, { ...stop, isFavorite: true }];
            saveFavorites(updated);
            return updated;
        });
    }, []);

    const removeFavorite = useCallback(async (stopId: number) => {
        setFavorites((prev) => {
            const updated = prev.filter((s) => s.id !== stopId);
            saveFavorites(updated);
            return updated;
        });
    }, []);

    const isFavorite = useCallback(
        (stopId: number) => favorites.some((s) => s.id === stopId),
        [favorites]
    );

    return (
        <FavoritesContext.Provider
            value={{ favorites, addFavorite, removeFavorite, isFavorite, isLoading }}
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
