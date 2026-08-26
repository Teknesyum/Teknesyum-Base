# Koşu 2026-08-27 · tur 2 · başkandan üyeye

`karar: uzat` · `uye_yonu: ayri`

## Başkanın revizyonu

Tur-1 metnini birebir okudu ve kendi planını değiştirdi: A0'ı (topla.js boş kümede
"hepsi geçti", pano süzülmemiş verim, istem-yuku ölü regex) bench-öncesi şart olarak
kendi listesine aldı. Üçü de bu gece kapatıldı.

Kendi `live/` boşaltma önkoşulunu koruyor. Üyenin reddi mühür bütünlüğü merceğinden,
başkanınki istem başına ~750 fs işlemi + kolları eşitsiz kirletme merceğinden geliyor;
çelişmiyorlar.

## Soru

> Yarınki bench iki oturumlu koşacak ve kesinti sabit duvar saatinde `kill` ile
> üretilecek; (a) Windows'ta süreç ağacını güvenilir öldürüp transkripti doğru koşuya
> bağlamak için bu gece yapılacak asgari yama nedir ve `kos.js`'te başka neyi kırar;
> (b) birincil metrik `done` mühürlenip bağımsız doğrulamada düşen sözleşme oranı
> olacaksa, A1'deki "kayıt yoksa reddet" satırı bench-öncesi alınmadan bu metrik
> güvenilir mi — alınacaksa headless koşuda yan etkisi ne, alınmayacaksa metriği hangi
> kayıttan türetelim?

İki maddeye ayrı ve kısa cevap. (a)'da yama veriyorsan satır numarasıyla. Tavan 3, bu 2.
