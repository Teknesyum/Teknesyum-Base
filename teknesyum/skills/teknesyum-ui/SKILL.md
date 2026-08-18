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

Görünüm bizim, davranış onların: Base UI odak yönetimi, klavye gezinmesi ve `aria`
tarafını verir, tek bir rengi belirlemez. Hazır tema kütüphanesi (WPF UI, MahApps,
HandyControl, MUI) **kurulmaz** — kendi görsel kimliğini dayatır, §8'in tema bütünlüğü
kuralıyla çatışır.

## 2. Palet (varsayılan)

```
neon-blue    #00f3ff   birincil. eylem, aktif durum, sayısal vurgu, başlık
neon-pink    #ff00ea   ikincil. uyarı, ters/negatif eylem, kritik değer
neon-purple  #b026ff   üçüncül. mod anahtarları, scrollbar, ikincil buton
success      #34d399   yalnızca "tamamlandı"
bg           #000000   uygulama zemini — nötr, tam siyah
surface      #0a0a0c   panel zemini (95% opak), zeminden ancak çerçevesiyle ayrılır
text         #ffffff   okunması gereken HER şey — gövde, başlık, tablo, değer, etiket metni
label        #00f3ff   etiket ve bölüm başlığı (kalın, tracking'li — uppercase değil)
disabled     #71717a   YALNIZCA devre dışı kontrol. Tek gri budur.
```

Bir ekranda **mavi baskın, pembe vurgu, mor seyrek**. Pembe ve morun asıl yeri
**durum**tur: hover, focus, seçim, sürükleme. Kalıcı pembe metin, bilinçli marka vurgusu
değilse kullanılmaz.

**Zemin nötrdür — metnin rengiyle akraba olamaz.** Mavi yazının arkasına mavimsi yüzey,
pembe yazının arkasına morumsu yüzey konmaz; kontrast sayıca yetse bile göz ayırt edemez.
Renk yalnızca yazıda, çerçevede ve durum vurgusunda bulunur.

**Kontrast pazarlık konusu değil.** Zemin tam siyah, yazı tam beyaz. `#d1d5db`, `#9ca3af`,
`#6b7280` gibi ara griler yok — koyu zeminde soluk gri, tasarım değil okunmayan yazıdır.
Hiyerarşi **boyut, ağırlık, tracking ve neon renkle** kurulur, parlaklık düşürerek değil.
Metin/zemin kontrastı **7:1 altına inemez**. Tek istisna devre dışı kontrol; o da griliğe
ek bir işaretle belli edilir (ikon, imleç, tooltip) — renk körü kullanıcı griyi göremez.

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

Opaklık merdiveni — sadece bunlar: dolgu `/10`, hover `/20`, aktif `/30`, çerçeve `/30`,
güçlü çerçeve `/50-60`.

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
| Mono değer | 16 | 700 | 0 | neon-pink |
| Hero sayı | 28 | 900 | 0 | neon-blue + glow |
| Yardım / ipucu | 14 | 400 | 0 | `#ffffff` |

Ölçek 14 → 16 → 20 → 28. Ara boyut ekleme.

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

## 4. İmza bloğu

Varsayılan **açık**. Her projede tam olarak bir tane, **ayarlar veya hakkında bölümünün
en altında**, sağa yaslı, küçük, sessiz. Ana ekranda değil.

Hazır bileşen: `assets/Signature.tsx` (React) · `assets/Signature.xaml` (WPF).
Linkler ve metinler `assets/links.json`'da:
- GitHub: `https://github.com/Teknesyum`
- Destek: `https://github.com/sponsors/Teknesyum` — **aktif**

Destek düğmesi **anahat**tır: zemin `transparent`, çerçeve `neon-purple/50`, yazı ve ikon
`neon-purple` + text-shadow glow. Dolgulu kutu, gri kutu veya emoji ikon (`☕`) kullanma —
ikon 12px `stroke="currentColor"` SVG/Path olarak çizilir. Hover'da çerçeve tam opaklığa
çıkar ve dış glow açılır; dolgu hover'da da gelmez.

Kullanıcı ayarında `"imza": { "kapali": true }` varsa **ekleme**.
`"imza": { "metin": "...", "github": "...", "sponsor": "..." }` varsa onları kullan.

## 5. Bileşen kalıpları

Kopyalanabilir sınıflar: `references/components.md`. Sadece bir bileşenin tam kodu
lazımsa oku.

Panel: `bg-[#08090a]/95 backdrop-blur-xl border border-neon-blue/20 rounded-2xl p-6
shadow-[0_0_40px_rgba(0,0,0,0.8)]`
Radius: kutu `16px`, buton/kart `12px`, hücre `8px`, çip `6px`. Başka değer yok.
Aralık: 4 / 8 / 12 / 16 / 24. Panel padding `24px`, bölüm arası `24px`, satır arası `12px`.
Geçiş: `200ms` mikro, `300ms` renk/glow, `500ms` panel aç-kapa. Hover `scale(1.02)` buton,
`1.1` ikon.

**Yerleşim, piksel disiplini, gradient ve geri bildirim yüzeyleri:** `references/layout.md`.
Bir panel, pencere veya sayfa yerleşimi kurarken o dosya okunur.

## 5.3 Bileşen ölçüleri

Merkezî değerler. Projeye özel ezme gerekirse tokenı değiştir, kontrolü değil.

**Hedef boyutu — en az 24×24.** Tıklanabilir her şey (ikon düğmesi, kapat çarpısı, sekme,
onay kutusu hücresi, satır içi eylem) en az 24×24 DIP alan kaplar. Görünen simge daha
küçük olabilir; tıklanan alan olamaz. Bu WCAG 2.2 §2.5.8'in AA tabanıdır, tercih değil.

**Odak halkası — 2 DIP, 3:1 kontrast, anında.** Kontrolün çevresinde en az 2 DIP
kalınlığında ve zeminle 3:1 kontrast taşıyan bir halka belirir. 1 DIP'lik normal
konturumuz odak için yetmez; odak ayrı ve daha kalındır. Yumuşatılarak geciktirilmez
(WCAG 2.2 §2.4.13).

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

**Pencere düğmeleri** — 42×30 DIP. Küçült simgesi 10×2 DIP düz çizgi. Sıra: destek
bağlantısı, GitHub/imza, küçült, büyüt, kapat.

## 5.4 Hareket — ölçülü, iptal edilebilir, kapatılabilir

Bu temada animasyon **süs değil geri bildirimdir**: kullanıcıya bir şeyin değiştiğini,
nereden nereye gittiğini ve sistemin çalıştığını söyler. Söyleyeceği bir şey yoksa animasyon
konmaz.

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
    transition-duration: var(--tk-t-instant) !important;
  }
}
```

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
Framer Motion): `useReducedMotion` ve iptal edilebilir geçişler hazır gelir. Süre ve eğri
değerleri yine yukarıdaki tokenlardan okunur, bileşen içinde sayı yazılmaz.

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
- Nefes alan arka plan, sonsuz dönen süs → yalnızca gerçek süreç göstergesi
- İmza bloğunu ana ekrana koymak → ayarların altına

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
`neon-blue/30`, scrollbar 10px temalı, hiçbir öğe bir başkasının anahattını kapatmaz,
vurgu zeminleri opak verilir.

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
5. Metin kesilmesi, gereksiz kaydırma çubuğu, native görünüm ve **bir piksellik fark**
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
Teknesyum ▸ etki · teknesyum-ui
  MainWindow.xaml:14   başlık çubuğu  sistem bandı kaldırıldı → 36px neon şerit   §8
  MainWindow.xaml:52   palet          #00f3ff / #ff00ea token; ara renk yok       §2
  MainWindow.xaml:88   tipografi      sayılar Consolas'a alındı                    §3
  SettingsPage.xaml:210 imza          ayarların altına, anahat sponsor düğmesi     §4
  — uygulanmadı: pencere köşesi (WindowChrome projede yok, gerekçe: mevcut chrome)
```

**Uygulamadığın maddeyi de yaz.** Sessizce atlanan kural, hiç var olmamış kuraldır; gerekçesi
yazılınca kullanıcı katılmıyorsa itiraz edebilir. Ayar kapalıysa (`"kapali": true`) blok yerine
tek satır: `Teknesyum ▸ etki · teknesyum-ui kapalı, projenin kendi tarzı korundu`.
