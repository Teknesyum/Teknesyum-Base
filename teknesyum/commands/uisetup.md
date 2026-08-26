---
description: Installs, customises or turns off the interface standard — the ready neon template or your own standard
argument-hint: [sablon | kendim | kapat | ac | durum | palet | font | imza | not <metin>]
allowed-tools: Read, Write, Edit, Glob
---

Arayüz standardının ayar dosyası: `~/.claude/teknesyum-ui.json`
Sadece bu projede geçerli olmasını istiyorsa: `<proje>/.claude/teknesyum-ui.json` (üstündür).

İstek: $ARGUMENTS

**Dosyanın varlığı anahtardır.** Dosya yoksa standart yürürlükte değildir ve
`teknesyum-ui` skill'i hiçbir renk, ölçü ya da imza dayatmaz. Aşağıdaki neon değerleri
bir şablondur — kullanıcı almayı seçince yürürlüğe girer, kendiliğinden değil.

Argüman boşsa mevcut ayarı **tablo halinde** göster. Dosya yoksa tablonun yerine tek bir
davet bas ve dur:

```
Arayüz standardı kurulu değil — şu an hiçbir renk ya da ölçü dayatılmıyor.

  /uisetup sablon    hazır neon şablonunu olduğu gibi al
  /uisetup kendim    dört soruyla kendi standardını kur
```

`kendim` dendiğinde dört soruyu **tek mesajda, numaralı** sor: palet (birincil, ikincil,
üçüncül, başarı, zemin), tipografi (sans, mono), imza (metin ve bağlantılar, ya da
`kapalı`), ve varsa `ekNot`. Cevaplanmayan alanı yazma — şablon değeri geçerli olur.
Kullanıcının cevabı şablonla çelişirse **kullanıcının cevabı kazanır**; şablonu geri
savunma.

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

- **`sablon`** → dosyayı `{"kapali": false}` ile oluştur. Neon varsayılanları olduğu gibi
  yürürlüğe girer, tek alan yazılmaz — sonradan değiştirilen alan üstüne biner.
- **`kendim`** → yukarıdaki dört soruyu sor, yalnız cevaplananı yaz.
- **`kapat`** → `"kapali": true`. Skill artık hiçbir renk/ölçü dayatmaz; projenin kendi
  tarzıyla devam edilir. Dosya yokken de aynı sonuç geçerlidir; `kapat` bunu kalıcı ve
  açık bir tercih hâline getirir, davet bir daha çıkmaz.
- **`ac`** → `"kapali": false`. Dosya yoksa `sablon` ile aynı şeydir.
- **`status`** → mevcut ayarı ve hangi dosyadan geldiğini göster.
- **`palet <renk...>`** → verilen rengi/renkleri güncelle. Hex doğrula. Sadece söylenen
  alanı değiştir, diğerlerine dokunma.
- **`font <isim>`** → `tipografi.sans` güncelle. "mono" geçiyorsa `tipografi.mono`.
- **`imza kapat` / `imza ac`** → imza bloğunu aç/kapat.
- **`imza <alan> <deger>`** → metin, github, sponsor, destekMetni güncelle.
- **`not <metin>`** → `ekNot` alanına kullanıcının kendi kuralını yaz. Bu alan
  varsayılanlarla çeliştiğinde **kullanıcının notu kazanır**; skill böyle uygular.
  Mevcut not varsa üzerine mi yazılsın yoksa eklensin mi diye sor.
- **`sifirla`** → dosyayı sil. Standart yürürlükten kalkar ve kurulmamış hâline döner —
  varsayılanlara değil, sessizliğe.

## Kurallar

- Dosya yoksa oluştur; sadece kullanıcının değiştirdiği alanları yaz, tamamını dökme.
  Yazılmayan alan şablondan gelir.
- **Kullanıcı istemeden bu dosyayı oluşturma.** Dosyayı yazmak standardı açmak demektir;
  bir arayüz işinin ortasında sessizce açılması, kullanıcının seçmediği bir kimliği
  projesine yazmaktır.
- `surum` alanını her yazımda plugin sürümüne eşitle; sürüm değişince kullanıcıya
  "varsayılanlar güncellendi, ayarların korundu" de.
- Hex olmayan renk, tanımsız font ailesi veya geçersiz URL kabul etme, sebebini söyle.
- Bitince **tek satır** özet: `→ ~/.claude/teknesyum-ui.json: <ne değişti>`.
  Aktif bir arayüz oturumu varsa değişikliğin bir sonraki UI işinden itibaren geçerli
  olduğunu ekle.
