# ui-erisilebilirlik — mercek: erişilebilirlik ve hareket

Tarama 2026-08-22. Depo verileri `gh api`, WCAG ölçütleri W3C Understanding sayfaları.
Kontrast oranları standardın §2 paletiyle yerel hesaplandı (WCAG 2.x relative luminance,
sRGB) — hiçbiri üçüncü taraftan alınmadı.

## 1 · Alanın bugün yaptığı

**adobe/react-spectrum** (Apache-2.0, push 2026-08-21, `react-aria-components@1.20.0` · 2026-07-31)

- `s2/src/Tabs.tsx:373-376` — sekme göstergesi `[translate,width,height]` geçişi, 200 ms;
  `@media (prefers-reduced-motion: reduce)` altında `transition: 'none'`. Kapatma **özellik
  bazında ve bileşen içinde**, genel `*` sıfırlamasıyla değil.
- `s2/src/Skeleton.tsx:32-47` — iskelet parıltısı `reduceMotion` doğruysa **hiç başlatılmaz**.
  CSS animasyonu değil Web Animations API; gerekçe kodda yazılı: tüm iskeletleri ortak
  `startTime` ile senkronlamak.
- `prefers-reduced-motion` geçen 22 dosya (kod araması).
- `useFocusRing` — halkayı **yalnız klavye modalitesinde** gösterir; fare/dokunmada
  `isFocusVisible` false. `:focus-visible` semantiği hook olarak veriliyor.

**tailwindlabs/headlessui** (MIT, push 2026-04-13, `@headlessui/react@v2.2.10` · 2026-04-07)

- `focus-trap/focus-trap.tsx` — kendi odak tuzağını yazmış, dış bağımlılık almamış.
- `prefers-reduced-motion` kodda **0 sonuç**, `focus-visible` 9 sonuç.

**radix-ui/primitives** (MIT, push 2026-08-08) — `prefers-reduced-motion` **0**,
`focus-visible` 4. İki depo da aynı ayrımı yapıyor: headless kütüphane hareketi tüketiciye
bırakır, **odağı bırakmaz**.

**focus-trap/focus-trap** (MIT, push 2026-08-21, v8.2.2 · 2026-06-22, 4 açık issue)

- `returnFocusOnDeactivate` (varsayılan açık): kapanışta odak açılıştan önceki öğeye döner.
- `fallbackFocus` yoksa ve içeride odaklanabilir öğe kalmazsa **hata fırlatır**.
- `checkCanFocusTrap` — README'nin cümlesi: "Animated dialogs have a small delay between
  when `onActivate` is called and when the focus trap is focusable." Animasyonlu diyalogda
  odak, geçiş bitene kadar promise ile bekletilir.

**WCAG 2.2** (w3c/wcag, W3C Document License, push 2026-08-21)

- **2.3.3 Animation from Interactions — AAA.** Belirleyici tanım: "Motion animation does not
  include changes of color, blurring, or opacity which do not change the perceived size,
  shape, or position of the element."
- **2.2.2 Pause Stop Hide — A.** Otomatik başlayan, 5 sn'yi aşan ve **başka içerikle paralel**
  hareket için durdurma yolu şart. Tek başına çalışan yükleme göstergesi muaf.
- **2.4.11 Focus Not Obscured (Minimum) — AA, 2.2 ile yeni.** Odaklanan bileşen yazar
  içeriğiyle tamamen gizlenemez; tipik ihlal yapışkan başlık.
- **2.4.13 Focus Appearance — AAA.** İki şart: 2 CSS px çevre alanı **ve odaklı/odaksız
  hâlin aynı piksellerinde 3:1 değişim**. 1.4.11 ise **bitişik renklere** karşı 3:1 ister.
- **C39** yalnız "disable motion" der, opaklık ikamesinden söz etmez. MDN örneği ise `scale`
  tabanlı `pulse`'ı opaklık tabanlı `dissolve`'a **düşürüyor**, kapatmıyor.

## 2 · Standardın kaçırdığı

**a) `:focus-visible` ayrımı yok.** §5.3 "odak halkası 2 DIP, 3:1, anında" diyor ama hangi
modalitede görüneceğini söylemiyor. `assets/theme.css` içinde `focus` veya `outline` geçen
**tek kural yok** (grep 0) — `.tk-btn` odak stili tanımsız. → **Evet.** Neon temada her fare
tıklamasında parlayan halka gürültü, klavyede hiç halka olmaması engel. **§5.3** + `theme.css`.

**b) Halka bitişiklik kuralı eksik.** Standart "zeminle 3:1" diyor; 1.4.11 **bitişik her
renge** 3:1 ister. neon-blue halka, neon-blue dolgulu buton üzerinde **1.00:1** — görünmez.
Alanın çözümü: `outline-offset` ile halkayı bileşen dışına almak, veya iç koyu + dış parlak
**çift halka**. → **Evet. §5.3.**

**c) Animasyonlu diyalogda odak yarışı yazılmamış.** §5.4 diyalog geçişi 240 ms, §5.3 halka
**anında** — aradaki 240 ms'de odağın nereye gideceği belirsiz. focus-trap bu iş için ayrı
seçenek taşıyor. → **Evet**, tek cümle yeter: odak geçiş bittikten sonra taşınır. **§5.4.**

**d) 2.4.11 (AA) hiç anılmıyor.** Standart 2.5.8, 2.5.7, 2.4.13'ü anıyor; 2.2 ile gelen ve
AA olan 2.4.11'i atlıyor. §8'deki "hiçbir öğe bir başkasının anahattını kapatmaz" çizim
sırasından söz ediyor, klavye odağından değil. Neon şerit başlık çubuğu bu ihlali kolay
üretir. → **Evet**, `scroll-margin` karşılığıyla. **§5.3.**

**e) WPF'te odak görseli teslim edilmemiş.** `assets/Theme.xaml` içinde `focus`, `Keyboard`,
`FocusVisualStyle` geçen **hiçbir satır yok** (grep 0). WPF varsayılanı **noktalı siyah**
dikdörtgendir, `#000000` zeminde görünmez. `references/desktop.md:183` kuralı yazıyor ama
asset taşımıyor. → **Evet**; kural eksiği değil, eksik varsayılan. **§8 / assets.**

**f) Klavye sözleşmesi masaüstünde karşılıksız.** §1 klavye gezinmesini Base UI'ye devrediyor;
kapsam dört platform, WPF/WinForms'ta Base UI yok. → **Kısmen**: dört maddelik asgari
sözleşme yeter (Tab sırası görsel sırayla aynı · `Esc` kapatır · diyalog kapanınca odak
açan öğeye döner · tuzaktan çıkış var). Tam APG uyarlaması gereksiz. **§5.3.**

## 3 · Standardın haklı olduğu yerler

**Opaklık kararı doğru — ve alanın çoğunluğundan daha doğru.**

"Konum ve ölçek kapanır, opaklık kalır" ayrımı WCAG'ın **tanımının kendisiyle** birebir
örtüşüyor: 2.3.3 opaklığı "motion animation" kapsamı **dışında** bırakıyor. Vestibüler
tetikleyici olan şey algılanan konum/boyut/şekil değişimidir, parlaklık değil. Opaklığı
kapatmak erişilebilirlik kazancı sağlamaz, yalnızca geri bildirimi siler.

Alanın yaygın "blanket reset" kalıbı `*` seçicisiyle tüm geçişleri sıfırlar ve opaklığı da
öldürür. Standardın ayrımı bu kalıptan **daha isabetli**, moda diye değiştirilmemeli.
Üç bağımsız destek: MDN örneği `scale`'i `dissolve`'a düşürüyor · `motion` belgesi
"replacing potentially motion-sickness inducing `x`/`y` animations with `opacity`" diyor
(opaklık kaldırılan değil, **ikame edilen** şey) · react-spectrum yalnız
`translate,width,height` geçişini kesiyor.

**Ama uygulama kuralı taşımıyor.** `theme.css:124-131` şunu yapıyor:
`transition-duration: var(--tk-t-instant) !important` — transform geçişi **kapanmıyor,
90 ms'ye kısalıyor**. 90 ms'lik bir `scale` veya 8 DIP kayma hâlâ harekettir. Kuralı fiilen
uygulayan tek satır `.tk-btn:hover, .tk-btn:active { transform: none; }`; o da yalnız
butonu kapsıyor, §5.4'ün "8 DIP kayma + opaklık" giriş animasyonunu değil.
**Prosa doğru, CSS yanlış** — `transform`/`translate`/`scale` için `transition-property`
düşürülmeli, `opacity` tokendan geçmeli.

**İkinci haklı yer: 360 ms üst sınırı.** focus-trap'in `checkCanFocusTrap` seçeneğinin
varlığı, uzun diyalog animasyonunun odak yönetimini bozduğunun kütüphane düzeyinde kabulü;
süreyi kısa tutmak estetik değil erişilebilirlik kararı.

**Üçüncü: 2.5.8 (24×24) ve 2.5.7 (sürükleme alternatifi) doğru seviyede anılmış**, ikisi de
gerçekten AA. Buna karşılık **2.4.13 AAA'dır**; standart onu AA taban gibi konumluyor —
hedefi yüksek tutmak sorun değil, seviye etiketi yanlış.

## 4 · Ölçü ve token — kontrast hesabı

| Renk | Hex | `#000000` | `#0a0a0c` | AA metin 4.5 | standardın 7:1 kuralı |
|---|---|---|---|---|---|
| text | `#ffffff` | 21.00:1 | 19.78:1 | geçer | geçer |
| neon-blue | `#00f3ff` | 15.26:1 | 14.38:1 | geçer | geçer |
| success | `#34d399` | 10.92:1 | 10.29:1 | geçer | geçer |
| neon-pink | `#ff00ea` | 6.44:1 | 6.07:1 | geçer | **kalır** |
| neon-purple | `#b026ff` | 4.57:1 | **4.30:1** | surface'ta **kalır** | **kalır** |
| disabled | `#71717a` | 4.35:1 | 4.09:1 | (1.4.3 muaf) | — |

neon-blue ve success rahat. **neon-pink 7:1'i geçemiyor** — §3 tablosu "Mono değer →
neon-pink" diyor, yani her sayısal değer kendi kuralının altında. **neon-purple panel
zemininde AA 4.5'in de altında (4.30:1)**; scrollbar thumb'ı ve ghost buton metni bu renk
(ghost metni kendi dolgusu üzerinde 4.32:1).

**Yüzey ve çerçeve — 1.4.11, eşik 3:1:**

| Öğe | Bileşim | Oran |
|---|---|---|
| `surface` vs `bg` | `#0a0a0c` / `#000000` | **1.06:1** |
| çerçeve `neon-blue/30` | `#00494c` / `#000000` | **2.06:1 — eşik altı** |
| çerçeve `/50` · `/60` | `#007a80` · `#009299` | 4.10:1 · 5.57:1 |

Panel zeminden 1.06:1 farkla ayrılıyorsa sınırı taşıyan tek şey çerçevedir, o da 2.06:1'de.
**§8'in varsayılan kenarlığı `/30` yerine `/50` olmalı**; `/30` yalnız dekoratif çerçeveye.

**Dolgulu buton üzerinde metin** (standart bu rengi hiç söylemiyor, `theme.css` `color: #000`
veriyor ve doğrusu bu):

| Dolgu | beyaz metin | siyah metin |
|---|---|---|
| neon-blue | **1.38:1** | 15.26:1 |
| neon-pink | 3.26:1 | 6.44:1 |
| neon-purple | 4.60:1 | 4.57:1 |
| success | 1.92:1 | 10.92:1 |

Asset doğru yapıyor, **SKILL.md kural olarak yazmıyor**: "text = okunması gereken HER şey =
`#ffffff`" düz okunursa mavi butona beyaz yazı → 1.38:1. §2'ye tek cümle gerekli.

**Odak halkası bitişiklik:** neon-blue halka / neon-blue dolgu **1.00:1** · neon-blue /
neon-pink dolgu 2.37:1 · beyaz / neon-blue dolgu 1.38:1 · neon-blue / siyah zemin 15.26:1 ·
neon-purple / siyah zemin 4.57:1. Tek renkli halka bu palette çalışmıyor — halka
`outline-offset` ile siyah zemine oturtulmalı veya iç `#000000` + dış `#00f3ff` çift halka.
Standardın "3:1" cümlesi bugün **ölçülemez**: neye karşı yazılmamış.

**Süre karşılaştırması:** sekme geçişi standart 240 ms / react-spectrum 200 ms (yakın) ·
reduced motion'da standart 90 ms'ye iner, react-spectrum `transition: 'none'` (standart
hareketi bitirmiyor) · iskelet standart döngü ≥1.4 s, react-spectrum hiç başlatmıyor.
Easing ham değerini react-spectrum'da bulamadım (`timingFunction: 'out'` takma ad).

**Ek çelişki (mercek dışı, aynı dosyada):** `theme.css:96` `box-shadow` geçişi tanımlıyor,
§5.4 bunu açıkça yasaklıyor. `.tk-btn:disabled { opacity: 0.3 }` beyaz metni `#4c4c4c`'ye
(2.45:1) düşürüyor; §2 "tek gri `#71717a`" diyor (4.35:1).

## 5 · Lisans

| Depo | Lisans | Son push | Son etiketli sürüm | Açık issue |
|---|---|---|---|---|
| adobe/react-spectrum | **Apache-2.0** | 2026-08-21 | `react-aria-components@1.20.0` · 2026-07-31 | 584 |
| tailwindlabs/headlessui | **MIT** | 2026-04-13 | `@headlessui/react@v2.2.10` · 2026-04-07 | 109 |
| radix-ui/primitives | **MIT** | 2026-08-08 | `releases/latest` **404** — paket başına etiket | 344 |
| focus-trap/focus-trap | **MIT** | 2026-08-21 | v8.2.2 · 2026-06-22 | 4 |
| w3c/wcag | `NOASSERTION` → **W3C Document License** | 2026-08-21 | yok | 516 |

MIT/Apache-2.0 dışında olan tek şey WCAG metninin kendisi: W3C Document License türev
çalışmaya izin vermez, ölçüte **numarayla atıf** yapılır, normatif cümle gövdeye kopyalanmaz.
headlessui ~4 aydır push almamış — bağımlılık kurulacaksa not edilmeli.

Kod alınmadı. Alınan şey desen: `checkCanFocusTrap` yarış çözümü · `focus-visible` modalite
ayrımı · özellik bazlı reduced-motion kapatma · offset/çift halka.

## Kaynaklar

- `gh api repos/{adobe/react-spectrum, tailwindlabs/headlessui, radix-ui/primitives,
  focus-trap/focus-trap, w3c/wcag}` + `/releases/latest` + `search/code` — 2026-08-22
- `s2/src/Tabs.tsx`, `s2/src/Skeleton.tsx` (contents API) · focus-trap README options
- W3C WCAG 2.2 Understanding 2.3.3 / 2.2.2 / 2.4.11 / 2.4.13 · Technique C39
- MDN `@media/prefers-reduced-motion` · `motion.dev/docs/react-use-reduced-motion`
- Yerel: `teknesyum-ui/SKILL.md` §2 §3 §5.3 §5.4 §8 · `assets/theme.css` ·
  `assets/Theme.xaml` · `references/desktop.md:183`
