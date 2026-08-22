# ui-token — token ve renk sistemleri merceği

Depolar: `argyleink/open-props`, `radix-ui/colors`, `style-dictionary/style-dictionary`
(eski adı `amzn/style-dictionary`), `tailwindlabs/tailwindcss`, `chakra-ui/panda` —
beşine de erişildi. Standart tarafında okunanlar: `SKILL.md` §2/§3/§5.3/§5.4/§8.1 ve
`assets/theme.css`, `assets/Theme.xaml`, `assets/Palette.cs`.

---

## 1 · Alanın bugün yaptığı

**Radix Colors** — 12 kademe, her kademenin tek bir işi var: 1 app zemini · 2 ince zemin ·
3 bileşen zemini · 4 hover · 5 aktif/seçili · 6 ince kenarlık · 7 kenarlık ve odak halkası ·
8 hover kenarlığı · 9 dolu zemin · 10 dolu hover · 11 düşük kontrast metin · 12 yüksek
kontrast metin. Kontrast **garanti**: 11 ve 12, aynı ölçeğin 2. kademesi üstünde APCA
Lc 60 / Lc 90 taahhüt ediyor (docs "Understanding the scale"). Açık/koyu eşleşmesi kademe
numarasıyla: `cyan9` iki temada da "dolu zemin", hex değişiyor (`src/dark.ts`:
`cyan9 #00a2c7`, `cyan11 #4ccce6`, `cyan12 #b6ecf7`). Her ölçeğin `A` (alfa) ve `P` (P3)
varyantı ayrı yayımlanıyor — cam/overlay için elle `rgba()` yazılmıyor.

**Open Props** — `props.easing.css`: `--ease-out-1..5`, `--ease-in-1..5`,
`--ease-in-out-1..5`, ayrıca `--ease-elastic-*`, `--ease-squish-*`, `--ease-step-*`.
`props.shadows.css` gölgeyi sabit yazmıyor, `--shadow-color` + `--shadow-strength`
üstünden `calc()` ile üretiyor; tek değişken değişince altı kademe birden kayıyor.
**Süre ölçeği yok** — süreler `--animation-fade-in: fade-in .5s var(--ease-3)` gibi
kısayolların içine gömülü.

**Tailwind v4** — `packages/tailwindcss/theme.css`'te token'lar CSS değişkeni ve isim
uzayı (`--color-*`, `--ease-*`, `--radius-*`, `--text-*`) doğrudan utility üretiyor.
Varsayılanlar: `--ease-in: cubic-bezier(0.4,0,1,1)`, `--ease-out: cubic-bezier(0,0,0.2,1)`,
`--default-transition-duration: 150ms`, `--radius-xs..4xl` = 2/4/6/8/12/16/24/32px.
Süre için ayrı isim uzayı yok.

**Panda** — 24 token kategorisi (colors, durations, easings, shadows, radii, z-index,
assets, cursor...). Ayırıcı özellik `semanticTokens`: bir token `base` ve `_dark`
koşullarıyla iki değer taşıyor, tüketici tarafta tek isim kalıyor.

**Style Dictionary v5.5.2** — tek JSON kaynaktan çok platform. Yerleşik biçimler
(`lib/enums/formats.js`): `css/variables`, `scss/*`, `less/*`, `stylus/variables`,
`javascript/*`, `typescript/module-declarations`, `json/*`, `android/*`, `ios/*`,
`compose/object`. **XAML yerleşik değil.**

---

## 2 · Standardın kaçırdığı

**(a) Neon palet kendi 7:1 kuralını çiğniyor.** §2 "Metin/zemin kontrastı 7:1 altına
inemez" diyor. WCAG 2.1 relative luminance ile hesaplandı:

| Renk | on `#000` | on `surface` | §3'te metin rolü var mı |
|---|---|---|---|
| neon-blue `#00f3ff` | **15.26** | 14.49 | evet (başlık, etiket, hero) — geçiyor |
| success `#34d399` | **10.92** | 10.37 | durum metni — geçiyor |
| neon-pink `#ff00ea` | **6.44** | 6.11 | **evet — §3 "Mono değer" satırı** |
| neon-purple `#b026ff` | **4.57** | 4.33 | hayır (scrollbar, ikincil buton) |

Yani her mono sayı, ID ve süre 7:1'in altında yazılıyor — göz kararı değil, ölçülebilir bir
iç çelişki. Radix bunu kademe ayırarak çözüyor: aynı hue'nun **dolu zemin** kademesi (9-10)
ile **metin** kademesi (11-12) farklı hex; bizde tek hex iki işi birden yapıyor.
**Alınmalı mı — evet**, ama 12 kademe tümüyle değil: her neon renge bir "metin varyantı"
(pembe ve mor için daha açık ton) yeter. §2'ye girer.

**(b) Üç token dosyası elle senkron ve şimdiden ayrışmış.** `SKILL.md` §2 `surface`ı
`#0a0a0c` diyor; `theme.css` `#08090a`, `Theme.xaml` `#F208090A`, `Palette.cs` `#08090A`.
Belge ile üç varlık dosyası aynı fikirde değil — Style Dictionary'nin çözdüğü sorun bu.
**Alınmalı mı — koşullu evet**, §4'e bak. §8.1'e girer.

**(c) `theme.css` Tailwind v4 `@theme` bloğunu yarım kullanıyor.** `@theme` içinde yalnız
`--color-*` ve `--font-*` var; `--tk-r-*`, `--tk-t-*`, `--tk-e-*`, `--tk-glow-*` ayrı bir
`:root` bloğunda. Sonuç: yarıçap, süre ve easing için utility üretilmiyor,
`rounded-[var(--tk-r-box)]` yazmak gerekiyor. Tailwind isim uzayına taşınırsa
(`--radius-tk-box`, `--ease-tk-out`) utility bedava gelir. **Alınmalı mı — evet**,
maliyeti sıfıra yakın. §8.1'e girer.

**(d) Alfa varyantı token'lanmamış.** §2 opaklık merdiveni veriyor (`/10 /20 /30 /50-60`)
ama karşılığı token değil, kullanım yerinde `rgba()` yazılıyor; `Theme.xaml`'da hiç yok.
Radix her ölçeğin `A` varyantını ayrı yayımlıyor. **Alınmalı mı — evet, kısıtlı**: üç renk
× beş basamak = 15 token, XAML'da `SolidColorBrush` olarak da gerekli. §2'ye girer.

**(e) Semantik katman yok.** Bizde `--tk-blue` doğrudan kullanılıyor; Panda ve Radix'te
araya `accent`/`danger` rol katmanı giriyor. **Alınmalı mı — hayır (şimdilik)**: tema tek
ve neon; ikinci tema yokken semantik katman soyutlama borcundan ibaret.

---

## 3 · Standardın haklı olduğu yerler

**Dört kademeli süre ölçeği doğru, alanda karşılığı zayıf.** Open Props'ta süre ölçeği hiç
yok, Tailwind v4'te tek bir `--default-transition-duration: 150ms` var. `instant/fast/
base/slow` ayrımı "hangi hareket ne kadar sürer" sorusunu token düzeyinde cevaplıyor;
alanın çoğu bunu çağrı yerine bırakıyor. Koru.

**Ara gri yasağı doğru.** Radix 11. kademeyi "low-contrast text" diye meşrulaştırıp APCA
Lc 60 ile sınırlıyor — soluk metni kurala bağlıyor ama yine de üretiyor. Bizde ara gri yok.
Koyu neon zeminde bu daha güvenli: Lc 60 kâğıtta yeterli, `#000` üstünde ve neon çevresinde
göz yorucu. Koru — (a) maddesi bundan ayrı, o hiyerarşi değil ölçüm hatası.

**Sabit ölçek, jeneratif ölçek değil.** Open Props 6 aile × 5 kademe = 30'dan fazla eğri
sunuyor, seçim yükü kullanıcıda. Bizde üç eğri var ve her birinin yazılı görevi var
(`e-spring` yalnız basma geri bildirimi). Token sayısını az tutmak burada özellik. Koru.

**Tam siyah zemin bilinçli sapma.** Radix koyu temada zemin için 1-2. kademeyi (`#0b161a`
gibi hue'lu koyu) öneriyor, biz `#000000` diyoruz. Neon vurgunun okunması için zeminin
nötr olması gerekiyor; Radix'in hue'lu zemini pastel arayüz içindir. Koru.

---

## 4 · Ölçü ve token — yan yana

| | Standart | Tailwind v4 | Open Props | Radix / Panda |
|---|---|---|---|---|
| ease-in | `0.4, 0, 1, 1` | `0.4, 0, 1, 1` (aynı) | `--ease-in-1..5` | Panda: `easings` kategorisi |
| ease-out | `0.2, 0, 0, 1` | `0, 0, 0.2, 1` | `--ease-out-1..5` | — |
| spring | `0.34, 1.36, 0.64, 1` | yok | `--ease-elastic-out-1..5` | — |
| süre | 90/160/240/360 | tek varsayılan 150ms | ölçek yok | Panda: `durations` |
| yarıçap | 6/8/12/16 | 2/4/6/8/12/16/24/32 | bakılmadı | — |
| gölge | 3 sabit glow | `--shadow-*` sabit | `calc()` ile üretilen 6 kademe | — |
| renk | rol başına 1 hex | kademe 50-950 | oklch + hsl varyant | 12 kademe + A + P3 |

**Style Dictionary kararı — bağımlılık olarak hayır, desen olarak evet.** Gerekçe: XAML
**yerleşik biçim değil**. `lib/enums/formats.js` listesinde yok; PR #1714 ("feat: add
support for XAML format") **açık**, issue #977 (MAUI için XAML) **açık**. Yani WPF
çıktısını yine biz yazacağız. Kurmak 13 doğrudan npm bağımlılığı + Node çalışma zamanı
getiriyor (v5.5.2), karşılığında zaten elimizde olan CSS'i veriyor. Kazanç sıfıra yakın.
Alınacak olan fikir: **tek JSON kaynak + platform başına üretici**. Bizde bu tek bir
betikle karşılanır (JSON → `theme.css` + `Theme.xaml` + `Palette.cs`) ve (b) maddesindeki
`surface` ayrışması bir daha olmaz. Beşinci platform (iOS/Android/Figma) girerse yeniden
değerlendir.

## 5 · Lisans

| Depo | Lisans | Son push | Son etiketli sürüm | Açık issue | Yıldız |
|---|---|---|---|---|---|
| argyleink/open-props | MIT | 2026-08-11 | **v1.6.0 — 2023-09-29** | 76 | 5.498 |
| radix-ui/colors | MIT (© WorkOS) | 2025-12-17 | **release yok** (npm'den) | 6 | 1.651 |
| style-dictionary | Apache-2.0 | 2026-08-22 | v5.5.2 — 2026-08-19 | 237 | 4.778 |
| tailwindlabs/tailwindcss | MIT | 2026-08-14 | v4.3.3 — 2026-07-16 | 56 | 97.288 |
| chakra-ui/panda | MIT | 2026-08-22 | `@pandacss/preset-open-props@1.12.0` — 2026-07-29 | 14 | 6.154 |

Hepsi OSI onaylı, §5.6 için sorun yok. Dikkat: Radix hex değerleri MIT, kopyalanabilir —
ama "Radix" marka adı lisansa dahil değil. Open Props'un etiketi ile main'i arasında ~3 yıl
var; npm'den kurup güncel sanma. `amzn/style-dictionary` artık
`style-dictionary/style-dictionary` — Amazon'dan bağımsız organizasyona taşınmış,
Apache-2.0 markayı ayrı maddede koruyor; 237 açık issue en yüksek rakam.

npm haftalık indirme (npmjs API, 2026-08-15/21): tailwindcss 125.107.112 ·
@radix-ui/colors 2.984.661 · style-dictionary 2.050.663 · @pandacss/dev 431.648 ·
open-props 24.430. Üçüncü taraf blog rakamı kullanılmadı. APCA Lc değerleri
**doğrulanmadı** — Radix'in Lc 60/90 taahhüdü kendi belgesinden alıntı, bağımsız
ölçülmedi. §2'deki WCAG oranları burada hesaplandı, yeniden üretilebilir.
