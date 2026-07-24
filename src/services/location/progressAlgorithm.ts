import { JourneyLocation } from '@/types/journey';
import { JourneyConstants } from '@/config/journeyConstants';

/**
 * İki koordinat arasındaki mesafeyi metre cinsinden hesaplar (Haversine formülü)
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Dünya yarıçapı (metre)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export interface StopCoordinate {
    id: string;
    latitude: number;
    longitude: number;
}

export interface ProgressResult {
    currentStopId: string | null;
    nextStopId: string | null;
    passedStopsCount: number;
    remainingStopsCount: number;
    /** Bu durağa kaç ardışık GPS hit geldiğini bildirir (consecutive match) */
    consecutiveHits: number;
    /** Eşik içindeyken hangi durak indeksine hit verildiği */
    candidateStopIndex: number;
}

/**
 * Yeni alınan GPS konumu ile durak ilerlemesini hesaplar.
 * 
 * ÖNEMLİ: Consecutive Match mekanizması kullanır. Tek bir GPS spike
 * ile durak geçişi yapılmaz. REQUIRED_CONSECUTIVE_MATCHES kadar ardışık
 * konum güncellemesinde eşik içinde olunması gerekir.
 * 
 * @param location Mevcut cihaz GPS konumu
 * @param stops O anki güzergahın DURAK SIRASINA göre listesi
 * @param currentPassedCount Şu ana kadar kesin geçilmiş durak sayısı
 * @param prevCandidateIndex Önceki GPS güncellemesinde eşik içinde olan durak indeksi (-1 ise yok)
 * @param prevConsecutiveHits Önceki ardışık hit sayısı
 * @returns Yeni ilerleme durumu. Eğer GPS zayıfsa veya değişiklik yoksa null döner.
 */
export function calculateProgress(
    location: JourneyLocation,
    stops: StopCoordinate[],
    currentPassedCount: number,
    prevCandidateIndex: number = -1,
    prevConsecutiveHits: number = 0
): ProgressResult | null {
    // 1. Accuracy (Doğruluk) Kontrolü
    if (location.accuracy > JourneyConstants.MIN_REQUIRED_ACCURACY_METERS) {
        // Konum çok güvensiz, ilerleme algoritmasını çalıştırma
        return null;
    }

    if (!stops || stops.length === 0) return null;

    // Forward-only: Asla currentPassedCount'tan daha önceki bir durağa bakılmaz.
    const startIndex = currentPassedCount;

    // Tüm kalan durakları tara (lookahead sınırı YOK).
    // Forward-only + consecutive match birlikte U-dönüşü sorununu çözer.
    let closestIndex = -1;
    let closestDist = Infinity;

    for (let i = startIndex; i < stops.length; i++) {
        const stop = stops[i];
        const dist = calculateDistanceMeters(location.latitude, location.longitude, stop.latitude, stop.longitude);
        
        if (dist <= JourneyConstants.STOP_REACHED_THRESHOLD_METERS && dist < closestDist) {
            closestDist = dist;
            closestIndex = i;
        }
    }

    // Eşik içinde durak yok — consecutive hit sayacını sıfırla
    if (closestIndex === -1) {
        return {
            currentStopId: currentPassedCount > 0 ? stops[currentPassedCount - 1].id : null,
            nextStopId: startIndex < stops.length ? stops[startIndex].id : null,
            passedStopsCount: currentPassedCount,
            remainingStopsCount: stops.length - currentPassedCount,
            consecutiveHits: 0,
            candidateStopIndex: -1
        };
    }

    // Eşik içinde bir durak bulundu!
    // Aynı durak mı yoksa farklı bir durak mı?
    const isSameCandidate = closestIndex === prevCandidateIndex;
    const newHits = isSameCandidate ? prevConsecutiveHits + 1 : 1;

    // Consecutive match eşiğini geçtik mi?
    if (newHits >= JourneyConstants.REQUIRED_CONSECUTIVE_MATCHES) {
        // Kesinleşti! Bu durağa ulaşıldı.
        const newPassedCount = closestIndex + 1;

        // Eğer zaten aynı passed count ise tekrar güncelleme yapma
        if (newPassedCount === currentPassedCount) {
            return null;
        }

        const currentStopId = stops[closestIndex].id;
        const nextStopId = newPassedCount < stops.length ? stops[newPassedCount].id : null;
        const remainingStopsCount = stops.length - newPassedCount;

        return {
            currentStopId,
            nextStopId,
            passedStopsCount: newPassedCount,
            remainingStopsCount,
            consecutiveHits: newHits,
            candidateStopIndex: closestIndex
        };
    }

    // Henüz yeterli ardışık hit yok — sadece sayacı güncelle
    return {
        currentStopId: currentPassedCount > 0 ? stops[currentPassedCount - 1].id : null,
        nextStopId: startIndex < stops.length ? stops[startIndex].id : null,
        passedStopsCount: currentPassedCount,
        remainingStopsCount: stops.length - currentPassedCount,
        consecutiveHits: newHits,
        candidateStopIndex: closestIndex
    };
}
