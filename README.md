# Durak Yakınımda - İzmir Canlı Ulaşım Rehberi

## Projenin Amacı
Bu proje, İzmir ESHOT toplu taşıma Açık Veri Portalı verilerini kullanarak, İzmirliler için konum (GPS) tabanlı; durakları, otobüs seferlerini ve canlı araç hareketlerini takip etmeyi sağlayan, yüksek performanslı ve modern bir mobil uygulamadır.

## Kullanılan Teknolojiler (Teknik Altyapı)
- **Framework:** React Native & Expo
- **Dil:** TypeScript (Sıkı Tip Güvenliği)
- **Harita Sağlayıcısı:** React Native Maps (Apple Maps / Google Maps)
- **State Yönetimi:** Context API ve Native Hooks
- **Optimizasyon Bileşenleri:** `FlatList`, `useMemo`, `useCallback`

## Veri Entegrasyonları (ESHOT)
- **Statik Veritabanı:** 12.000'e yakın İzmir ESHOT otobüs durağı (Performans ve kapsama sorunlarını önlemek adına projeye gömülü `stops.json` statik formatı).
- **Canlı Araç Ağı API:** `https://openapi.izmir.bel.tr/api/iztek/hatotobuskonumlari/{hatNo}`
- **Durağa Yaklaşanlar API:** `https://openapi.izmir.bel.tr/api/iztek/duragayaklasanotobusler/{durakId}`

## Öne Çıkan Özellikler (Faz 9 Teslimi)
Uygulama baştan aşağı yenilenerek tüm veri setini aynı anda (donmadan) çalıştırabilecek stabiliteye getirilmiştir.

- **🗺️ Akıllı Konum (Yakındaki Duraklar) Haritası:** Kullanıcının GPS konumuna göre çevredeki (mesafesi hesaplanan) en yakın duraklar 50 pine kadar süzülür, Apple Maps / Google Maps üzerinden eşzamanlı izlenebilir.
- **🚌 Canlı Hattaki Araçlar:** Hat detayına girildiğinde o hatta çalışan tüm araçlar (Koordinat doğrulama filtresinden geçirilerek) harita üzerinde hareket kabiliyetine büründürülerek gösterilir.
- **📍 Aktif Durak Yaklaşımı:** Herhangi bir durak detayındayken, doğrudan o durağa gelmekte olan araçlar (kalan sefer sayıları ve uzaklıklarıyla) küçük boyutlu dedike bir haritada işlenir.
- **⚡ Anti-Spam (Rate Limit) Koruması:** Kullanıcıların açık veri sunucusunu (429 HTTP Error) aşırı istekle kitlemesini önlemek için "Yenile" butonlarında 15 Saniye askıya alma (Cooldown) ve sayfalardaki background timer'larda Memory Leak süpürücü (Unmount clearTimeout) kullanılmıştır.
- **🚀 Listeleme Performansı:** İzmir'in tamamındaki (11.783 veri) devasa otobüs ağını listelerken yaşanabilecek cihaz donmarı engellenmiş; ScrollView kütüphanesi yerine `FlatList` sanallaştırma mimarisi ve `useMemo` render sınırlandırmaları (Max-50 Item) kurgulanmıştır.
- **⭐ Favori Sistemi:** Kullanıcı sık kullandığı Durak kimliklerini ve hat numaralarını Local veritabanına ya da State üzerine kaydedebilir.

## Kapsam Dışı / Sonraki Aşamalar
Şu an pasif olup (Tıklanıldığında 'Yakında Eklenecek' Alert mesajı ileten) gelecekte entegre edilecek özellikler:
- *Nasıl Giderim?* (Kullanıcı için rota simülatörü)
- *QR Durak Okuyucu* (Durak panosundaki dijital kodları tarama)

## Kurulum ve Test (Geliştiriciler İçin)
1. Proje ana kopyasını bilgisayarınıza klonlayın.
2. Açtığınız terminal üzerinden `npm install` komutuyla Expo ve React bağımlılıklarını kurun.
3. Uygulamayı Expo Development Server aracılığıyla ayağa kaldırmak için terminale `npx expo start` yazın.
4. Çıkan Local IP QR kodunu telefonunuzun Expo Go uygulamasına okutarak mobil cihazınızda anında test edebilirsiniz.
