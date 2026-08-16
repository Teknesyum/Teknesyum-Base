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
bg           #000000   uygulama zemini — tam siyah, koyu gri değil
surface      #0a0a0c   panel zemini (95% opak), zeminden ancak çerçevesiyle ayrılır
text         #ffffff   okunması gereken HER şey — gövde, başlık, tablo, değer, etiket metni
label        #00f3ff   etiket ve bölüm başlığı (küçük, uppercase, tracking'li)
disabled     #71717a   YALNIZCA devre dışı kontrol. Tek gri budur.
```

Bir ekranda **mavi baskın, pembe vurgu, mor seyrek**. Üçünü eşit kullanma.

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

Glow şart: renkli metin `drop-shadow(0 0 5px <renk>)`, dolgulu buton
`box-shadow: 0 0 20px <renk>40`, çerçeveli kutu `inset 0 0 8px <renk>`. Glow'suz neon yok.

Opaklık merdiveni — sadece bunlar: dolgu `/10`, hover `/20`, aktif `/30`, çerçeve `/30`,
güçlü çerçeve `/50-60`.

## 3. Tipografi (varsayılan)

Sans: `'Segoe UI', system-ui, -apple-system, sans-serif` — metin, etiket, başlık.
Mono: `Consolas, 'Cascadia Mono', ui-monospace, monospace` — **her sayı, tuş, kod, ID,
süre**. Sayıyı sans ile yazma.

| Rol | Boyut | Ağırlık | Tracking | Renk |
|---|---|---|---|---|
| Panel başlığı (h2) | 18px | 700 | 0.1em | neon-blue + glow |
| Bölüm başlığı (h3) | 14px | 700 | 0.1em UPPERCASE | neon-blue |
| Etiket | 10px | 700 | 0.15em UPPERCASE | neon-blue |
| Gövde | 13px | 400 | 0 | `#ffffff` |
| Mono değer | 14px | 700 | 0 | neon-pink |
| Hero sayı | 24px | 900 | 0 | neon-blue + glow |
| İpucu | 10px | 400 | 0 | `#ffffff` |

Ölçek 10 → 13 → 14 → 18 → 24. Ara boyut ekleme.

Etiket ile gövdeyi ayıran şey artık parlaklık değil: etiket **küçük, kalın, harf aralıklı
ve mavi**; gövde **büyük, normal ağırlıkta ve beyaz**. İpucu da beyaz kalır — yalnızca
küçülür. Bir bilgiyi göstermeye değer bulduysan okunacak kadar parlak yaz; değmiyorsa
ekrandan kaldır. Soluk yazı, silinmemiş içeriğin bahanesidir.

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

## 6. Sık yapılan hatalar

- Soluk gri gövde metni (`#d1d5db`, `#9ca3af`) → beyaz. Bu temada ara gri yok
- Beyaz zemin (WebView gövdesi, boş grid, önizleme paneli) → `bg`/`surface` ver
- Native bırakılan MessageBox, scrollbar, ComboBox popup'ı, sekme başlığı → §8 sızıntı tablosu
- Panelin/kartın komşusunun çerçevesini ya da glow'unu kesmesi → §8, örtüşme yok
- Rastgele Tailwind rengi (`text-cyan-400`) → token kullan
- Sayıyı sans font ile yazmak → mono
- Glow'suz neon renk → ölü görünür
- Başlıkta tracking/uppercase unutmak
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
