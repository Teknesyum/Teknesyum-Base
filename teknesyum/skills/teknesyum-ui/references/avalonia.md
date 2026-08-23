# Avalonia — Teknesyum neon

`standartlar.md` §1 çok platformda **Avalonia** diyor. `assets/Theme.xaml` Avalonia'da
çalışmaz: `SystemParameters.FocusVisualStyleKey`, `Style.Triggers`, `Storyboard` ve
`LineStackingStrategy` orada yok. Karşılığı `assets/Theme.axaml` ve
`assets/Signature.axaml`.

Bu dosya WPF'i bilen birine Avalonia farkını anlatır. WPF tarafı için `desktop.md`,
hareket kuralları için `motion.md` yürürlükte kalır — **kural değişmedi, aracı değişti.**

**Ölçüm notu:** bu dosyadaki hiçbir değer ekranda ölçülmedi. Sayılar `Theme.xaml`'dan
birebir taşındı ya da orada yazılı bir sayıdan hesaplandı; hesaplananların yanında
gerekçesi var. Gerçek render doğrulaması yapılmadı.

## 1. Kök eleman ve bağlama

`Theme.axaml`'ın kökü `ResourceDictionary` **değil** `Styles`. Sebep: dosya hem kaynak
(fırça, tema, süre) hem de genel kural (odak halkası, zemin, azaltılmış hareket) taşıyor;
Avalonia'da `Style` bir `ResourceDictionary` içinde yaşayamaz, `Styles` ise
`Styles.Resources` ile ikisini birden taşır.

```xml
<Application.Styles>
  <FluentTheme/>
  <StyleInclude Source="avares://Uygulama/Assets/Theme.axaml"/>
</Application.Styles>
```

`FluentTheme` **önce** gelir; sonra gelen kazanır. `Theme.axaml` Fluent'in genel kontrol
temasını yeniden yazmaz, yalnız `Theme.xaml`'da karşılığı olan kuralları taşır. TextBox,
ComboBox, sekme başlığı gibi denetimlerin neon karşılığı hâlâ borç — `desktop.md` §10'un
sızıntı tablosu Avalonia'da da geçerli, tabloyu tek tek gezmen gerekiyor.

## 2. `Style="{StaticResource X}"` yerine `Theme="{StaticResource X}"`

Avalonia'da `Style`'ın `x:Key`'i yoktur; stil seçiciyle eşleşir, elle atanmaz. Anahtarla
atanan karşılığı **`ControlTheme`**'dir ve `StyledElement.Theme` özelliğine verilir.

| WPF | Avalonia |
|---|---|
| `<Style x:Key="H2" TargetType="TextBlock">` | `<ControlTheme x:Key="H2" TargetType="TextBlock">` |
| `Style="{StaticResource H2}"` | `Theme="{StaticResource H2}"` |
| `<Style.Triggers><Trigger .../></Style.Triggers>` | `<Style Selector="^:pointerover">` (ControlTheme içinde) |

Anahtar adları `Theme.xaml` ile **birebir aynı** tutuldu; eşleme tablosu yok, çünkü
tablo iki dosyanın ayrışmasına izin verir. `test/u7-avalonia.js` bu eşitliği ölçer.

**Tek istisna `AppBgDonus`.** WPF'te bir `Storyboard` kaynağıydı. Avalonia'da `Animation`
kaynak olarak durup bir yere atanamaz, `Style.Animations` içinde yaşar; ayrıca bir
gradient fırçasının `EndPoint`'ini enterpole edecek animator yok. Karşılığı §4'teki
`Window.anim Panel.appbg` kuralıdır. Test bu istisnayı adıyla tanır.

## 3. Tetikleyici yok — Transitions ve pseudo-class

**En sık yapılan hata:** WPF'in `Trigger` + `EnterActions`/`ExitActions` yapısını
`Style.Animations` içinde keyframe olarak taklit etmek. Avalonia bir pseudo-class'tan
**çıkarken keyframe'i geri sarmaz**; düğme son karede takılı kalır ve fare çekilince
büyümüş hâlde durur. Bu hata derlemede görünmez, yalnız kullanırken çıkar.

Doğru araç ikili:

- **Durum** pseudo-class selector'ıyla yazılır: `:pointerover`, `:pressed`, `:disabled`,
  `:focus`, `:checked`.
- **Yumuşatma** `Transitions` ile yazılır ve **çift yönlü** çalışır.

```xml
<ControlTheme x:Key="PrimaryButton" TargetType="Button">
  <Setter Property="Template">
    <ControlTemplate TargetType="Button">
      <Border Name="bd" RenderTransformOrigin="50%,50%">
        <Border.Transitions>
          <Transitions>
            <DoubleTransition Property="Opacity"
                              Duration="{StaticResource TInstant}"
                              Easing="{StaticResource EOut}"/>
            <TransformOperationsTransition Property="RenderTransform"
                                           Duration="{StaticResource TInstant}"
                                           Easing="{StaticResource EOut}"/>
          </Transitions>
        </Border.Transitions>
        <ContentPresenter Name="PART_ContentPresenter"
                          Content="{TemplateBinding Content}"/>
      </Border>
    </ControlTemplate>
  </Setter>

  <Style Selector="^:pointerover /template/ Border#bd">
    <Setter Property="Opacity" Value="0.85"/>
  </Style>
</ControlTheme>
```

`^` ControlTheme'in hedef kontrolü, `/template/` şablonun içine iner, `Border#bd`
şablondaki `Name="bd"` öğesi. Şablon parçasına isim vermeyi unutursan selector sessizce
eşleşmez — hata vermez, sadece hiçbir şey olmaz.

**Kabul edilen sadeleşme:** `Transition` tek `Easing` alır. WPF'teki `EOut` (girerken) /
`EIn` (çıkarken) ayrımı Avalonia'da yapılamıyor; her iki yönde `EOut` kullanıldı. Bu bir
eksiklik, gizlenmiyor.

**Keyframe animasyonu yalnız gerçekten döngüsel olan şey içindir** (zemin gradienti,
süreç göstergesi) — `motion.md` M7 zaten bunu söylüyor, Avalonia'da tavsiye değil zorunluluk.

## 4. Azaltılmış hareket — `anim` sınıfı

`prefers-reduced-motion` karşılığı Avalonia'da **yok**; `SystemParameters.ClientAreaAnimation`
da yok. Kuralı dosyaya yazıp şablonda uygulamamak bu standardın en sinsi hata sınıfı
(`motion.md` M4) ve WPF tarafında tam bu olmuştu. Avalonia şablonu bu yüzden kuralı
**uyguluyor**, mekanizması şu:

1. Uygulama açılırken işletim sisteminin azaltılmış hareket tercihi okunur.
2. Tercih **kapalıysa** pencereye `anim` sınıfı eklenir. Açıksa **eklenmez**.
3. `Theme.axaml`'daki kurallar bu sınıfa bakar:
   - `Window.anim Panel.appbg` → zemin döngüsü yalnız sınıf varken çalışır.
   - `Window:not(.anim) Button:pressed /template/ Border#bd` → basma ölçeği iptal.
   - `Window:not(.anim) Button.sigchip:pointerover /template/ Border#bd` → çip ölçeği iptal.

Opaklık geçişleri her iki durumda da kalır: arayüz cansızlaşmaz ama baş döndürmez (M4).

**Sınıf pencerede durur, tek yerde.** Alt öğelere dağıtırsan bir tanesini unutursun ve
ayar yarım uygulanır.

Okuma kodu — Windows'ta `SPI_GETCLIENTAREAANIMATION`, diğer platformlarda bilinmiyor:

```csharp
using System.Runtime.InteropServices;

static class Hareket
{
    const uint SPI_GETCLIENTAREAANIMATION = 0x1042;

    [DllImport("user32.dll", SetLastError = true)]
    static extern bool SystemParametersInfo(uint eylem, uint param, ref bool sonuc, uint yaz);

    /// <summary>Azaltilmis hareket acik mi. Okunamazsa false doner.</summary>
    public static bool Azaltilmis()
    {
        if (!OperatingSystem.IsWindows()) return false;   // macOS/Linux: okuma yolu yok
        try
        {
            bool animasyonAcik = true;
            if (!SystemParametersInfo(SPI_GETCLIENTAREAANIMATION, 0, ref animasyonAcik, 0))
                return false;
            return !animasyonAcik;
        }
        catch { return false; }
    }
}
```

```csharp
// Window kurucusunda, InitializeComponent'ten sonra:
if (!Hareket.Azaltilmis())
    Classes.Add("anim");
```

Üç şeye dikkat:

- **Varsayılan hareketlidir.** Okuma başarısızsa `anim` eklenir; sessizce animasyonu
  kapatmak da bir hata olurdu, ölçemediğimiz yerde standardın kendi tabanı geçerli.
- **macOS ve Linux'ta okuma yolu yazılmadı.** macOS'ta karşılığı
  `NSWorkspace.accessibilityDisplayShouldReduceMotion`, Avalonia'dan doğrudan
  görünmüyor; bu platformlarda tercih **okunmuyor** ve kullanıcıya arayüz içinden bir
  anahtar sunman gerekir. Uydurma bir çözüm yazmaktansa eksiği yazıyorum.
- **Ayar açıkken sınıfı sonradan da düşürebilirsin** (`Classes.Remove("anim")`); kurallar
  seçiciye bağlı olduğu için değişiklik anında uygulanır, yeniden başlatma gerekmez.

## 5. Zemin gradienti ve dönüşü

WPF'te `AppBgDonus` storyboard'u fırçanın `EndPoint`'ini `0.5,1` ile `0.7,1` arasında
gezdiriyordu. Avalonia gradient fırçasının alt özelliğini enterpole **edemez** — fırça
animatörü yalnız düz rengi taşır. Aynı görünüm, gradientle boyalı katmanın çok yavaş
dönmesiyle üretiliyor.

Açı hesabı, dikeyden sapma: `atan(0.5) = 26.57°`, `atan(0.6) = 30.96°`,
`atan(0.7) = 34.99°`. Duruk değer olan `0.6`'ya göre uçlar `-4.39°` ve `+4.03°`, toplam
oynama `8.42°` — `motion.md` M10'un 20° tavanının altında. Ölçek `1.12`: dönen
dikdörtgenin köşede boşluk bırakmaması için 16:9 pencerede gereken en küçük ölçek `1.09`
hesaplandı, `1.12` pay bırakıyor. **Hepsi hesaplandı, ekranda ölçülmedi.**

Yerleşim — katman içeriğin **arkasında kardeş** durur ve **boştur**:

```xml
<Window xmlns="https://github.com/avaloniaui" ...>
  <Grid>
    <Panel Classes="appbg"/>   <!-- bos: donen katman cocuklarini da dondururdu -->
    <DockPanel>
      <!-- baslik seridi, icerik, alt bilgi -->
    </DockPanel>
  </Grid>
</Window>
```

İki fark daha:

- **`x:Shared` yok.** Avalonia kaynakları zaten paylaşılır ve buna karşılık gelen bir
  anahtar bulunmuyor. Bu şablonda sorun çıkarmıyor çünkü animasyon fırçaya değil
  katmanın `RenderTransform`'una uygulanıyor. Fırçayı **kod içinden değiştirme**:
  kaynağı tek örnek olarak paylaşan bütün pencereler etkilenir.
- **`ColorInterpolationMode` yok.** WPF'teki `ScRgbLinearInterpolation` karşılıksız,
  sRGB enterpolasyonu zorunlu. 11 durak zaten bantlaşmayı kapatmak için var; görünür
  fark olup olmadığı ölçülmedi.

## 6. `Signature.axaml` — Hyperlink'in karşılığı

WPF'in `Hyperlink`'i Avalonia'da **yok**. İmza çipi artık `Border` + `Hyperlink` değil,
şablonu `Border` olan bir **`Button`**:

| WPF | Avalonia | Neden |
|---|---|---|
| `Border` + içinde `Hyperlink` | `Button`, `ControlTheme x:Key="SigChip"` | klavye odağı, Enter/Space ve tıklama alanı bedava gelir |
| `RequestNavigate` | `Click` + `Tag` | `Hyperlink` olmayınca `NavigateUri` de yok |
| `Process.Start` | `TopLevel.Launcher.LaunchUriAsync` | tarayıcı ve mobil hedeflerde de çalışır |
| `ToolTip="..."` | `ToolTip.Tip="..."` | Avalonia'da eklenmiş özellik |
| `StrokeLineJoin`, `StrokeStartLineCap` | `StrokeJoin`, `StrokeLineCap` | ad ve sayı farkı |
| `WindowChrome.IsHitTestVisibleInChrome` | gerekmiyor | §7 |

Yan kazanç ölçülebilir: WPF'te tıklama alanı `Hyperlink` metni kadardı, `Button`'da bütün
çip tıklanıyor ve SKILL §4'ün "24×24 DIP'ten küçük olamaz" kuralı `MinHeight`/`MinWidth`
ile kendiliğinden sağlanıyor.

`TopLevel.Launcher` **Avalonia 11.1** ile geldi *(sürüm teyidi yapılmadı)*. Daha eskisinde
masaüstü karşılığı `Process.Start(new ProcessStartInfo(adres) { UseShellExecute = true })`.

`HyperlinkButton` (Avalonia **11.2+**, *sürüm teyidi yapılmadı*) üçüncü bir yol: `NavigateUri`
ve `Launcher` çağrısı hazır gelir, code-behind'a hiç gerek kalmaz. Şablonda **kullanılmadı**,
çünkü doğrulayamadığım bir sürüm tabanı şablonu kullanan her projeye dayatılırdı. Sürümün
kesinse `SigChip` temasını `HyperlinkButton`'a `TargetType` olarak verip `Click`/`Tag`
çiftini `NavigateUri` ile değiştirebilirsin; görsel kuralların hiçbiri değişmez.

### `loc:Str` markup extension

`desktop.md` §9'un `loc:Str`'ı Avalonia'da da yazılabilir ama sınıf WPF'inkiyle aynı
değildir — `System.Windows.Markup.MarkupExtension` yok. Avalonia derleyicisi
`ProvideValue` metodu olan **herhangi** bir sınıfı kabul eder:

```csharp
namespace Teknesyum.Localization;

public sealed class Str
{
    public Str() { }
    public Str(string anahtar) => Anahtar = anahtar;

    public string Anahtar { get; set; } = "";

    public object ProvideValue(IServiceProvider _) => Strings.Get(Anahtar);
}
```

Üç uyarı:

- **Sınıf adı `Str` olmalı, `StrExtension` değil.** Avalonia hem `Str` hem `StrExtension`
  adını dener; WPF'ten taşınan `...Extension` sonekli sınıf `{loc:Str ...}` ile de eşleşir,
  ama karışıklığı çıkarmaya değmez.
- **Değer bir kez çözülür.** Dil anahtarı çalışırken değişince metin kendiliğinden
  güncellenmez; `desktop.md` §9 "seçim anında uygulanır, yeniden başlatma istemez" diyor,
  yani bu yeterli değil. Anlık güncelleme isteniyorsa `ProvideValue` düz `string` değil bir
  `IBinding` döndürmeli, kaynağı da dil değişince `PropertyChanged` yayan bir sözlük olmalı.
  **Bu şablon o bağlamayı içermiyor.**
- **Şablon i18n kütüphanesi dayatmaz** (SKILL §4). `xmlns:loc` kendi katmanınıza çevrilir.

Bu üç maddeyi çözemediğim için uydurmak yerine yazıyorum: `Signature.axaml` derlenebilir
bir `Str` sınıfı **bekliyor**, kendisi sağlamıyor.

## 7. Pencere kabuğu

`desktop.md` §8 ve §10 aynen geçerli; yalnız araç değişiyor.

| İş | WPF | Avalonia |
|---|---|---|
| Sistem başlık çubuğunu kaldır | `WindowStyle="None"` + `WindowChrome` | `ExtendClientAreaToDecorationsHint="True"`, `ExtendClientAreaChromeHints="NoChrome"`, `ExtendClientAreaTitleBarHeightHint="-1"` |
| Sürükleyerek taşıma | `WindowChrome` verir | kendi şeridinin `PointerPressed`'inde `BeginMoveDrag(e)` |
| Kenardan boyutlandırma | `WindowChrome.ResizeBorderThickness` | `BeginResizeDrag(kenar, e)` |
| İmzayı sürüklemeden ayır | `IsHitTestVisibleInChrome="True"` | gerekmiyor |

Son satırın sebebi: Avalonia'da sürükleme işletim sisteminin chrome hit-test'i değil,
**senin yazdığın olay işleyicisi**. `Button` pointer olayını tükettiği için imza bloğu
sürükleme alanını kendiliğinden bölmez. Buna karşılık **sürükleme kodunu doğru yere
bağlamak zorundasın**: şeridin `Grid`'ine bağlarsan bütün şerit sürüklenir ve içindeki
öğeler yine çalışır; pencerenin köküne bağlarsan içeriğin her yeri sürükler.

Pencere köşesi yuvarlatma: `CornerRadius` `Window` üzerinde çalışmaz, kabuk `Border`'ına
verilir; büyütülmüş pencerede kare kalmalı (`desktop.md` §10).

## 8. Karşılığı olmayan ve gerekmeyenler

| WPF | Avalonia | Ne yapılır |
|---|---|---|
| `LineStackingStrategy` | yok | **gerekmiyor.** `LineHeight` Avalonia'da zaten kutu yüksekliği gibi davranıyor, CSS'e WPF'ten yakın |
| `Typography.NumeralAlignment="Tabular"` | `FontFeatures="+tnum"` (11.1+) | *sürüm teyidi yapılmadı*, şablonda **kapalı**. Seçilen ikame **mono**: hizalanması gereken her sayı `MonoValue` temasıyla yazılır (SKILL §3) |
| `Freezable` / stil mühürleme | yok | o tuzak yok; §9'daki akrabası var |
| `SystemParameters.FocusVisualStyleKey` | `Control.FocusAdorner` | §10 |
| `DropShadowEffect` (WPF) | `DropShadowEffect` (Avalonia 11) | var ama **özellikleri farklı**: `ShadowDepth` yerine `OffsetX`/`OffsetY`. Kutu glow'u için efekt değil `BoxShadow` kullanılır (§11) |
| `x:Shared="False"` | yok | §5 |
| `ColorInterpolationMode` | yok | §5 |

## 9. U1 dersi — transform nesnesini paylaştırma

U1 denetimi WPF'te `ScaleTransform`'un `Style` Setter değeri olarak verilmesinin iki
ayrı hataya yol açtığını ölçmüştü: nesne bütün örnekler arasında paylaşılıyor ve
mühürlenince yazılamıyordu.

Avalonia'da `Freezable` ve mühürleme yok, **o tuzak yok.** Akrabası duruyor: Setter değeri
olarak verilen bir transform **nesnesi** yine tek örnektir ve bütün eşleşen öğelerde
paylaşılır.

Kaçınma doğal — `Theme.axaml` ve `Signature.axaml` hiçbir yerde `RenderTransform`'a nesne
vermiyor:

```xml
<!-- yanlis: tek nesne, butun dugmeler paylasir -->
<Setter Property="RenderTransform">
  <ScaleTransform ScaleX="0.98" ScaleY="0.98"/>
</Setter>

<!-- dogru: metin parse edilir, her ogeye ayri TransformOperations uretilir -->
<Setter Property="RenderTransform" Value="scale(0.98)"/>
```

Metin biçimi ayrıca `TransformOperationsTransition`'ın gerektirdiği biçimdir; nesne
verirsen geçiş de çalışmaz.

## 10. Odak halkası

`Theme.axaml` `Control` seçicisine tek bir `FocusAdorner` verir; başka bir şey yapmaya
gerek yok, `StyleInclude` yeter.

```xml
<Style Selector="Control">
  <Setter Property="FocusAdorner">
    <FocusAdornerTemplate>
      <Panel Margin="-5" UseLayoutRounding="True">
        <Rectangle Margin="4" RadiusX="7" RadiusY="7" Stroke="#FF000000" StrokeThickness="2"/>
        <Rectangle Margin="2" RadiusX="9" RadiusY="9" Stroke="#FF00F3FF" StrokeThickness="2"/>
      </Panel>
    </FocusAdornerTemplate>
  </Setter>
</Style>
```

Değerler `Theme.xaml`'dan DIP olarak birebir taşındı. Yarıçap 6 DIP tabanından türetilmiş:
iç katman öğenin 1 DIP dışında (6+1=7), dış katman 3 DIP dışında (6+3=9).

Avalonia halkayı zaten yalnız klavye modalitesinde çizer — CSS'in `:focus-visible`
karşılığı hazır gelir, fareyle tıklayana halka gösterilmez. **Kaldırma, değiştir**
(`desktop.md` §10).

## 11. Glow

| Yer | WPF | Avalonia |
|---|---|---|
| Dolgulu düğme | `DropShadowEffect BlurRadius=20 Opacity=0.35` | `BoxShadow="0 0 20 0 #5900F3FF"` |
| Çerçeveli kutu | `DropShadowEffect` | `BoxShadow="inset 0 0 8 0 #CC00F3FF"` |
| Hero metni | `DropShadowEffect BlurRadius=8 Opacity=0.8` | `Effect="{StaticResource HeroGlow}"` |

`BoxShadow`'da opaklık ayrı bir özellik değil, **rengin alfası**. Çeviri: `0.35 × 255 = 89
= 0x59`, `0.8 × 255 = 204 = 0xCC`. Hesaplandı, ölçülmedi.

`BoxShadow` bir efekt değil kenar çizimidir; ucuzdur ve düzen dışına taşar. Metne glow
verilemez — orada `Effect` gerekir, o yüzden `HeroGlow` bir `DropShadowEffect` kaynağı
olarak duruyor. **Metne glow verilen tek rol hero'dur** (SKILL §2).

## 12. Gömülü yazı tipi

Pack URI yok, `avares` var. Atkinson Hyperlegible Next projeye gömülür, sistemde var
sayılmaz (SKILL §3):

```xml
<Application.Resources>
  <FontFamily x:Key="FontSans">avares://Uygulama/Assets/Fonts#Atkinson Hyperlegible Next</FontFamily>
</Application.Resources>
```

`Theme.axaml` şu an sistem adıyla yazıyor (`Atkinson Hyperlegible Next, Segoe UI`) —
yazı tipini gömdüğünde bu anahtarı `avares` biçimiyle **ezmen** gerekir, yoksa şablon
sessizce `Segoe UI`'a düşer. `.csproj` tarafı:

```xml
<ItemGroup>
  <AvaloniaResource Include="Assets/Fonts/*.ttf"/>
</ItemGroup>
```

## 13. Kapsam sınırı

`Theme.axaml` **`Theme.xaml`'daki her kuralın karşılığıdır, o kadar.** Avalonia'nın genel
kontrol teması (Fluent override: `TextBox`, `ComboBox`, `CheckBox`, `TabItem`, `ScrollBar`,
`ContextMenu`) yazılmadı. `desktop.md` §10'un sızıntı tablosu hâlâ borç ve teslimden önce
tek tek gezilir — "bu kutu Windows'a mı ait?" ölçütü Avalonia'da da geçerli.
