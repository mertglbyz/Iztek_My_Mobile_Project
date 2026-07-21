# Faz 12 (Yolculuk Detay) Test Raporu

Bu doküman, Faz 12 kapsamında geliştirilen *Yolculuk Detay Ekranı* (Trip Detail) ve *Sıralama / Shape Segmentasyon* özelliklerinin sağlamasını yapan Jest testlerinin açık senaryolarını içerir.

Tüm testler `tripPlanner.test.ts` ve `shapeSegmentService.test.ts` içerisinde çalıştırılmış, `%100 Success` (Başarı) alınmıştır.

## tripPlanner.ts (Routing ve Listeleme Testleri)

1. **Deterministik ID Testi (Test 13 ve 16):**
   - Aynı parametreler (biniş/iniş durakları, hat, yön) her seferinde saniyesine kadar *aynı* `resultId` üretti. Farklı otobüs kombinasyonları birbirinden tamamen izole farklı `resultId` üretti.

2. **Cost Function Sıralama (Test 14 ve 15):**
   - Aktarmasız rotaların, mutlak kuralla aktarmalı rotalardan önce geldiği doğrulandı.
   - Aktarma sayıları eşit olduğunda: `Toplam Yürüyüş Metresi + (Durak Sayısı * 150)` bazlık Cost ceza fonksiyonu çalıştı. Daha düşük cezaya sahip kombinasyonların listenin (array) en başına tırmandığı kanıtlandı.

3. **Segment Bağıntısı Kararlılığı (Test 17 ve 18):**
   - Tek aktarmalı (Transfer) rotalarda; 1. otobüs segmentinin son durağının aktarma merkezi (Transfer Point) olduğu; 2. otobüs segmentinin ise bu aktarma merkezinden başladığı matematiksel offsetlerle test edildi.

## shapeSegmentService.ts (Harita Geometrisi Testleri)

4. **Gerçek Segment Kırpması:**
   - Yüzlerce koordinat barındıran tam otobüs güzergahından, yalnızca Biniş Durağı ile İniş Durağı arasındaki parçanın (Sub-array) başarıyla çıkarıldığı tespit edildi (Boşluk/taşma oluşmadı).

5. **Ters Yön / Kayıp Shape Toleransı:**
   - Biniş indeksi, iniş indeksinden *büyükse* (Yâni otobüs o durağı geçmişse) fonksiyonun `undefined` bırakmayıp, Güvenli Boş Dizi (`[]`) döndüğü görüldü.
   - Haritada GTFS kaynaklı bir kayıp durumunda, uygulamanın çökmediği garanti altına alındı.
