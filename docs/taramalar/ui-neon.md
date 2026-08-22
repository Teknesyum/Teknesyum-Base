# ui-neon — neon, cam, koyu tema mercek taraması

`gh api` ve ham dosya okumasıyla 2026-08-22'de alındı.

| Depo | Lisans | Yıldız | Son push | Açık issue | Son etiket |
|---|---|---|---|---|---|
| magicuidesign/magicui | MIT | 22.038 | 2026-08-11 | 2 | GitHub sürümü yok (404) |
| DavidHDev/react-bits | **MIT + Commons Clause** | 45.991 | 2026-08-15 | 8 | GitHub sürümü yok (404) |
| nolly-studio/cult-ui | MIT | 6.056 | 2026-07-22 | 17 | GitHub sürümü yok (404) |
| markmead/hyperui | MIT | 12.203 | 2026-08-21 | 1 | `astro`, 2026-01-21 |
| Aceternity UI | **kaynak deposu yok** | — | — | — | — |

Aceternity UI'ın açık bileşen deposunu bulamadım. `aceternity` organizasyonunda yalnız
`saasternity` (103 yıldız, son push 2024-08-24, lisanssız) var; `manuarora700/ui.aceternity`
2024-01-27'den beri dokunulmamış ve lisanssız. Bileşenler yalnız `ui.aceternity.com`
üzerinden kopyala-yapıştır dağıtılıyor. Kaynağı okuyamadığım için §1-§4'te delil olarak
kullanmadım, yalnız §5'te var.

---

## 1 · Alanın bugün yaptığı

"Şık" görüntü beş teknikle üretiliyor. Hepsi kaynakta doğrulandı:

1. **Katmanlı glow.** react-bits `ElectricBorder.css`: üç `absolute` katman — `blur(1px)`,
   `blur(4px)`, `blur(32px)` + `scale(1.1)` + `opacity:.3`. **Blur statik, animasyonlanmıyor.**
2. **Gradyan kenarlık, üç yolla.** magicui `shine-border.tsx:46-51` maske yolu
   (`mask: … content-box, …` + `maskComposite:"exclude"`); hyperui
   `animated-border-gradient…mdx` ucuz yolu (dış kutu `p-px` + gradyan zemin, iç kutu düz
   zemin); magicui `border-beam.tsx:85` `offsetPath: rect(…)` üzerinde `offsetDistance`.
3. **Gürültü dokusu — iki karşıt uygulama.** cult-ui `texture-overlay.tsx` on iki dokuyu
   (dots, noise, crosshatch, halftone, paperGrain…) saf `radial-gradient` /
   `repeating-linear-gradient` ile veriyor: JS yok, animasyon yok. react-bits `Noise.jsx`
   aynı görüntüyü rAF döngüsünde `createImageData` + `Math.random()` ile her karede üretiyor.
4. **İmleç takibi.** magicui `magic-card.tsx`: `useMotionValue` ile `mouseX/mouseY`,
   `radial-gradient(Npx circle at ${mouseX}px ${mouseY}px, …)` içine giriyor (171, 187).
   **Kritik ayrıntı:** gradyan animasyonlanmıyor; animasyonlanan tek şey
   `opacity-0 → group-hover:opacity-100`, `transition-opacity duration-300` (184).
5. **Blur katmanı.** magicui `progressive-blur.tsx`: sekiz kademeli `backdropFilter: blur()`
   (`[0.5,1,2,4,8,16,32,64]`), her katman `maskImage` ile dilime kırpılıyor. Statik.

**Animasyon tarafında ihlal yaygın.** magicui `apps/www/styles/globals.css` 24 animasyon
tokenı taşıyor, neredeyse tamamı `infinite`. En az dokuzu `transform`/`opacity` dışı:
`background-position` → `gradient`(8s), `shine`(14s), `shiny-text`(8s), `rainbow`(2s),
`line-shadow`(15s), `background-position-spin`(3000ms); `mask-position-x` → `line`(2s);
**`box-shadow`** → `pulse`, `pulse-ripple` (`pulsating-button` kullanıyor); **`filter:
blur()`** → `blur-fade.tsx:55-60`, girişte `blur(6px)→blur(0px)`, 400 ms. Buna karşılık
`meteor`, `marquee`, `spin-around`, `ripple`, `ping`, `shimmer-slide` yalnız
`transform`/`opacity`. Depo tutarsız — kural yok, tercih var.

**hyperui grubun dışında.** 551 `.html` bileşen, sıfır JS bağımlılığı (Astro + Tailwind).
`animate-` geçen dosya 19, `transition` geçen 251 — hareket neredeyse tamamen hover geçişi.

**react-bits'in kendi animasyon standardı var:** `AGENTS/SKILLS/review-animations/SKILL.md`,
on maddelik "non-negotiable" liste. 7. madde birebir bizim kuralımız (*"Animate `transform`
and `opacity` only"*), 6. madde birebir bizim keyframe gerekçemiz (*"interruptible … not
keyframes that restart from zero"*). İlginç olan: **depo bu standardı yazmış, kendi
bileşenlerinde uygulamamış** — ElectricBorder'ın rAF döngüsü, Noise'un canvas'ı,
`Backgrounds/` altındaki ~50 WebGL sahnesi.

### Şık ↔ akıcı çatışmasının ölçümü

| Efekt | Kaynak | Kare başına maliyet | Karar |
|---|---|---|---|
| Statik glow katmanı, hover'da `opacity` | magic-card:184 | yalnız kompozit | **alınır** |
| Gradyan kenarlık, statik | shine-border:46 · hyperui mdx | sıfır | **alınır** |
| Doku, statik tekrarlı gradyan | texture-overlay.tsx | sıfır | **alınır** |
| Kenarda koşan ışık (`offsetDistance`) | border-beam:85 | transform sınıfı, ama sonsuz döngü | sınırlı: yalnız süreç göstergesi |
| `background-position` kayması | shine 14s, rainbow 2s | katmanın her karede yeniden boyanması | yalnız buton boyunda |
| Animasyonlu `filter: blur()` | blur-fade:55 | alt ağacın her karede rasterlenmesi | **alınmaz** |
| Animasyonlu `box-shadow` | `pulse` keyframes | geniş alanın her karede boyanması | **alınmaz** |
| rAF ile sürekli canvas | ElectricBorder:255 · Noise:53 | pencere açık oldukça sürekli CPU | **alınmaz** |
| WebGL arka plan | react-bits `Backgrounds/` (~50) | sürekli GPU + three/ogl yüzeyi | yalnız §5.5 tanıtım sayfası |

**Sonuç: "şık" görünmek için animasyon şart değil.** Kaynakta gördüğüm parlamanın büyük
kısmı statik katman; animasyon yalnız o katmanı açıp kapatan opaklık. Çatışma sanıldığı
kadar geniş değil — asıl çatışma `filter`, `box-shadow` ve sonsuz döngüde.

---

## 2 · Standardın kaçırdığı

**a) Gradyan kenarlık palette yok.** §2 opaklık merdiveni çerçeve için `/30` ve `/50-60`
diyor, hepsi tek renk. Alanda iki renkli kenarlık yerleşik (shine-border, StarBorder,
neon-gradient-card, hyperui). neon-blue → neon-purple gradyan çerçeve palete birebir uyar,
statik hâlinde bedava. **Alınmalı** — gösterişi animasyondan değil renkten alıyor. → **§2**

**b) Doku/gürültü katmanı yok.** Standart tam siyah zemin diyor; alanda koyu zemin hemen
her zaman ince dokuyla kırılıyor. **Alınmalı, yalnız statik CSS gradyan biçiminde** —
canvas hâli değil. → **§2**

**c) `@media (hover: hover) and (pointer: fine)` kapısı yok** (react-bits STANDARDS 8.
madde zorunlu tutuyor). Bizde hover tavanları var ama dokunmatikte hover'ın yapışması
anılmıyor. **Alınmalı**, bedelsiz. → **§5.4**

**d) `@starting-style` yok.** "Giriş animasyonu bir kez oynar" kuralımızı bugün JS'e
bırakıyoruz; `@starting-style` aynı şeyi CSS geçişiyle verir — keyframe'siz, iptal
edilebilir. **Alınmalı.** → **§5.4**

**e) Sıklık ölçeği yok.** react-bits STANDARDS 2. madde: *"Keyboard-initiated and 100+/day
actions get no animation. Tens/day gets reduced motion."* Bizde "söyleyeceği şey yoksa
animasyon konmaz" var ama ölçülebilir değil. **Alınmalı.** → **§5.4**

**f) `transition: all` açıkça yasak değil** (dolaylı var) ve **`transform-origin` kuralı
yok** — açılan menü tetikleyicisinden büyür, merkezden değil; `scale(0)` yasak,
`scale(0.9–0.97)` + opaklık. İkisi de alınmalı. → **§6** ve **§5.4**

**g) Bileşen düzeyinde reduced-motion.** shine-border.tsx:57 `motion-safe:animate-shine`
kullanıyor. Global `@media` bloğumuz süreyi 0.01 ms'ye indiriyor, ama sonsuz döngülü efekt
hâlâ çalışıyor — yalnız çok hızlı. Global blok yetmiyor. **Alınmalı.** → **§5.4**

---

## 3 · Standardın haklı olduğu yerler

- **Geçiş > keyframe.** Gerekçe artık bağımsız doğrulanmış: react-bits kendi STANDARDS.md'sinde
  aynı sonuca aynı gerekçeyle varmış. Alanın çoğunluğu keyframe kullanıyor; kuralı yazanlar
  keyframe'in yanlış olduğunu kabul ediyor. Korunmalı.
- **Yalnız `transform`/`opacity`.** Aynı şekilde doğrulandı (STANDARDS 7. madde). Fark
  uygulamada: magicui'nin dokuz tokenı ve react-bits'in kendi bileşenleri kuralı çiğniyor.
  Kural doğru, disiplin eksik — standardımızın değeri o disiplini zorunlu kılmasında.
- **Sonsuz döngü yasağı gevşetilmemeli.** magicui'nin 24 tokenının neredeyse tamamı
  `infinite`. O bir tanıtım sitesi kütüphanesi; bizim kapsamımız her gün açılan uygulama.
  §5.5 istisnası ayrımı zaten doğru kuruyor.
- **Metne glow verilmemesi.** magicui'de metne efekt veren en az beş bileşen var
  (`line-shadow-text`, `aurora-text`, `sparkles-text`, `hyper-text`, `glyph-matrix`).
  Standardın gerekçesi (küçük puntoda okunurluk, ekran görüntüsünde bulanıklık) ölçülmüş.
- **360 ms tavanı.** react-bits bağımsız olarak daha sıkısını söylüyor: "UI animations stay
  under 300ms". 360 ms'yi yalnız sayfa/görünüm değişimine ayırmamız onların "modals,
  drawers 200–500ms" aralığıyla uyumlu. Değiştirmeye gerek yok.

---

## 4 · Ölçü ve token

| Konu | Standardımız (§5.4) | react-bits STANDARDS.md | magicui globals.css |
|---|---|---|---|
| ease-out | `cubic-bezier(0.2, 0, 0, 1)` | `cubic-bezier(0.23, 1, 0.32, 1)` | eğri tokenı yok |
| ease-in-out · çekmece | ikisi de yok | `(0.77,0,0.175,1)` · `(0.32,0.72,0,1)` | — |
| basma | `scale(0.98)`, 90 ms | `scale(0.97)`, 160 ms ease-out | `active:translate-y-px`, 300 ms |
| tooltip · menü · panel | 160 · 160 · 240 ms | 125–200 · 150–250 · 200–500 ms | — |
| üst sınır | 360 ms | 300 ms (modal hariç) | tavan yok |
| kademe | 40 ms, en çok 6 | 30–80 ms | — |
| spring | `(0.34,1.36,0.64,1)`, yalnız basma | `{duration:.5, bounce:.2}` · `{mass:1, stiffness:100, damping:10}` | — |
| giriş kayması · ölçeği | 8 DIP · belirtilmemiş | `translateY(8px)` · `scale(0.9–0.97)`, `scale(0)` yasak | `offset: 6` |
| sonsuz döngü | yasak (süreç göstergesi hariç) | belirtilmemiş | 24 tokenın neredeyse tamamı |
| hover kapısı | yok | `@media (hover:hover) and (pointer:fine)` | yok |

Süre ölçeğimiz alanınkiyle örtüşüyor, çelişki yok. Eksik: eğri çeşitliliği ve giriş
ölçeğinin başlangıç değeri.

---

## 5 · Lisans

- **magicui — MIT.** Düz MIT, ek şart yok, ayrı marka koruma metni yok. Kopyalanabilir;
  §5.6 gereği `docs/licenses.md`'ye satır yazılır.
- **cult-ui — MIT** (Copyright 2023 Jordan-Gilliam). Kopyalanabilir. Sitede ayrıca ücretli
  "cult pro" kataloğu var; MIT yalnız açık bileşenleri kapsar.
- **hyperui — MIT.** Kopyalanabilir.
- **react-bits — MIT + Commons Clause v1.0. OSI onaylı değil.** GitHub API `NOASSERTION`
  döndürüyor. Metin: bileşenler bir uygulamanın parçası olarak kullanılabilir, ancak
  *"you do not sell, sublicense, or redistribute the components themselves — whether alone,
  in a bundle, or as a ported version."* **Sonuç:** react-bits'ten alınan bir efekti
  `teknesyum-ui` standardının parçası yapıp başka projelere dağıtmak "ported version"
  sayılabilir. §5.6 madde 2 uygulanır — **fikir alınır, kod alınmaz.** Depoda ayrıca ücretli
  katalog var (`Pro.js`: `PRO_COUNTS.total = 683` — deponun kendi beyanı, **doğrulanamadı**).
- **Aceternity UI — freemium, kaynak deposu yok.** `ui.aceternity.com/pricing` (2026-08-22):
  ücretsiz katman "all free components"; ücretli katmanlar yıllık 169 $, ömür boyu 199 $,
  takım 1.590 $. Ücretsiz bileşenler için **sitede açık lisans metni bulamadım.** §5.6'nın
  son cümlesi geçerli: lisansı olmayan kaynak "serbest" değildir. **Kod alınmaz.**

Dört deponun hiçbirinde GitHub sürüm etiketi akışı yok (hyperui'nin tek `astro` etiketi
hariç). "Şu sürümü aldık" denemez, ancak commit'e bakılır — kod kopyalamak yerine fikir
almanın ek gerekçesi.

## Kaynaklar

- `gh api repos/{magicuidesign/magicui, DavidHDev/react-bits, nolly-studio/cult-ui, markmead/hyperui}` · 2026-08-22
- magicui: `apps/www/registry/magicui/{magic-card,border-beam,shine-border,neon-gradient-card,shimmer-button,progressive-blur,blur-fade}.tsx`, `apps/www/styles/globals.css`, `registry.json`, `LICENSE.md`
- react-bits: `AGENTS/SKILLS/review-animations/{SKILL.md,STANDARDS.md}`, `src/content/Animations/{ElectricBorder,GlareHover,StarBorder,Noise}/`, `src/constants/Pro.js`, `LICENSE.md`
- cult-ui: `apps/www/public/registry/styles/default/texture-overlay.json`, `LICENSE.md` · hyperui: `src/content/blog/animated-border-gradient-with-tailwindcss.mdx`, `LICENSE`
- `https://ui.aceternity.com/pricing` · 2026-08-22 — Standart: `teknesyum/skills/teknesyum-ui/SKILL.md` §2, §5.3, §5.4, §5.5, §5.6
