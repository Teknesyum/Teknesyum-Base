# Hata: acilis bildirimi tek satira sikistiriliyor, uzun metin bolunmuyor

**Durum:** açık.
**Belirti:** bes ayri uyari '   ·   ' ile tek satirda birlestiriliyor; satir tasiyor ve icindeki komut/dosya adlari renksiz duz metin olarak okunuyor
**Kaynak:** teknesyum/hooks/relay-watch.js:1321
**Görüldüğü proje:** Vidshrink

---

## 1. Ne oldu

Oturum açılışında modele şu tek satır verildi (kısaltılmadı, olduğu gibi):

```
Teknesyum ▸ premium mod · her ajan opus · 20 paralele kadar · plan konseyi fable + opus · ikinci görüş fable   ·   röle kurulu · sözleşme 7/17 bitti · 10 açık · kaldığım yerden sürdürüyorum   ·   önceki oturum 100 saat önce · kaydı yoksa bile devralınır: /load son ile transkriptten okurum   ·   1 ajan worktree'si duruyor · iş bittiyse git worktree remove ile temizle   ·   346 ajan sorunu kayıtlı · live/_sorun.log dosyasını aç, sebebi gör, sessiz geçme
```

Kullanıcının şikayeti iki başlıkta:

1. Satır ekrana sığmıyor, sarmalanmıyor, okunmuyor.
2. İçinde geçen `/load son`, `git worktree remove`, `live/_sorun.log` gibi komut ve dosya
   adları başlığın ortasında renksiz düz metin olarak beliriyor; kullanıcı bunları
   "başlığın aralarındaki renksiz yazılar" diye görüyor ve rahatsız oluyor.

Kullanıcının kendi cümlesi:

> tek satıra sığmayan bildirimleri yeni satıra geçicek şekilde bölsün · bu kadar uzun
> görev açıklaması yapacaksa bi zahmet güzel gözükecek şekilde bassın

### Kök neden

`relay-watch.js` içinde bütün açılış parçaları toplanıyor ve **tek `duyur` çağrısında**
birleştiriliyor:

```js
if (parca.length) duyur(parca.join('   ·   '));   // ← satır 1321
```

Oysa `duyur` çoklu satırı zaten destekliyor (`relay-watch.js:849-852`):

```js
function duyur(mesaj, min, tam) {
  if (seviye() < (min || 1)) return;
  _duyuru.push(tam ? mesaj : 'Teknesyum ▸ ' + mesaj);
  const govde = _duyuru.join('\n');      // ← ayrı çağrılar zaten \n ile birleşiyor
  ...
```

Yani altyapı hazır: her parça ayrı `duyur` çağrısı olsaydı, satırlar kendiliğinden alt
alta inecekti. Hemen aşağıdaki iki çağrı bunu zaten doğru yapıyor:

```js
const g = guncellemeBak();
if (g) duyur(ceviri('guncellemeVar', g.uzak, g.kurulu));   // kendi satırı
if (depoBak(cwd, kaynak)) duyur(ceviri('depoGeride'));     // kendi satırı
```

Sorun yalnız `:1321`'deki toplu `join`.

### Renksiz metin kusuru

Komuta eşlik eden talimat, modelden satırı **ters tırnak içinde** basmasını istiyor.
Beş parça tek satırda birleşince, o satırın tamamı tek bir kod parçası oluyor. İçindeki
`/load son`, `git worktree remove`, `live/_sorun.log` ifadeleri ayrı ayrı işaretlenemiyor
— hepsi aynı tek renkli kod bloğunun içinde eriyor. Kullanıcının gördüğü "renksiz yazı"
bu.

Parçalar ayrı satırlara bölünürse her satır kendi biçimini alabilir ve komut/dosya adları
kendi kod parçalarına konabilir.

### Önerilen düzeltme

Tek satırlık değişiklik:

```js
if (parca.length) parca.forEach((p) => duyur(p));
```

Bunun yanında iki iyileştirme değer:

- **Parça içindeki `·` ayraçları da uzun.** Örneğin "röle kurulu · sözleşme 7/17 bitti ·
  10 açık · kaldığım yerden sürdürüyorum" tek parça ama dört bilgi taşıyor. Parça
  üretimi zaten `ceviri()` üzerinden; uzun olanlar ikiye bölünebilir.
- **Komut ve dosya adları `dil.js` içindeki çeviri metinlerinde ters tırnakla
  işaretlenmeli** (`` `/load son` ``, `` `git worktree remove` ``,
  `` `live/_sorun.log` ``). Böylece satır düz metin olarak basıldığında bile komut
  olduğu belli olur.

Talimat metni de "her biri kendi satırında" diyor; bugün tek satır geldiği için o talimat
karşılanamıyor.

## 2. Ölçü

Bu hatanın kapandığını gösteren tek şey:

**Açılışta birden fazla uyarı varken modele giden `systemMessage` gövdesinde uyarı sayısı
kadar `\n` ayrılmış satır bulunmalı — hepsi tek satırda `   ·   ` ile birleştirilmiş
olmamalı.**

Somut sınama: en az üç uyarı tetikleyen bir projede (açık sözleşme + boşta worktree +
kayıtlı ajan sorunu) oturum açılıp açılış çıktısına bakılır.

- Bugün: tek satır, üç uyarı `   ·   ` ile bitişik.
- Kapandığında: üç ayrı satır, her biri kendi `Teknesyum ▸` ön ekiyle.

İkinci ölçüt: parça metinlerinde geçen komut ve dosya adlarının ters tırnak içinde
gelmesi (`/load son`, `git worktree remove`, `live/_sorun.log`).
