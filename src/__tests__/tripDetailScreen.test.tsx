import TripDetailScreen from '@/app/trip/[resultId]';
import React from 'react';
import renderer from 'react-test-renderer';

// Mock Expo Router
jest.mock('expo-router', () => ({
    useLocalSearchParams: jest.fn(),
    useRouter: jest.fn(() => ({ back: jest.fn() }))
}));

// Mock Expo Vector Icons (Prevent ES6 SyntaxError in Jest Node env)
jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons'
}));

import { findRoutes } from '@/services/tripPlanner';
import { useLocalSearchParams } from 'expo-router';

// Mock findRoutes
jest.mock('@/services/tripPlanner', () => ({
    findRoutes: jest.fn()
}));

// Mock react-native
jest.mock('react-native', () => ({
    ActivityIndicator: 'ActivityIndicator',
    Animated: {
        View: 'Animated.View',
        Value: jest.fn(() => ({
            interpolate: jest.fn()
        })),
        spring: jest.fn(() => ({ start: jest.fn() })),
        event: jest.fn()
    },
    Dimensions: { get: () => ({ height: 1000, width: 500 }) },
    FlatList: 'FlatList',
    PanResponder: {
        create: jest.fn(() => ({
            panHandlers: {}
        }))
    },
    StyleSheet: { create: (s: any) => s },
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    View: 'View'
}));

// Mock Native Modules (to prevent crashes on other imports)
jest.mock('react-native-maps', () => {
    const React = require('react');
    const MapView = (props: any) => React.createElement('MapView', props, props.children);
    MapView.displayName = 'MapView';
    const Marker = (props: any) => React.createElement('Marker', props, props.children);
    Marker.displayName = 'Marker';
    MapView.Marker = Marker;
    const Polyline = (props: any) => React.createElement('Polyline', props, props.children);
    Polyline.displayName = 'Polyline';
    MapView.Polyline = Polyline;
    return MapView;
});

describe('Trip Detail Screen Tests', () => {

    it('gecersiz veya eksik ID parametresinde ekrani dondurmadan "Rota Sonuclarina Don" uyarisi gosterir', async () => {
        (useLocalSearchParams as jest.Mock).mockReturnValue({
            resultId: null,
            startStopId: '100',
            endStopId: '200'
        });

        (findRoutes as jest.Mock).mockResolvedValue([]);

        const component = renderer.create(React.createElement(TripDetailScreen));

        await renderer.act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        const output = JSON.stringify(component.toJSON());
        expect(output).toContain('Rota hesaplanırken bir hata oluştu veya sonuç bulunamadı.');
        expect(output).toContain('Rota Sonuçlarına Dön');
        component.unmount();
    });

    it('eksik baslangic veya varis duragi parametresi uygulamayi cokertmez, kontrollu hata verir', async () => {
        (useLocalSearchParams as jest.Mock).mockReturnValue({
            resultId: 'some-id',
            startStopId: null, // Eksik
            endStopId: '200'
        });

        (findRoutes as jest.Mock).mockResolvedValue([]);

        const component = renderer.create(React.createElement(TripDetailScreen));

        await renderer.act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        const output = JSON.stringify(component.toJSON());
        expect(output).toContain('Rota hesaplanırken bir hata oluştu veya sonuç bulunamadı');
        component.unmount();
    });

    it('gecerli parametreler bulunmasina ragmen rota bulunamazsa geri donus secenegi sunar', async () => {
        (useLocalSearchParams as jest.Mock).mockReturnValue({
            resultId: 'missing-route-id',
            startStopId: '100',
            endStopId: '200'
        });

        // Rota dönmüyor
        (findRoutes as jest.Mock).mockResolvedValue([]);

        const component = renderer.create(React.createElement(TripDetailScreen));

        await renderer.act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        const output = JSON.stringify(component.toJSON());
        expect(output).toContain('Rota hesaplanırken bir hata oluştu veya sonuç bulunamadı');
        expect(output).toContain('Rota Sonuçlarına Dön');
        component.unmount();
    });

    it('shape bulunamadiginda detay ekrani cokmeden uyari gosterir', async () => {
        (useLocalSearchParams as jest.Mock).mockReturnValue({
            resultId: 'valid-id',
            startStopId: '100',
            endStopId: '200'
        });

        // ShapeId null olan bir rota dön
        (findRoutes as jest.Mock).mockResolvedValue([{
            resultId: 'valid-id',
            type: 'direct',
            routeId: '910',
            directionId: '1',
            shapeId: null, // Shape eksik
            boardingStopId: '100',
            alightingStopId: '200',
            segmentStopIds: ['100', '200'],
            stopCount: 2,
            totalStopCount: 2
        }]);

        let component: any;
        await renderer.act(async () => {
            component = renderer.create(React.createElement(TripDetailScreen));
        });

        // Bekleyelim ki map effectleri vs yüklensin
        await renderer.act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        const output = JSON.stringify(component.toJSON());
        expect(output).toContain('GTFS güzergâhı eksik (Kuş uçuşu iptal)');
        component.unmount();
    });

});
