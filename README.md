# Durak Yakınımda - İzmir Canlı Ulaşım Rehberi

## Projenin Amacı
Bu proje, İzmir ESHOT toplu taşıma Açık Veri Portalı verilerini kullanarak, İzmirliler için konum (GPS) tabanlı; durakları, otobüs seferlerini ve canlı araç hareketlerini takip etmeyi sağlayan, yüksek performanslı ve modern bir mobil uygulamadır.

## Kullanılan Teknolojiler (Teknik Altyapı)
- **Framework:** React Native & Expo
- **Dil:** TypeScript (Sıkı Tip Güvenliği)
- **Harita Sağlayıcısı:** React Native Maps (Apple Maps / Google Maps)
- **State Yönetimi:** Context API ve Native Hooks
- **Optimizasyon Bileşenleri:** `FlatList`, `useMemo`, `useCallback`

## GTFS Veri Kaynağı
Proje kapsamında GTFS (General Transit Feed Specification) entegrasyonu için ana kapsam tamamlandı. İzmir Açık Veri Portalı üzerinden alınan standart transit veriler (`routes.txt`, `stop_times.txt`, vb.) Node.js ile işlenmektedir. Ayrıca canlı veriler için ESHOT servisleri aktif kullanılmaktadır.

## GTFS Import Süreci
Sistem, bellek tüketimini azaltmak adına derleme öncesi `node src/scripts/importGtfs.js` çalıştırılarak optimize edilmektedir:
1. `routes`, `stops`, `trips` parse edilip RAM'e alınır.
2. Tüm seferlerin (Trip) durak sayıları ölçülerek temsilci seferler seçilir.
3. Her hattın tüm sefer varyantları (pattern) tespit edilip gruplanır.
4. Pattern–trip–shape ilişkisi indekslenerek `pattern_trip_shape_index.json` üretilir.
5. Duraklar arası yürüme mesafesi hesaplanıp `nearby_stops_index.json` üretilir.
6. Asenkron parçalı okuma ile tüm veriler minifiye JSON dosyalarına çevrilir.

## Üretilen JSON Dosyaları (`src/data/gtfs/`)

| Dosya | Açıklama |
|---|---|
| `routes.json` | Hat numarası ve ID haritalamaları |
| `route_stops.json` | Her yön (0/1) için temsilci seferin durak dizilimi (harita görünümü için) |
| `route_shapes.json` | Yönsel harita geometrileri — GTFS shapes.txt'ten üretilen gerçek güzergâh koordinatları |
| `route_patterns.json` | Her hat/yön için benzersiz durak varyantları (pattern) listesi |
| `pattern_trip_shape_index.json` | Pattern → `{ routeId, directionId, representativeTripId, shapeId }` ilişki indeksi |
| `stop_routes_index.json` | Durak → duraktan geçen hatlar ters indeksi (rota planlama için) |
| `nearby_stops_index.json` | Her durağa 150m yarıçap içindeki komşu duraklar (yürüme desteği için) |
| `planner_stops.json` | GTFS durakları birleşik kaynak listesi (planlayıcı için) |
| `gtfs_stops.json` | Ham GTFS stops.txt verisi |
| `route_departures.json` | Tüm hatların sefer saatleri tablosu |
| `service_calendar.json` | GTFS takvim bilgisi (servis günleri) |
| `trips_index.json` | Temsilci sefer → route/direction haritası |
| `import_report.json` | Import sürecinin özet raporu |

> **Not — Shape Optimizasyonu:** `route_shapes.json` içindeki koordinatlar mesafe tabanlı **silinmemiştir**. Viraj ve kavşak çözünürlüklerini korumak için %100 orijinal GTFS nokta sayısı korunup yalnızca 5 ondalık basamağa (≈1.1m hassasiyet) yuvarlanmaktadır.

## GTFS ile Mevcut ESHOT Durak CSV'si Arasındaki Farklar
Uygulamada önceden `stops.json` ismiyle duran düz liste incelenip GTFS duraklarıyla kıyaslanmıştır:
- Eski durak sayısı: 11.783
- GTFS durak sayısı: 11.510
- Eski veri setinde bulunup GTFS'te eşleşmeyen duraklar: 286
- GTFS'te bulunup eski veri setinde eşleşmeyen duraklar: 13
- Tam eşleşen durak: 11.476
- İsim farkı bulunan durak: 3
- Koordinat farkı bulunan durak: 18

## Bilinen Veri Sınırlamaları
- **Eksik GTFS Dosyaları:** ESHOT'un sağladığı mevcut GTFS arşivinde `calendar_dates.txt` (özel tatil seferleri) ve `feed_info.txt` (sürüm/sağlayıcı bilgisi) **bulunmamaktadır**. `agency.txt` okunmuş ve raporlanmış olmakla birlikte UI'da kullanılmamıştır.
- Büyük veri setlerinde render yükünü azaltmak için `FlatList` kullanılmaktadır.
- Rate limit riskini azaltmak için API çağrılarına cooldown uygulanmıştır.

## Veri Güncelliği Notu
ESHOT GTFS servisi bazı hatlar için anlık veya tam veri sunmayabilir. Kurulan fallback mekanizmaları bu durumları çökmeden tolere etse de, uygulamanın doğruluğu ESHOT'un sağladığı arşivin güncelliğine bağlıdır.

> **⚠️ GTFS Takvim Süresi Geçmiş — Fallback Modu Aktif**
>
> Mevcut GTFS arşivinin takvim geçerlilik aralığı **Mayıs 2026'da sona ermiştir**. Uygulama Temmuz 2026 ve sonrasında çalıştığında `getServiceIdsByDayType()` içindeki tarih filtresi (`start_date` / `end_date` kontrolü) otomatik olarak devre dışı bırakılır.
>
> Bu fallback modu etkinken:
> - Sefer saatleri **güncel GTFS takvimine göre hesaplanmaz**; süresi geçmiş arşivdeki tüm servisler gösterilir.
> - Belirlenen haftaiçi/cumartesi/pazar grupları eski servis ID'lerinden türetilir.
> - Geliştirici konsolunda `[transportApi] ⚠️ GTFS takvimi süresi doldu` uyarısı loglanır.
>
> Yeni GTFS arşivi aktarıldığında (`node src/scripts/importGtfs.js`) tarih filtresi otomatik olarak yeniden devreye girer.

## Sefer Saatlerinin Kapsamı ve Kısıtlamalar
Uygulamada gösterilen "Hafta İçi, Cumartesi ve Pazar" sefer saatleri için şu istisnalar geçerlidir:
- Uygulamaya yansıtılan saatler, `stop_times.txt` ve `calendar.txt` verisinden statik olarak üretilmektedir.
- Gösterilen saatler aracın terminalden (hattın ilk durağından) kalktığı **hareket saatleridir**.
- `calendar_dates.txt` eksik olduğundan yılbaşı gibi olağanüstü sefer istisnaları hesaba **katılamamaktadır**.
- Belirtilen saatler kesinlikle **canlı araç tahmini (ETA) değildir**; resmi planlanan program listesidir.

## Rota Planlama (Nasıl Giderim)

Ters indeks yapısı kullanılarak seyahat planlayıcı (Trip Planner) modülü tasarlanmıştır:

- **Aktarmasız Rotalar:** `stop_routes_index.json` ters indeksi üzerinden aday hatlara erişilir; aynı hat ve yön üzerindeki direkt seferler tespit edilir.
- **Tek Aktarmalı Rotalar:** Array intersection mantığı ile iki farklı hattın ortak aktarma durağı bulunur; optimize edilmiş aktarma düğümü hesaplanır.
- **Yakın Durak Desteği:** `nearby_stops_index.json` aracılığıyla 150m yarıçap içindeki komşu duraklar da taranarak yürüyüşlü rotalar önerilir.
- **Sıralama:** Sonuçlar aşağıdaki kurallara göre sıralanır (her kural ayrı ayrı uygulanır, öncelik sırası):
  1. Aktarmasız rotalar tek aktarmalı rotalardan önce gelir
  2. Daha az yaklaşık yürüyüş mesafesi önce listelenir
  3. Eşit yürüyüş mesafesinde daha az toplam durak sayısı önce gelir
  4. Her şey eşitse hat numarasına göre alfabetik sıralama yapılır
- **Performans Benchmark Özeti:** 
  - Farklı durak çifti sayısı: **30**
  - Toplam ölçüm sayısı: **120**
  - Minimum Süre: **0.01 ms**
  - Genel Ortalama Süre: **0.58 ms**
  - Maksimum Süre (Zirve): **10.86 ms**
  - Test Ortamı: **Node.js (Jest) / Yerel Donanım**
  - Test Edilen Commit: **88bc826**
  - *Isınma Maliyeti:* İlk çalıştırmada veri dosyalarının (JSON) belleğe yüklenmesinden kaynaklanan milisaniyelik bir gecikme (cold run) oluşmaktadır, sonraki çağrılarda süreler hemen 0.00ms civarına düşmektedir. (Ayrıntılı rapor `docs/trip-planner-benchmark.md` içinde)

### Faz 11 Kapanış Notları
- **Ters İndeks Kullanımı:** `importGtfs.js` içindeki indeksleme fonksiyonlarıyla derleme anında `stop_routes_index.json` dosyası oluşturulmaktadır.
- **UI Fallback Gösterimi:** `directions.tsx` üzerinde takvim süresi biten GTFS arşivi için uyarı arayüz öğesi eklendi.
- **Değerlendirme Testleri:** 5 test suite içinde toplam 31 otomatik test başarıyla tamamlanmış ve sonuçlar `docs/trip-planner-tests.md` dosyasına kaydedilmiştir.

## Faz 12 – Yolculuk Detay Ekranı ve Gerçek GTFS Güzergâhları

Bu fazda "Nasıl Giderim" ekranındaki rota kartlarına tıklandığında açılan ayrıntılı yolculuk detay ekranı (`src/app/trip/[resultId].tsx`) geliştirilmiştir.

### Yolculuk Detay Ekranının Özellikleri
- Harita üzerinde gerçek GTFS shape segmentleri çizilir (kuş uçuşu veya düz çizgi kullanılmaz)
- Aktarmalı rotada iki otobüs segmenti farklı renklerle görsel olarak ayrıştırılır
- Alt kısmında sürüklenebilir (draggable) zaman çizelgesi gösterilir
- Ekran, yalnızca 3 URL parametresiyle (`resultId`, `startStopId`, `endStopId`) açılır; rotayı yeniden hesaplayarak state'e bağımlılık olmaksızın çalışır
- Shape verisi bulunamadığında harita çizgisi yerine kullanıcıya açık uyarı gösterilir

### GTFS Shape Segmentleri
Servis: `src/services/shapeSegmentService.ts`

`getShapeSegment({ shapeId, boardingStopId, alightingStopId, directionId, routeId })` fonksiyonu:
1. `pattern_trip_shape_index.json` üzerinden `shapeId → routeId/directionId` ters-indeksini kullanır
2. Biniş ve iniş durağına en yakın shape noktasını Haversine mesafesiyle tespit eder
3. Yalnızca bu iki nokta arasındaki koordinat dilimini döndürür
4. Biniş indeksi > iniş indeksi olursa yanlış yön/shape uyarısı loglanır ve boş dizi döner

### Yaya Güzergâh Kısıtlaması
Servis: `src/services/walkingRoutingService.ts` | Sözleşme: `docs/walking-routing-api-contract.md`

Yürüyüş bağlantıları şu anda yaklaşık Haversine mesafesine dayalıdır. Bu değerler **gerçek yaya rotası değildir** ve kullanıcıya açıkça bildirilir:
- Haritada **kesik çizgi** olarak gösterilir
- Zaman çizelgesinde her yürüyüş adımına _"Yaklaşık kuş uçuşu bağlantıdır; gerçek yaya güzergâhı değildir."_ uyarısı eklenir

Gerçek yaya güzergâhı, OSM tabanlı backend routing servisi hazırlandıktan sonra entegre edilecektir.

### Rota Sonuç Modeli
`resultId` her hesaplamada aynı değeri üretecek şekilde hat numarası, yön, pattern ID, gerçek biniş ve iniş durak bilgilerinden türetilen **deterministik** bir anahtar olarak üretilmektedir (rastgele UUID kullanılmaz).

## Kurulum ve Test (Geliştiriciler İçin)
1. `npm install` — Expo ve React bağımlılıklarını kur.
2. `node src/scripts/importGtfs.js` — GTFS JSON dosyalarını derle.
3. `npx expo start` — Uygulamayı geliştirme modunda başlat.
4. Expo Go uygulamasıyla QR kodu okutarak mobil cihazda test et.
5. `npm test` — Jest algoritma ve benchmark testlerini çalıştır.
6. `npx tsc --noEmit` — TypeScript tip kontrolü (0 hata beklenir).
