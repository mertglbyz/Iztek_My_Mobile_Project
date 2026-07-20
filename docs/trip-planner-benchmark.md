# Trip Planner Performans Benchmark Raporu

Algoritma: **findRoutes** (Yürüyüş Desteği Açık)

### Tüm Koşular

| Senaryo | Kategori | Rota Sayısı | Hesaplama Süresi (ms) |
|---|---|---|---|
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 1) | Aktarmasız | 10 | 3.60 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 1) | Yakın Durak Destekli | 10 | 2.83 ms |
| Hava Hastanesi -> Siteler (Run 1) | Aktarmasız | 10 | 1.22 ms |
| Siteler -> Hava Hastanesi (Run 1) | Yakın Durak Destekli | 3 | 1.53 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 1) | Tek Aktarmalı | 1 | 0.03 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 1) | Tek Aktarmalı | 1 | 0.02 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 1) | Tek Aktarmalı | 2 | 0.34 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 1) | Tek Aktarmalı | 3 | 0.41 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 1) | Yakın Durak Destekli | 10 | 0.14 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 1) | Tek Aktarmalı | 2 | 0.04 ms |
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 2) | Aktarmasız | 10 | 1.97 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 2) | Yakın Durak Destekli | 10 | 2.82 ms |
| Hava Hastanesi -> Siteler (Run 2) | Aktarmasız | 10 | 7.76 ms |
| Siteler -> Hava Hastanesi (Run 2) | Yakın Durak Destekli | 3 | 1.43 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 2) | Tek Aktarmalı | 1 | 0.02 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 2) | Tek Aktarmalı | 1 | 0.01 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 2) | Tek Aktarmalı | 2 | 0.35 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 2) | Tek Aktarmalı | 3 | 0.39 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 2) | Yakın Durak Destekli | 10 | 0.13 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 2) | Tek Aktarmalı | 2 | 0.04 ms |
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 3) | Aktarmasız | 10 | 2.01 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 3) | Yakın Durak Destekli | 10 | 2.65 ms |
| Hava Hastanesi -> Siteler (Run 3) | Aktarmasız | 10 | 1.21 ms |
| Siteler -> Hava Hastanesi (Run 3) | Yakın Durak Destekli | 3 | 1.45 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 3) | Tek Aktarmalı | 1 | 0.02 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 3) | Tek Aktarmalı | 1 | 0.02 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 3) | Tek Aktarmalı | 2 | 0.36 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 3) | Tek Aktarmalı | 3 | 0.49 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 3) | Yakın Durak Destekli | 10 | 0.13 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 3) | Tek Aktarmalı | 2 | 0.04 ms |
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 4) | Aktarmasız | 10 | 2.06 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 4) | Yakın Durak Destekli | 10 | 4.18 ms |
| Hava Hastanesi -> Siteler (Run 4) | Aktarmasız | 10 | 1.50 ms |
| Siteler -> Hava Hastanesi (Run 4) | Yakın Durak Destekli | 3 | 1.98 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 4) | Tek Aktarmalı | 1 | 0.03 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 4) | Tek Aktarmalı | 1 | 0.03 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 4) | Tek Aktarmalı | 2 | 0.56 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 4) | Tek Aktarmalı | 3 | 0.67 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 4) | Yakın Durak Destekli | 10 | 0.20 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 4) | Tek Aktarmalı | 2 | 0.06 ms |

### Kategori Bazlı Özet (Min/Ort/Max)

| Kategori | Koşu Sayısı | Min Süre | Ort. Süre | Max Süre |
|---|---|---|---|---|
| **Aktarmasız** | 8 | 1.21 ms | 2.66 ms | 7.76 ms |
| **Tek Aktarmalı** | 20 | 0.01 ms | 0.20 ms | 0.67 ms |
| **Yakın Durak Destekli** | 12 | 0.13 ms | 1.62 ms | 4.18 ms |

### Genel Özet
- 10 farklı durak çifti dört tekrar halinde çalıştırılarak toplam 40 ölçüm alınmıştır.
- Genel Ortalama Süre: **1.12 ms**
- En Yüksek Süre (Zirve): **7.76 ms**
- Zaman Performansı: Ters indeks kullanımı sayesinde hesaplama süreleri milisaniyeler seviyesinde gerçekleşmiştir.
