---
description: Saves this session to disk — conversation, context, git state, unsent text
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
| `ham.jsonl.gz` | eco profilinde aynı kopya, gzipli — yine hiçbir şey kaybolmaz |
| `ozet.md` | `/load` ile geri okunan özet: her tur, araç çağrıları, son 10 tur uzun |
| `durum.json` | Oturum kimliği, model, bağlam kullanımı, git, relay, taslak, kuyruk |
| `calisma.diff` | Kaydetme anındaki kirli çalışma alanının yaması |
| `devir.md` | **Son asistan mesajının tam metni, kırpılmadan** |

`devir.md` özetin kısaltabildiği tek şeyi korur: son mesajın gövdesi. "Senden istediklerim"
gibi bölümler orada kelimesi kelimesine durur. `ozet.md` kırpar, `devir.md` kırpmaz; araç
çağrıları girmez, kullanıcıya görünen metin girer.

**Kayıt özel aynaya da gider.** Ayna kuruluysa (`/ozel kur`) betik şu dördünü push eder:
`ozet.md`, `durum.json`, `calisma.diff`, `devir.md`. **`ham.jsonl` gönderilmez** — bu
dosya megabaytlarca olur ve git'te delta'lanmaz; yerelde kalır. Böylece bir makinede
`/save`, başka makinede `/load` yeter, elle veri taşımak gerekmez.

Çıktının son satırı `özel ayna:` ile başlar ve üç şeyden birini söyler. **Bu satırı yut,
kısalt ya da yumuşat.** Kullanıcı kayıt aldığını sanıp öteki makinede bulamamalı:

| Satır | Anlamı |
|---|---|
| `gönderildi · …` | Dört dosya aynada, başka makineden `/load` ile açılır |
| `kurulu değil, push edilmedi` | Kayıt tam ama yalnız bu makinede — hata değil |
| `push edilemedi: <sebep>` | Kayıt tam ama yalnız bu makinede — sebebi aynen aktar |

**eco profilinde ham transkript sıkıştırılarak yazılır.** Ölçüm: medyan transkript
aslının %29'una iniyor, 3,28 MB'lık bir oturum dosyası 0,98 MB'a. İçerik aynıdır,
`/load --tam` gzipliyi de düz kopyayı da okur. Betiğin çıktısındaki `ham transkript:`
satırı hangisinin yazıldığını ve boyutu söyler. Normal ve premiumda kopya bire birdir.

Betik çıktısında **gönderilmemiş metin: var** yazıyorsa kutuda duran, hiç gönderilmemiş
yazı da kaydedilmiştir — Claude Code bunu 200 karakterlik önizleme olarak tuttuğu için
kayıt da o kadarını içerir. Kuyrukta bekleyen mesajlar tam metinle kaydedilir.

**Aynı projede birden fazla sohbet çalışabilir.** Adsız kayıt tarihin yanına oturum
kimliğini de yazar, o yüzden iki sohbet aynı dakikada kaydetse bile birbirini silmez.
Kendi kaydını aynı adla tazeleyebilirsin; ad başka bir sohbetin kaydına aitse betik
reddeder. Gerçekten üstüne yazılacaksa `--ustune` ekle — önce kullanıcıya sor, bu
başkasının kaydını siler.

Hangi transkriptin kaydedileceği tahmin edilmez: Claude Code kendi oturum kimliğini
ortama koyar, betik onu okur. `--oturum <id>` ile başka bir sohbetin transkriptini de
kaydedebilirsin.
