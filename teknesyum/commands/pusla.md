---
description: Pushes both repos at once — the public repo first, then the private file mirror
argument-hint: [commit mesajı]
allowed-tools: Bash
---

İstenen commit mesajı: $ARGUMENTS

Kullanıcı **"puşla"** dediğinde bu akış çalışır ve komut yazması gerekmez: `relay-watch.js`
istemde `puşla`/`pusla` kelimesini görürse bu akışı modele hatırlatır. Hatırlatma yalnız
bu makinede özel ayna kuruluysa doğar; kurmamış birinin istemi kirletilmez.

Tek bir `git push` değildir: bir projenin
iki deposu vardır — herkesin gördüğü genel depo ve yalnız kullanıcının gördüğü özel ayna
(`/ozel`). İkisi ayrı gönderilir; birini gönderip ötekini unutmak makine değiştirince
fark edilir, o noktada geç olur.

## Sıra

**1 · Testler.** Depoda `test/run.js` (ya da `package.json`'da `test` betiği) varsa
çalıştır. **Kaldıysa dur ve gönderme** — kırık commit'i geri almak, göndermemekten pahalı.

**2 · Ne değişmiş, göster.** `git status --porcelain` ve `git diff --stat`. Kullanıcının
istemediği bir dosya listedeyse (geçici dosya, yerel deneme) sor.

**3 · Genel depo.** `git add -A`, mesajla commit'le, `git push`.

Mesaj `$ARGUMENTS` ile geldiyse onu kullan; gelmediyse değişikliğe bakıp kendin yaz —
bir satır, ne değişti, hangi sürüm. Ana dalda çalışılıyorsa ve değişiklik büyükse
önce dal aç.

**4 · Özel ayna.** Ardından her zaman:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/ozel.js" pusla
```

Bu adım **koşullu değildir, sorulmaz**. Değişiklik yoksa betik `Özel ayna güncel` deyip
çıkar; ayna bu makinede kurulu değilse kurulum yönergesi basar ve çıkış kodu yine `0`
olur. Her iki durumda da akış aksamaz.

**5 · Tek satır rapor.** Hangi depoya ne gitti. Genel depoda commit hash'i, özel aynada
kaç dosya. İki depodan biri boş geçtiyse onu da söyle — sessiz atlanan adım, atlanmamış
sanılır.

## Neden ayrı iki depo

Özel ayna kişisel dosyaları taşır: makine ayarları, kural defteri, yerel yapılandırma.
Bunlar genel depoya giremez — eklentiyi indiren kişiyi bağlamamalı — ama kaybolmaları da
kabul edilemez. `/ozel` bunları tek bir private depoda toplar ve o depodan bu makineye
yalnız bu projenin klasörü iner.

Ayna kurmamış biri için `/pusla` sıradan bir push'tur; 4. adım tek satır bilgi basar ve
geçer. Kurulum: `/ozel`.
