# ui-grafik — grafik ve veri görselleştirme merceği

Tarama 2026-08-22. recharts, visx, nivo, tremor, Plot — beşine de erişildi.

**Ön bulgu:** `teknesyum-ui` içinde `grafik`, `chart`, `graph`, `sparkline`, `kategorik`
kelimelerinin hiçbiri geçmiyor (SKILL.md + references/ üçü). Alan eksik; bilerek dışarıda
bırakıldığına dair bir cümle de yok.

## 1 · Alanın bugün yaptığı

### Kategorik palet: beşi de sabit liste. Hiçbiri ton döndürmüyor.

| Depo | Slot sayısı | Kaynak | Taşma davranışı |
|---|---|---|---|
| visx v4.0.0 | 12 (`--chart-1..12`) | `packages/visx-theme/src/tokens/light.ts`, `dark.ts` | `index % length`, 5'in altı palet için konsol uyarısı (`tokens/categorical.ts`, `names.ts`: `MIN_CATEGORICAL_COLOR_COUNT = 5`) |
| tremor | 9 (blue, emerald, violet, amber, gray, cyan, pink, lime, fuchsia) | `src/utils/chartColors.ts` | `colors[index % colors.length]` |
| recharts v3.10.1 | 7 | `src/theme/lightTheme.ts` / `darkTheme.ts` (**@experimental**) | slot seçimi `dataKey`'in djb2 hash'inden (`src/theme/graphicalItemIdentity.ts`) |
| nivo v0.99.0 | 6 (`nivo` şeması) + 10 d3 şeması | `packages/colors/src/schemes/categorical.ts` | d3-scale-chromatic'e devrediyor |
| Plot v0.6.17 | 10 (`observable10`) | `src/scales/ordinal.js:42` | — |

**Hiçbir depoda otomatik kontrast/renk körlüğü doğrulaması yok.** visx yalnızca "en az 5
renk" sayısal uyarısı veriyor; kontrast güvencesi seçilen paletin (tableau10, observable10,
Tailwind-500) kendi tasarım sürecinden geliyor.

Plot'ta ayrım net: **sırasız kategori → `observable10` (ayrık liste), sıralı kategori →
`turbo` (sürekli rampa)** — `src/scales/ordinal.js:42`. Diğer dördünde bu ayrım yok.

Hex örneği (d3-scale-chromatic): `observable10` = `#4269d0 #efb118 #ff725c #6cc5b0 #3ca951
#ff8ab7 #a463f2 #97bbf5 #9c6b4e #9498a0`. Hepsi **beyaz zemin için** ayarlanmış orta
parlaklıkta renkler.

### Animasyon: alan ikiye bölünmüş.

| Depo | Varsayılan |
|---|---|
| recharts | Line **1500 ms** `ease` (`cartesian/Line.tsx:443-451`), Pie 1500 ms + `animationBegin: 400` (`polar/Pie.tsx:1155`), Bar 400 ms (`cartesian/Bar.tsx:1030`), Tooltip 400 ms (`component/Tooltip.tsx:261`) |
| **tremor** | seri animasyonu **kapalı** — `<Line … isAnimationActive={false}>` (`LineChart.tsx:870`, `AreaChart.tsx:948`); yalnız Tooltip 100 ms (`LineChart.tsx:699`) |
| nivo | `animate: true`, süre yok — react-spring yayı `config: 'default'` = tension 170 / friction 26 (`core/src/motion/context.js`) |
| visx | react-spring; süre yerine **yön**: `AnimationTrajectory = 'outside' \| 'center' \| 'min' \| 'max'` (`visx-react-spring/src/types`) |
| **Plot** | animasyon **yok** — kaynak ağacında transition modülü yok, grafik yeniden üretilir |

`prefers-reduced-motion`: yalnız **recharts** okuyor. `isAnimationActive: 'auto'` (v3
varsayılanı) → `animation/JavascriptAnimate.tsx:55`, `CSSTransitionAnimate.tsx:66`.
Animasyonu **tümden** kapatıyor, opaklığı bırakmıyor. nivo/visx/tremor/Plot'ta okuma yok
(ilgili motion/theme dosyalarında `matchMedia`/`reduc` geçmiyor).

### Koyu tema: üç farklı çözüm.

- **visx** — ayrı `dark.ts` token seti: `background #020617`, `surface #0f172a`,
  `axisStroke #334155`, **`gridStroke #1e293b`**, `textPrimary #f8fafc`, `textMuted #94a3b8`.
  Izgara eksenden **bir kademe sönük**.
- **recharts** `darkTheme.ts` — grid `#3f3f46` + `strokeDasharray '3 3'`, axis `#d6d3d1`,
  metin `#f5f5f4`, tooltip `bg #18181b` / `1px #52525b`. Seri renkleri **light ile aynı**
  (`#8884d8 #82ca9d #ffc658 …`); değişen tek şey aktif noktanın göbeği: `active.fill`
  light'ta `#fff`, dark'ta `#18181b`. Ayrıca `chart.aspectRatio: 1.618`.
- **tremor** — Tailwind `dark:` varyantı. Izgara `stroke-gray-200 dark:stroke-gray-800`;
  eksen ve tick çizgisi **kapalı** (`stroke=""`, `tickLine={false}`); tick etiketi
  `fill-gray-500 dark:fill-gray-500` — **iki modda aynı gri**, seri renkleri de aynı
  (Tailwind `-500`). Tooltip cursor `stroke #d1d5db` 1px.
- **Plot** — tek CSS değişkeni: `--plot-background: white` (`src/plot.js:266`), işaretler
  `fill: currentColor` (`src/style.js:60`). Koyu tema = iki değeri üzerine yazmak.
- **nivo** — `theming/src/index.ts` yalnız `defaultTheme` veriyor, **koyu tema yok**.
  `background: 'transparent'` (sayfayı miras alır, iyi) ama `tooltip.container.background:
  'white'` sabit — koyu temada beyaz sızıntı.

visx v4 token adları: `--chart-1 … --chart-12`, `--chart-scale-from/to`,
`--chart-diverge-low/mid/high`, `--visx-axis-stroke`, `--visx-grid-stroke`
(`tokens/names.ts`). `<ThemeScope theme="auto">` hiçbir değişken **basmıyor** — sayfada
tanımlı olanı miras alıyor (`provider/ThemeScope.tsx`), shadcn adlarına doğrudan bağlanıyor.

## 2 · Standardın kaçırdığı

**a) Kategorik seri paleti yok.** §2 dört marka rengi veriyor; beş çizgili grafikte ne
olacağı yazmıyor. Alanın tamamı 6–12 slotluk **sabit liste + modulo sarma** kullanıyor.
**Alınmalı: evet.** §8.1 "renk tek kaynaktan" diyor; palet standartta değilse her
dashboard'da yeniden uydurulur. Girer: **§2**.

**b) Izgara metin değildir — 7:1 kuralı ona uygulanamaz.** §2 "kontrast 7:1 altına inemez,
ara gri yok" diyor; bunu ızgaraya harfi harfine uygulayan kişi veriyle aynı parlaklıkta bir
ızgara çizer, grafik okunmaz olur. visx ızgarayı eksenden bir kademe sönük tutuyor
(`#1e293b` vs `#334155`), recharts kesikli (`3 3`) veriyor. **Alınmalı: evet**, muafiyet
cümlesi olarak. Girer: **§2** (tek satır).

**c) Sessiz metin mekanizması yok.** Tremor tick etiketini `gray-500` (#6b7280) yapıyor —
bizde açıkça yasak. Standart hiyerarşiyi boyut/ağırlık/tracking ile kurmayı söylüyor ama
tick etiketi zaten en küçük punto, küçültecek yer yok. **Kararı konseye:** ya beyaz kalır
ve ağırlık düşer (standarda sadık), ya grafiğe özel tek sönük ton tanımlanır (standart
delinir).

**d) Veri değişimi geçişi için kova yok.** §5.4 "yalnız `opacity` ve `transform`" diyor;
veri değişince SVG `d` yolu enterpole edilir — ne opacity ne transform. **Alınmalı: evet**,
açık istisna olarak. Girer: **§5.4**.

**e) Sıralı kategori ≠ sırasız kategori.** Plot bunu ölçekte ayırıyor (ayrık liste vs
`turbo` rampası). Standartta kavram yok. **Alınmalı: evet**, grafik referansına.

**f) `--tk-*` dışı ada bağlanma.** visx `--chart-1..12` diye shadcn uyumlu jenerik ad
kullanıyor. **Alınmalı: hayır** — önek tutarlılığı dış uyumdan değerli; `--tk-chart-1` denir.

## 3 · Standardın haklı olduğu yerler

**"Animasyon süs değil geri bildirim."** Tremor recharts'ın üstüne kuruluyor ve recharts'ın
1500 ms'lik çizgi çizme animasyonunu `isAnimationActive={false}` ile **kapatıyor**; yalnız
100 ms'lik tooltip'i bırakıyor. Plot hiç animasyon yapmıyor. "Çizgi soldan sağa çizilir"
ilk bakışta etkileyici, ikinci bakışta bekleme süresidir — §5.4'ün 360 ms tavanı bunu doğru
biçimde reddediyor. **Korunsun.**

**`prefers-reduced-motion` açıkken opaklığın kalması.** recharts `'auto'` modunda animasyonu
tümden kapatıyor; grafik kareden kareye sıçrıyor, kullanıcı verinin değiştiğini fark etmiyor.
"Konum/ölçek kapanır, opaklık kalır" kuralımız daha ince. **Korunsun.**

**Token'lı sabit süre.** nivo ve visx yay tabanlı; yay iptal edilebildiği için "geçiş >
keyframe" gerekçemizle çelişmiyor. Ama nivo'nun yayında **süre yok** — oturma süresi
ölçülmeden bilinemez. Sabit süre denetlenebilir. **Korunsun.**

## 4 · Ölçü ve token — yan yana

| Konu | teknesyum-ui bugün | Alanda görülen |
|---|---|---|
| Mikro geri bildirim | `--tk-t-instant` 90 ms | tremor tooltip 100 ms |
| Panel/geçiş | `--tk-t-base` 240 ms | recharts Bar 400 ms, Tooltip 400 ms |
| Üst sınır | `--tk-t-slow` 360 ms | recharts Line/Pie 1500 ms |
| Yay | `--tk-e-spring` yalnız basma | nivo default 170/26; visx react-spring |
| Kategorik slot | **yok** | visx 12 (min 5), tremor 9, recharts 7, nivo 6, Plot 10 |
| Taşma | **yok** | beşinde de `index % length` |
| Izgara / eksen (koyu) | **yok** | visx `#1e293b` / `#334155`; recharts `#3f3f46` kesikli / `#d6d3d1` |
| Grafik en-boy | **yok** | recharts `aspectRatio: 1.618`, `maxWidth 700px` |
| Kenar boşluğu | **yok** | visx `{top 20, right 20, bottom 40, left 50}` |

Bulamadım: nivo yayının ms cinsinden oturma süresi; hiçbir deponun paletinde belgelenmiş
kontrast/renk körlüğü ölçümü.

## Sorulara doğrudan cevap

**Beş çizgide hangi renkler?** Sabit liste — ton döndürmede alan oybirliğinde, hiçbiri
algoritmik üretmiyor. Öneri: **8 slotluk `--tk-chart-1 … --tk-chart-8`**, taşmada
`index % 8`, altıncı slota gelindiğinde uyarı (visx deseni; altı seriden fazlası "diğer"e
toplanmalı). İlk üç slot mevcut tokenlar — `neon-blue`, `neon-pink`, `neon-purple`; 1–3
serili grafik marka rengiyle çizilir, üçü ton olarak maksimum uzak. Slot 4–8 hexlerini
**uydurmuyorum**: `#000000` zeminine ve birbirine karşı ölçülerek seçilmeli.

Konseye iki karar: (1) `success #34d399` kategorik sete girecek mi — girerse §2'deki
"yalnızca tamamlandı" tekeli kırılır; (2) beş çizgide renk tek başına yetmez —
`stroke-dasharray` veya doğrudan uç etiketi ikinci kodlama olarak zorunlu mu (WCAG 1.4.1).
Alınacak ayrıntı: recharts'ın aktif nokta deseni — göbek zemin rengi, çeper seri rengi,
2px; üst üste binen çizgilerde hangi serinin okunduğu bununla belli oluyor.

**Süre ölçeği grafiğe uyuyor mu?** Geri bildirim için **uyuyor** — tooltip, hover, aktif
durum 90–240 ms bandında, tremor da orada. Uymayan tek şey **ilk çizim** (recharts 1500 ms):
onu almıyoruz, tremor da almamış. Ayrı ölçek gerekmiyor; gereken tek şey **veri değişimi
geçişi** için §5.4'e istisna — "yalnız opacity/transform" kuralı SVG yol enterpolasyonunu
kapsamıyor.

**Standarda mı, ayrı skill'e mi?** **İkisi de: §2 ve §5.4'e asgari madde, gerisi
`references/charts.md`'ye.** Palet ayrı skill'e konulamaz; §8.1 "renk tek kaynaktan gelir,
aynı rengi iki yerde tanımlamak ikisinin ayrışması demektir" diyor — `--tk-chart-*` başka
dosyada yaşarsa ilk tema değişikliğinde ayrışır, animasyon istisnası da §5.4'e atıf yapmak
zorunda. Ama grafik türleri, eksen biçimlendirme, tooltip yerleşimi, boş/yükleniyor/hata
hâli, sayı ve tarih biçimi 150+ satır tutar; 485 satırlık standardın üçte biri, dört
platformun yalnız ikisini ilgilendiren konu için fazla. Standart zaten
`references/{components,desktop,layout}.md` desenini kullanıyor — dördüncüsü doğal yer.
Ayrı **skill** olmamalı: skill ayrı yüklenir, dashboard yazan kişi `teknesyum-ui` açıkken
grafik kurallarını görmez.

## 5 · Lisans

| Depo | Lisans | Son commit | Son etiket | Açık issue |
|---|---|---|---|---|
| recharts/recharts | MIT | 2026-08-22 | v3.10.1 (2026-07-25) | 437 |
| airbnb/visx | MIT | 2026-06-22 | v4.0.0 (2026-06-11) | 148 |
| plouc/nivo | MIT | 2026-07-21 | v0.99.0 (**2025-05-23**) | 49 |
| tremorlabs/tremor | Apache-2.0 | **2025-10-10** | **sürüm/etiket yok** | 29 |
| observablehq/plot | **ISC** | 2026-05-16 | v0.6.17 (**2025-02-14**) | 346 |

Hepsi OSI onaylı ve izin verici. ISC işaretlendi: MIT/Apache/BSD dışı ama işlevsel olarak
MIT eşdeğeri, engel değil. tremor 10 aydır commit almamış ve hiç etiketli sürümü yok — ama
kopyala-yapıştır bileşen seti olduğundan bağımlılık riski taşımıyor, desen olarak okunur.
recharts'ın tema sistemi kaynakta **`@experimental`** işaretli, API'si değişecek. Kod
alınmıyor; alınan şey palet yapısı ve koyu tema kademesi.
