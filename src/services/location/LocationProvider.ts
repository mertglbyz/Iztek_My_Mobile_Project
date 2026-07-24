import { JourneyLocation } from '@/types/journey';

export type LocationCallback = (location: JourneyLocation) => void;
export type ErrorCallback = (error: Error) => void;

export interface LocationProvider {
    /** Sağlayıcının çalışıp çalışmadığı */
    readonly isRunning: boolean;
    
    /** İzinlerin istenmesi ve konum güncellemelerinin başlatılması */
    start(onLocation: LocationCallback, onError?: ErrorCallback): Promise<void>;
    
    /** Konum takibini durdurur */
    stop(): void;
}
