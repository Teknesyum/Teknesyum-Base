# Hata: "Bağlam penceresi pratikte 200k'yı geçmez" diye aktarıldı, oysa yürürlükteki pencere 1M

**Durum:** açık.
**Belirti:** Bir oturum bağlam penceresinin pratikte 200k'yı geçmediğini söyledi; gerçek pencere 1M.
**Kaynak:** `docs/OLCUM-BUTCE.md` — 200k senaryosunun koşullu olduğu okunmadan aktarılması
**Görüldüğü proje:** Teknesyum Base

---

## 1. Ne oldu

Kullanıcı bir oturumun "bağlam penceremiz pratikte 200k'yı geçmez" dediğini aktardı ve
şu an 1M olduğunu söyledi.

Kaynağı aradım. Sonuç beklediğimden ilginç çıktı: **belge yanlış değil, belgeden yapılan
alıntı yanlış.**

### `OLCUM-BUTCE.md` gerçekte ne diyor

Dosya 22.08.2026'da yazılmış. 200k sayısı orada geçiyor ama **koşullu bir risk senaryosu**
olarak. Aynı dosya yürürlükteki pencereyi doğrudan gözlemle 1M diye kaydetmiş:

> **Şu an aşılmıyor.** Doğrudan gözlem: bu oturumun skill listesinde Base'in 18 girdisinin
> tamamı tam `description`'ıyla görünüyor, hiçbiri `- ad` biçiminde değil. (…) Yani
> yürürlükteki pencere 1M, bütçe 40.000.

200k'nın geçtiği yer hemen altındaki paragraf ve orada da açıkça koşullu:

> **Asıl risk pencerede.** Bağlam penceresi 200k'ya düştüğü anda (200k'lık bir model,
> `CLAUDE_CODE_MAX_CONTEXT_TOKENS`, ya da ikilideki `oXs()` kısıtlaması devreye girerse)
> Base'in **18 girdisinin tamamı** aynı anda `name-only`'a düşer.

Yani belge şunu söylüyor: *pencere şu an 1M; 200k'ya düşerse şu olur.*

Aktarılan cümle bunun tersi: *pencere pratikte 200k.*

### Gerçek durum

Claude Code değişiklik günlüğünden doğrulanan üç satır:

- Claude Sonnet 5 **yerel 1M token bağlam penceresiyle** geldi
- Opus 4.7 oturumlarında `/context` yüzdelerinin şişmesi bir hataydı: Claude Code 200K'ya
  karşı hesaplıyordu, oysa **Opus 4.7'nin yerel penceresi 1M**
- `CLAUDE_CODE_DISABLE_1M_CONTEXT` değişkeni, yerel 1M penceresi olan **her modeli**
  otomatik sıkıştırmayla 200K'da tutuyor

Yani 200k bugün varsayılan değil, **kapatılmış hâlin** sonucu. Ya o değişken açıktır, ya
model 1M taşımıyordur, ya da `CLAUDE_CODE_MAX_CONTEXT_TOKENS` elle kısılmıştır.

### Neden bu hata kolay

`OLCUM-BUTCE.md` içinde 200k, tablolarda ve hesaplarda **yedi kez** geçiyor:

```
| 200.000 token | 8.000 | −5.938 (aşılıyor, %74) | priority |
| 200k bütçe (8.000) | 5.938 aşım |
Base payı: 200k bütçenin %27,5'i, 1M bütçenin %5,5'i
200k pencerede `name-only`'a düşenler: …
```

Dosyaya ortadan bakan biri 200k'yı yürürlükteki değer sanır. "Şu an aşılmıyor" cümlesi
tek bir yerde ve tabloların üstünde duruyor; tablolar ise sayfa boyunca tekrarlanıyor.

Sayı tekrarlandıkça gerçek, koşul bir kez söylendiği için kayboluyor.

## 2. Ölçü

Bu günlük şu ikisi sağlandığında kapanır:

1. `OLCUM-BUTCE.md` içinde 200k'nın geçtiği her tablo ve başlık, o satırın **koşullu bir
   senaryo** olduğunu kendi içinde söylüyor — okuyucunun sayfanın başındaki cümleyi
   hatırlamasına gerek kalmıyor.
2. Belgeye 200k'nın hangi koşullarda gerçekleştiği yazılı: `CLAUDE_CODE_DISABLE_1M_CONTEXT`,
   `CLAUDE_CODE_MAX_CONTEXT_TOKENS`, ya da 1M taşımayan bir model.

---

## 3. Öneri

**Koşullu sayıyı tabloya taşı.** Ölçüm belgelerinde bir senaryo sayısı tekrar tekrar
geçiyorsa, koşulu da her seferinde yanında geçmeli. `200k pencerede` yerine
`200k'ya düşerse` gibi tek kelimelik bir fark, sayfanın ortasından okuyan birini
yanıltmaktan kurtarır.

**Yürürlükteki değeri ölçülebilir bir yere yaz.** Bugün pencerenin 1M olduğu bilgisi bir
gözlem cümlesinin içinde duruyor. Belgenin başına, tarihiyle birlikte tek satırlık bir
"yürürlükteki değer" kutusu konabilir — ölçüm belgeleri eskiyeceği için tarih zorunlu.

**Bu, aynı haftanın üçüncü örneği.** `HATA-surum-gomulu-yol-eski-standardi-okuyor.md`
sürüme çivilenmiş bir yoldan eski standardın okunmasını anlatıyordu;
`HATA-imza-teknesyum-simgesi.md` güncellenmiş bir kuralın eski hâlinin uygulanmasını.
Üçünde de desen aynı: **doğru bilgi belgede duruyor, yanlış olan ondan yapılan alıntı.**

Ortak çözüm de aynı yöne bakıyor: bir belgeden alıntı yapılırken sayının yanında koşulu
ve tarihi taşımak. Kural yazmak yetmiyor, kuralın **nereden okunduğu** da taşınmalı.

---

## 4. İlerleme — 23.08.2026, Teknesyum Base

**Günlük sekiz tur boyunca okunmadı ve bu sırada hata bir kez daha üretildi.**

Açılış kancası her oturumda "N açık hata günlüğü var" diye yazdı; T0 hiçbirinde `/log`
çalıştırmadı. O sırada `autoCompactWindow` çıktısına şu cümle yazıldı ve 2.51.0 ile
yayımlandı:

> `tavan, garanti değil — fiili pencere modelin bağlamı kadar (Opus ~200k)`

Aynı yanlış `commands/autocompact.md` §"1000000 bir garanti değil tavandır" bölümünde de
vardı. Yani bu günlüğün anlattığı hata, günlük açıkken **ikinci kez** yazıldı — ve bu kez
koda girdi.

**Düzeltildi.** İki yerde de sabit sayı kalktı. `premium.js` artık iddia etmiyor, **ölçüyor**:

```js
const KISITLAYAN = ['CLAUDE_CODE_DISABLE_1M_CONTEXT', 'CLAUDE_CODE_MAX_CONTEXT_TOKENS'];
```

Kısıtlayan değişken varsa notu adıyla söylüyor, yoksa yalnız "tavan, garanti değil" diyor.
Bu makinede üçü de boş — yani pencere gerçekten 1M.

Regresyon testi eklendi (`test/run.js`): çıktı `200k` ya da `Opus` dizgisi taşırsa test
düşer; kısıtlayıcı değişken set edildiğinde adının çıktıda geçmesi ayrıca ölçülür.

**Ölçü maddeleri 1 ve 2 hâlâ açık** — ikisi de `docs/OLCUM-BUTCE.md` içinde ve o dosyaya
dokunulmadı. Bu günlük kapanmıyor.

**Günlüğün asıl dersi bu turda ikinci kez doğrulandı:** sayı tekrarlandıkça gerçek
sanılıyor, koşul bir kez söylendiği için kayboluyor. Bu sefer koşulu kaybeden ben oldum.
