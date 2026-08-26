# satis-rapor

Kucuk bir veri isleme araci. Satis, urun, iade, stok hareketi ve siparis durum
kayitlarini okur; denetler, suzer, siralar, gruplar, mutabakat yapar ve raporlar.

## Dizin

- `src/ayristir.js` — CSV ve JSONL ayristirma
- `src/hareket.js` — anahtar=deger bicimli stok hareket kaydi
- `src/suz.js` — kayit suzme
- `src/sira.js` — cok anahtarli siralama
- `src/grupla.js` — gruplama ve ozetleme
- `src/birlestir.js` — birlestirme
- `src/tarih.js` — tarih ayristirma, donem etiketi, gun sayaci
- `src/bicim.js` — sayi, yuzde, tarih ve metin bicimleme
- `src/dogrulama.js` — sema denetimi
- `src/durum.js` — siparis durum makinesi
- `src/mutabakat.js` — stok ve satis mutabakati
- `src/cli.js` — komut satiri girisi
- `veri/satis.csv` — satis kayitlari
- `veri/urun.jsonl` — urun katalogu
- `veri/iade.csv` — iade kayitlari
- `veri/hareket.log` — stok hareketleri
- `veri/durum.csv` — siparis durum olaylari

## Kullanim

    node src/cli.js rapor
