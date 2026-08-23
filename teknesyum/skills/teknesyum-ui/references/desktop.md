# Masaüstü ve yerelleştirme — Teknesyum neon

WinForms/WPF projelerinde zorunlu kurallar ve `locale/` yamaları. Web/React işinde
bu dosyayı okuma; `SKILL.md` yeter.

## 7. Taşma ve kırpılma — masaüstü (WinForms/WPF) için zorunlu

Neon tema koyu olduğu için kırpılan içerik **görünmez olur**, kullanıcı eksik olduğunu fark etmez.
Bu yüzden aşağıdakiler kural, tercih değil.

**Hiçbir metin ve hiçbir buton kırpılmaz.** Sığmayan metin `...` ile kısaltılır
(WinForms `AutoEllipsis = true`, WPF `TextTrimming="CharacterEllipsis"`), tam değeri tooltip'te
verilir. Kırpılan bir düğme etiketi ("Kur / Güncelle" yerine "Güncelle" görünmesi) hatadır.

**Buton şeridi eleman düşürmez.** Sığmıyorsa ya sarar ya pencerenin minimum genişliği yükseltilir.
Birincil eylemin kaybolduğu bir boyut olamaz.

**Sabit yükseklikli satıra sabit sayıda kontrol koyarken sayıyı doğrula.** Üç radyo düğmesi
72px'e sığmaz; 3 × 32 = 96px gerekir. `AutoSize` satır + `Dock=Fill` çocuk birlikte kullanılırsa
satır yüksekliği yanlış ölçülür ve alttaki içerik üste biner — bu kombinasyonu kullanma,
o satırı `Absolute` yap ve yüksekliği elle hesapla.

**İmza bloğu kendi satırında durur.** Buton şeridiyle aynı satırı paylaşmaz, hiçbir kontrolün
üstüne binmez.

**Pencere, içeriğini varsayılan boyutunda eksiksiz gösterecek kadar büyük açılır.** "Kullanıcı
büyütür" bir çözüm değil. `MinimumSize`, en kalabalık ekranın sığdığı boyuttan küçük olamaz.

**Native scrollbar'lar koyulaştırılır.** WinForms/Win32'de varsayılan scrollbar beyazdır ve
koyu temayı bozar: uygulama açılmadan `uxtheme.dll` ordinal 135 `SetPreferredAppMode(2)`,
sonra her kaydırılabilir kontrole `SetWindowTheme(handle, "DarkMode_Explorer", null)`.
Ordinal belgelenmemiştir — `try/catch` ile sar, başarısızlıkta uygulama açılmaya devam etsin.

**Doğrulama:** ekran görüntüsünü **varsayılan boyutta ve `MinimumSize`'da** al, dosyayı aç ve bak.
Bakmadan "düzeldi" deme.

## 7.1 WPF'te yarım çizilen anahat — kök nedenler

"Sekmenin sağı ve altı yok", "onay kutusunun altı kesik" şikâyeti üslup değil, aşağıdaki
üç yapısal nedenden biridir. Anahat düzeltirken önce nedeni bul; `Margin`/`Padding` ile
itmek belirtiyi bir DPI'da gizler, diğerinde geri getirir.

**1 — Anahat, şablon kökünün kardeşiyse.** `ControlTemplate` kökü `Grid` olup çerçeve o
grid'in içinde ayrı bir `Rectangle`/`Border` ise, çerçeve kendi ölçüsünü kökten alır ve
stroke'un yarısı kontrolün çizim sınırının dışına düşer; dışarıda kalan yarı kırpılır.
**Anahat şablonun kökünün kendisi olur:**

```xml
<ControlTemplate TargetType="TabItem">
  <Border x:Name="TabOutline" BorderThickness="1" CornerRadius="6"
          SnapsToDevicePixels="True" UseLayoutRounding="True">
    <ContentPresenter ContentSource="Header" Margin="{TemplateBinding Padding}"/>
  </Border>
</ControlTemplate>
```

**2 — Kapsayıcının kendi varsayılan şablonu kırpıyorsa.** `TabControl`'ün varsayılan
şablonundaki `TabPanel` başlıkları kendi sınırına sıkıştırır; `TabItem` üzerinde
`ClipToBounds="False"` vermek yetmez, kırpan üsttekidir. Kapsayıcının **şablonu da**
değiştirilir, başlıklar `IsItemsHost="True"` bir `StackPanel`'e alınır:

```xml
<ControlTemplate TargetType="TabControl">
  <Grid ClipToBounds="False">
    <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="*"/></Grid.RowDefinitions>
    <StackPanel Grid.Row="0" IsItemsHost="True" Orientation="Horizontal"
                ClipToBounds="False" Margin="0,0,0,2"/>
    <ContentPresenter Grid.Row="1" ContentSource="SelectedContent"/>
  </Grid>
</ControlTemplate>
```

Aynı sorun `ToolBar`, `Menu`, `ListBox` başlık şeritleri için de geçerlidir: neon anahat
verdiğin her `ItemsControl`'ün items host'unun ne olduğunu kontrol et.

**3 — Panele sabit `Height` verilmişse.** `Height="260"` bir sözleşme değil, kesme
emridir: yazı tipi, DPI ölçeği veya dil değiştiğinde içerik büyür, panel büyümez ve en
alttaki kontrolün (genelde onay kutusu satırı) alt kenarı kaybolur. **Panelde `Height`
değil `MinHeight` kullanılır** — hizalama korunur, içerik gerekince taşar.

## 8. Pencere çerçevesi ve başlık çubuğu — masaüstü

**Sistem başlık çubuğu bırakılmaz.** Kapat/küçült/büyüt şeridi işletim sisteminin açık gri
çizimiyle gelirse neon pencerenin tepesinde temaya ait olmayan bir bant kalır. İki kabul edilebilir
çözüm var, sırayla tercih edilir:

1. **Kendi başlık çubuğunu çiz** (`FormBorderStyle.None` + özel caption). Tercih edilen yol.
2. Çizemiyorsan en azından koyulaştır (`DWMWA_USE_IMMERSIVE_DARK_MODE`). Geçici çözümdür.

Kendi çubuğunu çizerken **kaybetmemen gerekenler** — bunlar unutulursa pencere kullanılamaz hâle
gelir ve kullanıcı sebebini anlayamaz:

- Sürükleyerek taşıma, **çift tıkla büyüt/geri al**
- Aero Snap (kenara/köşeye sürükleme, `Win`+ok) — `WM_NCHITTEST` ile kenar bölgeleri bildirilmeli
- Kenar/köşeden yeniden boyutlandırma
- `Alt`+`F4`, sistem menüsü, görev çubuğu önizlemesi
- Büyütüldüğünde çalışma alanını taşmama (görev çubuğunun altına girmemek)
- Odak durumuna göre başlık rengi: odaklıyken neon-blue, odak dışıyken sönük

Başlık çubuğundaki düğmeler palet dışına çıkmaz; kapatma düğmesi hover'da neon-pink,
diğerleri neon-blue. Yükseklik 32-40px arası, ikonlar 10-12px.

**Uygulama kimliği başlık çubuğunda durur:** ikon + uygulama adı. Dosya yolu, config yolu gibi
teknik bilgiler başlık şeridine değil, ilgili panele veya alt bilgi satırına konur.

**İmza bloğu da başlık çubuğundadır** — küçült düğmesinin solunda, sağdan sola `Teknesyum`
ve `Destek` (SKILL §4). Alt bilgi şeridine ya da ayarların dibine konmaz.

Şerit sürüklenebilir olduğu için iki öğe de sürükleme dışına alınır: WPF'te
`WindowChrome.IsHitTestVisibleInChrome="True"`, Electron'da `-webkit-app-region: no-drag`,
WinForms'ta `WM_NCHITTEST` bu iki dikdörtgen için `HTCLIENT` döner. Unutulursa bağlantı
tıklanmaz — fare basışı pencereyi taşımaya başlar.

**Odak görseli teslim edilir.** WPF'in varsayılan `FocusVisualStyle`'ı noktalı siyah
dikdörtgendir ve `#000000` zeminde görünmez. `assets/Theme.xaml` bunu
`{x:Static SystemParameters.FocusVisualStyleKey}` anahtarıyla uygulama genelinde değiştirir;
başka bir şey yapmaya gerek yok, dictionary merge edilmesi yeter. WPF görseli zaten yalnız
klavye modalitesinde çizer — `:focus-visible` karşılığı hazır gelir.

WinForms'ta karşılığı yoktur: `ControlPaint.DrawFocusRectangle` de noktalı çizer. Odaklanan
denetimin çevresine çift katmanlı halka **elle** çizilir (`Palette.FocusRing` ve
`Palette.FocusRingInner`), tetikleyici `Enter`/`Leave` değil `KeyDown` sonrası gelen odak
olur — fareyle tıklayan kullanıcıya halka gösterilmez.

## 9. Dil yamaları — `locale/` klasörü

Metin koda gömülmez. Her projede kökte `locale/` klasörü olur ve **çeviri yapan kişi kod
görmeden çalışabilir**. Ölçüt şudur: dili bilen ama projeyi bilmeyen biri tek bir dosyayı
kopyalayıp çevirebiliyorsa doğru; koda girip string aramak gerekiyorsa yanlış.

```
locale/
  tr.json      # kaynak dil, tam ve eksiksiz
  en.json      # çeviri
  README.md    # çevirmene tek sayfa: dosyayı kopyala, değerleri çevir, anahtara dokunma
```

**Dosya biçimi** — düz JSON, tek seviye, anahtar `alan.nesne.durum` kalıbında:

```json
{
  "app.title": "Runly Ayarları",
  "btn.addExtension": "Uzantı ekle",
  "status.installed": "Runly kurulu",
  "status.notInstalled": "Runly kurulu değil"
}
```

Kurallar:

- **Anahtar asla çevrilmez, asla yeniden adlandırılmaz.** Anahtar değişirse tüm diller kırılır.
- **Diller aynı anahtar kümesine sahiptir.** Eksik anahtar sessizce boş metin üretmez —
  kaynak dile düşer ve bunu bir kez günlüğe yazar.
- **Yer tutucular adlıdır:** `{count}`, `{path}` — sıralı `{0}` değil. Çevirmen cümlede
  sırayı değiştirebilmeli.
- **Cümle parçalarını birleştirme.** `"Toplam " + n + " dosya"` yerine
  `"file.total": "Toplam {count} dosya"`. Parçalı birleştirme çevrilemez.
- **Anlam ve koşul dillerde aynıdır.** Özellikle güvenlik ve onay metinlerinde: bir dilde
  "değiştirilecek", diğerinde "değiştirilebilir" olamaz.
- Varsayılan dil `tr`. Seçim kullanıcı ayarına (`config.json` / `settings`) yazılır ve
  bir sonraki açılışta korunur.

**Yükleme yolu platforma göre değişir, klasör düzeni değişmez:**

| Platform | Yol |
|---|---|
| Web / React / Electron | `locale/*.json` doğrudan `import` edilir veya `fetch` ile okunur |
| .NET (normal) | JSON gömülü kaynak (`EmbeddedResource`) + `Strings.Get(key)` |
| .NET **NativeAOT** | JSON'dan derleme öncesi üretilen sözlük. **`.resx`/uydu derleme kullanma** — AOT'de uydu derlemeleri çözülmez. |
| WPF | `Strings.Get` üzerinden markup extension; `x:Uid`/resx zorunlu değil |

**Arayüz tarafı iki şey borçlu:**

1. `TR | EN` anahtarı görünür bir yerde durur (üst şerit veya alt bilgi satırı), seçim anında
   uygulanır — yeniden başlatma istemez.
2. **Yerleşim en uzun dile göre ölçülür.** İngilizce ve Almanca metinler Türkçeden uzun olur;
   sabit genişlikli düğme ve sütunlar bu yüzden kırpar. §7 doğrulaması **her dil için** yapılır:
   ekran görüntüsünü al, dosyayı aç, bak.

## 10. Masaüstü varsayılanları — tartışılmadan uygulanır

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

Çizilen şerit: yükseklik **32–40px**, zemin `surface`, altında `1px` `neon-blue/50` çizgi.
Solda ikon + uygulama adı (14px/**600**/`0.15em`, odaklıyken neon-blue, odak dışıyken beyaz)
— etiket rolüdür, SKILL §3'ün etiket satırını taşır.
Sağda imza bloğu (§4) ve üç düğme; ikonlar **10–12px** ve `stroke="currentColor"` SVG/Path —
emoji veya harf (`X`, `—`) kullanma. Hover: kapat **neon-pink**, diğerleri **neon-blue**,
ikisi de glow'lu; dolgu gelmez. Dosya yolu, sürüm, config yolu başlık şeridine yazılmaz —
o bilgi ilgili panele veya alt bilgiye gider.

Soldan sağa sıra: `ikon` · `uygulama adı` · **boşluk** · `Destek` · `Teknesyum` · küçült ·
büyüt · kapat.

**Native çubuğu kaldırmak işletim sistemi davranışlarını da kaldırır; hepsi geri takılır:**
sürükleyerek taşıma, başlığa çift tıkla büyüt/geri al, Aero Snap, kenardan boyutlandırma,
`Alt`+`F4`, büyütüldüğünde görev çubuğunun altına girmeme. Mekaniği ve WinForms/WPF'te
kaybolmalarının sebebi: `references/desktop.md` §8. **Teslimden önce dördü de fiilen denenir.**

**Pencere köşeleri yuvarlatılır.** Keskin dikdörtgen pencere neon temayla uyuşmuyor; yarıçap
**12px** *(varsayılan, ölçülmedi)*. Bu değer **pencere kabuğunundur**, bileşen yarıçapı
değil: SKILL §5'in tek yarıçapı (`6px`) panel, kart, düğme ve hücre içindir. İkisinin ayrı
kalması bilinçli mi, yoksa pencere de 6'ya mı inmeli — **karara bağlanmadı, kullanıcıya
soruldu.** Çerçevesiz pencerede (§8) işletim sistemi yuvarlatma uygulamaz — şekli kendin kırp
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
Tıklama alanı **42×30 DIP**, simge yazı tipi **12pt**, duruk renk `#FFFFFF`.
Değer `SKILL.md` §5.3 ile aynıdır ve orada gerekçesi yazılıdır: bir dönem bu dosya
52×36px diyordu, çelişki 23.08.2026'da kullanıcı kararıyla 42×30 lehine kapandı.

Renk yalnız hover'da neona döner: büyüt/küçült neon-blue, kapat neon-pink.

**Alt bilgi şeridi tek satır ve mümkün olan en kısa.** Etiket yazı tipi + alt uzantısı kadar
yükseklik (ölçülen: 18px), üstündeki düğme sırasına yapışık. İçerik: solda durum noktası,
durum metni, sürüm ve dil anahtarı. **İmza ve destek bağlantısı burada değil, başlık
çubuğundadır** (§4) — alt şerit boş kalıyorsa daraltılır, doldurulmaz.
**Bağlantı ve değer metinleri neon-blue**, yalnız durum noktası anlamına göre renklenir
(kurulu `#34D399`, değil `#FF00EA`). **Renk tek başına yetmez** (WCAG 1.4.1, SKILL §2):
noktanın **şekli de** farklıdır — kurulu **dolu daire**, kurulu değil **halka** (içi boş,
2 DIP çerçeve). Renk körü kullanıcı iki yeşilimsi/pembemsi tonu ayırt edemeyebilir, dolu
ile boşu ayırt eder. CSS karşılığı `.tk-dot-on` / `.tk-dot-off`.

**Panel başlıkları neon-blue çizilir.** `Güvenlik` / `Davranış` / `Ayrıntılar` gibi bölüm
başlıkları gri değil, `#00F3FF` — ve ilki büyük gerisi küçük yazılır (SKILL §3). Gri
bırakılırsa panel çerçevesi renkli, içindeki başlık sönük kalıyor ve bölüm başlığı gibi
okunmuyor. Bunun **altındaki** "Etiket" rolü ondan boyut ve harf aralığıyla ayrılır,
parlaklıkla değil — bu temada sönük metin yok (SKILL §2).

## 11. Ekran görüntüsü ve piksel doğrulaması

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
