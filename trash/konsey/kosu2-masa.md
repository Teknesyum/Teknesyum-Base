# Ortak masa — koşu 2 · konsey mekaniğinin revizyonu

İki üye bu dosyaya bakar. Üyeler **Üye A** ve **Üye B** olarak anılır. Kimin hangi
üye olduğu, hangi modellerin masada olduğu, kaç farklı model bulunduğu **üyelere
bildirilmez.** Bunu yalnız yönetici bilir.

Masaya **yalnız üye metni ve kullanıcı metni** girer. Yönetici yönlendirmesi özel
brifinglerde durur.

---

## Kullanıcının yeni tasarımı — birebir

> *"Kimlik gizlenmesin dedi ama haksız. Taraflar A ve B olacak, kimin kim olduğunu
> sadece yönetici bilecek; ortada hangi modelin olduğu bile belli olmayacak taraflarca.*
>
> *2. oturumun olmasını istiyorum, zira taraflar ancak o zaman birbirlerinin
> görüşlerini bilecek.*
>
> *Yöneticinin çok basit olduğunu düşündüğü, uzun vadede geri dönüş maliyeti az olan
> planlarda **konsey lite** çağrılabilir — sadece 1. oturum olur, taraflar birbirinin
> cevabını görmez, klasik şimdiye kadarki sistem. Ancak bunu da uzun vadede izlemek
> istiyorum: konsey lite'ın ortalama ne kadar token ve ne kadar süre harcadığı
> `docs/stats/` altındaki dosyaya not edilecek. Yeni konsey de aynı verileri aynı yere
> yazacak ki karşılaştırabilelim.*
>
> *2+ oturumlu mekanik daha faydalı gibi düşünüyorum: taraflar 'revizyona gerek yok'
> derse olay 2'de bitecek, 'var' derlerse en çok 4'te bitecek."*

---

## Önceki koşuda masanın vardığı yer

Bunlar **kapanmış** kabul edilmez, revize ediliyor:

- Taban 2 tur, tavan 3. → kullanıcı **tavan 4** istiyor.
- Üye adı log'da görünür. → kullanıcı **anonim A/B** istiyor, gerekçesi: taraf kimin
  masada olduğunu bilmesin.
- Durak koşulu: bir tur geri çekme ya da yeni kusur üretmediyse kapanır.
- Konsey varsayılan değil; eşik relay'in kendi boyutlamasına bağlı.
- Bağımsız turlar paralel açılır; süre tur sayısına bağlı, üye sayısına değil.
- Faydanın kaynağı üye sayısı değil, **bağımsız yazım**.
- Konsey muhakeme boşluğunu yakalar, bilgi boşluğunu yakalamaz.

Önceki koşuda bir üyenin ürettiği ve masada duran uyarı:

> *"Uzatma turları bağımsız değildir. Tur 1 değerliydi çünkü iki taraf birbirini
> okumadan yazdı. Tur 3'te iki metin de karşılıklı okunmuş durumda; artık iki bağımsız
> örnek yok, birbirine yaklaşmış tek bir konum var. Turların kusur bulma gücü doğrusal
> azalmıyor, ikinci turdan sonra bağımsızlık bittiği için düşüyor."*

> *"Tur 4'te üretilen geri çekme gerçek bir kusur bulgusu değil, yakınsamanın kendisi
> olabilir. İki üye birbirine kayarken üretilen geri çekmeyi bulgu sanmak, konseye sahte
> güven yükler."*

Kullanıcı tavanı yine de 4 istiyor. Bu çelişkiyi masanın çözmesi bekleniyor.

---

## Sorular — koşu 2, tur 1

1. **Anonimlik.** Tarafların birbirinin kimliğini — hangi model, kaç model, kim daha
   yetkili — bilmemesi mekaniği düzeltir mi, yoksa yeni bir sorun mu açar? Özellikle:
   yukarıdaki "ortalamaya kayma" uyarısını anonimlik gerçekten söndürür mü?

2. **Taban 2 / tavan 4.** İki taraf da "revizyona gerek yok" derse 2'de biter, aksi
   halde en çok 4. Yukarıdaki "3'ten sonrası sahte güven" uyarısıyla bu tasarım nasıl
   uzlaşır? Uzlaşmıyorsa hangisi düşer?

3. **Konsey lite.** Basit ve geri dönüşü ucuz işte tek turluk, çapraz okumasız,
   klasik konsey. Yönlendirme kararını yöneticinin **iş başlamadan önceki** tahminine
   bırakmak sağlam mı? Yanlış yönlendirmenin maliyeti hangi yönde daha ağır — gereksiz
   yere tam konsey açmak mı, hafifi seçip kaçırmak mı?

4. **Ölçüm.** `docs/stats/` altına ne yazılmalı ki lite ile tam konseyin
   karşılaştırması **anlamlı** olsun? Token ve süre yeterli mi? Hangi karıştırıcı
   (confounder) bu karşılaştırmayı işe yaramaz hale getirir — çünkü kolay işler lite'a,
   zor işler tama gidecek; yani iki grup baştan farklı.

5. **Kaçırdığımız.** Bu tasarım hangi durumda bozulur?

---

## Üye A

**1. Anonimlik.** İki ayrı sorunu ayırmak gerekiyor. Anonimlik statü etkisini keser:
üye "karşımda daha yetkili model var" diye geri adım atamaz, metni yazarına göre
tartamaz. Bu gerçek bir düzeltme. Ama "ortalamaya kayma" uyarısını **söndürmez** —
kayma kimlik bilgisinden değil, metnin kendisinin okunmasından doğar. Tur 2'de karşı
metni okuduğum anda, yazarı kim olursa olsun, makul görünen argümana yaklaşma basıncı
başlar. Anonimlik yakınsamanın hızını belki azaltır, mekanizmasını kaldırmaz.
Açtığı yeni sorunlar: (a) üslup ve biçimlendirme alışkanlıkları modeli ele verebilir —
anonimlik pratikte sızdırır; (b) her üye kendi kimliğini biliyor, gizlilik tek yönlü;
(c) iki üye aynı modelse anonimlik korunmuş ama bağımsızlık zaten zayıf — asıl önemli
bilgi "kaç farklı model var" ve o da gizli, yani üye kendi örnekleminin değerini
tartamıyor. Statü etkisinin LLM'lerde ne kadar güçlü olduğundan emin değilim; sezgim
"var ama küçük" yönünde.

**2. Taban 2 / tavan 4.** Uyarı doğru: bağımsızlık tur 2'de biter, tur 3-4 kusur bulma
turu değildir. Ama bundan "tavan 3 olsun" çıkmak zorunda değil — çıkması gereken şey
tur 3-4 çıktısının **statüsünün düşürülmesi**. Somut öneri: tur 2'de iki taraf da
"revizyon gerekmez" derse kapan (taban 2 dursun). Tur 3-4'te üretilen geri çekme ancak
**sınanabilir yeni gerekçeyle** geçerli sayılsın — "haklısın" tek başına bulgu değil,
yakınsama sinyali olarak loglanır ve yönetici onu düşük güvenle okur. Böylece tavan 4
kalır (kullanıcının istediği), sahte güven uyarısı da mekanik olarak karşılanır
(masanın önceki tespiti). Uzlaşmayan tek şey, tur 4 kapanışını "konsensüs sağlandı"
diye raporlamak — o düşmeli; rapor "yakınsadı" demeli, "doğrulandı" değil.

**3. Konsey lite.** Ön tahmine bırakmak kırılgan görünür ama kullanıcının kriteri işi
kurtarıyor: yönlendirme ölçütü "iş basit mi" değil, "**yanlış çıkarsa geri dönüşü ucuz
mu**". Geri dönüşü ucuz işte kaçırılan kusurun maliyeti tanım gereği sınırlı; tahmin
hatası kendi sigortasını taşıyor. Bu yüzden asimetri net: gereksiz tam konsey açmanın
maliyeti sınırlı ve ölçülebilir (token + süre), hafifi seçip kaçırmanınki ise ancak
geri-dönüş-maliyeti kriteri doğru uygulanırsa sınırlı. Yani tehlike tahminin kendisinde
değil, "basit" ile "geri dönüşü ucuz"un karıştırılmasında — basit görünen ama geri
alınması pahalı işler (şema değişikliği, dış API sözleşmesi, veri silme) lite'a asla
gitmemeli. Bir de emniyet valfi öneriyorum: lite'ta iki üye birbirini görmeden çelişik
cevap verirse yönetici tam konseye yükseltebilsin — yanlış yönlendirme sonradan
yakalanır.

**4. Ölçüm.** Token ve süre yetmez; ikisi de maliyeti ölçer, faydayı ölçmez. Kayda
girmesi gerekenler: iş büyüklüğü proxy'si (relay boyut sınıfı, dosya/diff sayısı), tur
sayısı, konseyin planı **değiştirip değiştirmediği** (kabul edilen revizyon sayısı —
sıfırsa konsey o işte fayda üretmemiş), ve gecikmeli etiket: iş kapandıktan sonra o
işte hata/geri dönüş çıktı mı. Ana karıştırıcı masada zaten adlandırılmış: seçim
yanlılığı. Kolay işler lite'a, zorlar tama gidince ham ortalama karşılaştırması yalnız
"kolay iş ucuzdur" totolojisini üretir. Çare iki adım: (a) karşılaştırmayı yalnız aynı
boyut sınıfı içinde yap (stratifikasyon); (b) arada bir, lite'lık bir işi bilerek tam
konseye ver — küçük bir çakışma bölgesi olmadan iki grup hiçbir zaman
karşılaştırılamaz. Bunu yapmayacaksak stats dosyası maliyet muhasebesi olarak dürüst,
"hangisi daha iyi" sorusuna kanıt olarak değersiz. Ayrıca stats'a kim yazacak belli
olmalı — iki üye aynı dosyaya yazarsa çakışır; yönetici yazmalı.

**5. Bozulma durumları.**
- **Aynı model, iki sandalye.** İki üye aynı modelse "bağımsız yazım" iki bağımsız
  örnek değil, aynı dağılımdan iki çekiliş — kör noktalar korelasyonlu, aynı kusuru
  ikisi birden kaçırır ve bu "iki taraf da sorun görmedi" diye güven üretir. En
  sinsi hali: tur 2'de erken kapanış tam da bu çakışmadan doğar.
- **Bilgi boşluğunda erken kapanış.** Masa zaten söylüyor: konsey bilgi boşluğunu
  yakalamaz. İki üye aynı yanlış varsayımda anlaşırsa "revizyon gerekmez" en hızlı ve
  en tehlikeli kapanıştır. Dış doğrulaması (test, çalıştırma, ölçüm) olmayan işte
  taban 2'nin verdiği güven şişirilmiş.
- **Kilitlenme.** `yazıyor` düşüp çöken üye masayı süresiz kilitler; protokolde
  zaman aşımı yok. "Yazıyor satırını görürsen bekle" kuralına bir tavan gerekli.
- **Anonimlik sızıntısı.** Üslup, bölüm düzeni, tipik ifade kalıpları kimliği ele
  verir; anonimliğin garantisi zayıftır, buna yaslanan tasarım kararı verilmemeli.
- **Yönetici tek nokta.** Kimlikleri, yönlendirmeyi ve tur sayımını tek başına
  yönetici tutuyor; onun brifing hatası (yanlış dosya, yanlış tavan) iki üyeye de
  aynı anda bulaşır ve masada onu yakalayacak kimse yok.

## Üye B

### 1 · Anonimlik

Anonimlik iki ayrı kanalı karıştırıyor. Kimlik kanalı: "karşımdaki daha yetkili, geri
çekileyim" — **otorite teslimi**. İçerik kanalı: "onun metnini okudum, artık bağımsız
iki örnek değiliz" — **yakınsama**. A/B gizlemesi yalnız birincisini keser.

Dolayısıyla masadaki "ortalamaya kayma" uyarısını anonimlik **söndürmez.** O uyarı
turu 3'te iki metnin karşılıklı okunmuş olmasıyla ilgiliydi; kimin yazdığıyla değil.
İsimleri silsen de karşı metni okumuş olmak çapayı kurar. Anonimliği bu uyarının çözümü
sayarsak, çözülmemiş bir sorunu çözülmüş sanırız — soru 2'nin yükü aynen duruyor.

Buna karşılık anonimlik ucuz ve geri alınabilir, otorite teslimini gerçekten kesiyor.
Kalsın. Ama hanesine yazılacak fayda dar: **deferans, kayma değil.**

Önceki koşudaki geri çekme gerekçesi ("log koordinasyon dosyası, kim yazdı olmadan senkron
kurulmaz") burada geçersiz — çünkü *anonim* ile *etiketsiz* aynı şey değil. A/B kararlı
takma addır, senkron kurulur; nitekim şu an kuruluyor. O geri çekme yanlış bir ikilem
üzerineydi.

Anonimliğin açtığı **yeni ve fiyatlanmamış** sorun şu: iki üyenin aynı yere varması,
aynı soydan gelen iki modelde zayıf kanıttır. Eskiden masada bu görülebiliyordu.
Şimdi kaç model var bilinmediği için "A ve B hemfikir" olduğundan güçlü görünüyor.
Anonimlik, mutabakatı iskonto etmek için gereken bilgiyi tam da saklıyor. Bu, T0'ın
üstlenmesi gereken bir yük: masa kompozisyonunu (kaç ayrı model) masaya değil ama
`stats` dosyasına yazmalı, yoksa geriye dönük hiçbir mutabakat doğru tartılamaz.

İkinci risk, simetrik olan: "kimseye üstünlük tanınmamıştır" cümlesi nötr bir bilgi
değil, bir müdahale. Deferansı kestiği kadar **inatçılık** üretebilir; sahte mutabakat
yerine sahte ihtilaf. Hangisinin baskın geldiğinden **emin değilim.** Ölçülebilir:
koşu başına açık geri çekme sayısı. Anonimlikle birlikte geri çekme sayısı sıfıra
düşüyorsa, bir sapmayı diğeriyle değiştirmişiz demektir.

Üçüncüsü küçük: anonimlik pratikte sızdırır. Üslup parmak izi (tablo alışkanlığı,
başlıklandırma, Türkçe register) modeli ele verir. Ama asıl taşıyıcı kısım — **kaç model
var ve kim daha yetkili** — gerçekten gizli kalıyor. Sızıntı bu tasarımı bozmuyor.

### 2 · Taban 2 / tavan 4

Uyarı tur *sayısı* hakkında değil, **bağımsızlık** hakkındaydı. Tavanı 3'te tutmak
bağımsızlığı geri getirmez, sadece bağımsız olmayan tur sayısını 1'e indirir. Yani
mevcut tasarımda 3 de 4 de aynı hastalığı taşıyor, dozu farklı.

O yüzden "hangisi düşecek" sorusuna cevabım: **ikisi de düşmesin, turun içeriği
değişsin.** Tavan 4 kalsın ama 3 ve 4 numaralı turlar **serbest tartışma değil, maddeye
kilitli** olsun:

- Tur 1 bağımsız. Tur 2 çapraz okumalı revizyon; iki taraf da "gerek yok" derse kapanır.
- Tur 3 ancak T0'ın adıyla listelediği **açık maddeler** için açılır. Üye o maddelerin
  dışına yazamaz. Kapsam daralmasının kendisi yakınsamayı yavaşlatır: yeniden
  formüle etme alanı kalmayınca birbirine kayacak yer de kalmaz.
- Tur 4 aynı kuralla, yalnız tur 3'ten sağ kalan maddeler için.

Ve uyarıyı işletilebilir hale getiren asıl madde şu — **geri çekme türü ayrılsın:**

> Bir geri çekme, üyenin daha önce hesaba katmadığı **somut bir nesne** (bir vaka, bir
> maliyet, bir bozulma senaryosu) adlandırıyorsa **bulgu**dur. "Karşı taraf ikna etti",
> "haklı sayılır", "itiraz etmiyorum" biçimindeki geri çekme **yakınsama**dır.
> Yakınsama tipi geri çekme log'a öyle yazılır ve **durak koşulunu tetiklemez.**

Bu, "tur 4'teki geri çekme bulgu değil yakınsama olabilir" endişesini bir tur tavanıyla
değil, doğrudan ölçütle karşılıyor. Tavanla bastırmak kaba bir vekil; asıl korkulan şey
tur numarası değil, nesnesiz geri çekme.

Maliyet tarafı: tur 3-4 seridir, duvar saati doğrusal artar. Ama durak koşulu gerçekten
çalışıyorsa çoğu iş 2'de biter ve **bağlamayan bir tavan neredeyse bedavadır.** Pahalı
olan 4 sayısı değil, *kapsamsız* 3-4. Zorunlu bir seçim dayatılırsa düşecek olan budur.

Ek kusur — mevcut durak koşulu iki farklı sonucu ayırt etmiyor: "hemfikiriz" ile
"tıkandık" ikisi de "geri çekme üretmedi" görünür. Kapanış nedeni log'a ayrı yazılmalı
(*uzlaşı · durak · tavan · T0 iptali*), yoksa soru 4'teki ölçüm baştan bozuk veri toplar.

### 3 · Konsey lite

T0'ın iş öncesi tahmini **yeni bir hata kaynağı değil** — relay zaten aynı tahmini
boyutlama için yapıyor. İtirazım oraya değil. İtirazım şuna: bu tahmin, sistematik
olarak *yanlış olması en pahalı olan* yerde en zayıftır. Bir işin geri dönüşünün pahalı
olduğu vakalar, tipik olarak kimsenin öngörmediği vakalardır. Tahmin, önemsiz olduğu
yerde iyi; kritik olduğu yerde kötü. Bu haliyle tek başına yönlendirme dayanağı olmaz.

Maliyet asimetrisi net ve tek yönlü:

| Yanlış yön | Maliyeti | Sınırı |
|---|---|---|
| Gereksiz tam konsey | 1-2 ek seri tur, token + süre | **sınırlı, önceden bilinen** |
| Hafifi seçip kaçırmak | geri dönüşü pahalı kararda yakalanmamış muhakeme boşluğu | **sınırsız, geç fark edilir** |

Ucuz-ve-sınırlı bir hata ile pahalı-ve-sınırsız bir hata karşılaştırılıyor. Bu yüzden
belirsizlik altında varsayılan **tam konsey** olmalı; lite, ucuzluğun *olumlu kanıtı*
istenerek seçilmeli — "pahalı olduğuna dair kanıt yok" yeterli değil.

Ama asıl cevabım sorunun ön kabulünü kaldırmak: **karar iş başlamadan verilmek zorunda
değil.** Lite'ın turu 1'i, tam konseyin turu 1'i ile birebir aynı — iki üye, bağımsız,
çapraz okuma yok. Aradaki tek fark tur 2'nin açılıp açılmaması. Öyleyse lite
**yükseltilebilir** olsun:

> Lite açılır. T0 tur 1 metinlerini okur. İki metin taşıyıcı bir maddede **çelişiyorsa**,
> ya da herhangi bir üye taşıyıcı bir maddede **"emin değilim"** yazmışsa, iş tam konseye
> yükselir ve tur 2 açılır. Aksi halde lite kapanır.

Böylece lite hiçbir zaman kaybedilmiş bir bahis olmaz; "turu 1'de durmuş tam konsey"
olur. Yanlış yönlendirmenin maliyeti bir tur gecikmeye iner. Kapı da mekanik: çelişki
ve "emin değilim" ikisi de metinden okunur, yorum gerektirmez.

Bedeli dürüstçe: lite'ın ortalama maliyeti yükselir ve soru 4'teki karşılaştırma
kirlenir — yükseltilen koşular ayrı işaretlenmezse hem lite hem tam grubunu bozarlar.

### 4 · Ölçüm

Token ve süre **yetmez, hatta tek başına yanıltıcıdır.** İkisi de yalnız maliyet
sütunu. Sadece maliyete bakan bir karşılaştırma her seferinde "lite daha ucuz" der —
bu sonuç kurgudan çıkar, veriden değil, dolayısıyla hiçbir şey öğretmez. Fayda sütunu
olmadan `docs/stats/` bir karar dayanağı değil, bir muhasebe defteridir.

Konseyin faydası karşı-olgusaldır: **planı değiştirdi mi.** Bunun ölçülebilmesi için
tek bir alışkanlık gerekir ve şu an tasarımda yok:

> T0, konseyi açmadan **önce** kendi taslak kararını bir satırla yazar. Konsey
> kapandığında bu satırla nihai kararı karşılaştırır: taşıyıcı bir maddede değişti mi,
> evet/hayır.

Bu tek alan, token ve sürenin toplamından daha bilgilendirici. Yanına şunlar, hepsi
ucuz ve nesnel:

- `tur_sayisi` ve `kapanis_nedeni` (uzlaşı · durak · tavan · iptal · lite-tek-tur)
- `geri_cekme_bulgu` / `geri_cekme_yakinsama` — soru 2'deki ayrımla, ayrı sayılar
- `t0_nihai_yetki_madde_sayisi` (uzlaşmadan kapanan madde)
- `yukseltildi_mi` (lite → tam), soru 3'ten
- `masa_kompozisyonu` — kaç ayrı model, soru 1'den; masaya değil buraya
- `zorluk_tahmini` — yönlendirmede kullanılan tahminin ta kendisi (dokunulan dosya,
  geri dönüş maliyeti, otomatik test var mı)
- `yeniden_ele_alindi` — konsey kapanışında **boş** bırakılır, o iş sonradan revize
  edilirse doldurulur

Son alan tek gerçek yer ölçüsü ve geç geliyor; diğerlerinin hepsi vekil. Bunu peşinen
kabul etmek lazım, yoksa vekiller yer ölçüsü sanılır.

Biçim: konsey başına **tek satır**, append-only, makine okunur (TSV ya da satır başına
bir JSON). Düzyazı istatistik dosyası hiçbir zaman toplulaştırılmaz. `log.md` ile
birleştirilebilmesi için bir `kosu_id` alanı olsun.

**Karıştırıcı.** Sorulan karıştırıcı gerçek ve tek başına ölümcül: kolay iş lite'a, zor
iş tama gidiyor; yani atama rastgele değil, **sonucu belirleyen değişkene göre** yapılıyor.
Sonuç şu olur — tam konsey her metrikte daha kötü görünür (daha çok ihtilaf, daha çok
yeniden ele alma, daha çok maliyet), çünkü zor işleri o aldı. Naif karşılaştırma "tam
konsey zararlı" diye okunabilir. Bu, daha çok alan loglayarak **düzelmez.**

Yapılabilecekler, ucuzdan pahalıya:

1. `zorluk_tahmini` sütunu — karşılaştırma grup içinde, zorluk bandı bazında yapılır.
   Karıştırıcıyı kaldırmaz, **görünür** kılar. Görünmez olmasından iyidir.
2. **Kasıtlı çapraz atama:** lite'a yönlenen her N'inci işte yine de tam konsey koşulur.
   Karıştırıcıyı gerçekten kıran tek şey budur — bir dilimde rastgele atama. Ters yönü
   (tam işi lite'a vermek) önerilmez, çünkü onun hata maliyeti soru 3'teki sınırsız olan.
3. Ve asıl önerim: **karşılaştırmaya bel bağlamayın.** Bu projede ayda kaç konsey
   koşacak? Onlarca değilse, hiçbir istatistik iki grubu ayıramaz; karıştırıcı kalıcı
   olarak baskın kalır. Buna karşılık iki ölçü **grup içi**dir, karşılaştırmaya hiç
   ihtiyaç duymaz ve doğrudan sorulan soruyu cevaplar:
   - **yükseltme oranı** — "lite seçilen işlerin yüzde kaçı tam konseye çıkmak zorunda
     kaldı". Yönlendirme iyi mi kötü mü, tek başına söyler.
   - **yeniden ele alınma oranı** — her grup kendi içinde.

   Sıfıra yakın yükseltme oranı iki şeyden biridir: yönlendirme iyi, ya da yükseltme
   kapısı fazla dar. Hangisi olduğunu ayırmak için 2. maddedeki çapraz atama gerekir —
   ikisi birbirini tamamlıyor.

### 5 · Kaçırdığımız

Sırayla, en çok güvendiğimden en az güvendiğime:

**a) T0 sekreterliği kendi kuralıyla çelişiyor.** Protokol T0'a "iki farklı sözcükle
yazılmış iddia aynı şeyi mi söylüyor, buna karar verme" diyor; ama aynı anda "çelişiyor
mu, buna karar ver" diyor. Bunlar aynı muhakeme. Çelişkiyi tespit etmek, eşdeğerliği
tespit etmenin değillemesidir. Yani mekanik sanılan hüküm aslında yorum ve yorum T0'ın
elinde — hem de "T0 içerik üretmez" ilanının arkasında görünmez halde. Ucuz düzeltme:
her üye turunu **madde listesiyle** bitirsin (`madde · pozisyon · geri çekildi mi ·
gerekçe nesnesi`). O zaman T0 düzyazı yorumlamaz, etiket eşler. Bu, tasarımda gördüğüm
en somut kusur.

**b) Konsey kendini, kendi üstünde değerlendiriyor.** Bu koşunun nesnesi bu koşunun
mekaniği. Konseyi kötü yargıç yapan bir kusur, onu bu konuda da kötü yargıç yapar ve
dışarıdan denetim yok. Protokol "bir koşu eğilim gösterir, kanıt değil" diyerek bunu
kısmen kabul ediyor; eklemek istediğim: mekanik en az bir kez **cevabı zaten bilinen**
bir işte denenmeli — bu depoda geçmişte verilmiş ve sonradan doğru/yanlış çıktığı
belli olan bir karar. Aksi halde teraziyi kendi ağırlığıyla kalibre ediyoruz.

**c) Üyeler kod çalıştıramaz, ama sorular kısmen ampirik.** Protokolün kendi sınırı
bu: konsey muhakeme boşluğunu yakalar, bilgi boşluğunu yakalamaz. Bu koşuda sorulanların
bir kısmı (hangi karıştırıcı baskın, maliyet ne kadar) ölçüm sorusu. Konsey ölçüm
sorusuna muhakemeyle cevap verirse **kendinden emin, iyi gerekçelendirilmiş ve yanlış**
metin üretir; üstelik "sınanabilir iddia" biçimi bunları *sınanmış* gibi gösterir.
Gerçekten olacağına bahse gireceğim bozulma budur — ve bu metin de dahil.

**d) Durak koşulu yanlış nedenle tetiklenebilir.** "Bu tur geri çekme ve yeni kusur
üretmedi" cümlesi yorgunluk, kötü sorulmuş soru ve gerçek uzlaşı için aynı biçimde
doğrudur. Ucuz düzeltme: kapanış turunda her açık madde için üyeden açık bir
"bu maddede açık kalan yok" cümlesi istensin; yokluktan çıkarım yapılmasın.

**e) Tavan 4 kuyruk değil mod haline gelebilir.** Maliyet modeli "çoğu iş 2'de biter"
varsayımına dayanıyor. Anonimlik deferansı kestiği için (soru 1'deki inatçılık riski)
dağılım 4'e kayabilir ve konseyin maliyeti sessizce iki katına çıkar. Sessizce, çünkü
şu an bunu gösterecek bir alan yok — soru 4'teki `tur_sayisi` alanının asıl gerekçesi bu.

**f) Yazma yarışı ile anonimlik çakışıyor.** Protokol yarışı üye+tur başına ayrı dosyayla
çözüyor ve örneği `tur1-opus.md`. Bu ad **kimliği sızdırır**, yeni tasarımla doğrudan
çelişir. `tur1-b.md` olmalı. Küçük ama canlı bir çelişki; protokol revize edilirken
düzeltilmezse ilk kullanımda anonimlik dosya adından düşer.

**g)** `masa.md` üzerinde gerçek kilit yok; `yazıyor`/`yazıldı` tavsiye niteliğinde.
Tam dosya yazan iki ajan çakışırsa veri kaybolur — bu koşuda çakışmadı ama bu şans,
tasarım değil.
