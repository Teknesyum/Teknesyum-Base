---
description: Opens remote control with options — mode, permission, capacity, name, unsaved start
argument-hint: <ad · kip same-dir|worktree|session · izin <mod> · kapasite N · kaydetme · metin>
allowed-tools: Bash
---

İstenen: $ARGUMENTS

Betiği çalıştır, çıktısını olduğu gibi bas:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/rc.js" --gelismis $ARGUMENTS
```

Argümanları bayrağa çevir: `kip <değer>` → `--spawn <değer>` (same-dir · worktree ·
session) · `izin <değer>` → `--izin <değer>` (acceptEdits, auto, bypassPermissions,
default, dontAsk, plan) · `kapasite <N>` → `--kapasite <N>` · `kaydetme` →
`--kaydetme` (sohbeti kaydetmeden açar) · `metin` → `--metin` (pencere açmaz, yalnız
kopyalanacak komutu yazar) · `kur` → `--kur` · başka her şey oturum adıdır,
`--ad <değer>`.

`/rc` bütün açılış sorularını önceden yanıtlar; bu komut tersini yapar, kip sorusunu
pencereye geri bırakır. Kullanıcı burada seçim yapmayı bekler, sen onun yerine seçme.
Bayrak verilmeyen ayarı da uydurma — verilmezse pencere sorar.

Çıkış kodları `/rc` ile aynı: 3 istemci yok, 4 sürüm eski, 5 pencere açılmadı.
