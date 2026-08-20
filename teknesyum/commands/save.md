---
description: Bu oturumu diske kaydeder — konuşma, bağlam, git durumu, gönderilmemiş metin
argument-hint: <kayıt adı — boş bırakılırsa tarih>
allowed-tools: Bash
---

Kaydedilecek ad: $ARGUMENTS

Betiği çalıştır, çıktısını olduğu gibi bas, sonuna bir satır ekleme:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/oturum.js" kaydet "$ARGUMENTS"
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/oturum.js`
altındadır; yolu bul ve öyle çalıştır. Kayıt kendiliğinden `<proje>/.claude/oturumlar/<ad>/`
altına gider.

**Kendin özet çıkarma, dosya okuma, transkript tarama.** Kaydı betik yapar; senin işin
sadece çalıştırmak. Argüman boşsa ad tarihten üretilir, sorma.

Kaydın içinde ne var:

| Dosya | İçerik |
|---|---|
| `ham.jsonl` | Transkriptin bire bir kopyası — hiçbir şey kaybolmaz |
| `ozet.md` | `/load` ile geri okunan özet: her tur, araç çağrıları, son 10 tur uzun |
| `durum.json` | Oturum kimliği, model, bağlam kullanımı, git, relay, taslak, kuyruk |
| `calisma.diff` | Kaydetme anındaki kirli çalışma alanının yaması |

Betik çıktısında **gönderilmemiş metin: var** yazıyorsa kutuda duran, hiç gönderilmemiş
yazı da kaydedilmiştir — Claude Code bunu 200 karakterlik önizleme olarak tuttuğu için
kayıt da o kadarını içerir. Kuyrukta bekleyen mesajlar tam metinle kaydedilir.

Aynı ad ikinci kez verilirse eski kayıt üzerine yazılır — kullanıcı ada takılmışsa
uyar, kendiliğinden ad değiştirme.
