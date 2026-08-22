# ui-hareket — hareket kütüphaneleri

Mercek: alanın animasyonu bugün nasıl yazdığı. Depo verileri `gh api`, 2026-08-22.
Her sayı depo kaynağından okundu; dosya yolu satır içinde yazılı.

| Depo | Lisans | Yıldız | Açık issue | Son push | Son etiket |
|---|---|---|---|---|---|
| motiondivision/motion | MIT | 33.315 | 105 | 2026-08-20 | v13.1.1 (GitHub Releases yok, 404) |
| greensock/GSAP | **null** — GreenSock standard | 27.932 | 5 | 2026-04-13 | 3.15.0 (Releases yok, 404) |
| juliangarnier/anime | MIT | 72.338 | 115 | 2026-08-21 | v4.5.0 (2026-06-22) |
| formkit/auto-animate | MIT | 13.904 | 42 | 2026-07-10 | v0.10.0 (2026-07-10) |

## 0 · Konseyin sorusu: spring iptal edilebilir mi?

**Evet, edilebilir — ve standardın gerekçesini geçişten daha iyi karşılıyor. Ama iptal
edilebilirlik spring'den gelmiyor, Motion'ın değer mimarisinden geliyor.** Kanıt zinciri:

1. `packages/motion-dom/src/animation/interfaces/motion-value.ts:48` — yeni bir animasyon
   başlatılırken seçeneklere `velocity: value.getVelocity()` konuyor. Yani panel açılırken
   kullanıcı kapatırsa yeni spring, değerin **o anki konumundan ve o anki hızından** başlar.
2. CSS `transition` iptali konumu korur ama **hızı korumaz** — yeni geçiş sıfır hızdan başlar,
   harekette görünür bir kırılma olur. Spring'de hız devrolduğu için kırılma yok.
3. `packages/motion-dom/src/animation/NativeAnimationExtended.ts` — kaynak yorumu açıkça
   "WAAPI doesn't natively have any interruption capabilities" diyor. Motion bunu aşmak için
   ekrana çizmeyen bir JS animasyonu kurup iki kez örnekliyor, konum ve hızı böyle geri
   kazanıyor.
4. `.../generators/utils/pregenerate.ts` — WAAPI'ye giden spring 10 ms adımlarla, en çok
   10.000 ms'e kadar keyframe'e pişiriliyor (`linear()` easing). Pişmiş eğri iptal edilemez;
   iptal 3. maddedeki JS yeniden simülasyonuyla oluyor.

**İki tuzak — kural yazılırken bunlar yazılmazsa iddia çöker:**

- `.../generators/spring.ts:185-189` — kaynak yorumu: "Time-defined springs should ignore
  inherited velocity", ardından `springOptions.velocity = 0`. Yani `duration` veya
  `visualDuration`+`bounce` ile tanımlanan spring **hız devralmaz**. İptal edilebilirlik
  yalnızca fizik parametreli (`stiffness`/`damping`/`mass`) spring'de geçerli.
- Motion'ın `opacity` varsayılanı `type: "keyframes"`
  (`.../animation/utils/default-transitions.ts`). Bu, CSS `@keyframes` değil; MotionValue
  üstünde koşan iptal edilebilir bir tween. Standardın "keyframe" kelimesi ile Motion'ın
  `type: "keyframes"` değeri **aynı kelime, farklı şey**.

**Sonuç:** standardın gerekçesi (kullanıcı paneli kapatırsa bulunduğu yerden dönsün) sağlam
ve korunmalı; ama kuralın **kelimesi yanlış**. Ayrım geçiş/keyframe değil, **değer güdümlü**
(MotionValue, per-değer durum ve hız) ile **zaman çizelgesi güdümlü** (CSS `@keyframes`,
GSAP timeline, ham WAAPI) arasında. Standardı harfiyen okuyan biri Motion'ın kendi
varsayılanını yasaklar — bugün metin bu hataya açık.

## 1 · Alanın bugün yaptığı

**Motion — varsayılan geçiş tek değil, değere göre seçiliyor**
(`packages/motion-dom/src/animation/utils/default-transitions.ts`): transform → spring,
`scale` → daha sert ve kritik sönümlü spring, opacity/renk → tween, ikiden fazla keyframe →
uzun tween. Sayılar §4 tablosunda. Tasarım kararı şu: **hareket eden şey yaylı, görünürlük
değiştiren şey eğrili.** Standartta bu ayrım yok, tek bir süre ölçeği var.

**Motion — `prefers-reduced-motion` varsayılan olarak KAPALI.**
`packages/framer-motion/src/context/MotionConfigContext.tsx:72` → `reducedMotion: "never"`.
Açıldığında (`<MotionConfig reducedMotion="user">`) davranış
`.../animation/interfaces/visual-element-target.ts:146`: yalnızca `positionalKeys` için
`{ type: false }`, yani anında. Liste (`.../render/utils/keys-position.ts`):
`width, height, top, left, right, bottom` + tüm transform özellikleri. Opaklık ve renk kalır.

**anime v4.5.0** — `src/core/globals.js`: `duration 1000ms`, `ease 'out(2)'`,
`composition: replace`. Spring (`src/easings/spring/index.js:57-66`):
`mass 1, stiffness 100, damping 10, velocity 0`, `restDuration 200ms`, `maxDuration 60000ms`;
kaynak yorumunda Apple SwiftUI "perceived duration" formülü referans alınmış (WWDC 2023).
`src/core/consts.js` — `compositionTypes: replace 0, none 1, blend 2`. **`blend`**, çakışan
animasyonları üst üste toplayan katkısal mod; iptal probleminin Motion'dan farklı bir cevabı.

**auto-animate v0.10.0** (`src/index.ts`) — varsayılan `{ duration: 250, easing: "ease-in-out" }`.
Taşıma: FLIP, `translate(dx,dy) → translate(0,0)`. Ekleme: süre ×1.5, `ease-in`, üç kareli
eğri — ilk yarı görünmez bekleme (`offset: 0.5`), görünür hareket ~187 ms. Silme: `ease-out`,
`scale(1)/opacity 1 → scale(.98)/opacity 0`; silinen eleman `position:absolute` + sabit
`top/left/width/height` ile akıştan çıkarılıyor, bu değerler **animasyonlanmıyor**.
`prefers-reduced-motion`'a varsayılan olarak saygı gösteriliyor (`index.ts:888-893`).

**GSAP 3.15.0** — sürüm etiketleri var, GitHub Releases yok. Lisans §5'te.

## 2 · Standardın kaçırdığı

**a. `motion`'ın reduced-motion'ı kendiliğinden gelmiyor.** Nerede: `MotionConfigContext.tsx:72`,
varsayılan `"never"`. Standart §5.4 "`useReducedMotion` ve iptal edilebilir geçişler hazır
gelir" diyor — hook hazır gelir ama **politika gelmez**; `<MotionConfig reducedMotion="user">`
yazılmazsa Motion sistem ayarını yok sayar. **Alınmalı: evet** — standardın "sürüm çıkmaz"
saydığı erişilebilirlik hatasının React tarafındaki tam yeri. Girer: §5.4 + §8.

**b. Spring'in iki türü ayrılmamış.** Nerede: `spring.ts:185-189`. Standart `--tk-e-spring`'i
bir eğri sanıyor. Fizik parametreli spring hız devralır, süre parametreli devralmaz.
**Alınmalı: evet** — §0'daki iptal gerekçesi buna bağlı. Girer: §5.4, "Geçiş tercih edilir".

**c. Katkısal çakışma modu.** Nerede: anime `compositionTypes.blend`. **Alınmalı: hayır** —
standardın hareket bütçesi zaten çakışan animasyona izin vermiyor; `blend` sahne işidir.

**d. "Silinen elemanı akıştan çıkar, ölçüsünü animasyonlama" deseni.** Nerede: auto-animate
silme dalı. **Alınmalı: evet, tek satır olarak** — §5.4 mikro etkileşim tablosunun altına.

## 3 · Standardın haklı olduğu yerler

**Yalnız `opacity` ve `transform`.** Motion'ın `positionalKeys` listesi `width, height, top,
left, right, bottom`'ı animasyonlanabilir kabul ediyor. Standardın yasağı daha sıkı ve
gerekçesi (yerleşim yeniden hesabı) değişmedi; auto-animate bile bu ölçüleri
animasyonlamıyor — alanın titiz ucu standartla aynı yerde. Koru.

**360 ms üst sınırı.** Motion'ın çok keyframe'li varsayılanı 800 ms, anime'nin geneli 1000 ms;
ikisi de sahne için ayarlanmış. Standardın tavanı bilinçli ve kütüphane varsayılanını
**ezmesi** doğru. Koru — "kütüphane varsayılanı token değildir" cümlesi §5.4'e eklenmeli.

**İptal edilebilirlik ilkesi.** İlke doğru, yalnız kelimesi düzeltilmeli (§0). Moda diye
gevşetmek kayıp olurdu: GSAP timeline, ham WAAPI ve CSS `@keyframes` hâlâ iptal edilemez
hareket üretiyor.

**Uygulama içi `motion` / tanıtım sayfası `gsap` ayrımı.** GSAP'ın lisansı (§5) bu ayrımı
teknik gerekçenin ötesinde de haklı çıkarıyor.

## 4 · Ölçü ve token

| Ne | Standart | Motion | anime v4 | auto-animate |
|---|---|---|---|---|
| Panel, diyalog | `--tk-t-base` 240ms | opacity/renk **300ms** | genel **1000ms** | **250ms** |
| Görünüm değişimi | `--tk-t-slow` 360ms (tavan) | >2 keyframe **800ms** | 1000ms | ekleme 250×1.5=**375ms** |
| Giren / çıkan eğri | `(0.2,0,0,1)` / `(0.4,0,1,1)` | — (transform'da spring) | `out(2)` | `ease-in` / `ease-out` |
| Genel tween eğrisi | — | `[0.25, 0.1, 0.35, 1]` | `out(2)` | `ease-in-out` |
| Spring (basma) | `(0.34, 1.36, 0.64, 1)` | — | — | — |
| Spring — transform | yok | `stiffness 500, damping 25, restSpeed 10` | `stiffness 100, damping 10, mass 1` | yok |
| Spring — scale | yok | `stiffness 550, damping 30` (hedef 0 → `2√550`) | aynı genel | yok |
| Spring — süre tabanlı | yok | `duration 800ms, bounce 0.3, visualDuration 0.3s` | perceptual duration + bounce | yok |
| Spring üst süre sınırı | yok | 10.000ms | 60.000ms | yok |
| Basma / çıkış ölçeği | `scale(0.98)` | — | — | `scale(.98)` |
| Liste kademesi | 40ms, en çok 6 eleman | varsayılanı bulamadım | bulamadım | kademe yok |

`--tk-t-instant` 90ms ve `--tk-t-fast` 160ms'in kütüphane karşılığı yok — bunlar tek bir
varsayılan süre tutuyor, ölçek tutmuyor. Boş hücreler bilgi değil kavram eksikliği.
Bundle boyutu iddiaları (`motion/mini` "~2.6kb" tipi) **doğrulanamadı** — README'de sayı yok.

## 5 · Lisans

**motion, anime v4, auto-animate — MIT.** Üçünde de engel yok; anime v3'teki ticari lisans
şartı v4'te kalkmış (`package.json`, v4.5.0).

**greensock/GSAP — OSI lisansı DEĞİL.** GitHub lisans alanı `null`; README §License
"GreenSock's standard no-charge license"a yönlendiriyor. gsap.com/standard-license metnine
göre ticari kullanım ve tüm eklentiler ücretsiz, **ama** (a) rakip ürün için tersine
mühendislik yasak, (b) "Webflow'un görsel animasyon kurma yeteneğiyle rekabet eden, kodsuz
animasyon kurdurtan araçlarda" kullanım yasak, (c) telif/marka bildirimleri kaldırılamaz.
Standart §5.6 "MIT, Apache-2.0, BSD, CC0" diyor — GSAP listede yok. §5.5'teki **"Lisans
engeli yok"** cümlesi fazla kesin; "ücret engeli yok, lisans OSI değil" olmalı. Teknesyum
kodsuz animasyon aracı üretmediği sürece pratik engel yok, ama cümle yanlış.
