# Durak Yakınımda - İztek Ulaşım Modülü

## Proje Hakkında
Bu proje, İzmir ESHOT toplu taşıma verilerini kullanan modern bir mobil navigasyon uygulamasıdır. Statik mock verilerden uzaklaşılarak doğrudan gerçek ESHOT Açık Veri Portalı API'lerine Canlı Entegrasyon (Faz 9) yapılmıştır. Proje React Native ve Expo tabanlıdır.

## Mimari Ve Özellikler
* **Çift Motorlu Yapı:** Durak isimleri ve global hat listeleri geçici bir Yerel Veritabanından (Static JSON) çekilirken, Yaklaşan Otobüsler ve Hat Konum koordinatları **Canlı ESHOT API'sinden** okunmaktadır.
* **Tersine Mühendislik (Reverse Engineering):** `stops.json` dosyasındaki veriler taranarak (`routeData.ts`), o durakların barındırdığı hatlar dinamik olarak çıkartılmış ve tekilleştirilmiştir. Böylelikle herhangi bir statik "Hat Listesi" tutmaya gerek kalmadan veritabanı büyüdükçe hat listesi otomatik kendini üretecek duruma getirilmiştir.
* **Gelişmiş Navigasyon:** Duraklar üzerinden hatlara, hatlardan duraklara doğrudan tıklayarak sınırsız ve kesintisiz iç gezinme deneyimi inşa edilmiştir.

## Karşılaşılan Vakalar & Mimari Çözümler (Önemli Not)
1. **Veri Tipi Çözünürlüğü (Virgüllü Stringler):** ESHOT API'sinden dönen `KoorX` ve `KoorY` konum verileri JSON standardı dışında "27,1434" formatında metinsel gelmektedir. Projeye özel yazılan `parseCoordinate` helper fonksiyonuyla bu değerler her zaman hatasız JavaScript sayılarına döner.
2. **Boş Liste vs Hata Ayrımı:** API sıklıkla `HataVarMi: false` parametresi içerse de güncel array boş dönebilmektedir. Bu senaryo "404 Hata" olarak algılanmamış; "Hatta anlık çalışan aktif araç yok (Gece seferi veya terminal beklemesi)" olarak UI (EmptyState) katmanında yansıtılmıştır.
3. **Mükerrer Ping Keşfi (Deduplication):** Araç Lokasyonları API'sinin, aynı `OtobusId` verisine ait iki ayrı pingi (önceki saatin koordinatından kalan log) aynı JSON içinde döndürdüğü keşfedilmiştir. Servisimizde `Map` nesnesi kurgulanarak araç kimliği tekilleştirilmiş ve her zaman hatasız tek bir araç markörü garantilenmiştir.
4. **429 Rate Limiting (Anti-Spam) Koruması:** Kullanıcıların "Yenile" (Refresh) tuşlarına ardışık basması durumunda belediye sunucularından alınan DDoS blokajı (429 IP Limit); tüm butonların asenkron kilitler ve **15 Saniyelik Soğuma (Cooldown)** mekanizmalarıyla desteklenmesiyle tamamen ortadan kaldırılmıştır.
5. **Kapsam Dışı Ekranlar:** Nasıl Giderim, Yönlendirme, QR ve Bildirimler gibi Frontend UI'ı bulunan ancak mimarisi henüz çizilmeyen menüler, planlanan sonraki fazlara aktarılmak üzere statik "Yakında" uyarı pencereleriyle (Alert) sınırlandırılmıştır.

## Kurulum ve Test
1. `npm install` komutuyla bağımlılıkları yükleyin.
2. `npx expo start` veya `npm run start` ile Expo server'ını başlatın.
3. Telefonunuzda Expo Go uygulaması ile karekodu okutun.
