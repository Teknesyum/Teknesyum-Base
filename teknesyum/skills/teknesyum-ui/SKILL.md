---
name: teknesyum-ui
description: Neon arayüz standardı. Herhangi bir kullanıcı arayüzü, panel, pencere, sayfa, bileşen veya CSS/XAML yazarken ya da mevcut bir arayüzü değiştirirken kullan. Renk paleti, tipografi ölçeği, başlık hiyerarşisi, bileşen kalıpları ve imza/sponsor bloğunu içerir. Web, React, Electron ve WPF/WinForms projelerinin hepsini kapsar. Ayarları /teknesyumui komutuyla değiştirilir veya tamamen kapatılır.
---

# Neon UI standardı

## 0. ÖNCE KULLANICI AYARINI OKU

`~/.claude/teknesyum-ui.json` varsa oku. Yoksa aşağıdaki varsayılanlar geçerlidir.

- `"kapali": true` → **bu skill'i uygulama.** Kullanıcının kendi tercihiyle veya projenin
  mevcut tarzıyla devam et, hiçbir token dayatma. Burada dur.
- `"palet"`, `"tipografi"`, `"imza"` alanları varsa aşağıdaki varsayılanları **ezer**.
- `"ekNot"` alanı varsa kullanıcının kendi yazdığı kuraldır — varsayılanlarla çelişirse
  **kullanıcının notu kazanır**.

Projeye özel ezme: `<proje>/.claude/teknesyum-ui.json`. O varsa kullanıcı geneline üstündür.

## 1. Kurulum (yeni proje)

| Stack | Kopyala | Nereye |
|---|---|---|
| Tailwind v4 | `assets/theme.css` | `src/index.css` başına |
| Düz CSS / Vanilla | `assets/theme.css` | `src/theme.css`, `<link>` ile bağla |
| WPF / .NET | `assets/Theme.xaml` | `Themes/Theme.xaml`, `App.xaml` MergedDictionaries |
| WinForms / CLI | `assets/Palette.cs` | proje köküne |

## 2. Palet (varsayılan)

```
neon-blue    #00f3ff   birincil. eylem, aktif durum, sayısal vurgu, başlık
neon-pink    #ff00ea   ikincil. uyarı, ters/negatif eylem, kritik değer
neon-purple  #b026ff   üçüncül. mod anahtarları, scrollbar, ikincil buton
success      #34d399   yalnızca "tamamlandı"
surface      #08090a   panel zemini (95% opak)
text         #d1d5db gövde · #9ca3af başlık-alt · #6b7280 etiket · #4b5563 ipucu
```

Bir ekranda **mavi baskın, pembe vurgu, mor seyrek**. Üçünü eşit kullanma.

Glow şart: renkli metin `drop-shadow(0 0 5px <renk>)`, dolgulu buton
`box-shadow: 0 0 20px <renk>40`, çerçeveli kutu `inset 0 0 8px <renk>`. Glow'suz neon yok.

Opaklık merdiveni — sadece bunlar: dolgu `/10`, hover `/20`, aktif `/30`, çerçeve `/30`,
güçlü çerçeve `/50-60`.

## 3. Tipografi (varsayılan)

Sans: `'Segoe UI', system-ui, -apple-system, sans-serif` — metin, etiket, başlık.
Mono: `Consolas, 'Cascadia Mono', ui-monospace, monospace` — **her sayı, tuş, kod, ID,
süre**. Sayıyı sans ile yazma.

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

## 4. İmza bloğu

Varsayılan **açık**. Her projede tam olarak bir tane, **ayarlar veya hakkında bölümünün
en altında**, sağa yaslı, küçük, sessiz. Ana ekranda değil.

Hazır bileşen: `assets/Signature.tsx` (React) · `assets/Signature.xaml` (WPF).
Linkler ve metinler `assets/links.json`'da:
- GitHub: `https://github.com/Teknesyum`
- Destek: `https://github.com/sponsors/Teknesyum` — **aktif**

Kullanıcı ayarında `"imza": { "kapali": true }` varsa **ekleme**.
`"imza": { "metin": "...", "github": "...", "sponsor": "..." }` varsa onları kullan.

## 5. Bileşen kalıpları

Kopyalanabilir sınıflar: `references/components.md`. Sadece bir bileşenin tam kodu
lazımsa oku.

Panel: `bg-[#08090a]/95 backdrop-blur-xl border border-neon-blue/20 rounded-2xl p-6
shadow-[0_0_40px_rgba(0,0,0,0.8)]`
Radius: kutu `16px`, buton/kart `12px`, hücre `8px`, çip `6px`. Başka değer yok.
Aralık: 4 / 8 / 12 / 16 / 24. Panel padding `24px`, bölüm arası `24px`, satır arası `12px`.
Geçiş: `200ms` mikro, `300ms` renk/glow, `500ms` panel aç-kapa. Hover `scale(1.02)` buton,
`1.1` ikon.

## 6. Sık yapılan hatalar

- Rastgele Tailwind rengi (`text-cyan-400`) → token kullan
- Sayıyı sans font ile yazmak → mono
- Glow'suz neon renk → ölü görünür
- Başlıkta tracking/uppercase unutmak
- İmza bloğunu ana ekrana koymak → ayarların altına
