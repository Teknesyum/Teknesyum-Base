---
description: Neon arayüz standardını ayarlar, özelleştirir veya tamamen kapatır
argument-hint: [kapat | ac | durum | palet | font | imza | not <metin>]
allowed-tools: Read, Write, Edit, Glob
---

Arayüz standardının ayar dosyası: `~/.claude/teknesyum-ui.json`
Sadece bu projede geçerli olmasını istiyorsa: `<proje>/.claude/teknesyum-ui.json` (üstündür).

İstek: $ARGUMENTS

Argüman boşsa mevcut ayarı **tablo halinde** göster (dosya yoksa "varsayılan" yaz), altına
tek satırlık kullanım örnekleri koy, dur.

## Alanlar

```json
{
  "surum": "1.1.0",
  "kapali": false,
  "palet": {
    "birincil": "#00f3ff",
    "ikincil": "#ff00ea",
    "ucuncul": "#b026ff",
    "basari": "#34d399",
    "zemin": "#08090a"
  },
  "tipografi": {
    "sans": "'Segoe UI', system-ui, sans-serif",
    "mono": "Consolas, 'Cascadia Mono', monospace",
    "olcek": [10, 13, 14, 18, 24]
  },
  "imza": {
    "kapali": false,
    "metin": "by Teknesyum",
    "github": "https://github.com/Teknesyum",
    "sponsor": "https://github.com/sponsors/Teknesyum",
    "destekMetni": "Buy me a coffee"
  },
  "ekNot": ""
}
```

## Davranış

- **`kapat`** → `"kapali": true`. Skill artık hiçbir renk/ölçü dayatmaz; projenin kendi
  tarzıyla devam edilir.
- **`ac`** → `"kapali": false`.
- **`status`** → mevcut ayarı ve hangi dosyadan geldiğini göster.
- **`palet <renk...>`** → verilen rengi/renkleri güncelle. Hex doğrula. Sadece söylenen
  alanı değiştir, diğerlerine dokunma.
- **`font <isim>`** → `tipografi.sans` güncelle. "mono" geçiyorsa `tipografi.mono`.
- **`imza kapat` / `imza ac`** → imza bloğunu aç/kapat.
- **`imza <alan> <deger>`** → metin, github, sponsor, destekMetni güncelle.
- **`not <metin>`** → `ekNot` alanına kullanıcının kendi kuralını yaz. Bu alan
  varsayılanlarla çeliştiğinde **kullanıcının notu kazanır**; skill böyle uygular.
  Mevcut not varsa üzerine mi yazılsın yoksa eklensin mi diye sor.
- **`sifirla`** → dosyayı sil, varsayılanlara dön.

## Kurallar

- Dosya yoksa oluştur; sadece kullanıcının değiştirdiği alanları yaz, tamamını dökme.
  Yazılmayan alan varsayılandan gelir.
- `surum` alanını her yazımda plugin sürümüne eşitle; sürüm değişince kullanıcıya
  "varsayılanlar güncellendi, ayarların korundu" de.
- Hex olmayan renk, tanımsız font ailesi veya geçersiz URL kabul etme, sebebini söyle.
- Bitince **tek satır** özet: `→ ~/.claude/teknesyum-ui.json: <ne değişti>`.
  Aktif bir arayüz oturumu varsa değişikliğin bir sonraki UI işinden itibaren geçerli
  olduğunu ekle.
