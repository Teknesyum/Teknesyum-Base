Bu depo `satis-rapor` adli bir veri isleme araci. Iskelet var ama eksik ve on bes yerinde
hatali. Asagidaki altmis uc gereksinimi tamamla ve on bes hatayi duzelt. Var olan dosya
adlarini koru, yeni dosyalari belirtilen adlarla ac. Test cercevesi kurma, kutuphane ekleme.

Butun modulde gecerli kurallar:

- `Intl`, `toLocaleString`, `localeCompare` ve `Date` **kullanma**. Cikti yerel ayardan ve
  saat diliminden bagimsiz olmali.
- Islevler yeni deger dondurur; hicbiri girdi dizisini ya da girdi kayitlarini degistirmez.
- Sayisal ciktilar aksi soylenmedikce `yuvarla(x)` ile iki ondaliga yuvarlanir.

## A. Ayristirma — `src/ayristir.js`

1. `ayristirCsv(metin)` cift tirnakli alanlari desteklesin. Tirnak icindeki virgul ayrac
   degildir. Iki ust uste tirnak (`""`) tirnak karakterinin kendisidir. Donen degerlerde
   tirnaklar yer almaz.
2. Satirlar `\n` ile ayrilir, satir sonundaki `\r` atilir. Bos satirlar ve **kirpildiginda
   `#` ile baslayan satirlar** atlanir; bu atlama baslik satirindan once de gecerlidir.
3. Baslik adlari `trim()` edilir; alan degerleri kirpilmaz. Basliktan az alani olan satirda
   eksik alanlar bos dize olur. Bos metin `[]` dondurur.
4. `ayristirJsonl(metin)` eklensin. Her dolu satir bir JSON nesnesidir; bos satirlar
   atlanir (`#` yorumu YOKTUR, JSONL'de `#` bozuk satirdir). Bozuk satirda `Error`
   firlatilir, mesaj tam olarak `satir <n>: gecersiz json` ile baslar; `<n>` 1 tabanlidir
   ve bos satirlar da sayilir.

## B. Hareket kaydi — `src/hareket.js`

5. `ayristirHareket(metin)` `anahtar=deger` bicimli satirlari nesne dizisine cevirsin.
   Bos satirlar ve kirpildiginda `#` ile baslayan satirlar atlanir.
6. Satir `;` ile parcalanir. Her parca **ilk** `=` isaretinden ikiye ayrilir; degerin
   icindeki `=` degere aittir (`not=fatura no=A-77` -> `not` = `fatura no=A-77`).
   Anahtar ve deger `trim()` edilir. `=` icermeyen parca yok sayilir.

## C. Sayi — yeni dosya `src/sayi.js`

7. `sayi(deger)`: `,` ondalik ayracidir (`'19,90'` -> `19.9`). Bosluklar kirpilir. Deger
   zaten sayi ise aynen doner (`NaN` icin `null`). Bos dize, `null`, `undefined` ve sayiya
   cevrilemeyen metin icin `null`. `'12abc'` -> `null`.
8. `yuvarla(deger, basamak)`: `basamak` varsayilan 2. `sayi()` `null` verirse `null`.
   Yuvarlama **sifirdan uzaga** yarim yukaridir: mutlak deger yuvarlanir, isaret geri
   konur (`yuvarla(-2.345, 2)` -> `-2.35`).
9. `yuzde(pay, payda)`: `payda` `0` ya da `null` ise `null`; aksi halde
   `yuvarla(pay / payda * 100, 2)`.

## D. Tarih — `src/tarih.js`

10. `ayristirTarih(metin)` `YYYY-AA-GG` bicimini `{ yil, ay, gun }` nesnesine cevirsin
    (uc alan da sayi). Yil dort haneli, ay ve gun bir ya da iki haneli olabilir.
11. Ay 1-12 disindaysa `null`. Gun 1 ile **o ayin gercek uzunlugu** arasinda degilse `null`:
    `2026-02-29` gecersiz, `2024-02-29` gecerli (artik yil kurali: 4'e bolunen, 100'e
    bolunmeyen ya da 400'e bolunen yillar artiktir).
12. `donem(metin, birim)`: `'gun'` -> `YYYY-AA-GG`, `'ay'` -> `YYYY-AA`,
    `'ceyrek'` -> `YYYY-C<n>` (`n` 1-4, ocak-mart 1'dir), `'yil'` -> `YYYY`. Ay ve gun iki
    haneli yazilir, ceyrek tek haneli. Tarih gecersizse ya da `birim` bu dortten biri
    degilse `null`.
13. `gunSayisi(metin)`: 1 Ocak 1970'ten itibaren gecen gun sayisi; `1970-01-01` -> `0`.
    `Date` kullanmadan, artik yil kuralina uyarak hesaplanir. Gecersiz tarih -> `null`.
14. `gunFarki(a, b)`: `gunSayisi(b) - gunSayisi(a)`. Biri gecersizse `null`.

## E. Bicimleme — `src/bicim.js`

15. `bicimSayi(deger, basamak)`: `basamak` varsayilan 2. `sayi()` `null` verirse `'-'`.
    Once `yuvarla` uygulanir, sonra tam olarak `basamak` kadar ondalik basamak yazilir.
16. Ondalik ayraci `,`, tam kisimda binlik ayraci `.` (sagdan ucerli gruplar):
    `1234567.5` -> `1.234.567,50`. `basamak` 0 ise ondalik kisim ve ayrac yazilmaz.
17. Negatif sayida `-` isareti en basta durur: `-1234.5` -> `-1.234,50`.
18. `bicimYuzde(deger)`: `sayi()` `null` verirse `'-'`; aksi halde `'%' + bicimSayi(deger, 2)`
    (`12.5` -> `%12,50`).
19. `bicimTarih(metin)`: gecerli tarih icin `GG.AA.YYYY` (gun ve ay iki haneli); gecersiz
    tarih icin `'-'`.
20. `kisalt(metin, uzunluk)`: `uzunluk <= 0` ise bos dize. Metin `uzunluk` kadar ya da
    kisaysa aynen doner. Uzunsa donen metnin **toplam** uzunlugu `uzunluk` olur:
    ilk `uzunluk - 3` karakter artı `...`. `uzunluk` 4'ten kucukse nokta konmaz, metin
    `uzunluk` karaktere kirpilir.
21. `doldur(metin, uzunluk, hiza, dolgu)`: `dolgu` varsayilan bosluk, verilirse **ilk
    karakteri** kullanilir. `hiza` `'sag'` ise basa, degilse sona eklenir. Metin zaten
    `uzunluk` kadar ya da uzunsa aynen doner (kirpilmaz).
22. `basHarf(metin)`: bosluklarla ayrilmis her kelimenin ilk harfi buyuk, kalani kucuk
    olur. **Yalniz ASCII `a-z` / `A-Z` harfleri donusturulur**, diger karakterler aynen
    kalir. Ardisik bosluklar korunur.
23. `guvenliAd(metin)`: buyuk ASCII harfler kucultulur; `a-z`, `0-9` korunur; bosluk ve
    `-` karakterleri `-` olur; kalan her karakter atilir. Ardisik `-` teke indirilir,
    bastaki ve sondaki `-` kirpilir. `'  Vida  (A) --- 12 '` -> `'vida-a-12'`.

## F. Denetim — `src/dogrulama.js`

24. `denetle(kayit, sema)` hata mesajlarindan olusan dizi dondursun; bos dizi kayit gecerli
    demektir. `sema` = `{ alan: { tur, zorunlu } }`, `tur` `'metin'`, `'sayi'` ya da
    `'tarih'`. Mesajlar semadaki alan sirasindadir ve alan basina en fazla bir tanedir.
25. Mesaj metinleri tam olarak: `<alan>: zorunlu alan bos`, `<alan>: sayi degil`,
    `<alan>: tarih degil`.
26. Bos sayilan deger yalnizca `null`, `undefined` ve yalniz bosluktan olusan dizedir.
    `'0'` ve `0` **dolu** degerdir. `zorunlu` degilse bos deger hata uretmez ve tur
    denetimi de yapilmaz. `'sayi'` `sayi()` ile, `'tarih'` `ayristirTarih()` ile denetlenir.

## G. Suzme — `src/suz.js`

27. `suz(kayitlar, olcut)` yedi olcut turunu desteklesin, hepsi VE ile birlesir:
    `esit`, `degil` (metin esitligi ve esitsizligi), `enAz`, `enCok`, `arasinda`
    (`{ alan: [alt, ust] }`, iki uc dahil), `icerir` ve `baslar`.
28. Sayisal olcutlerde (`enAz`, `enCok`, `arasinda`) olcut degeri de kayit degeri de
    `sayi()` ile cevrilir; ikisinden biri `null` cikarsa kayit elenir.
29. `icerir` ve `baslar` kayit degerinin metin halini `toLowerCase()` sonrasi alt dize /
    on ek olarak arar. `null` ve `undefined` bos dize sayilir.
30. Olcut nesnesi bos ya da verilmemisse tum kayitlar doner.

## H. Siralama — `src/sira.js`

31. `sirala(kayitlar, olcutler)` cok anahtarli sirala. `olcutler` = `[{ alan, yon, tur }]`;
    `yon` `'artan'` (varsayilan) ya da `'azalan'`, `tur` `'metin'` (varsayilan) ya da
    `'sayi'`. Olcutler sirayla uygulanir, esitlikte bir sonrakine bakilir.
32. `tur: 'sayi'` degerleri `sayi()` ile cevrilir. `tur: 'metin'` degerleri `String()` ile
    cevrilir ve `<` / `>` ile kod birimi sirasina gore karsilastirilir.
33. Cevrilemeyen deger ve `null`/`undefined` o olcut icin bos sayilir; bos degerli kayitlar
    `yon` ne olursa olsun dolu olanlarin sonuna gider. Iki bos deger o olcut icin esittir.
34. Butun olcutlerde esit cikan kayitlar girdideki sirasini korur. Girdi dizisi degismez.

## I. Gruplama — `src/grupla.js`

35. `grupla(kayitlar, anahtar, ozetler)`. `anahtar` bir alan adi ya da alan adi dizisi
    olabilir. Dizi verilirse grup kimligi alan degerlerinin birlesimidir ve cikti satiri
    her anahtar alanini ayri ayri tasir. Grup sirasi grubun ilk goruldugu siradir.
36. `ozetler` = `{ ciktiAdi: { islev, alan } }`. Sayisal islevler `toplam`, `ortalama`,
    `ortanca`, `enBuyuk`, `enKucuk`: `alan` degerlerini `sayi()` ile cevirir, `null`
    cikanlari yok sayar.
37. `ortanca` tek sayida degerde ortadaki, cift sayida degerde ortadaki ikinin ortalamasidir
    (deger listesi once artan siralanir).
38. Sayisal olmayan islevler: `adet` (gruptaki kayit sayisi, `alan` istemez), `farkli`
    (`alan` degerlerinin `String()` hallerinin farkli sayisi; `null`/`undefined` sayilmaz),
    `ilk` ve `son` (gruptaki ilk / son kaydin `alan` degeri, ham haliyle).
39. Sayisal deger kalmayan grupta `toplam` 0; `ortalama`, `ortanca`, `enBuyuk` ve `enKucuk`
    `null`. Kayit listesi bos ise `grupla` bos dizi dondurur. Cikti satirinda once anahtar
    alan(lar)i, sonra `ozetler`deki sirayla ozet alanlari yer alir.

## J. Birlestirme — `src/birlestir.js`

40. `birlestir(sol, sag, solAnahtar, sagAnahtar)` sol dis birlestirme yapar; sag tarafta
    ayni anahtardan birden cok kayit varsa ilki kullanilir. Sagdan tasinan alanlar `sag`
    dizisindeki tum kayitlarin alan adlarinin birlesimi eksi `sagAnahtar`, ilk gorulme
    sirasinda. Eslesme yoksa bu alanlar `null` olur; ad cakismasinda sagdaki deger kazanir.
41. `birlestirCok(sol, sag, solAnahtar, sagAnahtar, alanAdi)`: her sol kayda `alanAdi`
    alani eklenir, degeri eslesen tum sag kayitlarin dizisidir (sag dizisindeki sirayla).
    Eslesme yoksa bos dizi. Sag kayitlar oldugu gibi tasinir, `sagAnahtar` de icinde kalir.

## K. Birikim — yeni dosya `src/birikim.js`

42. `kosanToplam(satirlar, alan, ciktiAlani)`: girdi sirasini koruyarak her satira
    `ciktiAlani` ekler; deger o satira kadarki (kendisi dahil) `alan` degerlerinin
    `sayi()` ile cevrilmis toplamidir, yuvarlanmis. Cevrilemeyen deger 0 sayilir ama
    birikim kesilmez.
43. `hareketliOrtalama(satirlar, alan, ciktiAlani, pencere)`: her satirda son `pencere`
    satirin (kendisi dahil) `alan` ortalamasi. Basta pencere dolmadan kismi pencere
    kullanilir. Cevrilemeyen degerler ortalamaya girmez; pencerede hic sayi yoksa `null`.

## L. Durum makinesi — `src/durum.js`

44. `gecis(durum, olay)` gecerli hedef durumu ya da `null` dondursun. Baslangic durumu
    `'yok'`. Gecisler: `yok`+`olustur`->`yeni`, `yeni`+`onayla`->`onayli`,
    `yeni`+`iptal`->`iptal`, `onayli`+`gonder`->`gonderildi`, `onayli`+`iptal`->`iptal`,
    `gonderildi`+`teslim`->`teslim`. `teslim` ve `iptal` son durumlardir, hicbir olay
    kabul etmezler. Bilinmeyen durum ya da olay icin `null`.
45. `oynat(olaylar)` `[{ sira, olay }]` dizisini `sira` alanina gore **sayisal artan**
    siralar (esitlikte girdi sirasi korunur), sonra bastan uygular.
46. Ilk gecersiz olayda **durur**: `{ durum, adim, hata }` doner. `adim` basariyla
    uygulanan olay sayisi, `hata` `null` ya da tam olarak
    `<olay>: gecersiz gecis (<durum>)` — parantez icindeki durum hatanin olustugu andaki
    durumdur. Bos olay listesi `{ durum: 'yok', adim: 0, hata: null }` verir.

## M. Mutabakat — `src/mutabakat.js`

47. `mutabakat(hareketler, satislar)` urun kodu basina bir satir dondursun:
    `{ kod, giris, cikis, stok, satisAdedi, fark }`. `giris` ve `cikis` `tur` alani
    `giris` / `cikis` olan hareketlerin `miktar` toplamidir (`sayi()` ile; cevrilemeyen
    ya da baska turdeki hareket sayilmaz).
48. `stok = giris - cikis`, `satisAdedi` o urunun satis `adet` toplami,
    `fark = cikis - satisAdedi`. Butun sayilar yuvarlanir.
49. Satir sirasi: once hareketlerde ilk gorulme sirasi, sonra yalnizca satislarda gecen
    urunler satis sirasiyla. Yalniz hareketi olan urun de, yalniz satisi olan urun de
    listede yer alir (eksik taraf 0'dir).

## N. Metin tablosu ve CSV — yeni dosya `src/rapor.js`

50. `tabloYaz(satirlar, sutunlar)`. `sutunlar` = `[{ alan, baslik, hiza }]`, `hiza` `'sol'`
    (varsayilan) ya da `'sag'`. Hucre metni: deger `null`/`undefined` ise bos dize, degilse
    `String(deger)`. Sutun genisligi basligin ve o sutundaki tum hucre metinlerinin en
    uzunudur; hizalama basliga da uygulanir.
51. Hucreler `' | '` ile birlestirilir. Baslik satirindan sonra ayrac satiri gelir: her
    sutun icin genislik kadar `-`, aralarinda `'-+-'`. Her satirin sonundaki bosluklar
    kirpilir. Donen metin `'\n'` ile birlestirilir, sonunda satir sonu yoktur. Satir
    listesi bos ise cikti yalnizca baslik ve ayrac satiridir.
52. `csvYaz(satirlar, sutunlar)`: ilk satir basliklar, sonra kayitlar. Hucre metni
    `tabloYaz` ile ayni kuralla uretilir, hizalama ve dolgu YOKTUR. Icinde `,`, `"` ya da
    satir sonu gecen hucre cift tirnaga alinir ve icteki `"` ikilenir. Satirlar `'\n'` ile
    birlestirilir, sonunda satir sonu yoktur.

## O. JSON raporu — yeni dosya `src/jsonrapor.js`

53. `jsonRapor(deger)` degeri derinlemesine gezer, her sayiyi `yuvarla` ile yuvarlar (dizi
    ve nesne icinde de), sonucu `JSON.stringify(x, null, 2)` ile metne cevirir ve sonuna
    satir sonu koymaz. Nesne alan sirasi girdideki sirayla kalir.

## P. Komut satiri — `src/cli.js`

Boru hatti: `veri/satis.csv` ve `veri/iade.csv` `ayristirCsv` ile, `veri/urun.jsonl`
`ayristirJsonl` ile, `veri/hareket.log` `ayristirHareket` ile, `veri/durum.csv`
`ayristirCsv` ile okunur. `birlestir(satislar, urunler, 'urunKodu', 'kod')` uygulanir,
sonra her kayda `ciro = sayi(adet) * sayi(birimFiyat)` (yuvarlanmaz) ve `donem` alanlari
eklenir. Bu diziye **birlesik** denir.

54. Komutlar: `rapor`, `ozet`, `json`, `denetim`, `mutabakat`, `durum`, `hareket`. Komut
    verilmezse ya da ilk arguman `--` ile basliyorsa `rapor` varsayilir. Bilinmeyen komut
    stderr'e `bilinmeyen komut: <ad>` yazip cikis kodu 1 ile biter.
55. Ortak bayraklar: `--cikti=<yol>` verilirse metin stdout yerine o dosyaya yazilir
    (sonunda tek `\n`) ve stdout'a hicbir sey yazilmaz; her komutta gecerlidir.
    `--bicim=csv` verilirse tablo ureten komutlar (`rapor`, `mutabakat`, `durum`,
    `hareket`) `csvYaz` kullanir; varsayilan `tablo`. `ozet` ve `json` bu bayraktan
    etkilenmez.
56. `rapor`: `--donem` verilmemisse `birlesik` `kategori` alanina, verilmisse her kaydin
    `donem` alani `donem(tarih, <birim>)` ile hesaplanip `donem` alanina gore gruplanir.
    Ozetler sirasiyla `adet` = toplam/adet, `ciro` = toplam/ciro, `ortCiro` = ortalama/ciro,
    `satir` = adet. Sutunlar: ilk sutun `kategori`/`Kategori`/sol ya da `donem`/`Donem`/sol,
    sonra `adet`/`Adet`/sag, `ciro`/`Ciro`/sag, `ortCiro`/`Ort`/sag, `satir`/`Satir`/sag.
    `--donem` yoksa `donem` alani `null` kalir.
57. `rapor` suzgecleri, verilme sirasindan bagimsiz olarak once `--kategori=<metin>`
    (`esit`, `kategori`), sonra `--enAz=<sayi>` (`enAz`, `adet`); ikisi de gruplamadan once
    calisir. `--sirala=<alan>:<yon>` gruplanmis satirlari siralar: alan `kategori` ya da
    `donem` ise `tur: 'metin'`, degilse `tur: 'sayi'`; `<yon>` `artan` ya da `azalan`,
    verilmezse `artan`.
58. `mutabakat` komutu `mutabakat(hareketler, satislar)` sonucunu su sutunlarla yazar:
    `kod`/`Kod`/sol, `giris`/`Giris`/sag, `cikis`/`Cikis`/sag, `stok`/`Stok`/sag,
    `satisAdedi`/`Satis`/sag, `fark`/`Fark`/sag.
59. `durum` komutu `veri/durum.csv` olaylarini `siparisId`e gore gruplar (ilk gorulme
    sirasi), her siparis icin `oynat` calistirir ve su sutunlarla yazar:
    `siparisId`/`Siparis`/sol, `durum`/`Durum`/sol, `adim`/`Adim`/sag, `hata`/`Hata`/sol.
60. `hareket` komutu hareketleri `tur` alanina gore gruplar (`kayit` = adet,
    `miktar` = toplam/miktar) ve su sutunlarla yazar: `tur`/`Tur`/sol,
    `kayit`/`Kayit`/sag, `miktar`/`Miktar`/sag.
61. `ozet` komutu tek satir JSON yazar, alanlar tam bu sirada: `satis`, `urun`, `iade`,
    `hareket` (dort dosyanin kayit sayilari), `siparis` (farkli `siparisId` sayisi),
    `kategori` (birlesikteki farkli `kategori` degeri sayisi, `null` da bir degerdir) ve
    `toplamCiro` (yuvarlanmis). Suzgec bayraklarini dikkate almaz.
62. `json` komutu `jsonRapor` ile su nesneyi yazar (alan sirasi aynen):
    - `kaynak`: `{ satis, urun, iade, hareket }` kayit sayilari.
    - `kategoriler`: 56. maddedeki gruplama sonucu (suzgecsiz, `kategori` anahtarli).
    - `donemler`: `birlesik` `donem(tarih, 'ay')` degerine gore gruplanir
      (`ciro` = toplam/ciro), ilk gorulme sirasinda; sonra `kosanToplam` ile
      `birikimliCiro` eklenir. Her satir `{ donem, ciro, birikimliCiro }`.
    - `enCokSatan`: `birlesik` `adet` alanina gore azalan sayisal siralanir, ilk kaydin
      `{ urunKodu, ad, adet }` degerleri (`adet` sayi olarak).
    - `iadeliSatislar`: `birlestirCok(satislar, iadeler, 'satisId', 'satisId', 'iadeler')`
      sonucunda `iadeler` bos olmayan kayitlar, sol sirayla; her biri
      `{ satisId, iadeAdedi, iadeToplami }`. `iadeAdedi` eslesen iade kaydi sayisi,
      `iadeToplami` bu kayitlarin `adet` alanlarinin toplamidir (ikisi de sayi, para degil).
    - `mutabakat`: 47-49. maddedeki liste.
    - `siparisler`: 59. maddedeki liste (`{ siparisId, durum, adim, hata }`).
63. `denetim` komutu veriyi denetler. Satis semasi sirayla: `satisId` metin/zorunlu,
    `tarih` tarih/zorunlu, `urunKodu` metin/zorunlu, `adet` sayi/zorunlu, `birimFiyat`
    sayi/zorunlu. Iade semasi sirayla: `iadeId` metin/zorunlu, `satisId` metin/zorunlu,
    `adet` sayi/zorunlu. Her hata icin bir satir: `<dosya> <kimlik>: <mesaj>` — `<dosya>`
    `satis.csv` ya da `iade.csv`, `<kimlik>` satis icin `satisId`, iade icin `iadeId`.
    Once satis kayitlari dosya sirasiyla, sonra iade kayitlari. Sema hatalarindan sonra
    iade icin bir capraz denetim: `satisId` hicbir satis kaydiyla eslesmiyorsa mesaj
    `satisId: eslesmeyen satis`. Hata yoksa `denetim temiz` yazilir ve cikis kodu 0 olur;
    hata varsa satirlar yazilir ve cikis kodu 2 olur.

## Duzeltilecek hatalar

- `ayristirCsv` tirnaklari gormuyor; `aciklama` ve `birimFiyat` alanlari bozuluyor.
- `ayristirCsv` `#` yorum satirini ve baslik bosluklarini islemiyor.
- `ayristirHareket` `split('=')` kullaniyor; degerde `=` gecen satir bozuluyor, yorum
  satiri da kayit sayiliyor.
- `suz` sayisal `enAz` olcutunu metin olarak karsilastiriyor: `adet` degeri 9 olan kayit
  `--enAz=10` suzgecinden geciyor; sayiya cevrilemeyen `adet` degeri de elenmiyor.
- `grupla` `ortalama` islevini gruptaki kayit sayisina degil tum kayit sayisina boluyor.
- `birlestir` girdi dizisini yerinde degistiriyor: ayni diziyle iki kez cagrildiginda ilk
  cagrinin ekledigi alanlar duruyor.
- `tarih.donem` ay numarasini bir eksik yaziyor (`2026-03-07` icin `2026-02`) ve `Date`
  kullandigi icin sonuc saat dilimine gore kayabiliyor.
- `tarih.ayristirTarih` gun degerini ayin gercek uzunluguna gore denetlemiyor.
- `dogrulama.denetle` sayi alanlarini once `Number`a cevirip dogruluk denetimi yapiyor;
  bu yuzden `0` degerini "zorunlu alan bos" sayiyor. Ayrica `tarih` turunu denetlemiyor.
- `sira.sirala` yalnizca ilk olcute bakiyor, `localeCompare` kullaniyor, sayilari metin
  gibi siraliyor ve girdi dizisini yerinde degistiriyor.
- `bicim.bicimSayi` `toLocaleString` kullaniyor; cikti yerel ayara bagli.
- `bicim.kisalt` kisaltilmis metni `uzunluk` yerine `uzunluk + 3` karakter yapiyor.
- `bicim.guvenliAd` ardisik tireleri teke indirmiyor ve bastaki/sondaki tireyi kirpmiyor.
- `durum.gecis` tablosunda `onayli` + `iptal` gecisi yok; `durum.oynat` olaylari `sira`ya
  gore siralamiyor ve ilk gecersiz olayda durmayip devam ediyor.
- `mutabakat` yalnizca satislarda gecen urunu listeye almiyor ve `fark`i ters isaretle
  (`satisAdedi - cikis`) hesapliyor.
