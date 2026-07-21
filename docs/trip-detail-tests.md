# Yolculuk Detay Ekranı ve Sıralama Testleri

## 1. Rota Sıralama Kuralları (Kategorik Sıralama)
Algoritma sonuçları kullanıcıya gösterilmeden önce herhangi bir ağırlıklı maliyet (cost) formülü kullanılmaz. Aşağıdaki kesin kurallar sırasıyla, ayrı öncelikler halinde uygulanır:

1. **Aktarmasız Rotalar Önce:** `type: 'direct'` olan rotalar her zaman `type: 'transfer'` rotalardan daha üst sırada yer alır.
2. **Daha Az Yürüyüş Mesafesi:** Aynı aktarma kategorisindeki rotalar arasında, toplan yürüyüş mesafesi (`walkingToBoardingMeters` + `walkingFromAlightingMeters`) en düşük olan öne gelir.
3. **Daha Az Durak Sayüsü:** Yürüyüş mesafesi tamamen eşit çıkarsa, durak sayısı (`totalStopCount`) daha az olan rota öne gelir.
4. **Alfabetik Sıralama:** Eğer yürüyüş mesafesi ve durak sayısı tamamen eşitse, tam eşitlikte hat numarasına göre (`routeId`) alfabetik (artan) sıralama yapılır.

## 2. Deterministik resultId
Rota sonuçlarında kullanılan `resultId` rastgele (UUID vb.) üretilmez. "Aynı rota bileşenleriyle tekrar hesaplandığında aynı resultId değeri üretilir." Bu sayede React bileşenlerinde listenin gereksiz render edilmesi veya ID değişimlerinden kaynaklı çökmeler engellenir.

## 3. Yolculuk Detay Ekranı 
Yolculuk detay ekranı test edilirken:
- `resultId`, `startStopId`, ve `endStopId` kullanılarak rota state'den bağımsız olarak tekrar oluşturulabilir.
- Herhangi bir yürüyüş adımı gerektiğinde, gerçek yaya güzergahı API'si devrede değilse fallback mekanizması olarak Haversine yaklaşık çizgisi oluşturulur.
