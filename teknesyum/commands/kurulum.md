---
description: Teknesyum düzenini bu makineye bağlar (statusline + huy dosyası)
allowed-tools: Read, Write, Edit, Bash, Glob
---

Plugin bileşenleri (skill, ajan, komut, hook) kurulumla birlikte zaten aktif.
Plugin'in taşıyamadığı iki şeyi bu komut bağlar. İkisi de yoksa kur, varsa dokunma.

**1. Statusline.** Plugin dizinini bul (`~/.claude/plugins/` altında `teknesyum` içeren,
`scripts/statusline.js` barındıran klasör). Kullanıcının `~/.claude/settings.json`
dosyasına ekle — mevcut `statusLine` varsa üzerine yazma, kullanıcıya sor:

```json
"statusLine": { "type": "command", "command": "node \"<plugin>/scripts/statusline.js\"" }
```

`node` PATH'te değilse tam yolunu kullan. Ekledikten sonra örnek bir JSON'u script'e
borulayarak çalıştığını doğrula.

**2. Huy dosyası.** `~/.claude/HUYLAR.md` yoksa şu içerikle oluştur ve
`~/.claude/CLAUDE.md` dosyasının ilk satırlarına `@HUYLAR.md` satırını ekle:

```markdown
# Huylar

Tekrar eden takıntılar ve daha önce canımı yakmış şeyler. **30 satır tavanı** —
dolduğunda yeni satır ekleme, en zayıfını sil veya birleştir. `/huy` ile eklenir.

- Kodda yorum istemiyorum; açıkça istemediysem yazma.
- Rutin onay sorma. Geri dönüşü zor olmayan her şeyi yap, sonucunu bildir.
- Uzun özet çıkarma. Ne değişti, nerede — o kadar.
- Renk/ölçü uydurma. `teknesyum-ui` tokenları dışına çıkma.
- İşi yarıda bırakma; kapsamı kendi kendine daraltma.
```

**3. Otomatik sıkıştırma penceresi.** `~/.claude/settings.json` içinde `autoCompactWindow`
anahtarı **yoksa** `250000` olarak ekle. **Varsa dokunma** — kullanıcının kendi tercihidir.
Bu ayar makine geneli olduğu için her oturumda geçerlidir; oturum başına ayarlanmaz.
Sonradan değiştirmek için `/autocompact <sayı>`, kapatmak için anahtarı sil.

**4. Opsiyonel bağımlılıklar** — sadece eksik olanı bildir, kurma:
- `typescript-language-server` + `typescript-lsp` plugin'i (TS projelerinde tip zekâsı)
- `csharp-ls` + `csharp-lsp` plugin'i (C# projelerinde)
- `graphify` (`uv tool install graphifyy`) — büyük kod tabanı indeksleme

Bitince tek ekranda özetle: ne bağlandı, ne zaten vardı, ne eksik.
Yeniden başlatma gerekiyorsa söyle.
