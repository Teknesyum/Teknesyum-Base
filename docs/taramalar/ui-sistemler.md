# ui-sistemler — tam tasarım sistemleri (M3, Apple HIG, Fluent 2, Carbon, Primer)

Mercek: büyük kuruluşların hareket kuralları. Sayılar depo kaynak dosyalarından okundu.

## 0 · Depo durumu (gh api, 2026-08-22)

| Depo | Son push | Son sürüm | Açık issue | Yıldız | Lisans |
|---|---|---|---|---|---|
| material-components/material-web | 2026-08-21 | v2.5.0 (2026-07-15) | 179 | 11.191 | Apache-2.0 |
| microsoft/fluentui | 2026-08-21 | alpha etiketi (2026-05-26) | 759 | 20.224 | MIT (API `NOASSERTION`, LICENSE MIT) |
| carbon-design-system/carbon | 2026-08-22 | v11.114.0 (2026-08-12) | 1.050 | 9.377 | Apache-2.0 |
| primer/design | 2025-07-02 | sürüm yok | 41 | 759 | MIT — **arşivlenmiş** |
| primer/primitives | 2026-08-18 | @primer/primitives@11.10.0 (2026-07-30) | 11 | 402 | MIT |

## 1 · Alanın bugün yaptığı

**Material 3 — 16 süre, 10 easing.** `tokens/versions/v0_192/_md-sys-motion.scss`:
`duration-short1..4` 50/100/150/200 ms, `medium1..4` 250/300/350/400, `long1..4`
450/500/550/600, `extra-long1..4` 700/800/900/1000. Easing üç aile × üç yön (`standard`,
`standard-accelerate`, `standard-decelerate`; aynısı `emphasized` ve `legacy` için) artı
`linear`. `easing-emphasized` = `cubic-bezier(0.2, 0, 0, 1)` — `--tk-e-out` ile birebir aynı.

**M3 Expressive — süre değil yay.** Compose `MotionScheme.kt` (androidx-main) iki şema
veriyor: `standard()` ve `expressive()`. Her şemada altı spec — iki eksen × üç hız:
`spatial` (konum/boyut) ve `effects` (renk/opaklık), `fast`/`default`/`slow`.
Değerler (`ExpressiveMotionTokens.kt` / `StandardMotionTokens.kt`, damping/stiffness) —
spatial: default 0.8/380 · fast 0.6/800 · slow 0.8/200 (standard şemada 0.9/700 · 0.9/1400
· 0.9/300); effects 1.0/1600 · 1.0/3800 · 1.0/800, **iki şemada da aynı**. Yani expressive'in
tamamı `spatial` eksenindeki damping düşüşünden ibaret; renk/opaklığa dokunmuyor.
`material-web` web token'larında **spring yok** (`versions/latest/...` 404) — expressive
şu an Compose tarafında.

**Fluent 2 — 8 süre, 9 eğri.** `packages/tokens/src/global/durations.ts`: `UltraFast` 50,
`Faster` 100, `Fast` 150, `Normal` 200, `Gentle` 250, `Slow` 300, `Slower` 400,
`UltraSlow` 500 ms. `curves.ts`: `curveAccelerate{Max,Mid,Min}`,
`curveDecelerate{Max,Mid,Min}`, `curveEasyEase`, `curveEasyEaseMax`, `curveLinear` —
**yön × şiddet** matrisi, anlamsal ad yok. `react-motion` paketi `useIsReducedMotion` ile
`matchMedia` aboneliği kurup sonucu `animateAtoms(..., { isReducedMotion })` seçeneğine
geçiriyor (`factories/createMotionComponent.ts`); indirgeme ayrıntısı doğrulanamadı.

**Carbon — 6 süre, 3 easing × 2 kip.** `packages/motion/src/dtcg/motion.json`
(@carbon/motion 11.50.0): `fast-01` 70, `fast-02` 110, `moderate-01` 150,
`moderate-02` 240, `slow-01` 400, `slow-02` 700 ms. Easing adları **yön** —
`standard`/`entrance`/`exit`; her biri iki kipte: `productive` (iş uygulaması) ve
`expressive` (öne çıkan an); `entrance.productive` `[0,0,.38,.9]` ↔ `expressive` `[0,0,.3,1]`.
İkinci katman `surfaces.json`: `disclosure`, `contextual`, `stretch`, `expand`, `invoke`
adlı **niyet reçeteleri** — süre + giriş/çıkış easing + from/to stilleri tek pakette.
`contextual` çıkışta `opacity: 0, transform: scale(0.96)`; `disclosure` `blockSize: 0 → auto`;
`stretch` `clip-path: inset(...)` — Carbon yerleşim animasyonunu yasaklamıyor.

**Primer — iki katman, üstelik LLM notlu.** (`primer/design` arşiv; canlı token'lar
`primer/primitives`.) `base/duration` 0-1000 ms arası 13 basamak. Üstünde
`functional/motion`: süre `micro` 100, `short` 200, `medium` 300, `long` 500;
easing `hover`/`enter`/`exit`/`move`/`linear`; ve **birleşik `transition` token'ları**:
`hover` (micro+hover), `stateChange` (short+move), `enter` (medium+enter), `exit`
(short+exit). Her token'da `$extensions['org.primer.llm']` alanı var — `usage` listesi ve
`rules` cümlesi (süre kökünde: "MUST keep UI interactions ≤300ms … NEVER exceed 500ms").
Token dosyası aynı zamanda modelin okuyacağı kural metni.

**Apple HIG.** Motion sayfasında **hiçbir süre ya da eğri sayısı yok** (sayfa JSON'u
okundu; geçen tek sayı oyunlar için 30-60 fps). İlkeler: hareketi amaçlı ekle; **hareket
isteğe bağlı olsun** — bilgiyi yalnız hareketle iletme; **sık tekrarlanan etkileşimlere
hareket ekleme**; ve **"Let people cancel motion"** — kullanıcıyı animasyon bitene kadar
bekletme. Sayısal karşılık HIG'de değil SwiftUI'da: `Animation.smooth` temel sekme 0,
`.snappy` 0.15, `.bouncy` 0.3 (varsayılan süre belgede sayı olarak görünmedi — doğrulanamadı).

## 2 · Standardın kaçırdığı

**a. Yön × şiddet ayrımı yok.** M3 `emphasized`/`standard` ailesini, Carbon
`productive`/`expressive` kipini ayırıyor; standartta tek "giren" eğrisi var, "bu diyalog
önemli, bu tooltip değil" ayrımı ifade edilemiyor. **Alınmalı — ama eğri ekleyerek değil:**
M3'ün `emphasized` değeri zaten `--tk-e-out` ile aynı, ayırt edici olan süre. Vurgulu
geçiş = aynı eğri + bir üst süre kademesi. §5.4 süre tablosunun altına tek satır.

**b. Birleşik `transition` token'ı yok.** Primer süre+eğri çiftini tek token'a bağlıyor,
Carbon `surfaces` ile from/to stillerini de içine koyuyor. Standart ikisini ayrı veriyor —
yanlış çift (`--tk-t-slow` + `--tk-e-in`) mümkün. **Alınmalı.** Dört reçete yeter: hover,
durum değişimi, giriş, çıkış. §5.4.

**c. Çıkış girişten kısa değil.** Primer `exit` = 200, `enter` = 300; gerekçe token
dosyasında yazılı ("Shorter than enter to feel snappy"). **Alınmalı — tek satır kural**,
§5.4 mikro etkileşim tablosuna.

**d. Token'ın yanında makine okunur kullanım kuralı yok.** Primer her token'a `usage` +
`rules` iliştiriyor. Bu evde arayüzü çoğu zaman model yazıyor; kuralın SKILL.md
düzyazısında olması ile token'ın yanında olması aynı şey değil. **Alınmalı — ucuz haliyle:**
`assets/theme.css` içinde her süre token'ının yanına tek satır "nerede" notu.

**e. "Hareketi iptal edilebilir tut" kullanıcı tarafından yazılmamış.** Standart geçiş
tercihini teknik gerekçeyle savunuyor (keyframe sıçrar); Apple aynı şeyi kullanıcı hakkı
olarak yazıyor. **Alınmalı — tek cümle**, var olan kuralın gerekçesini güçlendirir. §5.4.

**f. Yay (spring) ekseni yok.** M3 Expressive ve SwiftUI yayı merkeze aldı; standartta yay
yalnız `--tk-e-spring` ve yalnız basma için. **Alınmamalı** — gerekçe §3'te.

## 3 · Standardın haklı olduğu yerler

**Yay eksenini açmamak doğru.** M3'ün kendi verisi standardı destekliyor: expressive şema
sekmeyi **yalnız `spatial`** eksende artırıyor, `effects` ekseninde damping üç hızda da 1.0
— renk/opaklık hiçbir zaman sekmiyor. Standardın "spring yalnızca basma" kuralı bunun daha
dar ama aynı yönde hali. Yay eksenini genel açmak iptal edilebilirlikle de çelişir: CSS'te
yay `linear()` ile örneklenmiş sabit eğridir, yarıda kesilince hızı korumaz.

**M3 "expressive" ile "süs değil geri bildirim" ilkesi çelişmiyor.** Expressive daha uzun
ya da daha çok animasyon demiyor: değişen miktar değil karakter — damping düşüyor, süre
artmıyor. Standardın yasakladıkları M3 expressive'de de yok.

**360 ms tavanı savunulabilir.** M3'ün 1000, Carbon'un 700, Fluent'in 500 ms basamağı var
ama üçü de bunları hero geçişi için tanımlıyor (Carbon `slow-02`: "background dimming, large
hero transitions"). Primer'in kuralı standartla aynı yerde: "MUST keep UI interactions ≤300ms".

**Yalnız `opacity`/`transform` kuralı alandan katı ve haklı.** Carbon'un kendi reçeteleri
`blockSize: 0 → auto` ve `clip-path` animasyonluyor — ikisi de standardın yasakladığı
sınıfta. Carbon bunu React + Motion adaptörüyle telafi ediyor: ek çalışma zamanı ve WPF'te
karşılığı olmayan bir mekanizma. Standardın dört platform kapsamı bu telafiyi taşımaz.

**Az basamak fazla basamaktan iyi.** M3'ün 16 süresinin 12'si standardın tavanının üstünde;
Primer'in 13 temel basamağı yalnız 4 anlamsal ada bağlanıyor — Primer bile pratikte dört
kademe kullanıyor. Standardın dört kademesi eksik değil.

## 4 · Ölçü ve token — yan yana

| Rol | Teknesyum | M3 | Fluent 2 | Carbon | Primer (anlamsal) |
|---|---|---|---|---|---|
| mikro / hover | `--tk-t-instant` 90 | short1-2 50/100 | UltraFast 50, Faster 100 | fast-01 70 | micro 100 |
| küçük geçiş | `--tk-t-fast` 160 | short3-4 150/200 | Fast 150, Normal 200 | fast-02 110, moderate-01 150 | short 200 |
| panel/diyalog | `--tk-t-base` 240 | medium1-2 250/300 | Gentle 250, Slow 300 | moderate-02 240 | medium 300 |
| görünüm değişimi | `--tk-t-slow` 360 | medium4 400 | Slower 400 | slow-01 400 | long 500 |
| tavan üstü | **yok** | 450-1000 | UltraSlow 500 | slow-02 700 | 600-1000 |
| süre basamağı | **4** | 16 | 8 | 6 | 13 temel / 4 anlamsal |
| giriş eğrisi | `--tk-e-out` .2,0,0,1 | emphasized .2,0,0,1 | curveDecelerateMid 0,0,0,1 | entrance.productive 0,0,.38,.9 | easeOut .3,.8,.6,1 |
| çıkış eğrisi | `--tk-e-in` .4,0,1,1 | emph-accelerate .3,0,.8,.15 | curveAccelerateMin .8,0,.78,1 | exit.productive .2,0,1,.9 | easeIn .7,.1,.75,.9 |
| eğri sayısı | **3** | 10 | 9 | 6 (3 ad × 2 kip) | 5 temel / 5 anlamsal |
| birleşik reçete | yok | yok | yok | 5 `surface` | 4 `transition` |
| yay | yalnız basma | Compose: 6 spec × 2 şema | yok | yok | yok |

`--tk-e-out` M3 `easing-emphasized` ile, `--tk-e-in` M3 `easing-legacy-accelerate` ile aynı.

## 5 · Lisans

Kod/varlık alınmıyor; alınan şey ad ve sayı deseni. material-web ve carbon **Apache-2.0**,
fluentui **MIT** (GitHub API `NOASSERTION` dönüyor, LICENSE dosyası MIT), primer/primitives
ve primer/design **MIT** — dördü de OSI onaylı. Apple HIG **tescilli**: ilke olarak okunur,
alıntılanmaz. "Material" / "Fluent" marka adları token adına konmaz.

## Kaynaklar

- `gh api repos/<beş depo>` + `/releases/latest` — 2026-08-22
- material-web `tokens/versions/v0_192/_md-sys-motion.scss` · androidx-main `compose/material3/.../MotionScheme.kt` ve `tokens/{MotionTokens,ExpressiveMotionTokens,StandardMotionTokens}.kt`
- fluentui `packages/tokens/src/global/{durations,curves}.ts` · `react-motion/library/src/{hooks/useIsReducedMotion.ts, motions/motionTokens.ts, factories/createMotionComponent.ts}`
- carbon `packages/motion/src/{dtcg/motion.json, dtcg/surfaces.json, tokens.ts, surfaces.ts, package.json}` · primer/primitives `src/tokens/{base,functional}/motion/*.json5`
- developer.apple.com HIG "Motion" (tutorials/data JSON); SwiftUI `Animation.smooth/snappy/bouncy` · Standart: `teknesyum-ui/SKILL.md` §5.4, `assets/theme.css`
