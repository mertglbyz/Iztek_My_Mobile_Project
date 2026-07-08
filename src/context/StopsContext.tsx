import { getStops } from '@/services/transportApi';
import { BusStop } from '@/types';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface StopsContextType {
    stops: BusStop[];
    isLoadingStops: boolean;
}

const StopsContext = createContext<StopsContextType | null>(null);

export function StopsProvider({ children }: { children: React.ReactNode }) {
    const [stops, setStops] = useState<BusStop[]>([]);
    const [isLoadingStops, setIsLoadingStops] = useState(true);

    useEffect(() => {
        const loadStops = async () => {
            const data = await getStops();
            setStops(data);
            setIsLoadingStops(false);
        };
        loadStops();
    }, []);

    return (
        <StopsContext.Provider value={{ stops, isLoadingStops }}>
            {children}
        </StopsContext.Provider>
    );
}

export function useStops() {
    const context = useContext(StopsContext);
    if (!context) throw new Error('useStops must be used within StopsProvider');
    return context;
}
