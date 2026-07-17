# Faz 11 - Rota Planlayıcı Otomatik Test Senaryoları Raporu

Gerçek GTFS ve Optimize edilmiş Ters İndeksleme algoritması üzerinde aşağıdaki 10 temel senaryo simüle edilmiş ve Jest kullanılarak otomatik testlerden başarıyla geçmiştir:

## Test 1 - Aynı Durak Seçimi
- Aynı durak seçilirse boş liste döner (Test 1). 
- Sonuç boş dizi `[]` olarak dönmelidir.

## Test 2 - Doğru Yönde Aktarmasız Rota
- Doğru yönde aktarmasız rota bulunur. Başlangıçtan varışa mevcut direkt hat varsa başarıyla tespit edilir.

## Test 3 - Doğru Yön Filtresi
- Doğru yönde çalışırken ters yönü dahil etmez, yön süzgeci aktiftir.

## Test 4 - Uzak Duraklar Aktarma Taraması
- Uzak duraklar arası aktarma (veya bulamama) tarandığında çökmeksizin (hata vermeksizin) sonuç veya boş liste dönmesi sağlanır.

## Test 5 - Dönüş Yönü ve Ters Yön Seçiciliği
- Varış sırası başlangıçtan önceyse (startIdx < endIdx formülüne uymazsa) o yön süzgece takılır ve doğru sıralı güzergâh listelenir.

## Test 6 - Duplikasyon Rota Engeli
- Duplikasyonlu rotalar algoritma içinde birleştirilerek teke indirgenir.

## Test 7 - Maksimum Sonuç Sınırı
- UI ve RAM yorgunluğunu önlemek için sonuçlar her zaman maksimum 10 kayıt ile limitlenir.

## Test 8 - Yakın Durak İlavesi (150 Metre Kuralı)
- 150m içerisindeki yakın durakları yürüme adayı listesine ekler. Rota sonucunda yürüyüş bilgisi yer alır.

## Test 9 - Uzak Durak Kısıtlaması (150 Metre Sınırı)
- 150m kuralı dışında kalan uzak duraklar yürüyüş menzilinne dahil edilmez ve aday olmaz.

## Test 10 - Pattern Varyantlarında Destek
- Pattern varyantlarında (route pattern) düzgün çalışır. Temsilci hat dizilimi dışındaki diğer alt yol ayrımlarını da kapsayacak şekilde güvenli ve doğru çalışır.

Tüm testler yazılmış olup, **automated_test_results.txt** dosyasına aktarılmıştır. Bütün testler ✅ `PASS` sonucunu almıştır.
