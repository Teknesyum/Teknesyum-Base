# UI konsey brifingi

İki konsey üyesi (fable + opus) bu dosyayı okur. Sentezi T0 yapar.

## Girdi

`docs/taramalar/ui-*.md` — on rapor, elli depo, on mercek. Hepsini oku.

Karşılaştırılan standart: `teknesyum/skills/teknesyum-ui/SKILL.md` (485 satır),
`references/{components,desktop,layout}.md`, `assets/theme.css`.

## Zaten düzeltildi — tekrar önerme

Tarama sırasında beş **uygulama hatası** bulundu ve T0 düzeltti. Bunlar tasarım kararı
değildi, kuralın kendi örneklerinde çiğnenmesiydi:

1. §5.3'teki ikinci süre ölçeği (`200/300/500ms`) kaldırıldı — tek kaynak §5.4.
2. `components.md`'deki beş `transition-all` açık özellik listesine indirildi.
3. İlerleme çubuğu `transition-[width] duration-500` → `scaleX` + `--tk-t-base`.
4. Palet tablosundaki `surface #0a0a0c` → `#08090a` (öteki üç dosya zaten öyleydi).
5. `theme.css` hareket azaltma bloğuna `transition-property: opacity` eklendi —
   eskiden bütün animasyonları koruyup 90 ms'ye kısaltıyordu, yani düzyazının tersi.

## Karara bağlanacaklar

Sıra önem sırası değil. Her biri için **evet/hayır + gerekçe + hangi bölüme** istiyorum.

### A · Palet kendi kontrast kuralını geçemiyor

Ölçüldü ve T0 bağımsız doğruladı. Siyah zeminde: `neon-pink` **6.44**, `neon-purple`
**4.57**; panel zemininde mor **4.30** (AA altı). Standardın §73'ü "7:1 altına inemez"
diyor ve §3 pembeye metin rolü veriyor.

Dahası: varsayılan kenarlık `neon-blue/30` = **2.06:1**, WCAG 1.4.11'in 3:1 eşiğinin
altında — ve paneli zeminden ayıran tek şey o. Mavi odak halkası mavi dolgulu buton
üstünde **1.00:1**; tek renkli halka bu palette çalışmıyor.

Seçenekler: rengi değiştir · kuralı gevşet · Radix gibi **rol kademelendir** (dolu zemin
için bir ton, metin için başka ton) · halka için `outline-offset` veya çift halka.

Marka kimliği neon; renkleri tanınmaz hale getirmek kayıp. Ama ölçüm ortada.

### B · "Geçiş tercih edilir, keyframe değil" yeniden yazılmalı mı

Tarama standardın **haklı** olduğunu ama **yanlış kelimeyle** yazdığını buldu.

Spring iptal edilebilir ve CSS geçişinden iyi: kapatılan panel konumunu **ve hızını**
koruyarak dönüyor (`motion-value.ts:48`, her yeni animasyona `velocity` veriliyor);
CSS geçişi konumu korur, hızı sıfırlar. Ama bu spring'den değil değer güdümlü
mimariden geliyor, ve `duration` ile tanımlanan spring hız devralmıyor.

Önerilen ayrım: **değer güdümlü / zaman çizelgesi güdümlü**.

### C · Birleşik geçiş reçetesi

Hiçbir büyük sistem süre ile eğriyi ayrı bırakmıyor. Primer `transition.hover/enter/exit`,
Carbon `surfaces` — süre + eğri + from/to tek token'da. Standart ikisini ayrı tutuyor.

Kademe sayısı sorun değil (dördü yeterli); eksik olan reçete.

### D · Çıkış süresi girişten kısa mı

Primer 200 / 300, gerekçesi token dosyasında yazılı. Standartta çıkış için ayrı kural yok.

### E · Style Dictionary

Tarayıcının kararı: **desen evet, bağımlılık hayır.** XAML yerleşik biçim değil
(PR #1714 açık, bakımcı yayınlamaya çekiniyor), 13 npm bağımlılığı + Node getiriyor.
Tek JSON kaynak + kendi üretici betiğimiz aynı işi görür.

Bugün token'lar dört dosyada elle senkron ve **senkron zaten bir kez kırılmıştı** (madde 4).

### F · Bileşen ölçü basamağı

§5.3 dar değil, **yanlış yerde dar**: verdiği sayılar erişilebilirlik tabanı ve pencere
kroması; buton/giriş yüksekliği basamağı hiç yok. Alanda ölçü tek kökten türetiliyor
(`--radius` × çarpan, `--mantine-scale`).

### G · Odak görünürlüğü

Standartta `:focus-visible` modalite ayrımı yok, `theme.css`'te `focus`/`outline` geçen
tek kural yok, `Theme.xaml`'da `FocusVisualStyle` yok (WPF varsayılanı noktalı siyah —
siyah zeminde görünmez), WCAG 2.4.11 (AA) hiç anılmıyor.

### H · Uygulama düzeyi kalıplar

Standart bileşen veriyor, **uygulama** vermiyor. Eksik bulunanlar: komut kaydı + paleti,
klavye kısayolu katmanı, pencere kromu kademelendirmesi.

Pencere kromu özellikle: alan ikili değil **üç kademeli** — Electron `titleBarOverlay`,
Tauri "Overlay" orta kademesi OS davranışını kaybettirmeden temalı çubuk veriyor.
Standart en pahalı kademeyi tek yol ilan ediyor.

Ayrıca imza bloğu (§4) bildirim yığınının sağ alt köşesiyle çakışıyor.

### I · Grafik

Standartta veri görselleştirme **hiç yok**. Kategorik seri paleti yok — beş çizgili
grafikte hangi renkler? Ayrı skill mi, §'e ek mi? Tarayıcının kararı raporda.

### J · Kalan çelişki

Pencere düğmesi tıklama alanı: `SKILL.md` §5.3 **42×30 DIP**, `desktop.md` §10
**52×36px**. 100% ölçekte ikisi aynı birim, yani gerçek çelişki. Hangisi doğru?

### K · İki uyarı

- `motion` kütüphanesinde `prefers-reduced-motion` **varsayılan kapalı**
  (`MotionConfigContext.tsx:72` → `reducedMotion: "never"`). Standart "hazır gelir"
  diyor; hook gelir, politika gelmez. Kurulum maddesine yazılmalı mı?
- **GSAP OSI lisanslı değil** (lisans alanı `null`, GreenSock standard no-charge,
  rakip kodsuz-animasyon aracı yasağı). §5.6'nın lisans cümlesi fazla kesin.

### L · WPF'in üç boşluğu — taramanın en sert bulgusu

**Mica/Acrylic standartta hiç geçmiyor.** Cam estetiği Windows'tan bedava geliyor
(`DwmSetWindowAttribute(38)`, beş koşullu kapı + `FallbackBrush`). Standart elle blur
yaptırıyor.

**`LayoutTransform` yasağı yok.** Standart yalnız `Width`/`Height` diyor. `RenderTransform`
düzenden sonra çizimde uygulanır — bedava. `LayoutTransform` düzenden **önce** uygulanır ve
üst ağacı yeniden ölçtürür — CSS `width` animasyonuyla aynı maliyet. Adında "transform"
geçtiği için sinsi.

**`UIElement.Effect` yasağı yok.** Neon glow'un WPF'teki kaynağı bu ve her karede pixel
shader çalıştırıyor — `box-shadow` yasağının birebir karşılığı, standartta yok.

**Hareket kapısı tek koşul değil:** `ClientAreaAnimation && RenderCapability.Tier > 0`
artı `StaticPropertyChanged` aboneliği. `HighContrast` da standartta hiç yok.

İyi haber: standardın `90/160/240` ölçeği WinUI'nin `83/167/250`'siyle **bağımsız olarak
örtüşüyor**. Süreler korunmalı.

### M · Neon efektlerin hangisi alınabilir — ölçüldü

**Alınabilir:** statik glow katmanı + hover'da yalnız `opacity` · statik gradyan kenarlık
(`mask-composite` ya da `p-px`) · doku statik `repeating-gradient` ile.

**Alınamaz:** animasyonlu `filter: blur` ve `box-shadow` (her karede raster/boyama) ·
`rAF` ile sürekli canvas ve WebGL arka plan (sonsuz CPU/GPU).

Yani "şık" ile "akıcı" çatışması çözülebilir: efekt **statik katman** olarak durur,
animasyonlanan tek şey opaklık olur.

**Lisans uyarısı:** react-bits MIT + Commons Clause — OSI değil, "ported version" yasağı
var; koddan değil fikirden alınır. Aceternity'nin açık deposu yok, ücretsiz katmanında
lisans metni yok — kod alınmaz.

## İstenen çıktı

Mesajla dönen öneri. Dosya yazma, kod yazma.

**Yapı:** her madde için `A` … `M` harfiyle, üç satırı geçmeyen karar. Sonda iki bölüm:

- **Sıralama** — hangi maddeler önce uygulanmalı, neden. Uygulama tek turda bitmeyecek.
- **Kaçırdığımız** — brifingde sorulmayan ama raporlarda duran, karar gerektiren şey.

## Ölçüt

Standardı **moda diye değiştirmek kayıptır.** Raporların "standardın haklı olduğu yerler"
bölümlerini ciddiye al; opaklık kararı gibi çoğunluktan sapıp doğru olan yerler var.

Aynı ölçüde: ölçülmüş bir kural ihlalini (A maddesi) marka gerekçesiyle geçiştirme.
Kural bizim, ölçüm bizim; ikisinden biri değişmeli.

En fazla 70 satır.
