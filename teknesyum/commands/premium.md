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
| paralel ajan | 2 | 6 |
| worktree izolasyonu | kapalı | açık |
| model tırmanışı | açık | kapalı — zaten tepede |
| rapor · brifing | short · milestone | detailed · every-step |

`scribe` premium'da da düşük eforla çalışır: model yükseldi diye isim değiştirme işine
uzun uzun düşünmek kazanç değil kayıptır. Efor tavanı `xhigh`.

Premium açıkken oturum açılışında `Teknesyum ▸ premium mod` satırı çıkar ve ilk iki
istekte modele davranış notu enjekte edilir — paraleli aç, sonnet'e düşme, token
tasarrufunu gerekçe sayma.

Eklenti güncellemesi ajan dosyalarını standart profile geri alabilir. `durum` konfig ile
dosyaları karşılaştırır ve uyuşmazlığı söyler; tek satırlık düzeltmesi `/premium aç`.
`TEKNESYUM_PREMIUM=1|0` tek oturumluk ezer, dosyalara dokunmaz.
