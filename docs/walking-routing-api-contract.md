# Yürüyüş Rotalama (Walking Routing) API Sözleşmesi

Bu belge, İztek Ulaşım Faz 13 kapsamında mobil uygulama ile backend mikro servisi arasında kurulacak "Gerçek Yaya Güzergâhı" entegrasyonu için teknik sözleşmedir (API Contract).

## 1. Bağlantı Detayları (Endpoint & Method)
*   **Base URL:** `EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL` (Ortam değişkeninden okunacaktır)
*   **Path:** `/api/v1/routing/walk`
*   **HTTP Metodu:** `POST`
*   **Content-Type:** `application/json`

## 2. İstek Modeli (Request Payload)
Backend servisine uç nokta koordinatları (enlem ve boylam) iletilecektir.
```json
{
  "origin": {
    "lat": 38.4237,
    "lng": 27.1428
  },
  "destination": {
    "lat": 38.4111,
    "lng": 27.1352
  }
}
```

## 3. Yanıt Modeli (Response Payload)
Kusursuz bir çalışma senaryosunda (HTTP 200) dönmesi beklenen veri şablonu:
```json
{
  "distanceMeters": 1450,
  "durationSeconds": 1050,
  "geometry": [
    { "latitude": 38.4237, "longitude": 27.1428 },
    { "latitude": 38.4230, "longitude": 27.1420 },
    { "latitude": 38.4111, "longitude": 27.1352 }
  ],
  "source": "backend-osm",
  "isApproximate": false,
  "retrievedAt": "2026-07-21T12:00:00Z"
}
```
*   **Birimler:** Uzunluk kesinlikle Metre (m), Süre kesinlikle Saniye (s) olmalıdır.
*   **Geometry Formatı:** React Native Maps Polygon/Polyline formatına doğrudan uygun olması için dizinin (Array) her bir noktası tam olarak `{ latitude: number, longitude: number }` özelliklerini taşımalıdır. (GeoJSON vb. kullanılmayacaktır).

## 4. Hata Modeli (Error Response)
Ulaşılamayan yollar, açık deniz bağlantısı vb. başarısız senaryolarda standart 4xx veya 5xx HTTP durum kodları ile dönülmelidir:
```json
{
  "error": "ROUTE_NOT_FOUND",
  "message": "Belirtilen koordinatlar arasında yürüyüş rotası bulunamadı."
}
```

## 5. Zaman Aşımı (Timeout) ve Fallback Davranışı
*   **Timeout (Mobil Kısıt):** Uygulama her bir yaya servisi isteği için **azami 3 saniye (3000ms)** bekleyecektir. Backend bu sürede yanıt veremezse, bağlantı mobil katmanında abort edilecektir.
*   **Mobil Uygulamanın Fallback Davranışı:** Yetersiz istek, timeout, 5xx çökmesi, geçersiz koordinat veya boş `geometry` alınması durumlarında sistem donmayacaktır. Öncelikli olarak `Haversine` tabanlı "kuş uçuşu (approximate-haversine)" kesikli çizgisi oluşturulacak, yürüyüş algoritması hata fırlatmadan (graceful mode) otonom düşüş sağlayacaktır.

## 6. Sorumluluk Sınırı 
*   **Mobile (Frontend):** Görevi yalnızca koordinat iletmek, cevabı haritada çizdirmek veya başarısız olursa kuşu uçuşu mantığını arayüze basmaktır.
*   **Backend (OSM, OSRM, Valhalla):** Açık kaynak motorlarıyla (OSRM, GraphHopper vb.) yaşanacak PBF veri tabanı okuma zorlukları, köprülerin algılanamaması ve harita topolojisi hataları **tamamen Backend takımının** sorumluluğundadır. Mobil tarafta harita onarımı veya rotaya müdahale kapalıdır.
