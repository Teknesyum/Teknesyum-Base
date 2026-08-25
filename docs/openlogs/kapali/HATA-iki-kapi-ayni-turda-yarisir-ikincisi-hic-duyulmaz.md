# Hata: iki Stop kapısı aynı turda yarışır, ikincisi hiç duyulmaz

**Durum:** kapalı — 25.08.2026, 2.58.0.
**Belirti:** Kullanıcı karar beklediğim bir turda "Senden istediklerim" başlığının neden
yazılmadığını sordu. Kural yazılı, kancası da var — ama o turda hiç çalışmadı.
**Kaynak:** `teknesyum/hooks/relay-watch.js:1047`
**Görüldüğü proje:** Teknesyum-Base

---

## 1. Ne oldu

25.08.2026, T3 sözleşmesi bittiği turda. Mesaj hem "bitti, yayında" diyordu hem de
kullanıcıdan bir karar bekliyordu (sıradaki sözleşme hangisi). İki yükümlülük vardı:
dönüş bloğu ve **Senden istediklerim**. Yalnız birincisi istendi.

Sonraki tur yalnız dönüş bloğuydu — beş satır, içinde tek satırlık bir soru. Kullanıcı
"ne yapmamı istiyorsun niye yazmadın" diye sordu. Haklıydı: soru vardı, ne yapacağı yoktu.

## 2. Kök neden

```js
const engel = devirIhlali(govde) || donusEksik(root, govde) || sendenEksik(root, govde);
```

Kısa devre. `donusEksik` doğru dönünce `sendenEksik` **hiç değerlendirilmiyor**. Üç kapı
bağımsız yükümlülük ama tek bir slot paylaşıyorlar; bir turda yalnız ilki duyuluyor,
kalanı sessizce düşüyor.

İkinci katman: `donusEksik` mesajı "en fazla 5 satır" diyor ve açık soruyu "varsa üçüncü
satır tek açık soru" diye tek satıra indiriyor. Bu tavan, numaralı ve kopyalanabilir bir
**Senden istediklerim** bölümünü yapısal olarak imkânsız kılıyor. Model kapıya uyduğunda
kullanıcının kuralını çiğnemiş oluyor; iki talimat birbirini kesiyor ve hangisinin
üstün olduğunu hiçbir yer söylemiyor.

Üçüncü katman: kaçan yükümlülük bir sonraki turda da yakalanmadı. `sendenEksik` içindeki
`ISTEK` kalıbı `hangisini seç`, `karar ver`, `onayla` gibi biçimler arıyor. Basılan blok
"sırada T4'ün tek satırlık kısmı mı, T5 güvenlik mi?" diyordu — açık bir seçim sorusu,
ama kalıba uymuyor. Kalıp kasten dar tutulmuş; burada dar kalması sorunu ikinci kez
görünmez yaptı.

## 3. Ne yapılacak

1. Üç kapıyı `||` ile değil, hepsini toplayıp birlikte bildir. Bir turda iki yükümlülük
   varsa ikisi de söylensin.
2. `donusEksik` mesajı dönüş bloğunun **Senden istediklerim**'in yerine geçmediğini
   açıkça söylesin: karar bekleniyorsa blok basılır, hemen ardından başlık gelir.
3. Beş satır tavanı yalnız bloğun kendisi içindir; bu da mesajda yazsın.
4. `ISTEK` kalıbına soru işaretiyle biten seçim cümlesi eklensin (`... mı, ... mı?`).
5. Test: bitiş bildiren ve aynı anda karar bekleyen tek bir gövde için iki kapının da
   metni dönmeli.

## 4. Kapanma ölçütü — karşılandı

Aynı fixture'da `paketDenetle` hem `Rapor:` eksikliğini hem `Senden istediklerim`
eksikliğini tek `reason` içinde bildirdiğinde ve dönüş bloğu mesajı başlığın ayrıca
gerektiğini söylediğinde kapanır.


## 5. Ne yapıldı

 üç kapıyı toplayıp birlikte bildiriyor.  mesajı ve
 §7.1 beş satır tavanının başlığı kapsamadığını söylüyor.
 §5.1 ölçütü "iş yarıda mı" değil "bir şey bekliyor musun" yaptı.
 kalıbına  seçim sorusu girdi. İki regresyon testi eklendi.
