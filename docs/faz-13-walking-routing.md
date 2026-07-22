# Faz 13 — Gerçek Yaya Güzergâhı Entegrasyonu Teknik Dokümanı

## Genel Bakış

Faz 13'ün temel amacı, yürüyüş bağlantılarını Haversine kuş uçuşu yaklaşımından backend tabanlı gerçek yaya güzergâhlarına yükseltmek için gerekli mobil entegrasyon katmanını hazırlamaktır. Backend endpoint'i henüz hazır olmadığından, entegrasyon mock provider ve ortam değişkenleri üzerinden doğrulanmıştır.

## Mimari Değişiklikler

### 1. Provider Mimarisi (`src/services/walkingRoutingService.ts`)

Dosya tamamen yeniden yapılandırıldı. Eski tek fonksiyonlu yapı yerine provider pattern uygulandı:

| Provider | Kaynak | Açıklama |
|---|---|---|
| `HaversineWalkingProvider` | `approximate-haversine` | Mevcut Haversine kuş uçuşu hesaplama (fallback) |
| `BackendWalkingProvider` | `backend-osm` | Backend API'ye POST isteği gönderir |
| `MockWalkingProvider` | `mock-provider` | API sözleşmesine uygun sentetik yanıt üretir |

**Provider seçim mantığı:**
1. `EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL` tanımlıysa → Backend API
2. `EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED=true` ise → Mock Provider
3. Hiçbiri yoksa → Haversine (doğrudan fallback)

### 2. Timeout ve Fallback Mekanizması

```
getWalkingRoute()
├── Cache kontrolü
├── Aynı koordinat → sıfır mesafe
├── Primary provider'ı dene (backend veya mock)
│   ├── Başarılı → sonucu dön
│   └── Başarısız → Haversine fallback'e geç
│       ├── Timeout (AbortError)
│       ├── HTTP 4xx / 5xx
│       ├── Boş geometry
│       ├── Geçersiz geometry (eksik latitude/longitude)
│       └── Ağ hatası
└── Sonucu cache'e yaz
```

- **Timeout:** 3 saniye (3000ms) — `AbortController` ile yönetilir
- **Fallback:** Herhangi bir hata durumunda otomatik olarak Haversine'a geçilir
- **Kullanıcı bilgilendirme:** Fallback gerçekleştiğinde `isApproximateRoute()` ve `getWalkingUIState()` ile UI durumu belirlenir

### 3. Cache Katmanı

| Parametre | Değer |
|---|---|
| Maksimum kayıt | 200 |
| TTL | 5 dakika (300.000 ms) |
| Cache anahtarı | `{fromLat},{fromLon}|{toLat},{toLon}` (5 ondalık) |
| Yön duyarlılığı | A→B ≠ B→A (ayrı kayıtlar) |
| Eviction | LRU (en eski kayıt silinir) + TTL tabanlı |
| Sıfır mesafe | Cache'e yazılmaz |

### 4. UI Durum Yönetimi

`getWalkingUIState()` fonksiyonu 6 durumu ayırt eder:

| Durum | Anlamı |
|---|---|
| `loading` | Yaya rotası hesaplanıyor |
| `ready` | Gerçek yaya rotası hazır (backend-osm veya mock) |
| `fallback` | Yaklaşık Haversine kullanılıyor |
| `unavailable` | Rota alınamadı |
| `invalid_geometry` | Geometry boş/geçersiz |
| `not_needed` | Yürüyüş gerekmiyor (mesafe 0) |

### 5. Tip Tanımları (`src/types/index.ts`)

```typescript
interface WalkingRouteResult {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { latitude: number; longitude: number }[];
  source: 'backend-osm' | 'approximate-haversine' | 'mock-provider';
  isApproximate: boolean;
  retrievedAt: string;
  fromStopId?: string;
  toStopId?: string;
}

interface WalkingRouteProvider {
  readonly providerName: string;
  getRoute(from, to, fromStopId?, toStopId?): Promise<WalkingRouteResult>;
}
```

## Backend API Sözleşmesi

Detaylar `docs/walking-routing-api-contract.md` dosyasındadır. Özet:

- **Endpoint:** `POST {baseUrl}/api/v1/routing/walk`
- **Request:** `{ origin: { lat, lng }, destination: { lat, lng } }`
- **Response:** `{ distanceMeters, durationSeconds, geometry, source, isApproximate, retrievedAt }`
- **Error:** `{ error, message }` + HTTP durum kodu
- **Geometry formatı:** `[{ latitude, longitude }, ...]` (React Native Maps uyumlu)

## Ortam Değişkenleri

| Değişken | Açıklama |
|---|---|
| `EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL` | Backend yürüyüş servisi base URL'si |
| `EXPO_PUBLIC_WALKING_ROUTING_MOCK_ENABLED` | Mock provider'ı etkinleştir (`true`) |

## Test Kapsamı

**Toplam: 34 yürüyüş servisi testi (8 kategori)**

| Kategori | Test Sayısı | Kapsam |
|---|---|---|
| Haversine Fallback | 3 | Temel rota hesaplama, sıfır mesafe, isApproximateRoute |
| Provider Mimarisi | 5 | Provider varlığı, mock/backend/haversine seçimi, koordinat validasyonu |
| Timeout & Hata Yönetimi | 8 | AbortError, 4xx, 5xx, boş/geçersiz geometry, ağ hatası, NaN |
| Cache | 6 | Cache hit, yön duyarlılık, tekrar istek, clear, sıfır mesafe, eviction |
| UI Durumları | 7 | loading, not_needed, unavailable, invalid_geometry, fallback, ready |
| Model Validasyonu | 5 | distanceMeters, durationSeconds, geometry, source, retrievedAt |
| Mock Entegrasyonu | 1 | Mock provider ile uçtan uca test |

## Bilinen Sınırlamalar

1. **Backend henüz hazır değil:** Gerçek OSM/OSRM/Valhalla tabanlı yaya güzergâhı backend servisi geliştirilme aşamasındadır. Mobil uygulama şu anda mock provider veya Haversine fallback ile çalışmaktadır.
2. **Cache bellek içi:** Uygulama yeniden başlatıldığında cache sıfırlanır. Kalıcı cache (AsyncStorage) gelecek fazda değerlendirilebilir.
3. **Rota sıralaması:** Mevcut sıralama Haversine yaklaşık değerleri kullanır. Backend hazır olduğunda gerçek yürüyüş verisiyle sıralama zenginleştirilecektir.
4. **OSM veri kalitesi:** Backend tarafındaki OSM yol ağı verilerinin güncelliği ve doğruluğu backend takımının sorumluluğundadır.

## Gelecek Fazda Yapılacaklar

- Backend yürüyüş servisi hazır olduğunda `EXPO_PUBLIC_WALKING_ROUTING_API_BASE_URL` tanımlanarak canlıya geçiş
- Gerçek yürüyüş mesafesi ile rota sıralamasının zenginleştirilmesi
- Kalıcı cache (AsyncStorage) entegrasyonu
- Yolculuk detay ekranında yürüyüş adımları için gerçek/zaman tahmini gösterimi
