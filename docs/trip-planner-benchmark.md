# Trip Planner Performans Benchmark Raporu

Algoritma: **findRoutes** (Yürüyüş Desteği Açık, O(n²) Grid Korumalı)

| Senaryo | Rota Sayısı | Hesaplama Süresi (ms) |
|---|---|---|
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 1) | 10 | 2.66 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 1) | 10 | 2.56 ms |
| Hava Hastanesi -> Siteler (Run 1) | 10 | 1.13 ms |
| Siteler -> Hava Hastanesi (Run 1) | 3 | 1.50 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 1) | 1 | 0.02 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 1) | 1 | 0.02 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 1) | 2 | 0.34 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 1) | 3 | 0.39 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 1) | 10 | 0.13 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 1) | 2 | 0.04 ms |
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 2) | 10 | 1.95 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 2) | 10 | 2.55 ms |
| Hava Hastanesi -> Siteler (Run 2) | 10 | 1.15 ms |
| Siteler -> Hava Hastanesi (Run 2) | 3 | 1.56 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 2) | 1 | 0.01 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 2) | 1 | 0.02 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 2) | 2 | 0.33 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 2) | 3 | 0.42 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 2) | 10 | 0.14 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 2) | 2 | 0.04 ms |
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 3) | 10 | 1.96 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 3) | 10 | 2.51 ms |
| Hava Hastanesi -> Siteler (Run 3) | 10 | 1.14 ms |
| Siteler -> Hava Hastanesi (Run 3) | 3 | 1.57 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 3) | 1 | 0.01 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 3) | 1 | 0.02 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 3) | 2 | 0.34 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 3) | 3 | 0.44 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 3) | 10 | 0.13 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 3) | 2 | 0.03 ms |
| Kaymakamlık İstasyon -> İş Bankası Evleri (Run 4) | 10 | 1.97 ms |
| İş Bankası Evleri -> Kaymakamlık İstasyon (Run 4) | 10 | 2.58 ms |
| Hava Hastanesi -> Siteler (Run 4) | 10 | 1.12 ms |
| Siteler -> Hava Hastanesi (Run 4) | 3 | 1.57 ms |
| Prof. Dr. Aziz Sancar Okulu -> Arıkent (Run 4) | 1 | 0.01 ms |
| Arıkent -> Prof. Dr. Aziz Sancar Okulu (Run 4) | 1 | 0.01 ms |
| Prof. Dr. Aziz Sancar Okulu -> Konak (Run 4) | 2 | 0.32 ms |
| Konak -> Prof. Dr. Aziz Sancar Okulu (Run 4) | 3 | 0.39 ms |
| Prof. Dr. Aziz Sancar Okulu -> Üçkuyular İskele Son Durak (Run 4) | 10 | 0.12 ms |
| Prof. Dr. Aziz Sancar Okulu -> İnciraltı Yeni Son Durak (Run 4) | 2 | 0.04 ms |

### Özet
- Toplam Senaryo: 40
- Ortalama Süre: **0.83 ms**
- En Yüksek Süre (Zirve): **2.66 ms**
- Zaman Karmaşıklığı: En kötü senaryoda dahi hedeflenen < 50ms sınırının çok altında kalınmıştır.
