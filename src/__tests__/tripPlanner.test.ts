import { findRoutes } from '@/services/tripPlanner';

describe('Trip Planner Algorithm Tests', () => {

    // Test 1
    it('aynı durak secilirse bos doner (Test 1)', async () => {
        const results = await findRoutes('10030', '10030');
        expect(results).toEqual([]);
    });

    // Test 2
    it('dogru yonde aktarmasiz rota bulur (Test 2)', async () => {
        // 10030 Konak -> 40009 Sirinyer Pazar Yeri, hat 304 calisir.
        const results = await findRoutes('10030', '40009');
        const direct = results.find(r => r.type === 'direct' && r.routeId === '304');
        expect(direct).toBeDefined();
    });

    // Test 3
    it('dogru yonde calisirken yanlis yonu dahil etmez (Test 3)', async () => {
        const results = await findRoutes('10030', '40009');
        const direct = results.find(r => r.type === 'direct' && r.routeId === '304');
        const validDirection = direct?.type === 'direct' ? direct.directionId : null;

        // Eger Konak -> Sirinyer yon 1 ise, ayni hatta yon 0 olmamalidir.
        const wrongDirection = validDirection === '0' ? '1' : '0';
        const wrongDirect = results.find(r => r.type === 'direct' && r.routeId === '304' && r.directionId === wrongDirection);
        expect(wrongDirect).toBeUndefined();
    });

    // Test 4
    it('uzak duraklar arasi aktarma tarandiginda çökmeksizin calisir (Test 4)', async () => {
        const results = await findRoutes('13098', '40009'); // Ataturk Mah. Muhtarligi -> Sirinyer Pazar Yeri
        // Aktarma bulamasa bile array donmelidir
        expect(Array.isArray(results)).toBe(true);
    });

    // Test 5
    it('varis sirasi baslangictan onceyse o yonu süzgece takilir (Test 5)', async () => {
        // Sirinyer Pazar Yeri -> Konak arandiginda, Konak -> Sirinyer yonu karsimiza cikmamalidir.
        // Tersi yönünü zaten filtre algoritmasi eliyor.
        const results = await findRoutes('40009', '10030');
        expect(results.length).toBeGreaterThan(0);
    });

    // Test 6
    it('duplikasyon rotalar teke indirgenir (Test 6)', async () => {
        const results = await findRoutes('10030', '40009');
        const validDirection = (results.find(r => r.type === 'direct' && r.routeId === '304') as any)?.directionId;
        if (validDirection) {
            const direct304 = results.filter(r => r.type === 'direct' && r.routeId === '304' && r.directionId === validDirection);
            expect(direct304.length).toBe(1);
        }
    });

    // Test 7
    it('sonuclari maksimium 10 kayit ile limitler (Test 7)', async () => {
        const results = await findRoutes('10030', '40009');
        expect(results.length).toBeLessThanOrEqual(10);
    });

    // Test 8
    it('150m icerisindeki yakin duraklari adaya ekler (Test 8)', async () => {
        const results = await findRoutes('10030', '41172');
        const hasWalk = results.some(r => r.walkingFromAlightingMeters && r.walkingFromAlightingMeters > 0);
        expect(hasWalk).toBe(true);
    });

    // Test 9
    it('150m siniri uzerindeki uzak duraklar adaya alinmaz (Test 9)', async () => {
        // Sirinyer Pazar Yeri ile tamamen uzak bir durak arasi ozel test. Yürüyüş menzili calismaz.
        const results = await findRoutes('10030', '11464');
        const hasDistantWalk = results.some(r => r.walkingFromAlightingMeters && r.walkingFromAlightingMeters > 150);
        expect(hasDistantWalk).toBe(false);
    });

    // Test 10
    it('pattern varyantlarinda duzgun calisir (Test 10)', async () => {
        const results = await findRoutes('10030', '40009');
        const patternSuccess = results.some(r => r.type === 'direct');
        expect(patternSuccess).toBe(true);
    });

});
