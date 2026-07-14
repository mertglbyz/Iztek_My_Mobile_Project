# Durak Yakınımda - İzmir Canlı Ulaşım Rehberi

## Projenin Amacı
Bu proje, İzmir ESHOT toplu taşıma Açık Veri Portalı verilerini kullanarak, İzmirliler için konum (GPS) tabanlı; durakları, otobüs seferlerini ve canlı araç hareketlerini takip etmeyi sağlayan, yüksek performanslı ve modern bir mobil uygulamadır.

## Kullanılan Teknolojiler (Teknik Altyapı)
- **Framework:** React Native & Expo
- **Dil:** TypeScript (Sıkı Tip Güvenliği)
- **Harita Sağlayıcısı:** React Native Maps (Apple Maps / Google Maps)
- **State Yönetimi:** Context API ve Native Hooks
- **Optimizasyon Bileşenleri:** `FlatList`, `useMemo`, `useCallback`

## GTFS veri kaynağı
Projeye GTFS (General Transit Feed Specification) entegrasyonu başarıyla sağlanmıştır. İzmir Açık Veri Portalı üzerinden alınan standart transit veriler (`routes.txt`, `stop_times.txt`, vb.) Node.js ile işlenmektedir. Ayrıca canlı veriler için ESHOT servisleri aktif kullanılmaktadır.

## GTFS import süreci
Sistem, bellek tüketimini azaltmak adına derleme öncesi `importGtfs.js` çalıştırılarak optimize edilmektedir:
1. `routes`, `stops`, `trips` parse edilip RAM'e alınır.
2. Tüm seferlerin (Trip) durak sayıları ölçülerek temsilci seferler seçilir.
3. Asenkron parçalı okuma ile tüm veriler minifiye JSON dosyalarına çevrilir.

## Üretilen JSON dosyaları
Geliştirme derleyicisi sonucunda yerleşik olarak üretilen çıktılar (`src/data/gtfs/`):
- `routes.json`: Hat numarası ve ID haritalamaları.
- `route_stops.json`: Her yön (0/1) için rotadaki durak dizilimleri.
- `route_shapes.json`: Yönsel olarak harita geometrileri (Polylines).
- `route_departures.json`: Tüm hatların bugünkü sefer saatleri tablosu.
- `import_report.json`: Import sürecinin rapor logları.

## GTFS ile mevcut ESHOT durak CSV’si arasındaki farklar
Uygulamada önceden `stops.json` ismiyle duran düz liste incelenip, GTFS duraklarıyla kıyaslanmıştır:
- Standart CSV'de 11.783 veri varken, GTFS içerisinde 10.636 durak yer almaktadır (Kullanılmayan/iptal durakların GTFS'te olmaması bir artıdır).
- Eşleşmeyen durak ID'leri için uygulama yedek (fallback) mekanizması ile okuma yapabilmektedir.

## Bilinen veri sınırlamaları
Uygulama baştan aşağı yenilenerek veri seti performansı ölçülü hale getirilmiştir:
- Performans için sınırlandırma uygulanmıştır.
- Rate limit riskini azaltmak için cooldown eklenmiştir.
- Büyük veri setlerinde render yükünü azaltmak için FlatList kullanılmıştır.
- **Stale Direction (Hatalı Yön) Kronik Sorunu:** ESHOT Canlı Araç API'sinin bazı hatlarda araçları yanlış yön etiketiyle (Ghost Bus) dondurduğunu fark ettim. Bu kronik veri kaynağı sorununu çözmek için epey uğraştım. Sisteme "Gerçek-Zamanlı GPS Vektör Takibi (Auto-Director)", "Global Memory State" ve "GPS Jitter Debouncer (Anti-Flicker Koruması)" gibi algoritmalar tasarlayarak entegre ettim. Ancak ESHOT sisteminin ping (veri gönderme) aralıklarındaki istikrarsızlık ve terminaller etrafındaki GPS sinyal yığılmaları nedeniyle tüm denemelerime rağmen verilerdeki sekme kırılmalarında kesin bir neticeye varamadım. Sorunun kaynağı ESHOT Açık Veri portalının temel mimarisine dayandığı için şimdilik çözülemeyen kronik bir limitasyon olarak projede bırakılmıştır.
- **Eksik Kaynak Dosyalar:** ESHOT'un sağladığı mevcut GTFS ZIP arşivi incelendiğinde, entegrasyon için talep edilen `calendar_dates.txt` (özel tatil günleri seferleri) ve `feed_info.txt` (versiyon sürümü ve sağlayıcı bilgisi) veri setinde **bulunmamaktadır**. Bu eksiklik ESHOT Açık Veri Portalı kaynaklı olup uygulamanın kod kalitesiyle bağdaşmamaktadır.

## Veri güncelliği notu
ESHOT GTFS servisi bazı hatlar için anlık veya tam veri sunmayabilir. Kurulan fallback (yedek) mekanizmaları bu durumları sistem çökmeden tolere etse de, uygulamanın doğruluğu ESHOT'un sağladığı arşivin güncelliğine bağlıdır.

## Sonraki faz: Nasıl Giderim / rota planlama
Planlaması yapılan fakat henüz arayüze eklenmeyen `tripPlanner.ts` servisi yazılmıştır. Başlangıç ve varış durakları arası aktarmasız rota analiz testleri servis katmanında tamamlanmış, UI katmanına entegrasyonu bir sonraki faza bırakılmıştır.

## Kurulum ve Test (Geliştiriciler İçin)
1. Terminalden `npm install` komutuyla Expo ve React bağımlılıklarını kurun.
2. GTFS JSON Derleyicisini Çalıştırın: `node src/scripts/importGtfs.js`
3. Uygulamayı Expo üzerinden ayağa kaldırın: `npx expo start`
4. Expo Go uygulaması ile QR barkodu okutarak mobil cihazınızda anında test edebilirsiniz.
