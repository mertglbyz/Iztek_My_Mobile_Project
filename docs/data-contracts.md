# Uygulama Veri Modelleri (Data Contracts)

Bu belge, açık veri kaynaklarından (CSV ve API) gelen raw (ham) verilerin, mobil uygulama içerisinde hangi standart modellere dönüştürülerek kullanılacağını tanımlar.

## 1. Stop (Durak Modeli)
CSV dosyasından okunan durak verilerinin harita ve liste ekranlarında kullanılacak uygulama içi modelidir.

- **id**: `string` *(CSV'deki `DURAK_ID` alanından eşleşir. API isteklerinde referans kolaylığı için metin formatında tutulur)*
- **name**: `string` *(CSV'deki `DURAK_ADI` alanından eşleşir)*
- **latitude**: `number` *(CSV'deki `ENLEM` alanından eşleşir)*
- **longitude**: `number` *(CSV'deki `BOYLAM` alanından eşleşir)*
- **routes**: `string[]` *(CSV'deki `DURAKTAN_GECEN_HATLAR` alanındaki string verinin tire (`-`) işaretinden parçalanıp dizi halidir. Servis parametreleriyle uyumlu olması için metin dizisi olarak bırakılmıştır)*

## 2. ApproachingBus (Yaklaşan Otobüs Modeli)
"Durağa Yaklaşan Otobüsler API"sinden gelen verinin uygulama içi modelidir.

- **busId**: `string` *(API'deki `OtobusId` alanından eşleşir)*
- **routeNumber**: `string` *(API'deki `HatNumarasi` alanından eşleşir)*
- **routeName**: `string` *(API'deki `HatAdi` alanından eşleşir)*
- **remainingStopCount**: `number` *(API'deki `KalanDurakSayisi` alanından eşleşir)*
- **direction**: `number` *(API'deki `HattinYonu` alanından eşleşir. Gidiş/Dönüş durumunu belirtir)*
- **latitude**: `number` *(API'deki `KoorX` alanından gelir. API string ve virgüllü döner (Örn: "38,397"), bu değer ondalık noktaya çevrilip Float tipe dönüştürülmelidir)*
- **longitude**: `number` *(API'deki `KoorY` alanından gelir. `latitude` ile aynı dönüşüm işlemine tabi tutulmalıdır)*
- **isAccessible**: `boolean` *(API'deki `EngelliMi` alanından eşleşir)*
- **hasBicycleRack**: `boolean` *(API'deki `BisikletAparatliMi` alanından eşleşir)*

## 3. ApiResponseState (Ekran Durum Modeli)
UI (Arayüz) tarafında API isteklerinin durumunu yönetmek için kullanılacak state modelidir.

- **isLoading**: `boolean` *(İstek atıldığında true olur, ekranda Loading/Spinner gösterilir)*
- **isSuccess**: `boolean` *(Veri başarıyla çekildiğinde true olur)*
- **isEmpty**: `boolean` *(API 200 OK dönmesine rağmen yaklaşan araç listesi boşsa (`[]`) true olur. Ekranda "Yaklaşan otobüs bulunmuyor" UI'ı gösterilir)*
- **errorMessage**: `string | null` *(Bir hata oluştuğunda hatanın metnini tutar, yoksa null olur)*

---
**Gelecekte Eklenebilecek (Opsiyonel) Alanlar:**
- *Kalan Süre (Dakika):* Şu an API doğrudan dakika bilgisi vermiyor. İleride koordinatlar arası mesafe hesaplanarak tahmini bir `estimatedTimeMinutes` alanı eklenebilir.
- *Araç Doluluk Oranı:* Şu an API bu veriyi sağlamıyor. İleride gelirse `occupancyRate` gibi bir alan eklenebilir.