# Konsey protokolü — dosya tabanlı masa

İki üye ve kullanıcı uzlaştı. T0 ilan etti, içerik üretmedi.
Kaynak: `masa.md` turu 1-3, karşılıklı revizyonlar.

## Ne zaman açılır — varsayılan değil

**Her planda açılmaz.** Eşik relay'in kendi boyutlamasına bağlanır: konsey, işin
**büyük ve geri dönüşü pahalı** diliminde kendiliğinden devreye girer. Yeni bir kural
eklenmez, mevcut mekanizma kullanılır.

Opus kendi dört maddelik kapısını bırakıp bu formülü aldı: *"Mevcut mekanizmaya
bağlanıyor, yeni kural eklemiyor."*

İçerik olarak o dilim şunları kapsar: plan üç dosyadan fazlasına dokunuyor · karar geri
alması pahalı (şema, dış API, dosya biçimi, bağımlılık) · sonucu yargılayacak otomatik
test yok · T0'ın elinde iki makul plan var ve seçecek dayanağı yok.

**Nerede açılmaz:** testi olan, tek dosyalık, geri alınabilir iş. Orada hatayı bulmanın
en ucuz yolu konsey değil çalıştırmaktır — konsey pahalı kaynağı (süre) ucuz kaynağı
kurtarmak için harcar.

## Tur yapısı — taban 2, tavan 3

| | |
|---|---|
| **Taban** | 2 tur — bir bağımsız, bir revizyon. Değerin çıktığı asgari yapı. |
| **Tavan** | 3 tur. |
| **Durak koşulu** | Bir tur geri çekme ya da yeni kusur üretmediyse konsey yakınsamıştır, kapanır. |
| **Nihai yetki** | **Turu 3'ün sonunda.** Açık madde kalırsa T0 yeni tur açmaz, o maddede nihai yetkiyi ilan eder. |

Tavan neden 3 — opus kendi 5 önerisini geri çekti ve gerekçesi mekanikti:

> *"Uzatma turları bağımsız değildir. Tur 1 değerliydi çünkü ikimiz birbirimizi okumadan
> yazdık. Tur 3'te iki metin de karşılıklı okunmuş durumda; artık iki bağımsız örnek yok,
> birbirine yaklaşmış tek bir konum var. Turların kusur bulma gücü doğrusal azalmıyor,
> **ikinci turdan sonra bağımsızlık bittiği için düşüyor.**"*

Ve kendi tuzağını gördü:

> *"Tur 4'te üretilen geri çekme gerçek bir kusur bulgusu değil, yakınsamanın kendisi
> olabilir. İki üye birbirine kayarken üretilen geri çekmeyi bulgu sanmak, konseye sahte
> güven yükler."*

**Tavan ile durak koşulu aynı işi görmez:** tavan en kötü durumu sınırlar, durak koşulu
tipik durumu kısaltır. Çoğu iş 2'de biter.

## Süre maliyeti — tur sayısına bağlı, üye sayısına değil

Turu 1'de iki üye de 17:05'te yazdı. O aşama paraleldi ve neredeyse bedavaydı; süre
yalnız revizyon zincirinde aktı.

**Kural: bağımsız turlar her zaman paralel açılır.** T0 üyeleri sırayla çağırırsa maliyet
iki katına çıkar ve karşılığında hiçbir şey alınmaz.

## Faydanın kaynağı — üye sayısı değil, bağımsız yazım

> *"Konsey kimseyi akıllandırmaz, bir iddiayı hasımlı okumaya sokar."*

**T0'ın yükümlülüğü:** turu 1'de üyelere ötekinin metnini göstermemek. Bu bir üye
disiplini değil, T0'ın sırası. İkinci üye birincinin metnini görerek yazarsa çapa
etkisiyle aynı açığı onaylar.

**Sınırı:** konsey *muhakeme boşluğunu* yakalar, *bilgi boşluğunu* yakalamaz. İki üye
aynı soydan geldiği için önyargıları ortak — ikisinin birden yanıldığı varsayım konseyden
sağ çıkar ve **iki kez onaylanmış görünür.** Konsey koda bakmanın yerine geçmez.

## T0 sekreterdir

Uzlaşı hükmü **mekanik**, yorum değil. Bir madde şu iki durumda uzlaşmıştır:

1. İddialar birbiriyle çelişmiyorsa
2. Bir üye **açıkça geri çekmişse**

T0 farklı sözcüklerle yazılmış iki iddianın aynı şeyi söyleyip söylemediğine karar
vermez. Kelimeler ayrı ve geri çekme yoksa madde uzlaşmamıştır, sonraki tura gider.

Nihai yetki ilan edilirken de: *"İlan edilen şey T0'ın hükmü değil, önceden belirlenmiş
üyenin son masadaki konumudur."*

## Yönetici yetkisi — kullanıcı kararı, üyeler kabul etti

Zaman aşımı tanımlanmıyor. Yerine:

- T0 tarafları **sorgulayabilir** — "neyi bekliyorsun".
- T0 sürecin **buga girdiğini tespit edip iptal edebilir.**

Şart: iptal **süreç düzeyinde** kalır ve gerekçesiyle log'a yazılır. *"İptal, işin
kullanıcıya dönmesidir"* — T0 kendi cevabını üyelerin yerine koymaz.

Kullanıcının gerekçesi: *"Milyonda bir olasılık için projemi değiştirmem."* Log tutarlılık
denetimi de aynı sebeple yazılmadı.

## Dosya düzeni

| Dosya | Kim okur |
|---|---|
| `<üye>.md` | yalnız o üye — görev ve kişisel not |
| `masa.md` | iki üye — yalnız üye ve kullanıcı metni |
| `log.md` | iki üye + T0 |

Kirlenme **yapısal olarak** engellenir, kuralla değil: masaya yalnız pozisyon girer,
T0 yönlendirmesi özel brifinglerde durur.

**Yazma yarışı — iki katman.** Log'a `yazıyor`/`yazıldı` ilanı görünür kılar; üye ve tur
başına ayrı dosya (`tur1-opus.md`) yapısal olarak bitirir. Sebep: masa tam-dosya yazıldığı
için başlık disiplini yarışı görmez.

**Üye adı log'da görünür.** Opus kendi gizleme önerisini geri çekti: *"Log koordinasyon
dosyası, kim yazdı olmadan senkron kurulamaz. Anonimliğin bedeli mekaniğin çalışmaması."*

**Soru listesi ortak, ton kişisel.** Aynı soru farklı sözcüklerle sorulursa cevaplar
hizasız gelir.

**Satır sınırı yok** — kullanıcı kararı.

**İkiden çok üye** şimdilik gerekmiyor. Ölçeklenmez değil, gerek yok.

## Bu koşunun ölçüsü

Üç tur, iki üye, bir kullanıcı. **Dört karşılıklı geri çekme:**

| Kim | Neyi geri çekti |
|---|---|
| opus | Üye adının gizlenmesi |
| fable | Yazma yarışı için "çözüm ucuz" hükmü |
| opus | Tavan 5 → 2+1 |
| fable | Tavan 3'ken tie-break'in turu 4'te kalması |

**Tek yönlü yakınsama olmadı.** Opus'un uyardığı "doğrulama tiyatrosu" bu koşuda
gerçekleşmedi.

Yine de: mekanik tek koşuda değerlendirildi. Bir koşu eğilim gösterir, kanıt değil.
