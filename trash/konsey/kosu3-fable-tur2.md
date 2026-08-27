# Tur 2 — fable · çapraz okuma ve uzatma kararı

opus'un bağımsız metni: **`docs/konsey/opus-tur1.md`**. Oku.

## Yöneticinin kararı — uzatma, nesnesiyle

Uzatma kararı ikimizde ortak. **Ben uzatma yönünde oy veriyorum** ve nesnem opus'un 3c
maddesi: soru 3 stats tablosunun sütun kümesini ve `konsey-maliyet.js` bayrağını
değiştiriyor, bu bir **şema/dosya biçimi değişikliği**; `PROTOKOL.md:31` kategori valfi
gereği tek turda kapanamaz. Bu bir tercih değil, kuralın okunması — kapatırsak mekanik ilk
somut sınavında kendi valfini deler.

İkinci nesne: opus taşıyıcı iki maddede **"emin değilim"** yazdı (A ve B). Ezici valf
gereği o maddelerde kapatma yasak.

Senin de uzatma oyun varsa kapsamını ekle; kapsamlar **birleşir**, kesişim alınmaz.

## Tur 2'de ne yapacaksın

opus'un metnini okuduktan sonra pozisyonunu **değiştirdiysen açıkça yaz ve tiplendir.**
Aşağıdaki kapsam dışına yazma.

### Y1 · Ayrışma kuralı — yakınsadınız, doğrulanması gerek

Sen *"uzat oyu tek başına yeter, kapat oyu iki imza ister"* dedin. opus *"taraflar
ayrışırsa uzatma geçerlidir"* dedi — birbirini görmeden aynı yere vardınız. opus iki şey
ekliyor:

- **uzatan taraf nesne yazmak zorunda**; nesnesiz uzatma uzatma değildir, o durumda
  kapatma geçerli olur. Gerekçesi: "uzat kazanır" kuralının lastik damgaya dönmesini
  engelleyen tek fren.
- ayrışma **loglanır**: `uzatma_karari` alanı — `ortak-uzat` · `ortak-kapat` ·
  `ayrisma-uzat`. `ayrisma-uzat` hiç görünmüyorsa yöneticinin katılımı biçimseldir.

Ve bir sınır kabul ediyor: bu kural yöneticiye tavana kadar tek yönlü cırcır verir;
`kapanis_nedeni = tavan` iki koşu üst üste bağlarsa kural *"kapat kazanır, uzatan taraf tek
turluk uzatma hakkı alır"* biçimine çekilmeli.

Bu eklemeleri alıyor musun? Senin soy-korelasyonu uyarın (yönetici opus + üye opus, çoğunluk
kuralı kurulursa opus soyu iki oy taşır) opus'un kuralında karşılanıyor mu?

### Y2 · `uzatildi_mi` — tek gerçek ayrışma

Sen *"kalsın, uzatma oranı metriği buna bağlı"* dedin. opus *"düşsün"* diyor ve nesnesi
mükerrerlik: bugünkü hali `Tur` sütunundan türetilebiliyor (`tur > 1`); bilgi taşıyan şey
uzatmanın olup olmadığı değil, **kararın nasıl verildiği** — `uzatma_karari` alanı hem bunu
hem uzatma oranını veriyor.

Tek gerçek ayrışma bu. Cevap ver.

### Y3 · opus'un görmediğin beş nesnesi

1. **Model klişesiyle reddetme.** Kimlik açıkken bir üye maddeyi *"bu opus'un alışıldık
   aşırı yapılandırması"* diye kapatabilir — nesne gibi görünen nesnesiz gerekçe. Önerdiği
   kural: **karşı üyenin modeli gerekçe nesnesi sayılmaz**; kimliğe atıfla kapanan madde
   `bulgu` değil `yakinsama` loglanır. Ve bunun **mekaniğin en zayıf halkası** olduğunu
   söylüyor: bir mekanik değil disiplin bağımlılığı, çünkü yalnız yönetici gerekçeyi log'a
   aynen yazarsa görünür.

2. **Anonimlik zaten sızmıştı.** `docs/stats/konsey.md:82`'ye kapanışta
   `masa_kompozisyonu A = fable, B = opus` yazıldı — anonim arşiv ile anahtarı aynı repoda.
   Koşu 2'de öngörülen sızıntı dosya adından değil kapanış alanından gerçekleşti.

3. **`masa_kompozisyonu`'nun değeri arttı** — koşu 2'de sen birinci opus ikinci koltuktaydı,
   koşu 3'te takas edildi. Alan olmazsa "ikinci koltuk erken kapatıyor" bulgusunun koltuk
   özelliği mi model özelliği mi olduğu bir daha ayrılamaz.

4. **Geri çekme sayısının paydası kayıtsız.** Koşu 2 "beş geri çekme" yazmış ama taşıyıcı
   madde sayısı yok; koşu 3'ün sorusu koşu 2'nin alt kümesi olduğu için daha az geri çekme
   **mekanikten bağımsız olarak beklenir.** `tasiyici_madde_sayisi` alanı öneriyor.

5. **"Emin değilim" valfi tek taraflı ve bedava.** Birinci koltuk yazar, ikinci kapatamaz,
   yazana hiçbir maliyeti yoktur. Önerisi: valf yalnız **belirsizliği çözecek gözlem
   adlandırılmışsa** tetiklenir — devir kuralındaki şart valfin girişine taşınır. opus bu
   şartı kendi iki "emin değilim"ine uygulamış.

### Y4 · Mekaniğin dondurulması

opus şunu söylüyor: koşu 2 *"ortalamaya girmez, emsal"* damgalıydı; koşu 3'te beş değişken
birden oynadığı için o da aynı damgayı almalı. Yani **defter iki satır sonra hâlâ
karşılaştırılabilir sıfır gözleme sahip**, ve her koşuda mekaniği değiştirdiğimiz sürece bu
asla değişmez — ölçü toplandığı sanılır, toplanmaz.

Önerisi: **bu koşudan sonra mekanik dondurulur**; kalibrasyon koşusu artı gerçek işte iki
koşu loglanmadan protokolde değişiklik yapılmaz.

Ayrıca 5a: protokol metni az tanımlı bir nesne, kimse bir protokol belgesine dönüp
"yanlışmış" demiyor — `yeniden_ele_alindi` bu konu sınıfında **yapısal olarak ölü**.
Protokol konulu koşular fayda ortalamasına girmesin diyor.

Katılıyor musun? Karşı çıkıyorsan nesnesini yaz.

### Y5 · Senin görmediğin bir şey yok değil — opus'un görmedikleri

Şunları opus görmedi, kapsamda tut: **okuma sırasının dönüşümlü yapılması** (geri çekmeler
üç koşu üst üste tek yönlüyse anonimlik değil sıra değişsin) · **geç tur kalitesi**
(sürdürülen oturum + tavan 4 = bağlam şişmesi, dedektör: geç turlarda nesnesiz
uzatma/kapatma oranı) · **log kırılması** (eski satırlara dokunulmaz, yalnız yeni satır
biçimi değişir).

Bunlar senin nesnelerin; opus'un metnine göre hâlâ geçerli mi, yoksa biri karşılanmış mı?

## Kapanış

opus'un iki "emin değilim" maddesi (A ve B) **tartışılmayacak.** İkisi de çözücü gözlem
adlandırmış; protokolün kendi kuralı gereği ampirik belirsizliğin tahliyesi tartışma değil
**deneye devirdir**. Onları `devredildi` işaretleyeceğim. Bu maddelerde pozisyon yazma.

Turu madde listesiyle bitir. Uzatma oyun ve kapsamın varsa ayrıca yaz.

```
| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
```

Dosya yazmıyorsun; gövdeni dönüş mesajında bas.
