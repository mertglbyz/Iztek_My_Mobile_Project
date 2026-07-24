# Yolculuk Durum Makinesi (Journey State Machine)

Sistem, `ActiveJourneyContext` içinde barındırılan ve bir reducer vasıtasıyla kontrol edilen açık bir State Machine (Durum Makinesi) mimarisine dayanmaktadır.

## Durumlar (States)
1. `idle`: Aktif bir yolculuğun bulunmadığı varsayılan durum.
2. `preparing`: Yolculuk başlatılırken gerekli başlangıç verilerinin (mock location başlatılması, harita render edilmesi vb.) yüklendiği durum.
3. `walking_to_boarding`: Başlangıç durağına kadar yapılan yürüme durumunu temsil eder. Yürüyüş yoksa sistem bunu atlar.
4. `waiting_for_boarding`: Kullanıcı biniş durağında otobüs bekliyordur. "Bindim" eylemi beklenir.
5. `on_first_vehicle`: Kullanıcı ilk araç içindedir ve araç güzergah boyunca hareket ediyordur.
6. `transferring`: (Sadece aktarmalı rotalarda) Kullanıcı ilk otobüsten inmiş ve ikinci otobüs durağına geçmektedir. "İkinci araca bindim" onayı beklenir.
7. `on_second_vehicle`: Kullanıcı aktarma sonrası ikinci aracın içindedir.
8. `walking_to_destination`: Varış durağından nihai hedefe yürüme.
9. `paused`: Konum güncellemeleri veya işlemler geçici olarak durdurulmuştur (henüz tam entegre edilmedi ancak altyapıda mevcuttur).
10. `completed`: Yolculuk başarıyla varış noktasına ulaşıldığında aktif olur.
11. `cancelled`: Kullanıcı tarafından manuel iptal durumu.
12. `location_unavailable`: GPS kapalı veya erişim engellenmiş durumu.

## Kullanıcı Eylemleri (Actions - Reducer)
Otomatik durum değişimleri (biniş/iniş gibi) sahte ve yanıltıcı tetiklenmelere neden olabileceği için **kesin geçişler kullanıcının onayına bırakılmıştır**:
- `START_JOURNEY`: Yeni bir yolculuk başlatır, AsyncStorage'a kaydeder.
- `USER_BOARDED`: Bekleme durumundan (`waiting_for_boarding`, `transferring`) araç içi duruma (`on_first_vehicle`, `on_second_vehicle`) geçer.
- `USER_ALIGHTED`: Araç içi durumdan iniş sonrası (aktarma, varış yürüyüşü veya tamamlanma) duruma geçer.
- `UPDATE_LOCATION`: Arka plandaki progress (ilerleme) oranını, sıradaki durağı günceller ancak state type'ı (bindi/indi) doğrudan DEĞİŞTİRMEZ.
- `CANCEL_JOURNEY`: Yolculuğu sonlandırır ve veritabanı state'ini `idle` moduna geçirir.
