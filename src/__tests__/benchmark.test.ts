import { findRoutes } from '@/services/tripPlanner';
import * as fs from 'fs';
import * as path from 'path';

describe('Trip Planner Benchmark', () => {
    it('creates benchmark report for 30 pairs with 4 iterations', async () => {
        const distinctPairs: { start: string, end: string, desc: string, cat?: string }[] = [
            { start: "13569", end: "11261", desc: "Aktarmasız: 13569 -> 11261", cat: "Aktarmasız" },
            { start: "14215", end: "14206", desc: "Aktarmasız: 14215 -> 14206", cat: "Aktarmasız" },
            { start: "52443", end: "50652", desc: "Aktarmasız: 52443 -> 50652", cat: "Aktarmasız" },
            { start: "24310", end: "23128", desc: "Aktarmasız: 24310 -> 23128", cat: "Aktarmasız" },
            { start: "10868", end: "11747", desc: "Aktarmasız: 10868 -> 11747", cat: "Aktarmasız" },
            { start: "51743", end: "51787", desc: "Aktarmasız: 51743 -> 51787", cat: "Aktarmasız" },
            { start: "10952", end: "15917", desc: "Aktarmasız: 10952 -> 15917", cat: "Aktarmasız" },
            { start: "32011", end: "32453", desc: "Aktarmasız: 32011 -> 32453", cat: "Aktarmasız" },
            { start: "30838", end: "30824", desc: "Aktarmasız: 30838 -> 30824", cat: "Aktarmasız" },
            { start: "50599", end: "50957", desc: "Aktarmasız: 50599 -> 50957", cat: "Aktarmasız" },
            { start: "12996", end: "15456", desc: "Tek Aktarmalı: 12996 -> 15456", cat: "Tek Aktarmalı" },
            { start: "11059", end: "12885", desc: "Tek Aktarmalı: 11059 -> 12885", cat: "Tek Aktarmalı" },
            { start: "52337", end: "50598", desc: "Tek Aktarmalı: 52337 -> 50598", cat: "Tek Aktarmalı" },
            { start: "13961", end: "52439", desc: "Tek Aktarmalı: 13961 -> 52439", cat: "Tek Aktarmalı" },
            { start: "30705", end: "30524", desc: "Tek Aktarmalı: 30705 -> 30524", cat: "Tek Aktarmalı" },
            { start: "52305", end: "52143", desc: "Tek Aktarmalı: 52305 -> 52143", cat: "Tek Aktarmalı" },
            { start: "14310", end: "31556", desc: "Tek Aktarmalı: 14310 -> 31556", cat: "Tek Aktarmalı" },
            { start: "32328", end: "31205", desc: "Tek Aktarmalı: 32328 -> 31205", cat: "Tek Aktarmalı" },
            { start: "31966", end: "32453", desc: "Tek Aktarmalı: 31966 -> 32453", cat: "Tek Aktarmalı" },
            { start: "21321", end: "30333", desc: "Tek Aktarmalı: 21321 -> 30333", cat: "Tek Aktarmalı" },
            { start: "11271", end: "50393", desc: "Yürüyüşlü: 11271 -> 50393", cat: "Yakın Durak Destekli" },
            { start: "24353", end: "24045", desc: "Yürüyüşlü: 24353 -> 24045", cat: "Yakın Durak Destekli" },
            { start: "23998", end: "22041", desc: "Yürüyüşlü: 23998 -> 22041", cat: "Yakın Durak Destekli" },
            { start: "11158", end: "16407", desc: "Yürüyüşlü: 11158 -> 16407", cat: "Yakın Durak Destekli" },
            { start: "15950", end: "15513", desc: "Yürüyüşlü: 15950 -> 15513", cat: "Yakın Durak Destekli" },
            { start: "21676", end: "20244", desc: "Yürüyüşlü: 21676 -> 20244", cat: "Yakın Durak Destekli" },
            { start: "13768", end: "11786", desc: "Yürüyüşlü: 13768 -> 11786", cat: "Yakın Durak Destekli" },
            { start: "12701", end: "12223", desc: "Yürüyüşlü: 12701 -> 12223", cat: "Yakın Durak Destekli" },
            { start: "15842", end: "16542", desc: "Yürüyüşlü: 15842 -> 16542", cat: "Yakın Durak Destekli" },
            { start: "23328", end: "30522", desc: "Yürüyüşlü: 23328 -> 30522", cat: "Yakın Durak Destekli" }
        ];

        // 30 farklı durak çiftini 4 kere çalıştırarak toplam 120 ölçüm simüle edelim
        const extendedScenarios: typeof distinctPairs = [];
        for (let i = 0; i < 4; i++) {
            distinctPairs.forEach(s => extendedScenarios.push({ ...s, desc: `${s.desc} (Run ${i + 1})` }));
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
        reportMd += `- Farklı durak çifti sayısı: **${distinctPairs.length}**\n`;
        reportMd += `- Toplam ölçüm sayısı: **${extendedScenarios.length}**\n`;
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
