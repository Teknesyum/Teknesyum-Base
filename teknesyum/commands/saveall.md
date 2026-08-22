---
description: Bütün projelerin son oturumunu kendi klasörlerine kaydeder
argument-hint: <boş · kok <üst klasör>>
allowed-tools: Bash
---

İstenen: $ARGUMENTS

Betiği çalıştır, çıktısını olduğu gibi bas:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/oturum.js" toplu-kaydet $ARGUMENTS
```

`kok <klasör>` → `--kok <klasör>` (taranacak üst klasör, öntanımlı bulunduğun projenin
bir üstü). `${CLAUDE_PLUGIN_ROOT}` çözülmezse betik
`~/.claude/plugins/**/teknesyum/scripts/oturum.js` altındadır.

Her proje için o projenin **en son oturumunun** transkripti kaydedilir; kayıt projenin
kendi `.claude/oturumlar/<ad>/` klasörüne yazılır ve depoya girmez. Eleme kuralı
`/rcall` ile aynı: `!`, `.` veya `_` ile başlayan klasörler — arşivlenmiş ve tamamlanmış
işler — dışarıda kalır.

Çıktıdan sonra kendi cümlelerinle özet geçme; kaç projenin kaydedildiği betiğin ilk
satırında yazıyor. Kaydedilemeyen proje varsa sebebini tek satırda aktar.

Profil eco ise her projenin ham transkripti gziplenerek yazılır (`ham.jsonl.gz`);
içerik aynıdır, `/load --tam` yine çalışır.

Genel bakış `/loadall`, tek projenin ayrıntısı o projede `/load`.
