import { TripPlanResult } from '@/services/tripPlanner';

/**
 * Aktif yolculuğun anlık durumu
 */
export type JourneyState = 
  | 'idle'
  | 'preparing'
  | 'walking_to_boarding'
  | 'waiting_for_boarding'
  | 'on_first_vehicle'
  | 'transferring'
  | 'on_second_vehicle'
  | 'walking_to_destination'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'location_unavailable';

/**
 * GPS Konum Modeli
 */
export interface JourneyLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number | null;
}

/**
 * Aktif Yolculuk Ana Modeli
 */
export interface ActiveJourney {
  /** Benzersiz yolculuk ID'si */
  journeyId: string;
  
  /** Seçilen rotanın detayları */
  route: TripPlanResult;
  
  /** Mevcut yolculuk durumu */
  currentState: JourneyState;
  
  /** İlerleme bilgileri */
  progress: {
    /** Ulaşılan en son durak ID'si */
    currentStopId: string | null;
    /** Sırada beklenen durak ID'si */
    nextStopId: string | null;
    /** O an içinde bulunulan segmentteki (otobüsteki) geçilen durak sayısı */
    passedStopsCount: number;
    /** O an içinde bulunulan segmentteki kalan durak sayısı */
    remainingStopsCount: number;
    /** Toplam yolculukta kalan aktarma sayısı (ör. aktarma yapıldıysa 0) */
    remainingTransfers: number;
    /** Daha önce tetiklenmiş (ve kullanıcıya gösterilmiş) uyarıların ID listesi */
    alertsTriggered: string[];
    /** Consecutive match: Aday durağa kaç ardışık GPS hit geldi */
    consecutiveHits: number;
    /** Consecutive match: Hangi durak indeksine hit verildiği (-1 ise yok) */
    candidateStopIndex: number;
  };
  
  /** Kullanıcının son bilinen konumu */
  lastKnownLocation: JourneyLocation | null;
  
  /** Başlangıç timestamp */
  startedAt: number;
  /** Son güncellenme timestamp */
  updatedAt: number;
}
