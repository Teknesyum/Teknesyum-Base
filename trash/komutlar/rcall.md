---
description: Opens remote control for every project
argument-hint: <boş · tavan N · kok <klasör>>
allowed-tools: Bash
---

İstenen: $ARGUMENTS

Betiği çalıştır, çıktısını olduğu gibi bas:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/rc.js" --hepsi $ARGUMENTS
```

Argümanları bayrağa çevir: `tavan <N>` → `--tavan <N>` (kaç pencere açılacağı,
öntanımlı 12) · `kok <klasör>` → `--kok <klasör>` (taranacak üst klasör, öntanımlı
bulunduğun projenin bir üstü) · `metin` → `--metin` (pencere açmaz, komutları listeler).

Betik üst klasörün bir alt katındaki proje klasörlerini tarar. `!`, `.` veya `_` ile
başlayan klasörler — arşivlenmiş ve tamamlanmış işler — dışarıda kalır; kalıcı olarak
elemek istenen başka klasör varsa `~/.claude/teknesyum.json` içindeki `rcAtla`
listesine adı yazılır. Kullanıcı bunu sorarsa söyle, sormadan liste düzenleme.

Her proje için ayrı bir pencere açılır ve hiçbiri soru sormaz. Toplu açılışta sohbet
kaydı alınmaz — kayıt tek projeye aittir, onu `/rc` yapar.

Çıkış kodu 6 taranan klasörde proje bulunamadı demektir. 3 istemci yok, 4 sürüm eski,
5 en az bir pencere açılamadı — betiğin bastığı komutları kullanıcı kendisi çalıştırır.
