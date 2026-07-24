import React, { createContext, useContext, useEffect, useReducer, useRef, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveJourney, JourneyLocation, JourneyState } from '../types/journey';
import { TripPlanResult } from '@/services/tripPlanner';
import { JourneyConstants } from '@/config/journeyConstants';

const STORAGE_KEY = '@active_journey_v1';

export type JourneyAction = 
  | { type: 'START_JOURNEY'; payload: { route: TripPlanResult, journeyId: string } }
  | { type: 'RESTORE_JOURNEY'; payload: ActiveJourney }
  | { type: 'UPDATE_LOCATION'; payload: JourneyLocation }
  | { type: 'SET_STATE'; payload: JourneyState }
  | { type: 'UPDATE_PROGRESS'; payload: Partial<ActiveJourney['progress']> }
  | { type: 'CANCEL_JOURNEY' }
  | { type: 'COMPLETE_JOURNEY' };

interface ActiveJourneyContextState {
  activeJourney: ActiveJourney | null;
  isLoading: boolean;
  dispatch: React.Dispatch<JourneyAction>;
}

const ActiveJourneyContext = createContext<ActiveJourneyContextState | undefined>(undefined);

/** State'ler ki tamamlanmış veya iptal edilmiş kabul edilir */
const TERMINAL_STATES: JourneyState[] = ['completed', 'cancelled'];

function journeyReducer(state: ActiveJourney | null, action: JourneyAction): ActiveJourney | null {
  switch (action.type) {
    case 'START_JOURNEY': {
      const { route, journeyId } = action.payload;
      
      let remainingTransfers = 0;
      let remainingStopsCount = 0;
      let nextStopId = null;
      
      if (route.type === 'direct') {
        remainingStopsCount = route.segmentStopIds.length;
        nextStopId = route.segmentStopIds[0] || null;
      } else {
        remainingTransfers = 1;
        remainingStopsCount = route.firstSegmentStopIds.length;
        nextStopId = route.firstSegmentStopIds[0] || null;
      }

      return {
        journeyId,
        route,
        currentState: 'preparing',
        progress: {
          currentStopId: null,
          nextStopId,
          passedStopsCount: 0,
          remainingStopsCount,
          remainingTransfers,
          alertsTriggered: [],
          consecutiveHits: 0,
          candidateStopIndex: -1,
        },
        lastKnownLocation: null,
        startedAt: Date.now(),
        updatedAt: Date.now()
      };
    }
    
    case 'RESTORE_JOURNEY':
      return action.payload;
      
    case 'UPDATE_LOCATION':
      if (!state) return null;
      return {
        ...state,
        lastKnownLocation: action.payload,
        updatedAt: Date.now()
      };
      
    case 'SET_STATE':
      if (!state) return null;
      return {
        ...state,
        currentState: action.payload,
        updatedAt: Date.now()
      };
      
    case 'UPDATE_PROGRESS':
      if (!state) return null;
      return {
        ...state,
        progress: { ...state.progress, ...action.payload },
        updatedAt: Date.now()
      };
      
    case 'CANCEL_JOURNEY':
    case 'COMPLETE_JOURNEY':
      return null;
      
    default:
      return state;
  }
}

export const ActiveJourneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeJourney, dispatch] = useReducer(journeyReducer, null);
  const [isLoading, setIsLoading] = React.useState(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSavedState = useRef<JourneyState | null>(null);

  // Uygulama açıldığında AsyncStorage'dan mevcut yolculuğu yükle
  useEffect(() => {
    const loadJourney = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ActiveJourney;
          
          // Tamamlanmış veya iptal edilmiş yolculukları geri yükleme
          if (TERMINAL_STATES.includes(parsed.currentState)) {
            await AsyncStorage.removeItem(STORAGE_KEY);
            return;
          }

          // 12 saatten eski kayıtları otomatik iptal et (Timeout)
          const ageHours = (Date.now() - parsed.updatedAt) / (1000 * 60 * 60);
          if (ageHours > JourneyConstants.MAX_JOURNEY_AGE_HOURS) {
             await AsyncStorage.removeItem(STORAGE_KEY);
          } else {
            dispatch({ type: 'RESTORE_JOURNEY', payload: parsed });
          }
        }
      } catch (e) {
        console.error("Failed to load active journey from storage:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadJourney();
  }, []);

  // Debounced storage sync: Konum güncellemelerinde her 2 saniyede değil,
  // yalnızca state değiştiğinde veya 10 saniyede bir kaydeder.
  const saveToStorage = useCallback(async (journey: ActiveJourney | null) => {
    try {
      if (journey === null) {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(journey));
      }
    } catch (e) {
      console.error("Failed to sync journey state to storage:", e);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    
    // Journey null olduğunda (COMPLETE/CANCEL) hemen kaydet
    if (activeJourney === null) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      saveToStorage(null);
      lastSavedState.current = null;
      return;
    }

    // State değişikliği varsa hemen kaydet (preparing → on_first_vehicle gibi)
    const currentState = activeJourney.currentState;
    if (currentState !== lastSavedState.current) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      saveToStorage(activeJourney);
      lastSavedState.current = currentState;
      return;
    }

    // Konum güncellemesi veya progress güncellemesi — debounce uygula
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      saveToStorage(activeJourney);
    }, JourneyConstants.STORAGE_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [activeJourney, isLoading, saveToStorage]);

  return (
    <ActiveJourneyContext.Provider value={{ activeJourney, isLoading, dispatch }}>
      {children}
    </ActiveJourneyContext.Provider>
  );
};

export const useActiveJourney = () => {
  const context = useContext(ActiveJourneyContext);
  if (context === undefined) {
    throw new Error('useActiveJourney must be used within an ActiveJourneyProvider');
  }
  return context;
};
