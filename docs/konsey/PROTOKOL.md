# Konsey protokolü — asimetrik masa

Kullanıcının tasarımı, iki üyenin onayından geçti. Koşu 2, dört tur; ilk ikisi eski
simetrik mekanikle, son ikisi bu mekanikle koşuldu ve **mekanik kendi üzerinde işletildi.**

Kaynak: `arsiv/kosu2-*`, `log.md`.

## Akış

1. **İki üye de bağımsız yazar.** Aynı soru, aynı anda, birbirini görmeden. Paralel
   açılır — süre tur sayısına bağlıdır, üye sayısına değil.
2. **Birinci üyenin metni ikinciye verilir.** Ters yön yoktur.
3. **Uzatma kararı ikinci üyenindir.** Yöneticinin değil.
   - **Uzatırsa** — gerekçe bulgu standardında **somut nesne** adlandırmak zorundadır.
     Nesnesiz uzatma yoktur. Kapsamı ikinci üye belirler; yönetici o kapsamda tur açar.
   - **Kapatırsa** — kapanış tipini kendisi yazar. Nesnesiz kapanış `yakınsama` olarak
     loglanır, `uzlaşı` olarak değil.
4. **Oturumlar kapatılmaz.** Üye yeniden çağrılmaz, sürdürülür — brifing tekrarlanmaz,
   bağlam durur.

**Efor: medium.** Üyeler yüksek eforda çalışırken cevap süresi kabul edilemez ölçüde
uzuyordu.

## İki üyenin koyduğu zorunlu valfler

Bunlar ikinci üyenin takdirine bırakılmaz — **ezicidir.**

| Valf | Ne zaman | Sonuç |
|---|---|---|
| **Emin değilim** | Birinci üye taşıyıcı bir maddede "emin değilim" yazdıysa | İkinci üye o maddede kapatamaz |
| **Kategori** | Şema değişikliği · veri silme · dış API sözleşmesi · dosya biçimi · migration | Tek turluya hiç yönlenmez, uzatma zorunlu |

Kategori valfinin gerekçesi: kapı yalnız tur 1 metinlerini okur. İki üyenin kör noktası
korelasyonluysa **ne çelişki ne "emin değilim"** doğar; masa sahte güvenle kapanır. Kapı
kategori zeminini ikame etmez.

**Ampirik "emin değilim"in tahliyesi tartışma değil, deneye devirdir.** Valf *"ikinci üye
kapatamaz"* der, *"tartışmayla çözülmelidir"* demez. Masada çözülemeyecek bir soruyu
tartışmaya zorlamak valfin kötüye kullanımıdır. Devir yapılırsa madde `kapandı` değil
**`devredildi`** işaretlenir ve sonucun ineceği yer adlandırılır — *"sahipsiz devir,
maddelerin sessizce öldüğü yerdir."*

## Tavan 4 — arka-durdurucu

Tavan bir **durak koşulu değildir**: nesne taşıyan uzatmayı susturmaz, yalnız beşinci
turun açılışını yöneticiye devreder. Bağladığında kapanış nedeni `tavan` yazılır —
`uzlasi` da değil `yakinsama` da değil.

Birinci üye tavansızlığı onaylamış, sonra **geri çekmişti**; gerekçesi kendi metninden
çıktı:

> *"Tavanın maliyeti benim emin olmadığımı ilan ettiğim değişkene bağlı. Sapma yönü erken
> kapatmaysa tavan hiç bağlamaz, maliyeti sıfırdır. Sapma ters yöndeyse tavan tek
> durdurucudur. **Haklıysam bedava, yanılıyorsam kurtarıcı** — tavansızlığı onaylarken,
> yapmayı açıkça reddettiğim bir tahmine bahis oynamışım."*

Tavanın bağlaması **kendi başına sinyaldir**: `kapanis_nedeni = tavan` seyrek olmalı.
Seyrek değilse uzatma kararı bozuktur; tavan aynı zamanda o kararın ölçüm aletidir.

## Bu tasarımın çözdüğü ve açtığı

**Çözdüğü.** Simetrik mekanikte tur 2'de iki metin birden kirleniyordu. Burada birinci
üyenin metni sonuna kadar temiz kalır — masada her zaman en az bir bağımsız örnek vardır.
Ve ölçülebilir bir ayrım doğar: **örtüşme çapraz okumadan önce doğduysa yakınsama değil
bağımsız uzlaşıdır.** Simetrik mekanikte bu ayrım yapılamıyordu.

**Açtığı — tasarımın tek ciddi kusuru.** Çapa artık **karar veren tarafa** kurulur.
Yetkinin doğru kullanımı çapasızlık ister, yetki çapalı taraftadır. Simetrikte aynı hata
iki tarafın katlanmasını gerektiriyordu; burada bir taraf yeter, çünkü okuyan taraf aynı
zamanda kapatandır.

**Sapmanın yönü: erken kapatma.** İki üye bağımsız olarak aynı yönü verdi, üç yapısal
sebeple: uzatmanın maliyetini kararı veren çeker (maliyeti kendine düşen kararda eksik arz
olur) · çapa hemfikirlik hissi üretir · turunun sonunda "başka var mı" diye sorulan ajanın
düşük enerjili cevabı "yok"tur. Ters yön (gayret uzatması) için ikisi de **"emin değilim"**
yazdı.

**İkinci kayıp: çapraz denetim tek yönlüdür.** Birinci üyenin metnindeki yanlışı ikinci
üye yakalayabilir; ikinci üyenin metnini **hiç kimse** okumaz, denetimsiz yöneticiye
gider. Azaltması: yöneticinin iki metni yan yana okuması kuraldır.

## Yöneticinin işi

Yönetici **içerik üretmez**, ama sekreter de değildir — bu koşuda ikisi de düzeltildi.

**Kanonik madde listesini yönetici yayımlar**, üyeler o adların altına yazar. Aksi halde
"iki farklı sözcükle yazılmış iddia aynı şeyi mi söylüyor" hükmü yöneticiye kalır — ve o
hüküm ile "çelişiyor mu" hükmü **aynı yetenek sınıfından**; birini yasaklayıp diğerini
zorunlu kılmak yorumu ilanın arkasına saklar.

**Taşıyıcı bir kuralın tek ifadesi yöneticinin özeti olmasın — birebir kaynak yanında
dursun.** Bu koşuda yöneticinin özeti kullanıcının metninden saptı (masada bir bağımsız
örnek mi var iki mi) ve **birinci üye yalnız ikisi yan yana durduğu için yakaladı**.
Kopyalanmış hata sessizdir.

**Ortak olan her şey ortak dosyada durur.** Özel brifingde yalnız kimlik ve kişisel not
kalır. Akış ve biçim kuralları iki brifinge kopyalanırsa ayrışmalarını kimse göremez.

**Üyeler her zaman sonlanması yöneticiye dönecek biçimde başlatılır** — "başlat ve unut"
yasak. Zaman aşımına gerek yoktur: dönüşü beklenen üye çökerse yöneticiye hata olarak
döner, tespit bedava. *"Fark etmeye bağlı bir yetki, bildirim üretmeyen bir sistemde çare
değil ümittir."* Kalan delik: çökmeyen ama **asılı kalan** üye — o konseye özgü değil,
ajan katmanının genel sorunu.

**İptal yetkisi** durur: yönetici tarafları sorgulayabilir ve buga giren süreci iptal
edebilir. İptal süreç düzeyinde kalır, gerekçesiyle log'a yazılır. *"İptal, işin
kullanıcıya dönmesidir."*

## Anonimlik — A ve B

Üyeler **Üye A** ve **Üye B** olarak anılır. Hangi model hangi koltukta, masada kaç model
bulunduğu, kimin daha yetkili olduğu üyelere bildirilmez. Eşleşme repo dışında tutulur.

**Kestiği:** deferans — "karşımdaki daha yetkili, geri adım atayım".
**Kesmediği:** yakınsama. Kayma kimlikten değil, karşı metni okumuş olmaktan doğar.

Ve tam olarak da kesmez: deferansın iki bileşeni var, karşı tarafa dair inanç ve **kendine
dair** inanç. Üye kendi ne olduğunu bildiği için anonimlik statü etkisini kaldırmaz,
**hedefli deferansı öz-değerlendirmeye endeksli bir sapmaya çevirir.** Net etkinin yönü
ölçülür: geri çekmelerin sayısı **ve yönü**.

Simetrik risk: *"kimseye üstünlük tanınmamıştır"* cümlesi nötr bilgi değil, müdahaledir —
deferansı kestiği kadar **sahte ihtilaf** üretebilir.

**Mutabakatı iskonto etmek üyenin işi değildir.** Üye kimlik tahmini yapmaz; tartma
yöneticinin işidir ve `docs/stats/konsey.md` içindeki `masa_kompozisyonu` alanıyla, koşu
kapandıktan sonra yapılır. Koltuklar asimetrik olduğu için alan **hangi model hangi
koltukta** yazar — yoksa koltuk etkisi model etkisiyle karışır.

## Geri çekme ve itiraz tiplemesi

| Tip | Ne zaman | İşlem |
|---|---|---|
| **bulgu** | Daha önce hesaba katılmamış **somut nesne** adlandırıyor — bir vaka, bir maliyet, bir bozulma senaryosu | Fayda sayacına girer |
| **yakınsama** | "İkna oldum", "haklı sayılır", "itiraz etmiyorum" — nesne yok | Maddeyi **çözüm** olarak kapatır (düşük güven), **üretim** sayılmaz, fayda sayacına girmez |

İşletim ölçütü: bir nesnenin "önceden hesaba katılmamış" olduğu, **aynı üyenin önceki
turlardaki metninde geçip geçmediğine** bakılarak denetlenir. "Sınanabilir yeni gerekçe"
ölçütü masada sınanamaz — üyeler kod çalıştıramaz, beyan olarak kalır.

Fayda sayacı yakınsamaları da sayarsa metrik **konseyi iyi gösterecek yönde yanlı** olur.

**Simetri:** itirazlar da tiplendirilir. Yeni mekanikte tek alana iner —
**uzat/kapat × nesne var/yok**, dört hücre; sahte mutabakat da sahte ihtilaf da aynı
yerden görünür.

Üyeler turu şu listeyle bitirir:

```
| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
```

## Kapanan her madde kayda gider

"Uzatmadım" ile "okumadım" ayırt edilemezse mekanik denetlenemez. Kapatılan her madde için
**tasarruf satırı** yazılır. Birinci üye cevabı geri almaz — bu tasarımın bedeli ve kabul
edilir; ama hükme bağlanmaması kayıp olurdu.

## Ne zaman açılır — varsayılan değil

Eşik relay'in kendi boyutlamasına bağlanır: konsey işin **büyük ve geri dönüşü pahalı**
diliminde devreye girer. Testi olan, tek dosyalık, geri alınabilir işte açılmaz — orada
hatayı bulmanın en ucuz yolu çalıştırmaktır.

**`lite` ayrı bir kavram değildir.** Tek konsey vardır, bir tur koşar, uzatma tetiği
ateşlenirse devam eder. "Lite" yalnız **uzatılmamış koşunun adıdır**. Geriye ayrı bir
mekanik değil bir **yönlendirme listesi** kalır — yukarıdaki kategori valfi.

## Sınırı

Konsey **muhakeme boşluğunu** yakalar, **bilgi boşluğunu** yakalamaz. İki üye aynı soydan
geldiği için önyargıları ortaktır; ikisinin birden yanıldığı varsayım konseyden sağ çıkar
ve **iki kez onaylanmış görünür.** Konsey koda bakmanın yerine geçmez.

Ampirik sorularda konsey *kendinden emin, iyi gerekçelendirilmiş ve yanlış* metin üretir —
üstelik "sınanabilir iddia" biçimi bunları sınanmış gibi gösterir.

**Kalibrasyon borcu.** Mekanik kendini kendi üstünde değerlendirdi; dışarıdan denetim yok.
En az bir kez **cevabı zaten bilinen** bir işte koşulmalı. Aday doğrulandı: autocompact
penceresi zinciri (`ac75cea` → `ad4b3f2` → `173fc01` → `2993d70` → `930effe`), ara
commit'in kendi mesajı sebebi yazıyor — *"200k iddiası koddan kalktı, günlük açıkken
hatayı ikinci kez yazmışım"*. Yanlışlık, koşul değişikliği değil. Doğru cevap
`docs/OLCUM-PENCERE.md` replay simülasyonundan bağımsız biliniyor.

**Kalibrasyon koşusu çift eforla yapılır** — bir medium, bir yüksek. İki üye de kendi
eforunun çıktıya etkisini içeriden gözleyemeyeceğini söyleyip "emin değilim" yazdı; bu tek
deney hem efor sorusunu hem kalibrasyon borcunu kapatır.

## Koşu 2'nin ölçüsü

Dört tur, iki üye. Çıktı 111.1k · eşdeğer 2162.7k · duvar süresi 2358sn.

**Beş geri çekme, hepsi nesneli:**

| Üye | Neyi geri çekti | Nesne |
|---|---|---|
| B | Lite'ın ön-tahminle yönlendirilemeyeceği | Geri dönüş maliyeti planın sözdizimsel özelliği, zorluk değil — bakılarak yanıtlanır |
| B | Kendi tur-1 cümlesindeki üretim/çözüm belirsizliği | Aynı olay durak koşulunda ve fayda sütununda zıt yönde sayılmalı |
| B | "Anonimlik statü etkisini keser" | Deferansın kendine dair bileşeni anonimlikten etkilenmiyor |
| B | Tavansızlık | Tavanın maliyeti "emin değilim" dediği yöne bağlı — haklıysa sıfır, yanılıyorsa tek durdurucu |
| A | Lite'ın ayrı kavram kalması | Şart 1 ile özdeşleşiyor |

**Mekaniğin kendi kuralları ilk kullanımlarında iş gördü:** ortak dosya, yöneticinin özet
hatasını yakalattı · ezici valf, ikinci üyeyi kapatmaktan alıkoydu · nesne şartı, uzatma
kararını histen değil kuraldan türetti.

Yine de tek koşu. **Bir koşu eğilim gösterir, kanıt değil.**
