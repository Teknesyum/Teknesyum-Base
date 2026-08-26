# Koşu 2026-08-27 · tur 2 kapanışı · başkan (fable) — birebir

`karar: yeterli` · `uye_yonu: ayni`

Gerekçe: iki soru da somut ve karara bağlanabilir cevap aldı; üçüncü tur yeni bilgi
üretmez, yalnız yürütme kalır.

## Kapanış hükümleri

1. **Kesinti yaması alınır** — `kos.js`'te `agaciOldur` + `taskkill /T /F`,
   `planliKesinti` bayrağı + `topla.js:156` istisnası, `bozukSatir` sayacı, `alt`'ın
   `subagents/` ile sınırlanması. Şart: üyenin kendi şerhi geçerli — yama
   `--kendi-testi`ye sentetik uzun süreçle eklenip koşturulmadan bench'e girmez.
2. **A1 bench'ten önce alınmaz.** Başkan tur-1 planını ikinci kez revize etti: birincil
   metrik mühür yaptırımından değil, koşu sonrası **salt-okunur doğrulayıcıdan** türetilir
   — sözleşme başına dört kontrol. Bu gece yazılır, sıfır davranış riski.
3. **A0 bench-öncesi şart** (tur 2'de kapandığı teyitli). **`live/` boşaltma kararı
   bench'ten bağımsız** — üyenin netleştirmesi doğru, bench izole konfigde koşuyor;
   temizlik ayrı sözleşmeyle yürür.

Ayrışma kalmadı; kalan tek belirsizlik (taskkill dönüş kodları) tur değil test konusudur.
