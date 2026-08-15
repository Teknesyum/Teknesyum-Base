---
description: Kapanan hat oturumlarının sonucunu toplar, denetler, sonraki dalgayı açar (T0)
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
---

Bu komut **yönetim oturumunda** çalışır. Kural seti: `skills/relay/references/cok-oturum.md` §6.

Sırayla:

1. **Oku** — `hatlar/*.md` frontmatter, `rapor/*-kapanis.md`, `contracts/done/` listesi,
   `LOG.md` son 20 satır. Sözleşme gövdelerini açma.

2. **Alan ihlali ara** — `git status --porcelain`. Değişen her dosyayı hatların `alan`
   kümeleriyle eşle. Hiçbirine düşmeyen veya yanlış hatta düşen dosya varsa:
   `LOG.md`'ye `sahipsiz` satırı, kullanıcıya bildir, düzeltmeyi hangi hattın alacağına
   karar ver. **Sessizce geçme.**

3. **Denetle** — `denetim` ayarına göre kapanan hattın sözleşmelerini `denetci` ajanına
   doğrulat. Denetim burada yapılır; hat kendi işini onaylamış sayılmaz. `KALDI` çıkarsa
   `protokol.md` §4 düzeltme döngüsü — düzeltme aynı hattın yeni bir oturumunda yapılır,
   satırını bas.

4. **İmzaları taşı** — kapanış raporundaki `Üretilen imza` bölümünü, o hatta bağımlı
   hatların `Arayüzler` bölümüne yaz. Bu adım atlanırsa sonraki hat imzayı uydurur.

5. **Dalga raporu ver** (`protokol.md` §8.4): ilerleme `x/y` hat, kapanan hattın özeti,
   denetim kararı, açık risk, plandan sapma.

6. **Sonraki dalgayı aç** — `depends` karşılanan her hat için kopyalanabilir tek satırlık
   blok bas:

```
/teknesyum:hat H3
```

Açılabilir hat yoksa ve açık hat kalmadıysa kapanış raporunu ver (`protokol.md` §8.6):
hat tablosu, toplam değişiklik, denetimde yakalananlar, yapılmayanlar ve sebebi.

Argüman: $ARGUMENTS
