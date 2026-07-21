import { getShapeSegment } from '@/services/shapeSegmentService';

// Mock routing data
jest.mock('@/data/gtfs/route_shapes.json', () => ({
    'TEST_ROUTE': {
        '1': [
            [38.4, 27.1], // Stop A (Index 0)
            [38.41, 27.11], // arbitrary point
            [38.42, 27.12], // Stop B (Index 2)
            [38.43, 27.13], // arbitrary point
            [38.44, 27.14]  // Stop C (Index 4)
        ]
    }
}));

jest.mock('@/data/gtfs/planner_stops.json', () => [
    { id: 'stopA', name: 'Stop A', latitude: 38.40001, longitude: 27.10001 },
    { id: 'stopB', name: 'Stop B', latitude: 38.42, longitude: 27.12 },
    { id: 'stopC', name: 'Stop C', latitude: 38.44001, longitude: 27.14001 }
]);

describe('Shape Segment Services', () => {

    it('shape kesme fonksiyonu binis ve inis noktalari arasinda koordinat dizisi dondurur', () => {
        // Stop A (Index 0) ile Stop B (Index 2) aralığı
        const segment = getShapeSegment({
            shapeId: null, // Fallback teste zorlansın
            routeId: 'TEST_ROUTE',
            directionId: '1',
            boardingStopId: 'stopA',
            alightingStopId: 'stopB'
        });

        // Beklenen: array of 3 elements (Index 0, 1, 2)
        expect(segment.length).toBe(3);
        expect(segment[0]).toEqual([38.4, 27.1]); // Stop A
        expect(segment[2]).toEqual([38.42, 27.12]); // Stop B
    });

    it('shape kesme fonksiyonu dogru yon sirasini korur (Ters yönde bos doner)', () => {
        // İniş durağı (stopA = Index 0), Biniş durağından (stopB = Index 2) önce geliyorsa
        // Segmentin kesilmesi mantıksızdır, boş dönmelidir.
        const segment = getShapeSegment({
            shapeId: null,
            routeId: 'TEST_ROUTE',
            directionId: '1',
            boardingStopId: 'stopB',
            alightingStopId: 'stopA'
        });

        expect(segment.length).toBe(0);
    });

    it('shape bulunamadiginda bos koordinat dizisi doner', () => {
        const segment = getShapeSegment({
            shapeId: null,
            routeId: 'WRONG_ROUTE',
            directionId: '1',
            boardingStopId: 'stopA',
            alightingStopId: 'stopB'
        });

        expect(segment.length).toBe(0);
    });
});
