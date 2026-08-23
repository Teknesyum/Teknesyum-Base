# Giriş, doğrulama, modal, toast

> **Şerh:** Modal ve toast form değildir; `U10` birleştirmesinde `overlays.md`'ye
> ayrılmaya adaydır. Dosya bugün `forms.md` adında duruyor çünkü ikinci dosya açmak
> `owns` pazarlığı demekti; ad yanlış olduğu bilinerek bırakıldı.

Bu dosya dört kalıbı tanımlar: **metin girişi**, **form doğrulama hatası**,
**modal/diyalog**, **toast**. Renk, ölçü, yarıçap, süre ve font `assets/theme.css` ile
`assets/Theme.xaml` tokenlarından gelir; bu dosya yeni değer üretmez. Web karşılığı
`assets/forms.css`, WPF karşılığı `assets/Forms.xaml`.

Okumadan önce: `SKILL §2` (palet ve rol katmanı), `SKILL §5.3` (ölçüler, odak halkası,
asgari klavye sözleşmesi), `SKILL §5.4` (hareket tabanı), `references/motion.md`.

## Ölçülen sayılar ve ölçülmemiş sayılar

Bu dosyadaki her kontrast oranı WCAG 2.x görece parlaklık formülüyle hesaplandı,
**zemin `#08090a` (`--tk-surface`)**, yarı saydam renkler önce o zemin üstünde kompozit
edildi. Hesabı `test/u3-forms.js` her koşumda baştan yapar ve aşağıdaki tablonun her
satırını karşılar — yani tablo dizgi değil, ölçüm.

| Ölçülen | Oran | Eşik | Sonuç |
|---|---|---|---|
| `--tk-text` `#ffffff` / yüzey | **19.93** | 7:1 metin | geçer |
| `--tk-danger-text` `#ff54eb` / yüzey | **7.33** | 7:1 metin | geçer |
| `--tk-warning` `#fbbf24` / yüzey | **11.94** | 7:1 metin | geçer |
| `--tk-success` `#34d399` / yüzey | **10.37** | 7:1 metin | geçer |
| `--tk-danger` `#ff00ea` / yüzey — **çerçeve** | **6.11** | 3:1 çerçeve | geçer |
| pembe `/50` / yüzey — çerçeve | **2.17** | 3:1 çerçeve | **düşer** |
| `--tk-border` mavi `/50` / yüzey | **4.11** | 3:1 çerçeve | geçer |
| `--tk-border-strong` mavi `/60` / yüzey | **5.49** | 3:1 çerçeve | geçer |
| `--tk-disabled` `#71717a` / yüzey | **4.12** | 7:1 metin | **düşer** — bu yüzden placeholder değil |

**Hata çerçevesi tam `--tk-danger` hex'idir, `/50` değil.** Pembe `/50` çerçeve 3:1'i
taşımıyor; `theme.css`'in `--tk-warning-border` yorumunda aynı ölçüm zaten yazılı.

Ölçülmemiş sayılar aşağıda geçtikleri yerde **(varsayılan, ölçülmedi)** etiketi taşır.
Etiketsiz sayı bu dosyada yoktur; bir sonraki ajan da etiketsiz sayı eklemeyecek.

---

## 1 · Metin girişi

### Beş durum

| Durum | Zemin | Çerçeve | Metin | Ek |
|---|---|---|---|---|
| varsayılan | `--tk-surface` | `--tk-border` (mavi `/50`) | `--tk-text` | — |
| hover | `--tk-surface` | `--tk-border-strong` (mavi `/60`) | `--tk-text` | — |
| odak | `--tk-surface` | `--tk-border-strong` | `--tk-text` | `SKILL §5.3` çift katmanlı odak halkası, geçişsiz |
| hata | `--tk-surface` | **`--tk-danger` tam hex** | `--tk-text` | altında hata metni + uyarı ikonu, `aria-invalid="true"` |
| devre dışı | saydam | `--tk-disabled` | `--tk-disabled` | `cursor: not-allowed` **ve** `title`/`ToolTip` zorunlu (`SKILL §2`) |

Salt okunur giriş devre dışı değildir: çerçeve `--tk-border-decorative`, metin
`--tk-text` kalır, odaklanabilir olmayı sürdürür.

### Ölçü

- `min-height: 40px` **(varsayılan, ölçülmedi — oran tahmini)**. Türetimi: 16px gövde
  metni + 12px×2 dikey dolgu. Buton 14px dikey dolgu kullanıyor; giriş bir kademe dar.
  Bu değer `SKILL §5.3`'ün **24 DIP hedef boyutu** tabanını aşar, onun yerini almaz.
- Yatay dolgu 12px, yarıçap `--tk-r` (6px, tek yarıçap).
- Yazı tipi `--font-sans`, boyut `--tk-fs-2`. **Sayı, kod, ID, anahtar taşıyan giriş
  `--font-mono` yazar** (`SKILL §3`).

### Caret ve seçim

```css
caret-color: var(--tk-blue);
```

Seçim `::selection` ile mavi `/30` zemin, metin `--tk-text`. Varsayılan tarayıcı seçimi
bu palette okunmuyor; bu satır süs değil.

WPF karşılığı: `CaretBrush="{StaticResource NeonBlue}"`,
`SelectionBrush="{StaticResource NeonBlue30}"`, `SelectionOpacity="1"`.

### Placeholder — kullanılmıyor

**Karar: bu standartta placeholder yoktur.** Gerekçe ölçülü: placeholder metindir ve
`SKILL §2`'nin 7:1 eşiğine tabidir. Soluk bir gri onu taşımaz — `--tk-disabled` yüzey
üstünde **4.12:1** verir. O tokenı placeholder'a vermek "tek gri yalnız devre dışı"
kuralını sessizce genişletir; ara bir gri icat etmek ise palete ölçülmemiş bir renk
sokar. İkisi de yapılmaz.

**Yerine ne konur** — iki kalıp, ikisi de yeterli:

1. **Yardım metni** (tercih edilen). Etiket her zaman görünür durur, örnek girişin
   **altında** `.tk-hint` ile yazılır: `--tk-text`, `--tk-fs-1`, **19.93:1**. Alana
   `aria-describedby` ile bağlanır, yazmaya başlayınca kaybolmaz.

```html
<label class="tk-label" for="port">SUNUCU PORTU</label>
<input id="port" class="tk-input tk-mono" aria-describedby="port-yardim">
<p id="port-yardim" class="tk-hint">Örn: 8080</p>
```

2. **`Örn:` kalıbı.** Bir projede placeholder'dan gerçekten vazgeçilemiyorsa metin düz
   `--tk-text` olur ve `Örn: ` önekiyle yazılır — soluk değil, tam beyaz. Bu durumda
   etiket yine görünür kalır; placeholder etiketin yerini almaz.

Placeholder'ın etiket yerine kullanılması her iki kalıpta da yasaktır: odaklanınca
kaybolan etiket, hata anında kullanıcının alanın ne olduğunu bilmemesi demektir.

---

## 2 · Form doğrulama hatası

### Yer

Hata mesajı alanın **altındadır**. Üstte olursa mesaj belirdiğinde alan aşağı iter ve
odaklı alan gözün altından kayar; bu `SKILL §5.4`'ün "hareket tıklanacak şeyi kaçırmaz"
maddesine (M12) aykırıdır. Alanla mesaj arası 6px, mesajla bir sonraki alan arası 16px.

Alan için **yer baştan ayrılmaz**. Hata metni `--tk-t-fast` · `--tk-e-out` ile opaklıkla
belirir; yüksekliği animasyonlanmaz.

### Renk ve ikinci taşıyıcı

- Metin `--tk-danger-text` (**7.33:1**) — dolgu tokenı `--tk-danger` değil. Dolgu hex'i
  metinde 6.11:1 verir, 7:1'in altındadır.
- Çerçeve `--tk-danger` **tam hex** (6.11:1).
- **Renk tek başına anlam taşımaz.** Mesajın solunda uyarı ikonu durur, 16px, metinle
  aynı renk, 6px boşluk. İkon `aria-hidden="true"` taşır; anlamı metin verir.
- Hata metnine **glow verilmez**. Metne glow yasağının istisnası yalnız hero sayıdır.

### Web bağlantısı

```html
<label class="tk-label" for="eposta">E-POSTA</label>
<input id="eposta" class="tk-input tk-input-hata"
       aria-invalid="true" aria-describedby="eposta-hata">
<p id="eposta-hata" class="tk-error">
  <svg class="tk-error-ikon" aria-hidden="true" viewBox="0 0 16 16">…</svg>
  Adres bir @ işareti içermeli.
</p>
```

`aria-invalid="true"` **ve** `aria-describedby` birlikte yazılır. Biri tek başına eksik:
`aria-invalid` alanın bozuk olduğunu söyler ama nedenini vermez, `aria-describedby` nedeni
verir ama alanı geçersiz işaretlemez.

Alan hata durumundan çıkınca `aria-invalid` **kaldırılır**, `false` yazılmaz.

Hata metnine `role="alert"` **verilmez**. `aria-invalid` + `aria-describedby` ikilisi mesajı
alan odaklandığında zaten okutur; `role="alert"` her tuş vuruşunda anlık doğrulama yapan bir
formda kullanıcının cümlesini sürekli keser. `role="alert"` bu standartta tek yerde
kullanılır: kalıcı hata toast'ı (§4).

### WPF bağlantısı

Üç düğüm birlikte:

- `Validation.ErrorTemplate` — hata çerçevesini ve altındaki metni çizer.
- `AutomationProperties.HelpText` — `aria-describedby`'ın UIA karşılığı. Narrator bunu
  alanla birlikte okur.
- `Validation.HasError` tetikleyicisi — çerçeveyi `Danger` fırçasına çevirir.

Kalıp `assets/Forms.xaml` içinde `TkTextBox` ve `TkErrorTemplate` adlarıyla duruyor.
Varsayılan WPF hata anahattı (kırmızı `Adorner`) **kapatılır**; palet dışıdır.

---

## 3 · Modal / diyalog

`references/desktop.md`'nin **`MessageBox` yasağının ikamesi budur.** O yasak bugüne
kadar ikamesiz duruyordu, yani fiilen ölüydü.

### Asgari sözleşme — `SKILL §5.3`, dört madde

1. `Tab` sırası görsel sırayla aynıdır.
2. `Esc` modalı kapatır.
3. Kapanınca odak **onu açan öğeye** döner.
4. Odak tuzağından çıkış yolu vardır; tuzağın içinde odaklanabilir öğe kalmazsa kapanır.

Açılışta odak modalin içindeki **ilk odaklanabilir öğeye** taşınır — yıkıcı eylemin
onay düğmesine değil, iptale ya da başlığa.

### Arka plan tıklaması — iki tür, iki davranış

| Tür | Arka plan tıklaması | `Esc` |
|---|---|---|
| **onay isteyen** modal (silme, üzerine yazma, geri alınamaz iş) | **kapatmaz** | kapatır, iptal sayılır |
| **bilgi** modalı (sonuç, ayrıntı, hakkında) | **kapatır** | kapatır |

Bu ayrım yazılmazsa her projede yeniden tartışılır. Onay modalinde yanlışlıkla dışarı
tıklamak işi iptal etmemeli; kullanıcı iptal ettiğini fark etmez. `Esc` her iki türde de
çalışır çünkü kasıtlı bir tuş vuruşudur.

Kalıpta ayrım tek bir öznitelikle taşınır: `data-tk-modal="onay"` / `data-tk-modal="bilgi"`.

### Ölçü ve görsel

| | Değer | Durum |
|---|---|---|
| karartma | `rgba(0, 0, 0, 0.6)` | **(varsayılan, ölçülmedi)** — ölçüt: arkadaki metin okunamaz ama panel sınırı seçilir |
| genişlik | `min(560px, 90vw)` | 560 **(varsayılan, ölçülmedi)** |
| metin gövdesi | `--tk-measure` (65ch) | ölçülü, `SKILL §3.2` |
| yüzey | `.tk-panel` (dolgu 24px, çerçeve `--tk-border`, yarıçap `--tk-r`) | ölçülü |
| başlık | `.tk-h3` | ölçülü |

Karartma katmanı **tıklanabilir alanı kaplar ama içeriği bulanıklaştırmaz**; `backdrop-filter`
kullanılmaz — arkadaki metnin okunmaması karartmanın işidir, bulanıklığın değil.

### Hareket

- Giriş: opaklık `0→1` + `scale(0.98) → 1`, `--tk-t-base` · `--tk-e-out`.
- Çıkış: girişin tersi, bir kademe kısa — `--tk-t-fast` · `--tk-e-in`.
- Karartma yalnız opaklıkla girer ve çıkar.
- Giriş animasyonu odağı **bekletmez**: öğe ilk kareden itibaren odaklanabilir.
- `prefers-reduced-motion` altında ölçek düşer, opaklık kalır — `theme.css` genel bloğu
  bunu zaten yapıyor, modal için ayrıca yazılmaz.

### WPF odak tuzağı

**En ucuz doğru yol ayrı bir `Window` + `ShowDialog()`.** Odak tuzağını, `Esc` ile
kapanmayı (`IsCancel="True"` düğmesi) ve kapanışta odağın geri dönmesini pencere yöneticisi
üstlenir.

Aynı pencere içi overlay tercih edilirse `FocusManager.IsFocusScope` **yetmez** — odak
kapsamı `Tab` gezinmesini sınırlamaz. Üçü birden gerekir:

- `KeyboardNavigation.TabNavigation="Cycle"` overlay kökünde,
- açılışta ilk öğeye `Keyboard.Focus`,
- kapanışta açan öğeye dönüş (açılırken `Keyboard.FocusedElement` saklanır).

Ayrıca overlay açıkken alttaki içerik `IsHitTestVisible="False"` olur; yoksa fare
tuzağın dışına çıkar.

---

## 4 · Toast

`SKILL §5.4` toast'un animasyonunu zaten tanımlıyordu, görselini tanımlamıyordu. Bu bölüm
onu tamamlar.

### Yerleşim ve yığılma

- Konum: **sağ alt**, kenarlardan 24px.
- En fazla **3** toast görünür. Dördüncü gelince **en eski düşer**.
- Yığın yukarı doğru büyür, aralık 12px.
- Genişlik `min(360px, calc(100vw - 48px))` **(varsayılan, ölçülmedi)**.
- Yığının kayması da animasyonlanır — `SKILL §5.4` "bildirim yığını" satırı üçünü birden
  istiyor: giriş, çıkış **ve** kayma.
- Giriş `--tk-t-fast` · `--tk-e-out`, çıkış `--tk-t-instant` · `--tk-e-in`.

### Çeşitler — üç tane, dördüncü yok

| Çeşit | Çerçeve | İkon ve metin rengi | Zemin |
|---|---|---|---|
| `success` | `--tk-success` (10.37:1) | `--tk-success` | `.tk-panel` yüzeyi |
| `warning` | `--tk-warning-border` (3.59:1) | `--tk-warning` (11.94:1) | `.tk-panel` yüzeyi |
| `danger` | `--tk-danger` tam hex (6.11:1) | `--tk-danger-text` (7.33:1) | `.tk-panel` yüzeyi |

**Info toast yok, düz metin toast var — beyaz metin, mavi çerçeve yok.** Nötr bir bildirim
gerektiğinde toast çeşit sınıfı almaz: çerçevesi `--tk-border`, metni `--tk-text`, ikonu
yok. `--tk-info` diye bir token **yoktur ve icat edilmeyecektir** — `U4` konseyinin kararı:
kullanılmayan token borçtur. Mavi çerçeveli "bilgi" toast'ı ayrıca birincil butonla aynı
ekranda karışır; ikisi de mavi olur, kullanıcı tıklanabilir olanı ayırt edemez.

Gövde metni her çeşitte `--tk-text` (19.93:1) kalır; renk **çerçeve, ikon ve başlıkta**
taşınır. Renk tek başına anlam taşımaz: her toast ikon **ve** metin taşır.

### Süre ve kapatma

| | Değer |
|---|---|
| bilgi/başarı/uyarı ömrü | **6 sn** **(varsayılan, ölçülmedi)** — kaynak yaygın pratik, ölçüm `U5`'e devredildi |
| hata (`danger`) | **kalıcı** — kendiliğinden kapanmaz, elle kapatılır |
| kapat çarpısı | 24×24 hedef alan (`SKILL §5.3`), simge 14px |

**Hover'da sayaç durur**, fare çıkınca kaldığı yerden devam eder. Klavye odağı toast'ın
içindeyken de durur — kapat düğmesine `Tab`'la ulaşan kullanıcının altından toast
kaçmamalı.

Ömür süresi bir CSS değeri değildir; `forms.css` içinde süre tokenı olarak **tanımlanmaz**.
Uygulama tarafındaki sabittir ve adı `TK_TOAST_OMUR_MS = 6000`'dir.

### Ekran okuyucu

- Kap `aria-live="polite"` taşır, sayfa yüklenirken boş olarak DOM'da durur — sonradan
  eklenen canlı bölge okunmaz.
- `role="alert"` **yalnız kalıcı hata toast'ında** kullanılır. Her toast'a verilirse
  kullanıcının okuduğu cümle sürekli kesilir.
- Kapat düğmesi `aria-label="Bildirimi kapat"` taşır.
- Doğrulama `U5`'e devredildi; buradaki kalıp ölçülmüş değil, kurala uygun.

---

## Devir listesi

| İş | Devredilen |
|---|---|
| Toast ömrünün (6 sn) ölçümü | `U5` |
| Ekran okuyucu doğrulaması — `aria-live`, `role="alert"`, Narrator `HelpText` | `U5` |
| Beş-durum entegrasyonu — giriş kalıbının canlı uygulamada beş durumunun doğrulanması | `U6` |
| Bu dosyanın `overlays.md` olarak ikiye ayrılması | `U10` |
