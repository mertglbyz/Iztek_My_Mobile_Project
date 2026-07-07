# API Validation

## Test 1
# API Validation

## Test 1

- Test edilen endpoint: `https://openapi.izmir.bel.tr/api/iztek/duragayaklasanotobusler/10030`
- Kullanılan durak ID: 10030
- Durak adı: Konak
- Test tarihi ve saati: 07.07.2026 13.20
- HTTP durum kodu: 200
- Response süresi: 301 ms
- Response boş mu: Hayır (JSON dizisi içinde 4 adet yaklaşan otobüs verisi listeleniyor).
- Response içinde gelen alanlar: `KalanDurakSayisi`, `HattinYonu`, `KoorY`, `BisikletAparatliMi`, `KoorX`, `EngelliMi`, `HatNumarasi`, `HatAdi`, `OtobusId`.
- Hata mesajı var mı: Yok.
- Uygulamada kullanılabilecek alanlar: `OtobusId`, `HatNumarasi`, `HatAdi`, `KalanDurakSayisi`, `EngelliMi`, `BisikletAparatliMi`.
- Belirsiz veya açıklanmaya ihtiyaç duyan alanlar:
  - **Koordinat Formatı:** `KoorX` (Enlem) ve `KoorY` (Boylam) değerleri doğrudan float yerine string tipinde ve ondalık ayırıcı olarak nokta (`.`) yerine virgül (`,`) kullanılarak geliyor (Örn: `"38,39719333"`). Uygulamada harita üzerinde göstermek istersek, öncelikle virgülü noktaya çevirip sonra `parseFloat()` ile sayısal tipe dönüştürmemiz gerekecek.
  - **Yön Bilgisi:** `HattinYonu` alanı sayısal (integer) olarak (görselde `1`) dönüyor. Bu değerin "Gidiş" mi yoksa "Dönüş" mü olduğunu UI tarafında basabilmek için bir eşleştirme (mapping) mantığı kurulmalı.
  - **Tip Belirsizlikleri:** `HatNumarasi` (Örn: `"304"`) metin (string) olarak gelirken, `OtobusId` (Örn: `11018`) sayı (integer) olarak dönüyor. Veri modelini oluştururken (data-contracts.md) bu tiplere dikkat edilmeli.

## Test 2

- Test edilen endpoint: `https://openapi.izmir.bel.tr/api/iztek/duragayaklasanotobusler/10182`
- Kullanılan durak ID: 10182
- Durak adı: Fahrettin Altay Meydan 5
- Test tarihi ve saati: 07.07.2026 13.30
- HTTP durum kodu: 200
- Response süresi: 262 ms
- Response boş mu: Hayır (Görselde 6 adet yaklaşan araç listeleniyor).
- Response içinde gelen alanlar: `KalanDurakSayisi`, `HattinYonu`, `KoorY`, `BisikletAparatliMi`, `KoorX`, `EngelliMi`, `HatNumarasi`, `HatAdi`, `OtobusId`.
- Hata mesajı var mı: Yok.
- Uygulamada kullanılabilecek alanlar: `OtobusId`, `HatNumarasi`, `HatAdi`, `KalanDurakSayisi`, `EngelliMi`, `BisikletAparatliMi`, `HattinYonu`.
- Belirsiz veya açıklanmaya ihtiyaç duyan alanlar:
  - **Aynı Hatta Birden Fazla Araç:** Görseldeki veride iki adet "510" numaralı otobüs (Biri 1, diğeri 12 durak geride) ve iki adet "977" numaralı otobüs (İkisi de 12 durak geride) görünüyor. Uygulamanın UI tarafında aynı hat numaralarını gruplayarak (Örn: "510 Numaralı Hat - 1 durak, 12 durak sonra") göstermek daha iyi bir kullanıcı deneyimi sunabilir.
  - **Aynı Konumda Görünen Araçlar:** İki adet 977 numaralı otobüsün (`OtobusId`: 9518 ve 9018) `KalanDurakSayisi` (12), `KoorX` ve `KoorY` değerleri birebir aynı dönmüş. Araçlar peş peşe (konvoy halinde) gidiyor olabilir veya API verisi o an için iki cihaza aynı konumu yansıtmış olabilir.
  - **Yön Bilgisi Çeşitliliği:** İlk testte sadece `1` olan `HattinYonu` değeri, bu testte `510` numaralı hat için `2` olarak dönmüş. `1` ve `2` değerlerinin hangi fiziksel yönlere (Gidiş/Dönüş) karşılık geldiğini kesinleştirmemiz gerekiyor.
  - **Koordinat Formatı:** Bir önceki testte olduğu gibi, koordinatlar yine virgüllü string (`"38,396975"`) olarak geliyor. Dönüşüm (parse) işlemi kesinlikle şart.

## Test 3

- Test edilen endpoint: `https://openapi.izmir.bel.tr/api/iztek/duragayaklasanotobusler/30511`
- Kullanılan durak ID: 30511
- Durak adı: Otogar
- Test tarihi ve saati: 07.07.2026 13.36
- HTTP durum kodu: 200
- Response süresi: 241 ms
- Response boş mu: Hayır (Görselde 4 adet yaklaşan araç listeleniyor).
- Response içinde gelen alanlar: `KalanDurakSayisi`, `HattinYonu`, `KoorY`, `BisikletAparatliMi`, `KoorX`, `EngelliMi`, `HatNumarasi`, `HatAdi`, `OtobusId`.
- Hata mesajı var mı: Yok.
- Uygulamada kullanılabilecek alanlar: `OtobusId`, `HatNumarasi`, `HatAdi`, `KalanDurakSayisi`, `EngelliMi`, `BisikletAparatliMi`.
- Belirsiz veya açıklanmaya ihtiyaç duyan alanlar:
  - **Veri Tutarlılığı:** Tıpkı 2. testte olduğu gibi, aynı hatta (505 numaralı Çamkule - Bornova Metro hattı) peş peşe gelen birden fazla araç listeleniyor (biri 5, diğeri 10 durak geride). Bu durum, uygulamada hatları gruplayarak gösterme ihtiyacımızı kesinleştiriyor.
  - **Veri Tipleri Özeti:** Yaptığımız 3 testin sonucunda, UI tarafında kullanılacak veri modelleri (interface/type) için tipler kesinleşti:
    - `OtobusId`, `KalanDurakSayisi`, `HattinYonu` -> `number` (integer)
    - `HatNumarasi`, `HatAdi`, `KoorX`, `KoorY` -> `string`
    - `EngelliMi`, `BisikletAparatliMi` -> `boolean`