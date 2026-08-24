# Tur 3 — Üye A · adım 1 (bağımsız)

## 1 · Onay

**Şartlı onay.** Tasarımın çekirdeği doğru: iki bağımsız örnek korunuyor, çapa yalnız
bir tarafa kuruluyor, uzatma kararı kanıta en yakın noktaya iniyor. İki şart, ikisi de
somut nesneli:

- **Tavan geri gelsin.** "Tavan yok" sınırsız maliyeti yeniden açıyor ve bu kez uzatma
  kararı çapalanmış tarafta — en kötü bileşim. Tavan 4 arka-durdurucu olarak dursun;
  ucuz, bağlamıyorsa bedava (tur 2'deki kendi tespitimiz).
- **Uzatma kararı nesne şartına bağlansın.** İkinci üye uzatıyorsa geri çekme
  tiplemesindeki **bulgu** standardında bir nesne adlandırmak zorunda olsun; nesnesiz
  uzatma yok. Nesnesiz kapanış da "yakınsadı" olarak loglanır. Bu olmadan karar,
  denetlenemez yorum olarak bir üyeye devredilmiş olur — tur 2'de T0'dan almak için
  uğraştığımız şeyin aynısı.

## 2 · Asimetri

Yakınsama sorununun **yarısını gerçekten çözüyor.** Eski simetride tur 2'den sonra iki
bağımsız örnek yoktu, birbirine yaklaşmış tek konum vardı. Yeni tasarımda birinci
üyenin metni kalıcı olarak bağımsız: masada her zaman en az bir temiz örnek duruyor.
Bu, simetrik revizyondan ölçülebilir biçimde iyi.

Açtığı yeni sorun rol bileşimi: ikinci üye hem **okuyan** (çapalanan) hem **karar
veren** (uzatan) taraf. Çapalanmış tarafa hakem yetkisi veriliyor. Bu, kararın kendisini
1. maddedeki nesne şartıyla denetlenebilir kılmadan kabul edilmemeli. İkinci sorun:
çapraz denetim tek yönlü — aşağıda madde 4.

## 3 · Uzatma kararı ikinci üyede

Tarafsız karar veremez; soru hangi yöne sapacağı. Beklentim **erken kapatma** baskın:
karşı metni okuduktan sonra makul görünen pozisyona katılıp "gerek yok" demek, ihtilafı
sürdürmekten hem üslup hem maliyet olarak ucuz — tur 2'de "yakınsama basıncı" diye
adlandırdığımız mekanizmanın ta kendisi. Ters yönde bir basınç da var: "kimseye
üstünlük tanınmamıştır" telkini nesnesiz direnmeyle fazla uzatma üretebilir. Hangisinin
baskın çıkacağından **emin değilim** — bu ampirik bir soru ve tahminle kapatılmamalı.

Ucuz görünürlük ölçüsü, üçü de mevcut log alanlarından türetiliyor:

- **uzatma oranı** — koşuların yüzde kaçı uzatıldı; sıfıra yakınsa erken kapatma
  şüphesi, sürekli uzatmaysa sahte ihtilaf şüphesi.
- **uzatma gerekçesinin tipi** — nesneli / nesnesiz (madde 1'deki şartla zaten
  yazılıyor olacak).
- **uzatılan koşularda bulgu çıktı mı** — uzatma bulgu üretmiyorsa karar mekanizması
  gürültü üretiyor demektir.

## 4 · Birinci üye cevap alamıyor

Asıl kayıp yanlış adlandırılmış. Üyenin "cevap alması" kayıp değil: oturum kapanınca
üye kalıcı bir şey öğrenmiyor, geri bildirim üyeyi geliştirmez. Kabul edilebilir bedel.

Gerçek kayıp şu: **çapraz denetim tek yönlü kaldı.** Simetrik tasarımda birinci üye,
karşı metindeki hatayı görüp itiraz edebilirdi. Şimdi ikinci üye tek denetçi — birinci
üyenin metnindeki bir yanlışı o kaçırırsa, yanlış hiç sorgulanmadan karara girer;
ikinci üyenin metnindeki yanlışı ise **hiç kimse** okumuyor, doğrudan yöneticiye
gidiyor. İkinci üyenin metni bu tasarımda denetimsiz. Bu adlandırılmalı ve bilinçli
kabul edilmeli; azaltmak istenirse ucuz seçenek, yöneticinin iki metni yan yana
okuduğu mevcut alışkanlığın kural olarak yazılması.

## 5 · Medium efor

**Emin değilim** — ve bu soru tam olarak protokolün kendi uyarısındaki tuzak: kendi
eforumun çıktıya etkisini içeriden gözleyemem; muhakemeyle cevaplarsam kendinden emin
ve muhtemelen yanlış bir metin üretirim.

Tahmin yerine sınama öneriyorum: kalibrasyon adayı hazır ve cevabı bağımsız biliniyor
(autocompact zinciri, yöneticinin doğruladığı bilgi). Aynı iş bir kez medium, bir kez
yüksek eforla koşulsun; kusuru hangisinin yakaladığına bakılsın. Soru ampirik, cevabı
da ampirik olsun — maliyeti bir kalibrasyon koşusu zaten planlandığı için sıfıra yakın.

## 6 · Konsey lite ile ilişkisi

Aynı aile, birebir aynı değil. İki fark:

- **Kapı kimde:** yükseltilebilir lite'ta T0'ın mekanik kuralı (çelişki / "emin
  değilim" metinden okunur), yeni tasarımda ikinci üyenin yorumu. Üyenin okuması daha
  derin ama yanlı; T0 kuralı sığ ama tarafsız.
- **Kapı neyi okur:** T0 iki metni karşılaştırır; ikinci üye karşı metni kendi
  pozisyonuna karşı okur.

Buna rağmen **tek mekaniğe inmeli.** "Lite" ayrı kavram olarak ölsün: lite,
uzatılmamış koşunun adıdır, ayrı bir tür değil. Ama birleşme sırasında lite'ın iki
valfi yeni mekaniğe devredilsin, yoksa kaybolurlar: (a) karşı metinde taşıyıcı maddede
"emin değilim" varsa uzatma zorunlu — ikinci üyenin takdirine bırakılmaz; (b) kategori
sert zemini aynen kalır: şema değişikliği, veri silme, dış API sözleşmesi tek-turlu
koşuya hiç yönlenmez. `docs/stats/` tarafında `yukseltildi_mi` alanı `uzatildi_mi`
olur, kayıt tek şemaya iner.

---

# Açık maddeler — yalnız yeni mekaniğin değiştirdikleri

**M1.** Değişiyor: valfin sahibi artık T0 değil ikinci üye. "Emin değilim" tetikleyicisi
üye takdirinden çıkarılıp kurala bağlanmalı (yukarıda 6a). Kategori sert zemini
etkilenmiyor, aynen kalır — yönlendirme kararı hâlâ iş öncesi veriliyor.

**M2.** İyileşiyor: uzatma kararı üyede olsa da üyeler dönüşü yöneticiye düşecek
biçimde başlatıldığı sürece kilitlenme çözümü aynen çalışır; yeni mekanik ek delik
açmıyor. "Asılı kalan üye" deliği duruyor, yeni tasarım onu da kapatmıyor.

**M4.** Yeni mekanikte bu kural yük taşıyıcı oldu: ikinci üyenin uzatma kararı tam bu
ayrımla denetlenecek. İki yazım bence uyumlu ve tek kurala iner: *yakınsama maddeyi
kapatır (düşük güven işaretiyle), kapanış nedeni "durak/yakınsama" olarak loglanır,
fayda sayacına girmez, rapor "yakınsadı" der, "doğrulandı" demez.* Karşı üyenin metrik
yanlılığı eki ("sayaç yakınsamayı sayarsa konsey iyi görünecek yönde yanlı") benim
yazımımda yoktu, alıyorum — nesnesi somut: fayda sayacının payı.

**M5.** Ağırlaşıyor: ikinci üyenin uzatma gerekçesi yapısal olarak bir itirazdır.
İtiraz tiplendirmesi artık yalnız sapma dedektörü değil, uzatma kararının denetim
mekanizması — madde 1'deki nesne şartıyla aynı şey. İki öneri tek kurala birleşti.

(M3 ve M6'yı yeni mekanik değiştirmiyor — atlandı.)

---

## Madde listesi

| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
|---|---|---|---|---|
| 1 onay | şartlı evet: tavan 4 arka-durdurucu + uzatmada nesne şartı | — | — | tavansız + çapalanmış karar verici bileşimi; denetlenemez yorum devri |
| 2 asimetri | yarım çözüm: temiz örnek kalıcı, ama çapalanan tarafa hakemlik veriliyor | — | — | rol bileşimi: okuyan = karar veren |
| 3 uzatma kararı | tarafsız olamaz; beklenti erken kapatma, emin değilim | — | — | ölçü: uzatma oranı + gerekçe tipi + uzatmada bulgu çıktı mı |
| 4 birinci üye | feedback kaybı kabul; asıl kayıp tek yönlü denetim | — | — | ikinci üyenin metni denetimsiz yöneticiye gidiyor |
| 5 medium efor | emin değilim — tahmin etmem | — | — | sınama: kalibrasyon koşusu medium+yüksek çift koşulsun |
| 6 lite ilişkisi | tek mekaniğe insin; iki valf devrolsun | kısmen | yakınsama | ayrı "lite" kavramını savunmuyorum; valfler (emin-değilim zorunlu uzatma, kategori zemini) şart |
| M1 | valf sahibi değişti; tetikleyici kurala bağlansın | hayır | — | üye takdiri ≠ mekanik kapı |
| M2 | yeni mekanik delik açmıyor; asılı-üye deliği duruyor | hayır | — | — |
| M4 | iki yazım tek kurala iner; metrik eki alındı | kısmen | bulgu | fayda sayacının yakınsama sayması → yanlı metrik |
| M5 | itiraz tiplemesi uzatma denetimiyle birleşti | hayır | — | uzatma gerekçesi = itiraz |

---

# Tur 3 · adım 2 — karşı metin okundu, uzatma kararı

## Karar: **UZAT** — dar kapsam, iki madde

Kendi koyduğum şarta uyuyorum: iki gerekçe de nesne taşıyor. Kararı verirken kendi
tahminimin farkındayım — adım 1'de "erken kapatma baskın çıkar" yazdım; bu kararın
kendisi o sapmaya karşı da denetlenmeli, o yüzden iki tetiği de mekanik kuraldan
türetiyorum, histen değil.

### Uzatma maddesi T1 — tavan çelişkisi

**Nesne:** iki bağımsız metin taşıyıcı bir onay şartında çelişiyor. Ben tavan 4'ü
arka-durdurucu olarak **şart** koştum (tavansız + çapalanmış karar verici = en kötü
bileşim); karşı üye tavansızlığı olduğu gibi **onayladı** ("tur tavanı yine yok —
kullanıcının istediği hiçbir şey feda edilmiyor"). Karşı üye benim argümanımı görmeden
yazdı; kendi 3b maddesi ("gayret uzatması — daha zayıf sanıyorum ama emin değilim")
fazla-uzatma riskinin sıfır olmadığını kendisi de söylüyor, ama tasarımda o riskin
durdurucusu yok. Karşı üyenin kendi ölçüsü de bunu emrediyor: "çelişkiye rağmen
kapatma" sayılabilir bir çapa olayı — çelişki ortada dururken kapatırsam o sayacın
ilk olayı ben olurum.

**Tur 4'te beklenen:** karşı üye argümanı görüp cevaplasın — tavan 4 arka-durdurucu
neden feda edilsin ya da edilmesin. Tek madde, tek cevap.

### Uzatma maddesi T2 — ezici tetik ateşlendi, kapanış yolu onaylanmalı

**Nesne:** karşı üye taşıyıcı bir maddede (5 · medium efor — onaylanan değişikliğin
parçası) **"emin değilim"** yazdı. İkimizin uzlaştığı ve karşı üyenin bu tur "ezici"
düzeyine çıkardığı kural açık: birinci üye taşıyıcı maddede "emin değilim" yazdıysa
ikinci üye kapatamaz. Kural bu koşuda ateşlendi; görmezden gelerek kapatırsam
üzerinde uzlaştığımız valfi ilk kullanımında ben iptal etmiş olurum.

**Ama tur 4'te bu madde tartışılmasın** — soru ampirik, masada çözülmez (protokolün
kendi sınırı). Önerdiğim işlem: maddenin kapanışı deneye **devredilir** — kalibrasyon
vakası (autocompact zinciri, cevabı `docs/OLCUM-PENCERE.md`'de bağımsız biliniyor)
bir medium bir yüksek eforla çift koşulur; ikimiz bunu bağımsız olarak zaten önerdik.
Karşı üyeden istenen yalnız devir formülünün onayı: *"madde 5 masada değil, çift
koşunun sonucuyla kapanır."*

## Kapanan her şey — tasarruf satırları

Karşı üyenin "hüküm kayda gitsin" kuralını uyguluyorum; taşıyıcı madde başına tek satır:

| karşı üyenin maddesi | tasarrufum |
|---|---|
| 0 · birebir/özet ayrışması | kapanmış — yönetici düzeltti, ben düzeltilmiş metinle yazdım |
| 1 · şart 1 (ikinci üye önce kendi metnini yazar) | **kabul** — üzerimde zaten uygulandı, bağımsız metnim adım 1'de duruyor |
| 1 · şart 2 (kapatma nesne taşır, veto listesi ezer) | **kabul** — kendi 1(b) şartımla aynı; bu karar o şarta uyarak yazıldı |
| 2 · çapa karar veren tarafta | **kabul** — kendi madde 2'mle örtüşüyor; şart 1 çapayı ölçülebilir kılar, kaldırmaz |
| 3 · erken kapatma, üç yapısal sebep | **kabul** — benim tek gerekçeme iki yapısal sebep ekliyor (maliyet-arz, düşük enerjili varsayılan); nesneli katkı |
| 3c · üç ölçü | **kabul** — "çelişkiye rağmen kapatma" sayacı bende yoktu, alıyorum; bu kararda ilk kez işletildi |
| 4 · tasarruf satırı kayda | **kabul** — bu tablo onun uygulaması; "uzatmadım/okumadım" ayrımı nesneli |
| 4b · stats'a `mekanik` alanı | **kabul** — bende yoktu; geri çekme metriğinin mekanik farkını kalite farkı sanma tuzağı somut, alan bugün girmezse geçmiş satırlar kalıcı yorumlanamaz |
| 5b · düğme etkileşimi (yük artarken efor düşüyor) | **kabul** — bende yoktu; iki ayrı kararın aynı sapma yönüne itmesi nesneli |
| 6 · lite tek mekaniğe | **kabul** — bağımsız aynı sonuca vardık, "yönlendirme listesi kalır" formülü benim kategori-zemini şartımla aynı |
| M1 · tetik ezici + kategori zorunlu uzatma | **kabul** — bağımsız aynı iki valfi yazdık; T2 bu kuralın ilk uygulaması |
| M2 · çöküş yarısı kapandı | **kabul** — "gösterildi, öne sürülmedi" doğru; asılı-üye deliği ortak açık |
| M3 · birebir kaynak özetin yanında dursun | **kabul** — madde 0 bunu kanıtladı |
| M4 · kapsayan/kapsanan, gerekçesiz kapatmanın varsayılanı `yakınsama` | **kabul** — ayrışma yok, tek kural |
| M5 · uzat/kapat × nesne var/yok | **kabul** — benim simetri talebimin daha temiz hali |
| M6 · koltuk bazlı `masa_kompozisyonu` | **kabul** — bende yoktu; koltuk etkisi/model etkisi karışması nesneli |

## Geri çekme

Bu adımda kendi metnimden geri çektiğim madde yok; iki metin tavan dışında örtüşüyor
ve örtüşme çapraz okuma öncesi doğdu — çapa ürünü değil, bağımsız yakınsama.
Karşı üyeden aldığım beş yeni nesne (3c-çelişki sayacı, 4-tasarruf satırı, 4b-mekanik
alanı, 5b-etkileşim, M6-koltuk) pozisyon değişikliği değil ekleme; tipi **bulgu**,
sahibi karşı üye.

## Yöneticiye

Tur 4 kapsamı: **yalnız T1 ve T2.** T1 karşı üyenin tek cevabıyla, T2 tek onay/red ile
kapanabilir — bir mesajlık tur. Diğer her şey bu dosyayla kapandı.
