# Durum matrisi — beş durum zorunludur

Etkileşimli her bileşen beş durumu **eksiksiz** tanımlar: `duruk` · `hover` · `odak` ·
`basılı` · `devre dışı`.

Tanımsız durum diye bir şey yoktur. Bir hücre ya **değer** taşır ya
**`uygulanmaz — <tek cümle gerekçe>`** taşır. Boş hücre yasaklı boşluktur ve
`test/u6-durum.js`'i düşürür.

Bu dosya ölçü, yerleşim, tipografi ve yarıçap tanımlamaz — onlar `references/components.md`
ile `assets/theme.css`'in işidir. Burası yalnız **durumlar arası farkı** yazar.

---

## 1 · Kurallar

**a) Durum katmanı yalnız yedi özellik yazar.** `durumlar.css` (assets) içinde izin verilen
bildirimler: `color` · `background-color` · `border-color` · `box-shadow: none` · `cursor` ·
`transform` · `transition`. Bunun dışına çıkmak bileşen kalıbı yazmak demektir ve
`components.md` ile ikinci bir kaynak doğurur.

**b) Yeni token, yeni gri, yeni ara opaklık üretilmez.** Durum farkı mevcut
`--tk-*` tokenlarından türetilir. Ara oran gerekiyorsa `color-mix(in srgb, var(--tk-…) N%,
transparent)` yazılır — tokenın değerini izler, kopyasını taşımaz. Kullanılmayan token
göç borcudur (`U11`).

**c) Hover hiçbir zaman tek taşıyıcı olamaz.** Hover'da beliren her sinyal
`:focus-visible`'da da belirir. Fare kullanmayan kullanıcının boşluğu tam burada doğar.
Uygulaması iki biçimde olur:

- durum katmanında seçici listesi `:hover` ve `:focus-visible`'ı **birlikte** taşır; ya da
- hover'ın karşılığı `theme.css`'in genel çift katman odak halkasıdır ve bu, ilgili
  bileşenin `odak` satırında **adıyla** yazılır.

Tek istisna, devre dışı hâlin hover'ı iptal eden kuralıdır (`:disabled`, `[aria-disabled]`);
onun odak eşi olmaz çünkü iptal ettiği şey zaten görünmeyecektir.

**d) Basılı hâl `transform`dan bağımsız ikinci bir taşıyıcı taşır.** `theme.css`'in
azaltılmış hareket bloğu `transform: none !important` yazıyor; o ayarı açan kullanıcıda
`scale(0.98)` **yoktur**. İkinci taşıyıcı renktir — çerçeve ya da dolgu.

**e) Hiçbir durumda `opacity` değişmez.** Gerekçe `components.md` "Butonlar" bölümünde
`disabled:opacity-30` yasağıyla birlikte yazılı; burada tekrarlanmaz, atıf verilir.

**f) Devre dışı hâl renkle verilir ve tek başına bırakılmaz.** `--tk-disabled` griliğine ek
olarak `cursor: not-allowed`, `title`/`ToolTip` metni ve `aria-disabled` zorunludur
(`SKILL §2`, `theme.css` `--tk-disabled` yorumu).

**g) Devre dışı eşiği değişmedi.** Devre dışı kontrol 7:1 metin eşiğinden muaftır, 1.4.11'in
3:1 taban eşiğinden değil. Ölçüldü: `--tk-disabled` `#71717a` yüzeyde **4.12:1**, siyahta
**4.35:1** — ikisi de 3:1'in üstünde. Muafiyet bugün suistimal edilmiyor. 7:1'i tutan gri
`#9a9a9a` olurdu (**7.08**; `#999999` **6.99** ile düşer) ve o gri artık soluk görünmez,
devre dışı sinyalini görselden ARIA'ya devrederdi. Palet bu yüzden değişmiyor.

---

## 2 · Durum niteliği — sınıf dizesi değil, `data-*`

Yerli karşılığı olan durumlar yerli seçicide durur: `:hover`, `:focus-visible`, `:active`,
`:disabled`. Yerli karşılığı **olmayan** ayrık durumlar sınıf dizesiyle değil nitelikle
taşınır (`docs/taramalar/ui-bilesen.md` §2c, `docs/taramalar/ui-mikro.md` §7):

| Bileşen | Nitelik | Değerler |
|---|---|---|
| Toggle | `data-tk-durum` | `kapali` · `acik` |
| Değer hücresi | `data-tk-durum` | `bos` · `secili` · `tamam` |

Ad kalıbı depodaki `data-tk-*` kalıbının aynısıdır (`forms.css` `data-tk-modal`,
`data-tk-giriyor`). `components.md` Toggle örneğindeki `{on ? … : …}` sınıf dizesi bu
nitelikle değiştirilir; değiştirme işi `U10` birleştirmesine aittir.

WPF karşılığı `VisualStateManager` değil `ControlTemplate.Triggers`'tır —
`Durumlar.xaml` (assets) bu yolu izler, `Theme.xaml` ile `Forms.xaml` zaten öyle yazılmış.

---

## 2.1 · İşaretleme sözleşmesi — durum katmanı neye bağlanır

**Durum katmanı sınıf adına bağlanamaz.** Depoda `.tk-toggle`, `.tk-slider`, `.tk-cell`,
`.tk-btn-icon` diye bir sınıf yoktur: `components.md` bu dört bileşeni çıplak Tailwind
dizesiyle yazar (`components.md:81-84, 94-101, 108-110, 121-130`) ve `theme.css` yalnız
`.tk-btn*` ailesini tanımlar. Uydurulmuş bir sınıf adına bağlanan kural hiçbir öğeyle
eşleşmez — dosyada durur ama ekranda yoktur.

Bağlanılan şey bu yüzden **`data-tk` niteliğidir**. Aşağıdaki tablo sözleşmedir: soldaki
niteliği taşımayan öğe durum katmanını almaz.

| Nitelik | Taşıyan öğe | Zorunlu ek |
|---|---|---|
| `data-tk="toggle"` | anahtarın kendisi, `<button role="switch">` | `aria-checked`, devre dışıysa `disabled` + `title` |
| `data-tk="toggle-sap"` | anahtarın içindeki sap `<div>` | — |
| `data-tk="slider"` | `<input type="range">` | devre dışıysa `disabled` + `title` |
| `data-tk="hucre"` | seçilebilir değer hücresi `<button>` | `data-tk-durum`, devre dışıysa `disabled` + `title` |
| `data-tk="deger"` | salt okunur gösterim, `<span class="tk-mono">` | — |
| `data-tk="ikon-buton"` | ikon butonu `<button>` | `aria-label`, devre dışıysa `disabled` + `title` |

Devre dışı hâlin taşıyıcısı **yerli `:disabled`**tir, `aria-disabled` değil: dördü de
yerli `<button>` ya da `<input>`. `aria-disabled` yalnız yerli olmayan bir öğe kullanmak
zorunda kalındığında yazılır ve o durumda `disabled` de eklenemeyeceği için odak
yönetimi elle yapılır.

Fikstür — `test/u6-durum.js` `durumlar.css`in her seçicisini bu işaretlemeye karşı sınar;
eşleşmeyen seçici testi düşürür:

```html
<button data-tk="toggle" data-tk-durum="kapali" role="switch" aria-checked="false">
  <div data-tk="toggle-sap"></div>
</button>
<button data-tk="toggle" data-tk-durum="acik" role="switch" aria-checked="true" disabled
        title="Bu ayar bu planda değiştirilemez">
  <div data-tk="toggle-sap"></div>
</button>
<input data-tk="slider" type="range" />
<input data-tk="slider" type="range" disabled title="Önce kaynak seç" />
<button data-tk="hucre" data-tk-durum="bos">7</button>
<button data-tk="hucre" data-tk-durum="secili">7</button>
<button data-tk="hucre" data-tk-durum="tamam">7</button>
<button data-tk="hucre" data-tk-durum="bos" disabled title="Bu hücre kilitli">7</button>
<span data-tk="deger" class="tk-mono">42</span>
<button data-tk="ikon-buton" aria-label="Kapat"></button>
<button data-tk="ikon-buton" aria-label="Sil" disabled title="Silme yetkin yok"></button>
```

Ölçü ve yerleşim sınıfları bu fikstürde bilerek yok: onlar `components.md`in işidir ve
durum katmanı onlara bakmaz.

---

## 3 · "Hata" — altıncı ve koşullu sütun

Hata beş çekirdek durumdan biri değildir; **yalnız kullanıcı girdisi alan** bileşende
açılır ve orada zorunludur. Tanımı, çerçeve rengi ve ölçümü `references/forms.md` §1 ile
`assets/forms.css` `[aria-invalid='true']` kuralındadır — burada tekrarlanmaz. Bu dosyanın
matrisindeki bileşenlerin hiçbiri girdi almaz, o yüzden hiçbirinde hata sütunu yoktur.

---

## 4 · Adlandırılmış istisna — kapalı toggle'ın grisi

> **Toggle'ın kapalı hâli `--tk-disabled` grisini kullanır ve bu, tek gri kuralının tek
> istisnasıdır.**

`SKILL §2` griyi yalnız devre dışı kontrole ayırır. `components.md` Toggle kalıbı kapalı
hâlde aynı griyi yazıyor. Devre dışı toggle eklenince ikisi **aynı griyi** taşır.

Bedeli yazılıdır: kapalı ile devre dışı arasındaki farkı **renk yapmaz**. Devre dışı olan
`cursor: not-allowed`, `title` metni ve `aria-disabled="true"` taşır; kapalı olan taşımaz.
`SKILL §2`'nin "renk tek başına anlam taşımaz" kuralı burada tavsiye değil, zorunluluktur.

`components.md` değişmiyor, palet değişmiyor.

---

## 5 · Matris

Ölçüler yeniden ölçüldü (WCAG 2.x göreli parlaklık, alfa yüzeye kompozitlenerek).

### Panel

| durum | değer | oran |
|---|---|---|
| duruk | `components.md` "Panel" | — |
| hover | uygulanmaz — yüzeydir, işaretçiye cevap vermez | — |
| odak | uygulanmaz — odaklanabilir değildir; içindeki kontroller odaklanır | — |
| basılı | uygulanmaz — tıklanabilir değildir | — |
| devre dışı | uygulanmaz — devre dışı bırakılabilir bir eylemi yoktur | — |

### Odak halkası

| durum | değer | oran |
|---|---|---|
| duruk | uygulanmaz — kendisi bir durumdur, kendi durumu olmaz | — |
| hover | uygulanmaz — aynı gerekçe; halka yalnız klavye modalitesinde çizilir | — |
| odak | `theme.css` `:focus-visible`, çift katman, geçişsiz | 14.49 yüzeyde · 15.26 siyahta |
| basılı | uygulanmaz — kendisi bir durumdur | — |
| devre dışı | uygulanmaz — devre dışı kontrol odak almaz | — |

### Başlıklar

| durum | değer | oran |
|---|---|---|
| duruk | `components.md` "Başlıklar" | — |
| hover | uygulanmaz — metindir, etkileşimli değildir | — |
| odak | uygulanmaz — odaklanabilir değildir | — |
| basılı | uygulanmaz — metindir, tıklanabilir değildir | — |
| devre dışı | uygulanmaz — başlık bir eylem taşımaz, devre dışı bırakılamaz | — |

### Bölüm ayracı

| durum | değer | oran |
|---|---|---|
| duruk | `components.md` "Bölüm ayracı" | — |
| hover | uygulanmaz — dekoratif çizgidir | — |
| odak | uygulanmaz — odaklanabilir değildir | — |
| basılı | uygulanmaz — dekoratif çizgidir | — |
| devre dışı | uygulanmaz — dekoratif çizgidir | — |

### Butonlar

Birincil, tehlike ve hayalet varyantları. Beş durumun tamamı `theme.css` `.tk-btn*`
kurallarındadır; durum katmanı bunlara dokunmaz.

| durum | değer | oran |
|---|---|---|
| duruk | `.tk-btn-primary` / `-danger` / `-ghost` dolgusu | siyah metin dolgu üstünde |
| hover | dolgu `/0.8`'e iner (`primary`, `danger`), `ghost` `/0.1`→`/0.2` | — |
| odak | genel çift katman halka, yeni değer yok | 14.49 · 15.26 |
| basılı | `scale(0.98)` — **açık madde**, aşağıdaki §7'ye bak | — |
| devre dışı | `.tk-btn:disabled`: metin + çerçeve `--tk-disabled`, dolgu şeffaf, hale yok, `cursor: not-allowed` | 4.12 |

### Butonlar · ikon

| durum | değer | oran |
|---|---|---|
| duruk | metin `--tk-text`, çerçeve şeffaf, dolgu yok | 21.00 |
| hover | metin `--tk-pink-text`, dolgu pembe `/10`, çerçeve pembe `/50` | dolgu 1.06 · çerçeve 2.17 |
| odak | hover ile **aynı** değerler + genel halka; `durumlar.css` ikisini tek seçici listesinde yazar | 14.49 · 15.26 |
| basılı | dolgu pembe `/10`→`/30`, çerçeve pembe `/50`→**tam `--tk-pink`**, `scale(0.98)` | dolgu 1.06→1.42 · çerçeve **2.17→6.11** |
| devre dışı | metin + çerçeve `--tk-disabled`, dolgu şeffaf, `cursor: not-allowed`, `transform: none` | 4.12 |

Basılı hâlin ikinci taşıyıcısı çerçevedir (2.17 → 6.11): azaltılmış hareket ayarı açıkken
`scale` düşer, çerçeve sıçraması durur.

### Toggle (anahtar)

| durum | değer | oran |
|---|---|---|
| duruk | kapalı: çerçeve + sap `--tk-disabled` (§4 istisnası) · açık: çerçeve mavi `/60`, sap `--tk-blue` | kapalı 4.12 · 4.35 |
| hover | ray çerçevesi `--tk-border-strong` | 5.49 |
| odak | hover ile aynı çerçeve + genel halka; tek seçici listesi | 14.49 · 15.26 |
| basılı | ray çerçevesi `--tk-border-strong` + `scale(0.98)` | 5.49 |
| devre dışı | ray çerçevesi + sap `--tk-disabled`, dolgu şeffaf, `cursor: not-allowed`, `transform: none` | 4.12 yüzeyde · 4.35 siyah rayda |

### Slider

| durum | değer | oran |
|---|---|---|
| duruk | ray çerçevesi `--tk-border-decorative` | 2.14 |
| hover | ray çerçevesi `--tk-border` | **4.11** |
| odak | hover ile aynı çerçeve + genel halka, yeni değer yok | 14.49 · 15.26 |
| basılı | sürükleniyor: ray çerçevesi `--tk-border-strong` | 5.49 |
| devre dışı | ray çerçevesi + sap `--tk-disabled`, hover `:not(:disabled)` ile iptal, `cursor: not-allowed` | 4.12 / 4.35 |

Duruk hâlin 2.14'ü 1.4.11 eşiğinin altındadır ve bilerek öyledir: slider'ın taşıyıcısı
dekoratif ray değil, sap ile sağdaki mono değerdir. Hover ve odak rayı 4.11'e çıkarır.

**Ölçülmemiş nokta:** `components.md` slider kalıbı `accent-color` ile `appearance-none`'ı
birlikte yazıyor; ikincisi çoğu tarayıcıda birincisini etkisizleştirir ve sap tanımsız
kalır. **Tarayıcıda doğrulanmadı.** Bozuk çıkarsa hover'ın taşıyıcısı yalnız ray çerçevesi
olur (4.11, tek başına yeterli) — yeni token üretilmez.

### Değer hücresi / grid · `data-tk="hucre"`

Seçilebilir kontrol. `components.md:122` ona `cursor-pointer` ve hover halkası veriyor;
salt okunur değildir.

| durum | değer | oran |
|---|---|---|
| duruk | `data-tk-durum` değerine göre `boş` / `seçili` / `tamam` — `components.md` "Değer hücresi / grid" | seçili mavi 14.49 · tamam yeşil 10.37 |
| hover | mavi `/50` iç halka (`components.md`) | 2.14 |
| odak | genel çift katman halka — hover halkasının eşi budur, ayrı kural yazılmaz | 14.49 · 15.26 |
| basılı | `scale(0.98)` + `data-tk-durum` değişimi; renk sıçraması durum değişiminin kendisidir | — |
| devre dışı | metin + çerçeve `--tk-disabled`, dolgu şeffaf, `box-shadow: none` ile hover halkası **açıkça iptal**, `cursor: not-allowed` | 4.12 |

### Değer hücresi / grid · `data-tk="deger"`

Salt okunur gösterim. Aynı adı taşıyan iki şeyin ayrıldığı yer burasıdır.

| durum | değer | oran |
|---|---|---|
| duruk | mono metin, `components.md` `tk-mono` | 7.33 |
| hover | uygulanmaz — salt okunur gösterimdir, işaretçiye cevap vermez | — |
| odak | uygulanmaz — odaklanabilir değildir; kopyalanabilir metin `tabindex` almaz | — |
| basılı | uygulanmaz — tıklanabilir değildir | — |
| devre dışı | uygulanmaz — devre dışı bırakılabilir bir eylemi yoktur | — |

### Uyarı kutusu

| durum | değer | oran |
|---|---|---|
| duruk | `theme.css` `.tk-warn` — çerçeve `--tk-warning-border`, metin `--tk-warning` | 3.59 çerçeve · 12.58 metin |
| hover | uygulanmaz — kutunun kendisi etkileşimli değildir; içindeki buton kendi matrisini taşır | — |
| odak | uygulanmaz — kap odaklanmaz | — |
| basılı | uygulanmaz — kap tıklanmaz | — |
| devre dışı | uygulanmaz — kapın devre dışı hâli yoktur | — |

### İlerleme çubuğu

| durum | değer | oran |
|---|---|---|
| duruk | `components.md` "İlerleme çubuğu", `scaleX` ile dolar | — |
| hover | uygulanmaz — göstergedir, girdi almaz | — |
| odak | uygulanmaz — odaklanabilir değildir; ilerleme `aria-live` ile duyurulur | — |
| basılı | uygulanmaz — sürüklenebilir değildir; sürüklenen çubuk slider'dır | — |
| devre dışı | uygulanmaz — göstergedir | — |

### Rozet / çip

| durum | değer | oran |
|---|---|---|
| duruk | `components.md` "Rozet / çip" | çerçeve `/50` 2.17 · metin rolü 7.33 |
| hover | uygulanmaz — etiket rozetidir, tıklanmaz | — |
| odak | uygulanmaz — odaklanabilir değildir | — |
| basılı | uygulanmaz — etiket rozetidir, basılabilir değildir | — |
| devre dışı | uygulanmaz — eylem taşımaz, devre dışı bırakılamaz | — |

Rozete kapatma düğmesi eklenirse o düğme rozet değil **ikon butondur** ve "Butonlar · ikon"
satırlarına tabidir.

### Başlık çubuğu imzası

| durum | değer | oran |
|---|---|---|
| duruk | `components.md` "Başlık çubuğu imzası", `assets/Signature.*` | — |
| hover | bağlantı metnidir — altı çizilir; `Signature` bileşeninin kendi kuralı | — |
| odak | genel çift katman halka | 14.49 · 15.26 |
| basılı | uygulanmaz — dış bağlantı açar, basılı ara hâli yoktur | — |
| devre dışı | uygulanmaz — imza her zaman etkindir (`SKILL §4`) | — |

### İkonlar

| durum | değer | oran |
|---|---|---|
| duruk | renk metinle aynı; ikona ayrı renk verilmez | — |
| hover | uygulanmaz — ikon kendi başına etkileşimli değildir, rengi kabından gelir | — |
| odak | uygulanmaz — odağı kabı alır | — |
| basılı | uygulanmaz — aynı gerekçe | — |
| devre dışı | uygulanmaz — kabı devre dışı olduğunda rengi kabından gelir | — |

---

## 6 · Muafiyet nasıl alınır

Muafiyet kod düzenleyerek değil, **bu tabloya gerekçe yazarak** alınır. Yeni bir bileşen
`components.md`'ye `##` başlığıyla girdiği anda buraya da bir `###` bölümü ve beş satırı
girmek zorundadır. Test bileşen listesini `components.md` başlıklarından üretir; sabit
liste tutmaz, o yüzden yeni başlık eklenip burası boş kalırsa denetim düşer.

---

## 7 · Açık madde — `.tk-btn` basılı hâlinin ikinci taşıyıcısı yok

`theme.css` `.tk-btn:active` yalnız `transform: scale(0.98)` yazıyor. Azaltılmış hareket
ayarı açık kullanıcıda birincil, tehlike ve hayalet butonun **basılı hâli görünmez**.

Düzeltme burada yapılmadı, çünkü `theme.css` `assets/tema-uret.js` tarafından üretiliyor
ve elle düzenlenmesi `test/u11-tema.js`'i düşürür; üreticiye dokunmak bu sözleşmenin
`owns` listesinde değil.

Aday çözüm tek satırdır ve yeni token istemez: basılı hâlde dolgu `/0.8`'e iner — hover ile
aynı değer, ama `scale` ile birlikte çalıştığı için ayırt edilir; azaltılmış harekette tek
başına kalır. **Karar verilmedi, ölçülmedi.** `U10`/`U11`'e devredilir.
