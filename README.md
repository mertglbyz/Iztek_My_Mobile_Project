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
  - *Not:* Güzergâh (Shape) optimizasyonunda koordinatlar mesafe tabanlı **silinmemiş**; viraj ve kavşak çözünürlüklerini korumak için, %100 orijinal GTFS noktaları sadece 5 ondalık basamağa (yaklaşık 1.1 Metre hassasiyet) yuvarlanarak optimize edilmiştir. Eski `processPolylines.js` dosyası silinerek işlemler `importGtfs.js` içine tekelleştirilmiştir.
- `route_departures.json`: Tüm hatların bugünkü sefer saatleri tablosu.
- `import_report.json`: Import sürecinin rapor logları.

## GTFS ile mevcut ESHOT durak CSV’si arasındaki farklar
Uygulamada önceden `stops.json` ismiyle duran düz liste incelenip, GTFS duraklarıyla kıyaslanmıştır:
- Eski durak sayısı: 11.783
- GTFS durak sayısı: 11.510
- Eski veri setinde bulunup GTFS’te eşleşmeyen duraklar: 286
- GTFS’te bulunup eski veri setinde eşleşmeyen duraklar: 13
- Tam eşleşen durak: 11.476
- İsim farkı bulunan durak: 3
- Koordinat farkı bulunan durak: 18

## Bilinen veri sınırlamaları
Uygulama baştan aşağı yenilenerek veri seti performansı ölçülü hale getirilmiştir:
- Performans için sınırlandırma uygulanmıştır.
- Rate limit riskini azaltmak için cooldown eklenmiştir.
- Büyük veri setlerinde render yükünü azaltmak için FlatList kullanılmıştır.
- **Eksik ve Kullanılmayan Kaynak Dosyalar:** ESHOT'un sağladığı mevcut GTFS ZIP arşivi incelendiğinde, entegrasyon için talep edilen `calendar_dates.txt` (özel tatil günleri seferleri) ve `feed_info.txt` (versiyon sürümü ve sağlayıcı bilgisi) veri setinde **bulunmamaktadır**. Ayrıca, şirket verilerini barındıran `agency.txt` dosyası okunmuş ve raporlanmış olup; tüm uygulama tek bir kuruma (ESHOT) bağlı lokal bir sistem olduğu için mobile atılacak JSON boyutlarını şişirmemek amacıyla UI tarafında kullanılmamıştır.

## Veri güncelliği notu
ESHOT GTFS servisi bazı hatlar için anlık veya tam veri sunmayabilir. Kurulan fallback (yedek) mekanizmaları bu durumları sistem çökmeden tolere etse de, uygulamanın doğruluğu ESHOT'un sağladığı arşivin güncelliğine bağlıdır.

## Sefer Saatlerinin Kapsamı ve Kısıtlamalar
Uygulamada gösterilen "Hafta İçi, Cumartesi ve Pazar" sefer saatleri için şu istisnalar tamamen geçerlidir:
- Uygulamaya yansıtılan saatler, GTFS içerisindeki `stop_times.txt` ve `calendar.txt` verisinden statik olarak üretilmektedir.
- Ekranda gösterilen saatler rastgele bir durağın değil, aracın terminalden (hattın ilk durağından) kalktığı **hareket saatleridir**.
- `calendar_dates.txt` veritabanı sistemde bulunmadığı/gelmediği için, yılbaşı gibi özel gün veya resmi tatillerdeki olağanüstü sefer istisnaları hesaba **katılamamaktadır**.
- Belirtilen saatler kesinlikle **canlı araç tahmini (ETA) değildir**; resmi planlanan program listesidir.

## Rota Planlama (Nasıl Giderim)
GTFS Ters İndeksleme tabanlı performanslı bir seyahat planlayıcı (Trip Planner) modülü sisteme başarıyla entegre edilmiştir. Sistem mimarisi aşağıdaki temeller üzerine oturtulmuştur:
- **Aktarmasız Rotalar:** O(1) indeks maliyetiyle aynı hat ve yön üzerindeki direkt seferlerin tespit edilmesi.
- **Tek Aktarmalı Rotalar:** Array Intersection mantığı ile, iki farklı hattın esnek kesişimine dayanan optimize edilmiş aktarma düğümlerinin hesaplanması.
- **Kategorik Sıralama:** Listeleme algoritmaları "Aktarmasız" ve "Aktarmalı" olacak şekilde ayrılarak kullanıcının zaman kazancını üst düzeye çıkarmak üzere optimize edilmiştir.
- **Duyarlı (Responsive) Arayüz:** 11.510 durak datası içerisinde gecikmesiz arama sunan Dropdown motoru geliştirilmiş, arayüz elementleri React Native `FlatList` mimarisine oturtularak bellek (RAM) tüketimi asgariye çekilmiştir.

### Faz 10 Teslimiyet Özeti
Mühendisin belirlediği `Teslim Kriterleri` uyarınca sağlanan doğrulamalar:
- **Ters İndeks Kullanımı:** `importGtfs.js` içerisine gömülü ters indeksleme sistemi yazılmış olup, build anında `stop_routes_index.json` dosyası arka planda (O(1)) üretilmektedir.
- **Hata Toleransı ve UI Kartları:** `directions.tsx` üzerinden ekran durumları gerçek GTFS verisi üzerinden modellenerek aktarmalı, aktarmasız ve bulunamadı durumlarına reaksiyon veren UI mimarisi oturtulmuştur.
- **TypeScript Derlemesi:** Rota planlayıcı sınıfları type-safe yapılmış olup, `npx tsc --noEmit` sonucu terminalde **Hatasız (Exit code: 0)** olarak derlenmiştir.
- **Detaylı Algoritma Testleri:** Çapraz geçiş, aynı durak vb. tüm kilitlenme senaryoları belgelenerek `docs/trip-planner-tests.md` dosyasıyla projeye eklenmiştir.

## Kurulum ve Test (Geliştiriciler İçin)
1. Terminalden `npm install` komutuyla Expo ve React bağımlılıklarını kurun.
2. GTFS JSON Derleyicisini Çalıştırın: `node src/scripts/importGtfs.js`
3. Uygulamayı Expo üzerinden ayağa kaldırın: `npx expo start`
4. Expo Go uygulaması ile QR barkodu okutarak mobil cihazınızda anında test edebilirsiniz.
