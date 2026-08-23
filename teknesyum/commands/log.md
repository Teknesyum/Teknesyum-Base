---
description: Açık hata günlüklerini listeler, okur ve çözüldükçe kapatır
argument-hint: [oku <ad> | al <ad> | kapat <ad> | arsivle <ad> | yaz --baslik "..." --belirti "..." --kaynak "..."]
allowed-tools: Bash, Read, Grep, Glob, Edit, Write
---

İstenen: $ARGUMENTS

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/log.js" $ARGUMENTS
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/log.js`
altındadır.

## Argüman boşsa: listele, oku, çöz

Bu komut liste basıp durmaz. Argüman boşsa sıra şudur:

1. `/log` listesini bas.
2. Açık günlük varsa **en eskisini** `oku` ile tam oku.
3. Günlüğün `## Ölçü` bölümüne bak — kapandığını gösteren şey ne? Yazmıyorsa
   kullanıcıya sor, kendin uydurma.
4. Sorunu çöz. Günlük bir öneri listesi taşıyorsa onu emir saymadan tart; günlüğü yazan
   oturum tam bağlamı görmemiş olabilir.
5. Kapat: sorun **tamamen** gittiyse `/log kapat <ad>` siler. Ölçüm, karar ya da ileride
   lazım olacak bir gerekçe taşıyorsa `/log arsivle <ad>` `docs/openlogs/kapali/`
   altına taşır. **Karar senin değil kullanıcınındır** — hangisini istediğini sor.
6. Birden çok günlük varsa birini bitirmeden ötekine geçme.

Çözemediysen günlüğü kapatma. Gövdesine ne denendiğini ve neden tıkandığını yaz,
açık bırak.

## Kullanım

```
/log                      açık günlükleri listele (ve çözmeye başla)
/log oku <ad>             bir günlüğü tam oku
/log al <ad>              makaradaki günlüğü depoya taşı — sürüm kontrolüne girer
/log kapat <ad>           sil — sorun tamamen gitti, saklanacak bir şey yok
/log arsivle <ad>         docs/openlogs/kapali/ altına taşı — ölçüm veya karar saklanacak
/log yaz --baslik "..." --belirti "..." --kaynak "..."
                          başka bir projeden günlük bırak
```

Ad kısmi yazılabilir; iki günlük birden eşleşirse betik hangileri olduğunu söyleyip durur.

## İki yer

| Yer | Nerede | Kim yazar |
|---|---|---|
| makara | `~/.claude/teknesyum/openlogs/` | herhangi bir projedeki oturum |
| depo | `<base>/docs/openlogs/` | üstünde çalışılan günlük, sürüm kontrolünde |

Makara makine genelindedir ve bu bilerek böyledir: başka bir projedeki oturumun Teknesyum
Base'in diskte nerede durduğunu bilmesi gerekmez. Bilmesi gerekseydi yol bulunamadığı her
seferde günlük hiç yazılmazdı. Ele alınan günlük `/log al` ile depoya taşınır.

## Başka projeden günlük bırakmak

Teknesyum'un bir işlevi bozuk davrandığında oturumu o işi çözmeye çevirme — kullanıcının
istediği iş başkaydı. Tek satırla günlük bırak, kendi işine dön:

```
/log yaz --baslik "statusline ajan sayısını yanlış gösteriyor" \
         --belirti "üç ajan çalışırken bir gösteriyor, dördüncüde sıfıra düşüyor" \
         --kaynak "teknesyum/scripts/bridge.js"
```

Betik iskeleti yazar; `## 1. Ne oldu` ve `## 2. Ölçü` bölümlerini **sen doldurursun**.
Boş günlük çözülemez ve çözülemeyen günlük kapanmaz. `## 2. Ölçü` özellikle önemlidir:
"bu hatanın kapandığını gösteren tek şey ne?" sorusunun cevabı yoksa, günlüğü sonra okuyan
oturum ne zaman duracağını bilemez.

Açılışta açık günlük varsa base bunu söyler; ayrıca her oturumun açılış bağlamına
bildirme yordamı bir kez yazılır — her projede, oturum başına bir kez.
