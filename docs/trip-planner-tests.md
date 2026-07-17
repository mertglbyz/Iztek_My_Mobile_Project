# Faz 10 - Nasıl Giderim (Trip Planner) Test Senaryoları Raporu

Gerçek GTFS ve Optimize edilmiş Ters İndeksleme (Array Kesişim) algoritması üzerinde aşağıdaki 6 temel senaryo simüle edilmiş ve kullanıcı arayüzü (UI) üzerinden alınan sonuçlar raporlanmıştır.

## Test 1 – Aktarmasız rota
- **Başlangıç Durağı:** Konak – 10030
- **Varış Durağı:** Şirinyer Pazar Yeri – 40009
- **Beklenen Sonuç:** Sadece tek vasıta ile gidilebilecek hatların listelenmesi.
- **Gerçek Sonuç:** 304 ve 303 No'lu hatlar, Aktarmasız (Direct) olarak tespit edilip UI'a yeşil "Aktarmasız" rozetiyle başarılı şekilde yansıtıldı.
- **Durum:** ✅ Başarılı

## Test 2 – Ters yön (Yürüme Mesafesi Engeli Testi)
- **Başlangıç Durağı:** Şirinyer Pazar Yeri – 40009
- **Varış Durağı:** Konak – 10030
- **Beklenen Sonuç:** Algoritmanın dönüş yönünü (1) algılaması veya yürüme transferi olmadığı için rotayı kırması.
- **Gerçek Sonuç:** Başlangıç noktası için seçilen durağın karşısındaki durağın ID'si farklı olduğu için ve algoritma şu an yayaların karşıdan karşıya geçme (Yürüme) mesafesini desteklemediğinden rota bulunamadı uyarısı tetiklendi.
- **Durum:** ❌ Başarısız (Yürüme Mesafesi / Nearest Node entegrasyonu gelecek fazlara not alındı)

## Test 3 – Tek aktarmalı rota
- **Başlangıç Durağı:** Konak
- **Varış Durağı:** Eserkent Köşe
- **Beklenen Sonuç:** Doğrudan giden bir otobüs olmadığı için ortak bir aktarma merkezi bulunduğunda iki hat ile rota çizilmesi.
- **Gerçek Sonuç:** 508 Numaralı Hat ile Konak'tan Kız Yurdu durağına varış, ardından Kız Yurdu durağında aktarma yapılarak 550 Numaralı Hat ile Eserkent Köşe'ye başarılı geçiş sağlandı. Turuncu "1 Aktarma" rozetiyle UI'da gösterildi (Toplam 15 durak mesafe).
- **Durum:** ✅ Başarılı

## Test 4 – Aynı durak
- **Başlangıç Durağı:** İşçievleri
- **Varış Durağı:** İşçievleri
- **Beklenen Sonuç:** UI ve servisten hata dönmesi, aramanın "Aynı durak" gerekçesiyle engellenmesi.
- **Gerçek Sonuç:** Kullanıcı "Rota Ara" butonuna bastığında arama yapılmadı ve işletim sistemi seviyesinde "Geçersiz Rota - Başlangıç ve varış durağı aynı olamaz." standart pop-up (Alert) modülü çıktı.
- **Durum:** ✅ Başarılı

## Test 5 – Rota bulunamayan durum
- **Başlangıç Durağı:** Kavaflar
- **Varış Durağı:** Kuşadası Yol Ayrımı
- **Beklenen Sonuç:** Algoritmanın kilitlenmeden boş dizi (`[]`) döndürmesi ve "Bulunamadı" uyarısı vermesi.
- **Gerçek Sonuç:** Yükleme işlemi sona erdikten sonra gri otobüs ikonu ile birlikte "Bu duraklar arasında doğrudan veya tek aktarmalı sefer bulunamamıştır." metni güvenli bir şekilde ekranda belirdi. 
- **Durum:** ✅ Başarılı

## Test 6 – Aynı isimli duraklar
- **Kullanıcı Araması:** "konak"
- **Beklenen Sonuç:** Aynı isme sahip olan farklı peron/yön duraklarının ID ve geçen numaralarına göre ayırdedilebilir listelenmesi.
- **Gerçek Sonuç:** Dropdown listesinde duraklar benzersiz ID ve hat listeleriyle şu şekilde başarılı ayrıştırıldı:
  - Konak (10030) Hatlar: 303, 304
  - Konak (10036) Hatlar: 104, 171, 465, 471
  - Konak (10037) Hatlar: 484, 485
  - Konak (10038) Hatlar: 152, 887
  - Konak (10039) Hatlar: 508
- **Durum:** ✅ Başarılı
