# Hata: iki makinede aynı sürüm kuralı vardı, okuma anı yoktu

**Durum:** kapandı 24.08.2026 — D1 sözleşmesi. `scripts/depo-surum.js` uzak dalı tek atımda soruyor, `relay-watch.js` açılışta tek satır basıyor. Ölçü `test/run.js` içinde dokuz test; toplam 429 test geçiyor.
**Belirti:** Masaüstünde açılan oturum deponun uzaktan 39 commit geride olduğunu fark etmedi; laptop `2.51.0`'a kadar geliştirmişken masaüstü `2.43.0` üstünde çalışmaya devam etti. Kullanıcı sorunca `git fetch` çekildi ve durum ancak o zaman görüldü.
**Kaynak:** `teknesyum/hooks/relay-watch.js` — `acilis()` açılışta eklenti sürümünü soruyordu, deponun kendisini sormuyordu
**Görüldüğü proje:** Teknesyum Base

---

## 1. Ne oldu

24.08.2026 sabahı masaüstü oturumu açıldı. Depo `2.43.0` etiketindeydi, uzak `2.51.0`.
Açılış satırı eklentinin kurulu sürümünü uzak etiketlerle karşılaştırdı (`scripts/surum.js`)
ama **çalışılan deponun** geride olup olmadığına bakan bir şey yoktu. Oturum otuz dokuz
commit geriden iş yapmaya başladı.

Ucuz atlatıldı: yerelde fazladan commit yoktu, `git pull` temiz ileri sarma oldu. İki
taraf da yazmış olsaydı çakışma çözmek gerekirdi.

Kuralın kendisi zaten vardı — "yerel farklı uzak farklı bir sürüm olmayacak". Eksik olan
kural değil, **kuralın okunduğu an**. Kural bir belgede duruyordu, açılışta kimse bakmıyordu.
Devir notu §1'deki desen budur: yazılı kural, okuma anı olmadan davranışa dönüşmüyor.

## 2. Ölçü

Açılışta uzak dal yerelde olmayan bir commit taşıyorsa tek satır uyarı çıkar; taşımıyorsa
ya da yerel ileridiyse hiçbir şey çıkmaz. Ölçü `test/run.js` içindeki dokuz testtir:

- uzak ile yerel aynıysa açılış susar
- uzakta yerelde olmayan iş varsa tek satır uyarı basılır, sayı verilmez
- yerel ileridiyse (push edilmemiş iş) uyarı basılmaz
- git deposu değilse, `origin` yoksa, uzak erişilemezse sessiz kalınır
- `ls-remote` üç saniyede dönmezse vazgeçilir — cevap vermeyen uzağa karşı ölçüldü
- aynı gün ikinci oturumda ağ yeniden yoklanmaz
- `compact` ve `clear` kaynağında depo hiç sorulmaz
- metin `dil.js`'ten gelir, `tr` ve `en` karşılığı var
- `depo-surum.js` `require` edilince CLI çalışmaz, sonuç nesne olarak okunur

Açılış gecikmesi kanca sürecinin tamamı ölçülerek alındı (24.08.2026, bu makine):

| durum | kanca süresi | uyarı |
|---|---:|---|
| uzak erişilebilir, depo geride | 187 ms | çıkar |
| aynı gün ikinci açılış, uzak cevap vermiyor | 84 ms | çıkmaz |
| kayıt silinmiş, uzak cevap vermiyor | 3.129 ms | çıkmaz |

Üçüncü satır zaman aşımının tavanıdır: ağ hiç cevap vermese bile açılış üç saniyeden
fazla beklemiyor ve sessizce geçiyor. İkinci satır günlük kaydın işini gösteriyor —
aynı gün ikinci sohbet ağa hiç çıkmıyor.
