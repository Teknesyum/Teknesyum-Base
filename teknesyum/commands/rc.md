---
description: Opens a remote control session — drive this project from your phone
argument-hint: <ad · --gelismis [kip|izin|kapasite|kaydetme|metin] · --hepsi [tavan N|kok <klasör>]>
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

## `--gelismis` — kip, izin, kapasite kullanıcıda

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/rc.js" --gelismis $ARGUMENTS
```

Argümanları bayrağa çevir: `kip <değer>` → `--spawn <değer>` (same-dir · worktree ·
session) · `izin <değer>` → `--izin <değer>` (acceptEdits, auto, bypassPermissions,
default, dontAsk, plan) · `kapasite <N>` → `--kapasite <N>` · `kaydetme` →
`--kaydetme` (sohbeti kaydetmeden açar) · `metin` → `--metin` (pencere açmaz, yalnız
kopyalanacak komutu yazar) · başka her şey oturum adıdır, `--ad <değer>`.

Bayraksız `/rc` bütün açılış sorularını önceden yanıtlar; `--gelismis` tersini yapar,
kip sorusunu pencereye geri bırakır. Kullanıcı burada seçim yapmayı bekler, sen onun
yerine seçme. Verilmeyen ayarı da uydurma — verilmezse pencere sorar.

## `--hepsi` — üst klasördeki bütün projeler

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/rc.js" --hepsi $ARGUMENTS
```

`tavan <N>` → `--tavan <N>` (kaç pencere açılacağı, öntanımlı 12) · `kok <klasör>` →
`--kok <klasör>` (taranacak üst klasör, öntanımlı bulunduğun projenin bir üstü) ·
`metin` → `--metin` (pencere açmaz, komutları listeler).

Betik üst klasörün bir alt katındaki proje klasörlerini tarar. `!`, `.` veya `_` ile
başlayan klasörler — arşivlenmiş ve tamamlanmış işler — dışarıda kalır; kalıcı olarak
elemek istenen başka klasör varsa `~/.claude/teknesyum.json` içindeki `rcAtla`
listesine adı yazılır. Kullanıcı bunu sorarsa söyle, sormadan liste düzenleme.

Her proje için ayrı bir pencere açılır ve hiçbiri soru sormaz. Toplu açılışta sohbet
kaydı alınmaz — kayıt tek projeye aittir, onu bayraksız `/rc` yapar. Çıkış kodu 6
taranan klasörde proje bulunamadı demektir.

**Bu komut geçici.** Masaüstü uygulaması uzak denetimi kendi menüsüne aldığında komut da
betik de silinir; o gün geldiğinde kullanıcıya bunu hatırlat.
