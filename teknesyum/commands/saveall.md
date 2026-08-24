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

Her kayıt `devir.md` de üretir: o oturumun **son asistan mesajının tam metni**, kırpılmadan.

Özel ayna kuruluysa her projenin `ozet.md`, `durum.json`, `calisma.diff` ve `devir.md`
dosyaları aynaya push edilir; **ham transkript gönderilmez**, yerelde kalır. Çıktının
sonundaki `özel ayna:` satırını olduğu gibi bırak — ayna kurulu değilse ya da push
başarısızsa kayıtlar yalnız bu makinededir ve kullanıcı bunu bilmeli.

Genel bakış `/loadall`, tek projenin ayrıntısı o projede `/load`.
