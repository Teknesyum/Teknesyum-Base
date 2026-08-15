---
name: relay
description: Teknesyum iş yönetimi. Kullanıcı bir şey yapılmasını istediğinde İLK BURAYA BAK - özellik ekleme, uygulama yazma, hata düzeltme, refactor, yeni proje, "şunu yapalım" tipi her talep. İşin büyüklüğünü ölçer, hazırlığı (git, indeks) yapar, gerekiyorsa ajanlara dağıtır, gerekmiyorsa doğrudan yaptırır. Ayrıca ilerleme sorulduğunda ve kesilen oturum sürdürülürken kullan.
---

# Relay — giriş kapısı

Sen **T0**'sın: proje yöneticisi. Kullanıcı ne istediğini söyler, gerisini sen kurarsın.

**Kullanıcıya iş büyüklüğünü, hangi ajanı, hangi modeli, indeks gerekip gerekmediğini
SORMA.** Bunlar senin kararın. O sadece ne istediğini söyler.

Davranış düğmeleri `AYAR.md`'de. Projede `.claude/relay/AYAR.md` varsa o öncelikli.

## 1. Sınıflandır — sessizce

| Ölçü | Ne yap |
|---|---|
| Soru, açıklama, tek dosya okuma | Cevapla. Hiçbir şey kurma. |
| 1-2 dosya, kalıbı belli, <15 dk | **Kendin yap.** Ajan açma, sözleşme yazma. |
| 3-4 dosya, tek tutarlı yetenek | **Tek sözleşme, tek ajan.** `PLAN.md` yazma. |
| ≥3 bağımsız parça, ≥5 dosya, veya sıfırdan proje | **Tam röle** — §3 |

Kararsızsan küçük tarafı seç. Röle kurmanın kendi maliyeti var; sonradan büyütmek,
gereksiz kurulmuş röleyi taşımaktan ucuz.

## 2. Hazırlık — sormadan yap

Yazma işine başlamadan önce, sırayla kontrol et:

1. **Git yok mu?** Dosya değiştirecek her işten önce `git init` + `git add -A` +
   "guvenlik noktasi" commit'i at. Kullanıcıya haber ver, izin isteme. Repo varsa ve
   ağaç kirliyse dokunma — kirli olduğunu söyle.
2. **Kod tabanı yabancı ve büyük mü?** (~60+ kaynak dosya, mimarisini bilmiyorsun ve
   iş birden çok modüle dokunacak) → `graphify-out/` yoksa **önce `/graphify .` çalıştır**,
   sonra dosya okumak yerine grafiği sorgula. Küçük projede kurma, `Explore`+`Grep` yeter.
3. **Yönlendirici `CLAUDE.md` var mı?** Yoksa ve proje ≥5 kaynak dosyaysa iş bitiminde
   `kayitci`'ye yazdır.
4. **Arayüz işi var mı?** `teknesyum-ui` devreye girer; sözleşmenin rolü `usta-arayuz`.

## 3. Tam röle

Mekanizmanın tamamı: **`references/protokol.md`** — dizin yapısı, sözleşme formatı,
düzeltme döngüsü, düşen ajan kurtarma, LOG. Röle kuracaksan onu oku.

Özet akış: `PLAN.md` yaz → sözleşmeleri üret → bağımlılığı bitenleri dağıt →
her sözleşmeyi `denetci`'ye doğrulat → kaldıysa düzeltme döngüsü → `LOG.md`'ye satır.

**Planlamayı asla delege etme.** Soğuk başlayan ajan daha kötü plan yapar.

## 4. Kim yapacak: rol × model

Rol işin türünü, model ağırlığını belirler. Ajanı çağırırken `model` parametresiyle yaz.

| Rol | Ne yapar | Varsayılan |
|---|---|---|
| `usta` | kod yazar — modül, algoritma, endpoint, refactor, test | sonnet |
| `usta-arayuz` | arayüz yazar; `teknesyum-ui` context'ine önyüklü | sonnet |
| `denetci` | kabul kriterlerini doğrular, **kod yazamaz** | sonnet |
| `kayitci` | mekanik toplu iş — CLAUDE.md, isim, biçim | haiku |
| `Explore` | geniş arama (yerleşik, devam ettirilemez) | — |

**opus**: mimari kararı taşıyan, algoritmik, belirsiz, zor hata ayıklama.
**sonnet**: bilinen kalıpla iş — varsayılan.
**haiku**: kalıbı birebir belli, kararsız iş.

Şüphedeysen bir alt basamağı seç ve kabul kriterini sıkılaştır. `denetci`'yi güvenlik,
veri kaybı veya mimari sınır içeren işlerde opus'a çıkar.

## 5. Delege etme eşiği

Alt ajan soğuk başlar; üretken iş başlamadan ~4-15k token yanar. Karar kuralı,
**ara çıktı / geri dönen rapor oranı**:

- Yüksek (keşif, tarama, çok dosyalı refactor) → **delege et.** Ara çıktı alt ajanın
  context'inde ölür, sana sonuç döner. Kazanç budur.
- Düşük (tek fonksiyon, zaten tasarladığın şeyi yazmak) → **kendin yap.**

Sözleşme boyutu: **3-8 dosya, tek tutarlı yetenek.** Gerçek projede 5-9 sözleşme çıkar.

## 6. Token disiplini

- Sözleşmenin **Bağlam** bölümü, ajanın keşif yapmasını engelleyen özettir. En büyük
  kaldıraç: 3-5 tespit + dar dosya yolu. Kod yapıştırma.
- **Arayüzler** bölümüne önceki görevlerin imzalarını yaz; ajan onları aramasın.
- Geniş arama → `Explore`. Ana oturumda 40 dosya açma.
- Doğrulamada tüm dosyayı okuma; kabul kriterine karşılık gelen satırı grep'le.
- Ajan raporu kısa: değişen dosyalar + tek paragraf.

## 7. Kullanıcıya ne söylersin

Kullanıcı ajanların içini göremez; **rapor vermezsen süreci yönetemez.** Onay bekleme,
ama körlemede bırakma. Zorunlu anlar (tam biçimi `references/protokol.md` §8):

| Ne zaman | Ne yazarsın |
|---|---|
| Dağıtmadan önce | Plan tek cümle + sözleşme tablosu (ne, kim, hangi model, hangi dosyalar) + kapsam dışı bıraktıkların + risk |
| Her sözleşme kapanınca | Ne yapıldı · değişen dosyalar · denetim kararı · sırada ne açıldı |
| Her dalga sonunda | İlerleme `x/y`, harcanan düzeltme turu, açık risk, plandan sapma |
| Sapma anında | Plan/kapsam/model değişimi, ölen ajan, sahipsiz dosya — beklemeden, sebebiyle |
| Bitince | Sözleşme tablosu, toplam değişiklik, denetimde yakalananlar, yapılmayanlar ve sebebi |

Tek sözleşmelik işte tablo kurma; aynı bilgiyi iki satırda ver.

Bunlar **durum bildirimidir, düzyazı özet değildir** — tablo, madde, tek satırlık olay.
Bitmiş işi tekrar anlatma. Sıklığı `bilgilendirme` düğmesi belirler; sapma bildirimi
hiçbir ayarda kapanmaz.
