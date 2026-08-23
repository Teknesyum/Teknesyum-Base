# Bileşen kalıpları (Tailwind v4)

Renkler `--color-neon-*` ve `--tk-*` tokenlarından gelir; `theme.css` import edilmiş olmalı.
Metin rolünde `pink-text` / `purple-text` kullanılır, dolgu hex'i değil (SKILL §2).

**Bu dosyadaki ölçüler token okur, sabit sayı yazmaz.** Boyut, ağırlık, harf aralığı ve
yarıçapın tek kaynağı `SKILL §3` ile `assets/theme.css`'tir; buradaki sınıflar onların
Tailwind karşılığıdır. `text-xl`, `tracking-widest`, `rounded-2xl` gibi Tailwind
varsayılanları kullanılmaz — kendi ölçekleri vardır ve bu standardın ölçeğiyle
çakışmazlar (`tracking-widest` 0.1em'dir, bu standartta 0.1em diye bir basamak yoktur).

`theme.css`'i import eden projede aynı işi hazır sınıflar yapar: `.tk-panel`, `.tk-h2`,
`.tk-h3`, `.tk-label`, `.tk-mono`, `.tk-hero`, `.tk-hint`, `.tk-btn*`. Aşağıdaki uzun
biçimler yalnız o sınıfları bir bileşende ezmen gerektiğinde işe yarar.

**Yarıçap tektir: `rounded-[var(--tk-r)]`** (6px) — panel, kart, düğme, hücre, çip, kutu,
hepsi aynı. Eski `rounded-2xl` / `xl` / `lg` / `md` merdiveni 23.08.2026'da kaldırıldı
(SKILL §5, `layout.md` §5.1). Tek istisna **dairedir** ve işlevseldir: `rounded-full`
yalnız anahtar sapı, slider thumb, durum noktası, ilerleme çubuğu ve avatar içindir.
Arada bir değer (10px, 14px) üretilmez; daha yumuşak köşe gerekiyorsa çözüm daire.

## Panel
```
bg-[#08090a]/95 backdrop-blur-xl border border-[var(--color-neon-blue)]/50
rounded-[var(--tk-r)] p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col
```
Hazır sınıf: `tk-panel`.

## Odak halkası

Çift katman, geçişsiz, yalnız klavye modalitesinde. `theme.css` bunu genel olarak
tanımlıyor; bir bileşende ezmen gerekirse **iki katmanı birden** taşı:

```
focus-visible:outline-2 focus-visible:outline-[var(--color-neon-blue)]
focus-visible:outline-offset-2 focus-visible:shadow-[0_0_0_2px_#000000]
```

Tek katmanlı halka bu palette çalışmaz: mavi halka mavi dolgulu butonun üstünde 1.00:1.

## Başlıklar

Hiyerarşi **boyutla** kurulur: 24 → 20 → 14, aralarında birer ölçek basamağı. Gövde 16'dır,
yani hiçbir başlık gövdeyle aynı boyutta değildir. Ağırlık üç seviyede de 600; harf aralığı
boyut büyüdükçe düşer (SKILL §3).

```
h2   text-[length:var(--tk-fs-4)] font-semibold tracking-[var(--tk-tr-h2)]
     leading-[var(--tk-lh-heading)] text-[var(--color-neon-blue)]      24 / 600 / 0.02em
h3   text-[length:var(--tk-fs-3)] font-semibold tracking-[var(--tk-tr-h3)]
     leading-[var(--tk-lh-heading)] text-[var(--color-neon-blue)]      20 / 600 / 0.05em
lbl  text-[length:var(--tk-fs-1)] font-semibold tracking-[var(--tk-tr-label)]
     leading-[var(--tk-lh-heading)] text-[var(--color-neon-blue)]      14 / 600 / 0.15em
```
Hazır sınıflar: `tk-h2`, `tk-h3`, `tk-label`.

Boyut farkı yetmediği yerde (dar panel, yan yana iki başlık) ikinci sinyal **çizgidir**,
kalınlaştırma ya da parlaklık değil: `tk-h3-rule` (`border-b border-[var(--tk-border-decorative)] pb-2`).

## Bölüm ayracı
```html
<div class="border-t border-[var(--tk-border-decorative)] my-6" />
```

## Butonlar
```
birincil  w-full bg-[var(--color-neon-blue)] hover:bg-[var(--color-neon-blue)]/80 text-black
          font-semibold tracking-[var(--tk-tr-h2)] py-4 rounded-[var(--tk-r)]
          flex items-center justify-center gap-3
          transition-[opacity,transform] duration-[--tk-t-instant]
          hover:scale-[1.02] shadow-[0_0_20px_rgba(0,243,255,0.3)]

tehlike   aynısı, neon-blue → neon-pink, gölge rgba(255,0,234,0.3)

hayalet   bg-[var(--color-neon-purple)]/10 hover:bg-[var(--color-neon-purple)]/20
          border border-[var(--color-purple-text)]/50 text-[var(--color-purple-text)]
          font-semibold tracking-[var(--tk-tr-h2)] py-4 rounded-[var(--tk-r)]
          hover:scale-[1.02]
          transition-[opacity,transform] duration-[--tk-t-instant]

ikon      w-8 h-8 rounded-[var(--tk-r)] flex items-center justify-center text-[var(--tk-text)]
          hover:text-[var(--color-pink-text)] hover:bg-[var(--color-neon-pink)]/10
          border border-transparent hover:border-[var(--color-neon-pink)]/50
          transition-[opacity,transform] duration-[--tk-t-instant]

pasif     disabled:text-[var(--tk-disabled)] disabled:border-[var(--tk-disabled)]
          disabled:bg-transparent disabled:shadow-none disabled:cursor-not-allowed
```

`disabled:opacity-30` kullanma: beyaz metni `#4d4d4d`'ye (2.46:1) düşürür ve §2'nin tek
grisi olan `#71717a`'yı (4.35:1) atlar. Devre dışı hâl **renkle** verilir, soldurmayla değil.

## Toggle (anahtar)
```html
<button class="w-11 h-6 rounded-full border transition-opacity duration-[--tk-t-instant]
  {on ? 'bg-[var(--color-neon-blue)]/30 border-[var(--color-neon-blue)]/60'
      : 'bg-black border-[var(--tk-disabled)]'}">
  <div class="w-4 h-4 rounded-full transition-transform duration-[--tk-t-instant]
    {on ? 'translate-x-5 bg-[var(--color-neon-blue)]' : 'translate-x-0 bg-[var(--tk-disabled)]'}" />
</button>
```
Mod anahtarları (kalıcı davranış değiştiren) mavi yerine **mor** kullanır.

Sap hareketi §5.4 tabanındadır: `translate` geçişsiz bırakılmaz.

## Slider
```
w-full accent-[var(--color-neon-blue)] h-1 bg-black rounded-full appearance-none
border border-[var(--tk-border-decorative)]
```
Değeri sağda göster — hazır sınıf `tk-mono`, uzun biçimi:
```
w-16 text-right font-mono text-[length:var(--tk-fs-2)] font-semibold
leading-[var(--tk-lh-mono)] text-[var(--color-pink-text)]
```
Veri sayısı mono ve 16'dır, küçültülmez (SKILL §3).

Değere glow verme — `drop-shadow` yalnız hero sayıda (§2).

## Değer hücresi / grid
```
w-10 h-10 rounded-[var(--tk-r)] flex items-center justify-center cursor-pointer
font-mono text-[length:var(--tk-fs-2)] font-semibold
transition-[opacity,transform] duration-[--tk-t-instant]
seçili   bg-[var(--color-neon-blue)]/20 border border-[var(--color-neon-blue)]/50
         text-[var(--color-neon-blue)] shadow-[0_0_8px_var(--color-neon-blue)_inset]
tamam    text-[var(--color-neon-success)] ring-2 ring-inset ring-[var(--color-neon-success)]/60
         shadow-[0_0_8px_rgba(52,211,153,0.5)]
boş      text-[var(--color-neon-blue)] hover:ring-1 hover:ring-inset hover:ring-[var(--color-neon-blue)]/50
```

## Uyarı kutusu
```
flex items-start gap-2 text-[length:var(--tk-fs-1)] text-[var(--color-pink-text)]
bg-[var(--color-neon-pink)]/10 border border-[var(--color-neon-pink)]/50
rounded-[var(--tk-r)] p-3
```

## İlerleme çubuğu

Genişlik değil **`scaleX`** animasyonlanır: `width` her karede yerleşimi yeniden
hesaplattırır, `transform` GPU'da kalır (§5.4). Dolgu tam genişlikte durur, ölçek
küçültür.
```html
<div class="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
  <div class="h-full w-full origin-left rounded-full bg-[var(--color-neon-blue)]
              shadow-[0_0_10px_var(--color-neon-blue)]
              transition-transform duration-[--tk-t-base] ease-[--tk-e-out]"
       style="transform:scaleX({pct/100})"></div>
</div>
<div class="tk-label mt-1">{done}/{total} · {phase}</div>
```

## Rozet / çip
```
text-[length:var(--tk-fs-1)] font-semibold tracking-[var(--tk-tr-label)]
px-2 py-0.5 rounded-[var(--tk-r)] border min-h-6
bg-<dolgu>/10 border-<dolgu>/50 text-<metin rolü>
```

Dolgu ve çerçeve `neon-*`, yazı `pink-text` / `purple-text` / `neon-blue` (§2).

## Başlık çubuğu imzası
```html
<div class="tk-titlebar flex items-center justify-end gap-2 h-9 px-3">
  <Signature />
  <WindowControls />
</div>
```
`Destek` ve `Teknesyum` küçültün solunda durur, ikisi de `tk-no-drag` taşır (§4).

## İkonlar
`lucide-react`, boyut 14 (satır içi) / 16 (etiket) / 22 (bölüm) / 56 (durum ekranı).
Renk metinle aynı olsun; ayrı renk verme.
