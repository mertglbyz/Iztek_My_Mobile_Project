// src/services/transportApi.ts

/**
 * ESHOT Ulaşım Servis Katmanı
 * Bu dosya, uygulamanın dış veri kaynaklarıyla (CSV ve API) olan iletişimini tek bir merkezden yönetir.
 */

// Not: İlerleyen günlerde CSV parse işlemleri ve API çağrıları için axios/fetch veya papaparse 
// gibi kütüphaneler buraya import edilecektir.

/**
 * CSV dosyasından tüm durak listesini okur ve döner.
 * @returns {Promise<Stop[]>} Uygulama formatına dönüştürülmüş durak modelleri dizisi.
 */
export const getStops = async () => {
  // TODO: CSV dosyası okunacak ve parse edilecek.
  // DİKKAT: 80 adet durağın DURAKTAN_GECEN_HATLAR alanı boş (null/undefined). 
  // Uygulamanın çökmemesi (crash) için parse işlemi sırasında güvenlik kontrolü yapılmalı:
  // routes: rawRoutes ? rawRoutes.split('-').map(Number) : []
  // Örn: return parsedStops;
};

/**
 * Belirli bir durak ID'si için durağa yaklaşan otobüsleri API'den çeker.
 * @param {string} stopId - Yaklaşan araçları sorgulanacak durağın tekil ID'si.
 * @returns {Promise<ApproachingBus[]>} API'den gelen verinin ApproachingBus modeline dönüştürülmüş hali.
 */
export const getApproachingBuses = async (stopId: string) => {
  // TODO: https://openapi.izmir.bel.tr/api/iztek/duragayaklasanotobusler/{stopId} adresine GET isteği atılacak.
  // DİKKAT: API'den gelen KoorX ve KoorY değerleri virgüllü string. 
  // Harita bileşeni için float (number) tipe çevrilirken virgül noktaya dönüştürülmeli:
  // latitude: parseFloat(koorX.replace(',', '.'))
  // longitude: parseFloat(koorY.replace(',', '.'))
  // Örn: return parsedBuses;
};

/**
 * Belirli bir hatta aktif olarak çalışan tüm otobüslerin anlık konumlarını API'den çeker.
 * @param {string} routeNumber - Sorgulanacak hattın numarası (Örn: "277").
 * @returns {Promise<any[]>} Hatta ait araçların anlık konum bilgileri.
 */
export const getRouteVehicles = async (routeNumber: string) => {
  // TODO: https://openapi.izmir.bel.tr/api/iztek/hatotobuskonumlari/{routeNumber} adresine GET isteği atılacak.
  // Örn: return routeVehicles;
};