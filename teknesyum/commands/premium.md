---
description: Profili değiştirir — premium, normal veya eco; hangisinin yürürlükte olduğunu söyler
argument-hint: premium | normal | eco | durum
allowed-tools: Bash
---

İstenen: $ARGUMENTS

Bu komut **üç profil arasında geçiş yapar**: `eco`, `normal`, `premium`. Adı `/premium`
kalmıştır çünkü ezberde odur; işlevi profil anahtarıdır, premium düğmesi değil.

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/premium.js" <eco|normal|premium|durum>
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/premium.js`
altındadır. Argüman boşsa `durum` çalıştır — kendiliğinden profil değiştirme.

Eski çağrılar durur: `aç` premium, `kapat` normal demektir. `standart` da `normal`'e gider.

Betik ajan frontmatter'ını (`model`, `effort`, `maxTurns`) ve relay düğmelerini
(`skills/relay/SETTINGS.md`) yazar. **Profil kaydı oturuma iner:** oturum kimliği varsa
`~/.claude/teknesyum/oturumlar/<oturum>.json` yazılır ve `~/.claude/teknesyum.json`'a
dokunulmaz. Kimlik yoksa eski davranış sürer, makine varsayılanı yazılır. Aynı makinede
iki oturum artık birbirinin profilini ezmez. Çıktıyı olduğu gibi bas, kendin dosya
düzenleme.

Oturuma bağlanan şey **profil kaydı ve model**tir, **efor değildir.** Efor yalnız ajan
tanım dosyasından gelir — `Agent` aracının şemasında `effort` alanı yoktur, oturum başına
ayrılamaz. `durum` bunu her seferinde tek satırla söyler; yarım çözümü tam gibi
göstermemek için oradadır.

Oturum kayıtları 7 günden eskiyse yok sayılır ve makine varsayılanına düşülür; bayat
dosyalar yeni kayıt yazılırken silinir.

`durum` yürürlükteki profili, kaynağını (`oturum` mu `makine` mi) ve o profilin ayırt
edici üç değerini basar: **paralel ajan sayısı, ön araştırma tavanı, denetim eşiği.** Üçü
profilden profile değişen asıl değerlerdir; gerisi bu üçünün sonucudur.

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
| /save ham transkript | `ham.jsonl.gz` gzipli | `ham.jsonl` bire bir | `ham.jsonl` bire bir |
| /loadall proje bloğu | tek satır durum | dört satır durum | dört satır durum |

`scribe` premium'da da düşük eforla çalışır: model yükseldi diye isim değiştirme işine
uzun uzun düşünmek kazanç değil kayıptır. Efor tavanı `xhigh`.

## eco

Token'ın gerçekten kısıt olduğu profil. Felsefesi tek cümle: **token tasarrufu en yüksek
öncelik, hız ve verimlilik feda edilebilir — doğruluk edilemez.**

Her rol `haiku` çalışır. Efor kod üreten ve denetleyen üç rolde `medium` kalır: haiku
maliyeti zaten bir mertebe düşürdü, kod yazan rolü bunun üstüne `low`'a indirmek kabul
kriterini geçmeyen iş üretir ve harcanan tur kazanılan tokenden pahalıya gelir. Denetim
`critical`'e düşer — eco'nun en büyük tasarruf kolu ajan sayısıdır. Model tırmanışı açık
kalır; haiku'nun yetmediği sözleşmede tur harcamak yerine modeli yükseltmek burada daha
da önemlidir.

Kayıt tarafında iki değişiklik daha var, ikisi de veri kaybetmeden:

- `/save` ham transkripti gziplenmiş yazar (`ham.jsonl.gz`). Ölçüm: bu makinedeki 76
  transkriptin medyanı aslının **%29'una** iniyor; 4,07 MB'lık gerçek bir oturum
  dosyası 1,18 MB oluyor ve kaydın süresi 73 ms'den 119 ms'e çıkıyor. `/load --tam`
  gzipliyi de düz kopyayı da okur, fark kullanıcıya görünmez. Kopyalamayı tümden
  atlayıp `durum.json` içindeki kaynak yola işaretçi bırakmak diskte biraz daha
  kazandırırdı ama transkript kaydın denetiminde değil: silinirse `--tam` kaybolurdu.
- `/loadall` proje başına dört satır yerine tek satır durum basar; sözleşme adları,
  commit başlığı ve röle günlüğü düşer. **Devam promptu kısalmaz** — kullanıcının
  kopyalayacağı metin odur.

## normal

Varsayılan. `sonnet`, iki paralel ajan, her sözleşme denetlenir; plan konseyi ve ikinci
görüş kapalı. Kayıt davranışı değişmez: `ham.jsonl` bire bir kopyalanır.

## premium

Hız ve kod kalitesi önceliklidir; token tasarrufu gerekçe sayılmaz. `opus` + `xhigh`,
20 paralel ajan, worktree izolasyonu açık, plan konseyi ve ikinci görüş açık.

Premium açıkken oturum açılışında `Teknesyum ▸ premium mod` satırı çıkar ve ilk iki
istekte modele davranış notu enjekte edilir — paraleli aç, sonnet'e düşme, token
tasarrufunu gerekçe sayma, plan konseyini aç.

## Profilden bağımsız mekanizmalar

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
ister. Eco'da tavan 1'dir: paralel ajan hızdır, token değil.

`~/.claude/teknesyum.json` **makine varsayılanını** `profil` alanında tutar. Alan yoksa
eski `premium` bayrağı okunur: `true` premium, gerisi normal sayılır. Betik bu dosyayı
yalnız oturum kimliği yokken yazar ve ikisini birlikte yazar. Profil okuma sırası:
`TEKNESYUM_PREMIUM` → oturum kaydı → `teknesyum.json` → `normal`.

Eklenti güncellemesi ajan dosyalarını normal profile geri alabilir. `durum` konfig ile
dosyaları karşılaştırır ve uyuşmazlığı söyler; tek satırlık düzeltmesi `/premium premium`.
`TEKNESYUM_PREMIUM=1|0` tek oturumluk ezer, dosyalara dokunmaz.
