# Açık hata günlükleri

Teknesyum'un bir işlevi bozuk davrandığında, onu gören oturum burada bir günlük bırakır.
Teknesyum Base'i açan oturum o günlüğü okur ve çözer.

Bunun sebebi tek bir cümledir: **bozukluğu gören oturumla onu çözebilecek oturum aynı
oturum değil.** VideoEdit üstünde çalışan bir sohbet statusline'ın yanlış saydığını
görür ama kullanıcının o an istediği iş başkadır; sohbeti oraya çevirmek işi böler,
hiç söylememek ise bilgiyi yok eder. Günlük ikisinin arasındaki yoldur.

## Bırakmak

Herhangi bir projeden, tek satır:

```
/log yaz --baslik "statusline ajan sayısını yanlış gösteriyor" \
         --belirti "üç ajan çalışırken bir gösteriyor, dördüncüde sıfıra düşüyor" \
         --kaynak "teknesyum/scripts/bridge.js"
```

Betik iskeleti `~/.claude/teknesyum/openlogs/HATA-<slug>.md` altına yazar — makine
geneli bir makara. Başka bir projedeki oturumun Teknesyum Base'in diskte nerede
durduğunu bilmesi gerekmez; bilmesi gerekseydi yol bulunamadığı her seferde günlük
hiç yazılmazdı.

İskeleti bırakıp geçme. İki bölüm senin doldurman içindir:

- **`## 1. Ne oldu`** — ne yapıldı, ne bekleniyordu, ne oldu. Tekrar üretme adımları.
  Varsa ölçüm: kaç turda kaç kez, hangi çıktı, hangi satır.
- **`## 2. Ölçü`** — bu hatanın kapandığını gösteren tek şey ne? Bu satır yoksa günlüğü
  sonra okuyan oturum ne zaman duracağını bilemez ve günlük kapanmaz.

## Çözmek

Teknesyum Base açıkken `/log`. Komut listeyi basar, en eskisini okur ve çözmeye başlar.
Açılışta açık günlük varsa base zaten haber verir.

Kapanış iki türlüdür ve **kararı kullanıcı verir**:

| Komut | Ne zaman |
|---|---|
| `/log kapat <ad>` | Sorun tamamen gitti, dosyada saklanacak bir şey kalmadı — silinir |
| `/log arsivle <ad>` | Ölçüm, karar ya da ileride lazım olacak bir gerekçe var — `kapali/` altına taşınır |

Çözülemeyen günlük kapatılmaz. Ne denendiği ve nerede tıkanıldığı gövdesine yazılır,
günlük açık kalır.

## Biçim

```markdown
# Hata: <tek cümlelik başlık>

**Durum:** açık.
**Belirti:** <gözlenen davranış>
**Kaynak:** <dosya ya da modül>
**Görüldüğü proje:** <proje adı>

---

## 1. Ne oldu
## 2. Ölçü
```

Dosya adı `HATA-` ile başlar ve `.md` ile biter; `/log` yalnız bu deseni listeler.
`kapali/` altındakiler açık sayılmaz.
