---
description: Profili değiştirir — premium, normal veya eco; hangisinin yürürlükte olduğunu söyler
argument-hint: premium | normal | eco | durum
allowed-tools: Bash
---

İstenen: $ARGUMENTS

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/premium.js" <premium|normal|eco|durum>
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/premium.js`
altındadır. Argüman boşsa `durum` çalıştır — kendiliğinden profil değiştirme.

Eski çağrılar durur: `aç` premium, `kapat` normal demektir. `standart` da `normal`'e gider.

Betik üç yeri birden yazar: ajan frontmatter'ı (`model`, `effort`, `maxTurns`), relay
düğmeleri (`skills/relay/SETTINGS.md`) ve `~/.claude/teknesyum.json` içindeki `profil`
alanı. Çıktıyı olduğu gibi bas, kendin dosya düzenleme.

| | eco | normal | premium |
|---|---|---|---|
| builder · ui-builder | haiku / medium / 40 tur | sonnet / medium / 60 tur | opus / xhigh / 80 tur |
| auditor | haiku / medium / 20 tur | sonnet / high / 30 tur | opus / xhigh / 40 tur |
| scout | haiku / low / 25 tur | sonnet / high / 45 tur | opus / high / 60 tur |
| scribe | haiku / low / 30 tur | haiku / low / 40 tur | opus / low / 40 tur |
| planner | haiku / low / 30 tur | sonnet / high / 40 tur | opus / xhigh / 40 tur |
| advisor | haiku / low / 12 tur | sonnet / low / 15 tur | fable / low / 20 tur |
| paralel ajan | 1 | 2 | 20 |
| worktree izolasyonu | kapalı | kapalı | açık |
| model tırmanışı | açık | açık | kapalı — zaten tepede |
| denetim | critical | her sözleşme | her sözleşme |
| rapor · brifing | short · quiet | short · milestone | detailed · every-step |
| plan konseyi | kapalı | kapalı | açık — fable + opus |
| ikinci görüş | kapalı | kapalı | açık — fable |
| ön araştırma | 1+ depo | 10+ depo | 50+ depo |

`scribe` premium'da da düşük eforla çalışır: model yükseldi diye isim değiştirme işine
uzun uzun düşünmek kazanç değil kayıptır. Efor tavanı `xhigh`.

**eco**, token'ın gerçekten kısıt olduğu profildir. Her rol `haiku` çalışır. Efor kod
üreten ve denetleyen üç rolde `medium` kalır: haiku maliyeti zaten bir mertebe düşürdü,
kod yazan rolü bunun üstüne `low`'a indirmek kabul kriterini geçmeyen iş üretir ve
harcanan tur kazanılan tokenden pahalıya gelir. Denetim `critical`'e düşer — eco'nun en
büyük tasarruf kolu ajan sayısıdır. Model tırmanışı açık kalır; haiku'nun yetmediği
sözleşmede tur harcamak yerine modeli yükseltmek burada daha da önemlidir.

**Plan konseyi** premiumla birlikte açılır: sıfırdan projede `PLAN.md` yazılmadan önce
aynı brifingle iki `planner` ajanı açılır — biri `fable`, biri `opus`. İkisi de iş yapmaz;
`planner` ajanının elinde yazma aracı yoktur. Ortak çıkan karar doğrulanmış sayılır,
ayrıştıkları yer `PLAN.md` içinde **Konsey ayrışması** başlığına gerekçesiyle yazılır.
Sentezi ve kalemi T0 tutar — delege edilen karar değil seçenek üretimidir. Ayrıntı relay
SKILL §1.5.

**İkinci görüş** konseyin küçük kardeşidir ve o da premiumla açılır. T0 doğru kararın ne
olduğunu bilmediği bir düğümde **`advisor` ajanını** açar; `fable` üç başlıkta en fazla 20
satır cevap verir: görüş, gerekçe, kaçırdığın şey. Konsey planın tamamı içindir ve iki
üyelidir; görüş tek bir karar içindir ve tek üyelidir. Bağlayıcı değil, kullanıcıya
sormanın da yerine geçmez. **Dokuz** durumda tetiklenir — ayrıntı relay SKILL §1.5.1.

`advisor` ayrı bir ajandır, `planner`'ın kipi değil. Sebebi ölçülmüş bir kısıt: `Agent`
aracının şemasında `model` var, `effort` yok; efor yalnızca ajan tanımından gelir. İki kip
tek dosyada dururken aynı eforu paylaşıyordu. Ayrılınca `advisor` premiumda bile `low`
eforda kalabiliyor — tetikleyici sayısı arttıkça danışmanın ucuz olması önem kazanır.

**Ön araştırma tavanı** profille değişir: eco 5, normal 10, premium 50 depo (SKILL §1.4).
Derinlik değişmez, kapsam değişir: elli depo dalgalar hâlinde okunur ve her dalga bir
sonrakinin aday listesini eler.

**Paralel tavanı** premiumda 20'dir. Tavan token için değil: `worktree_isolation` açıkken
her ajan bir repo kopyası ve bir süreç demektir, ve T0 hatalı bir döngüye girerse tavan
güvenlik ağı olur. Kararı T0 verir ve ölçüsü hızdır — bölünebilen işi bölmemek gerekçe
ister.

Premium açıkken oturum açılışında `Teknesyum ▸ premium mod` satırı çıkar ve ilk iki
istekte modele davranış notu enjekte edilir — paraleli aç, sonnet'e düşme, token
tasarrufunu gerekçe sayma, plan konseyini aç.

`~/.claude/teknesyum.json` profili `profil` alanında tutar. Alan yoksa eski `premium`
bayrağı okunur: `true` premium, gerisi normal sayılır. Betik ikisini birlikte yazar.

Eklenti güncellemesi ajan dosyalarını normal profile geri alabilir. `durum` konfig ile
dosyaları karşılaştırır ve uyuşmazlığı söyler; tek satırlık düzeltmesi `/premium premium`.
`TEKNESYUM_PREMIUM=1|0` tek oturumluk ezer, dosyalara dokunmaz.
