# ESHOT Otobüs Durakları Veri Sözlüğü

## Veri Kaynağı
- Kaynak adı: ESHOT Otobüs Durakları
- Kaynak linki: https://acikveri.bizizmir.com/tr/dataset/eshot-otobus-duraklari
- Dosya formatı: CSV
- İnceleme tarihi: 07.07.2026

## Alanlar

- Alan adı: `DURAK_ID`
- Açıklaması: Durağın sistemdeki tekil kimlik numarası.
- Veri tipi: `int64` (Tam Sayı)
- Uygulamada kullanılacak mı: Evet
- Kullanım amacı: "Durağa Yaklaşan Otobüsler API"sine istek atarken referans parametresi olarak kullanılacak.

- Alan adı: `DURAK_ADI`
- Açıklaması: Durağın fiziksel/bilinen adı (Örn: Bahribaba).
- Veri tipi: `string` (Metin)
- Uygulamada kullanılacak mı: Evet
- Kullanım amacı: Liste ve harita üzerindeki durak kartlarında kullanıcıya gösterim.

- Alan adı: `ENLEM`
- Açıklaması: Durağın harita üzerindeki Y koordinatı.
- Veri tipi: `float64` (Ondalık Sayı)
- Uygulamada kullanılacak mı: Evet
- Kullanım amacı: React Native tarafında harita işaretçisini (marker) konumlandırmak ve "yakındaki duraklar" hesaplaması yapmak.

- Alan adı: `BOYLAM`
- Açıklaması: Durağın harita üzerindeki X koordinatı.
- Veri tipi: `float64` (Ondalık Sayı)
- Uygulamada kullanılacak mı: Evet
- Kullanım amacı: Harita konumlandırması.

- Alan adı: `DURAKTAN_GECEN_HATLAR`
- Açıklaması: O duraktan geçen otobüs hatlarının numaraları (Örn: `29-30`).
- Veri tipi: `string` (Metin)
- Uygulamada kullanılacak mı: Evet
- Kullanım amacı: Durak detay ekranında, o duraktan hangi hatların geçtiğini listelemek.

## Veri Kalitesi Notları
- Eksik alan var mı: Evet. Yapılan analizde `DURAKTAN_GECEN_HATLAR` sütununda çokça boş (null) kayıt tespit edilmiştir. Bu duraklar için UI tarafında "Hat bilgisi bulunamadı" gibi bir fallback (yedek) state yazılmalıdır.
- Tekrarlayan kayıt var mı: `DURAK_ID` alanları genel olarak tekil görünüyor ancak aynı isimde (Örn: iki farklı yöndeki "Bahribaba" durağı) kayıtlar mevcut (ID: 10005 ve ID: 10007).
- Koordinat alanları uygun mu: Koordinatlar doğrudan virgüllü (float) sayı tipinde. Mobil harita kütüphaneleriyle ekstra dönüşüm olmadan çalışmaya uygun.
- Duraktan geçen hat alanı nasıl tutuluyor: Veriler dizi (array) yerine tire (`-`) veya benzeri ayırıcılarla tek bir string olarak tutulmuş (Örn: `29-30`). 
- Uygulamada dönüşüm gerektiriyor mu: Evet. `DURAKTAN_GECEN_HATLAR` metnini mobil uygulamada ekrana basarken `.split('-')` metodunu kullanarak bir string dizisine çevirmemiz (parse etmemiz) gerekecek.