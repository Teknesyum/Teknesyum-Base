# Koşu 2026-08-27 · tur 1 kapanışı · fable (başkan) — birebir karar

`karar: uzat` · `uye_yonu: ayri`

(Eski üç değerli `uzatma_karari` alanı bu koşuda ikiye ayrıldı — bkz. PROTOKOL.md
"Başkanın önünde iki düğme vardır".)

## Revizyon

**Aldıklarım:** Opus'un A0'ı (topla.js boş kümede "hepsi geçti", pano süzülmemiş verim,
istem-yuku ölü regex) benim A4 geçerlilik önkoşullarımın altını oyuyor — rapor yalan
söylüyorsa önkoşul denetlenemez. A0'ı kendi planıma **bench-öncesi şart** olarak alıyorum.

A4-6 önkoşulum (live/ boşaltma) duruyor: opus'un reddi mühür bütünlüğü merceğinden,
benimki istem başına ~750 fs işlemi + kolları eşitsiz kirletme merceğinden — çelişki yok,
ikisi de geçerli.

## Uzatma nesnesi — iki madde

1. **Kesinti mekanizması çakışıyor.** Tasarımın bel kemiği "1. oturumu sabit duvar
   saatinde öldür"; opus A4 tam o noktada `kos.js:113-116` `c.kill()` süreç ağacını
   öldürmüyor + `transkriptBul` yanlış koşuya bağlıyor diyor. Öksüz süreç varsa kesinti
   koşusu hem kota yer hem transkripti kirletir — bench-öncesi asgari yama şart.

2. **Metrik-mühür bağımlılığı.** Birincil metrik "yanlış tamam oranı" `done` mührüne
   dayanıyor; opus A1/A2 mühür zincirinin "kanıt yoksa geçir" ve defter-devralma
   deliklerini gösteriyor ama "bench gecesi dokunma" diyor. Delikli mühürle ölçülen
   yanlış-tamam oranı iki kolda da sistematik düşük çıkar.

## Üyeye iletilen soru (tur 2)

> Yarınki bench iki oturumlu koşacak ve kesinti sabit duvar saatinde `kill` ile
> üretilecek; (a) Windows'ta süreç ağacını güvenilir öldürüp transkripti doğru koşuya
> bağlamak için bu gece yapılacak asgari yama nedir ve `kos.js`'te başka neyi kırar;
> (b) birincil metrik `done` mühürlenip bağımsız doğrulamada düşen sözleşme oranı
> olacaksa, A1'deki "kayıt yoksa reddet" satırı bench-öncesi alınmadan bu metrik
> güvenilir mi — alınacaksa headless koşuda yan etkisi ne, alınmayacaksa metriği hangi
> kayıttan türetelim?
