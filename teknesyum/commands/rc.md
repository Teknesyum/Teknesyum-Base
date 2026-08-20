---
description: Bu projeyi telefondan sürülebilir hale getirir — uzak denetim oturumu açar
argument-hint: <oturum adı — boş bırakılırsa klasör adı>
allowed-tools: Bash
---

İstenen: $ARGUMENTS

Betiği çalıştır, çıktısını olduğu gibi bas:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/rc.js" $ARGUMENTS
```

Argüman varsa oturum adıdır, `--ad <değer>` olarak geçir. Tek istisna `kur`:
terminal istemcisi yoksa kurulumu yapar, `--kur` olur. `${CLAUDE_PLUGIN_ROOT}`
çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/rc.js` altındadır.

Betik sırayla: terminal istemcisini bulur, açılış sorularını önceden yanıtlar, bu
sohbeti kaydeder, projenin kökünde uzak denetimi başlatan bir pencere açar.
Kullanıcıya hiçbir şey sorulmaz. **Kendin komut uydurma, pencere açmaya çalışma,
kullanıcıdan terminal açmasını isteme** — betik yapamadığında zaten kopyalanacak
tek satırı basıyor.

Çıkış kodu 3 istemci yok demektir: kullanıcıya `/rc kur` diyebileceğini tek satırda
söyle. Kod 4 sürüm eski demektir, `claude update` gerekir. Kod 5'te pencere açılmadı,
betiğin bastığı komutu kullanıcı kendisi çalıştıracak.

Açıldıktan sonra kendi cümlelerinle özet geçme, betiğin bastığı adımlar yeterli. Tek
ekleyeceğin şey, kullanıcı telefondaki oturumda ne yazacağını sorarsa: kayıt adıyla
`/load <ad>`.

Kip, izin, kapasite seçmek isteyen `/rcadvanced` kullanır; bütün projeleri birden
açan `/rcall`.

**Bu komut geçici.** Masaüstü uygulaması uzak denetimi kendi menüsüne aldığında komut da
betik de silinir; o gün geldiğinde kullanıcıya bunu hatırlat.
