---
description: Teknesyum düzenini bu makineye bağlar (statusline + huy dosyası)
allowed-tools: Read, Write, Edit, Bash, Glob
---

Plugin bileşenleri (skill, ajan, komut, hook) kurulumla birlikte zaten aktif.
Plugin'in taşıyamadığı iki şeyi bu komut bağlar. İkisi de yoksa kur, varsa dokunma.

**1. Statusline.** Eklenti önbelleği **sürümlü** (`plugins/cache/teknesyum/teknesyum/1.12.0/`).
settings.json oraya doğrudan işaret ederse ilk güncellemede statusline kırılır; elle kopya
alınırsa güncellemeler kullanıcıya hiç ulaşmaz. İkisini de yapma — **köprü kur**:

1. Eklentideki `scripts/kopru.js` dosyasını `~/.claude/teknesyum-statusline.js` yoluna
   kopyala (her güncellemede üzerine yaz; köprü sürüme bağlı değil, içeriği sabittir).
2. `~/.claude/settings.json`:

```json
"statusLine": { "type": "command", "command": "node \"~/.claude/teknesyum-statusline.js\"" }
```

Yolu kullanıcının gerçek ev dizinine göre tam yaz. `node` PATH'te değilse onun da tam
yolunu kullan. Mevcut `statusLine` başka bir şeye işaret ediyorsa üzerine yazma, sor.

**Eski kurulumu düzelt:** `~/.claude/statusline.js` diye elle alınmış bir kopya varsa
bu bayat bir sürümdür — sil, köprüyle değiştir. Bunu sormadan yap, söyle.

Doğrulama: örnek bir JSON'u köprüye borula, çıktı gelmeli.

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

**4. Dil sunucusu (TS/JS tip zekâsı).** Plugin `.lsp.json` ile sunucuyu zaten tanımlıyor;
eksik olan yalnızca ikili. Şunları **doğrula, eksikse kurulum komutunu bildir**:

- `typescript-language-server --version` çalışıyor mu → yoksa
  `npm i -g typescript-language-server typescript@5`
- Global `typescript` sürümü: `npm ls -g --depth=0` çıktısında **5.x** olmalı.
  **7.x ise LSP hiç çalışmaz** — TS 7 native port, `lib/tsserver.js` göndermiyor, sunucu
  initialize'da ölüyor ve Claude Code sessizce LSP'siz devam ediyor. Düzeltme:
  `npm i -g typescript@5`
- Kullanıcıda `typescript-lsp@claude-plugins-official` **etkinse** aynı uzantılar iki kez
  tanımlanır; ikincisi yok sayılır ve uyarı basılır. Birini kapatmasını öner.

Doğrulama: sunucu **tembel** başlar — oturum açılışında değil, `LSP` aracı ilk
çağrıldığında. `LSP` aracının araç listesinde görünmesi kayıtlı olduğunun kanıtıdır.

**5. Opsiyonel bağımlılıklar** — sadece eksik olanı bildir, kurma:
- `csharp-ls` + `csharp-lsp` plugin'i (C# projelerinde)
- `graphify` (`uv tool install graphifyy`) — büyük kod tabanı indeksleme

Bitince tek ekranda özetle: ne bağlandı, ne zaten vardı, ne eksik.
Yeniden başlatma gerekiyorsa söyle.
