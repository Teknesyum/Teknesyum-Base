# ui-wpf — WPF/WinForms merceği

Taranan: `lepoco/wpfui`, `MaterialDesignInXAML/MaterialDesignInXamlToolkit`,
`HandyOrg/HandyControl`, `Kinnara/ModernWpf`, `microsoft/microsoft-ui-xaml` (WinUI 3).
`microsoft/WindowsAppSDK` deposunda backdrop/animasyon API'si yok — o yüzey
`microsoft-ui-xaml`'da, oraya baktım. `dotnet/maui` kapsam dışı bırakıldı (Windows yüzeyi
zaten WinUI 3).

## 1 · Alanın bugün yaptığı

**Cam efekti işletim sisteminden alınıyor, elle blur yok.** Dördü de aynı Win32 çağrısını
sarıyor: `DwmSetWindowAttribute(hwnd, DWMWA_SYSTEMBACKDROP_TYPE=38, …)`, değerler
`0=Auto 1=None 2=MainWindow(Mica) 3=TransientWindow(Acrylic)` — ModernWpf
`ModernWpf/Window/WindowBackdrop.cs` `DwmWindowBackdropPlatform`. wpfui aynı şeyi
`WindowBackdropType {None, Auto, Mica, Acrylic, Tabbed}` ile veriyor
(`src/Wpf.Ui/Controls/Window/WindowBackdropType.cs`).

**Backdrop'un görünmesi için WPF'in opak yüzeyini delmek gerekiyor.** wpfui
`WindowBackdrop.RemoveBackground` iki şeyi birden yapıyor: `Window.Background = Transparent`
**ve** `HwndSource.CompositionTarget.BackgroundColor = Colors.Transparent`. İkincisi olmadan
DWM efekti çizilir, WPF'in opak kompozisyon yüzeyi üstünü kapatır. WinUI 3 spesifikasyonu
aynı kısıtı yazıyor: "If all of the content is fully opaque, this backdrop will have no
visible effect" (`specs/xaml-backdrop-api.md`).

**Backdrop kapılı uygulanıyor, tek satır değil.** ModernWpf `BackdropState.Apply()` beş
koşulu birlikte arıyor: Windows 11 build 22621+, `DwmIsCompositionEnabled`,
`!SystemParameters.HighContrast`, `!window.AllowsTransparency`, DWM çağrısının başarısı.
Biri tutmazsa `EffectiveKind = None` yazılıp `FallbackBrush` → `WindowBackground` kaynağı →
`SystemColors.WindowBrush` sırasıyla düz renge düşüyor. `WM_SETTINGCHANGE`,
`WM_THEMECHANGED`, `WM_DWMCOMPOSITIONCHANGED` ve `SystemParameters.StaticPropertyChanged`
dinlenip yeniden uygulanıyor — kullanıcı çalışırken temayı değiştirebiliyor.

**Hareket azaltma ayarı ikiye ayrılıyor.** ModernWpf tek ifade:
`SystemParameters.ClientAreaAnimation && RenderCapability.Tier > 0`
(`ModernWpf/Helpers/Helper.cs`, `ModernWpf.Controls/Common/SharedHelpers.cs`). WinUI 3 aynı
işi `UISettings().AnimationsEnabled()` ile yapıyor (`controls/dev/DllHost/SharedHelpers.cpp`)
ve `VisualStateGroupCollection` içinde merkezî kullanıyor — geçişler çerçevede kesiliyor,
her denetimde ayrı ayrı değil. wpfui yalnız donanıma bakıyor:
`RenderCapability.Tier >> 16 >= 1` (`src/Wpf.Ui/Hardware/HardwareAcceleration.cs`).

**Doğruladım (repo-scoped code search):** `wpfui` ve `MaterialDesignInXamlToolkit`
depolarında `ClientAreaAnimation` **hiç geçmiyor** (0 sonuç). `HandyControl`'de yalnız
`Tools/Interop/InteropValues.cs` içinde SPI enum sabiti, davranışta kullanılmıyor. Üç
popüler kütüphaneden üçü erişilebilirlik hareket ayarını okumuyor.

**GPU'ya alma açık ve geçici.** ModernWpf `NavigationAnimation.Begin()` öğeye
`CacheMode = BitmapCache` atıyor, `Stop()` `InvalidateProperty(CacheModeProperty)` ile geri
alıyor; `BitmapCache` DPI farkındalıklı kuruluyor (`VisualTreeHelper.GetDpi(el).PixelsPerDip`).
`Stop()` ayrıca `RenderTransform` ve `RenderTransformOrigin`'i temizliyor. Web'deki
`will-change: transform` ekle–oynat–kaldır deseninin birebir karşılığı.

## 2 · Standardın kaçırdığı

**a) Mica/Acrylic standartta hiç geçmiyor.** `mica|acrylic|DwmSetWindowAttribute` araması
`teknesyum-ui/` altında sıfır sonuç; web tarafında `backdrop-blur-xl` var (`SKILL.md:209`),
WPF karşılığı yok. **Alınmalı** — cam Windows'ta ücretsiz, GPU'da ve sistem ayarlarına
saygılı geliyor; `DropShadowEffect` ile taklidi her karede pixel shader çalıştırır.
Girer: `references/desktop.md` §8 ve §10. **Uyarı:** Mica duvar kâğıdını örnekleyip tint
eder, sabit `#08090a` neon yüzeyle çelişir; ancak pencere kökünde işe yarar ve panel
opaklığı `/95`'ten aşağı çekilmezse hiç görünmez.

**b) `RenderTransform`/`LayoutTransform` ayrımı yok.** `SKILL.md:329` yalnız "`Storyboard`
`RenderTransform` ve `Opacity` üzerinde çalışır, `Width`/`Height` üzerinde değil" diyor —
doğru ama eksik. **Alınmalı**, §5.4. Ayrıntı §A2.

**c) Giriş ve çıkış süresi ayrılmalı.** ModernWpf/WinUI `ExitDuration = 150ms`,
`EnterDuration = 300ms` (`Media/Animation/NavigationTransitionInfo.cs:42-43`), iki ayrı eğri.
Standartta iki eğri var ama **tek süre ölçeği** — panel açılırken de kapanırken de
`--tk-t-base`. **Alınmalı**, §5.4: çıkış girişin ~yarısı. Gerekçe teknik, moda değil —
kullanıcı kapatmaya karar vermiştir, beklemesi gerekmez.

**d) Hareket kapısı tek koşul değil.** Standart `SystemParameters.ClientAreaAnimation`
diyor (`SKILL.md:285`). ModernWpf buna `RenderCapability.Tier > 0` ekliyor: RDP, sanal
makine ve sürücüsüz makinede WPF yazılım oluşturmaya düşer, `RenderTransform` bile CPU'da
çizilir. Ayrıca ayar çalışma anında değişir — ModernWpf `StaticPropertyChanged` dinliyor,
standart tek seferlik okuma ima ediyor. **Alınmalı**, §5.4.

**e) OS'un pencere kenarı API'leri kullanılmıyor.** wpfui `DWMWA_WINDOW_CORNER_PREFERENCE`
(33) ve `DWMWA_BORDER_COLOR` (34) çağırıyor (`src/Wpf.Ui/Interop/UnsafeNativeMethods.cs`).
Standart §10 köşe yuvarlatmayı elle kırpmayı ve her boyutlandırmada köşeyi yeniden
hesaplamayı söylüyor — Windows 11'de bu bir DWM çağrısı. **Alınmalı ama koşullu:**
Windows 10 ve altında API yok, elle kırpma yedek kalmalı. `DWMWA_CAPTION_COLOR`/`TEXT_COLOR`
(35/36) taradığım depolarda **kullanılmıyor** — var olduğunu biliyorum, bu depolardan
**doğrulanamadı**.

## 3 · Standardın haklı olduğu yerler

**Süre ölçeği neredeyse birebir tutuyor — dokunma.** `ModernWpf/Styles/Common.xaml:7-10`:
`ControlFasterAnimationDuration 00:00:00.083`, `ControlFast… 00:00:00.167`,
`ControlNormal… 00:00:00.250`. Standardın 90/160/240'ı bunların pratik aynısı. Bağımsız iki
kaynağın aynı sayıya varması ölçeğin doğruluğunun kanıtı; "modernleştirme" adına oynatmak
kayıptır.

**8 DIP giriş kayması tavanı doğru.** Alanın değerleri yüksek: MaterialDesign
`TransitionEffect.cs` `CreateSlide(-300, 0)` — **300 DIP**; ModernWpf `Entrance…`
**200 DIP**; wpfui `FadeInWithSlideTransition` `From = 30`. Ama üçü de **sayfa/görünüm**
geçişi. Standardın tavanı **bileşen** girişi için konmuş ve orada haklı — bileşen düzeyinde
200 DIP uçuş her veri tazelemesinde arayüzü sallar. §5.4'te "giriş" satırının sayfa geçişini
kapsamadığını netleştirmek yeter; sayıyı büyütmek gerekmiyor.

**Kademeyi 6 elemanla sınırlamak alanda yok ve standart haklı.** MaterialDesign
`IndexedItemOffsetMultiplierExtension` gecikmeyi doğrudan indeksle çarpıyor
(`new TimeSpan(Unit.Ticks * multiplier)`), **üst sınır yok** — 200 satırlık listede son satır
dakikalarca sonra gelir.

**"Süs değil geri bildirim" ilkesi korunmalı.** wpfui `NavigationView.TransitionDuration`
varsayılanı `200` ms, geçiş **her gezinmede** oynuyor ve hiçbir yumuşatma yok
(`TransitionAnimationProvider.cs` içinde `Easing` kelimesi geçmiyor — düz, lineer
`DoubleAnimation`). Alanın "her yere animasyon" refleksi standardın ölçüsünden geride.

## 4 · Ölçü ve token — yan yana

| | standart | ModernWpf / WinUI | wpfui | MaterialDesign |
|---|---|---|---|---|
| mikro | `--tk-t-instant` 90ms | 83ms `ControlFaster…` | — | — |
| hızlı | `--tk-t-fast` 160ms | 167ms `ControlFast…` | — | — |
| temel | `--tk-t-base` 240ms | 250ms `ControlNormal…` | 200ms (nav varsayılanı) | 400ms `TransitionEffect.Duration` |
| yavaş | `--tk-t-slow` 360ms | 300ms enter / 150ms exit / 500ms `MaxMoveDuration` | — | 500ms `SlideWipe.Duration` |
| giren eğri | `cubic-bezier(0.2,0,0,1)` | `KeySpline(0.1,0.9,0.2,1)` | **yok (lineer)** | `SineEase` |
| çıkan eğri | `cubic-bezier(0.4,0,1,1)` | `KeySpline(0.7,0,1,0.5)` | **yok** | `SineEase` |
| genel eğri | — | `ControlFastOutSlowInKeySpline` = `0,0,0,1` | — | — |
| giriş kayması | 8 DIP | 200 DIP (sayfa) | 30 DIP | 300 DIP |
| ölçek | hover ≤1.02 | `DrillIn` 1.15→1, geri 0.9→1 | — | — |
| liste kademesi | 40ms, ≤6 eleman | bulamadım | yok | indeks × birim, **sınırsız** |

## 5 · Lisans ve depo sağlığı

Altısı da **MIT**, OSI onaylı (`gh api repos/<owner>/<repo> --jq .license.spdx_id`,
2026-08-22). MIT dışı yok. Alınacak olan zaten kod değil desen — DWM sabitleri (38/33/34) ve
`SystemParameters`/`RenderCapability` Windows'un kendisine ait, kütüphanelere değil.

| depo | ⭐ | son push | son etiketli sürüm | açık issue |
|---|---|---|---|---|
| lepoco/wpfui | 9607 | 2026-06-27 | 4.3.0 (2026-05-04) | 452 |
| MaterialDesignInXAML | 16241 | 2026-08-22 | v5.3.2 (2026-05-01) | 148 |
| HandyOrg/HandyControl | 7165 | 2026-08-11 | v3.5.0 (**2024-02-07**) | 327 |
| Kinnara/ModernWpf | 4955 | 2026-08-19 | v0.9.6 (2022) · v1.0.0-preview.7 (2026-08-11) | 2 |
| microsoft/WindowsAppSDK | 4662 | 2026-08-21 | v1.8.11 (2026-08-13) | 402 |

Şüpheli: HandyControl'ün son **kararlı** sürümü iki buçuk yıllık (`v3.6.0-rc3` etiketi var,
yayımlanmamış). ModernWpf dört yıldır 1.0 öncesi preview'da; 2 açık issue düşük görünüyor,
kapatma politikası **doğrulanamadı**. wpfui'nin 452 açık issue'su yıldıza göre yüksek.
wpfui bağımlılık yüzeyi: `Microsoft.Windows.CsWin32` kaynak üreteci (derleme zamanı, çalışma
zamanı yükü yok) + `net462`'de `System.Memory`.

## A · Sorulan üç sorunun cevabı

**A1 — WPF'te `opacity`/`transform` kısıtının karşılığı.**
GPU'da, düzen hesabı olmadan: `UIElement.Opacity`, `RenderTransform`
(`TranslateTransform.X/Y`, `ScaleTransform.ScaleX/Y`, `RotateTransform.Angle`),
`RenderTransformOrigin`, `Visibility=Hidden`.
Düzeni yeniden hesaplatanlar (`Measure`/`Arrange` her karede, UI iş parçacığında):
`Width`, `Height`, `Margin`, `Padding`, `LayoutTransform`, `FontSize`,
`Row/ColumnDefinition` uzunlukları, `Canvas.Left/Top`, `Visibility=Collapsed`.

Web'de karşılığı olmayan üçüncü sınıf: **`UIElement.Effect`**
(`DropShadowEffect.BlurRadius/Color/Opacity`). Düzeni bozmaz ama her karede pixel shader
çalıştırır ve alt ağacın önbelleğini geçersiz kılar. Neon glow tam buradan geliyor
(`assets/Theme.xaml:58,92`) — yani **standardın `box-shadow` animasyonu yasağının WPF
karşılığı `Effect` özelliklerinin animasyonu yasağıdır**, bu bugün yazmıyor. Glow
değişecekse iki `Border` üst üste konup aralarında `Opacity` geçirilir.

**A2 — `RenderTransform`/`LayoutTransform` farkı yazmalı mı? Evet.**
`RenderTransform` düzen bittikten **sonra**, çizim aşamasında uygulanır; düzen kutusu
değişmez, kardeşler kıpırdamaz, `Measure`/`Arrange` çalışmaz. `LayoutTransform` düzen
**öncesi** uygulanır; değişince öğe ve üst ağacı yeniden ölçülür — animasyonu CSS'te `width`
animasyonlamakla aynı maliyette. §5.4'e tek cümle: **"WPF'te `LayoutTransform`
animasyonlanmaz; ölçek ve kayma `RenderTransform` üzerinden verilir."** Bugün standart yalnız
`Width`/`Height`'ı sayıyor; `LayoutTransform` daha sinsi çünkü adında "transform" geçiyor.
ModernWpf `LayoutTransform`'u yalnız `Styles/ProgressBar.xaml` ve bir testte kullanıyor,
animasyonda hiç.

§5.4'e girmesi gereken WPF'e özgü iki şey daha: (1) animasyon süresince
`CacheMode = BitmapCache(dpi.PixelsPerDip)`, bitince `InvalidateProperty(CacheModeProperty)` —
kalıcı bırakılırsa metin bulanıklaşır; (2) durdurunca `RenderTransform` ve
`RenderTransformOrigin` de temizlenir, yoksa bir sonraki tur kalıntının üstüne biner.

**Not — "Storyboard'lar `Freeze()` edilir" maddesi (`SKILL.md:331`) fazla geniş.** Taradığım
depolarda `Freeze()` **Freezable yardımcılara** uygulanıyor (`NavigationTransitionInfo.cs:16,19`
`KeySpline`; `NavigationAnimation.cs:13` `BitmapCache`), Storyboard'un kendisine değil — ada
göre hedeflenen (`Storyboard.SetTargetName`) bir Storyboard zaten donmaz. Madde "animasyon
sabitleri (`KeySpline`, `BitmapCache`, fırçalar) `Freeze()` edilir" diye daraltılmalı.

**A3 — Hareket azaltmayı okumanın daha iyi yolu var mı? Evet, üç katmanlı.**
1. `SystemParameters.ClientAreaAnimation` — kullanıcı ayarı (SPI_GETCLIENTAREAANIMATION).
2. `&& RenderCapability.Tier > 0` — makine gerçekten GPU'da mı çiziyor (ModernWpf deseni);
   wpfui daha katı eşik kullanıyor: `RenderCapability.Tier >> 16 >= 1`.
3. `SystemParameters.StaticPropertyChanged` aboneliği — ayar çalışma anında değişir
   (ModernWpf `BackdropState.OnSystemParametersChanged`).

Ayrıca `SystemParameters.HighContrast` ayrı okunmalı: yüksek karşıtlıkta ModernWpf backdrop'u
tamamen kapatıp düz renge düşüyor. Standart yüksek karşıtlıktan hiç söz etmiyor.
WinRT `UISettings.AnimationsEnabled` aynı ayarı okur ve `AnimationsEnabledChanged` olayı
verir, ama WPF'ten kullanmak WinRT projeksiyonu bağımlılığı getirir — `SystemParameters`
aynı bilgiyi veriyor, ek bağımlılık gereksiz.

## Kaynaklar

- `gh api repos/{lepoco/wpfui, MaterialDesignInXAML/MaterialDesignInXamlToolkit,
  HandyOrg/HandyControl, Kinnara/ModernWpf, microsoft/WindowsAppSDK, dotnet/maui}` +
  `/releases/latest`, `/releases`, `/tags` — 2026-08-22
- `Kinnara/ModernWpf@master`: `ModernWpf/Window/WindowBackdrop.cs`, `Helpers/Helper.cs`,
  `ModernWpf.Controls/Common/SharedHelpers.cs`, `Media/Animation/{NavigationTransitionInfo,
  NavigationAnimation,EntranceNavigationTransitionInfo,SlideNavigationTransitionInfo,
  DrillInNavigationTransitionInfo}.cs`, `Styles/Common.xaml`
- `lepoco/wpfui@main`: `Controls/Window/{WindowBackdrop,WindowBackdropType}.cs`,
  `Animations/TransitionAnimationProvider.cs`, `Hardware/HardwareAcceleration.cs`,
  `Controls/NavigationView/NavigationView.Properties.cs`,
  `Interop/UnsafeNativeMethods.cs`, `Wpf.Ui.csproj`
- `MaterialDesignInXamlToolkit@master`: `src/MaterialDesignThemes.Wpf/Transitions/
  {TransitionEffect,SlideWipe,IndexedItemOffsetMultiplierExtension}.cs`
- `HandyOrg/HandyControl@master`: `src/Shared/HandyControl_Shared/Tools/Interop/InteropValues.cs`
- `microsoft/microsoft-ui-xaml@main`: `controls/dev/DllHost/SharedHelpers.cpp`,
  `controls/dev/Materials/MicaBackdrop/MicaBackdrop.idl`, `specs/xaml-backdrop-api.md`
- GitHub code search (repo-scoped): `ClientAreaAnimation` → wpfui 0, MaterialDesign 0,
  HandyControl 2 (yalnız interop sabiti), ModernWpf 3 (davranışta)
- Standart: `teknesyum/skills/teknesyum-ui/SKILL.md` §5.4, `references/desktop.md` §7–§10
