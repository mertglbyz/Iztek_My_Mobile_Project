# Faz 14: Aktif Yolculuk Takibi ve Durak İlerleme Modu

Bu modül, sadece güzergah planlama özelliği sunan statik bir yapıdan, anlık GPS konumu takibiyle canlı yönlendirme sağlayan dinamik bir yapıya geçişi sağlar.

## Temel Bileşenler
- **ActiveJourneyContext:** Merkezi state yönetimi. React Context üzerinden tüm ekran ve bileşenlere (component) yolculuk verisini ve dispatch metodunu sunar.
- **Location Providers:**
  - `ExpoLocationProvider`: Gerçek dünyadaki cihaz GPS verisini alır.
  - `MockJourneyLocationProvider`: Geliştirme, simülasyon ve otomatik test aşamalarında sahte bir yolculuk oluşturmak için interpolasyon tabanlı (Linear Interpolation - LERP) koordinat akışı sağlar.
- **Progress Algorithm (`calculateProgress`):** GPS konumunu rota üzerindeki duraklarla eşleştirerek sıradaki durağı, geçilen durağı ve ilerleme yüzdesini hesaplar.
- **UI Bileşenleri (`ActiveJourneyScreen` vb.):** Harita, durak listesi, kullanıcı eylem butonları (Bindim, İndim) ve anlık bildirim barından (Toast/Banner) oluşan kullanıcı etkileşim ekranıdır.

## Uygulama Kapsamı
Faz 14, yalnızca *aktif kullanım (foreground)* sırasında yolculukları takip eder. İşletim sistemi kısıtlamaları (iOS/Android pil tasarrufu) ve karmaşıklık nedeniyle *arka plan (background)* konum takibi şimdilik kullanılmamaktadır. GPS dalgalanmalarına (sapmalara) karşı ise mesafe eşikleri ve "Ardışık Eşleşme (Consecutive Hit)" stratejisi kullanılır.
