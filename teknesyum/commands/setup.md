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
| Dil (`en`/`tr`) | `~/.claude/teknesyum.json` → `dil` | sor, yaz |
| Yönlendirme seviyesi | `~/.claude/teknesyum.json` → `steering` | sor, yaz |
| Arayüz standardı | `~/.claude/teknesyum-ui.json` var mı, `kapali` ne | yoksa **kapalı** — davet et, yazma |
| Debug izi | `~/.claude/teknesyum.json` → `debug` | sorma, kapalı bırak |
| Kural dosyası | `~/.claude/RULES.md` + `CLAUDE.md`'de `@RULES.md` | **boş** oluştur |
| Global profil | `~/.claude/teknesyum.json` → `profil` | sor, yaz |
| Sıkıştırma penceresi | `settings.json` → `autoCompactWindow` | yoksa profilden türet |
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

2. **Kural dosyası.** `~/.claude/RULES.md` yoksa **boş** oluştur, `~/.claude/CLAUDE.md`'nin
   ilk satırlarına `@RULES.md` ekle. Dosyanın içine örnek kural yazma — buraya yazılan her
   satır bu makinedeki her projede yürürlüğe girer, ve eklentiyi kuran kişinin kuralları
   eklentiyi yazan kişinin kuralları değildir. Kullanıcı ilk kuralını `/rule` ile ekler.

   ```markdown
   # Rules

   Recurring preferences and things that have burned me before. **30-line ceiling** — when it
   is full, don't append; delete the weakest line or merge two. Added with `/rule`.

   <!-- boş — ilk kuralını /rule ile ekle -->
   ```

3. **`autoCompactWindow`.** Kendi başına bir sayı seçme — değer **global profilden**
   türer. Profil sorusu (aşağıda) cevaplandıktan sonra:

   ```
   node "<eklenti>/scripts/premium.js" autocompact
   ```

   Anahtar **zaten varsa dokunma** — o kullanıcının tercihidir, eksiklik değil. Profilden
   bağımsız tek bir sayı istenirse `/autocompact <sayı>`.

## Sorulacaklar — yalnızca bunlar

Karar kullanıcınındır, varsayma. Hepsini tek mesajda, numaralı sor:

- **Global profil.** `~/.claude/teknesyum.json` içinde `profil` yoksa sor: "Base hangi
  profilde çalışsın?" Bu tek cevap hem ajan modellerini hem sıkıştırma penceresini belirler:

  | Profil | Ajanlar | `autoCompactWindow` |
  |---|---|---|
  | `eco` | haiku · 1 paralel ajan · denetim yalnız kritik sözleşmede | `100000` (en erken sıkıştırma) |
  | `normal` | sonnet · 2 paralel ajan · her sözleşme denetlenir | `auto` (anahtar yazılmaz) |
  | `premium` | opus/xhigh · 20 paralel ajan · konsey + ikinci görüş | `1000000` (şema tavanı) |

  **Varsayılan `normal`.** Cevabı `node "<eklenti>/scripts/premium.js" <profil> --genel`
  ile yaz — komut hem `teknesyum.json`'a profili hem `settings.json`'a pencereyi yazar.
  Bu **makine varsayılanıdır**, hapis değil: tek bir sohbette `/premium eco` demek
  varsayılanı bozmaz, yalnız o oturuma iner. Alan varsa bir daha sorma.

- **Dil.** `~/.claude/teknesyum.json` içinde `dil` yoksa sor: "Teknesyum hangi dilde
  çalışsın?" İki seçenek var, başkasını yazma:

  | Değer | Ne olur |
  |---|---|
  | `en` | Bildirimler, uyarılar ve ajanların birbirine yazdığı metin İngilizce |
  | `tr` | Aynıları Türkçe |

  **Varsayılan `en`.** Tek alan iki yeri birden yönetir: kullanıcıya çıkan `Teknesyum ▸`
  satırları ve sözleşme/rapor/kayıt noktası gibi ajandan ajana giden metin. Cevabı
  `{"dil": "en"}` ya da `{"dil": "tr"}` olarak yaz. Alan varsa bir daha sorma.
- **Yönlendirme seviyesi.** `~/.claude/teknesyum.json` içinde `steering` yoksa sor:
  "Teknesyum'un devreye girdiği yerleri ne kadar görmek istersin?"

  | Seviye | Ne görürsün |
  |---|---|
  | `0` | Hiçbir `Teknesyum ▸` satırı yok — base sessizce çalışır |
  | `1` | Temel yönlenmeler: oturum açılışı, görev dağıtımı, ajan bitişi, ölçü satırı |
  | `2` | Hepsi + `Teknesyum ▸ Fark ▸ …` — base olmasaydı farklı sonuçlanacak her karar |

  **Varsayılan `1`.** Cevabı `{"steering": 0|1|2}` olarak yaz. Alan varsa bir daha sorma;
  değiştirmek isteyen doğrudan dosyayı düzenler.
- **Arayüz standardı.** `~/.claude/teknesyum-ui.json` yoksa **standart kapalıdır** ve
  kapalı kalması varsayılandır. Dayatma değil davet et: "Arayüz standardın olsun mu?
  Elimizde hazır bir neon şablonu var — istersen olduğu gibi al, istersen birkaç soruya
  cevap ver, standart senin olsun." Üç cevap:
  `şablonu al` → `{"kapali": false}` yaz, neon varsayılanları yürürlüğe girer ·
  `kendim kurayım` → `/uisetup` alanlarını (palet, font, imza, ekNot) sırayla sor, yalnızca
  cevaplananı yaz · `gerek yok` → **hiçbir dosya yazma**, skill zaten sessiz kalır.
  Dosya varsa sorma, mevcut durumu bitiş özetinde tek satır göster.
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
