# Trip Planner Performans Benchmark Raporu

Algoritma: **findRoutes** (Yürüyüş Desteği Açık)

### Tüm Koşular

| Senaryo | Kategori | Rota Sayısı | Hesaplama Süresi (ms) |
|---|---|---|---|
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 1) | Aktarmasız | 10 | 2.94 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 1) | Yakın Durak Destekli | 10 | 2.58 ms |
| Hava Hastanesi -> Siteler (Run 1) | Aktarmasız | 10 | 1.14 ms |
| Siteler -> Hava Hastanesi (Run 1) | Yakın Durak Destekli | 3 | 1.52 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 1) | Tek Aktarmalı | 1 | 0.03 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 1) | Tek Aktarmalı | 1 | 0.02 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 1) | Tek Aktarmalı | 2 | 0.78 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 1) | Tek Aktarmalı | 3 | 0.80 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 1) | Yakın Durak Destekli | 10 | 0.18 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 1) | Tek Aktarmalı | 2 | 0.04 ms |
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 2) | Aktarmasız | 10 | 2.30 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 2) | Yakın Durak Destekli | 10 | 2.58 ms |
| Hava Hastanesi -> Siteler (Run 2) | Aktarmasız | 10 | 1.15 ms |
| Siteler -> Hava Hastanesi (Run 2) | Yakın Durak Destekli | 3 | 1.44 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 2) | Tek Aktarmalı | 1 | 0.02 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 2) | Tek Aktarmalı | 1 | 0.02 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 2) | Tek Aktarmalı | 2 | 0.33 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 2) | Tek Aktarmalı | 3 | 0.40 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 2) | Yakın Durak Destekli | 10 | 0.12 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 2) | Tek Aktarmalı | 2 | 0.04 ms |
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 3) | Aktarmasız | 10 | 1.94 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 3) | Yakın Durak Destekli | 10 | 2.73 ms |
| Hava Hastanesi -> Siteler (Run 3) | Aktarmasız | 10 | 1.89 ms |
| Siteler -> Hava Hastanesi (Run 3) | Yakın Durak Destekli | 3 | 2.58 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 3) | Tek Aktarmalı | 1 | 0.03 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 3) | Tek Aktarmalı | 1 | 0.03 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 3) | Tek Aktarmalı | 2 | 0.59 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 3) | Tek Aktarmalı | 3 | 0.70 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 3) | Yakın Durak Destekli | 10 | 0.22 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 3) | Tek Aktarmalı | 2 | 0.10 ms |
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 4) | Aktarmasız | 10 | 3.39 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 4) | Yakın Durak Destekli | 10 | 4.12 ms |
| Hava Hastanesi -> Siteler (Run 4) | Aktarmasız | 10 | 2.24 ms |
| Siteler -> Hava Hastanesi (Run 4) | Yakın Durak Destekli | 3 | 1.28 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 4) | Tek Aktarmalı | 1 | 0.02 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 4) | Tek Aktarmalı | 1 | 0.01 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 4) | Tek Aktarmalı | 2 | 0.29 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 4) | Tek Aktarmalı | 3 | 0.36 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 4) | Yakın Durak Destekli | 10 | 0.10 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 4) | Tek Aktarmalı | 2 | 0.03 ms |

### Kategori Bazlı Özet (Min/Ort/Max)

| Kategori | Koşu Sayısı | Min Süre | Ort. Süre | Max Süre |
|---|---|---|---|---|
| **Aktarmasız** | 8 | 1.14 ms | 2.12 ms | 3.39 ms |
| **Tek Aktarmalı** | 20 | 0.01 ms | 0.23 ms | 0.80 ms |
| **Yakın Durak Destekli** | 12 | 0.10 ms | 1.62 ms | 4.12 ms |

### Genel Özet
- 10 farklı durak çifti dört tekrar halinde çalıştırılarak toplam 40 ölçüm alınmıştır.
- Genel Ortalama Süre: **1.03 ms**
- En Yüksek Süre (Zirve): **4.12 ms**
- Zaman Performansı: Ters indeks kullanımı sayesinde hesaplama süreleri milisaniyeler seviyesinde gerçekleşmiştir.
