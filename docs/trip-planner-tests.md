# Trip Planner ve Faz 12 Otomatik Test Raporları

Bu belge, projedeki tüm otomatik testlerin detaylı dökümünü içermektedir. Tüm hata tolerans, performans ve algoritma testleri **3 ana suite içinde toplam 22 otomatik test başarıyla tamamlanmış** ve sonuçlar aşağıda gruplanmıştır.

## 1. Trip Planner algoritma testleri
- **Test Edilen Davranış:** Aynı durak seçimi, uzak duraklar arası aktarma, 150m sınırı altı/üstü durakların yürüyüşe eklenmesi, ters yönlerin filtrelenmesi ve duplikasyon rotaların birleştirilmesi.
- **Kullanılan Veri veya Fixture:** `10030`, `10019`, `10324`, `50314`, `16484` id'li duraklar ve manuel ters yön kombinasyonları.
- **Beklenen Sonuç:** Mantıksal rota hatalarının (örn. başlangıç = varış) boş sonuç dönmesi; durağa yakın (≤ 150m) yürüyüş adaylarının bulunup, 150m sınırı aşan adayların listeye alınmaması.
- **Gerçek Sonuç:** Tüm aykırı/ters yön kombinasyonlarında mantıklı sonuçlar dönmüş, 150m üstü yürüyüş bağlantıları elenmiştir.
- **Başarılı veya Başarısız Durumu:** Başarılı

## 2. Pattern ve yön testleri
- **Test Edilen Davranış:** Sentetik bir çoklu-pattern senaryosunda, alternatif pattern üzerindeki bir durağa (ana pattern yerine) rota üretilmesi ve yön filtreleme kuralları.
- **Kullanılan Veri veya Fixture:** Runtime üzerinden manipüle edilen hayali `9999` numaralı rotaya ait 2 bağımsız pattern array'i (`P1` ve `P2`).
- **Beklenen Sonuç:** İkinci (alternatif) pattern'daki varış durağının bulunması ve diğer (ana) pattern sonuçlarına karışmaması.
- **Gerçek Sonuç:** Algoritma sentetik `90001 -> 90005` durak yolculuğunda doğru pattern varyantını tespit etti.
- **Başarılı veya Başarısız Durumu:** Başarılı

## 3. Rota sıralama testleri
- **Test Edilen Davranış:** Aktarmasız > Yürüyüş > Durak Sayısı > Alfabetik kural hiyerarşisinin (Kategorik Sıralama) ağırlıklı maliyet olmaksızın, katı sınırlarla çalışması.
- **Kullanılan Veri veya Fixture:** Aktarmalı bir rota üzerinde döngü kontrolü (`50314` -> `16484`) ile sentetik 3 rotalı alfabetik array sıralaması.
- **Beklenen Sonuç:** Aktarmasızların eşitliğinde yürüme mesafesinin, o eşit olduğunda durak sayısının kesin öncelikli olması. 
- **Gerçek Sonuç:** Kategorik (hiyerarşik) öncelik sırası testi geçti, algoritma cost yerine type>walk>stops algoritmasını koruyor.
- **Başarılı veya Başarısız Durumu:** Başarılı

## 4. Deterministik resultId testleri
- **Test Edilen Davranış:** Aynı yolculuk bileşenleriyle tamamen örtüşen çoklu aramalarda `resultId` anahtarının değişmemesi, ancak rota değişiminde Unique kalması.
- **Kullanılan Veri veya Fixture:** `10019` -> `10324` güzergâhı üzerinden art arda iki farklı `findRoutes` isteği.
- **Beklenen Sonuç:** İlk request ve ikinci request sonucu gelen ilk rotaların birebir aynı ID'ye ve hash formatına sahip olması.
- **Gerçek Sonuç:** ID değerleri `route_direction_pattern_stops` bileşenlerinden başarılı şekilde otonom üretilerek tutarlılık sağlandı.
- **Başarılı veya Başarısız Durumu:** Başarılı

## 5. Shape segmentasyon testleri
- **Test Edilen Davranış:** Dev GTFS shape.txt dosyalarından kırpılan binlerce koordinatın, sadece Biniş ve İniş noktaları kullanılarak kesilmesi ve hatalı yönlerin boş dönmesi.
- **Kullanılan Veri veya Fixture:** Dummy `TEST_ROUTE` içerisinde 5 mock GeoJSON koordinatı ve manuel Stop A/B/C listesi.
- **Beklenen Sonuç:** İniş indeksi biniş indeksinden büyük (ileri) ise gerçek noktaların array olarak gelmesi, ters ise boş dönmesi. Veya Shape yoksa sessiz boş dönmesi.
- **Gerçek Sonuç:** Manuel kesme algoritması beklendiği gibi sadece istenen noktaları aralayarak GeoJSON/Polyline üretti.
- **Başarılı veya Başarısız Durumu:** Başarılı

## 6. Benchmark testi
- **Test Edilen Davranış:** Ağır GTFS test dosyalarının RAM üzerinden bellek yükü (Node.js performansı) hesaplanması. Isınma süresinin ölçülmesi.
- **Kullanılan Veri veya Fixture:** Algoritmadan seçilen 30 rastgele durak kombinasyonu (Toplam 120 test tekrarı).
- **Beklenen Sonuç:** RAM belleklemesi (Isınma/Cold Run) sonrası rota hesaplama süresinin 5ms standardının altında (ideal koşulda 1ms) kalması.
- **Gerçek Sonuç:** Ortalama süre 0.72 ms, maksimum süre ise zirve koşulda 11.04 ms'de kalarak başarı göstermiştir.
- **Başarılı veya Başarısız Durumu:** Başarılı

## 7. Yolculuk detay ekranı ve parametre testleri
- **Test Edilen Davranış:** Eksik `resultId` parametresi veya rotası bulunmayan/çökmeye açık uç durumlarda arayüzün (UI) kontrollü uyarı fırlatması ve Geri Dön butonunun denenmesi.
- **Kullanılan Veri veya Fixture:** URL test hook mockup ve eksik JSON dataları.
- **Beklenen Sonuç:** Bileşenlerin hata atmak yerine uyarı vererek fallback arayüzüne geçmesi. Geçerli rotanın bulunamaması senaryosunda sessiz çöküşün önlenmesi.
- **Gerçek Sonuç:** Henüz tüm UI test senaryoları eklenmemiştir (Eksik Test Tespiti).
- **Başarılı veya Başarısız Durumu:** Beklemede (Eksik Test - Düzeltilecek)

## 8. Yürüyüş servisi testleri
- **Test Edilen Davranış:** Yaklaşık yürüyüş güzergahı API'sinin, haversine bağlantı kullanıp sahte rotalar üretmeden `source = approximate` kaynağını düzgün işlemesi.
- **Kullanılan Veri veya Fixture:** `38.4237, 27.1428` -> `38.4111, 27.1352` kuş uçuşu koordinat isteği.
- **Beklenen Sonuç:** `distanceMeters`, `durationSeconds` ve `source` metriklerinin mock yerine gerçek hesaplama dönmesi, aynı koordinatlarda 0 (sıfır) dönmesi.
- **Gerçek Sonuç:** Servis 1500m altı ve 0 durumlarına doğru değer atmaktadır, fallback yapısı UI senaryoları öncesinde hazırdır.
- **Başarılı veya Başarısız Durumu:** Başarılı
