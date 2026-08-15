---
description: Bu oturumu bir röle hattına bağlar ve hattın işini yürütür (hat oturumu)
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, Skill
---

Bu oturum bir **hat oturumudur**. Yönetim oturumu değilsin: plan yapmazsın, hat sınırını
tartışmazsın, başka hattın işine bakmazsın.

Argüman hat kimliğidir (`H2` gibi). Argüman yoksa `.claude/relay/hatlar/` içinde
`status: acik` olan tek hattı seç; birden fazlaysa kullanıcıya sor.

## Başlarken

1. `.claude/relay/hatlar/<id>.md` oku. Yoksa dur: "hat bulunamadı, T0 oturumunda `/dagit` çalıştır".
2. `depends` açıksa **başlama** — söyle ve dur.
3. Brifingdeki `model` bu oturumun modelinden farklıysa kullanıcıya tek satırla söyle,
   modeli o değiştirir.
4. `status: acik` yap, `LOG.md`'ye `H<n> acildi` satırı ekle.
5. Hattın sözleşmelerini (`sozlesmeler`) sırayla al. Her biri için `contracts/T<n>.md`
   protokolü geçerli — `owns` dışına yazma, Kayıt noktasını güncelle, bitince
   `contracts/done/`'a taşı.

## Sınır

**`alan` dışına tek satır yazma.** Başka hattın dosyasında değişiklik gerekiyorsa yapma;
`rapor/`a not düş, T0 karar versin. Ayrı oturumlar birbirini göremez — çakışmayı kimse
fark etmez, bu yüzden sınır pazarlığa kapalıdır.

Bağımlı olduğun hattın ürettiği imzalar brifingin `Arayüzler` bölümündedir. Orada yoksa
uydurma, `rapor/`a eksik olarak yaz.

İş büyükse kendi içinde alt ajan aç (`usta`, `kayitci`) — hat = oturum, sözleşme = görev.
Denetçi çağırma; denetim T0'da yapılır, kendi işini onaylayamazsın.

## Bitirirken

`Çıkış koşulu` karşılandığında `rapor/H<n>-kapanis.md` yaz:

```markdown
# H<n> — <baslik> kapanış
## Yapıldı        sözleşme sözleşme, tek satır
## Değişen dosya  tam liste
## Üretilen imza  sonraki hatların tüketeceği fonksiyon/tip/prop imzaları
## Yapılmadı      ve sebebi
## Uyarı          alan dışında gördüğün ama dokunmadığın sorunlar
```

Sonra `status: kapandi`, `LOG.md`'ye `H<n> kapandi` satırı. Kullanıcıya tek şey söyle:

```
/topla
```

ve bunu **T0 yönetim oturumunda** çalıştırması gerektiğini belirt.

Argüman: $ARGUMENTS
