# Hata: acilis banner'i her istekte yeniden basiliyor

**Durum:** kapandı 27.08.2026.
**Belirti:** SessionStart her yeniden acilis/compact/resume olayinda banner'in tamamini yeniden yaziyor; tek oturumda ucuncu kez basildi
**Kaynak:** teknesyum/hooks/relay-watch.js:1358 acilis()
**Görüldüğü proje:** CodeXray

---

## 1. Ne oldu

Uzun süren bir röle oturumunda (CodeXRay, Titan protokolü, T0 tarafı) açılış banner'ı
**üç kez** modele enjekte edildi:

- oturumun gerçek açılışında,
- bağlam sıkıştırmasından sonra,
- kullanıcının sıradan bir mesajından sonra.

Her seferinde tam blok geldi:

```
Teknesyum ▸ premium mod · her ajan opus · 20 paralele kadar · plan konseyi fable + opus · ikinci görüş fable
röle kurulu · sözleşme yok
65 ajan sorunu kayıtlı · `.claude\relay\live\_sorun.log` dosyasını aç, sebebi gör, sessiz geçme
2 açık hata günlüğü var — `/log` ile bak, çözüp `/log kapat` ya da `/log arsivle` de
```

Yönerge bu satırların cevabın en üstüne aynen basılmasını istediği için kullanıcı aynı
dört satırı üç kez okudu. Kullanıcının kendi ifadesi: "bunun her komutumda basılması
normal değil".

### Sebep

Etkin sürüm: `~/.claude/plugins/cache/teknesyum/teknesyum/34192e86304a`.

`hooks/relay-watch.js:83` SessionStart olayını koşulsuz `acilis()`'e yönlendiriyor:

```js
if (j.hook_event_name === 'SessionStart') {
  return acilis(root, kapNotu, j.session_id, j.cwd, j.source);
}
```

`acilis()` (`relay-watch.js:1358`) `kaynak` parametresini alıyor ama **banner için hiç
kullanmıyor**. Fonksiyon içinde `kaynak`ın tek geçtiği yer son satır:

```js
if (depoBak(cwd, kaynak)) duyur(ceviri('depoGeride'));
```

`parca` bloğunun ve `additionalContext` enjeksiyonunun ne kaynak süzgeci ne de oturum
başına bir kez işareti var. Kodun içindeki yorum varsayımı açıkça yazıyor:

> "Bildirme yordamı oturum başına bir kez ve her projede yazılır."

Varsayım SessionStart'ın oturum başına bir kez atmasına dayanıyor. Host bunu `startup`
dışında `resume`, `compact` ve `clear` için de atıyor, `j.source` da bunu taşıyor —
yani bilgi elde var, kullanılmıyor.

### Düzeltme kalıbı aynı fonksiyonda zaten iki kez mevcut

Uydurulacak bir çözüm yok, `acilis()` her iki yarısını da kendi içinde gösteriyor:

1. **Kaynak süzgeci** — `relay-watch.js:1415`:
   ```js
   const DEPO_ATLA = { compact: 1, clear: 1 };
   function depoBak(cwd, kaynak) {
     if (DEPO_ATLA[kaynak]) return false;
   ```
2. **Kalıcı bir kez işareti** — `depoBak` içindeki `DEPO_KAYIT` dosyası, depo başına
   günde bir kez çalışacak şekilde `{ gun, bakildi }` yazıyor.

Banner için doğal karşılığı: `oturumId` anahtarlı bir kayıt, ya da en azından
`kaynak !== 'startup'` olduğunda `parca` bloğunun ve `additionalContext`in atlanması.

`compact` durumunda dikkat: sıkıştırma sonrası modelin bağlamı gerçekten silinmiş
olabilir, dolayısıyla oradaki doğru davranış "hiç yazma" değil "kısa yaz" olabilir.
Bu kararı base verir; günlük yalnız ölçümü taşıyor.

### Yan bulgu, ayrı sorun değil ama not

Banner'daki ajan sorunu satırı bu oturumda iki farklı yol gösterdi: önce
`live/_sorun.log`, sonra `.claude\relay\live\_sorun.log`. İkincisi doğru. Daha önce
bunun için ayrı bir günlük açılmıştı (`HATA-statusline-var-olmayan-sorun-log-dosyasina-yonlendiriyor`);
düzelmiş görünüyor, bu günlüğün konusu değil.

## 2. Ölçü

Bu hata şu sağlandığında kapanır:

1. Tek bir oturumda, `session_id` değişmeden, SessionStart olayı ikinci ve üçüncü kez
   atıldığında (`resume`, `compact` veya `clear` kaynağıyla) banner **yeniden
   basılmaz**. Ölçüm: aynı `session_id` ile art arda iki SessionStart girdisi verip
   `relay-watch.js` çıktısını karşılaştırmak — ikinci çağrının `duyur` çıktısı boş olmalı
   ya da ilkinden kısa ve açıkça farklı olmalı.
2. Gerçek yeni oturumda banner **hâlâ basılır**. Sessizleştirme çözüm değil; kullanıcı
   açılışta premium modu, açık sözleşmeleri ve açık günlükleri görmeye devam etmeli.
3. `seviye() === 0` davranışı değişmez: sessiz kipte hiçbir şey yazılmaz.

Birinci madde sağlanmadan kapatma. Yalnız birinci madde sağlanıp ikinci bozulursa bu
düzeltme değil regresyondur.


## Çözüm (27.08.2026)

`acilis()` artık `source` alanına bakıyor. Tam banner yalnız `startup` ve `clear`
olaylarında basılıyor; `compact` ve `resume` sonrası sabit kalemler (premium satırı,
kurulum uyarısı, `gunlukProseduru` enjeksiyonu) atlanıyor, yalnız iki olay arasında
değişebilen durum satırları (sözleşme sayısı, ajan sorunu, açık günlük) yazılıyor.
`relay-watch.js` — `ACILIS_TAM` tablosu.
