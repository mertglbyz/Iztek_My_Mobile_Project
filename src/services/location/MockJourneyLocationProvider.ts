import { ErrorCallback, LocationCallback, LocationProvider } from './LocationProvider';
import { calculateDistanceMeters } from './progressAlgorithm';

export class MockJourneyLocationProvider implements LocationProvider {
    private timer: NodeJS.Timeout | null = null;
    private _isRunning = false;
    private routePoints: { latitude: number; longitude: number }[] = [];
    private getIsPaused: () => boolean;

    private currentSegmentIndex = 0;
    private currentLat = 0;
    private currentLng = 0;

    constructor(
        routePoints: { latitude: number; longitude: number }[],
        getIsPaused: () => boolean = () => false
    ) {
        this.routePoints = routePoints;
        this.getIsPaused = getIsPaused;

        if (routePoints.length > 0) {
            this.currentLat = routePoints[0].latitude;
            this.currentLng = routePoints[0].longitude;
        }
    }

    get isRunning() {
        return this._isRunning;
    }

    async start(onLocation: LocationCallback, onError?: ErrorCallback): Promise<void> {
        if (this._isRunning) return;
        if (this.routePoints.length === 0) {
            if (onError) onError(new Error("No route points provided to mock provider"));
            return;
        }

        this._isRunning = true;
        this.currentSegmentIndex = 0;
        if (this.routePoints.length > 0) {
            this.currentLat = this.routePoints[0].latitude;
            this.currentLng = this.routePoints[0].longitude;
        }

        const SPEED_MPS = 15; // 15 m/s (~54 km/h) simülasyonu
        const TICK_MS = 1000; // Saniyede 1 güncelleme (Gerçekçi GPS sıklığı)
        const distPerTick = SPEED_MPS * (TICK_MS / 1000);

        this.timer = setInterval(() => {
            const isPaused = this.getIsPaused();

            if (!isPaused && this.currentSegmentIndex < this.routePoints.length - 1) {
                // Sonraki noktaya doğru hareket et
                const nextPoint = this.routePoints[this.currentSegmentIndex + 1];
                const distToNext = calculateDistanceMeters(this.currentLat, this.currentLng, nextPoint.latitude, nextPoint.longitude);
                
                if (distToNext <= distPerTick) {
                    // Noktaya ulaştı, doğrudan üstüne otur
                    this.currentLat = nextPoint.latitude;
                    this.currentLng = nextPoint.longitude;
                    this.currentSegmentIndex++;
                } else {
                    // Lineer interpolasyon ile noktalar arası ilerle
                    const ratio = distPerTick / distToNext;
                    this.currentLat += (nextPoint.latitude - this.currentLat) * ratio;
                    this.currentLng += (nextPoint.longitude - this.currentLng) * ratio;
                }
            } else if (this.currentSegmentIndex >= this.routePoints.length - 1) {
                // Rotanın sonuna gelindiyse timer'ı durdur
                this.stop();
                return;
            }

            onLocation({
                latitude: this.currentLat,
                longitude: this.currentLng,
                accuracy: 5, // Mükemmel accuracy simülasyonu
                timestamp: Date.now(),
                speed: isPaused ? 0 : SPEED_MPS
            });

        }, TICK_MS);
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this._isRunning = false;
    }
}
