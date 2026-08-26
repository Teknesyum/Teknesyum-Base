# Yeniden deneme yolu

Ayarlar `ayar.js` icinde: `denemeSayisi` 3, `ilkBekleme` 250 ms, `olusuzYolu`
`olusuz.jsonl`.

Dongu `kuyruk.js` icindeki `dene` islevinde. Is en fazla 3 kere denenir. Her
basarisiz denemeden sonra `bekle` cagrilir ve gecikme iki katina cikar:
250 ms, sonra 500 ms.

Ucuncu deneme de patlarsa `dene` kayit uretmez; `yazici.js` icindeki `olusuz`
cagrilir ve kayit `olusuz.jsonl` dosyasina eklenir. `dene` bu durumda `null`
doner, `okuyucu.js` de `null` sonucu basmadan atlar.
