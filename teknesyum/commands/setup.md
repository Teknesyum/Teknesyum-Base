---
description: Bu makineyi bağlar — eksikleri kendin bulur, sadece karar gerekeni sorar
allowed-tools: Read, Write, Edit, Bash, Glob
---

Plugin bileşenleri (skill, ajan, komut, hook) kurulumla birlikte zaten aktif. Bu komut
plugin'in taşıyamadığı, kullanıcının kendi dosyalarına yazılması gereken şeyleri bağlar.

**Önce hepsini denetle, sonra tek seferde konuş.** Sırayla soru sorup kullanıcıyı
oyalama; taramayı bitir, kararı belli olanı sormadan yap, sadece gerçekten seçim
gerektireni sor — hepsini tek mesajda, numaralı.

## Denetim listesi

| Ne | Nasıl bakılır | Eksikse |
|---|---|---|
| Statusline köprüsü | `~/.claude/teknesyum-statusline.js` var mı | kur |
| settings.json bağı | `statusLine.command` köprüyü gösteriyor mu | bağla |
| Bayat kopya | `~/.claude/statusline.js` var mı | sil |
| Çıktı dili | `~/.claude/teknesyum.json` → `dil` | sor, yaz |
| Huy dosyası | `~/.claude/HUYLAR.md` + `CLAUDE.md`'de `@HUYLAR.md` | oluştur |
| Sıkıştırma penceresi | `settings.json` → `autoCompactWindow` | yoksa `250000` |
| Dil sunucusu | `typescript-language-server --version` | kurulum komutunu bildir |
| TypeScript sürümü | `npm ls -g --depth=0` → **5.x olmalı** | 7.x ise uyar |

## Sormadan yapılacaklar

1. **Köprü.** Plugin'deki `scripts/bridge.js` dosyasını `~/.claude/teknesyum-statusline.js`
   yoluna kopyala (varsa üzerine yaz — köprü sürümden bağımsızdır, tazelenmesi zararsız).
   `settings.json`'a bağla:

   ```json
   "statusLine": { "type": "command", "command": "node \"<ev>/.claude/teknesyum-statusline.js\"" }
   ```

   Eklenti önbelleği sürümlü olduğu için **doğrudan plugin yoluna bağlama** — ilk
   güncellemede kırılır. Elle kopya da alma — güncellemeler kullanıcıya hiç ulaşmaz.
   `~/.claude/statusline.js` diye eski bir kopya varsa sil; o bayat bir sürümdür.

2. **Huy dosyası.** `~/.claude/HUYLAR.md` yoksa oluştur, `~/.claude/CLAUDE.md`'nin ilk
   satırlarına `@HUYLAR.md` ekle:

   ```markdown
   # Huylar

   Tekrar eden takıntılar ve daha önce canımı yakmış şeyler. **30 satır tavanı** —
   dolduğunda yeni satır ekleme, en zayıfını sil veya birleştir. `/rule` ile eklenir.

   - Kodda yorum istemiyorum; açıkça istemediysem yazma.
   - Rutin onay sorma. Geri dönüşü zor olmayan her şeyi yap, sonucunu bildir.
   - Uzun özet çıkarma. Ne değişti, nerede — o kadar.
   - Renk/ölçü uydurma. `teknesyum-ui` tokenları dışına çıkma.
   - İşi yarıda bırakma; kapsamı kendi kendine daraltma.
   ```

3. **`autoCompactWindow`** anahtarı yoksa `250000` ekle. **Varsa dokunma** — kullanıcının
   tercihidir. Değiştirmek için `/autocompact <sayı>`.

## Sorulacaklar — yalnızca bunlar

Karar kullanıcınındır, varsayma. Hepsini tek mesajda, numaralı sor:

- **Çıktı dili.** `~/.claude/teknesyum.json` içinde `dil` yoksa sor: "Raporlar, açıklamalar
  ve ajan çıktıları hangi dilde olsun?" Cevabı ISO kodu olarak yaz — `{"dil": "tr"}`.
  Komut adlarının İngilizce olması dili belirlemez; `/report` diyen kullanıcı Türkçe
  rapor bekliyor olabilir. Dosya varsa bir daha sorma.
- `statusLine` **başka bir şeye** işaret ediyorsa: üzerine yazayım mı?
- `typescript-language-server` yoksa: `npm i -g typescript-language-server typescript@5`
  çalıştırayım mı? (Global paket kurulumu — kendi başına yapma.)
- Global `typescript` **7.x** ise: LSP hiç çalışmaz (TS 7 native port, `lib/tsserver.js`
  göndermiyor, sunucu initialize'da sessizce ölüyor). `npm i -g typescript@5` ile düşeyim mi?
- `typescript-lsp@claude-plugins-official` **etkinse**: aynı uzantılar iki kez tanımlanır,
  ikincisi yok sayılır. Hangisini kapatalım?
- Opsiyonel: `csharp-ls` + `csharp-lsp` (C# projeleri), `graphify`
  (`uv tool install graphifyy`, büyük kod tabanı indeksleme) — kurayım mı?

## Bitiş

Tek ekranda özetle: ne bağlandı · ne zaten vardı · ne bekliyor (ve neyi beklediği).
Dil sunucusu **tembel** başlar — oturum açılışında değil, `LSP` aracı ilk çağrıldığında.
`LSP` aracının araç listesinde görünmesi kayıtlı olduğunun kanıtıdır.
Statusline ve hook değişiklikleri için yeniden başlatma gerekiyorsa söyle.
