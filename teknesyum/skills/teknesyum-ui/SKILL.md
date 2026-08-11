---
name: teknesyum-ui
description: Teknesyum neon arayüz standardı. Herhangi bir kullanıcı arayüzü, panel, pencere, sayfa, bileşen veya CSS/XAML yazarken ya da mevcut bir arayüzü değiştirirken kullan. Renk paleti, tipografi ölçeği, başlık hiyerarşisi, bileşen kalıpları ve zorunlu imza/sponsor bloğunu içerir. Web, React, Electron ve WPF/WinForms projelerinin hepsini kapsar.
---

# Teknesyum Neon UI

Her projede aynı görünüm. Renk/ölçü **uydurma** — aşağıdaki tokenları kullan.

## 1. Kurulum (yeni proje)

Stack'e göre tek dosya kopyala, sonra import et:

| Stack | Kopyala | Nereye |
|---|---|---|
| Tailwind v4 | `assets/theme.css` | `src/index.css` başına |
| Düz CSS / Vanilla | `assets/theme.css` | `src/theme.css`, `<link>` ile bağla |
| WPF / .NET | `assets/Theme.xaml` | `Themes/Theme.xaml`, `App.xaml` MergedDictionaries |
| WinForms | `assets/Palette.cs` | proje köküne |

İmza bloğu (§4) **her projede zorunlu**.

## 2. Palet

```
neon-blue    #00f3ff   birincil. eylem, aktif durum, sayısal vurgu, başlık
neon-pink    #ff00ea   ikincil. uyarı, ters/negatif eylem, kritik değer
neon-purple  #b026ff   üçüncül. mod anahtarları, scrollbar, ikincil buton
success      #34d399   yalnızca "tamamlandı"
surface      #08090a   panel zemini (95% opak)
glass        rgba(10,10,15,0.85)
text         #d1d5db  gövde · #9ca3af  başlık-alt · #6b7280  etiket · #4b5563  ipucu
```

Kural: bir ekranda **mavi baskın, pembe vurgu, mor seyrek**. Üçünü eşit kullanma.

Glow şart: renkli metin `drop-shadow(0 0 5px <renk>)`, dolgulu buton `box-shadow: 0 0 20px <renk>40`, çerçeveli kutu `box-shadow: inset 0 0 8px <renk>`. Glow'suz neon yok.

Opaklık merdiveni — sadece bunları kullan: dolgu `/10`, hover dolgu `/20`, aktif dolgu `/30`, çerçeve `/30`, güçlü çerçeve `/50-60`.

## 3. Tipografi

Sans: `Inter, system-ui, 'Segoe UI', sans-serif` — metin, etiket, başlık.
Mono: `'JetBrains Mono', ui-monospace, Consolas, monospace` — **her sayı, tuş, kod, ID, süre**. Sayıyı sans ile yazma.

| Rol | Boyut | Ağırlık | Tracking | Renk |
|---|---|---|---|---|
| Panel başlığı (h2) | 18px | 700 | 0.1em | neon-blue + glow |
| Bölüm başlığı (h3) | 14px | 700 | 0.1em UPPERCASE | `#9ca3af` |
| Etiket | 10px | 700 | 0.15em UPPERCASE | `#6b7280` |
| Gövde | 13px | 400 | 0 | `#d1d5db` |
| Mono değer | 14px | 700 | 0 | neon-pink |
| Hero sayı | 24px | 900 | 0 | neon-blue + glow |
| İpucu | 10px | 400 | 0 | `#4b5563` |

Ölçek 10 → 13 → 14 → 18 → 24. Ara boyut ekleme.

## 4. İmza bloğu — ZORUNLU

Her projede tam olarak bir tane. Yeri: **ayarlar veya hakkında bölümünün en altı**, sağa yaslı, küçük, sessiz. Ana ekranda değil.

Hazır bileşen: `assets/Signature.tsx` (React) · `assets/Signature.xaml` (WPF). Kopyala, içeriğini değiştirme.

Linkler tek yerde (`assets/links.json`):
- GitHub: `https://github.com/Teknesyum`
- Destek: `https://github.com/sponsors/Teknesyum` *(GitHub onayı bekliyor — onaylanana kadar bileşen otomatik GitHub profiline düşer)*

## 5. Bileşen kalıpları

Detay ve kopyalanabilir sınıflar: `references/components.md`. Sadece bir bileşenin tam kodu lazımsa oku.

Panel: `bg-[#08090a]/95 backdrop-blur-xl border border-neon-blue/20 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)]`
Radius: kutu `16px`, buton/kart `12px`, hücre `8px`, çip `6px`. Başka değer yok.
Aralık: 4 / 8 / 12 / 16 / 24. Padding panel `24px`, bölüm arası `24px`, satır arası `12px`.
Geçiş: `transition: all 200ms` (mikro), `300ms` (renk/glow), `500ms` (panel aç-kapa). Hover'da `scale(1.02)` buton, `1.1` ikon.

## 6. Sık yapılan hatalar

- Tailwind rastgele rengi (`text-cyan-400`) kullanmak → token kullan
- Sayıyı sans font ile yazmak → mono
- Glow'suz neon renk → ölü görünür
- Başlıkta tracking/uppercase unutmak
- İmza bloğunu ana ekrana koymak → ayarların altına
