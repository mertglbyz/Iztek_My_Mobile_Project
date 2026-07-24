import * as Location from 'expo-location';
import { LocationProvider, LocationCallback, ErrorCallback } from './LocationProvider';

export class ExpoLocationProvider implements LocationProvider {
    private subscription: Location.LocationSubscription | null = null;
    private _isRunning = false;

    get isRunning() {
        return this._isRunning;
    }

    async start(onLocation: LocationCallback, onError?: ErrorCallback): Promise<void> {
        if (this._isRunning) return;

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Location permission denied');
            }

            this.subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 2000, // 2 saniyede bir
                    distanceInterval: 5, // 5 metrede bir
                },
                (location) => {
                    onLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy || 100,
                        timestamp: location.timestamp,
                        speed: location.coords.speed
                    });
                }
            );

            this._isRunning = true;
        } catch (error) {
            if (onError && error instanceof Error) {
                onError(error);
            }
            this._isRunning = false;
        }
    }

    stop(): void {
        if (this.subscription) {
            this.subscription.remove();
            this.subscription = null;
        }
        this._isRunning = false;
    }
}
