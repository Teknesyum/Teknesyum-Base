# ui-erisilebilirlik — mercek: erişilebilirlik ve hareket

Tarama: 2026-08-22. Depolar `gh api` ile, WCAG ölçütleri W3C Understanding sayfalarından
birincil kaynak olarak okundu. Kontrast oranları standardın §2 paletiyle fiilen hesaplandı
(sRGB relative luminance, WCAG 2.x formülü).

---

## 1 · Alanın bugün yaptığı

**adobe/react-spectrum** (Apache-2.0, push 2026-08-21, son etiket `react-aria-components@1.20.0`
· 2026-07-31, 15.811 yıldız, 584 açık issue)

- `packages/@react-spectrum/s2/src/Tabs.tsx:373-376` — sekme göstergesi normalde
  `[translate,width,height]` geçişi kullanır, `@media (prefers-reduced-motion: reduce)`
  altında `transition: 'none'`. Süre 200 ms, easing `out`. Kapatma **özellik bazında** ve
  bileşen içinde, genel bir `*` sıfırlamasıyla değil.
- `packages/@react-spectrum/s2/src/Skeleton.tsx:32-47` — iskelet parıltısı `useMediaQuery`
  ile okunan `reduceMotion` doğruysa **hiç başlatılmaz**. Ayrıca CSS animasyonu değil Web
  Animations API kullanılıyor; gerekçe kodda yazılı: sayfadaki tüm iskeletleri ortak
  `startTime` ile senkronlamak.
- Depo genelinde `prefers-reduced-motion` geçen 22 dosya var (`gh search code`).
- `useFocusRing` — odak halkasını **yalnız klavye modalitesinde** gösterir; fare/dokunma
  ile odaklanınca `isFocusVisible` false döner. Yani `:focus` değil, `:focus-visible`
  semantiği bir hook olarak veriliyor.

**tailwindlabs/headlessui** (MIT, push 2026-04-13, son etiket `@headlessui/react@v2.2.10`
· 2026-04-07, 28.716 yıldız, 109 açık issue)

- `packages/@headlessui-react/src/components/focus-trap/focus-trap.tsx` — kendi odak
  tuzağını yazmış, dış bağımlılık almamış.
- `prefers-reduced-motion` deponun kodunda **hiç geçmiyor** (kod araması: 0 sonuç).
  `focus-visible` 9 yerde geçiyor. Yorum: headless kütüphane hareketi tüketiciye bırakır,
  odağı bırakmaz.

**radix-ui/primitives** (MIT, push 2026-08-08, 19.196 yıldız, 344 açık issue;
`releases/latest` 404 — paket başına etiketliyor, tek sürüm numarası yok)

- `prefers-reduced-motion`: **0 sonuç**. `focus-visible`: 4 sonuç. Aynı ayrım.

**focus-trap/focus-trap** (MIT, push 2026-08-21, v8.2.2 · 2026-06-22, 1.564 yıldız,
**4 açık issue**) — README'den çıkan sınırlar:

- `returnFocusOnDeactivate` (varsayılan açık): tuzak kapanınca odak **açılıştan önceki
  öğeye** döner. Dışarı tıklanarak kapanırsa bile tıklanan öğeye değil, önceki öğeye döner.
- `initialFocus`, `fallbackFocus`: içinde odaklanabilir öğe yoksa **hata fırlatır**;
  `fallbackFocus` verilmemişse tuzak geçersiz sayılır.
- `checkCanFocusTrap`: README'nin kendi cümlesi — "Animated dialogs have a small delay
  between when `onActivate` is called and when the focus trap is focusable." Animasyonlu
  diyalogda odak, geçiş bitene kadar bekletilir; söz verilen bir promise ile senkronlanır.
- `escapeDeactivates`, `allowOutsideClick`, `delayInitialFocus` ayrı ayrı düğme.

**WCAG 2.2** (w3c/wcag, W3C Document License — `gh api` `NOASSERTION`, push 2026-08-21)

- **2.3.3 Animation from Interactions — Level AAA.** Tanımı belirleyici:
  "Motion animation does not include changes of color, blurring, or opacity which do not
  change the perceived size, shape, or position of the element."
- **2.2.2 Pause, Stop, Hide — Level A.** Otomatik başlayan, 5 saniyeden uzun süren ve
  **başka içerikle paralel sunulan** hareket için durdurma yolu şart. Tek başına çalışan
  yükleme göstergesi için mekanizma gerekmiyor (Understanding sayfasındaki preloader örneği).
- **2.4.11 Focus Not Obscured (Minimum) — Level AA, WCAG 2.2 ile yeni.** Odaklanan bileşen
  yazar içeriğiyle **tamamen** gizlenemez; tipik ihlal yapışkan başlık/altlık ve çerez şeridi.
- **2.4.13 Focus Appearance — Level AAA.** İki ayrı şart: (a) odaksız hâlin 2 CSS piksellik
  çevresi kadar alan, (b) **odaklı ve odaksız hâlin aynı piksellerinde 3:1 değişim**.
  1.4.11 Non-text Contrast ise **bitişik renklere** karşı 3:1 ister. İkisi aynı ölçüm değil.
- **C39** tekniği yalnızca "disable motion" der; çapraz geçiş/opaklık ikamesinden söz etmez.
- MDN `prefers-reduced-motion` sayfasının örneği `scale` tabanlı `pulse` animasyonunu
  opaklık tabanlı `dissolve`'a düşürüyor ve "tone down the animation" diyor — sıfırlamıyor.

---

## 2 · Standardın kaçırdığı

**a) `:focus-visible` ayrımı yok — halka fare kullanıcısına da gösteriliyor.**
Nerede gördüm: react-aria `useFocusRing`, headlessui'de 9, radix'te 4 `focus-visible`
kullanımı. Standart bugün §5.3'te "odak halkası 2 DIP, 3:1, anında" diyor ama **hangi
modalitede** görüneceğini söylemiyor; `assets/theme.css` içinde `focus` veya `outline`
geçen **tek bir kural yok** (grep: 0). `.tk-btn` odak stili tanımsız → tarayıcı varsayılanı
kalır, `outline: none` yazan ilk kişi de erişilebilirliği sessizce siler.
**Alınmalı: evet** — neon temada her fare tıklamasında parlayan halka görsel gürültü,
klavye kullanıcısında ise halkanın hiç olmaması engel. Girer: **§5.3** (kural) + `theme.css`
(uygulama).

**b) Odak halkası bitişiklik kuralı eksik — dolgulu buton üzerinde halka kayboluyor.**
Standart "zeminle 3:1" diyor; WCAG 1.4.11 **bitişik her renge** karşı 3:1 ister. Hesap:
neon-blue halka, neon-blue dolgulu birincil butonun üzerinde **1.00:1** — görünmez.
Alanın çözümü tek tip: `outline-offset` ile halkayı bileşenin dışına almak ya da
iç koyu + dış parlak **çift halka**. **Alınmalı: evet.** Girer: **§5.3**.

**c) Animasyonlu diyalogda odak yarışı düzenlenmemiş.**
focus-trap'ın `checkCanFocusTrap` seçeneği tam bu iş için var. Standart §5.4'te diyalog
geçişini 240 ms (`--tk-t-base`) diyor, §5.3'te odak halkasının **anında** belireceğini
diyor — ikisi arasındaki 240 ms'lik boşlukta odağın nereye gideceği yazılı değil.
**Alınmalı: evet**, tek cümlelik kural yeter: odak geçiş bittikten sonra taşınır, geçiş
sırasında değil. Girer: **§5.4**.

**d) WCAG 2.4.11 Focus Not Obscured (AA) hiç anılmıyor.**
Standart 2.5.8, 2.5.7 ve 2.4.13'ü anıyor; 2.2 ile gelen ve **AA** olan 2.4.11'i atlıyor.
§8'deki "hiçbir öğe bir başkasının anahattını kapatmaz" yakın ama farklı bir şey söylüyor
(çizim sırası, klavye odağı değil). Yapışkan başlık + neon şerit başlık çubuğu bu ihlali
kolayca üretir. **Alınmalı: evet**, `scroll-margin`/`scroll-padding` karşılığıyla.
Girer: **§5.3**.

**e) WPF tarafında odak görseli yok.**
`assets/Theme.xaml` içinde `focus`, `Keyboard`, `FocusVisualStyle` geçen **hiçbir satır
yok** (grep: 0). WPF'in varsayılan `FocusVisualStyle`'ı **noktalı siyah** dikdörtgendir;
`#000000` zeminde görünmez. `references/desktop.md:183` "noktalı native çerçeve yerine
neon glow — kaldırma, değiştir" diyor, yani kural var ama **asset onu taşımıyor**.
**Alınmalı: evet** — bu bir kural eksiği değil, teslim edilmemiş varsayılan. Girer:
**§8 / assets**.

**f) Klavye gezinme sözleşmesi React'e devredilmiş, masaüstünde karşılıksız.**
§1 "davranış onların: Base UI odak yönetimi, klavye gezinmesi" diyor. Kapsam dört platform;
WPF/WinForms'ta Base UI yok. Roving tabindex, `Esc` ile kapanma, odak geri dönüşü, atlama
bağlantısı — hiçbiri yazılı değil. **Alınmalı: kısmen** — dört maddelik asgari klavye
sözleşmesi (Tab sırası görsel sırayla aynı · `Esc` kapatır · diyalog kapanınca odak
açan öğeye döner · tuzaktan çıkış yolu var) yeterli, tam bir APG uyarlaması gereksiz.
Girer: **§5.3**.

---

## 3 · Standardın haklı olduğu yerler

**Opaklık kararı doğru — ve alanın çoğunluğundan daha doğru.**

Sorulan soru buydu; cevap net: standardın "konum ve ölçek kapanır, opaklık kalır" ayrımı
WCAG'ın **tanımının kendisiyle** birebir örtüşüyor. 2.3.3'ün normatif tanımı opaklığı
"motion animation" kapsamı **dışında** bırakıyor — çünkü vestibüler tetikleyici olan şey
algılanan konum/boyut/şekil değişimidir, parlaklık değil. Opaklığı kapatmak erişilebilirlik
kazancı sağlamaz, yalnızca geri bildirimi siler.

Alanın yaygın pratiği bu ayrımı yapmıyor: dolaşan "blanket reset" kalıbı `*` seçicisiyle
tüm `transition-duration`'ı sıfırlar ve opaklığı da öldürür. Standardın ayrımı bu kalıptan
**daha isabetli**; moda diye değiştirilmemeli.

Destekleyen ikinci kaynak: MDN'in resmî örneği `scale` animasyonunu **`dissolve`
(opaklık) animasyonuna düşürüyor**, kapatmıyor. Üçüncüsü: `motion` kütüphanesinin
`useReducedMotion` belgesi "replacing potentially motion-sickness inducing `x`/`y`
animations with `opacity`" diyor — opaklık burada kaldırılan şey değil, **ikame edilen**
şey. Dördüncüsü: react-spectrum Tabs.tsx yalnız `translate,width,height` geçişini kesiyor.

**Ama uygulaması kuralı taşımıyor.** `assets/theme.css:124-131` şunu yapıyor:
`transition-duration: var(--tk-t-instant) !important` — yani transform geçişi
**kapanmıyor, 90 ms'ye kısalıyor**. 90 ms'lik bir `scale` veya 8 DIP kayma hâlâ harekettir.
Kuralı fiilen uygulayan tek satır `.tk-btn:hover, .tk-btn:active { transform: none; }`;
o da yalnızca butonu kapsıyor, §5.4'ün "8 DIP kayma + opaklık" giriş animasyonunu değil.
**Prosa doğru, CSS yanlış.** Doğrusu: `transform`/`translate`/`scale` için
`transition-property`'yi düşürmek, `opacity`'yi tokendan geçirmek.

**İkinci haklı yer: 360 ms üst sınırı ve "geçiş > keyframe".** focus-trap'in
`checkCanFocusTrap` seçeneğinin varlığı, uzun diyalog animasyonunun odak yönetimini
bozduğunun kütüphane düzeyinde kabulüdür — süreyi kısa tutmak erişilebilirlik kararıdır,
estetik değil.

**Üçüncü: 2.5.8 (24×24) ve 2.5.7 (sürükleme alternatifi) doğru seviyede anılmış** —
ikisi de gerçekten Level AA. Buna karşılık **2.4.13 AAA'dır**, standart onu AA taban gibi
konumluyor; hedefi yüksek tutmak sorun değil ama seviye etiketi yanlış.

---

## 4 · Ölçü ve token — kontrast hesabı

Yöntem: WCAG 2.x relative luminance, sRGB. Zemin `bg #000000` ve `surface #0a0a0c`.

| Renk | Hex | `#000000` üzerinde | `#0a0a0c` üzerinde | AA metin (4.5) | Standardın kendi 7:1 kuralı |
|---|---|---|---|---|---|
| text | `#ffffff` | **21.00:1** | 19.78:1 | geçer | geçer |
| neon-blue | `#00f3ff` | **15.26:1** | 14.38:1 | geçer | geçer |
| success | `#34d399` | **10.92:1** | 10.29:1 | geçer | geçer |
| neon-pink | `#ff00ea` | **6.44:1** | 6.07:1 | geçer | **kalır** |
| neon-purple | `#b026ff` | **4.57:1** | **4.30:1** | siyahta sınırda geçer, **surface'ta kalır** | **kalır** |
| disabled | `#71717a` | 4.35:1 | 4.09:1 | (1.4.3 muaf) | — |

**Sonuç:** neon-blue ve success rahat; **neon-pink 7:1'i geçemiyor** ve §3 tablosu
"Mono değer 16/700 → neon-pink" diyor, yani her sayısal değer kendi kuralının altında.
**neon-purple panel zemininde AA 4.5:1'in de altında (4.30:1)** — §5.3 scrollbar thumb'ı
ve ghost butonun metni bu renk. Ghost buton metni kendi dolgusunun üzerinde 4.32:1.

**Yüzey ve çerçeve (WCAG 1.4.11, eşik 3:1):**

| Öğe | Bileşim | Oran | Değerlendirme |
|---|---|---|---|
| `surface` vs `bg` | `#0a0a0c` / `#000000` | **1.06:1** | paneli ayıran şey gerçekten yalnız çerçeve |
| çerçeve `neon-blue/30` | `#00494c` / `#000000` | **2.06:1** | **3:1 altında — §8'in varsayılan kenarlığı ihlal** |
| çerçeve `/50` | `#007a80` / `#000000` | 4.10:1 | geçer |
| çerçeve `/60` | `#009299` / `#000000` | 5.57:1 | geçer |

Panel `surface`'tan zemine 1.06:1 farkla ayrılıyorsa panelin sınırını taşıyan tek şey
çerçevedir; o çerçeve 2.06:1'de. **Varsayılan kenarlık `/30` yerine `/50` olmalı** ya da
`/30` yalnız dekoratif çerçeveler için bırakılmalı.

**Dolgulu buton üzerinde metin** — standart bu rengi hiç söylemiyor, `theme.css` `color: #000`
veriyor ve doğrusu bu:

| Dolgu | beyaz metin | siyah metin |
|---|---|---|
| neon-blue `#00f3ff` | **1.38:1** | **15.26:1** |
| neon-pink `#ff00ea` | 3.26:1 | 6.44:1 |
| neon-purple `#b026ff` | 4.60:1 | 4.57:1 |
| success `#34d399` | 1.92:1 | 10.92:1 |

Asset doğru yapıyor ama **SKILL.md bunu kural olarak yazmıyor**; "text = okunması gereken
HER şey = `#ffffff`" cümlesi düz okunursa mavi butona beyaz yazı → 1.38:1. §2'ye tek
cümle gerekli: dolgulu neon yüzeyde metin siyahtır.

**Odak halkası bitişiklik (1.4.11, 3:1):**

| Halka | Neyin üstünde | Oran |
|---|---|---|
| neon-blue | neon-blue dolgulu buton | **1.00:1** |
| neon-blue | neon-pink dolgulu buton | 2.37:1 |
| beyaz | neon-blue dolgulu buton | 1.38:1 |
| neon-blue | siyah zemin | 15.26:1 |
| neon-purple | siyah zemin | 4.57:1 |

Tek renkli halka bu palette çalışmıyor. **Halka `outline-offset` ile bileşenin dışına,
siyah zemine oturtulmalı** (neon-blue orada 15.26:1) veya iç `#000000` + dış `#00f3ff`
çift halka kullanılmalı. Bu, standardın "3:1 kontrast" cümlesinin bugün **ölçülemez**
olduğu yer: neye karşı 3:1 yazılmamış.

**Süre ve eğri karşılaştırması:**

| | Standart | react-spectrum S2 | Not |
|---|---|---|---|
| Sekme/gösterge geçişi | `--tk-t-base` 240 ms | 200 ms (`Tabs.tsx:377`) | yakın |
| Reduced motion davranışı | süre 90 ms'ye iner | `transition: 'none'` | standart hareketi bitirmiyor |
| İskelet parıltısı | döngü ≥ 1.4 s | animasyon **hiç başlamaz** | react-spectrum daha sert |
| Easing | `cubic-bezier(0.2,0,0,1)` | `timingFunction: 'out'` (ham değer bulamadım) | karşılaştırılamadı |

**Ek çelişki (mercek dışı ama aynı dosyada):** `theme.css:96` `box-shadow` geçişi tanımlıyor;
§5.4 `box-shadow` animasyonunu açıkça yasaklıyor. Ayrıca `.tk-btn:disabled { opacity: 0.3 }`
beyaz metni `#4c4c4c`'ye (2.45:1) düşürüyor — §2 "tek gri `#71717a`" diyor (4.35:1).

---

## 5 · Lisans

| Depo | Lisans | Son push | Son etiketli sürüm | Açık issue | Not |
|---|---|---|---|---|---|
| adobe/react-spectrum | **Apache-2.0** | 2026-08-21 | `react-aria-components@1.20.0` · 2026-07-31 | 584 | izin verici; patent hükmü var |
| tailwindlabs/headlessui | **MIT** | 2026-04-13 | `@headlessui/react@v2.2.10` · 2026-04-07 | 109 | ~4 aydır push yok |
| radix-ui/primitives | **MIT** | 2026-08-08 | `releases/latest` **404** (paket başına etiket) | 344 | tek sürüm numarası yok |
| focus-trap/focus-trap | **MIT** | 2026-08-21 | v8.2.2 · 2026-06-22 | **4** | en bakımlı, en dar kapsam |
| w3c/wcag | `NOASSERTION` (**W3C Document License**) | 2026-08-21 | yok | 516 | OSI lisansı değil; metin alıntılanır, kopyalanmaz |

MIT/Apache-2.0 dışında olan tek şey WCAG metninin kendisi — W3C Document License türev
çalışmaya izin vermez. Standarda ölçüt **numarasıyla atıf** yapılabilir, normatif cümle
gövdeye kopyalanmamalı. Bu raporda alıntılar kaynak gösterilerek kısa tutuldu.

Kod alınmadı; alınan şey desendir (`checkCanFocusTrap` yarış çözümü, `focus-visible`
modalite ayrımı, özellik bazlı reduced-motion kapatma, offset/çift halka).

---

## Kaynaklar

- `gh api repos/{adobe/react-spectrum, tailwindlabs/headlessui, radix-ui/primitives,
  focus-trap/focus-trap, w3c/wcag}` ve `/releases/latest` — 2026-08-22
- `gh api search/code` — `prefers-reduced-motion` ve `focus-visible` sayımları, 2026-08-22
- `packages/@react-spectrum/s2/src/Tabs.tsx`, `.../Skeleton.tsx` — depo içeriği API'siyle
- focus-trap README (options bölümü)
- W3C WCAG 2.2 Understanding: 2.3.3, 2.2.2, 2.4.11, 2.4.13; Technique C39
- MDN `@media/prefers-reduced-motion`
- `motion.dev/docs/react-use-reduced-motion`
- Yerel: `teknesyum/skills/teknesyum-ui/SKILL.md` §2, §3, §5.3, §5.4, §8 ·
  `assets/theme.css` · `assets/Theme.xaml` · `references/desktop.md:183`
- Kontrast oranları: WCAG 2.x formülüyle yerel hesap, hiçbiri üçüncü taraftan alınmadı
