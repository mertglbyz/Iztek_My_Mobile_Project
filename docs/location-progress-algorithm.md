# Durak İlerleme Algoritması (Location Progress Algorithm)

Bu modül (`src/services/location/progressAlgorithm.ts`), aracın/kullanıcının GPS konumuna göre hatta hangi durağa ulaştığını, hangi durakta bulunduğunu ve ne kadar yolu kaldığını hesaplar.

## Temel Parametreler (`JourneyConstants`)
- `STOP_REACHED_THRESHOLD_METERS (20m)`: Konum, durağa bu mesafeden daha yakınsa durağa "ulaşılmış" sayılması için değerlendirmeye alınır.
- `REQUIRED_CONSECUTIVE_MATCHES (2)`: Durağa ulaşıldığının kesinleşmesi için art arda (consecutive) bu kadar sayıda geçerli eşleşme gereklidir.
- `MIN_ACCURACY_THRESHOLD (50m)`: Gelen GPS verisindeki accuracy (hata payı) bu değerden büyükse bu veri filtrelenir ve progress hesaplamasında kullanılmaz.

## Algoritma Mantığı
1. **İleri Yönlülük (Forward-only):** Kullanıcı bir durağı geçtikten sonra (örneğin 3. durak), GPS dalgalanmaları veya yol yapısı nedeniyle yanlışlıkla 2. durağa yakınlaşsa bile algoritma geri dönmez. Sadece henüz geçilmemiş ve sıradaki duraklar taranır.
2. **Mesafesel Eşleşme:** Kullanıcının mevcut konumu (latitude, longitude) ile taranan durakların konumu arasındaki Haversine (Kuş uçuşu küresel) mesafe hesaplanır.
3. **Ardışık Onay (Debounce):** Mesafe eşiği içindeki en yakın durak bulunduğunda, durum anında güncellenmez. Eğer ardışık 2. veya 3. konum verisi (REQUIRED_CONSECUTIVE_MATCHES oranında) aynı durağa eşleşirse, "durağa ulaşıldı" onayı gerçekleşir ve state üzerinde `passedStopsCount` ve `nextStopId` değerleri güncellenir.
4. **Sıçrama Kontrolü (Jump Ahead):** Kullanıcı aynı anda iki durak arasından çok hızlı geçiyorsa (veya GPS verisi geç geldiyse), algoritma sıradaki en uygun durağa güvenli biçimde atlama yapabilir. 
5. **Gürültü Filtreleme (Noise Filtering):** `calculateProgress` fonksiyonu eğeraccuracy çok kötüyse veya kullanıcı belirlenen eşiklerin dışındaysa durak state'ini güncellemeden aynen koruyarak geri döner. Kısacası kullanıcıya yanlış bilgi vermek yerine son geçerli durumu korur.
