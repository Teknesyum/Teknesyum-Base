# ui-bilesen — modern React bileşen kütüphaneleri

Mercek: bileşenin bugün nasıl kurulduğu. Beş depo, hepsine erişildi.

| Depo | Son push | Son sürüm | Yıldız | Açık issue | Lisans |
|---|---|---|---|---|---|
| shadcn-ui/ui | 2026-08-21 | `shadcn@4.19.0` (2026-08-21) | 121.851 | 2.307 | MIT |
| radix-ui/primitives | 2026-08-08 | GitHub release yok, son etiket `1.6.7` | 19.196 | 344 | MIT |
| mui/base-ui | 2026-08-21 | `v1.7.0` (2026-08-04) | 10.690 | 422 | MIT |
| chakra-ui/ark | 2026-08-22 | `@ark-ui/vue@5.39.0` (2026-08-22) | 5.350 | 5 | MIT |
| mantinedev/mantine | 2026-08-22 | `9.5.2` (2026-08-22) | 31.595 | 43 | MIT |

Kaynak: `gh api repos/<owner>/<repo>` ve `/releases/latest`, 2026-08-22.

## 1 · Alanın bugün yaptığı

**Alan ikiye ayrılmış: davranış katmanı ve stil katmanı.** Radix, Base UI ve Ark hiç ölçü
vermiyor — ne yükseklik, ne padding, ne radius. Verdikleri şey `data-*` durum nitelikleri
ve ölçülmüş CSS değişkenleri. Mantine tam kütüphane, ölçüyü kendisi veriyor. shadcn ise
stili **kopyalanan dosyanın içine** yazıyor.

**Ölçülmüş değeri CSS değişkeni olarak dışarı vermek yerleşik desen.**
`packages/react/popper/src/popper.tsx:256-259, 315` → `--radix-popper-available-width`,
`--radix-popper-available-height`, `--radix-popper-anchor-width`,
`--radix-popper-transform-origin`. `packages/react/collapsible/src/collapsible.tsx:217`
→ `--radix-collapsible-content-height`. Base UI'da karşılığı `--available-height`,
`--anchor-width`, ayrıca iç içe diyalogda `--nested-dialogs`
(`examples/tanstack-start-tailwind-css/src/components/dialog.tsx`).

**Çıkış animasyonu iki farklı mekanizmayla çözülmüş, ikisi uyumsuz.**
Radix `Presence` hesaplanmış `animation-name` okuyor; `none` ise düğüm anında sökülüyor
(`packages/react/presence/src/presence.tsx:73-88`). Yani **Radix ile çıkış animasyonu
keyframe olmak zorunda** — CSS `transition` çalışmaz. Base UI aynı problemi Web Animations
API ile çözüyor: `packages/react/src/internals/useAnimationsFinished.ts:99` →
`element.getAnimations()` üzerinden `Promise.all(... .finished)`. Bu hem keyframe hem
transition'ı bekler. Base UI'ın çıkış kancası `data-starting-style` / `data-ending-style`
(`packages/react/src/internals/stateAttributesMapping.ts`).

**shadcn keyframe'e geçmiş.** `apps/v4/app/globals.css:2` → `@import "tw-animate-css"`.
Diyalog: `data-[state=open]:animate-in fade-in-0 zoom-in-95 duration-200`, kapanışta
`animate-out fade-out-0 zoom-out-95` (`registry/new-york-v4/ui/dialog.tsx:42,64`). Tooltip
yön farkındalıklı: `data-[side=bottom]:slide-in-from-top-2` +
`origin-(--radix-tooltip-content-transform-origin)` (`tooltip.tsx:45`).

**Mantine animasyonu bileşenin içine almış ama saf transition tutmuş.**
`Transition/transitions.ts` 22 adlı ön ayar (`fade`, `pop`, `scale-y`, `skew-up`…), her biri
yalnızca `opacity` + `transform`; `transitionProperty` alanı bunu açıkça sınırlıyor.
Varsayılan `{ duration: 100, transition: 'fade' }`
(`Transition/get-transition-props/get-transition-props.ts`).

---

## 2 · Standardın kaçırdığı

**a) Ölçüyü tek düğmeden türetmek.** shadcn'de `--radius: 0.625rem` tek kaynak; `sm/md/lg/
xl/2xl/3xl/4xl` hepsi `calc(var(--radius) * 0.6…2.6)` (`globals.css:50-56,100`). Mantine'de
her `rem()` çıktısı `calc(Xrem * var(--mantine-scale))` (`core/utils/units-converters/rem.ts:6`),
`theme.scale: 1` varsayılan (`default-theme.ts:10`). Standart §5.3 ve components.md dört
yarıçapı elle sayıyor (16/12/8/6), türetmiyor.
**Alınmalı — evet**, tek satırlık bir `--tk-radius` ve türetme, dört sabitten daha az
kırılgan. Girer: **§5.3** ve `references/components.md`.

**b) Yoğunluk ekseni.** Mantine `Button.module.css` iki paralel set veriyor: normal
`30/36/42/50/60px` ve compact `22/26/30/34/40px`. Standartta buton/giriş yüksekliği için
**hiç sayı yok** — yalnız pencere düğmesi 42×30, hücre 24×24, rozet 12×12 var.
**Alınmalı — evet**, ama tek yoğunluk yeter: eksik olan "yoğunluk" değil, "buton yüksekliği
basamağı". Girer: **§5.3**.

**c) `data-*` durum sözleşmesi.** Beş deponun beşi de görsel durumu prop'la değil nitelikle
veriyor (`data-state`, `data-open`, `data-side`, Ark'ta `data-scope`/`data-part`). Standart
bileşen durumlarını Tailwind sınıf dizesiyle koşullu yazıyor (`components.md` Toggle
örneğindeki `{on ? … : …}`). **Alınmalı — evet**, nitelik tabanlı durum stili tema
değiştirmeyi ve WPF/CSS ayrımını kolaylaştırır. Girer: **§5** kalıplar.

**d) Konumdan gelen `transform-origin`.** Radix ve Base UI popover/tooltip'in hangi kenardan
açıldığını `--*-transform-origin` ile veriyor; shadcn bunu doğrudan kullanıyor
(`tooltip.tsx:45`). Standardın §5.4 "8 DIP kayma + opaklık" kuralı yön bilgisi taşımıyor.
**Alınmalı — evet**, tek token, giriş animasyonunu doğru kenardan başlatır. Girer: **§5.4**.

**e) Çıkış animasyonunu kim bekliyor.** Standart giriş animasyonunu tarif ediyor, **çıkışı
hiç tarif etmiyor** — React'te asıl zor kısım o. Base UI'ın `getAnimations().finished`
yaklaşımı transition'ı da bekleyen tek çözüm.
**Alınmalı — evet**, bu olmadan §5.4'ün "geçiş tercih edilir" kuralı React'te uygulanamaz.
Girer: **§5.4**.

---

## 3 · Standardın haklı olduğu yerler

**Keyframe yerine geçiş tercihi — korunmalı, ama gerekçesi güçlendi.** Alanın çoğunluğu
(shadcn `animate-in`, Ark rehberi `animation: fadeIn 300ms`, Radix `Presence`) keyframe'e
gitti. Sebep estetik değil teknik borç: Radix'in unmount tespiti yalnız `animation-name`
okuduğu için keyframe **zorunda** kaldılar. Base UI aynı problemi Web Animations API ile
çözünce transition'a dönebildi. Yani standardın tercihi doğru; yanlış olan Radix'in eski
mekanizması. **Sonuç: standart korunur, taban kütüphane seçimi bu kurala göre yapılır.**

**`prefers-reduced-motion` zorunluluğu — korunmalı.** Mantine'de
`respectReducedMotion: false` **varsayılan** (`default-theme.ts:24`); açıldığında da süreyi
sıfırlıyor, yani opaklığı da öldürüyor (`use-transition.ts:41-42,58`). shadcn'in kendi
CSS'inde `prefers-reduced-motion` bloğu yalnız `.shimmer` yardımcı sınıfı için var
(`packages/shadcn/src/tailwind.css:623-629`) — `animate-in`/`animate-out` kapsanmıyor.
Standardın "zorunlu, opaklık kalır" kuralı alanın ikisinden de daha doğru.

**Yalnız `opacity` + `transform`.** Mantine'in 22 ön ayarının 22'si de bu ikisiyle sınırlı —
bağımsız doğrulama. Standart yalnız kuralı yazmakla kalmayıp `width` animasyonunu açıkça
yasaklamış; bu doğru ve alanın en olgun örneğiyle örtüşüyor.

**360 ms tavanı.** Ark rehberinin örneği 300 ms, Base UI örneği 150 ms, shadcn 200 ms,
Mantine 100 ms. Hiçbiri 360'ı geçmiyor. Tavan gerçekçi.

## 4 · Ölçü ve token — yan yana

| | Standart §5.4 / components.md | shadcn | Base UI (örnek) | Mantine | Ark (rehber) | Radix |
|---|---|---|---|---|---|---|
| Süre | 90 / 160 / 240 / 360 ms | 200 ms (dialog) | 150 ms | 100 ms varsayılan | 300 ms | yok |
| Easing | `cubic-bezier(0.2,0,0,1)` out, `(0.4,0,1,1)` in, `(0.34,1.36,0.64,1)` spring | tw-animate-css varsayılanı (doğrulanmadı) | bulamadım | `'ease'` | `ease-out` / `ease-in` | yok |
| Yarıçap | 16 / 12 / 8 / 6 px sabit | `--radius: 10px` × 0.6…2.6 türetme | yok | 2 / 4 / 8 / 16 / 32 px | yok | yok |
| Aralık | 4 / 8 / 12 / 16 / 24 px | Tailwind 4px adım | yok | 10 / 12 / 16 / 20 / 32 px | yok | yok |
| Buton yüks. | **tanımsız** | 24/32/36/40 px (xs/sm/def/lg) | yok (örnekte h-8) | 30/36/42/50/60 + compact 22/26/30/34/40 | yok | yok |
| Odak halkası | 2 DIP, 3:1, anında | `ring-[3px]` + `ring-ring/50` | `outline-2 -outline-offset-1` | `focusRing: 'auto'` | yok | yok |
| Global ölçek | yok | `--radius` tek düğme | yok | `--mantine-scale` çarpanı | yok | yok |

**Standardın kendi içinde iki farklı süre ölçeği var.** §5.4 `90/160/240/360` diyor;
`references/components.md` "Geçiş: 200ms mikro, 300ms renk/glow, 500ms panel aç-kapa" diyor.
500 ms, §5.4'ün 360 ms tavanını aşıyor. Aynı dosyadaki ilerleme çubuğu
`transition-[width] duration-500` — hem yasaklı özelliği hem tavanı ihlal ediyor. Butonlarda
`transition-all` de "yalnız opacity ve transform" kuralıyla çelişiyor. **Bu bir tarama
bulgusu değil, iç tutarsızlık; konseyin ilk kararı bu olmalı.**

---

## 5 · Lisans

Beşi de **MIT** (`gh api repos/<repo> → license.spdx_id`). Kod ya da varlık alınmasında
§5.6 engeli yok; telif satırı korunur.

Not: shadcn'in `tw-animate-css` bağımlılığı ayrı bir depodur, lisansı **doğrulanmadı**.
Ark'ın motor katmanı Zag.js ayrı depodur, lisansı **doğrulanmadı**.

## Şüpheli / riskli

- **shadcn 2.307 açık issue** — kopyala-yapıştır modelinde issue akışının ne kadarının
  bakım borcu olduğu ölçülemez.
- **Radix'in GitHub release'i yok**; sürüm izlemesi npm etiketlerinden yapılır, son etiket
  `1.6.7`. Sürüm tarihi bu yolla **doğrulanamadı**.
- **Base UI v1.7.0**, depo 2024'te açılmış — API'si en genç olan bu; `data-starting-style`
  sözleşmesinin uzun ömürlü olduğu **doğrulanamadı**.
- Kütüphanelerin hiçbirinde performans iddiası bulunmadı; ölçüm yapılmadı.
