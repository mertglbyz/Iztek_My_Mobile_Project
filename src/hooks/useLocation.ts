import { LocationPermissionStatus, UserLocation } from '@/types';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

interface UseLocationResult {
    location: UserLocation | null;
    permissionStatus: LocationPermissionStatus;
    isLoading: boolean;
    error: string | null;
    requestPermission: (skipLoading?: boolean) => Promise<void>;
}

export function useLocation(): UseLocationResult {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('undetermined');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const requestPermission = async (skipLoading = false) => {
        if (!skipLoading) setIsLoading(true);
        setError(null);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setPermissionStatus('granted');
                await fetchLocation();
            } else {
                // If it was already denied before we requested (can be checked via getForegroundPermissionsAsync),
                // but Expo's request function handles it by just returning 'denied' immediately.
                // We'll prompt them to open settings.
                const { canAskAgain } = await Location.getForegroundPermissionsAsync();
                if (!canAskAgain) {
                    Linking.openSettings();
                }
                setPermissionStatus('denied');
                setError('Konum izni reddedildi. Lütfen ayarlardan izin verin.');
            }
        } catch {
            setError('Konum izni alınamadı.');
        } finally {
            if (!skipLoading) setIsLoading(false);
        }
    };

    const fetchLocation = async () => {
        try {
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            setLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
            });
        } catch {
            setError('Konum alınamadı. GPS\'inizin açık olduğundan emin olun.');
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                    setPermissionStatus('granted');
                    await fetchLocation();
                } else {
                    setPermissionStatus(status === 'denied' ? 'denied' : 'undetermined');
                }
            } catch {
                setError('Konum servisi başlatılamadı.');
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    return { location, permissionStatus, isLoading, error, requestPermission };
}
