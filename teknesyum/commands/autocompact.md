---
description: Otomatik sıkıştırma penceresini profilden türetir ya da elle bir sayıya sabitler
argument-hint: <sayı> | (boş — profilden türet)
allowed-tools: Bash
---

İstenen: $ARGUMENTS

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/premium.js" autocompact $ARGUMENTS
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/premium.js`
altındadır. Çıktıyı olduğu gibi bas, kendin `settings.json` düzenleme.

Argüman **boşsa** değer makine profilinden türer — `eco 100000`, `normal 160000`,
`premium 250000`. Argüman bir **sayıysa** o sayı yazılır ve profil bağı kopar: sonraki
profil değişimleri pencereyi geri almaz, tekrar bağlamak için komutu argümansız çalıştır.

**Pencere neden profile bağlı.** Sıkıştırma eşiği tek başına bir konfor ayarı değil, maliyet
ayarıdır: pencere büyüdükçe her istek daha çok bağlam taşır. `eco` seçen kullanıcı ucuz
istek istemiştir, 250000'lik pencere o kararı sessizce iptal eder. Bu yüzden kurulum artık
kendi başına bir sayı seçmez — `/teknesyum:setup` önce profili sorar, pencere ondan çıkar.

**Değer makine genelidir.** `settings.json`'a yazılır, çünkü koşum ortamı onu oturum
açılışında okur. Profilin kendisi oturuma inebilir (`/premium eco` yalnız o sohbeti
değiştirir) ama pencere inemez: oturum içi profil geçişi `autoCompactWindow`'a **dokunmaz**,
`durum` bunu tek satırla söyler. Pencereyi gerçekten değiştirmek makine kararıdır —
`/premium <profil> --genel` ya da bu komut.

Kullanıcının kendi yazdığı bir değer varsa kurulum onu **ezmez**; bu komut ezer, çünkü
çağıran kullanıcının kendisidir.
