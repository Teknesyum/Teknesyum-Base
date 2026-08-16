# Bileşen kalıpları (Tailwind v4)

Renkler `--color-neon-*` tokenlarından gelir; `theme.css` import edilmiş olmalı.

## Panel
```
bg-[#08090a]/95 backdrop-blur-xl border border-[var(--color-neon-blue)]/20
rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col
```

## Başlıklar
```
h2  text-[var(--color-neon-blue)] font-bold tracking-widest text-xl
h3  text-base font-bold tracking-widest text-[var(--color-neon-blue)]
lbl text-sm font-bold tracking-widest text-[var(--color-neon-blue)]
```

## Bölüm ayracı
```html
<div class="border-t border-white/5 my-6" />
```

## Butonlar
```
birincil  w-full bg-[var(--color-neon-blue)] hover:bg-[var(--color-neon-blue)]/80 text-black
          font-bold tracking-widest py-4 rounded-xl flex items-center justify-center gap-3
          transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(0,243,255,0.3)]

tehlike   aynısı, neon-blue → neon-pink, gölge rgba(255,0,234,0.3)

hayalet   bg-[var(--color-neon-purple)]/10 hover:bg-[var(--color-neon-purple)]/20
          border border-[var(--color-neon-purple)]/50 text-[var(--color-neon-purple)]
          font-bold tracking-widest py-4 rounded-xl transition-all hover:scale-[1.02]

ikon      w-8 h-8 rounded-lg flex items-center justify-center text-gray-500
          hover:text-[var(--color-neon-pink)] hover:bg-[var(--color-neon-pink)]/10
          border border-transparent hover:border-[var(--color-neon-pink)]/30 transition-all

pasif     disabled:opacity-30 disabled:pointer-events-none
```

## Toggle (anahtar)
```html
<button class="w-11 h-6 rounded-full border transition-all
  {on ? 'bg-[var(--color-neon-blue)]/30 border-[var(--color-neon-blue)]/60'
      : 'bg-gray-800 border-gray-700'}">
  <div class="w-4 h-4 rounded-full transition-transform
    {on ? 'translate-x-5 bg-[var(--color-neon-blue)]' : 'translate-x-0 bg-gray-500'}" />
</button>
```
Mod anahtarları (kalıcı davranış değiştiren) mavi yerine **mor** kullanır.

## Slider
```
w-full accent-[var(--color-neon-blue)] h-1 bg-gray-700 rounded-full appearance-none outline-none
```
Değeri sağda göster: `w-16 text-right font-mono text-sm text-[var(--color-neon-pink)] drop-shadow-[0_0_3px_var(--color-neon-pink)]`

## Değer hücresi / grid
```
w-10 h-10 rounded flex items-center justify-center font-mono text-xs transition-all cursor-pointer
seçili   bg-[var(--color-neon-blue)]/20 border border-[var(--color-neon-blue)]/50
         text-[var(--color-neon-blue)] shadow-[0_0_8px_var(--color-neon-blue)_inset]
tamam    text-emerald-400 ring-2 ring-inset ring-emerald-400/70 shadow-[0_0_8px_rgba(52,211,153,0.5)]
boş      text-[var(--color-neon-blue)] hover:ring-1 hover:ring-inset hover:ring-[var(--color-neon-blue)]/40
```

## Uyarı kutusu
```
flex items-start gap-2 text-[11px] text-[var(--color-neon-pink)]
bg-[var(--color-neon-pink)]/10 border border-[var(--color-neon-pink)]/30 rounded-lg p-3
```

## İlerleme çubuğu
```html
<div class="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
  <div class="h-full rounded-full bg-[var(--color-neon-blue)]
              shadow-[0_0_10px_var(--color-neon-blue)] transition-[width] duration-500"
       style="width:{pct}%"></div>
</div>
<div class="tk-label mt-1">{done}/{total} · {phase}</div>
```

## Rozet / çip
```
text-sm tracking-widest px-2 py-0.5 rounded-md border
bg-<renk>/10 border-<renk>/30 text-<renk>
```

## İkonlar
`lucide-react`, boyut 14 (satır içi) / 16 (etiket) / 22 (bölüm) / 56 (durum ekranı).
Renk metinle aynı olsun; ayrı renk verme.
