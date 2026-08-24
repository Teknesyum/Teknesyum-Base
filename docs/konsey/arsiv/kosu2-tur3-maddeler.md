# Tur 3 — kullanıcı mekaniği değiştirdi

Bu dosya **ikinize de ortaktır.** Tur 2'de bir üye, ortak olması gereken metnin iki özel
brifinge kopyalanmış olmasını kusur olarak işaretledi — *"ayrışırlarsa kimse göremez"*.
Düzeltme uygulandı: ortak olan her şey burada, özel brifingde yalnız kimlik ve kişisel
not.

Kullanıcı tur 3 açılırken **yeni bir mekanik önerdi ve onayınızı istiyor.** Aşağıdaki
altı madde açık kalıyor ama önceliği değişti: önce yeni mekaniği değerlendirin.

---

## Kullanıcının yeni tasarımı — birebir

> *"Eski usul iki üyeye fikirleri sorulur (artık iki oturumda medium efor ile çağrılır),
> ancak oturumlar kapatılmaz. Birinci üyenin fikrini ikinci üyeye atarız. İkinci üye
> gerek görürse konseyi uzatıp fikir alışverişine devam eder; gerek görmezse de sadece
> birinci üyenin cevabını görmüş, buna göre şekil alabilen bir pozisyonda kalır.
> **Konseyin uzatılması fikri artık ikinci üyeye bağlı.**"*

Kullanıcı ayrıca şunu söyledi: bu planlama evresinde üyelerin **yüksek eforda**
çalışması cevap süresini aşırı uzatıyor — bundan sonra **medium**.

## Bu tasarımın önceki mekanikten farkları

**Bu tablo yöneticinin özetidir; çelişirse yukarıdaki birebir metin geçerlidir.**

Yöneticinin düzeltmesi — ilk yazımda tablo birebir metinden sapmıştı: *"eski usul iki
üyeye fikirleri sorulur"* cümlesi **ikisinin de bağımsız yazdığını** söylüyor, sonra
birincininki ikinciye atılıyor. İlk tablo "ikinci üye kendi metnini hiç yazmaz" gibi
okunuyordu. **Masada iki bağımsız örnek var**, bir değil.

| | Önceki (simetrik) | Yeni (asimetrik) |
|---|---|---|
| Kim yazar | ikisi de bağımsız | ikisi de bağımsız (aynı) |
| Kim kimi görür | ikisi de ötekini | yalnız ikinci üye birinciyi görür |
| Uzatma kararı | yönetici, durak koşuluyla | **ikinci üye** |
| Tur tavanı | taban 2 / tavan 4 | tavan yok, uzatma kararına bağlı |
| Birinci üyenin bağımsızlığı | tur 2'de biter | uzatılmazsa **hiç bozulmaz** |
| Oturumlar | sürdürülüyor | sürdürülüyor (aynı) |
| Efor | yüksek | **medium** |

## Değerlendirin

1. **Onaylıyor musunuz?** Kullanıcı açıkça onay istiyor. Onaylamıyorsanız hangi somut
   nesne yüzünden.

2. **Asimetri.** Önceki turlarda ikiniz de şunu yazdınız: konseyin faydası bağımsız
   yazımdan gelir ve karşı metni okumak çapayı kurar. Bu tasarım o çapayı **yalnız bir
   tarafa** kuruyor; birinci üye baştan sona bağımsız kalıyor. Bu, simetrik mekaniğin
   yakınsama sorununu çözüyor mu, yoksa yeni bir sorun mu açıyor — ikinci üye artık hem
   okuyan hem karar veren taraf?

3. **Uzatma kararının ikinci üyede olması.** Önceki turlarda "durak koşulu" mekanik
   olsun diye uğraştık, çünkü yorumu yöneticiden almak istedik. Şimdi karar bir üyeye
   geçiyor. Bir üye, kendi turunu uzatıp uzatmayacağına tarafsız karar verebilir mi?
   Hangi yönde sapar — fazla uzatma mı, erken kapatma mı? Bunu görünür kılacak ucuz bir
   ölçü var mı?

4. **Birinci üye hiç cevap alamıyor.** Uzatılmazsa birinci üye kendi metninin okunduğunu,
   kabul mü edildiğini reddedildiğini mi hiç öğrenmiyor. Bu bir kayıp mı, yoksa
   bağımsızlığın bedeli olarak kabul edilir mi?

5. **Medium efor.** Süreyi düşürmek için efor indiriliyor. Bu turlarda üretilen kusur
   bulgularının hangileri yüksek efora bağlıydı — yani medium'da kaybedilecek bir şey var
   mı? **Emin değilseniz "emin değilim" yazın**, tahmin etmeyin.

6. **Konsey lite ile ilişkisi.** Yeni tasarım, tur 2'de üzerinde uzlaştığınız
   "yükseltilebilir lite" fikrinin ta kendisi mi? İkisi aynı şeyse `lite` ayrı bir kavram
   olarak kalmalı mı, yoksa tek mekaniğe mi inmeli?

Biçim: geri çekme tiplemesi ve kapanış madde listesi yürürlükte.

```
| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
```

- **bulgu** — daha önce hesaba katılmamış somut bir nesne. Nesneyi yaz.
- **yakınsama** — "ikna oldum", "haklı sayılır". Nesne yoksa bu.

---

# Açık kalan altı madde

Yeni mekanik bunları kapatmıyor. Yalnız yeni mekanik bir maddeyi **değiştiriyorsa** yaz;
değiştirmiyorsa atla.

## M1 · Lite valfinin ikinci tetikleyicisi

**Üye B:** valf yalnız çelişkide ateşlenirse en tehlikeli lite vakasını kaçırır — iki
üyenin **aynı yanlış varsayımda anlaşması**. Şart eklensin: taşıyıcı bir maddede herhangi
bir üye **"emin değilim"** yazdıysa da yükselt.

**Üye A'nın artığı:** kapı yalnız tur 1 metinlerini okuduğu için, kör noktalar
korelasyonluysa **ne çelişki ne "emin değilim"** üretilir; lite sahte güvenle kapanır.
Kapı, kategori tabanlı sert zemini ikame etmez — şema değişikliği, veri silme, dış API
sözleşmesi lite'a hiç yönlenmesin.

## M2 · Kilitlenme — "başlat ve unut" yasağı

**Üye B:** yöneticinin iptal yetkisi bu vakayı kapatmıyor, tepkisel ve tetikleyicisi yok
— *"fark etmeye bağlı bir yetki, bildirim üretmeyen bir sistemde çare değil ümittir."*
Nesne: kilitlenme protokolün değil, **üyenin nasıl başlatıldığının** fonksiyonu. Dönüşü
beklenerek başlatılan üye çökerse yöneticiye hata döner, tespit bedava. Öneri: *üyeler
her zaman sonlanması yöneticiye dönecek biçimde başlatılır.* Kalan delik: çökmeyen ama
**asılı kalan** üye.

## M3 · Yönetici tek nokta — ortak metnin kopyalanması

**Üye A:** brifing hatası iki üyeye aynı anda bulaşır, masada yakalayacak kimse yoktur.
**Üye B:** ayrı kök, birleşen sonuç; canlı örnek bu koşuda duruyordu. Düzeltme bu dosyayla
uygulandı. Yeterli mi, yoksa kabul edilen kalıcı bir açık mı?

## M4 · Yakınsama tipi geri çekmenin yönü

**Üye A:** (i) yakınsama ilerleme sayılmaz, tur kapanır — kapanış nedeni **durak**, uzlaşı
değil; rapor "yakınsadı" der.
**Üye B:** yakınsama **çözüm** sayılır (madde kapanır, düşük güvenle), **üretim** sayılmaz.
Ayrıca: fayda sayacı yakınsamaları da sayarsa metrik konseyi **iyi gösterecek yönde
yanlı** olur.

Aynı kuralın iki yazımı mı, yoksa nerede ayrışıyorlar?

## M5 · İtirazların da tiplendirilmesi

**Üye A:** ölçüt simetrik genişletilsin — nesnesiz direnme ayrı sayılırsa sahte mutabakat
ve sahte ihtilaf **aynı tek mekanizmayla** görünür.

## M6 · Anonimlik gerilimi — yöneticinin hükmü

**Üye B:** brifing *"tahmin etmeye çalışma"* diyerek, mutabakatı iskonto edecek çıkarımı
yasaklıyor; ikisi aynı anda istenemez.

**Yöneticinin hükmü:** yasak kalır, çünkü iskonto **üyenin işi değil.** Tartma yöneticinin
işi ve `docs/stats/konsey.md` içindeki `masa_kompozisyonu` alanıyla, koşu kapandıktan
sonra yapılır.

---

## Yöneticinin doğruladığı bilgi — tartışma açmaz

Kalibrasyon adayı olarak önerilen autocompact penceresi zinciri git'ten doğrulandı:
`ac75cea` → `ad4b3f2` → `173fc01` (eco 100k / normal auto / premium 1M) → `2993d70` →
`930effe` (premium 500k, eco 150k). Ara commit'in kendi mesajı sebebi yazıyor: *"200k
iddiası koddan kalktı — günlük açıkken hatayı ikinci kez yazmışım."* **Yanlışlık, koşul
değişikliği değil.** Aday geçerli; doğru cevap bağımsız olarak biliniyor
(`docs/OLCUM-PENCERE.md` replay simülasyonu).
