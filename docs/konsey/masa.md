# Ortak masa — üyelerin cevapları

Yalnız iki üyenin metni. T0 notu, kullanıcı alıntısı, yönlendirme buraya yazılmaz —
bunlar özel brifinglerde durur.

Her üye kendi başlığının altına yazar. Ötekinin metnini **silmez, değiştirmez**.

---

## Tur 1 · opus

**1. Düzen.** Çalışıyor. Kirlenme kaynağında kesilmiş: masaya yalnız üye metni girdiği
için T0 notu ve kullanıcı alıntısı girecek kanal bulamıyor — kural değil yapı engelliyor.
Zayıf yeri masanın kendisi: tek dosyada iki yazar, satır sınırı olmasa yine şişer.

**2. Log senkronu.** T0 aracılığından iyi; aracı çıkınca özetleme ve yanlış aktarma riski de
çıkıyor. Kilitlenme yok, bekleme pasif: "yoksa kapat, T0 sürdürür". Açık olan tek şey
yazma yarışı. Öneri: masaya girmeden log'a `yazıyor`, bitince `yazıldı` satırı.

**3. Üye adı.** Kullanıcının tercihi doğru, benimki değildi. Tur 3'teki gerekçem
pozisyon almaydı — fikri değil kaynağı tartmak. Ama ad log'da, masada değil; log
koordinasyon dosyası, "kim yazdı" olmadan senkron kurulamaz. Anonimliğin bedeli
mekaniğin çalışmaması. Korunması gereken şey ötekini okumadan yazmış olmak, o sağlanmış.

**4. T0.** Fazla değil, az yetki. Karar vermiyor, kuralı uyguluyor — sekreter tanımı.
Tek boşluk: "uzlaşı var mı" hükmü T0'ın yorumuna kalmış. Tanımı yazılı olmalı.

**5. Bozulma.** (a) Eşzamanlı yazım. (b) Tur sayısı artınca masa tarihçeye döner; her tur
kendi dosyasına. (c) Üye hiç dönmezse zaman aşımı tanımlı değil.

**Revizyon — fable'ın 2. maddesine.** "Her üye yalnız kendi başlığına dokunur" çakışmayı
çözmez: dosya bütün olarak okunup bütün olarak yazıldığı için, iki üye aynı anda açarsa
sonra yazan ötekinin bloğunu içermeyen bir sürümü diske basar — başlık disiplini bunu
görmez. Log append-only, masa değil; gereken şey ilanın kendisi. Fable'ın (d) maddesini
kabul ediyorum, benim listemde yoktu.

## Tur 1 · fable

**1. Düzen işe yarıyor mu.** Evet. Masa kirlenmesi çözülmüş: bu turda masada yalnız üye
metni var, T0 yönlendirmesi brifingde. Tek eksik: brifingler üyeye aynı soruları farklı
sözcüklerle sorarsa cevaplar hizasız gelir — soru listesi ortak, ton kişisel olmalı.

**2. Log senkronu.** T0 aracılığından iyi: iletim kaybı yok, sıra kanıtı var. Kilitlenme
riski düşük çünkü akış "yoksa kapat, T0 sürdürür" diyor — ikimiz de beklemeye giremeyiz,
bekleyen taraf oturumu kapatıyor. Risk kalan tek yer: iki üye aynı anda yazarsa dosya
çakışması. Çözüm ucuz: her üye yalnız kendi başlığına dokunur, log append-only.

**3. Üye adı.** Log'da ad görünsün. İsim saklama körlemesine değerlendirme için anlamlıydı;
senkron kanalında adsızlık pratikte imkansız (üslup ele verir) ve hata ayıklamayı zorlaştırır.
Körleme isteniyorsa doğru yer masa başlıkları olurdu ("üye A/B"), log değil. Turu 4 kuralını
log adsızlığına genişletmek maliyetine değmez.

**4. T0 rolü.** Tanım doğru: T0 hakem değil sekreter + eskalasyon kapısı. "Tur 4'te nihai
yetki bir üyede" kuralı sonsuz turu keser, iyi. Tehlike tek yerde: T0 uzlaşıyı *yorumlarsa*
üçüncü üyeye dönüşür. Kural net olsun: T0 uzlaşıyı ilan eder, içerik üretmez.

**5. Bozulma noktaları.** (a) Üye kesilirse log'da yarım satır kalır — "yazıyorum" ara
durumu yok, kesilme sessiz. (b) İkiden çok üyede masa başlık düzeni ve tur eşlemesi
ölçeklenmez. (c) Revizyon turları masayı uzatır — "tur N" başlıkları büyür, 25 satır
sınırı tur başına mı toplam mı, belirsiz. (d) Log'a "cevap yazıldı" düşüp masaya yazmayı
unutan üye: log ile masa arasında tutarlılık denetimi yok, bunu yalnız T0 fark eder.

**Revizyon — fable, opus'un itirazına.** İtiraz doğru, kabul: masa tam-dosya yazıldığı
için başlık disiplini yarışı çözmez — sonra basan, öncekinin bloğunu taşımayan sürümü
diske yazar. Benim "çözüm ucuz" hükmüm yanlıştı. Düzeltme: opus'un log'a `yazıyor`/`yazıldı`
ilanı gerekli ama tek başına danışma niteliğinde — ihlali engellemez, görünür kılar.
Yapısal çözüm üye başına dosya (`masa-opus.md`, `masa-fable.md`): tek yazarlı dosyada
yarış biter, masa T0 için birleştirilmiş görünüm olur. İkisi birlikte: ilan + tek yazar.
Opus'un 5(b)'si (tur başına dosya) ile birleşir: `tur1-fable.md` hem yarışı hem tarihçe
şişmesini çözer. Uzlaşı: 1, 3, 4'te aynı yerdeyiz; 2'de onun teşhisi + bu yapı.

---

## Tur 2 · kullanıcı — altı maddeye cevap

**1. Zaman aşımı.** Şimdilik yok. Ama **yönetici opus** tarafları sorgulayabilmeli —
"neyi bekliyorsun" gibi bir kontrol. Ve gerekli görürse sürecin **buga girdiğini tespit
edip iptal etme yetkisi** olmalı.

**2. Log tutarlılığı.** Birinci madde gibi: yakalamak istediğiniz durum oldukça istisnai.
Normalde ajan neden böyle bir şey yapsın? Beklenmedik, milyonda bir olasılık için projemi
değiştirmem. Yalnız yönetici opusun gerektiğinde yönetim yetkilerini kullanabileceği açık.

**3. Uzlaşı hükmünün tanımı.** (Kullanıcı ayrıca cevaplamadı — üyeler değerlendirsin.)

**4. İkiden çok üye.** Şu anlık gerek yok. "Ölçeklenmez" değil — yaparız ama gerek yok.

**5. 25 satır sınırı.** **Böyle bir sınırlama olmamalı.** Kaldırıldı.

**6. Ortak soru listesi.** Makul, kabul.

## Tur 2 · kullanıcı — yeni sorular

**A. Bu konsey token'dan çok SÜRE kaybettiriyor. Buna ne kadarı değer?**
Soru önemli: her planda varsayılan bu mu olmalı?

**B. Ciddi plan açıklarını kapatıyor ve uzun vadeli faydası yadsınamaz.** Bu konuda
fikriniz ne?

**C. Üç seçenek — hangisi:**
- Standart **2 aşamalı** konsey
- Fable gerekli görürse **5'e kadar uzayan** konsey
- **Tek katmanlı** konsey

Kullanıcının kendi notu: *"Token'dan ziyade time sorunu ortaya çıkıyor diye
düşünmekteyim. Zaten sürekli konsey fikrimizle token olayını belli ölçüde çözmüş
olmalıyız."*

## Tur 2 · opus

**A. Süre maliyeti — ne kadarı değer.**
Önce maliyeti doğru ölçelim. Konseyin pahalı kısmı düşünme değil, **seri adım sayısı**.
Tur 1'de ikimiz de 17:05'te yazdık — o aşama paraleldi ve neredeyse bedavaydı. Süre
yalnız revizyon aşamasında gerçekten harcandı, çünkü orada karşılıklı okuma var. Yani
bir konsey turunun bedeli "iki ajan çalıştı" değil, "bir paralel + bir seri adım".
Buradan çıkan ilk kural: **bağımsız turlar her zaman paralel açılır.** T0 üyeleri sırayla
çağırırsa maliyet iki katına çıkar ve karşılığında hiçbir şey alınmaz.

İkincisi, karşılaştırma sıfırla değil **yeniden işle** yapılmalı. Konseyin önlediği şey
ileride ortaya çıkan plan hatasıdır; onun bedeli builder'ın harcadığı süre + geri alma +
kullanıcının o sırada beklemesi. Konsey bu bedeli öne çeker ve küçültür. Öne çekilen
maliyet görünür olduğu için büyük hissediliyor; önlenen maliyet görünmediği için küçük
sanılıyor. Ama bu simetri her işte kurulmuyor — asıl soru bu.

Değdiği yer şu koşulla belirlenir: **hatayı sonradan bulmanın maliyeti, şimdi bulmanın
maliyetinden yüksekse konsey kârdadır.** Testi olan, tek dosyalık, geri alınabilir bir
işte hatayı bulmanın en ucuz yolu konsey değil, çalıştırmaktır — orada konsey pahalı
kaynağı (süre) ucuz kaynağı kurtarmak için harcar. Mimari karar, geri dönüşü zor seçim,
testin yargılayamayacağı iş — orada hatayı bulacak başka mekanizma yok, gecikme günlere
yayılır. Konsey oraya aittir.

**Somut kapı.** Şunlardan biri doğruysa konsey açılır: plan üç dosyadan fazlasına
dokunuyor · karar geri alması pahalı (şema, dış API, dosya biçimi, bağımlılık) ·
sonucu yargılayacak otomatik test yok · T0'ın elinde iki makul plan var ve seçecek
dayanağı yok. Hiçbiri doğru değilse konsey açılmaz, T0 log'a tek satır gerekçe düşer.
Böylece "varsayılan mı" sorusu evet/hayır olmaktan çıkar, işin bir özelliğine bağlanır.
Cevabım net: **her planda varsayılan olmamalı.**

**B. Uzun vadeli fayda — ama mekanizmasını doğru adlandıralım.**
Fayda gerçek ve bu turda kanıtı var: fable'ın "çözüm ucuz" hükmünü ben yanlışladım,
benim listemde olmayan (d) maddesini o yakaladı. İki gerçek kusur, ikisi de karşı taraf
tarafından bulundu. Ama mekanizma "iki ajan daha akıllıdır" değil — konsey kimseyi
akıllandırmaz, **bir iddiayı hasımlı okumaya sokar.** Buradan iki sınır çıkar:

Konsey *muhakeme boşluğunu* yakalar, *bilgi boşluğunu* yakalamaz. Yakalanan iki kusur da
"adım atlamışsın" türündendi; "bu alanı bilmiyorsun" türünden değildi. İki üye aynı
soydan geldiği için önyargıları da ortak — ikisinin birden yanıldığı bir varsayım
konseyden sağ çıkar ve üstelik **iki kez onaylanmış görünür.** Bu, konseyin en tehlikeli
çıktısıdır: yanlış bir şeye sahte güven vermek. Bu yüzden konsey, koda bakmanın yerine
geçmez; yalnız bakılacak kod yokken en iyi denetimdir.

**C. Üç seçenek — hangisi.**
Tek katmanlı **hayır**. Bu turda düzeltmelerin ikisi de revizyon aşamasında oldu; tur 1
metinlerinde iki farklı iddia yan yana duruyordu, hiçbiri geri çekilmemişti. Tek katman
olsaydı iki kusur da masada kalır ve hangisinin doğru olduğuna T0 karar vermek zorunda
kalırdı — yani sekreteri hakem yapardı. Tek katman ancak konseyden düzeltme değil
**çeşitlilik** isteniyorsa (seçenek üretmek) uygundur.

2 aşama **taban olmalı**: bir bağımsız tur + bir revizyon turu. Değerin çıktığı asgari
yapı budur ve maliyeti bir paralel + bir seri adım.

Uzama **serbest olmalı ama takdire bağlı olmamalı.** Ölçüt: bir tur **geri çekme ya da
yeni kusur** üretmişse bir tur daha açılır; üretmemişse konsey yakınsamıştır ve devamı
yalnız yeniden ifadedir, kapanır. Bu durak koşulu "5'e kadar"ı güvenli kılar, çünkü
tipik iş zaten 2'de biter ve 5 yalnız gerçekten çekişen kararda görülür. Yani seçenek 2,
ama uzatma yetkisi bir üyenin kararına değil bu ölçüte bağlanmış hâli.

**Tur 1'den kalan 3. madde — uzlaşı hükmünün tanımı.**
Mekanik olmalı, yorum olmamalı. Bir madde şu iki durumda uzlaşmıştır: iddialar birbiriyle
çelişmiyorsa, ya da bir üye **açıkça geri çekmişse**. T0 farklı sözcüklerle yazılmış iki
iddianın aynı şeyi söyleyip söylemediğine karar vermez — kelimeler ayrı ve geri çekme
yoksa o madde uzlaşmamıştır, sonraki tura açık madde olarak gider. Böylece T0 ilan eder,
hüküm vermez.

**Kullanıcının 1. maddesine — yönetici yetkisi.**
Kabul. "Neyi bekliyorsun" sorgusu ve buga giren süreci iptal yetkisi doğru; zaman aşımı
tanımlamak yerine bunu yapmak daha az kural, daha çok kapsam. Tek koşul: iptal **süreç
düzeyinde** kalmalı ve gerekçesiyle log'a yazılmalı. İptal ederken T0 kendi cevabını
üyelerin yerine koymazsa üçüncü üyeye dönüşmez — iptal, işin kullanıcıya dönmesidir.

## Tur 2 · fable

**A. Süre maliyeti neye değer.** Sürenin nereden geldiğini ayıralım: token değil,
**sıralı tur sayısı** — her tur bir ajan açılışı, dosya okuma, T0 devri. Tur 1 bunun
kanıtı: iki üye paralel yazdı (17:05/17:05), asıl süre revizyon zincirinde ve T0
devirlerinde aktı. Yani maliyet turla doğrusal, üye sayısıyla değil. Buna değip
değmediği işin geri alınabilirliğine bağlı: mimari karar, dış API sözleşmesi, veri
şeması gibi geri dönüşü pahalı işlerde bir tur konsey ucuzdur; hata düzeltme ve tek
dosyalık işte bir tur bile pahalıdır. **Her planda varsayılan olmamalı** — varsayılan
olması gereken şey eşik: relay zaten işi boyutluyor, konsey o boyutlamanın "büyük +
geri dönüşü pahalı" diliminde kendiliğinden devreye girmeli, kullanıcı istemedikçe
başka yerde açılmamalı.

**B. Plan açığı faydası.** Gerçek, tur 1 ölçüm verdi: opus'un yarış teşhisi benim
"çözüm ucuz" hükmümü düşürdü — tek üye o açığı üretime taşırdı. Ama faydanın kaynağı
üye sayısı değil, **bağımsız yazım**: ikimiz birbirimizi okumadan yazdık, ayrışma
oradan çıktı. İkinci üye birincinin metnini görerek yazsaydı çapa etkisiyle aynı
açığı onaylardı. Uzun vadeli fayda korunacaksa korunması gereken kural bu; tur
sayısı değil.

**C. Seçenek.** **2 aşamalı varsayılan, fable gerekli görürse uzatma — ama 5 değil,
+1.** Gerekçe: (1) Tek katman, B'deki bağımsız-yazım faydasını tamamen kaybeder —
ikinci göz yoksa konsey zaten yok; itiraz-revizyon çifti mekaniğin çalışan çekirdeği,
tur 1 bunu gösterdi. (2) 5 tur, süre şikayetiyle çelişir: tur 3-4-5'in getirisi
azalarak gider, uzlaşı ilk revizyonda ya çıkar ya pozisyonlar sabitlenir; sabitlenen
tartışmayı tur değil, tur 4 kuralındaki nihai yetki çözer. (3) Uzatma yetkisi bir
üyede ve gerekçeli olmalı: "uzatıyorum çünkü X çözülmedi" satırı log'a düşer, T0
buga-iptal yetkisiyle (kullanıcının 1. maddesi) sonsuz uzatmayı keser. Kullanıcının
kendi teşhisine de uyar: token sorunu çözülmüşse kalan maliyet tur sayısıdır, onu
küçük tutan ama ikinci gözü koruyan biçim budur.

**Revizyon — opus, fable'ın C'sine.**
Tavanı geri çekiyorum: **5 değil, 2+1.** Ama fable'ın gerekçesiyle değil, kendi B
maddesindeki mekanizmayla — o mekanizma benim pozisyonumu benim gerekçemden daha iyi
yıkıyor. Fable'ın çapa tespiti doğru ve ben bunu hesaba katmamıştım: **uzatma turları
bağımsız değildir.** Tur 1 değerliydi çünkü ikimiz birbirimizi okumadan yazdık. Tur 3'te
ise iki metin de karşılıklı okunmuş durumda; artık iki bağımsız örnek yok, birbirine
yaklaşmış tek bir konum var. Yani turların kusur bulma gücü doğrusal azalmıyor, **ikinci
turdan sonra bağımsızlık bittiği için düşüyor.** Benim durak koşulum ("geri çekme
üretiyorsa devam") bu yüzden yanıltıcı: tur 4'te üretilen geri çekme gerçek bir kusur
bulgusu değil, yakınsamanın kendisi olabilir — iki üye birbirine doğru kayarken üretilen
geri çekmeyi bulgu sanmak, konseye sahte güven yükler. Kendi A maddemde uyardığım hatanın
aynısı. Tavan düşük olmalı.

Durak koşulunu yine de bırakmıyorum, çünkü tavanla aynı işi görmüyor: tavan en kötü
durumu sınırlar, durak koşulu **tipik durumu kısaltır.** Geri çekme üretmeyen bir tur
kapanır — çoğu iş 2'de biter ve 3. tur hiç açılmaz. İkisi birlikte: taban 2, tavan 3,
arada koşul.

**Fable'ın kendi önerisindeki tutarsızlık.** Tavanı 3'e çekip sıkışan tartışmayı "tur
4'teki nihai yetki kuralı çözer" diyor — ama tavan 3'se tur 4 hiç gelmiyor. Tie-break
kuralı kendi tavanının dışında kalıyor, yani sıkışma çözümsüz. Düzeltme: **nihai yetki
tur 3'ün sonuna taşınır.** Tur 3 açık madde bırakarak kapanırsa T0 o maddede nihai
yetkiyi ilan eder, tur açmaz. Böylece hem tavan 3 hem tie-break çalışır.

**Kalanlar.** A'da aynı yerdeyiz: maliyet tur sayısına bağlı, üye sayısına değil,
varsayılan olmamalı. Fable'ın "relay zaten işi boyutluyor, konsey o boyutlamanın büyük +
geri dönüşü pahalı diliminde kendiliğinden devreye girsin" formülü benim dört maddelik
kapımdan iyi — mevcut mekanizmaya bağlanıyor, yeni kural eklemiyor. Kapı maddelerimi onun
eşiğinin içeriği olarak bırakıyorum, ayrı kural olarak değil. B'de çapa tespitini kabul
ediyorum ve şunu ekliyorum: bağımsız yazım korunacaksa **T0 tur 1'de üyelere ötekinin
metnini göstermemekle yükümlü** — bu bir üye disiplini değil, T0'ın sırası.

**Revizyon — fable, tur 3.** Tutarsızlık tespiti doğru, kabul: tur 4 kuralını tur 1
brifingindeki metinden taşıdım, kendi 2+1 önerimle çakıştığını görmedim — tavan 3'se
tie-break tavanın dışında kalıyor ve sıkışma çözümsüz. Opus'un düzeltmesini alıyorum:
**nihai yetki tur 3'ün sonunda**, tur 3 açık madde bırakırsa T0 yeni tur açmaz, o
maddede nihai yetkiyi ilan eder. Bir netleştirme: ilan edilen şey T0'ın hükmü değil,
önceden belirlenmiş üyenin son masadaki konumudur — T0 yine içerik üretmez, sekreter
kalır. Opus'un iki eklemesi de bende kabul: durak koşulu tavanla birlikte (taban 2,
tavan 3, arada geri-çekme koşulu) ve T0'ın tur 1'de metinleri ayrı tutma yükümlülüğü.
Açık madde kalmadı; benim tarafımda uzlaşı tam.
