---
name: teknesyum-ui
description: Neon arayüz standardı. Herhangi bir kullanıcı arayüzü, panel, pencere, sayfa, bileşen veya CSS/XAML yazarken ya da mevcut bir arayüzü değiştirirken kullan. Renk paleti, tipografi ölçeği, başlık hiyerarşisi, bileşen kalıpları ve imza/sponsor bloğunu içerir. Web, React, Electron ve WPF/WinForms projelerinin hepsini kapsar. Ayarları /uisetup komutuyla değiştirilir veya tamamen kapatılır.
---

# Neon UI standardı

## 0. ÖNCE KULLANICI AYARINI OKU

`~/.claude/teknesyum-ui.json` varsa oku. Yoksa aşağıdaki varsayılanlar geçerlidir.

- `"kapali": true` → **bu skill'i uygulama.** Kullanıcının kendi tercihiyle veya projenin
  mevcut tarzıyla devam et, hiçbir token dayatma. Burada dur.
- `"palet"`, `"tipografi"`, `"imza"` alanları varsa aşağıdaki varsayılanları **ezer**.
- `"ekNot"` alanı varsa kullanıcının kendi yazdığı kuraldır — varsayılanlarla çelişirse
  **kullanıcının notu kazanır**.

Projeye özel ezme: `<proje>/.claude/teknesyum-ui.json`. O varsa kullanıcı geneline üstündür.

## 1. Kurulum (yeni proje)

| Stack | Kopyala | Nereye |
|---|---|---|
| Tailwind v4 | `assets/theme.css` | `src/index.css` başına |
| Düz CSS / Vanilla | `assets/theme.css` | `src/theme.css`, `<link>` ile bağla |
| WPF / .NET | `assets/Theme.xaml` | `Themes/Theme.xaml`, `App.xaml` MergedDictionaries |
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
success      #34d399   yalnızca "tamamlandı"
bg           #000000   uygulama zemini — nötr, tam siyah
surface      #08090a   panel zemini (95% opak), zeminden ancak çerçevesiyle ayrılır
text         #ffffff   okunması gereken HER şey — gövde, başlık, tablo, değer, etiket metni
label        #00f3ff   etiket ve bölüm başlığı (kalın, tracking'li — uppercase değil)
disabled     #71717a   YALNIZCA devre dışı kontrol. Tek gri budur.
```

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
imleç, tooltip) — renk körü kullanıcı griyi göremez.

**Dolgulu butonun yazısı siyahtır.** Neon dolgu üzerine beyaz yazı `neon-blue`'da
1.38:1 verir — okunmaz. `tk-btn-primary` ve `tk-btn-danger` `color: #000` kullanır.
Kural asset'te uygulanıyordu ama burada yazılı değildi.

**Beyaz zemin kullanma.** Beyaz burada yazının rengidir, zeminin değil. Sızdığı yerler
bellidir: `WebView`/`iframe` gövdesi, PDF ve rapor önizlemesi, boş `DataGridView`, yazdırma
görünümü, yüklenmemiş `<img>`, üçüncü parti denetim varsayılanı, `MessageBox`. Hepsine
açıkça `bg`/`surface` verilir.

Beyaz dolgu yalnızca **avuç içi kadar** alanda geçerli: ikon içi, veri noktası, imleç.
Panel, satır, sekme veya diyalog zemini asla. İçeriğin kendisi beyaz zeminliyse (kullanıcının
PDF'i, dış sayfa) `surface` çerçeve içine alınır, kenara dayanmaz.

Glow **kutuya** uygulanır: dolgulu buton `box-shadow: 0 0 20px <renk>40`, çerçeveli kutu
`inset 0 0 8px <renk>`, ikon `drop-shadow(0 0 5px <renk>)`. Glow'suz neon yüzey yok.

**Metne glow verilmez.** Ölçüldü: hale kenarları yumuşatıyor, küçük puntoda okunurluğu
düşürüyor, ekran görüntüsünde bulanık çıkıyor. Neon etkisi zaten renkten geliyor. Tek
istisna **hero sayı** (24px+, 900) — harf yeterince kalın. Başlık, etiket, gövde, bağlantı,
tablo değeri: glow yok. **Okunurluk gösterişten üstündür.**

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

Sans: `'Segoe UI', system-ui, -apple-system, sans-serif` — metin, etiket, başlık.
Okunurluğun kritik olduğu, veri yoğun ya da uzun süre bakılan arayüzlerde **Atkinson
Hyperlegible Next** tercih edilir (benzer harfleri — `l/I/1`, `O/0`, `rn/m` — ayırt
edilebilir çizer). Kullanılacaksa **projeye gömülür**, sistemde var sayılmaz.
Mono: `Consolas, 'Cascadia Mono', ui-monospace, monospace` — **her sayı, tuş, kod, ID,
süre**. Sayıyı sans ile yazma.

**Taban: normal metin 16, ikincil/yardım metni 14'ün altına inmez.** Bu bir tercih değil
alt sınır; 10-13 punto etiketler koyu zeminde okunmuyor ve kullanıcı okumak için ekrana
yaklaşıyor. Birim: web `px`, WPF `DIP` — 96 dpi'de aynı şey.

| Rol | Boyut | Ağırlık | Tracking | Renk |
|---|---|---|---|---|
| Panel başlığı (h2) | 20 | 700 | 0.1em | neon-blue |
| Bölüm başlığı (h3) | 16 | 700 | 0.1em | neon-blue |
| Etiket | 14 | 700 | 0.15em | neon-blue |
| Gövde | 16 | 400 | 0 | `#ffffff` |
| Mono değer | 16 | 700 | 0 | **pink-text** `#ff54eb` |
| Hero sayı | 28 | 900 | 0 | neon-blue + glow |
| Yardım / ipucu | 14 | 400 | 0 | `#ffffff` |

Ölçek 14 → 16 → 20 → 28. Ara boyut ekleme.

Mono değer satırı `neon-pink`'ten `pink-text`'e taşındı: dolgu hex'i 6.44:1 veriyordu, yani
her sayı, süre ve ID kendi 7:1 kuralının altında yazılıyordu (§2).

Etiket ile gövdeyi ayıran şey parlaklık değil: etiket **kalın, harf aralıklı ve mavi**;
gövde **normal ağırlıkta ve beyaz**. Bir bilgiyi göstermeye değer bulduysan okunacak
kadar büyük ve parlak yaz; değmiyorsa ekrandan kaldır. Küçük punto, silinmemiş içeriğin
bahanesidir.

**Büyük harf kullanımı — ilki büyük, gerisi küçük.** Görünen her metin bu kalıba uyar:
düğme, sekme, etiket, menü, panel başlığı, bölüm başlığı, tooltip, hata mesajı.
`Dosya seç`, `Ayarlar`, `Çıktı klasörü` — `DOSYA SEÇ` veya `Dosya Seç` değil.

- **UPPERCASE yasak.** Bütünüyle büyük harf ne başlıkta ne etikette kullanılır; okuma
  hızını düşürür, Türkçe'de İ/I ayrımını bozar ve neon renkle birleşince bağırır.
  Etiketi ayıran şey harf aralığı, kalınlık ve renktir — büyütmek değil.
- **Her Kelimenin İlk Harfi Büyük (Title Case) da yazılmaz.** İngilizce'nin alışkanlığıdır,
  Türkçe'de yanlış görünür.
- İstisna yalnızca **özel adlar ve kısaltmalar**: `MP4`, `GPU`, `Teknesyum`, `Windows`.
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

**Yerleşimi en uzun dil belirler.** Taşma kontrolü Türkçe metinle yapılır (Türkçe İngilizce'den
tipik olarak %20-30 uzundur), sonra dil değiştirilip İngilizce hâli de gözle doğrulanır.
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

Hazır bileşen: `assets/Signature.tsx` (React) · `assets/Signature.xaml` (WPF).
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

Hover'da yalnız opaklık `0.8 → 1` çıkar, `--tk-t-instant` süresinde. Şeritte **kutu glow'u
da yoktur:** 12px'lik bir hale 24px boşluk ister (§8), başlık şeridinde o boşluk yok — hale
komşu düğmenin altında kesilir.

**Başlık çubuğu olmayan yüzeyde** (düz web sayfası, PWA, gömülü görünüm) blok eski yerinde
kalır: ayarlar ya da hakkında bölümünün en altında, sağa yaslı. Ana ekrana konmaz.

Kullanıcı ayarında `"imza": { "kapali": true }` varsa **ekleme**.
`"imza": { "metin": "...", "github": "...", "sponsor": "..." }` varsa onları kullan.

## 5. Bileşen kalıpları

Kopyalanabilir sınıflar: `references/components.md`. Sadece bir bileşenin tam kodu
lazımsa oku.

Panel: `bg-[#08090a]/95 backdrop-blur-xl border border-neon-blue/50 rounded-2xl p-6
shadow-[0_0_40px_rgba(0,0,0,0.8)]`
Radius: kutu `16px`, buton/kart `12px`, hücre `8px`, çip `6px`. Başka değer yok.
Aralık: 4 / 8 / 12 / 16 / 24. Panel padding `24px`, bölüm arası `24px`, satır arası `12px`.
Geçiş süresi burada tekrar edilmez — tek kaynağı §5.4'ün token ölçeğidir
(`--tk-t-instant` · `--tk-t-fast` · `--tk-t-base` · `--tk-t-slow`). Hover `scale(1.02)`
buton, `1.1` ikon.

**Yerleşim, piksel disiplini, gradient ve geri bildirim yüzeyleri:** `references/layout.md`.
Bir panel, pencere veya sayfa yerleşimi kurarken o dosya okunur.

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
hiç halka olmaması ise engeldir. WPF'in `FocusVisualStyle`'ı bu ayrımı zaten yapıyor,
`assets/Theme.xaml` içindeki `NeonFocusVisual` onu neon hâle çeviriyor.

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

**Bilgi rozeti** — teknik/kritik ayarın yanında **12×12** boyutunda, üst simge konumunda,
metinden **6 DIP** uzakta `?`. Tooltip ayrıntılı ve **iki dilli**. Hover'da yalnızca
**rengi** değişir: glow yok, büyüme yok, kayma yok.

**Pencere düğmeleri** — 42×30 DIP. Küçült simgesi 10×2 DIP düz çizgi. Soldan sağa sıra:
`Destek`, `Teknesyum`, küçült, büyüt, kapat (§4).

## 5.4 Hareket — ölçülü, iptal edilebilir, kapatılabilir

Bu temada animasyon **süs değil geri bildirimdir**: kullanıcıya bir şeyin değiştiğini,
nereden nereye gittiğini ve sistemin çalıştığını söyler. Söyleyeceği bir şey yoksa animasyon
konmaz.

**Bu cümle bir tavandır, taban değil.** Tek başına okununca "emin değilsem koymayayım" diye
anlaşılıyor ve çıktı durgun arayüz oluyor — şikâyet buradan geldi. Tavan neyin fazla
olduğunu söyler; aşağıdaki taban neyin **eksik** olduğunu söyler. İkisi birlikte okunur.

### Animasyon tabanı — bunlar animasyonsuz teslim edilemez

Aşağıdaki olayların söyleyeceği bir şey **vardır**. Biri animasyonsuzsa arayüz eksiktir;
"gerek görmedim" geçerli bir gerekçe değildir.

| Olay | Beklenen | Süre · eğri |
|---|---|---|
| Panel, diyalog, çekmece açılışı | opaklık `0→1` + 8 DIP kayma ya da `scale(0.98)→1` | `--tk-t-base` · `--tk-e-out` |
| Aynısının kapanışı | girişin tersi, **bir kademe kısa** | `--tk-t-fast` · `--tk-e-in` |
| Sekme ve görünüm değişimi | giden içerik solar, gelen belirir — ani takas yok | `--tk-t-base` |
| Liste/tablo satırı eklenme, silinme, sıralanma | kalan satırların **konumu** animasyonlanır | `--tk-t-base` |
| Bildirim yığını | giriş, çıkış **ve** yığının kayması — üçü de | giriş `--tk-t-fast`, çıkış `--tk-t-instant` |
| Hover ve basma — **her** etkileşimli öğe | renk ya da opaklık; basmada `scale(0.98)` | `--tk-t-instant` |
| Açılır menü, tooltip, çip | opaklık + 4 DIP kayma | `--tk-t-fast` · `--tk-e-out` |
| Yükleniyor | iskelet ya da ilerleme göstergesi — donuk ekran değil | döngü ≥ 1.4 s |
| Boş durum → dolu durum | içeriğin belirişi; ekran bir anda dolmaz | `--tk-t-base`, 40 ms kademe |
| Değer değişimi (ilerleme, sayaç, rozet) | eski değerden yeniye geçiş görünür | `--tk-t-base` |
| Odak halkası | **geçişsiz** — tek istisna, klavye kullanıcısı beklemez | 0 ms |

**Kural cümlesi:** *"Söyleyeceği bir şey yoksa animasyon yok" bir tavandır; yukarıdaki
olayların söyleyeceği bir şey vardır ve animasyonsuz teslim edilemez.*

**Bir olay tabana giriyor mu — ölçüt:** durum değişimi hareketsiz **algılanmıyorsa** girer.
Kullanıcı ekrana bakarken bir şeyin değiştiğini fark etmiyorsa eksik olan animasyondur,
metin değil. Süs sorusu değil, anlaşılırlık sorusudur.

**Tabandan muaf olan tek şey ölçülmüş sıklıktır.** Günde yüzlerce kez tekrarlanan eylem
(her tuş vuruşunda arama sonucu, kaydırma, imleç hareketi) animasyonsuz kalır — orada
hareket geri bildirim değil gecikmedir. Ölçüt sıklıktır, tahmin değil.

**Taban `prefers-reduced-motion` açıkken de yürürlüktedir.** Ayar açıkken konum ve ölçek
düşer, **opaklık geçişleri kalır** — yani taban opaklık yarısıyla karşılanır. Ne taban
erişilebilirliği ezer, ne erişilebilirlik durgun arayüzün bahanesi olur.

**Kütüphane varsayılanı token değildir.** `motion` çok keyframe'li geçişte 800 ms,
`anime` genelde 1000 ms, `auto-animate` 250 ms kullanıyor; üçü de sahne için ayarlanmış.
Tabanı kurarken süreler yukarıdaki tokenlardan okunur, kütüphanenin varsayılanı ezilir.

**Süre ve yumuşatma tokendır.** Rastgele `0.3s` yazılmaz.

```
--tk-t-instant   90ms    renk, opaklık, hover
--tk-t-fast     160ms    açılan menü, tooltip, çip
--tk-t-base     240ms    panel, diyalog, sekme geçişi
--tk-t-slow     360ms    sayfa/görünüm değişimi — üst sınır
--tk-e-out      cubic-bezier(0.2, 0, 0, 1)      giren şey
--tk-e-in       cubic-bezier(0.4, 0, 1, 1)      çıkan şey
--tk-e-spring   cubic-bezier(0.34, 1.36, 0.64, 1)  yalnızca basma geri bildirimi
```

360 ms'yi geçen hiçbir arayüz hareketi yok. Kullanıcı ikinci kez gördüğünde beklemeye
başlıyorsa animasyon uzundur.

**Yalnızca `opacity` ve `transform` animasyonlanır.** `width`, `height`, `top`, `left`,
`margin`, `box-shadow`, `filter` animasyonu yerleşimi yeniden hesaplattırır; kare düşer,
zayıf makinede takılma görünür. Boyut değişimi gerekiyorsa `scale` ile yapılır.

**Geçiş (`transition`) tercih edilir, keyframe değil.** Sebep: geçiş yarıda iptal edilebilir.
Kullanıcı açılmakta olan paneli kapatırsa panel bulunduğu yerden geri döner; keyframe
animasyonu ise başa sarar ve sıçrar. Keyframe yalnızca gerçekten döngüsel olan şey içindir
(yükleniyor göstergesi).

**`prefers-reduced-motion` zorunludur, sonradan eklenmez.** Ayar açıkken konum ve ölçek
animasyonları kapanır, **opaklık geçişleri kalır** — arayüz cansızlaşmaz ama baş döndürmez.
Web'de tek blok yeter; WPF'te `SystemParameters.ClientAreaAnimation` okunur.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-property: opacity !important;
    transition-duration: var(--tk-t-instant) !important;
  }
}
```

`transition-property: opacity` satırı zorunludur. O olmadan blok konum ve ölçek geçişlerini
**kapatmaz, 90 ms'ye kısaltır** — 90 ms'lik bir `scale` ya da 8 DIP kayma hâlâ harekettir
ve düz yazının tam tersini yapar.

**Mikro etkileşim tavanları** — abartı buradan başlar, sınırlar kesindir:

| Durum | İzin verilen | Yasak |
|---|---|---|
| Hover | `scale(1.02)`, glow opaklığı `/20`→`/30`, renk | 1.05+ büyüme, kayma, dönme |
| Basma | `scale(0.98)`, 90 ms | zıplama, `spring` yankısı |
| Odak | halka **anında** belirir | halkayı yumuşatarak geciktirmek |
| Giriş | 8 DIP kayma + opaklık, 240 ms | 40 DIP uçuş, dönerek gelme |
| Liste | 40 ms kademe, **en çok 6 eleman** | 20 elemanı tek tek düşürmek |

**Giriş animasyonu bir kez oynar** — bileşen ilk kez göründüğünde. Her `render`'da, her
sekme dönüşünde, her veri tazelemesinde tekrar oynayan giriş animasyonu hatadır: kullanıcı
aynı ekranı ikinci kez görüyordur ve beklemek zorunda kalır.

**Sonsuz döngü yasak.** Nefes alan arka planlar, sürekli dönen çizgiler, kayan gradient
duvarlar bu temada yok. Tek istisna **süreç göstergesidir** — gerçekten bir iş yürürken
çalışır, iş bitince durur. Yükleme iskeleti (`skeleton`) parıltısı da buna dahildir:
döngü ≥ 1.4 s ve kontrastı düşük olur.

**Sürükleyerek yapılan her işin tek dokunuşluk alternatifi olur.** Dosya bırakma alanı
varsa "Dosya seç" düğmesi de olur; sıra değiştirme sürüklemeyle yapılıyorsa yukarı/aşağı
düğmesi de bulunur. WCAG 2.2 §2.5.7; el titremesi olan ve işaretçi hassasiyeti düşük
kullanıcılar sürükleyemez.

**Hareket, tıklanacak şeyi kaçırmaz.** Kullanıcı bir düğmeye giderken düğme yer değiştiriyorsa
animasyon zarar veriyordur. Yerleşim animasyonu yalnızca kullanıcı eylemiyle başlar, kendi
kendine değil; açılan panel komşularını itmez, üstlerine biner.

React/Electron tarafında varsayılan animasyon kütüphanesi **`motion`** (eski adıyla
Framer Motion): `useReducedMotion` hook'u ve iptal edilebilir geçişler hazır gelir. Süre ve
eğri değerleri yine yukarıdaki tokenlardan okunur, bileşen içinde sayı yazılmaz.

**`<MotionConfig reducedMotion="user">` kök sarmalayıcıda zorunludur.** Motion'ın
varsayılanı `reducedMotion: "never"`'dır (`MotionConfigContext.tsx:72`) — hook gelir,
politika gelmez. Bu satır yazılmazsa kütüphane sistem ayarını yok sayar ve arayüz
`prefers-reduced-motion` kuralını hiç uygulamamış olur.

```jsx
<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

Ayar açıkken Motion yalnızca `positionalKeys` grubunu (`width, height, top, left, right,
bottom` + tüm transform'lar) anında yapar; opaklık ve renk kalır. Bu bizim kuralımızla
birebir aynı — bu yüzden `"user"` doğru değer, `"always"` değil.

**`MotionConfig` yalnız kütüphaneyi kapsar.** CSS ile yazılmış sonsuz döngüler ondan
etkilenmez; `@media` bloğu da onları durdurmaz, hızlandırır. Süreç göstergesi gibi meşru
döngüler `motion-safe:` altına alınır (§5.4 sonsuz döngü kuralı).

**WPF karşılıkları** — `Storyboard` yalnızca `RenderTransform` ve `Opacity` üzerinde çalışır,
`Width`/`Height` üzerinde değil. Yumuşatma `PowerEase`/`CubicEase` ile `EasingMode="EaseOut"`.
Storyboard'lar `Freeze()` edilir. Sürekli çalışan `DispatcherTimer` tabanlı animasyon yok;
pencere gizliyken animasyon durdurulur.

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
- Sayıyı sans font ile yazmak → mono
- Glow'suz neon renk → ölü görünür
- Başlıkta tracking unutmak
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

## 7. Masaüstü ve dil yamaları

WinForms/WPF işinde **`references/desktop.md`** zorunlu: taşma/kırpılma kuralları,
pencere çerçevesi ve başlık çubuğu, `locale/` klasörü. Web/React işinde açma.

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

Derlemenin geçmesi arayüzün doğru olduğunu göstermez. Arayüz işi **gözle** doğrulanır:

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
