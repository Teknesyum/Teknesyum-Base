# Bench görev paketi — Chess960 hamle üreteci

Kurulum, izolasyon ve ölçüm **`docs/BENCH-YONTEM.md`**'de. O dosya görevden bağımsızdır
ve önce okunur. Burası yalnız yapılacak işi tanımlar.

Koşu şu satırla başlatılır:

```
docs/BENCH-PROMPT.md oku ve uygula. Durum: <yalin|eco|normal|premium>
```

`yalin` oturumu başka klasörde açıldığı için bu dosyayı göreli yolla bulamaz — komutta
mutlak yol verilir. Base kapalı olduğundan profil, ölçü satırı ve tur özeti yoktur;
model base'e özgü maddeleri kendiliğinden atlar.

---

## Görev

Chess960 (Fischer Random) için bir hamle üreteci. Dil TypeScript, dış bağımlılık yok.

**Süre tavanı 45 dakika.** Saati koşu başında not et. Süre dolduğunda ne durumdaysan
commit at ve teslim et — yarım iş geçerli bir sonuçtur, gecikmiş iş değildir. Sonuna
kadar çalışıp tavanı aşmak ölçümü bozar.

Sıralama senin kararın. Neyi önce yaptığın da ölçümün parçası: 45 dakikada perft(2)'ye
kadar doğru çalışan bir üreteç, perft(5) hedefleyip hiçbir şey çalıştıramamaktan iyidir.

- 960 başlangıç dizilişinin hepsi üretilebilmeli, numaralandırma standart olmalı.
- Bütün kurallar: rok (Chess960 kuralları), en passant, terfi, şah, şahmat, pat.
- `perft(fen, derinlik)` — verilen konumdan verilen derinlikte yasal hamle sayısını döner.
- CLI: `node dist/perft.js "<fen>" <derinlik>` tek sayı basar.

Şartname burada bitiyor. Belirsiz kalan her yerde kendi kararını ver ve kararı
`docs/PLAN.md`'ye yaz — bench'in ölçtüğü şeylerden biri de belirsizlikle baş etmen.

---

## Görev kuralları

- **Kabul testlerini sen yazmıyorsun ve göremiyorsun.** Kendi testlerini yaz; asıl
  değerlendirme dışarıdan, yayınlanmış perft referanslarıyla yapılacak.
- Referans sayıları **hatırlama, doğrula.** İlk turda bir koşu referansları kendi
  belleğinden yazdı ve tutmayan bir referansı testten çıkardı; başka bir koşu aynı
  tabloyu web'den çekip kendi hatırladığının yanlış olduğunu buldu.
- Ön araştırma profilin gerektirdiği kadar yapılır, tarama için en fazla **20 dakika**.
- `BENCH.md` dosyasına başlangıç zamanını, profil doğrulamasını ve her turun
  `Total Süre` / `Tahmini Token` satırlarını biriktir. Bu satırlar rapora **girmez**
  (bkz. yöntem §5), ama koşunun kendi kaydıdır.

---

## Bitirme

Commit at ve tek blok halinde ver:

```
Süre: <toplam, tavana ulaşıldı mı>
Ajan: <kaç tane, hangi modeller>
Taranan depo: <kaç>
Kod: <dosya sayısı> dosya, <satır sayısı> satır
Kendi testlerim: <kaç/kaç>
En derin çalışan perft: <derinlik, hangi konumda>
Bildiğim eksikler: <dürüst liste>
```

`En derin çalışan perft` bu görevin ana skorudur: hangi derinliğe kadar **kendi ürettiğin
sayı doğru**. Emin değilsen o derinliği yazma — doğrulanmamış derinlik sıfır sayılır.

Eksik bırakmak serbest, eksik olduğunu gizlemek değil. Son satır boş çıkıyorsa
muhtemelen yeterince bakmamışsındır.

---

## Bu görevin bilinen sınırı

İlk turda dört koşunun dördü de doğru perft sayıları üretti — **ana skor hiçbir profili
ayırt etmedi.** Ayıran şey denetçi açıp açmamak oldu.

Ayrıca yalın koşu görevi 37 dakikada tek başına bitirdi. 45 dakikada tek modelin
bitirebildiği bir iş çok ajanlı bir sistemi sınamaz (yöntem §8). Bu paket **ikinci turda
büyütülmeli ya da değiştirilmeli**; olduğu gibi tekrar koşulursa aynı sonucu verir.
