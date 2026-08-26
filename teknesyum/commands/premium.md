---
description: Profili değiştirir — premium, normal veya eco; hangisinin yürürlükte olduğunu söyler
argument-hint: premium | normal | eco | durum | <profil> this | this sil
allowed-tools: Bash
---

İstenen: $ARGUMENTS

Bu komut **üç profil arasında geçiş yapar**: `eco`, `normal`, `premium`. Adı `/premium`
kalmıştır çünkü ezberde odur; işlevi profil anahtarıdır, premium düğmesi değil.

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/premium.js" <eco|normal|premium|durum> [this|this sil]
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/premium.js`
altındadır. Argüman boşsa `durum` çalıştır — kendiliğinden profil değiştirme.

Eski çağrılar durur: `aç` premium, `kapat` normal demektir. `standart` da `normal`'e gider.

## Kapsam: çıplak makinedir, `this` bu sohbettir

Tek cümle: **çıplak komut makine varsayılanını değiştirir, sonuna `this` eklenirse yalnız
içinde bulunulan sohbeti değiştirir.** `this` her zaman en sondadır ve her ayar komutunda
aynı anlama gelir.

```
/premium premium      makine geneli — bundan sonraki her oturum premium
/premium eco this     yalnız bu sohbet eco, makine varsayılanı elleşmez
/premium this         yalnız bu sohbet premium (değer verilmezse komutun adı geçer)
/premium this sil     bu sohbete özel profili siler, geneline döner
```

**Okuma sırası değişmez ve oturum kaydı üstte kalır:** `TEKNESYUM_PREMIUM` → oturum kaydı
→ `teknesyum.json` → `normal`. Bunun tek gerçek bedeli sessiz gölgelemedir: bu sohbette
`this` ile ayar yapıldıysa çıplak komut geneli değiştirir ama burada hiçbir şey değişmez.
Betik o durumda üç satır basar — makine varsayılanının ne olduğunu, bu sohbette hangi
değerin yürürlükte kaldığını ve `this sil` ile nasıl temizleneceğini. **O üç satırı
kısaltma, olduğu gibi bas.**

`--genel` ve `--global` bayrakları kaldırılmadı; artık çıplak komutla aynı şeyi yapar ve
yalnız eski çağrılar kırılmasın diye durur. Yeni metinde kullanma.

**Betik hiçbir depo dosyası yazmaz.** Ajan frontmatter'ı ve relay düğmeleri
(`skills/relay/SETTINGS.md`) **makine tabanıdır** ve `normal` profilin değerlerinde durur;
profil onları ezmez. Yazdığı tek yer profil kaydıdır. Çıktıyı olduğu gibi bas, kendin
dosya düzenleme.

Profilin tabandan **sapan** düğmeleri oturumun kanca enjeksiyonuyla gider — tam liste
değil, yalnız sapanlar. Tam listeyi her isteme yazmak enjeksiyonun kendi ölçtüğü kalemi,
konuşma hacmini, büyütür. Düğme okuma sırası üç katmandır: **oturum profili → proje
`.claude/relay/SETTINGS.md` → eklentinin `SETTINGS.md`'si.** `agent_stall` ve `agent_loop`
gibi kanca düğmeleri metne hiç girmez; onları model değil kanca okur.

Ajan dosyalarında **`model` alanı yoktur.** Modeli her çağrıda T0 geçer ve çağrı anındaki
değer frontmatter'ı ezer — bu ölçüldü: tek `planner` tanımıyla aynı anda `fable` ve `opus`
açıldı. Alan hiç bulunmayınca ezme ihtimali de kalmaz.

Oturuma bağlanan şey **profil kaydı ve model**dir, **efor değildir.** Efor yalnız ajan
tanım dosyasından gelir — `Agent` aracının şemasında `effort` alanı yoktur, oturum başına
ayrılamaz. Taban `normal`'dir: tek taban kalınca eco `xhigh` öderse eco anlamını, premium
`medium`'da kalırsa premium anlamını yitirirdi. Premium farkını `model` taşır, efor ikinci
derece kaldıraçtır. `durum` bunu her seferinde tek satırla söyler; yarım çözümü tam gibi
göstermemek için oradadır.

Oturum kayıtları 7 günden eskiyse yok sayılır ve makine varsayılanına düşülür; bayat
dosyalar yeni kayıt yazılırken silinir.

`durum` yürürlükteki profili, kaynağını (`oturum` mu `makine` mi) ve o profilin ayırt
edici üç değerini basar: **paralel ajan sayısı, ön araştırma tavanı, denetim eşiği.** Üçü
profilden profile değişen asıl değerlerdir; gerisi bu üçünün sonucudur.

Profilden profile değişen tek ajan alanı **model**dir; onu da dosya değil çağrı taşır.

| | eco | normal | premium |
|---|---|---|---|
| builder · ui-builder | haiku | sonnet | opus |
| auditor | haiku | sonnet | opus |
| scout | haiku | sonnet | opus |
| scribe | haiku | haiku | opus |
| planner | haiku | sonnet | opus |
| advisor | haiku | sonnet | fable |
| paralel ajan | 1 | 2 | 20 |
| worktree izolasyonu | kapalı | kapalı | açık |
| model tırmanışı | açık | açık | kapalı — zaten tepede |
| denetim eşiği | very-critical | critical | high |
| rapor · brifing | short · quiet | short · milestone | detailed · every-step |
| plan konseyi | kapalı | kapalı | açık — fable + opus |
| ikinci görüş | kapalı | kapalı | açık — fable |
| ön araştırma | 1+ depo | 10+ depo | 50+ depo |
| /save ham transkript | `ham.jsonl.gz` gzipli | `ham.jsonl` bire bir | `ham.jsonl` bire bir |
| /loadall proje bloğu | tek satır durum | dört satır durum | dört satır durum |

**Efor ve tur tavanı üç profilde de aynıdır** — ajan dosyasındaki taban değerlerdir:
`builder` · `ui-builder` `medium`/60, `auditor` `high`/30, `scout` `high`/45, `planner`
`high`/40, `scribe` `low`/40, `advisor` `low`/15. `scribe` ve `advisor` premiumda da
düşük eforda kalır: model yükseldi diye isim değiştirme işine ya da kısa bir görüşe uzun
uzun düşünmek kazanç değil kayıptır.

## eco

Token'ın gerçekten kısıt olduğu profil. Felsefesi tek cümle: **token tasarrufu en yüksek
öncelik, hız ve verimlilik feda edilebilir — doğruluk edilemez.**

Her rol `haiku` çalışır. Efor kod üreten ve denetleyen üç rolde `medium` kalır: haiku
maliyeti zaten bir mertebe düşürdü, kod yazan rolü bunun üstüne `low`'a indirmek kabul
kriterini geçmeyen iş üretir ve harcanan tur kazanılan tokenden pahalıya gelir. Denetim
eşiği `very-critical`'e çıkar — yalnız geri dönüşü olmayan sözleşme denetlenir; eco'nun
en büyük tasarruf kolu ajan sayısıdır. Model tırmanışı açık kalır; haiku'nun yetmediği sözleşmede tur harcamak yerine modeli yükseltmek burada daha
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

Varsayılan. `sonnet`, iki paralel ajan, denetim eşiği `critical`; plan konseyi ve ikinci
görüş kapalı. Kayıt davranışı değişmez: `ham.jsonl` bire bir kopyalanır.

## premium

Hız ve kod kalitesi önceliklidir; token tasarrufu gerekçe sayılmaz. `opus` + `xhigh`,
20 paralel ajan, worktree izolasyonu açık, plan konseyi ve ikinci görüş açık.

**Premiumda bile her sözleşme koşulsuz denetlenmez.** Denetim eşiği `high`'dır: geri
dönüşü ucuz ve basit işte denetçi açmak tur ve token harcar, karşılığında hiçbir şey
yakalamaz. Eşik aşıldığı anda — göç, şema, yayımlanmış arayüz, güvenlik sınırı — denetçi
açılır ve `opus`/`xhigh` ile titiz çalışır. Ölçü sözleşmenin büyüklüğü değil **geri dönüş
maliyetidir.**

Premium açıkken oturum açılışında `Teknesyum ▸ premium mod` satırı çıkar ve ilk iki
istekte modele davranış notu enjekte edilir — paraleli aç, sonnet'e düşme, token
tasarrufunu gerekçe sayma, plan konseyini aç.

## Profilden bağımsız mekanizmalar

**Plan konseyi** premiumla birlikte açılır: sıfırdan projede `PLAN.md` yazılmadan önce
aynı brifingle iki `planner` ajanı açılır — biri `fable`, biri `opus`. İkisi de iş yapmaz;
`planner` ajanının elinde yazma aracı yoktur. Ortak çıkan karar doğrulanmış sayılır,
ayrıştıkları yer `PLAN.md` içinde **Konsey ayrışması** başlığına gerekçesiyle yazılır.
Sentezi ve kalemi T0 tutar — delege edilen karar değil seçenek üretimidir. Ayrıntı relay
SKILL `references/plan-akisi.md` §1.5.

**İkinci görüş** konseyin küçük kardeşidir ve o da premiumla açılır. T0 doğru kararın ne
olduğunu bilmediği bir düğümde **`advisor` ajanını** açar; `fable` üç başlıkta en fazla 20
satır cevap verir: görüş, gerekçe, kaçırdığın şey. Konsey planın tamamı içindir ve iki
üyelidir; görüş tek bir karar içindir ve tek üyelidir. Bağlayıcı değil, kullanıcıya
sormanın da yerine geçmez. **Dokuz** durumda tetiklenir — ayrıntı relay SKILL `references/plan-akisi.md` §1.5.1.

`advisor` ayrı bir ajandır, `planner`'ın kipi değil. Sebebi ölçülmüş bir kısıt: `Agent`
aracının şemasında `model` var, `effort` yok; efor yalnızca ajan tanımından gelir. İki kip
tek dosyada dururken aynı eforu paylaşıyordu. Ayrılınca `advisor` premiumda bile `low`
eforda kalabiliyor — tetikleyici sayısı arttıkça danışmanın ucuz olması önem kazanır.

**Ön araştırma tavanı** profille değişir: eco 1, normal 10, premium 50 depo (SKILL `references/plan-akisi.md` §1.4).
Derinlik değişmez, kapsam değişir: elli depo aşamalar hâlinde okunur ve her aşama bir
sonrakinin aday listesini eler.

**Paralel tavanı** premiumda 20'dir. Tavan token için değil: `worktree_isolation` açıkken
her ajan bir repo kopyası ve bir süreç demektir, ve T0 hatalı bir döngüye girerse tavan
güvenlik ağı olur. Kararı T0 verir ve ölçüsü hızdır — bölünebilen işi bölmemek gerekçe
ister. Eco'da tavan 1'dir: paralel ajan hızdır, token değil.

`~/.claude/teknesyum.json` **makine varsayılanını** `profil` alanında tutar. Alan yoksa
eski `premium` bayrağı okunur: `true` premium, gerisi normal sayılır. Betik bu dosyayı
çıplak çağrıda yazar ve `profil` ile `premium` alanlarını birlikte günceller; `this` ile
çağrıldığında ona hiç dokunmaz. Profil okuma sırası: `TEKNESYUM_PREMIUM` → oturum kaydı
→ `teknesyum.json` → `normal`.

Betik dosya yazmadığı için eklenti güncellemesiyle profil arasında uyuşmazlık da oluşmaz;
`durum` artık uyuşmazlık satırı basmaz, yürürlükteki profili ve sapan düğmeleri basar.
`TEKNESYUM_PREMIUM=1|0` tek oturumluk ezer, dosyalara dokunmaz.
