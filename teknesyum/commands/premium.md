---
description: Max 20x profilini açar veya kapatır — opus, xhigh efor, altı paralel ajan
argument-hint: aç | kapat | durum
allowed-tools: Bash
---

İstenen: $ARGUMENTS

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/premium.js" <ac|kapat|durum>
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/premium.js`
altındadır. Argüman boşsa `durum` çalıştır — kendiliğinden açma.

Betik üç yeri birden yazar: ajan frontmatter'ı (`model`, `effort`, `maxTurns`), relay
düğmeleri (`skills/relay/SETTINGS.md`) ve `~/.claude/teknesyum.json` içindeki `premium`
alanı. Çıktıyı olduğu gibi bas, kendin dosya düzenleme.

| | Standart | Premium |
|---|---|---|
| builder · ui-builder | sonnet / medium / 60 tur | opus / xhigh / 80 tur |
| auditor | sonnet / high / 30 tur | opus / xhigh / 40 tur |
| scout | sonnet / high / 45 tur | opus / high / 60 tur |
| scribe | haiku / low / 40 tur | opus / low / 40 tur |
| planner | sonnet / high / 40 tur | opus / xhigh / 40 tur |
| paralel ajan | 2 | 6 |
| worktree izolasyonu | kapalı | açık |
| model tırmanışı | açık | kapalı — zaten tepede |
| rapor · brifing | short · milestone | detailed · every-step |
| plan konseyi | kapalı | açık — fable + opus |
| ikinci görüş | kapalı | açık — fable |
| ön araştırma | 10+ depo | 50+ depo |

`scribe` premium'da da düşük eforla çalışır: model yükseldi diye isim değiştirme işine
uzun uzun düşünmek kazanç değil kayıptır. Efor tavanı `xhigh`.

**Plan konseyi** premiumla birlikte açılır: sıfırdan projede `PLAN.md` yazılmadan önce
aynı brifingle iki `planner` ajanı açılır — biri `fable`, biri `opus`. İkisi de iş yapmaz;
`planner` ajanının elinde yazma aracı yoktur. Ortak çıkan karar doğrulanmış sayılır,
ayrıştıkları yer `PLAN.md` içinde **Konsey ayrışması** başlığına gerekçesiyle yazılır.
Sentezi ve kalemi T0 tutar — delege edilen karar değil seçenek üretimidir. Ayrıntı relay
SKILL §1.5.

**İkinci görüş** konseyin küçük kardeşidir ve o da premiumla açılır. T0 doğru kararın ne
olduğunu bilmediği bir düğümde `planner` ajanını **görüş kipinde** açar — brifing `GÖRÜŞ:`
ile başlar, `fable` üç başlıkta en fazla 20 satır cevap verir: görüş, gerekçe, kaçırdığın
şey. Konsey planın tamamı içindir ve iki üyelidir; görüş tek bir karar içindir ve tek
üyelidir. Bağlayıcı değil, kullanıcıya sormanın da yerine geçmez. Ayrıntı relay SKILL
§1.5.1.

**Ön araştırma tavanı** premiumda 10 depodan 50 depoya çıkar (SKILL §1.4). Derinlik
değişmez, kapsam değişir: elli depo dalgalar hâlinde okunur ve her dalga bir sonrakinin
aday listesini eler.

Premium açıkken oturum açılışında `Teknesyum ▸ premium mod` satırı çıkar ve ilk iki
istekte modele davranış notu enjekte edilir — paraleli aç, sonnet'e düşme, token
tasarrufunu gerekçe sayma, plan konseyini aç.

Eklenti güncellemesi ajan dosyalarını standart profile geri alabilir. `durum` konfig ile
dosyaları karşılaştırır ve uyuşmazlığı söyler; tek satırlık düzeltmesi `/premium aç`.
`TEKNESYUM_PREMIUM=1|0` tek oturumluk ezer, dosyalara dokunmaz.
