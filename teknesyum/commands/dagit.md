---
description: Projeyi hatlara böler ve hat oturumlarının başlatma satırlarını basar (T0)
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

Bu komut **yönetim oturumunda** çalışır. Kural seti: `skills/relay/references/cok-oturum.md`
— önce onu oku.

## Hatlar yoksa

`.claude/relay/hatlar/` boşsa hattı sen kur:

1. İşi **3-5 hatta** böl. Ölçüt yetenek alanıdır, dosya sayısı değil: çekirdek mantık,
   arayüz, veri/paketleme, dokümantasyon/locale gibi. Beşi aşma — kullanıcı yönetemez.
2. `alan` kümelerini **kesişmeyecek** şekilde ayır. Kesişme kaçınılmazsa dosyayı tek hatta
   ver, diğeri `Arayüzler` üzerinden tüketsin.
3. Her hat için brifingi ve sözleşmelerini yaz (formatlar `cok-oturum.md` §3, `protokol.md` §2).
4. Her hatta model ata. **Varsayılan sonnet**; mekanik hat haiku, algoritmik/mimari hat opus.
5. `PLAN.md`'ye hat grafiğini ve bağımlılıkları yaz.

## Basılacak çıktı

Önce açılış brifingi (`protokol.md` §8.1) — plan tek cümle, sonra tablo:

| Hat | Ne yapacak | Model | Bekliyor | Alan |
|---|---|---|---|---|

Altına: bilerek kapsam dışı bıraktıkların, gördüğün risk.

Sonra **bağımlılığı karşılanmış her hat için** ayrı bir kod bloğu bas — her blokta tek
satır, başka hiçbir şey:

```
/teknesyum:hat H1
```

Blokların üstünde tek cümleyle ne yapılacağını söyle. Kullanıcı her biri için yeni bir
oturum açıp proje klasörünü ekleyecek ve satırı yapıştıracak; başka bilgi vermesine gerek
kalmasın diye bağlamın tamamı diskte olmalı.

`depends` açık olan hatların satırını **basma** — hangi hat kapanınca açılacağını yaz.

En alta tek satır: hatlar bitince `/topla` ile buraya dönmesi gerektiği.

## Sonrası

Bu oturum yönetim oturumudur — **üretim kodu yazma.** Hatlar çalışırken beklerken iş
üretme, kullanıcı `/topla` ile döndüğünde devam et.

Argüman: $ARGUMENTS
