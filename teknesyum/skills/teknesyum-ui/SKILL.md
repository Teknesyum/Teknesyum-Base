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

Bir ekranda **mavi baskın, pembe vurgu, mor seyrek**. Üçünü eşit kullanma. Pembe ve morun
asıl yeri **durum**tur: hover, focus, seçim, sürükleme. Kalıcı pembe metin, bilinçli ve
tekil bir marka vurgusu değilse kullanılmaz.

**Zemin nötrdür — metnin rengiyle akraba olamaz.** Mavi yazının arkasına mavimsi koyu
yüzey konmaz: iki renk aynı aileden olunca kontrast sayı olarak yeterli görünse bile göz
ayırt edemez, yazı yüzeye gömülür. Zemin ve panel tonu **nötr kömür/siyah** kalır; renk
yalnızca yazıda, çerçevede ve durum vurgusunda bulunur. Aynı sebeple pembe metnin arkasına
morumsu yüzey konmaz.

**Kontrast pazarlık konusu değil.** Zemin tam siyah, yazı tam beyaz. `#d1d5db`, `#9ca3af`,
`#6b7280` gibi ara griler bu temada **yok**: koyu zeminde soluk gri yazı, tasarım değil
okunmayan yazıdır. Kullanıcının bakması gereken bir şeyi soluklaştırarak hiyerarşi kurma —
hiyerarşi **boyut, ağırlık, tracking ve neon renk** ile kurulur, parlaklık düşürerek değil.
Metin/zemin kontrastı **7:1 altına inemez** (beyaz/siyah 21:1, neon-blue/siyah 12:1).
Tek istisna gerçekten devre dışı olan kontroldür; o da griliğe ek olarak ayrıca belli edilir
(ikon, imleç, tooltip) — çünkü renk körü kullanıcı grinin anlamını göremez.

**Beyaz zemin kullanma.** Beyaz burada **yazının rengidir, zeminin değil.** Koyu bir arayüzün
ortasındaki beyaz kutu göz kamaştırır: kullanıcı karanlık ortamda çalışıyordur, gözü siyah
zemine uyum sağlamıştır, beyaz panel her açılışında acıtır. Sızdığı yerler bellidir —
`WebView`/`iframe` varsayılan gövdesi, PDF ve rapor önizlemesi, boş `DataGridView`, yazdırma
görünümü, yüklenmemiş `<img>` kutusu, üçüncü parti denetimlerin varsayılanı, `MessageBox`.
Hepsinin zemini açıkça `bg`/`surface` verilir; "varsayılanı ne ise" bırakılmaz.

Beyaz dolgu yalnızca **küçük ve amaçlı** olduğunda geçerlidir: bir ikonun içi, bir grafikteki
veri noktası, bir imleç. Ölçü, avuç içi kadar alan — panel, satır, sekme ya da diyalog zemini
asla. İçeriğin kendisi beyaz zeminliyse (kullanıcının PDF'i, dış web sayfası) onu bir
`surface` çerçeve içine al ve kenarlarına pay bırak; ekranın kenarına dayanmasın.

Glow **kutuya** uygulanır, **metne değil**: dolgulu buton `box-shadow: 0 0 20px <renk>40`,
çerçeveli kutu `inset 0 0 8px <renk>`, ikon `drop-shadow(0 0 5px <renk>)`. Glow'suz neon
yüzey yok.

**Metne glow verilmez.** Sahada ölçüldü: harflerin etrafındaki hale kenarları yumuşatıyor,
küçük punto ve ince gövdeli yazıda okunurluğu düşürüyor, ekran görüntüsünde metin bulanık
çıkıyor. Neon etkisi zaten rengin kendisinden geliyor. Tek istisna **hero sayı** (24px+,
900 ağırlık) — orada harf o kadar kalın ki hale gövdeyi yemiyor. Başlık, etiket, gövde,
bağlantı, tablo değeri: glow yok. **Okunurluk gösterişten üstündür**; bu skill'de ikisi
çatıştığında kazanan hep okunurluktur.

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

## 5.1 Piksel disiplini — kapanan çerçeveler, simetri

Neon tema anahat üstüne kuruludur; anahat yarım kalırsa tema yarım kalır. Aşağıdakiler
göz kararı değil hesap işidir.

**Kapalı kontur kendi çizim sınırından en az 1 DIP içeri alınır.** Kontrolün tam kenarına
çizilen çerçeve, DPI yuvarlamasında kenarın dışına taşar ve bir ya da iki kenarı kaybolur —
klasik "üç kenarı var, sağı yok" hatası. `Rectangle`/`Border` geometrisi sınırdan içeride
kurulur ve **dört kenarı da çalışan uygulamada** doğrulanır. Sağ ve alt kenar özellikle
kontrol edilir; kırpılma en çok orada olur.

**Hücre, içindeki nesnenin nominal ölçüsüne eşitlenmez.** Stroke kalınlığı, DPI yuvarlaması
ve her iki yanda en az 2 DIP güvenlik payı hesaba katılır: **20×20 çizilen bir onay
kutusunun hücresi 24×24**'tür. Nominal ölçüye eşitlenen hücre, %125 ölçeklemede kenarını yer.

**Simetri şart.** Yan yana duran kontrollerin köşe yarıçapı, yüksekliği, dikey merkezi ve
panellerin alt kenarı **piksel düzeyinde** eşleşir. Bir piksellik fark, yarım çizgi veya
kapanmayan anahat kabul edilmez — "neredeyse hizalı" hizasızdır.

**Yan yana kontroller birleşmez.** Aralarında açık boşluk bulunur; iki çerçeve birbirine
değip tek kalın çizgi görüntüsü vermez (§8 örtüşme kuralının kardeşi).

**Piksel yuvarlaması açık bırakılır.** WPF'te `UseLayoutRounding` ve `SnapsToDevicePixels`
kapatılmaz; kapatılırsa 1 DIP'lik çizgiler yarım piksele düşer ve gri görünür.

**Toplam yüksekliğe bağlanan döngüsel yerleşim kurma.** Bir sütunun yüksekliği içindeki
panellerin toplamına, panellerin yüksekliği de sütuna bağlanırsa ölçüm turlara girer ve
sonuç pencere boyutuna göre değişir. Panele **`MinHeight`** verilir (örn. kompakt çıktı
paneli 254 DIP), sütun ona uyar. **`Height` yazma** — sabit yükseklik, yazı tipi/DPI/dil
değişince içeriği keser; kesilen ilk şey panelin en alt satırı olur.

**Yarıçap tektir.** Genel `CornerRadius` **6 DIP**. Daire yalnızca işlevsel istisnadır:
`?` rozeti, slider thumb, durum noktası. Kart/panel/düğme için farklı yarıçap üretme.

## 5.2 Gradientler — bantlaşma hatadır

Koyu temada iki durak arasındaki geçiş, 8-bit çıktıda görünür şeritler üretir. Kural:

- **En az 11 birbirine çok yakın durak** kullan; iki duraklı gradient bantlaşır.
- **Uç renklerin toplam kontrastı düşük** tutulur — gradient bir doku, bir geçiş değildir.
- Renk enterpolasyonu **`ScRgbLinearInterpolation`** ile yapılır (WPF:
  `ColorInterpolationMode="ScRgbLinearInterpolation"`).
- **Görünür bantlaşma ve ani ton/parlaklık sıçraması hatadır**, üslup tercihi değil.
- Bitişik alanlar **tek kesintisiz gradient** paylaşır. Üst şeride bir, içeriğe başka bir
  gradient verip aralarında dikiş bırakma; ayrı bant üretme.

## 5.3 Bileşen ölçüleri

Merkezî değerler. Projeye özel ezme gerekirse tokenı değiştir, kontrolü değil.

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

**Hareket, tıklanacak şeyi kaçırmaz.** Kullanıcı bir düğmeye giderken düğme yer değiştiriyorsa
animasyon zarar veriyordur. Yerleşim animasyonu yalnızca kullanıcı eylemiyle başlar, kendi
kendine değil; açılan panel komşularını itmez, üstlerine biner.

**WPF karşılıkları** — `Storyboard` yalnızca `RenderTransform` ve `Opacity` üzerinde çalışır,
`Width`/`Height` üzerinde değil. Yumuşatma `PowerEase`/`CubicEase` ile `EasingMode="EaseOut"`.
Storyboard'lar `Freeze()` edilir. Sürekli çalışan `DispatcherTimer` tabanlı animasyon yok;
pencere gizliyken animasyon durdurulur.

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

Bunlar her yeni arayüzde başlangıç hâlidir. Aksini yapmak için gerekçe gerekir, uygulamak için değil.

**Tema uygulamanın tamamını kaplar. Yarısı neon, yarısı native olan arayüz yoktur.**
Kullanıcı temayı ekranın bütününde görür; tek bir sistem grisi kutu, geri kalan her şeyin
özenini siler — "yarım kalmış program" hissi tam olarak buradan gelir. Sızıntı hep aynı
yerlerden olur, teslimden önce **hepsi tek tek gezilir**:

| Sızıntı | Nerede unutulur | Ne yapılır |
|---|---|---|
| Başlık çubuğu | pencere | aşağıdaki madde |
| Scrollbar | liste, metin kutusu | web `::-webkit-scrollbar` · WPF `ScrollBar` şablonu · WinForms `DarkMode_Explorer` (`desktop.md` §7) |
| MessageBox / uyarı | hata yolları | tema panelinden kendi modalını çiz; `MessageBox.Show` kullanma |
| Dosya/klasör seçici | aç-kaydet | sistem diyaloğu kalır (OS'un işi), ama **koyu mod bayrağı** açılır |
| ComboBox açılır listesi | ayar ekranı | popup şablonu da temalanır; sadece kapalı hâli değil |
| CheckBox / RadioButton | form | kutucuk ve tik işareti kendi çizilir, native glif bırakılmaz |
| ProgressBar | ilerleme | dolgu neon + glow, kanal `surface` |
| Tooltip | her yer | zemin `surface`, çerçeve `neon-blue/30`, yazı beyaz |
| Sağ tık menüsü | metin kutusu, liste | kendi `ContextMenu` şablonun |
| Tab başlıkları | TabControl | WPF/WinForms varsayılan gri sekme kabul edilmez |
| Metin imleci ve seçim rengi | girdi alanları | seçim `neon-blue/30`, caret neon-blue |
| Odak çerçevesi | klavye gezinme | noktalı native çerçeve yerine neon glow — **kaldırma, değiştir** |
| Devre dışı görünüm | pasif düğme | `disabled` tokenı + imleç; sistemin gri gölgesi değil |

**Ölçüt:** ekranı gezerken "bu kutu Windows'a mı ait?" diye düşündüren bir öğe kalmışsa
tema tamamlanmamıştır. Aynı ölçüt hata ve boş durum ekranları için de geçerlidir — en çok
oralar unutulur, çünkü mutlu yolda hiç görünmezler.

**Sistem başlık çubuğu kaldırılır, yerine tema panelinden bir şerit çizilir.** İşletim
sisteminin açık gri min/büyüt/kapat bandı neon pencerenin tepesinde temaya ait olmayan bir
yabancı cisimdir. Her stack'te karşılığı var, üçü de zorunlu:

| Stack | Native çubuğu kaldır | Yerine |
|---|---|---|
| WPF | `WindowStyle="None"` + `WindowChrome` | `Border` + `Grid` başlık şeridi |
| WinForms | `FormBorderStyle.None` | özel caption paneli |
| Electron | `frame: false` (veya `titleBarStyle: 'hidden'`) | `-webkit-app-region: drag` şerit |
| Web / PWA | — | uygulanmaz, atla |

Çizilen şerit: yükseklik **32–40px**, zemin `surface`, altında `1px` `neon-blue/20` çizgi.
Solda ikon + uygulama adı (14px/700/`0.1em`, odaklıyken neon-blue + glow, odak dışıyken
beyaz). Sağda üç düğme, ikon **10–12px** ve `stroke="currentColor"` SVG/Path — emoji
veya harf (`X`, `—`) kullanma. Hover: kapat **neon-pink**, diğerleri **neon-blue**, ikisi de
glow'lu; dolgu gelmez. Dosya yolu, sürüm, config yolu başlık şeridine yazılmaz — o bilgi
ilgili panele veya alt bilgiye gider.

**Native çubuğu kaldırmak işletim sistemi davranışlarını da kaldırır; hepsi geri takılır:**
sürükleyerek taşıma, başlığa çift tıkla büyüt/geri al, Aero Snap, kenardan boyutlandırma,
`Alt`+`F4`, büyütüldüğünde görev çubuğunun altına girmeme. Mekaniği ve WinForms/WPF'te
kaybolmalarının sebebi: `references/desktop.md` §8. **Teslimden önce dördü de fiilen denenir.**

**Pencere köşeleri yuvarlatılır.** Keskin dikdörtgen pencere neon temayla uyuşmuyor; yarıçap
**12px**. Çerçevesiz pencerede (§8) işletim sistemi yuvarlatma uygulamaz — şekli kendin kırp
(WinForms `Region`, WPF `Border.CornerRadius` + `WindowChrome`, web `border-radius`).
**Büyütülmüş pencere kare kalır:** ekran kenarında yuvarlatılmış köşe arkadaki masaüstünü
gösterir. Bu yüzden köşe bölgesi her yeniden boyutlandırmada yeniden hesaplanır.

**Hiçbir öğe bir başkasının anahattını kapatmaz.** Neon temada bir öğeyi öğe yapan şey
anahattıdır: çerçevesi ve onu saran glow halesi. Kenarının bir milimetresi komşu panelin
altında kalan düğme, kırık çizilmiş bir düğmedir — kullanıcı sebebini bilmeden "bir şey
bozuk" diye görür. Kural üç yerde birden tutulur:

- **Örtüşme yok.** Panel, kart ve düğme dikdörtgenleri birbirine değmez, üst üste binmez.
  Negatif margin, mutlak konumlandırmayla komşunun üstüne taşma ve "nasılsa görünmüyor"
  diyerek bırakılan `z-index` yarışı — üçü de yasak. Bilinçli katman (açılır menü, modal,
  tooltip) istisnadır; onlar zaten üstte durmak için vardır ve altındakini **tamamen**
  örter, kenarını yalamaz.
- **Glow'a pay bırakılır.** `box-shadow: 0 0 20px` bir öğeyi her yönde ~20px büyütür.
  Kabın padding'i ya da kardeşler arası boşluk bundan küçükse hale komşunun altında kesilir
  ve renk yarım kalır. Glow'lu öğenin çevresinde **en az 24px** boşluk bulunur (aralık
  merdiveninin üst basamağı, §5) — bu yüzden panel padding'i 24px.
- **Kap kırpmaz.** `overflow: hidden`, WPF `ClipToBounds="True"`, WinForms'ta kabın
  sınırına dayanmış çocuk denetim — hepsi glow'u keser. Kırpma gerçekten gerekiyorsa
  (kaydırılan liste) glow'lu öğe kabın kenarına yaslanmaz, iç boşluk içinde durur.

**Doğrulama gözle yapılır:** ekran görüntüsünü aç ve her düğmenin çerçevesini dört yanından
takip et. Kesilen tek kenar varsa kural çiğnenmiştir.

**Tablo ve ızgara içeriği ortalanır.** Başlık satırı da, hücreler de yatayda ortalı
(`MiddleCenter` / `text-align: center`); dikeyde de satır yüksekliğinin ortasında durur.
Sola dayalı ve ortalı sütunların karışması ızgarayı dağınık gösteriyor, tek hizada okunuyor.
Sütun genişliği içeriği **ortalanmış hâlde** sığdıracak kadar geniş olmalı: ortalanmış metin
kırpılırsa iki yanından birden kaybeder ve okunmaz olur (§7). Aynı şey rozet, çip ve durum
göstergesi için de geçerli — hücreye ortalanır, sola yapıştırılmaz.

**Kendi başlık çubuğunu çizen pencere, işletim sisteminin davranışlarını geri takar.** Çerçevesiz
pencere kenardan boyutlandırmayı, kenara yaslamayı (Aero Snap) ve başlığa çift tıkla ekranı
kaplamayı kaybeder; hit-test'i doğru yazmak yetmez, pencerenin `WS_THICKFRAME` ve `WS_MAXIMIZEBOX`
stillerini de taşıması gerekir. Stiller eklenince doğan görünür çerçeve `WM_NCCALCSIZE`'a sıfır
dönerek yok edilir. Üstelik kenarları `Dock=Fill` bir çocuk denetim kaplıyorsa pencerenin hit-test'i
oraya hiç ulaşmaz — **üç kenarda 7px tutamak payı bırakılır**. Bu üçü birlikte çalışır; biri
eksikse üç davranış birden sessizce ölür. Teslimden önce dördü de (yasla, çift tık, kenardan çek,
`Alt`+`F4`) fiilen denenir.

**Vurgu zeminleri opak verilir.** Bir satırı ya da rozeti neon renkle hafifçe boyamak için
`rgba(accent, .16)` düşünülür ama bunu doğrudan hücre/satır zeminine yazmak WinForms
`DataGridView`'da beyaz bir blok üretir: hücre dolgusu alfa kanalını yok sayar. Tint, yüzey
rengiyle **önceden karıştırılıp opak** verilir. Web/XAML'de alfa çalışır; ölçüt şu — zemin rengini
kendi çizmeyen bir denetime yarı saydam renk verme.

**Başlık çubuğu düğmeleri görünür boyutta ve beyaz çizilir.** Kapat/büyüt/küçült simgeleri harf
değil çizgidir; 12pt altında kenar yumuşatma onları griye çevirir ve kullanıcı "sönük" görür.
Tıklama alanı **52×36px**, simge yazı tipi **12pt**, duruk renk `#FFFFFF`.
Renk yalnız hover'da neona döner: büyüt/küçült neon-blue, kapat neon-pink.

**Alt bilgi şeridi tek satır ve mümkün olan en kısa.** Etiket yazı tipi + alt uzantısı kadar
yükseklik (ölçülen: 18px), üstündeki düğme sırasına yapışık. İçerik: solda durum noktası,
durum metni, sürüm ve dil anahtarı; **sağda destek bağlantısı ile imza yan yana, önce destek
sonra imza**. Destek bağlantısı imzadan koparılıp sola atılmaz — ikisi tek bir künye okunur.
**Bağlantı ve değer metinleri neon-blue**, yalnız durum noktası anlamına göre renklenir
(kurulu `#34D399`, değil `#FF00EA`).

**Panel başlıkları neon-blue çizilir.** `GÜVENLİK` / `DAVRANIŞ` / `AYRINTILAR` gibi bölüm
başlıkları gri değil, `#00F3FF`. Gri bırakılırsa panel çerçevesi renkli, içindeki başlık sönük
kalıyor ve bölüm başlığı gibi okunmuyor. Bunun **altındaki** "Etiket" rolü (alan üstü küçük
harf aralıklı yazılar) sönük kalmaya devam eder — hiyerarşiyi ayıran şey o karşıtlık.

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

**Görüntüyü nasıl alacaksın.** `SetForegroundWindow` güvenilir değildir — pencereyi öne
getirmediği hâlde başarı döner, sen de yanlış pencerenin görüntüsüne bakarsın. Pencereyi
arka planda da çizen `PrintWindow(hwnd, hdc, 2)` kullan; pencereyi süreç yolu **ve** başlığı
ile eşleştir:

```powershell
Add-Type -AssemblyName System.Drawing
$p = Get-Process VidShrink.App | Where-Object { $_.MainWindowHandle -ne 0 }
# PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT=2) -> Bitmap -> Save
```

**Bir DIP'lik anahat 1:1 görüntüde ayırt edilmez.** Şüpheli kenarı kırp ve **en az 4×
en yakın komşu (nearest-neighbour)** ile büyüterek bak; bulanıklaştıran ölçekleme yarım
çizgiyi tam çizgi gibi gösterir. Sekme şeridinin sağ ucu, panellerin alt kenarı ve onay
kutusu satırı bu büyütmeyle tek tek gezilir.

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
