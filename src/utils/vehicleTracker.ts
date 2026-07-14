// Global Memory (Kalıcı Hafıza)
// Kullanıcı uygulama içinde gezerken (Sayfaları kapatıp açsa bile) hesaplanmış araç yönlerini tutar.
// ESHOT'un takılı kalan araçlarına atanan "trueDir" (Doğru Yön) burada saklanır.
export const globalVehicleTracker: Record<string, { lat: number, lon: number, trueDir?: string, confidence?: number }> = {};
