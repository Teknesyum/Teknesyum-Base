# Hata: tur makbuzu cevabın tamamını tekrarlatıyor

**Durum:** kapandı 23.08.2026 — 2.44.0. Makbuz `systemMessage` kanalına alındı, iki
bloklayan uyarı metni "cevabını yeniden yazma" diyor, ölçüm notu `relay-watch.js` ve
`test/run.js` içinde duruyor.
**Belirti:** Kullanıcı aynı cevabı arka arkaya iki kez görüyor. İkinci kopya birebir
aynıdır, tek farkı en altına eklenmiş `Total Süre: … Base tahmini …` satırıdır.
**Kaynak:** `teknesyum/hooks/relay-watch.js` — `turOzetiBas()`, satır 662-672
**Görüldüğü oturum:** 23.08.2026, sesli bildirim çalışması; üç turun üçünde de tekrarladı.

---

## 1. Mekanizma

`relay-watch.js` `Stop` olayında tur makbuzunu basıyor. Basma kanalı tek sabitle
seçiliyor ve şu an `model`:

```js
const OZET_KANALI = 'model';

function turOzetiBas(satir) {
  if (OZET_KANALI === 'kullanici') return duyur(satir, 1, true);
  if (seviye() < 1) return;
  ciktiEkle({
    hookSpecificOutput: {
      hookEventName: 'Stop',
      additionalContext: ceviri('turOzetiYonerge', satir),
    },
  });
}
```

Modele giden metin (`dil.js`, `turOzetiYonerge`):

> Turu kapatırken cevabının en altına şu satırı **ters tırnakları dahil** olduğu gibi
> yaz, tek satır olarak: `Total Süre: …`

Talimat kendi içinde tutarlı ama **uygulanamaz.** `Stop` olayı adı üstünde tur bittikten
sonra çalışır. O anda cevap yazılmış, kullanıcıya gitmiş, ekranda durmaktadır. Model
yazılmış bir mesajın altına satır ekleyemez — elinde tek bir yol vardır: **yeni bir mesaj
yazmak.** Talimat "cevabının en altına" dediği için model cevabı yeniden üretir ve satırı
sonuna koyar. Kullanıcı iki kopya görür.

Yani hata modelin talimatı yanlış anlamasından değil, **doğru anlamasından** doğuyor.
Verilen görevin tek olası uygulaması bu.

## 2. Neden bu kanal seçilmiş

Kod içindeki ölçüm notu gerekçeyi açıkça yazıyor (satır 653-661):

> `Stop` olayı `additionalContext` kabul ediyor. Satır modele verilince `Stop says:`
> öneki hiç oluşmaz, çünkü satırı kullanıcıya model basar.

Alternatif olan `systemMessage` kanalında satırın başına `Stop says: ` öneki geliyor ve
bu önek kaldırılamıyor — 736. satırdaki ikinci ölçüm notu bunu da belgelemiş: render
katmanı öneki `hookName` değişkeninden runtime'da üretiyor, konfigden gelmiyor.

**Yapılan takas hatalıydı.** Kozmetik bir önekten kaçınmak için cevabın tamamının
tekrarlanması kabul edilmiş. Önek tek satırın başında altı karakterdir; tekrar ise
ekranın tamamıdır. İkincisi birincisinden mertebe olarak daha kötüdür ve okunabilirliği
asıl bozan odur.

Notun sonundaki cümle bir varsayım içeriyor ve tutmuyor:

> Damga dosyası ilk `Stop`'ta silindiğinden yeniden sorgulanan tur ikinci bir özet
> üretmez.

Doğru — ikinci makbuz üretilmiyor. Ama sorun ikinci makbuz değil, **ikinci cevap.**
Damga dosyası makbuzun tekrarını engelliyor, cevabın tekrarını engellemiyor. Ölçüm
doğru şeyi ölçmüş ama yanlış şeyi güvenceye almış.

## 3. İkinci tür tekrar

Aynı oturumda bir tekrar daha oldu, kaynağı farklı: `Stop` kancasının **bloklayan**
kolu. "Senden istediklerim başlığı yok" uyarısı `decision: block` ile döndü, model
cevabı başlığı ekleyerek yeniden üretti, kullanıcı yine iki kopya gördü.

Bu kolun bloklaması tasarım gereğidir ve yerindedir — eksik başlık gerçekten düzeltilmeli.
Ama görünen sonuç aynıdır ve kök neden aynı sınıftandır: **zaten basılmış bir mesajı
`Stop` anında düzeltmeye çalışmak.** Claude Code'da basılmış mesaj geri alınamaz; her
`Stop`-anı düzeltmesi ekranda bir kopya bırakır.

İkisi arasındaki fark önemlidir ve düzeltme de farklı olmalıdır:

| | makbuz satırı | eksik başlık uyarısı |
|---|---|---|
| Sıklık | her tur | kural ihlalinde |
| Değeri | bilgilendirme | düzeltme |
| Tekrar bedeli | her turda ödenir | nadiren ödenir |
| Karşılığı var mı | yok — satır bilgi taşır, cevabı değiştirmez | var — cevap gerçekten eksikti |

Makbuz her turda bedel ödetiyor ve karşılığında cevabı iyileştirmiyor. Öncelikli
düzeltilecek olan odur.

## 4. Seçenekler

**A — kanalı `kullanici` yap.** Tek satırlık değişiklik: `OZET_KANALI = 'kullanici'`.
Kod zaten bu kolu taşıyor, `duyur()` üzerinden `systemMessage` basılıyor ve
`BILDIRIM_BICIMI = 'blok'` sayesinde önek kendi satırında kalıyor. Tekrar tamamen biter.
Bedeli: satırın üstünde `Stop says:` yazar. **Önerilen budur.**

**B — makbuzu bir sonraki turun başına taşı.** `UserPromptSubmit` olayında, bir önceki
turun makbuzunu bas. Orada `additionalContext` doğal olarak çalışır çünkü model henüz
cevap yazmamıştır; satırı cevabın içine yerleştirmesi mümkündür. Bedeli: makbuz bir tur
gecikir ve oturumun son turunun makbuzu hiç basılmaz. `SessionEnd` ile tamamlanabilir
ama iki yerde iki kod yolu demektir.

**C — makbuzu kaldır.** Süre ve token bilgisi Claude Code'un kendi `/cost` ve durum
satırında zaten mevcut. Eklentinin ayrıca basmasının kazancı tartışmalı.

**D — olduğu gibi bırak.** Tekrarı kabul et. Savunulamaz: kullanıcı üç turda üç kez
sordu, tekrar fark ediliyor ve rahatsız ediyor.

## 5. Bloklayan kol için ayrı düzeltme

Eksik başlık uyarısının kendisi kalmalı ama **`Stop` anı yanlış an.** Aynı denetim
`UserPromptSubmit` anında yapılamaz (cevap henüz yok), ama uyarının metni
değiştirilebilir: "cevabını yeniden yaz" yerine "eksik başlığı ayrı bir mesajda tamamla"
denirse model tam kopya değil sadece eksik parçayı basar. Ekranda iki kopya yerine bir
cevap ve bir ek görünür.

Bu, kök nedeni ortadan kaldırmaz — basılmış mesaj hâlâ geri alınamaz — ama tekrarın
boyutunu ekranın tamamından birkaç satıra indirir.

## 6. Kabul kriterleri

1. Ardışık üç turda hiçbir cevap iki kez basılmaz.
2. Tur makbuzu her turda tam olarak bir kez görünür.
3. `steering` 0 iken makbuz hiç görünmez, tekrar da olmaz.
4. Eksik başlık uyarısı tetiklendiğinde ekranda tam kopya değil yalnız eksik parça belirir.
5. `OZET_KANALI` sabitinin iki değeri de çalışır durumda kalır; seçim tek satırdan
   dönebilir olmalıdır.

## 7. Devam promptu

> `relay-watch.js` içindeki tur makbuzu, cevabın tamamının tekrarlanmasına yol açıyor.
> Teşhis `docs/HATA-tur-makbuzu-tekrari.md` içinde tamamlanmış durumda, kök neden kesin.
> §4'teki A seçeneğini uygula: `OZET_KANALI` sabitini `'kullanici'` yap ve 653-661
> satırlarındaki ölçüm notunu güncelle — not şu an yanlış şeyi güvenceye aldığını
> söylüyor, düzeltilmeli. Ardından §5'teki bloklayan kol düzeltmesini yap: uyarı metni
> cevabın yeniden yazılmasını değil eksik parçanın ayrı mesajda tamamlanmasını istesin.
> §6'daki beş kabul kriterini karşıla.
