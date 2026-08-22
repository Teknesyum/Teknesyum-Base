# ui-grafik — grafik ve veri görselleştirme merceği

Tarama tarihi 2026-08-22. Depolar: recharts/recharts, airbnb/visx, plouc/nivo,
tremorlabs/tremor, observablehq/plot. Beşine de erişildi.

**Ön bulgu:** `teknesyum-ui` içinde `grafik`, `chart`, `graph`, `sparkline`, `kategorik`
kelimelerinin hiçbiri geçmiyor (SKILL.md + references/ üçü, tam metin arama). Bu alan
eksik — bilerek dışarıda bırakıldığına dair bir cümle de yok.

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

| Depo | Veri değişiminde animasyon | Varsayılan süre |
|---|---|---|
| recharts Line | var | **1500 ms**, `ease`, `animationBegin: 0` (`src/cartesian/Line.tsx:443-451`) |
| recharts Bar | var | 400 ms, `ease` (`src/cartesian/Bar.tsx:1030`) |
| recharts Pie | var | 1500 ms, `animationBegin: 400` (`src/polar/Pie.tsx:1155`) |
| recharts Tooltip | var | 400 ms (`src/component/Tooltip.tsx:261`) |
| **tremor** | **kapalı** — `<Line … isAnimationActive={false}>` (`LineChart.tsx:870`, `AreaChart.tsx:948`) | yalnız Tooltip 100 ms (`LineChart.tsx:699`) |
| nivo | var, `animate: true` varsayılan | süre yok, react-spring yayı: `config: 'default'` = tension 170 / friction 26 (`packages/core/src/motion/context.js`) |
| visx xychart | var, react-spring | süre yerine **yön**: `AnimationTrajectory = 'outside' \| 'center' \| 'min' \| 'max'` (`visx-react-spring/src/types`) |
| **Plot** | **yok** — kaynak ağacında animasyon/transition modülü yok; grafik yeniden üretilir | — |

`prefers-reduced-motion`: yalnız **recharts** okuyor. `isAnimationActive: 'auto'` (v3
varsayılanı) → `src/animation/JavascriptAnimate.tsx:55` ve `CSSTransitionAnimate.tsx:66`,
`isActiveProp === 'auto' ? !Global.isSsr && !prefersReducedMotion : isActiveProp`.
Animasyonu **tümden** kapatıyor, opaklığı bırakmıyor. nivo/visx/tremor/Plot'ta okuma yok
(kaynak: ilgili motion/theme dosyalarında `matchMedia`/`reduc` geçmiyor).

### Koyu tema: üç farklı çözüm.

- **visx** — ayrı `dark.ts` token seti. `background #020617`, `surface #0f172a`,
  `axisStroke #334155`, **`gridStroke #1e293b`**, `textPrimary #f8fafc`,
  `textMuted #94a3b8`. Izgara eksenden **daha sönük**.
- **recharts** `darkTheme.ts` — `grid.stroke #3f3f46` + `strokeDasharray '3 3'`,
  `axis.stroke #d6d3d1`, `typography.color #f5f5f4`, tooltip `bg #18181b` /
  `border 1px #52525b`. Seri renkleri **light ile aynı** (`#8884d8 #82ca9d #ffc658 …`);
  değişen tek şey aktif noktanın göbeği: `active.fill` light'ta `#fff`, dark'ta `#18181b`.
- **tremor** — Tailwind `dark:` varyantı. Izgara `stroke-gray-200 dark:stroke-gray-800`;
  eksen çizgisi ve tick çizgisi **kapalı** (`stroke=""`, `tickLine={false}`); tick etiketi
  `fill-gray-500 dark:fill-gray-500` — **iki modda aynı gri**. Seri renkleri de iki modda
  aynı (Tailwind `-500` tonu). Tooltip cursor `stroke #d1d5db`, 1px.
- **Plot** — SVG'ye tek CSS değişkeni basıyor: `--plot-background: white` (`src/plot.js:266`),
  işaretler `fill: currentColor` (`src/style.js:60`). Koyu tema = iki değişken üzerine yazmak.
- **nivo** — `packages/theming/src/index.ts` yalnız `defaultTheme` dışa veriyor,
  **koyu tema yok**. Varsayılanı `background: 'transparent'` (sayfayı miras alır, iyi) ama
  `tooltip.container.background: 'white'` sabit (`defaults.ts`) — koyu temada beyaz sızıntı.

visx v4 token adları: `--chart-1 … --chart-12`, `--chart-scale-from/to`,
`--chart-diverge-low/mid/high`, `--visx-axis-stroke`, `--visx-grid-stroke`
(`tokens/names.ts`). `<ThemeScope theme="auto">` hiçbir değişken **basmıyor** — sayfada
zaten tanımlı olanları miras alıyor (`provider/ThemeScope.tsx`), shadcn adlarına
(`--background`, `--card`, `--muted-foreground`) doğrudan bağlanıyor.

## 2 · Standardın kaçırdığı

**a) Kategorik seri paleti yok.** §2 dört marka rengi veriyor; beş çizgili grafikte ne
olacağı yazmıyor. Alanın tamamı 6–12 slotluk **sabit liste + modulo sarma** kullanıyor.
**Alınmalı: evet.** §8.1 "renk tek kaynaktan" diyor; palet standartta değilse her
dashboard'da yeniden uydurulur. Girer: **§2**.

**b) Izgara/eksen metin değildir — 7:1 kuralı buraya uygulanamaz.** §2 "kontrast 7:1 altına
inemez, ara gri yok" diyor. Bunu ızgaraya harfi harfine uygulayan kişi, veriyle aynı
parlaklıkta bir ızgara çizer ve grafik okunmaz olur. visx ızgarayı eksenden bir kademe
sönük tutuyor (`#1e293b` vs `#334155`), recharts ızgarayı kesikli (`3 3`) veriyor.
**Alınmalı: evet**, muafiyet cümlesi olarak. Girer: **§2** (tek satır) + grafik referansı.

**c) Sessiz metin mekanizması yok.** Tremor tick etiketini `gray-500` (#6b7280) yapıyor;
bu bizim §2'mizde açıkça yasak. Standart hiyerarşiyi boyut/ağırlık/tracking ile kurmayı
söylüyor, ama grafikte tick etiketi zaten en küçük punto — daha küçültecek yer yok.
**Alınmalı: kararı konseye.** Seçenek: tick etiketi beyaz kalır ve punto/ağırlık düşer
(standarda sadık), ya da grafiğe özel tek bir sönük ton tanımlanır (standart delinir).

**d) Veri değişimi geçişi için kova yok.** §5.4 "yalnız `opacity` ve `transform`" diyor.
Grafikte veri değişince SVG `d` yolu enterpole edilir — bu ne opacity ne transform.
**Alınmalı: evet**, açık istisna olarak. Girer: **§5.4**.

**e) Sıralı kategori ≠ sırasız kategori.** Plot bunu ölçekte ayırıyor (ayrık liste vs
`turbo` rampası). Standartta kavram yok. **Alınmalı: evet**, grafik referansına.

**f) `--tk-*` dışı ada bağlanma sorusu.** visx `--chart-1..12` diye jenerik ad kullanıyor,
shadcn ile uyumlu. Bizde her şey `--tk-` önekli. **Alınmalı: hayır** — önek tutarlılığı
dış uyumdan değerli; `--tk-chart-1` denir.

## 3 · Standardın haklı olduğu yerler

**"Animasyon süs değil geri bildirim" — alanın en olgun üyesi bizimle aynı fikirde.**
Tremor, recharts'ın üstüne kuruluyor ve recharts'ın 1500 ms çizgi çizme animasyonunu
`isAnimationActive={false}` ile **kapatıyor**; sadece 100 ms'lik tooltip animasyonunu
bırakıyor. Plot ise hiç animasyon yapmıyor. 1500 ms'lik "çizgi soldan sağa çizilir"
animasyonu ilk bakışta etkileyici, ikinci bakışta bekleme süresidir — §5.4'ün 360 ms tavanı
bu animasyonu doğru biçimde reddediyor. **Korunsun.**

**`prefers-reduced-motion` açıkken opaklığın kalması.** recharts `'auto'` modunda animasyonu
tümden kapatıyor; grafik bir kareden diğerine sıçrıyor ve kullanıcı verinin değiştiğini
fark etmiyor. Bizim "konum/ölçek kapanır, opaklık kalır" kuralı daha ince ve daha doğru.
**Korunsun.**

**Geçiş > keyframe.** nivo ve visx yay (spring) tabanlı; yay iptal edilebilir olduğu için
gerekçemizle çelişmiyor. Ama nivo'nun yayında **süre yok** — tension/friction'dan çıkan
oturma süresi ölçülmeden bilinemez. Token'lı sabit süre, denetlenebilirlik açısından üstün.
**Korunsun.**

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
| Grafik en-boy | **yok** | recharts `aspectRatio: 1.618` |
| Kenar boşluğu | **yok** | visx `{top 20, right 20, bottom 40, left 50}` |

Bulamadım: nivo yayının ms cinsinden oturma süresi; hiçbir deponun paletinde belgelenmiş
kontrast/renk körlüğü ölçümü.

## Sorulara doğrudan cevap

**Beş çizgide hangi renkler?** Sabit liste, ton döndürme değil — alan bu konuda oybirliğinde.
Öneri: **8 slotluk `--tk-chart-1 … --tk-chart-8`**, taşmada `index % 8`, altıncı slota
gelindiğinde uyarı (visx deseni). İlk üç slot mevcut tokenlar: `neon-blue`, `neon-pink`,
`neon-purple` — en sık görülen 1–3 serili grafik marka rengiyle çizilir ve üçü ton olarak
maksimum uzak. Slot 4–8 için hex **uydurmuyorum**: bunlar `#000000` zeminine karşı ve
birbirine karşı ölçülerek seçilmeli. İki karar konseye kalıyor: (1) `success #34d399`
kategorik sete girecek mi — girerse §2'deki "yalnızca tamamlandı" tekeli kırılır;
(2) renk tek başına yeterli değil — beş çizgide `stroke-dasharray` veya doğrudan uç
etiketi ikinci kodlama olarak zorunlu tutulmalı (WCAG 1.4.1). Alınacak ayrıntı: recharts'ın
aktif nokta deseni — göbek zemin rengi, çeper seri rengi, 2px; üst üste binen çizgilerde
hangi serinin okunduğu bu sayede belli oluyor.

**Süre ölçeği grafiğe uyuyor mu?** Geri bildirim animasyonu için **uyuyor** — tooltip,
hover, aktif durum 90–240 ms bandında ve tremor da orada. Uymayan tek şey **ilk çizim**
(recharts 1500 ms): onu almıyoruz, tremor da almamış. Grafiğin ayrı ölçek istediği tek
yer **veri değişimi geçişi**; §5.4'ün "yalnız opacity/transform" kuralı SVG yol
enterpolasyonunu kapsamıyor ve bir istisna cümlesi gerekiyor. Ayrı ölçek değil, tek
istisna yeter.

**Standarda mı, ayrı skill'e mi?** **İkisi de: §2 ve §5.4'e asgari madde, gerisi
`references/charts.md`'ye.** Gerekçe — palet ayrı skill'e konulamaz, çünkü §8.1 "renk tek
kaynaktan gelir, aynı rengi iki yerde tanımlamak ikisinin ayrışması demektir" diyor;
`--tk-chart-*` başka dosyada yaşarsa ilk tema değişikliğinde ayrışır. Aynı şekilde
animasyon istisnası §5.4'e atıf yapmak zorunda. Ama grafik türleri, eksen biçimlendirme,
tooltip yerleşimi, boş/yükleniyor/hata hâli, sayı ve tarih biçimi 150+ satır tutar —
485 satırlık standardın üçte biri, dört platformun yalnız ikisini ilgilendiren bir konu
için. Standart zaten `references/components.md`, `desktop.md`, `layout.md` desenini
kullanıyor; dördüncüsü doğal yer. Ayrı **skill** olmamalı: skill ayrı yüklenir, dashboard
yazan kişi `teknesyum-ui` açıkken grafik kurallarını görmez.

## 5 · Lisans

| Depo | Lisans | Son commit | Son etiket | Açık issue |
|---|---|---|---|---|
| recharts/recharts | MIT | 2026-08-22 | v3.10.1 (2026-07-25) | 437 |
| airbnb/visx | MIT | 2026-06-22 | v4.0.0 (2026-06-11) | 148 |
| plouc/nivo | MIT | 2026-07-21 | v0.99.0 (**2025-05-23**) | 49 |
| tremorlabs/tremor | Apache-2.0 | **2025-10-10** | **sürüm/etiket yok** | 29 |
| observablehq/plot | **ISC** | 2026-05-16 | v0.6.17 (**2025-02-14**) | 346 |

Hepsi OSI onaylı, izin verici. ISC işaretlendi: MIT/Apache/BSD dışı ama işlevsel olarak
MIT eşdeğeri, engel değil. Not: tremor 10 aydır commit almamış ve hiç etiketli sürümü yok —
ama kopyala-yapıştır bileşen seti olduğu için bağımlılık riski taşımıyor, desen olarak
okunabilir. recharts'ın tema sistemi kaynakta **`@experimental`** işaretli, API'si değişecek.
Kod alınmıyor; alınan şey palet yapısı ve koyu tema kademesi.
