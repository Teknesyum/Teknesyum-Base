---
name: teknesyum-ui
description: Neon arayüz standardı. Herhangi bir kullanıcı arayüzü, panel, pencere, sayfa, bileşen veya CSS/XAML yazarken ya da mevcut bir arayüzü değiştirirken kullan. Renk paleti, tipografi ölçeği, başlık hiyerarşisi, bileşen kalıpları ve imza/sponsor bloğunu içerir. Web, React, Electron ve WPF/WinForms projelerinin hepsini kapsar. Kendiliğinden yürürlüğe girmez: yalnız `teknesyum-ui.json` varken uygulanır, yoksa hiçbir renk ya da ölçü dayatılmaz. /uisetup ile kurulur, özelleştirilir veya kapatılır.
---

# Neon UI standardı

## 0. ÖNCE KULLANICI AYARINI OKU

**Bu standart kendiliğinden yürürlüğe girmez.** Ayar dosyası yoksa hiçbir renk, ölçü ya da
imza dayatılmaz — bu bir tercih değil, sözleşmenin kendisidir. Aşağıdaki palet ve ölçüler
bir kişinin zevkidir; onu depoyu indiren herkesin projesine sessizce yazmak,
standartlaştırma değil dayatmadır.

Şuraya bak: `<proje>/.claude/teknesyum-ui.json`, yoksa `~/.claude/teknesyum-ui.json`.
Projeye özel olan kullanıcı geneline üstündür.

| Durum | Ne yaparsın |
|---|---|
| İkisi de yok | **Bu skill'i uygulama.** Projenin mevcut tarzıyla devam et. Kullanıcı o turda arayüz yazdırıyorsa altına tek satır ekle: *"Arayüz standardı kurmak istersen `/uisetup` birkaç soruyla seninkini oluşturur — hazır bir neon şablonu da var."* Bu satırı oturumda bir kez söyle, ısrar etme. |
| `"kapali": true` | Uygulama. Kullanıcı açıkça istemedi; şablonu da önerme. |
| Dosya var, `kapali` değil | Standart yürürlüktedir. Aşağıdaki varsayılanlar geçerli, dosyadaki alanlar onları ezer. |

Dosya yürürlükteyken:

- `"palet"`, `"tipografi"`, `"imza"` alanları varsa aşağıdaki varsayılanları **ezer**.
- `"ekNot"` alanı varsa kullanıcının kendi yazdığı kuraldır — varsayılanlarla çelişirse
  **kullanıcının notu kazanır**.

`/uisetup` bir şablon sunar, bir kimlik dayatmaz: neon paleti hazır cevap olarak durur,
kullanıcı kendi rengini, fontunu ve imzasını yazdığı anda standart onun olur.

**Bu standart yalnız karanlıktır.** Aydınlık tema hiçbir dosyada tanımlı değildir ve bu bir
unutma değil, yazılı bir karardır: `#00f3ff` beyaz zeminde ~1.4:1 verir, yani aydınlık
sürüm 11 rengin tamamını, opaklık merdivenini ve glow mantığını sıfırdan ölçmeyi gerektirir.
Aydınlık istenirse bu ayrı bir palet işidir ve **ileriye bırakılmıştır** — tam stabil sürüm
çıkmadan öncelik değil, ama kapalı da değil; ayarların içinde opsiyon olarak açılabilir.
`prefers-color-scheme: light` kullanıcısında da karanlık kalınır. Yerine ne konacağı bellidir:
aydınlık isteyen proje bu standardı kapatır (`"kapali": true`) ve kendi paletini kurar.

## 1. Kurulum (yeni proje)

| Stack | Kopyala | Nereye |
|---|---|---|
| Tailwind v4 | `assets/theme.css` | `src/index.css` başına |
| Düz CSS / Vanilla | `assets/theme.css` | `src/theme.css`, `<link>` ile bağla |
| WPF / .NET | `assets/Theme.xaml` | `Themes/Theme.xaml`, `App.xaml` MergedDictionaries |
| Avalonia | `assets/Theme.axaml` | `Assets/Theme.axaml`, `App.axaml` içinde `StyleInclude` |
| WinForms / CLI | `assets/Palette.cs` | proje köküne |

**Varsayılan bağımlılıklar.** Yeni projede bunlar sorulmadan kurulur; hepsi izin veren
lisansta ve hepsi `prefers-reduced-motion` farkında.

| Yığın | Paket | Ne için |
|---|---|---|
| React / Electron | `motion` | bileşen animasyonu, `useReducedMotion` |
| React / Electron | `@formkit/auto-animate` | liste, tablo, bildirim — üç satırlık iş |
| React / Electron | `@base-ui-components/react` | erişilebilir davranış katmanı |
| JS / TS | `biome` | lint + biçim, tek ikili tek yapılandırma |
| JS / TS | `i18next` + `react-i18next` | `locale/*.json` sözlüğü |
| Electron | `electron-vite`, `electron-builder` | derleme ve paketleme |
| WPF / .NET | — | `WindowChrome` ve `Storyboard` yerleşik, paket gerekmez |
| WPF / .NET | `Velopack` | kurulum ve otomatik güncelleme (dağıtılacaksa) |

`motion` kurulunca **iş bitmiyor.** Kütüphanenin `prefers-reduced-motion` varsayılanı
kapalıdır (`MotionConfigContext.tsx:72` → `reducedMotion: "never"`); `useReducedMotion`
hook'u gelir, politika gelmez.

Kök sarmalayıcıya `<MotionConfig reducedMotion="user">` yazılmazsa Motion sistem ayarını
yok sayar ve §5.4'ün erişilebilirlik kuralı sessizce çiğnenir. Ayrıntı ve WPF karşılığı:
§5.4.

Görünüm bizim, davranış onların: Base UI odak yönetimi, klavye gezinmesi ve `aria`
tarafını verir, tek bir rengi belirlemez. Hazır tema kütüphanesi (WPF UI, MahApps,
HandyControl, MUI) **kurulmaz** — kendi görsel kimliğini dayatır, §8'in tema bütünlüğü
kuralıyla çatışır.

## 2. Palet (varsayılan)

```
neon-blue    #00f3ff   birincil. eylem, aktif durum, sayısal vurgu, başlık
neon-pink    #ff00ea   ikincil dolgu, çerçeve, durum — uyarı, ters eylem
neon-purple  #b026ff   üçüncül dolgu, çerçeve, durum — mod anahtarı, scrollbar
pink-text    #ff54eb   pembenin METİN rolü — mono değer, kritik sayı
purple-text  #c67eff   morun METİN rolü — ikincil bağlantı, ghost buton yazısı
bg           #000000   uygulama zemini — nötr, tam siyah
surface      #08090a   panel zemini (95% opak), zeminden ancak çerçevesiyle ayrılır
text         #ffffff   okunması gereken HER şey — gövde, başlık, tablo, değer, etiket metni
label        #00f3ff   etiket ve bölüm başlığı (kalın, tracking'li — uppercase değil)
danger      →#ff00ea   pembenin ROL adı — hata, yıkıcı eylem, ters onay
danger-text →#ff54eb   pink-text'in ROL adı — hata METNİ (dolgu hex'i metinde 7:1 vermez)
warning      #fbbf24   YALNIZCA uyarı yüzeyi: metin, çerçeve, ikon. Dolgu ve buton yok.
success      #34d399   yalnızca "tamamlandı"
disabled     #71717a   YALNIZCA devre dışı kontrol. Tek gri budur.
```

**Rol kazanır.** Durum bildiren her bileşen **rol tokenı** yazar (`danger`, `warning`,
`success`); marka ve dekor **marka tokenı** yazmayı sürdürür. Rol tokenı marka tokenının
**değerini izler**, kopyasını değil; rol hex'i elden yazılmaz, eşitliği `test/u4-renk.js`
ölçer. **`info` rolü bilerek yok:** kullanılmayan token borçtur; açılırsa maviye bağlanır
ve birincil butonla aynı ekranda info dolgusu kullanılmaz.

**Pembe ve morun iki hex'i var, çünkü iki işi var.** Dolgu hex'i marka kimliğidir ve
değişmedi; metin hex'i aynı OKLCH hue'da açıklığı artırılmış hâlidir. Hue farkı ölçüldü:
pembede 0.06°, morda 0.11° — göz aynı rengi görür, kontrast ölçer geçer.

| Rol | Hex | oklch | `#000000` | `#08090a` |
|---|---|---|---|---|
| neon-pink · dolgu | `#ff00ea` | 0.690 0.310 333.03 | 6.44 | 6.11 |
| **pink-text** · metin | `#ff54eb` | 0.729 0.258 332.96 | **7.72** | **7.33** |
| neon-purple · dolgu | `#b026ff` | 0.601 0.286 307.98 | 4.57 | 4.33 |
| **purple-text** · metin | `#c67eff` | 0.720 0.191 308.09 | **7.83** | **7.43** |

`neon-blue` (15.26 / 14.49) ve `success` (10.92 / 10.37) 7:1'i zaten geçiyor; onlarda rol
bölünmesi yok, tek hex iki işi de görür.

**`warning #fbbf24` — yalnızca uyarı yüzeyi: metin, çerçeve, ikon. Dolgu ve buton yok**
(amber dolguda beyaz metin **1.67:1** — çöker). Uyarı metni `warning` (12.58 / 11.94),
çerçeve `warning/50` (`#08090a` üstünde **3.59** — pembe/50 2.17 ve mor/50 1.83'ün
taşımadığı 3:1 eşiğini taşır); eylem butonu **birincil** ya da **`danger`** olur. Amber
ile `success` protanopide ayrışmaz (ΔE 15.2, `docs/olcumler/renk-korlugu.md`) — yan yana
durum satırları ikon ya da metin de taşır. Gerekçelerin tam metni asset yorumlarında;
kısıt ve eşitliği `test/u4-renk.js` ölçer.

Bir ekranda **mavi baskın, pembe vurgu, mor seyrek**. Pembe ve morun asıl yeri
**durum**tur: hover, focus, seçim, sürükleme. Kalıcı pembe metin, bilinçli marka vurgusu
değilse kullanılmaz.

**Zemin nötrdür — metnin rengiyle akraba olamaz.** Mavi yazının arkasına mavimsi yüzey,
pembe yazının arkasına morumsu yüzey konmaz; kontrast sayıca yetse bile göz ayırt edemez.
Renk yalnızca yazıda, çerçevede ve durum vurgusunda bulunur.

**Kontrast pazarlık konusu değil.** Zemin tam siyah, yazı tam beyaz. `#d1d5db`, `#9ca3af`,
`#6b7280` gibi ara griler yok — koyu zeminde soluk gri, tasarım değil okunmayan yazıdır.
Hiyerarşi **boyut, ağırlık, tracking ve neon renkle** kurulur, parlaklık düşürerek değil.

**Eşik ikiye ayrılır — kural gevşemiyor, kapsamı yazılıyor.**

| Rol | Eşik | Neye karşı ölçülür |
|---|---|---|
| Metin ve metin gibi okunan simge | **7:1** | üstünde durduğu zemin — `#000000` **ve** `#08090a`, ikisi de |
| Dolgu, çerçeve, halka, durum vurgusu | **3:1** (WCAG 1.4.11) | **bitişik** her renk, yalnız sayfa zemini değil |
| Dekoratif çizgi, ızgara, ayraç, veri arkası | eşik yok | — |

Üçüncü satır bilerek var: **ızgara metin değildir.** 7:1'i grafiğin ızgara çizgisine harfi
harfine uygulayan kişi veriyle aynı parlaklıkta bir ızgara çizer ve grafiği okunmaz hâle
getirir. Bir öğe okunacaksa birinci satır, sınır çiziyorsa ikinci satır, yalnız arkada
duruyorsa üçüncü satır geçerlidir.

Devre dışı kontrol 7:1'den muaftır; o da griliğe ek bir işaretle belli edilir (ikon,
imleç, tooltip) — renk körü kullanıcı griyi göremez. **Tooltip zorunludur**, üçü arasında
seçmeli değil: devre dışı bırakılan her kontrol neden devre dışı olduğunu yazan bir
`title`/`ToolTip` taşır. Kural asset yorumlarında da duruyor (`theme.css`, `Theme.xaml`,
`Palette.cs`).

**Renk tek başına anlam taşımaz** — WCAG 1.4.1, **A** seviyesi. Bir bilgiyi yalnız renkle
anlatan arayüz, renk körü kullanıcıda o bilgiyi hiç vermez. Her renk sinyalinin ikinci bir
taşıyıcısı olur: şekil, ikon, metin ya da konum.

| Yer | Yalnız renk yetmez | Yerine ne konur |
|---|---|---|
| Alt bilgi durum noktası | yeşil / pembe nokta | **dolu daire = kurulu, halka (içi boş) = kurulu değil** — şekil farkı; CSS `.tk-dot-on` / `.tk-dot-off` |
| Mod anahtarı | mor = açık | anahtarın yanına durum metni (`Açık` / `Kapalı`) |
| Form doğrulama | pembe çerçeve | çerçevenin altına hata metni + uyarı ikonu |
| Devre dışı kontrol | gri | tooltip (yukarıdaki kural) + `not-allowed` imleci |

Ölçüt tek cümle: **ekran görüntüsünü gri tonlamaya çevir, bilgi hâlâ okunuyorsa geçer.**

**Pembe ve mor ayırt edilemez — ölçüldü** (Viénot 1999 + ΔE2000: protanopide
5.8; eşik < 10 ayırt edilemez). **İkisi aynı ekranda tek ayırt edici olamaz** — çifti böl
ve birini `neon-blue` yap, ikinci taşıyıcı ekle ya da ikisini aynı anda gösterme. Mavi,
ayırt edici taşıyabilen tek vurgu rengidir. Tam ΔE tablosu ve eşikler
`docs/olcumler/renk-korlugu.md` — vurgu rengiyle durum ayırt eden her iş önce oraya bakar.

**Dolgulu butonun yazısı siyahtır.** Neon dolgu üzerine beyaz yazı `neon-blue`'da
1.38:1 verir — okunmaz. `tk-btn-primary` ve `tk-btn-danger` `color: #000` kullanır.
Kural asset'te uygulanıyordu ama burada yazılı değildi. `warning` dolgulu buton diye
bir şey yok (yukarıdaki kısıt); olsaydı yazısı da siyah olurdu — beyaz 1.67:1 verir.

**Zemin düz renk değil, yumuşak geçişli bir gradienttir.** Uygulamanın tamamını kaplayan
tek bir gradient bulunur; panel ve kutular onun üstüne oturur. Düz `#000000` dolgu eksik
teslimdir.

- Duraklar **en az 11** *(varsayılan, ölçülmedi)* ve birbirine çok yakın — iki duraklı
  gradient koyu temada bantlaşır. Bantlaşmanın kendisi ölçülmüş bir hatadır; 11 sayısı
  pratikte yeterli bulunmuş bir taban, ölçülmüş bir eşik değil. Ölçüt sayı değil sonuçtur:
  gradient 8-bit ekran görüntüsünde görünür şerit vermiyorsa geçer.
- Uçlar `bg` `#000000` ile `surface` `#08090a` arasındadır; aradaki fark 1.06:1. Gradient
  bir **doku**dur, geçiş değil: hiyerarşi kurmaz, hiçbir bilgiyi taşımaz.
- Tek kesintisiz yüzeydir. Üst şeride bir, içeriğe başka bir gradient verip dikiş bırakma.
- **Yavaşça hareket eder.** Zemin gradienti §5.4'teki sonsuz döngü yasağının **tek adı
  konmuş istisnasıdır**: açıları çok yavaş kayar, kullanıcı baktığında hareketi fark eder
  ama okurken dikkatini dağıtmaz. Ölçü: **döngü ≥ 40 s**, açı oynaması ≤ 20°
  *(varsayılan, ölçülmedi)* — iki sayı da bir algı ölçümüne değil, "fark edilir ama
  rahatsız etmez" yargısına dayanıyor; asset'teki gerçek değer 48 s'dir. Durak renkleri
  değişmez, yalnız gradientin ekseni döner. Süre token'ı `--tk-bg-donus`;
  bilerek `--tk-t-*` ölçeğinin **dışındadır**, çünkü bu bir geçiş süresi değil döngü
  periyodudur ve ölçeğin içine girerse hareket tavanını 48 sn'ye çıkarır.
  Parlaklık dalgalanması, renk
  değişimi, nefes alan opaklık yok; bunlar hâlâ yasak.
- **`prefers-reduced-motion: reduce` altında durur** ve statik gradiente düşer. WPF'te
  `SystemParameters.ClientAreaAnimation` kapalıysa aynısı. Bu isteğe bağlı değil.
- **Tek animasyon zemindedir.** Panellerin, kartların, kutuların kendi gradienti dönmez;
  hareket eden yüzey uygulamada birdir.
- Token `--tk-bg`. WPF'te enterpolasyon `ScRgbLinearInterpolation`
  (`references/layout.md` §5.6).

**Beyaz zemin kullanma.** Beyaz burada yazının rengidir, zeminin değil. Sızdığı yerler
bellidir: `WebView`/`iframe` gövdesi, PDF ve rapor önizlemesi, boş `DataGridView`, yazdırma
görünümü, yüklenmemiş `<img>`, üçüncü parti denetim varsayılanı, `MessageBox`. Hepsine
açıkça `bg`/`surface` verilir.

Beyaz dolgu yalnızca **avuç içi kadar** alanda geçerli: ikon içi, veri noktası, imleç.
Panel, satır, sekme veya diyalog zemini asla. İçeriğin kendisi beyaz zeminliyse (kullanıcının
PDF'i, dış sayfa) `surface` çerçeve içine alınır, kenara dayanmaz.

Glow **kutuya** uygulanır: dolgulu buton `box-shadow: 0 0 20px <renk>40`, çerçeveli kutu
`inset 0 0 8px <renk>`, ikon `drop-shadow(0 0 5px <renk>)`. Glow'suz neon yüzey yok.

**Glow'un payı: 24px.** Dışa taşan glow taşıyan yüzeyin çevresinde en az 24px boşluk
bulunur; yoksa glow konmaz, yerine `/50` kenarlık. **Glow ve kaydırma:** glow tekrar
eden öğeye değil kapsayıcı panele verilir; WPF'te tekrar eden öğede `DropShadowEffect`
**mutlak yasaktır** — sayı eşiği yok. Muafiyetler, kapsam ve 16 ms reçetesi
`references/motion.md` **M15**'te — glow koyan her iş önce orayı okur.

**Metne glow verilmez.** Ölçüldü: hale kenarları yumuşatıyor, küçük puntoda okunurluğu
düşürüyor, ekran görüntüsünde bulanık çıkıyor. Neon etkisi zaten renkten geliyor. Tek
istisna **hero sayı** (30px, 900) — harf yeterince kalın. Başlık, etiket, gövde, bağlantı,
tablo değeri: glow yok. **Okunurluk gösterişten üstündür.**

Hero glow'u tek tokendır ve iki platformda **aynı yoğunluğu** verir: **blur 8, opaklık 0.8**.
CSS `--tk-glow-hero` → `filter: drop-shadow(var(--tk-glow-hero))`; WPF `HeroGlow` →
`DropShadowEffect BlurRadius="8" ShadowDepth="0" Opacity="0.8"`. Inline değer yazılmaz;
iki dosyada iki ayrı sayı, "aynı standart" iddiasını çürütür.

Opaklık merdiveni — sadece bunlar: dolgu `/10`, hover `/20`, aktif `/30`, **çerçeve `/50`**,
güçlü çerçeve `/60`.

**Varsayılan kenarlık `/50`'dir, `/30` değil.** Ölçüldü: `neon-blue/30` siyah zeminde
`#00494d` verir ve zeminle kontrastı **2.06:1** — 1.4.11'in 3:1 eşiğinin altında. `/50`
`#007a80` verir, **4.07:1**. Paneli zeminden ayıran tek şey çerçevesi olduğu için (yüzey
zemin farkı yalnız 1.06:1) bu ölçüm doğrudan panelin görünürlüğüdür.

`/30` bundan sonra **dekoratif** çerçevedir: sınır bildirmeyen, kaldırıldığında hiçbir
bilgi kaybolmayan ayraçlar. Bir çerçeve "buraya kadar" diyorsa `/50`'dir.

| Basamak | Kompozit (`#000000` üstünde) | Kontrast | Rolü |
|---|---|---|---|
| `neon-blue/10` | `#00181a` | 1.15 | dolgu |
| `neon-blue/20` | `#003133` | 1.48 | hover dolgusu |
| `neon-blue/30` | `#00494d` | 2.06 | dekoratif çizgi |
| `neon-blue/50` | `#007a80` | **4.07** | **varsayılan kenarlık** |
| `neon-blue/60` | `#009299` | 5.56 | güçlü kenarlık, seçili durum |

## 3. Tipografi (varsayılan)

**Zincirin tek kaynağı burasıdır.** `theme.css`, `Theme.xaml` ve `Palette.cs` bu iki satırı
taşır; üçünden biri ayrışıyorsa hata odur, burası değil. **Zincirin başı üçünde de aynıdır**
— sans `Atkinson Hyperlegible Next` → `Segoe UI`, mono `Cascadia Mono` → `Consolas`.
Kuyruğu WPF ve WinForms kısaltır. İki ayrı sebep var ve karıştırılmamalı: `system-ui`,
`-apple-system` ve `ui-monospace` CSS'e özgü genel adlardır, .NET font zincirinde
**karşılıkları yoktur**. `Courier New` ise standart bir Windows ailesidir ve
kullanılabilirdi — zincirden **tercihen** çıkarıldı, çünkü `Consolas` her Windows'ta
bulunur ve ikinci bir daktilo yedeği okunurluk kazandırmıyor. **Bu platform sınırıdır, ayrışma değil** — ayrışma sayılan tek şey
zincirin başındaki adların ya da sıralarının farklılaşmasıdır.

```
Sans: 'Atkinson Hyperlegible Next', 'Segoe UI', system-ui, -apple-system, sans-serif
Mono: Cascadia Mono, Consolas, ui-monospace, 'Courier New', monospace
```

**Atkinson Hyperlegible Next varsayılandır, koşullu değil.** Eskiden "veri yoğun arayüzde
tercih edilir" diye bir koşulu vardı; koşulu kimse ölçemediği için font pratikte hiç
kullanılmadı. Varlık sebebi okunurluk: benzer harfleri (`l/I/1`, `O/0`, `rn/m`) ayırt
edilebilir çizer ve bu standardın kimliği neon + okunurluk üzerine kurulu. **Projeye
gömülür** (web `@font-face`, WPF pack URI, WinForms `PrivateFontCollection`), sistemde var
sayılmaz. Gömülmediyse zincir Segoe UI'ye düşer — bu bir kabul değil, eksik teslimdir.

Segoe UI zincirde **yedek** olarak durur, varsayılan olarak değil: bir sistem fontudur,
macOS ve Linux'ta bambaşka bir yüz render olur, yani "standart" iki makinede iki ayrı sonuç
verir. Mono'da **Cascadia Mono** başta, `Consolas` geride — Consolas 2007 fontudur.
*Ölçülmedi:* Cascadia Mono'nun eski sürümlerinde `İ` noktası sorunu vardı; gömülecek sürüm
gözle doğrulanır.

Mono **her sayı, tuş, kod, ID, süre** içindir. Ama **cümle içi sayı mono'ya zorlanmaz** —
cümlenin ortasında font değişimi görsel gürültüdür. Ayrım nettir:

| Sayının yeri | Font | Nasıl |
|---|---|---|
| Veri sayısı — tablo hücresi, sayaç, süre, ID, tuş, kod, boyut | **mono** | `.tk-mono` / `MonoValue` |
| Cümle içinde geçen sayı — "3 dosya seçildi", "en az 11 durak" | **sans + tabular** | gövdede `font-variant-numeric: tabular-nums` açık |

Gövdeye `font-variant-numeric: tabular-nums` (WPF: `Typography.NumeralAlignment="Tabular"`)
verilir; böylece sans içindeki sayılar da sabit genişlikte olur ve değişen değer satırı
oynatmaz.

**Taban: normal metin 16, ikincil/yardım metni 14'ün altına inmez.** Bu bir tercih değil
alt sınır; 10-13 punto etiketler koyu zeminde okunmuyor ve kullanıcı okumak için ekrana
yaklaşıyor. Birim: web `px`, WPF `DIP` — 96 dpi'de aynı şey.

**Ölçek 1.25 major third, beş basamak: 14 · 16 · 20 · 24 · 30.** Tokenlar `--tk-fs-1` …
`--tk-fs-5`. Eski ölçek (14/16/20/28) elle seçilmişti — oranları 1.143, 1.25, 1.4 ile
tutarsızdı ve **h1 yoktu**, yani sayfa başlığı ile panel başlığı aynı basamağı paylaşmak
zorundaydı. Ara boyut ekleme: yeni bir boyut gerekiyorsa ölçeğin kendisi tartışılır, tek
bir kullanım yeri değil.

| Rol | Boyut | Ağırlık | Satır | Tracking | Renk |
|---|---|---|---|---|---|
| Hero sayı | 30 (`fs-5`) | 900 | 1.2 | −0.01em | neon-blue + glow |
| Panel başlığı (h2) | 24 (`fs-4`) | **600** | 1.2 | 0.02em | neon-blue |
| Bölüm başlığı (h3) | 20 (`fs-3`) | **600** | 1.2 | 0.05em | neon-blue |
| Gövde | 16 (`fs-2`) | 400 | 1.5 | 0 | `#ffffff` |
| Mono değer | 16 (`fs-2`) | **600** | 1.4 | 0 | **pink-text** `#ff54eb` |
| Etiket | 14 (`fs-1`) | **600** | 1.2 | 0.15em | neon-blue |
| Yardım / ipucu | 14 (`fs-1`) | 400 | 1.5 | 0 | `#ffffff` |

**Ağırlık 700 değil 600.** Karanlık zeminde açık renkli metin optik olarak kalınlaşır ve
bunun telafisi yoktu. Asıl sorun tek bir değer değildi: **700 ağırlık + 0.1em tracking +
mavi renk** üçlüsü her başlık seviyesinde birlikte tekrarlanıyordu — "her şey bağırıyor"
hissinin kaynağı buydu. Üçü birlikte gevşetildi. **700, hero dışında hiçbir tipografi
rolünde kalmadı**; hero 900 kalır, çünkü glow taşıyabilmesi için kalın olması gerekiyor.
Yerine ne konacağı bellidir: vurgu gerekiyorsa **bir basamak büyüt**, kalınlaştırma.

**Tracking boyutla ters orantılıdır.** Geniş pozitif harf aralığı bir *küçük etiket*
tekniğidir; 20px'lik bir başlığa uygulanınca başlık etiket gibi görünür. Bu yüzden aralık
boyut büyüdükçe düşer: etiket `0.15em` → h3 `0.05em` → h2 `0.02em` → hero `-0.01em`.
Tokenlar `--tk-tr-label` · `--tk-tr-h3` · `--tk-tr-h2` · `--tk-tr-hero`.

**WPF ve WinForms'ta tracking yoktur — telafisi yazılıdır, sessiz bırakılmadı.** CSS
`letter-spacing` uygular, XAML'ın karşılığı yoktur (attached behavior yazılmadıkça).
Telafi: o iki platformda etiketi gövdeden ayıran şey **boyut, ağırlık ve renktir**, aralık
değil — etiket 14'te ve mavi bırakılır, başlık 24'e çıkarılır, yani ayrımın tamamı
boyuta yüklenir. Attached behavior yazan proje bu telafiyi kaldırır ve yukarıdaki `em`
değerlerini birebir uygular. WinForms'ta ayrıca **600 ağırlık da yoktur** (`FontStyle`
yalnız Regular/Bold tanır); orada başlık Bold kalır ve fark yine boyutla kurulur
(`Palette.cs` yorumu).

**Başlık hiyerarşisi gözle ayrışır.** Eskiden h2 (20/700/mavi/0.1em), h3 (16/700/mavi/0.1em)
ve etiket (14/700/mavi/0.15em) neredeyse aynıydı; h3 gövdeyle aynı boyuttaydı ve h3 ile
etiketi ayıran tek şey 2px'ti. Dört sinyalin (boyut, ağırlık, renk, tracking) dördü de
hiyerarşi taşımıyordu. Şimdi ayrım **boyutta**: 24 → 20 → 14, aralarında birer basamak.
Boyut yetmediği yerde ikinci sinyal **çizgidir** (`.tk-h3-rule`, `--tk-border-decorative`
alt çizgi), parlaklık değil.

Mono değer satırı `neon-pink`'ten `pink-text`'e taşındı: dolgu hex'i 6.44:1 veriyordu, yani
her sayı, süre ve ID kendi 7:1 kuralının altında yazılıyordu (§2).

**Satır yüksekliği ve satır uzunluğu tanımlıdır.** Tanımsızlık yanlış tanımdan kötüdür:
yanlış tanım düzeltilir, tanımsızlık fark bile edilmez ve her platform kendi varsayılanını
yaşar.

```
--tk-lh-body: 1.5      gövde, ipucu — 16px'te 24px, 4'lük ızgaraya oturur
--tk-lh-heading: 1.2   başlık, etiket, hero
--tk-lh-mono: 1.4      mono değer
--tk-measure: 65ch     uzun metin bloğunun azami satır uzunluğu (.tk-prose)
```

WPF karşılığı `LineHeight` **ve** `LineStackingStrategy="BlockLineHeight"` birlikte yazılır;
ikincisi olmadan WPF satır kutusunu en uzun harfe göre büyütür ve CSS'ten ayrışır.

Etiket ile gövdeyi ayıran şey parlaklık değil: etiket **yarı kalın, harf aralıklı ve mavi**;
gövde **normal ağırlıkta ve beyaz**. Bir bilgiyi göstermeye değer bulduysan okunacak
kadar büyük ve parlak yaz; değmiyorsa ekrandan kaldır. Küçük punto, silinmemiş içeriğin
bahanesidir.

**Büyük harf kullanımı — her kelimenin ilk harfi büyük.** Görünen her etiket bu kalıba
uyar: düğme, sekme, etiket, menü, panel başlığı, bölüm başlığı.
`Dosya Seç`, `Ayarlar`, `Çıktı Klasörü` — `DOSYA SEÇ` da değil `Dosya seç` de değil.

- **UPPERCASE yasak.** Bütünüyle büyük harf ne başlıkta ne etikette kullanılır; okuma
  hızını düşürür, Türkçe'de İ/I ayrımını bozar ve neon renkle birleşince bağırır.
  Etiketi ayıran şey harf aralığı, kalınlık ve renktir — büyütmek değil.
- **Bağlaçlar küçük kalır:** `ve`, `veya`, `ile`, `ki`, `da`, `de`. Etiketin ilk kelimesi
  olduklarında büyürler.
- **Türkçe büyütme haritası zorunlu:** `i` → `İ`, `ı` → `I`. Kültüre duyarsız
  `toUpperCase()` / `ToUpper()` `i`'yi `I` yapar ve `İşlem` yerine `Islem` yazar. JS'te
  `toLocaleUpperCase('tr')`, .NET'te `CultureInfo("tr-TR")` kullanılır.
- **Tam cümleler de bu kurala uyar.** Tooltip, hata mesajı, boş durum açıklaması ve onay
  metni dahil, görünen her metinde her kelimenin ilk harfi büyüktür. Bir dönem "cümleler
  muaftır" diye bir madde vardı; o muafiyeti kullanıcı istemedi, tek taraflı eklenmişti ve
  23.08.2026'da kaldırıldı. Bağlaç kuralı burada da geçerlidir: `ve`, `veya`, `ile`, `ki`,
  `da`, `de` küçük kalır.
- İstisna **özel adlar ve kısaltmalar**: `MP4`, `GPU`, `Teknesyum`, `Windows`.
  Cümle ortasında da büyük kalırlar.
- Aynı kural depoya, klasöre ve gösterilen dosya adına da uygulanır (bkz. relay §2).

## 3.1 Arayüz dili — Türkçe, ama koda gömülü değil

**Arayüz metinleri Türkçe yazılır.** Varsayılan kaynak dil budur; `~/.claude/teknesyum.json`
içindeki `dil` alanı başka bir şey diyorsa o geçerlidir. **Depoya giden README ve teknik
doküman İngilizce kalır** — bunlar farklı iki şey: kullanıcının okuduğu yüz Türkçe,
geliştiricinin okuduğu belge İngilizce.

**Hiçbir arayüz metni koda gömülmez.** Her projede kökte `locale/` klasörü olur; bu web,
React, Electron, WPF ve WinForms için ayrımsız geçerlidir (masaüstü ayrıntısı:
`references/desktop.md` §9, şablonlar: `assets/locale/`).

```
locale/
  tr.json      kaynak dil, tam ve eksiksiz
  en.json      çeviri
  README.md    çevirmene tek sayfa
```

Düz JSON, tek seviye, anahtar `alan.nesne.durum` kalıbında (`btn.addExtension`,
`status.installed`). **Ölçüt şudur:** dili bilen ama projeyi bilmeyen biri tek dosyayı
kopyalayıp çevirebiliyorsa doğru; koda girip string aramak gerekiyorsa yanlış. Yeni dil
eklemek bir dosya kopyalamaktan ibaret olmalı — kod değişikliği gerekiyorsa tasarım hatalıdır.

Anahtar bulunamazsa uygulama çökmez: kaynak dile düşer ve bunu bir kez loglar. Sayı, tarih
ve dosya boyutu biçimlendirmesi de dile bağlıdır, elle `ToString()` ile kurulmaz.

**Yerleşimi en uzun dil belirler.** Taşma kontrolü Türkçe metinle yapılır (Türkçe
İngilizce'den tipik olarak %20-30 uzundur — *varsayılan, ölçülmedi*: bu depoda ölçüm
yapılmadı ve literatürdeki %20-30 rakamı genelde Almanca için söylenir; sayı bir taban
tahmini, kural değil), sonra dil değiştirilip İngilizce hâli de gözle doğrulanır.
Bir dilde sığıp diğerinde kırpılan etiket, iki dilde de hatalıdır — kontrol genişliği uzun
olana göre kurulur.

## 3.2 Metin yazımı — duvar değil, blok

**Düz yazı duvarı yasak.** Arayüzde görünen her açıklama, yardım metni, tooltip gövdesi,
onboarding ekranı, hata açıklaması ve `README` niteliğindeki panel metni bloklara ayrılır.

Paragraf **2-4 satır**. Beş satırı geçen paragraf ikiye bölünür veya listeye çevrilir.

Paragraflar arasında boş satır bırakılır: dikey yer varsa **iki**, dar bir panelde
veya tooltip içinde **bir**. Sıfır asla.

Üç maddeden fazla art arda bilgi varsa cümleye değil **listeye** yazılır. Bir paragrafta
tek fikir bulunur; "ayrıca", "bunun yanında" ile eklenen ikinci fikir yeni paragraftır.

Ölçüt: kullanıcı metne bakınca **nereden okumaya başlayacağını** bir bakışta görmeli.
Gözü kaydıracak bir boşluk yoksa metin okunmaz, atlanır.

## 4. İmza bloğu — pencere başlık çubuğunda

Varsayılan **açık**. Her projede tam olarak bir tane. Yeri **pencere başlık çubuğudur**,
küçült düğmesinin solu — ayarların dibi değil.

Sağdan sola sıra:

| Sıra | Etiket | Renk | Simge | Davranış |
|---|---|---|---|---|
| Küçült'ün hemen solu | `Teknesyum` | `neon-blue` | yok | yalnız anahat, hover'da tepki |
| Onun solu | `Destek` | **`pink-text`** | kahve fincanı | hover'da tepki |

Görsel sıra soldan sağa şu olur: `Destek ☕` · `Teknesyum` · küçült · büyüt · kapat.

İngilizce arayüzde `Destek` → `Buy me a coffee`. `Teknesyum` çevrilmez — özel addır (§3).
İkisi de `locale/` altındadır, koda gömülmez (§3.1).

Şartlar — hepsi ölçülmüş bir hatanın karşılığı:

- **Metin rengi metin token'ıdır, dolgu token'ı değil.** Bu bloğun eski mor yazısı
  ölçülen **4.57:1** ile kuralın altındaydı; `pink-text` `#ff54eb` **7.72:1** veriyor.
- **Hover tepkisi §5.4 tabanına uyar:** `--tk-t-instant`, yalnız `opacity`/`transform` ve
  renk. Gölge animasyonu yok.
- **Metne glow verilmez** (§2). Başlık çubuğu 32–40px'lik bir şerit; 14px yazının halesi
  komşu düğmenin altına giriyor.
- **Sürükleme alanını bölmez.** İki öğe de `-webkit-app-region: no-drag` (Electron) ya da
  `WindowChrome.IsHitTestVisibleInChrome="True"` (WPF) taşır; şeridin kalanı sürüklenir.
- **Tıklama alanı 24×24 DIP'ten küçük olamaz** (§5.3), görünen yazı daha küçük olabilir.

Hazır bileşen: `assets/Signature.tsx` (React) · `assets/Signature.xaml` (WPF) ·
`assets/Signature.axaml` (Avalonia).
Linkler `assets/links.json`'da:
- GitHub: `https://github.com/Teknesyum`
- Destek: `https://github.com/sponsors/Teknesyum` — **aktif**

**Şablon i18n kütüphanesi dayatmaz.** `Signature.tsx` bir `t(key)` işlevini parametre
olarak alır; metinler `locale/tr.json` ve `locale/en.json`'dan gelir (§3.1), ama o sözlüğü
hangi kütüphanenin okuduğu projenin kararıdır.

Sebep: bu dosya Base'in kendi arayüzü değil, üretilen projelere kopyalanan bir örnek.
İçine `react-i18next` import etmek şablonu kullanan her projeye o paketi zorunlu kılardı.
§1'in kurulum tablosu `i18next`'i **önerir**, şablon **şart koşmaz** — ikisi farklı şey.
WPF tarafında karşılığı `loc:Str` markup extension'ıdır (desktop.md §9).

**İkisi de anahattır:** zemin `transparent`, 1 DIP çerçeve, yarıçap 6, yükseklik en az
24 DIP. `Destek` çerçevesi ve yazısı `pink-text`, `Teknesyum` çerçevesi ve yazısı
`neon-blue`. Dolgu ne duruk ne hover'da gelir; gri kutu ve emoji ikon (`☕`) kullanılmaz —
ikon 12px `stroke="currentColor"` SVG/Path olarak çizilir.

**Duruk hâl tam opaktır ve çerçeve tam tokendır.** ÖLÇÜLDÜ (23.08.2026, U1 denetimi): eski
hâlde duruk `opacity: 0.8` bütün öğeye — metne dahil — uygulanıyordu. `pink-text` `#ff54eb`
%80 opaklıkla siyah üstünde **5.10:1**, şeridin gerçek zemini `#08090a` üstünde **4.95:1**;
7:1 kuralının altında. Mor metin zaten 4.57 verdiği için pembeye geçilmişti, %80 opaklık o
kazancı geri veriyordu. Aynı ölçümde çerçeve de düştü: `pink-text/50` siyah üstünde
**2.51:1**, %80 opaklıkla **~1.9:1** — 1.4.11'in 3:1 eşiğinin altında. `/50` merdiveni
yalnız `neon-blue` için ölçülmüştü (4.07); pembe ve mor o merdiveni taşımıyor.

Hover sinyali bu yüzden opaklık değil **`scale(1.02)`**, `--tk-t-instant` süresinde — §5'in
kendi buton değeri, yeni sayı değil. Kullanıcı zamanının neredeyse tamamında duruk hâli
görür; kontrastı hover'a bağlamak, kuralı görülmeyen hâlde sağlamak demektir.

Şeritte **kutu glow'u da yoktur:** 12px'lik bir hale 24px boşluk ister (§8), başlık şeridinde o boşluk yok — hale
komşu düğmenin altında kesilir.

**Başlık çubuğu olmayan yüzeyde** (düz web sayfası, PWA, gömülü görünüm) blok eski yerinde
kalır: ayarlar ya da hakkında bölümünün en altında, sağa yaslı. Ana ekrana konmaz.

Kullanıcı ayarında `"imza": { "kapali": true }` varsa **ekleme**.
`"imza": { "metin": "...", "github": "...", "sponsor": "..." }` varsa onları kullan.

## 5. Bileşen kalıpları

Kopyalanabilir sınıflar: `references/components.md`. Sadece bir bileşenin tam kodu
lazımsa oku.

Panel: `bg-[#08090a]/95 backdrop-blur-xl border border-neon-blue/50 rounded-md p-6
shadow-[0_0_40px_rgba(0,0,0,0.8)]`

**Yarıçap tektir: `6px`** — kutu, panel, kart, düğme, hücre, çip, hepsi aynı. Token
`--tk-r` (eski `--tk-r-box` / `--tk-r-btn` / `--tk-r-cell` / `--tk-r-chip` adları geriye
dönük uyumluluk için durur ve dördü de aynı değere bakar). Eski 16/12/8/6 merdiveni
kaldırıldı: `layout.md` §5.1 "genel `CornerRadius` 6 DIP, kart/panel/düğme için farklı
yarıçap üretme" diyordu, iki dosya birbirini yalanlıyordu. Çelişki 23.08.2026'da
**`layout.md` lehine** kapatıldı — yuvarlatılmış dikdörtgen daha küçük köşe alır.
Merdivenin kendisi zaten *(varsayılan, ölçülmedi)* idi; 16/12/8/6 basamakları hiçbir
ölçüme dayanmıyordu.

Yasak değil, yerine konan var: **daha yumuşak bir köşe gerekiyorsa çözüm yarıçap değil
dairedir.** Daire işlevsel istisnadır ve serbesttir: `?` rozeti, slider thumb, durum
noktası, avatar. Arada bir değer (10px, 14px) üretilmez.

Aralık: 4 / 8 / 12 / 16 / 24. Panel padding `24px`, bölüm arası `24px`, satır arası `12px`.
Geçiş süresi burada tekrar edilmez — tek kaynağı §5.4'ün token ölçeğidir
(`--tk-t-instant` · `--tk-t-fast` · `--tk-t-base` · `--tk-t-slow`). Hover `scale(1.02)`
buton, `1.1` ikon.

**Yerleşim, piksel disiplini, gradient ve geri bildirim yüzeyleri:** `references/layout.md`.
Bir panel, pencere veya sayfa yerleşimi kurarken o dosya okunur.

**Hareketin gerekçeleri:** `references/motion.md`. §5.4'ün tabloları oradaki `M1` … `M15`
başlıklarına atıf verir; **hareket işi yapmadan önce o dosya okunur.**

**Bileşen durumları:** `references/durumlar.md` — beş durum zorunlu şablonu (duruk ·
hover · odak · basılı · devre dışı), `data-tk` işaretleme sözleşmesi ve muafiyet matrisi;
bir bileşenin durumlarını yazarken o dosya okunur.

## 5.3 Bileşen ölçüleri

Merkezî değerler. Projeye özel ezme gerekirse tokenı değiştir, kontrolü değil.

**Hedef boyutu — en az 24×24.** Tıklanabilir her şey (ikon düğmesi, kapat çarpısı, sekme,
onay kutusu hücresi, satır içi eylem) en az 24×24 DIP alan kaplar. Görünen simge daha
küçük olabilir; tıklanan alan olamaz. Bu WCAG 2.2 §2.5.8'in AA tabanıdır, tercih değil.

**Odak halkası — çift katman, 2 DIP, geçişsiz.** Tek renkli halka bu palette çalışmıyor:
`neon-blue` halka `neon-blue` dolgulu butonun üstünde ölçülen **1.00:1** veriyor, yani
görünmüyor. Halka iki katmandır — içte opak `#000000`, dışta 2 DIP `neon-blue`:

```css
:focus-visible {
  outline: 2px solid var(--tk-blue);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px #000000;
}
```

`outline-offset` iç katmanın kalınlığıdır ve `box-shadow` ile opak boyanır; arada saydam
bant bırakılmaz — bırakılırsa neon dolgu mavi halkaya değer ve halka yine kaybolur.

Ölçülen — kural artık **neye karşı** ölçüldüğü yazılı olduğu için doğrulanabilir:

| Bitişiklik | Oran |
|---|---|
| dış halka `#00f3ff` / siyah zemin | 15.26 |
| dış halka `#00f3ff` / panel yüzeyi `#08090a` | 14.49 |
| iç katman `#000000` / dış halka `#00f3ff` | 15.26 |
| iç katman `#000000` / `neon-blue` dolgu | 15.26 |
| iç katman `#000000` / `neon-pink` dolgu | 6.44 |
| iç katman `#000000` / `neon-purple` dolgu | 4.57 |

Hepsi 1.4.11'in 3:1 eşiğinin üstünde. Karşılaştırma için eski tek katmanlı hâl: mavi halka
mavi dolguda **1.00**, beyaz halka mavi dolguda **1.38**.

**Halka yalnız klavye modalitesinde çıkar.** Seçici `:focus-visible`, `:focus` değil. Fare
tıklamasında halka çıkmaz — neon temada her tıklamada parlayan halka gürültüdür; klavyede
hiç halka olmaması ise engeldir. WPF'in `FocusVisualStyle`'ı bu ayrımı zaten yapıyor;
`assets/Theme.xaml` onu **`{x:Static SystemParameters.FocusVisualStyleKey}` anahtarlı
adsız stille** neon hâle çeviriyor. Stilin `x:Key`'i sistem anahtarının kendisidir, bu
yüzden uygulama genelinde otomatik geçerlidir ve tek tek kontrollere bağlanmaz. (Bu satır
eskiden depoda hiç bulunmayan bir stil adı gösteriyordu; ad 23.08.2026'da düzeltildi.)

**Odak anında taşınır, halka geçişsiz belirir.** Panel 240 ms açılırken odak beklemez.
Yalnız `opacity` ve `transform` animasyonlandığı için öğe ilk kareden itibaren odaklanabilir
durumdadır; klavye kullanıcısına 240 ms borç yazmak erişilebilirlik kaybıdır.

**Odaklanan öğe hiçbir zaman örtülmez** — WCAG 2.2 §2.4.11, **AA**. Tipik ihlal yapışkan
başlık şerididir: `Tab` ile aşağı inen kullanıcının odaklandığı satır çubuğun altında
kalır. Karşılığı `scroll-margin-top`, şeridin yüksekliği kadar; WPF'te
`BringIntoView(rect)` çağrısına aynı pay eklenir.

**Seviye etiketi düzeltmesi:** §2.4.13 (Focus Appearance) **AAA**'dır, AA değil. Hedef
olarak tutuyoruz — 2 DIP kalınlık ve 3:1 değişim ondan geliyor — ama AA tabanımız §2.4.11
ve §1.4.11'dir. Yüksek hedef sorun değil, yanlış etiket sorundur.

**Asgari klavye sözleşmesi — dört madde, dört platformda da geçerli.** §1 klavye gezinmesini
Base UI'ye devrediyor; WPF ve WinForms'ta Base UI yok, sözleşme yine tutulur:

1. `Tab` sırası görsel sırayla aynıdır.
2. `Esc` açık olan katmanı kapatır (menü, tooltip, diyalog, çekmece).
3. Katman kapanınca odak **onu açan öğeye** döner.
4. Odak tuzağından çıkış yolu vardır; tuzağın içinde odaklanabilir öğe kalmazsa kapanır.

**Scrollbar** — native olamaz. Yol **10 DIP** ve koyu; thumb neon-blue, hover'da neon-pink,
sürüklerken neon-purple. Ok düğmeleri yok.

**Sekmeler** — sekme anahattı kontrol sınırından **1 DIP içeride**, `TabItem` kırpması
**kapalı**. Sekmeler arası **8 DIP** boşluk, alt anahat için **2 DIP** güvenli alan.
Anahat, sekme şablonunun **kökünün kendisidir** — kökün içindeki kardeş `Rectangle` değil.
`TabItem`'a `ClipToBounds="False"` vermek yetmez: kırpan taraf `TabControl`'ün varsayılan
`TabPanel`'idir, kapsayıcının şablonu da değiştirilir (masaüstü referansı §7.1).
**Son sekmenin sağ ve alt kenarı ayrıca doğrulanır** — kırpılma tam orada oluyor.

**Onay kutusu** — 20×20 çizim alanı, içinde 1 DIP içeri alınmış `Border`, hücre 24×24.
Seçili ve seçili olmayan hâlin **dört kenarı da** canlı görüntüde doğrulanır. Onay kutusunu
taşıyan panele sabit `Height` verilmez; alt kenarı yiyen şey odur.

**Metin girişi, modal ve toast** — ölçüler ve davranış `references/forms.md` §1, §3,
§4'te: giriş `min-height` 40 DIP ve placeholder yasağı, modal `min(560px, 90vw)` ve odak
döngüsü, toast en fazla 3 ve `danger` kalıcı. Bunlardan birini ya da form doğrulaması
kurarken o dosya okunur; web karşılığı `assets/forms.css`, WPF `assets/Forms.xaml`.

**Bilgi rozeti** — teknik/kritik ayarın yanında **12×12** boyutunda, üst simge konumunda,
metinden **6 DIP** uzakta `?`. Tooltip ayrıntılı ve **iki dilli**. Hover'da yalnızca
**rengi** değişir: glow yok, büyüme yok, kayma yok.

**Pencere düğmeleri** — 42×30 DIP *(varsayılan, ölçülmedi)*. Küçült simgesi 10×2 DIP düz
çizgi. Soldan sağa sıra: `Destek`, `Teknesyum`, küçült, büyüt, kapat (§4).

Bu ölçü 23.08.2026'da **kullanıcı kararıyla** sabitlendi. `references/desktop.md` §10 bir
dönem aynı düğme için 52×36px diyordu ve iki dosya birbirini yalanlıyordu; ikisi de
ölçülmemişti, seçimi kullanıcı yaptı. Bir pencerede bütün düğmeler **tek bir değeri**
paylaşır; aynı şeritte iki ayrı ölçü kullanılmaz.

## 5.4 Hareket — modern, animasyonlu, iptal edilebilir

**Hareket işi yapmadan önce `references/motion.md` okunur.** Bu bölümde tablolar ve
tokenlar durur; her satırın **neden** orada olduğu `motion.md`'dedir ve satırların yanındaki
`M1` … `M15` atıfları oradaki başlıkları gösterir. Gerekçeyi okumadan tabloyu uygulayan
kişi tabloyu yanlış uygular — atıf süs değil, işin parçasıdır.

**Duruş: bu tema animasyonlu bir temadır.** Durgun teslim varsayılan değil, eksiktir.
Animasyon süs değil geri bildirimdir. *"Söyleyeceği bir şey yoksa animasyon yok"* bir
**tavandır**, taban değil; aşağıdaki taban neyin eksik olduğunu söyler. İkisi birlikte
okunur → `motion.md` **M1**.

### Animasyon tabanı — bunlar animasyonsuz teslim edilemez

Biri animasyonsuzsa arayüz eksiktir; "gerek görmedim" geçerli bir gerekçe değildir →
`motion.md` **M2**. Bir olayın tabana girip girmediği ve sıklık muafiyeti → **M3**.

| Olay | Beklenen | Süre · eğri | Gerekçe |
|---|---|---|---|
| Panel, diyalog, çekmece açılışı | opaklık `0→1` + 8 DIP kayma ya da `scale(0.98)→1` | `--tk-t-base` · `--tk-e-out` | M2 · M6 |
| Aynısının kapanışı | girişin tersi, **bir kademe kısa** | `--tk-t-fast` · `--tk-e-in` | M2 |
| Sekme ve görünüm değişimi | giden içerik solar, gelen belirir — ani takas yok | `--tk-t-base` | M2 |
| Liste/tablo satırı eklenme, silinme, sıralanma | kalan satırların **konumu** animasyonlanır | `--tk-t-base` | M2 · M12 |
| Bildirim yığını | giriş, çıkış **ve** yığının kayması — üçü de | giriş `--tk-t-fast`, çıkış `--tk-t-instant` | M2 |
| Hover ve basma — **her** etkileşimli öğe | renk ya da opaklık; basmada `scale(0.98)` | `--tk-t-instant` | M8 |
| Açılır menü, tooltip, çip | opaklık + 4 DIP kayma | `--tk-t-fast` · `--tk-e-out` | M2 |
| Yükleniyor | iskelet ya da ilerleme göstergesi — donuk ekran değil | döngü ≥ 1.4 s *(varsayılan, ölçülmedi)* | M2 · M10 |
| Boş durum → dolu durum | içeriğin belirişi; ekran bir anda dolmaz | `--tk-t-base`, 40 ms kademe | M8 |
| Değer değişimi (ilerleme, sayaç, rozet) | eski değerden yeniye geçiş görünür | `--tk-t-base` | M2 |
| Odak halkası | **geçişsiz** — tek istisna, klavye kullanıcısı beklemez | 0 ms | M2 |

**Giriş animasyonu bir kez oynar** — bileşen ilk kez göründüğünde → **M9**.

### Süre ve yumuşatma tokenları

Rastgele `0.3s` yazılmaz; kütüphane varsayılanı token değildir → **M5**.

```
--tk-t-instant   90ms    renk, opaklık, hover
--tk-t-fast     160ms    açılan menü, tooltip, çip
--tk-t-base     240ms    panel, diyalog, sekme geçişi
--tk-t-slow     360ms    sayfa/görünüm değişimi — üst sınır
--tk-e-out      cubic-bezier(0.2, 0, 0, 1)      giren şey
--tk-e-in       cubic-bezier(0.4, 0, 1, 1)      çıkan şey
--tk-e-spring   cubic-bezier(0.34, 1.36, 0.64, 1)  yalnızca basma geri bildirimi
```

360 ms'yi geçen hiçbir arayüz hareketi yok.

**Yalnızca `opacity` ve `transform` animasyonlanır**; boyut değişimi `scale` ile yapılır →
**M6**. **Geçiş tercih edilir, keyframe değil** — geçiş yarıda iptal edilebilir → **M7**.

### Azaltılmış hareket — zorunlu, sonradan eklenmez

Ayar açıkken konum ve ölçek kapanır, opaklık geçişleri kalır. Taban bu ayar açıkken de
yürürlüktedir. `transition-property: opacity` satırı ve `*` seçicili `transform: none`
satırı zorunludur; WPF'te `SystemParameters.ClientAreaAnimation` okunur → **M4**.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-property: opacity !important;
    transition-duration: var(--tk-t-instant) !important;
  }
  *, *::before, *::after { transform: none !important; }
}
```

### Mikro etkileşim tavanları

Sınırlar kesindir; her satırın gerekçesi (hit-test, yankı, kademe) → **M8**.

| Durum | İzin verilen | Yasak — yerine ne konur | Gerekçe |
|---|---|---|---|
| Hover | `scale(1.02)`, glow opaklığı `/20`→`/30`, renk | 1.05+ büyüme, kayma, dönme → renk ve glow opaklığı kullan | M8 |
| Basma | `scale(0.98)`, 90 ms | zıplama, `spring` yankısı → tek seferlik `--tk-e-spring` | M8 |
| Odak | halka **anında** belirir | halkayı yumuşatarak geciktirmek → 0 ms bırak | M2 |
| Giriş | 8 DIP kayma + opaklık, 240 ms | 40 DIP uçuş, dönerek gelme → 8 DIP ile aynı etki | M2 |
| Liste | 40 ms kademe, **en çok 6 eleman** | 20 elemanı tek tek düşürmek → kademeyi kaldır, hepsi birlikte belirsin | M8 |
| Kaydırma | tekil yüzeyde duruk glow | tekrar eden öğede glow, WPF `DropShadowEffect` → glow kapsayıcı panele | M15 |

### Sonsuz döngü — yasak, iki adı konmuş istisna

Nefes alan panel, sürekli dönen süs, dalgalanan parlaklık yok. İstisnalar: **süreç
göstergesi** (iş bitince durur) ve **uygulama zemininin gradienti** (§2). İkisi de
`prefers-reduced-motion` altında durur; CSS döngüleri `motion-safe:` altına alınır →
**M10**.

### Sürükleme ve yerleşim

Sürükleyerek yapılan her işin **tek dokunuşluk alternatifi** olur (WCAG 2.2 §2.5.7) →
**M11**. Hareket, tıklanacak şeyi kaçırmaz: açılan panel komşularını itmez → **M12**.

### Platform

React/Electron: `motion`, kök sarmalayıcıda `<MotionConfig reducedMotion="user">`
**zorunlu** → **M13**. WPF: `Storyboard` yalnız `RenderTransform` ve `Opacity` üzerinde,
`Freeze()` edilir → **M14**.

## 5.5 Tanıtım sayfası istisnası

Uygulama içinde yasak olan gösterişli efektler **tanıtım/indirme sayfasında serbesttir**:
WebGL arka plan, parçacık alanı, 3D hover, özel imleç, kaydırmaya bağlı animasyon.

Sebep açık: tanıtım sayfası bir kez bakılan yerdir, uygulama her gün açılan yer. Orada
etkileyici olan, burada üçüncü açılışta rahatsız eder.

Sınırlar burada da geçerli: `prefers-reduced-motion` yine zorunlu, ilk boyama efektle
geciktirilmez, sayfa efektler yüklenmeden okunabilir olur, mobilde ağır efekt kapatılır.

Bu istisna **yalnızca ayrı bir tanıtım sitesi/sayfası içindir.** Uygulamanın kendi
karşılama ekranı, hakkında penceresi veya ilk açılış turu bu istisnaya girmez.

**Araç: `gsap`.** Tanıtım sayfasında zaman çizelgesi, kaydırmaya bağlı sahne ve morph
gerektiğinde kullanılacak kütüphane budur. v3.13'ten (Nisan 2025) beri **tüm eklentileri
dahil ücretsiz** — ScrollTrigger, SplitText, MorphSVG, Flip. Lisans engeli yok.

Uygulama içinde `gsap` kullanılmaz; oradaki araç `motion`. Sebep boyut değil **iş
tanımı**: `motion` bileşenin durum değişimini animasyona bağlar ve iptal edilebilir,
`gsap` bir sahneyi zaman çizelgesiyle yönetir. Uygulama arayüzünde sahne yoktur, durum
vardır.

| Yer | Araç | Neden |
|-----|------|-------|
| Uygulama arayüzü | `motion` | durum tabanlı, iptal edilebilir, `useReducedMotion` yerleşik |
| Tanıtım sayfası | `gsap` + ScrollTrigger | zaman çizelgesi, sahne, kaydırma senkronu |
| Liste/tablo değişimi | `@formkit/auto-animate` | üç satır kod, kendi kendine kapanır |

## 5.6 Dış kaynak kullanımı — önce lisans

Hazır bileşen kütüphanelerinden yararlanmak serbest, ama **kopyalamadan önce lisansa
bakılır.** Sıra şudur:

1. Lisans izin veriyorsa (MIT, Apache-2.0, BSD, CC0) bileşen alınır. Alındığı gibi
   bırakılmaz: renkleri tokenlara çevrilir, animasyonu §5.4 tavanlarına indirilir,
   metni `locale/` altına taşınır.
2. Lisans izin vermiyorsa veya belirsizse **birebir kopyalanmaz.** Fikir alınır, kendi
   uygulaması yazılır. Sınıf adları, yapı ve ölçüler kendimizindir.
3. Her iki durumda da kaynak `docs/licenses.md` dosyasına satır olarak yazılır:
   bileşen adı, kaynak URL, lisans, alınma tarihi.

Lisansı olmayan depo "serbest" demek değildir — telif varsayılan olarak sahibindedir.

## 5.8 Ekran okuyucu

**İsimsiz interaktif öğe yasak** — WCAG 4.1.2, **A**. İkon-only buton web'de `aria-label`
(`title` ad değildir), WPF'te `AutomationProperties.Name` ile adlanır; isimli butonun
ikonu `aria-hidden="true"` + `focusable="false"` taşır. Duyuru `aria-live` (WPF:
`LiveSetting` + `LiveRegionChanged`): bildirim `polite`, hata `assertive`, ilerleme
`role="progressbar"`. Yüksek kontrastta (`forced-colors`) neon korunmaz, sisteme
**teslim edilir**. Tam kural ve WPF karşılıkları: `references/a11y.md` — interaktif öğe
ya da duyuru yazan her iş önce orayı okur; CSS katmanı `assets/a11y.css` (`theme.css`ten
sonra import edilir).

## 6. Sık yapılan hatalar

- Soluk gri gövde metni (`#d1d5db`, `#9ca3af`) → beyaz. Bu temada ara gri yok
- Beyaz zemin (WebView gövdesi, boş grid, önizleme paneli) → `bg`/`surface` ver
- Metne glow vermek → yalnızca hero sayıda; başlık ve gövdede okunurluğu düşürür
- Mavi yazının arkasına mavimsi yüzey → zemin nötr kalır
- 10-13 punto etiket → taban 14, normal metin 16
- İki duraklı gradient → bantlaşır; en az 11 yakın durak + ScRgb
- Hücreyi nesnenin nominal ölçüsüne eşitlemek → 20×20 çizim, 24×24 hücre
- Rengi kontrole inline yazmak → önce token, sonra kontrol (§8.1)
- Native bırakılan MessageBox, scrollbar, ComboBox popup'ı, sekme başlığı → §8 sızıntı tablosu
- Panelin/kartın komşusunun çerçevesini ya da glow'unu kesmesi → §8, örtüşme yok
- Rastgele Tailwind rengi (`text-cyan-400`) → token kullan
- Anahattı şablon kökünün **kardeşi** yapmak → stroke'un yarısı dışarı taşar, kenar kaybolur;
  anahat kökün kendisi olur (masaüstü §7.1)
- Kapsayıcının varsayılan şablonunu bırakıp yalnızca çocuğa `ClipToBounds="False"` vermek →
  kırpan üsttekidir; `TabControl`/`ToolBar`/`Menu` şablonu da değiştirilir
- Panele sabit `Height` → içerik büyüyünce alt satır kesilir; `MinHeight` kullan
- "Derlendi, düzelmiştir" → yarım anahat derlemede görünmez; ekran görüntüsü + büyütme
  olmadan geçti sayma (§8.2)
- **Veri** sayısını sans font ile yazmak → mono (`.tk-mono`). Cümle içi sayı sans kalır,
  gövdedeki `tabular-nums` onu hizalar (§3)
- Glow'suz neon renk → ölü görünür
- Başlıkta tracking unutmak — ya da tersi: başlığa etiket tracking'i (`0.1em`+) vermek →
  aralık boyutla ters orantılıdır, h2 `0.02em` (§3)
- Başlık ya da etiketi `700` ağırlıkta bırakmak → `600`; `700` yalnız hero dışı hiçbir
  tipografi rolünde yok. Vurgu gerekiyorsa bir basamak büyüt (§3)
- h2/h3/etiketi aynı boyut ve renkte bırakmak → hiyerarşi boyutta kurulur: 24 / 20 / 14 (§3)
- `line-height` yazmamak → tarayıcı ve WPF varsayılanları farklı; `--tk-lh-*` tokenları ve
  WPF'te `LineStackingStrategy="BlockLineHeight"` (§3)
- Hero'yu 28'de bırakmak ya da ara boyut uydurmak → ölçek 14/16/20/24/30, `--tk-fs-*` (§3)
- Yarıçapta 16/12/8 kullanmak → tek değer `6px` (`--tk-r`); daha yumuşak köşe gerekiyorsa
  daire (§5)
- Hero glow'unu inline yazmak → `--tk-glow-hero` / `HeroGlow`, iki platformda blur 8,
  opaklık 0.8 (§2)
- Devre dışı kontrolü yalnız soluklaştırmak → tooltip zorunlu, renk tek başına anlam
  taşımaz (§2, WCAG 1.4.1)
- Durum noktasını yalnız renkle ayırmak → dolu daire / halka şekil farkı (§2)
- §5.4 tablosunu `references/motion.md` okumadan uygulamak → satırların gerekçesi orada,
  atıflar `M1` … `M15`
- Etiketi UPPERCASE veya Title Case yazmak → ilki büyük gerisi küçük (§3)
- Beş satırlık paragraf, boşluksuz açıklama metni → 2-4 satırlık bloklar (§3.2)
- `width`/`height`/`box-shadow` animasyonu → `transform` + `opacity` (§5.4)
- Her render'da tekrar oynayan giriş animasyonu → yalnızca ilk görünüşte
- `prefers-reduced-motion` yok → erişilebilirlik hatası, sürüm çıkmaz
- `<MotionConfig reducedMotion="user">` yazmamak → hook var, politika yok; ayar hiç işlemez
- Azaltılmış hareket bloğunda `transition-property: opacity` unutmak → hareket kapanmaz, hızlanır
- Nefes alan arka plan, sonsuz dönen süs → yalnızca gerçek süreç göstergesi
- **Animasyon tabanındaki olayı animasyonsuz teslim etmek** → §5.4 tabanı, "gerek görmedim" gerekçe değil
- Panel açılışını, sekme geçişini, liste değişimini ani takasla yapmak → durgun arayüz, §5.4
- Mono değeri `neon-pink` ile yazmak → `pink-text`; dolgu hex'i 6.44:1 (§2)
- Ghost butonun yazısını `neon-purple` ile yazmak → `purple-text`; 4.57:1 (§2)
- Varsayılan kenarlığı `/20` veya `/30` bırakmak → `/50`; `/30` yalnız dekoratif (§2)
- Tek renkli odak halkası → mavi halka mavi dolguda 1.00:1; çift katman (§5.3)
- `:focus` kullanmak → `:focus-visible`; farede halka çıkmaz (§5.3)
- İmza bloğunu ana ekrana ya da alt bilgiye koymak → başlık çubuğu, küçültün solu (§4)
- Liste/tablo satırına glow vermek → glow kapsayıcı panele, satır kenarlıkla ayrılır (M15)
- İkon butona yalnız `title` vermek ya da adı hiç vermemek → isimsiz öğe yasak;
  `aria-label` / `AutomationProperties.Name` (§5.8)
- sr-only'yi `display:none` ile yapmak → okuyucu da göremez; `.tk-sr-only` (§5.8)

## 7. Masaüstü ve dil yamaları

WinForms/WPF işinde **`references/desktop.md`** zorunlu: taşma/kırpılma kuralları,
pencere çerçevesi ve başlık çubuğu, `locale/` klasörü. Web/React işinde açma.

**Hareket işi yapan her platformda `references/motion.md` zorunlu** — web, React, Electron,
WPF, WinForms ayrımsız. §5.4'te kalan tablolar orayı gösterir; gerekçe okunmadan tablo
uygulanmaz.

**Avalonia işinde `references/avalonia.md` zorunlu.** `assets/Theme.xaml` orada çalışmaz;
karşılığı `assets/Theme.axaml` + `assets/Signature.axaml`, token adları birebir aynı.
`desktop.md` ve `motion.md` Avalonia'da da yürürlüktedir — kural değişmedi, aracı değişti.

## 8. Varsayılanlar — tartışılmadan uygulanır

Bunlar her yeni arayüzde başlangıç hâlidir. Aksini yapmak için gerekçe gerekir, uygulamak
için değil.

**Tema uygulamanın tamamını kaplar.** Yarısı neon, yarısı native olan arayüz yoktur. Tek
bir sistem grisi kutu, geri kalan her şeyin özenini siler.

**Sızıntı listesi, başlık çubuğu, pencere köşeleri, anahat kuralı ve masaüstü
varsayılanlarının tamamı `references/desktop.md` §10'dadır.** Masaüstü uygulaması
yazıyorsan teslimden önce o bölüm baştan sona gezilir.

Web/React işinde geçerli olan çekirdek: zemin `#000000`, panel `surface`, kenarlık
**`neon-blue/50`**, odak halkası çift katman (§5.3), scrollbar 10px temalı, hiçbir öğe bir
başkasının anahattını kapatmaz, vurgu zeminleri opak verilir.

`<MotionConfig reducedMotion="user">` kök sarmalayıcıda bulunur (§5.4) ve §5.4'ün animasyon
tabanındaki on olay animasyonlu teslim edilir.

## 8.1 Uygulama yöntemi — önce token, sonra kontrol

**Renk ve ölçü değişikliğini tek tek kontrollere dağıtma.** Önce merkezî bir semantik token
oluştur ya da mevcut olanı değiştir; kontrol o tokena bakar. Inline hex, inline font ailesi
ve tekrar eden margin yalnızca gerçekten **tek bir bileşene** ait bir özel durumsa yazılır —
"şimdilik buraya yazayım" diye başlayan her değer, altı ay sonra tema değiştirilemez hâle
getiren şeydir.

Yüzey tonu tek kaynaktan gelir (`SurfaceToneColor` benzeri bir token). Aynı rengi iki yerde
tanımlamak, ikisinin ayrışması demektir.

**XAML/CSS değişikliğinden sonra kaynağın diff'ini oku.** Stil dosyaları geneldir; bir
`TargetType` düzenlemesi hiç dokunmadığın ekranı bozar. Değişikliğin kapsamını diff'te gör,
sonra teslim et.

## 8.2 Doğrulama — çalışan uygulamaya bakmadan "tamam" yok

Derlemenin geçmesi arayüzün doğru olduğunu göstermez. Arayüz işi **gözle** doğrulanır.

**Ama gözle doğrulama kullanıcıya yük bindirir.** Uygulamayı açmak ekranı devralır ve
kullanıcının işini böler. Bu yüzden seyrek ve **toplu** yapılır: tek tek her değişiklikten
sonra değil, bir dalga bittiğinde bir kez açılır ve aşağıdaki listenin tamamı o tek
geçişte gezilir. Ara adımlar statik denetimle (`/scan ui`, `uicheckup`, testler)
doğrulanır. Kullanıcı "aç ve göster" derse elbette hemen açılır.

Toplu geçişte sırayla:

1. Derle ve testleri koştur.
2. Uygulamayı **gerçekten aç** ve ekran görüntüsü al.
3. **Yakaladığın pencerenin süreç yolunun bu depodaki çalıştırılabilir dosya olduğunu
   doğrula.** Başka bir uygulamanın ya da eski bir kurulumun penceresine bakıp "düzelmiş"
   demek en sık yapılan hata. Görüntünün gerçekten bu projenin arayüzü olduğunu görmeden
   testi geçmiş sayma.
4. Şunları tek tek gez: **hedef çalışma alanı ve minimum pencere boyutu** · her sekme ·
   **hover, focus, selected, disabled ve açık dropdown** durumları · panellerin alt kenarı ·
   dört kenarı kapanan çerçeveler · slider merkezleri · buton aralıkları · **TR başlangıç ve
   EN geçişi**.
5. **Animasyon tabanını fiilen gez** (§5.4): paneli aç-kapa, sekme değiştir, listeye satır
   ekle-sil, bildirim çıkar, yükleme durumuna sok. Ani takas gördüğün her yer hatadır.
6. **Klavyeyle gez.** `Tab` ile baştan sona in: halka her durakta görünüyor mu, sırası
   görsel sırayla aynı mı, `Esc` kapatıyor mu, odak açan öğeye dönüyor mu (§5.3). Halkayı
   **neon dolgulu bir butonun üstünde** ayrıca doğrula — tek katmanlı halka orada kaybolur.
7. Metin kesilmesi, gereksiz kaydırma çubuğu, native görünüm ve **bir piksellik fark**
   hatadır — not düşülüp geçilmez, düzeltilir.

Hata ve boş durum ekranları da bu listeye dahildir; mutlu yolda görünmedikleri için en çok
onlar atlanıyor.

Ekran görüntüsünün nasıl alınacağı ve bir DIP'lik farkın nasıl büyütülerek
görüleceği: `references/desktop.md` §11.

## 9. Etki raporu — arayüz işinin sonunda zorunlu

Kullanıcı standardın uygulandığını koddan çıkaramaz; **nereye ne dayattığını sen söyleyeceksin.**
Arayüz üreten veya değiştiren her işin sonunda, özetin **önüne** şu bloğu yaz. Dosya:satır,
kuralın adı, ne yaptığın, hangi madde. Uydurma — gerçekten dokunduğun yeri yaz.

```
Teknesyum ▸ Etki · teknesyum-ui
  MainWindow.xaml:14   başlık çubuğu  sistem bandı kaldırıldı → 36px neon şerit   §8
  MainWindow.xaml:52   palet          #00f3ff / #ff00ea token; ara renk yok       §2
  MainWindow.xaml:88   tipografi      sayılar Consolas'a alındı                    §3
  SettingsPage.xaml:210 imza          ayarların altına, anahat sponsor düğmesi     §4
  — uygulanmadı: pencere köşesi (WindowChrome projede yok, gerekçe: mevcut chrome)
```

**Uygulamadığın maddeyi de yaz.** Sessizce atlanan kural, hiç var olmamış kuraldır; gerekçesi
yazılınca kullanıcı katılmıyorsa itiraz edebilir. Ayar kapalıysa (`"kapali": true`) blok yerine
tek satır: `Teknesyum ▸ Etki · teknesyum-ui kapalı, projenin kendi tarzı korundu`.
