/**
 * Aktif Yolculuk Takibi ve Durak İlerleme Algoritması Sabitleri
 * 
 * Bütün "magic numbers" (sihirli sayılar) burada toplanmıştır.
 * Algoritmanın davranışını değiştirmek için buradaki eşikler güncellenebilir.
 */

export const JourneyConstants = {
    /**
     * Bir durağa "ulaşıldı" (reached) kabul edilebilmesi için gereken maksimum mesafe.
     * 20 metre — durağın hemen yanından geçilmesini gerektirir.
     * Consecutive match ile birlikte kullanıldığında tek GPS spike durak tetiklemez.
     */
    STOP_REACHED_THRESHOLD_METERS: 20,

    /**
     * Kullanıcının rotadan saptığını (off-route) anlamak için geçilmesi gereken mesafe eşiği.
     * Otobüsün kendi güzergahından 150 metreden fazla uzaklaşması durumu.
     */
    OFF_ROUTE_THRESHOLD_METERS: 150,

    /**
     * GPS verisinin algoritma tarafından dikkate alınabilmesi için gereken
     * maksimum accuracy (doğruluk) değeri. Eğer cihaz "Beni 60m sapmayla buldum" diyorsa,
     * bu veriyi durak ilerletmek için kullanmayız.
     */
    MIN_REQUIRED_ACCURACY_METERS: 50,

    /**
     * İlerlemenin sahte bir GPS zıplaması olmadığını kanıtlamak için
     * arka arkaya durağa kaç kez yakın (threshold içinde) konum alınması gerektiği.
     * (Debounce / Confirmation count)
     */
    REQUIRED_CONSECUTIVE_MATCHES: 2,

    /**
     * Biniş durağına yaklaşıldığında "Bindim" butonunu aktif etmek için
     * kullanılacak öneri eşiği. GPS buraya girdiğinde buton highlight olur
     * ama otomatik state geçişi YAPILMAZ.
     */
    BOARDING_SUGGESTION_THRESHOLD_METERS: 100,

    /**
     * İniş durağına / Aktarma durağına "2 Durak Kaldı" uyarısının tetikleneceği sınır.
     */
    STOPS_REMAINING_WARNING_2: 2,

    /**
     * İniş durağına / Aktarma durağına "1 Durak Kaldı" (İnmeye Hazırlanın) uyarısının tetikleneceği sınır.
     */
    STOPS_REMAINING_WARNING_1: 1,

    /**
     * Aktif yolculuğun AsyncStorage üzerinde tutulabileceği maksimum süre (Saat).
     * Bu süreden eski yolculuklar otomatik iptal (cancelled) sayılır.
     */
    MAX_JOURNEY_AGE_HOURS: 12,

    /**
     * AsyncStorage debounce süresi (ms). Konum güncellemelerinde bu süre
     * dolmadan tekrar yazma yapılmaz.
     */
    STORAGE_DEBOUNCE_MS: 10_000,
};
