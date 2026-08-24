# Konsey protokolü

Tek bir konsey vardır. `lite`, `hard`, `eski`, `yeni` diye bir ayrım yoktur — uzatılmamış
koşu da konseydir.

Üyeler **adlarıyla** anılır. Koşu 3'te iki üye de anonimliğin kaldırılması yönünde oy
verdi ve mekanik kendi üzerinde koşuldu.

Koşu metinleri: `docs/konsey/arsiv/`.

## Akış

1. **İki üye de bağımsız yazar.** Aynı soru, aynı anda, birbirini görmeden. Paralel
   açılır — süre tur sayısına bağlıdır, üye sayısına değil.
2. **Birinci üyenin metni ikinciye verilir.** Ters yön yoktur.
3. **Uzatma kararı ikinci üye ile yöneticinindir.**
4. **Oturumlar kapatılmaz.** Üye yeniden çağrılmaz, sürdürülür — brifing tekrarlanmaz,
   bağlam durur.
5. Tavan 4, arka-durdurucu olarak. Efor **medium**.

## Ayrışma kuralı

İki karar verici ayrı düşerse:

| Durum | Sonuç |
|---|---|
| Biri uzat, öteki kapat | **Uzatma geçerlidir** |
| Uzatma nesnesizse | Uzatma sayılmaz, kapatma geçerlidir |
| İkisi de uzatıyorsa | Kapsamlar **birleşir** — kesişim almak sessiz bir kapatmadır |

Gerekçe defterde yazılı: *"ters yön önerilmez, hata maliyeti sınırsız olan o yöndür."*
Gereksiz tur sonlu ve ölçülüdür (tavan 4 ile üstten bağlı), erken kapanış sınırsızdır.
Nesne şartı, "uzat kazanır" kuralının lastik damgaya dönmesini engelleyen tek frendir.

Karar `uzatma_karari` alanına yazılır: `ortak-uzat` · `ortak-kapat` · `ayrisma-uzat`.
**`ayrisma-uzat` hiç görünmüyorsa yöneticinin katılımı biçimseldir** — alan bunun
dedektörüdür.

**İki çapa zıt yönlüdür, yönetici tarafsız değildir.** İkinci üye karşı metni okumuş
olmanın çapasını ve uzatmanın maliyetini taşır; ikisi de kapatma yönüne iter. Yönetici
soruyu yazan taraftır, koşunun değerli görünmesi işine gelir; bu uzatma yönüne iter.
İyileşme çapasızlıktan değil **zıtlıktan** gelir. "Yönetici tarafsız" denirse yöneticinin
kendi sapması fiyatlanmadan kalır.

## Zorunlu valfler

Üyenin takdirine bırakılmaz.

| Valf | Ne zaman | Sonuç |
|---|---|---|
| **Emin değilim** | Birinci üye taşıyıcı bir maddede "emin değilim" yazdıysa | İkinci üye o maddede kapatamaz |
| **Kategori** | Şema değişikliği · veri silme · dış API sözleşmesi · dosya biçimi · migration | Tek turda kapanmaz |

Kategori valfinin gerekçesi: kapı yalnız tur 1 metinlerini okur. İki üyenin kör noktası
korelasyonluysa **ne çelişki ne "emin değilim"** doğar; masa sahte güvenle kapanır.

### "Emin değilim" iki biçimde yazılır

**Çözücü gözlem adlandırılmışsa** valf tetiklenir ve tahliyesi **tartışma değil deneye
devirdir**. Madde `kapandı` değil **`devredildi`** işaretlenir, sonucun ineceği yer
adlandırılır — *"sahipsiz devir, maddelerin sessizce öldüğü yerdir."*

**Adlandırılamamışsa** valf tetiklenmez ama **`gozlemsiz_belirsizlik`** olarak loglanır.
Sert kural (gözlem yoksa valf yok) reddedildi, çünkü iki kaçağın tespit edilebilirliği eşit
değil:

> *"Sahte gözlem uydurma görünür — metne yazılır, sonraki koşuda yapılmadığı ortaya çıkar,
> tespit gecikmeli de olsa bedavadır. Vazgeçilmiş 'emin değilim' hiçbir iz bırakmaz;
> kesinlik gibi okunan bir cümle olarak geçer ve valf hiç tetiklenmediği için kimse
> eksikliği aramaz."*

Ayrıca "emin değilim" **erken kapatmaya karşı çalışan tek valftir**; onu daraltmak yukarıdaki
ayrışma kuralıyla ters düşer.

**Alan tek başına yetmez.** `gozlemsiz_belirsizlik` maddesi kapanışta zorunlu iki yoldan
birine çıkar: gözlemi yönetici adlandırır ve madde `devredildi`ye geçer, **ya da** madde
açık kalır ve koşu `kapanis_nedeni = uzlasi` ile kapanamaz. Aksi halde "loglandı" ile
"kesinliğe döndü" arasında fark kalmaz.

## Tavan 4 — arka-durdurucu

Tavan bir **durak koşulu değildir**: nesne taşıyan uzatmayı susturmaz, yalnız beşinci turun
açılışını yöneticiye devreder. Bağladığında kapanış nedeni `tavan` yazılır.

Bağlaması **kendi başına sinyaldir**. `kapanis_nedeni = tavan` seyrek olmalı; ayrışma
kuralı yöneticiye tavana kadar tek yönlü cırcır verdiği için tavan artık **o cırcırın**
ölçüm aletidir.

## Geri çekme ve itiraz tiplemesi

| Tip | Ne zaman | İşlem |
|---|---|---|
| **bulgu** | Daha önce hesaba katılmamış **somut nesne** adlandırıyor — bir vaka, bir maliyet, bir bozulma senaryosu | Fayda sayacına girer |
| **yakınsama** | "İkna oldum", "haklı sayılır" — nesne yok | Maddeyi **çözüm** olarak kapatır (düşük güven), **üretim** sayılmaz, fayda sayacına girmez |

İşletim ölçütü: bir nesnenin "önceden hesaba katılmamış" olduğu, **aynı üyenin önceki
turlardaki metninde geçip geçmediğine** bakılarak denetlenir. "Sınanabilir yeni gerekçe"
ölçütü masada sınanamaz — üyeler kod çalıştıramaz, beyan olarak kalır.

**Karşı üyenin modeli gerekçe nesnesi sayılmaz.** Kimlik açık olduğu için *"bu opus'un
alışıldık aşırı yapılandırması"* gibi bir gerekçe mümkün — nesne gibi görünen nesnesiz
gerekçedir. Model adına atıfla kapanan ya da geri çekilen madde `bulgu` değil `yakinsama`
loglanır.

Bu **mekaniğin en zayıf halkasıdır**: bir mekanik değil disiplin bağımlılığı, çünkü yalnız
yönetici gerekçeyi log'a aynen yazarsa görünür.

Üyeler turu şu listeyle bitirir:

```
| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
```

Kapatılan her madde için **tasarruf satırı** yazılır — "uzatmadım" ile "okumadım" ayırt
edilemezse mekanik denetlenemez.

## Kimlik açıktır

Anonimlik kaldırıldı. Koşu 2'nin kendi kapanışı gerekçeyi boşalttı: `docs/stats/konsey.md`
dosyasına `masa_kompozisyonu A = fable, B = opus` yazıldı — **anonim arşiv ile anahtarı
aynı repoda yan yana.** Anonimlik kimseden bir şey gizlemedi, yalnız kimliği bir koşu
geciktirdi; bedeli aynı koltuk için iki ayrı sözlük oldu.

Kestiği tek şey deferansın **adresiydi**, deferansın kendisi değil. Ve tam da kesmezdi:
üye kendi ne olduğunu bildiği için anonimlik statü etkisini kaldırmıyor, **hedefli
deferansı öz-değerlendirmeye endeksli bir sapmaya çeviriyordu.** Takas: bilinen bir sapma,
ölçülebilir bir sapmaya dönüştü — hedefli deferans kapanış gerekçesinde ada dönüşür ve
görünür.

**`masa_kompozisyonu` kalır**, gerekçesi gizlilik değil: hangi model **hangi koltukta**.
Koşu 2'de fable birinci opus ikinci koltuktaydı, koşu 3'te takas edildi; alan olmazsa
"ikinci koltuk erken kapatıyor" bulgusunun koltuk özelliği mi model özelliği mi olduğu bir
daha ayrılamaz.

**İskonto ikiye bölünür.** Üyenin iskontosu kayda geçmez, denetlenemez — zorunlu kılınmaz,
yasaklanması da anlamsız. Kayda geçen iskonto yöneticinindir.

## Koşullu kurallar

Bunlar **şimdi** yazılıdır; tetiklenmeleri protokol değişikliği sayılmaz ve dondurma
onları kilitlemez.

**Dondurma sınırı:** koşullu kural ancak **tetikleyicisi ve sonucu birlikte, önceden,
metinde yazılıysa** dondurma dışıdır. *"Şu olursa bakarız"* biçiminde yazılmış madde
koşullu kural değildir — **ertelenmiş serbest karardır** ve dondurmaya tabidir.

| Kural | Tetikleyici | Sonuç |
|---|---|---|
| **Cırcır emniyeti** | `kapanis_nedeni = tavan`, iki koşu üst üste | Ayrışma kuralı *"kapat kazanır + uzatan tarafa tek turluk uzatma hakkı"*na çekilir |
| **Okuma sırası dönüşümü** | Geri çekmeler üç koşu üst üste tek yönlü (payda `tasiyici_madde_sayisi`, ham sayı değil) | Koltuk sırası dönüşümlü yapılır |
| **Geç tur dedektörü** | Tur 3+ nesnesiz kapanış/uzatma oranı, aynı koşunun tur 1-2 oranının **iki katını** aşarsa. Tur 1-2 oranı sıfırsa taban: tur 3+ oranı **1/3**'ü aşarsa | Sürdürülen oturumda bağlam şişmesi kabul edilir; koşu bölünür |

Okuma sırası dönüşümü gereklidir çünkü model-klişesi kuralı **tekil vakayı** yakalar,
birikimli yönlü deferansa düzeltici eylem önermez. İkisi ikame değil tamamlayıcıdır — kural
tekil vakayı, sayaç birikimi.

Geç tur eşiği **"emin değilim" damgalıdır**: savunulan şey sayının doğruluğu değil, bir
sayı yazılması gerektiğidir. Yanlışsa sonraki koşuda görülür ve düzeltmesi kuralın kendi
tetiklenme kaydından gelir.

## Yöneticinin işi

Yönetici **içerik üretmez**, ama sekreter de değildir.

**Kanonik madde listesini yönetici yayımlar**, üyeler o adların altına yazar. Aksi halde
"iki farklı sözcükle yazılmış iddia aynı şeyi mi söylüyor" hükmü yöneticiye kalır — ve o
hüküm ile "çelişiyor mu" hükmü aynı yetenek sınıfındandır; birini yasaklayıp diğerini
zorunlu kılmak yorumu ilanın arkasına saklar.

**Taşıyıcı bir kuralın tek ifadesi yöneticinin özeti olmasın — birebir kaynak yanında
dursun.** Bu kural iki koşuda iki kez iş gördü: koşu 2'de yöneticinin özeti kullanıcının
metninden saptı (masada bir bağımsız örnek mi var iki mi), koşu 3'te yöneticinin soru
kâğıdı bir alanın **ölü gerekçesini** sordu. İkisini de üye yakaladı, ikisi de yalnız
kaynak yanında durduğu için görüldü. Kopyalanmış hata sessizdir.

**Ortak olan her şey ortak dosyada durur.** Özel brifingde yalnız kimlik ve kişisel not
kalır.

**Üyeler her zaman sonlanması yöneticiye dönecek biçimde başlatılır** — "başlat ve unut"
yasak. Zaman aşımına gerek yoktur: dönüşü beklenen üye çökerse yöneticiye hata olarak
döner, tespit bedava. *"Fark etmeye bağlı bir yetki, bildirim üretmeyen bir sistemde çare
değil ümittir."* Kalan delik: çökmeyen ama **asılı kalan** üye — konseye özgü değil, ajan
katmanının genel sorunu.

**İptal yetkisi** durur: yönetici tarafları sorgulayabilir ve buga giren süreci iptal
edebilir. İptal süreç düzeyinde kalır, gerekçesiyle log'a yazılır.

**Yönetici tek hata noktasıdır.** Brifing hatası iki üyeye özdeş bulaşır, bağımsız yazım
filtrelemez. Ortak dosya kuralı bunu engellemez ama **görünür kılar.**

## Ne zaman açılır — varsayılan değil

Eşik relay'in kendi boyutlamasına bağlanır: konsey işin **büyük ve geri dönüşü pahalı**
diliminde devreye girer. Testi olan, tek dosyalık, geri alınabilir işte açılmaz — orada
hatayı bulmanın en ucuz yolu çalıştırmaktır.

Kategori valfi bir yönlendirme listesidir, ayrı bir mekanik değil.

## Sınırı

Konsey **muhakeme boşluğunu** yakalar, **bilgi boşluğunu** yakalamaz. İki üye aynı soydan
geldiği için önyargıları ortaktır; ikisinin birden yanıldığı varsayım konseyden sağ çıkar
ve **iki kez onaylanmış görünür.** Konsey koda bakmanın yerine geçmez.

Ampirik sorularda konsey *kendinden emin, iyi gerekçelendirilmiş ve yanlış* metin üretir —
üstelik "sınanabilir iddia" biçimi bunları sınanmış gibi gösterir.

**Soy korelasyonu.** Yönetici opus ve üye opus aynı soydandır. Ayrışma kuralı çoğunluk
değil asimetrik eşik olduğu için opus soyunun iki koltukta olması kapatmayı dayatamaz —
ikinci üyenin nesneli uzat oyu tek başına yeter. Kalan artık (ikinci üye kapat / yönetici
uzat ayrışmasında uzatan, kapsayan ve birinci koltuk aynı soy olur) engellenmez, yalnız
`ayrisma-uzat` + `masa_kompozisyonu` birlikte okunarak görünür kalır.

## Mekanik donduruldu

**Kalibrasyon koşusu artı gerçek işte iki koşu loglanmadan bu protokolde değişiklik
yapılmaz.**

Gerekçe: koşu 2 *"ortalamaya girmez, emsal"* damgalıydı; koşu 3'te beş değişken birden
oynadı (efor, anonimlik, koltuk takası, uzatma yetkisinin kişi sayısı, sorunun kendisi) ve
o da aynı damgayı aldı. Yani defter iki satır sonra hâlâ **karşılaştırılabilir sıfır
gözleme** sahip — ve her koşuda mekaniği değiştirdiğimiz sürece bu asla değişmez. Ölçü
toplandığı sanılır, toplanmaz.

**Protokol konulu koşular fayda ortalamasına girmez.** Üç koşunun üçünde de konu konseydi.
Protokol metni az tanımlı bir nesnedir; geri çekme boldur, `kabul_edilen_revizyon` yüksek
çıkar, ama `yeniden_ele_alindi` **yapısal olarak boş kalır** — kimse bir protokol belgesine
dönüp "yanlışmış" demez. Defterin tek gerçek yer ölçüsü bu konu sınıfında ölüdür.

**Kalibrasyon borcu.** Mekanik üç koşuda da kendini kendi üstünde değerlendirdi; dışarıdan
denetim yok. En az bir kez **cevabı zaten bilinen** bir işte koşulmalı. Aday doğrulandı:
autocompact penceresi zinciri (`ac75cea` → `ad4b3f2` → `173fc01` → `2993d70` → `930effe`),
ara commit'in kendi mesajı sebebi yazıyor — *"200k iddiası koddan kalktı, günlük açıkken
hatayı ikinci kez yazmışım"*. Yanlışlık, koşul değişikliği değil. Doğru cevap
`docs/OLCUM-PENCERE.md` replay simülasyonundan bağımsız biliniyor.

**Kalibrasyon koşusu çift eforla yapılır** — bir medium, bir yüksek. İki üye de kendi
eforunun çıktıya etkisini içeriden gözleyemeyeceğini söyleyip "emin değilim" yazdı; bu tek
deney hem efor sorusunu hem kalibrasyon borcunu kapatır.

## Devredilenler

| Madde | Çözücü gözlem | İnecek yer |
|---|---|---|
| Anonimlik kalkışının üye davranışına etkisinin yönü | Aynı soru, aynı koltuklar, kimlik açık/kapalı iki eş koşu | Kalibrasyon koşusuyla birleştirilebilir |
| Yöneticinin karara ortaklığının çapayı ne kadar azalttığı | `uzatma_karari` alanının üç-dört koşuluk dağılımı | `docs/stats/konsey.md` |
| Medium eforun çıktı kalitesine etkisi | Kalibrasyon vakasının çift eforla koşulması | `docs/OLCUM-PENCERE.md` |
