import { findRoutes } from '@/services/tripPlanner';
import * as fs from 'fs';
import * as path from 'path';

describe('Trip Planner Benchmark', () => {
    it('creates benchmark report for 10 pairs with 4 iterations', async () => {
        const scenarios = [
            // Çeşitli Senaryolar (Aktarmasız, Aktarmalı, veya Yürüyüşlü)
            { start: '50312', end: '50014', desc: 'Kaymakamlık İstasyon -> İş Bankası Evleri' },
            { start: '50014', end: '50312', desc: 'İş Bankası Evleri -> Kaymakamlık İstasyon' },
            { start: '10177', end: '50039', desc: 'Hava Hastanesi -> Siteler' },
            { start: '50039', end: '10177', desc: 'Siteler -> Hava Hastanesi' },
            // Çapraz (Aktarmalı veya Yürüyüşlü) Senaryolar
            { start: '50314', end: '50293', desc: 'Prof. Dr. Aziz Sancar Okulu -> Arıkent' },
            { start: '50293', end: '50314', desc: 'Arıkent -> Prof. Dr. Aziz Sancar Okulu' },
            { start: '50314', end: '16484', desc: 'Prof. Dr. Aziz Sancar Okulu -> Konak' },
            { start: '16484', end: '50314', desc: 'Konak -> Prof. Dr. Aziz Sancar Okulu' },
            { start: '50314', end: '50003', desc: 'Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak' },
            { start: '50314', end: '50219', desc: 'Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak' }
        ];

        // 10 farklı durak çiftini 4 kerede toplam 40 ölçüm simüle edelim
        const extendedScenarios: typeof scenarios = [];
        for (let i = 0; i < 4; i++) {
            scenarios.forEach(s => extendedScenarios.push({ ...s, desc: `${s.desc} (Run ${i + 1})` }));
        }

        let reportMd = `# Trip Planner Performans Benchmark Raporu\n\n`;
        reportMd += `Algoritma: **findRoutes** (Yürüyüş Desteği Açık)\n\n`;

        type Stat = { total: number, count: number, min: number, max: number };
        const stats: Record<string, Stat> = {
            'Aktarmasız': { total: 0, count: 0, min: 9999, max: 0 },
            'Tek Aktarmalı': { total: 0, count: 0, min: 9999, max: 0 },
            'Yakın Durak Destekli': { total: 0, count: 0, min: 9999, max: 0 }
        };

        let totalTime = 0;
        let highestTime = 0;
        let mdRows = [];

        for (const s of extendedScenarios) {
            const t0 = performance.now();
            const results = await findRoutes(s.start, s.end);
            const t1 = performance.now();

            const diff = t1 - t0;
            totalTime += diff;
            if (diff > highestTime) highestTime = diff;

            let category = 'Aktarmasız'; // Default
            if (results.length > 0) {
                const first = results[0];
                const hasWalk = ((first as any).walkingToBoardingMeters > 0) || ((first as any).walkingFromAlightingMeters > 0);
                if (hasWalk) {
                    category = 'Yakın Durak Destekli';
                } else if (first.type === 'transfer') {
                    category = 'Tek Aktarmalı';
                }
            }

            mdRows.push(`| ${s.desc} | ${category} | ${results.length} | ${diff.toFixed(2)} ms |`);

            const catStat = stats[category];
            catStat.count++;
            catStat.total += diff;
            if (diff < catStat.min) catStat.min = diff;
            if (diff > catStat.max) catStat.max = diff;
        }

        const avgTime = totalTime / extendedScenarios.length;

        reportMd += `### Tüm Koşular\n\n`;
        reportMd += `| Senaryo | Kategori | Rota Sayısı | Hesaplama Süresi (ms) |\n`;
        reportMd += `|---|---|---|---|\n`;
        reportMd += mdRows.join('\n') + '\n\n';

        reportMd += `### Kategori Bazlı Özet (Min/Ort/Max)\n\n`;
        reportMd += `| Kategori | Koşu Sayısı | Min Süre | Ort. Süre | Max Süre |\n`;
        reportMd += `|---|---|---|---|---|\n`;

        Object.entries(stats).forEach(([cat, stat]) => {
            if (stat.count > 0) {
                const avg = stat.total / stat.count;
                reportMd += `| **${cat}** | ${stat.count} | ${stat.min.toFixed(2)} ms | ${avg.toFixed(2)} ms | ${stat.max.toFixed(2)} ms |\n`;
            } else {
                reportMd += `| **${cat}** | 0 | - | - | - |\n`;
            }
        });

        reportMd += `\n### Genel Özet\n`;
        reportMd += `- 10 farklı durak çifti dört tekrar halinde çalıştırılarak toplam ${extendedScenarios.length} ölçüm alınmıştır.\n`;
        reportMd += `- Genel Ortalama Süre: **${avgTime.toFixed(2)} ms**\n`;
        reportMd += `- En Yüksek Süre (Zirve): **${highestTime.toFixed(2)} ms**\n`;
        reportMd += `- Zaman Performansı: Ters indeks kullanımı sayesinde hesaplama süreleri milisaniyeler seviyesinde gerçekleşmiştir.\n`;

        const docsDir = path.join(__dirname, '../../docs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }

        fs.writeFileSync(path.join(docsDir, 'trip-planner-benchmark.md'), reportMd, 'utf8');
        expect(avgTime).toBeLessThan(100);
    });
});
