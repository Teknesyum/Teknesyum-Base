# Bench sonucu — Chess960 hamle üreteci

Dört durum tamamlandı, premium iki kez koşuldu — beşinci sütun varyansı gösteriyor. `yalin` başka bir makinede koşuldu (base kurulu değil, aynı
model ve efor); kodu buraya alınıp **bütün ölçümler tek makinede** yapıldı, yani CPU farkı
tabloya girmiyor.

Görev: Chess960 hamle üreteci, TypeScript, dış bağımlılık yok, 45 dakika tavan.
Ana oturum dört koşuda da `opus` + `high` — profil yalnız ajanların modelini değiştirir.

---

## Doğruluk — üçü de geçti

| Konum | Derinlik | Beklenen | yalin | eco | normal | premium |
|---|---:|---:|---|---|---|---|
| startpos | 5 | 4.865.609 | ✓ | ✓ | ✓ | ✓ |
| kiwipete | 5 | 193.690.690 | ✓ | ✓ | ✓ | ✓ |
| pos3 · pos4 · pos5 · pos6 | 4 | yayınlanmış | ✓ | ✓ | ✓ | ✓ |

Chess960 tarafında dört koşu birbirine karşı doğrulandı: dört konum, üç derinlik,
**hiç ayrışma yok**.

**Doğruluk bu bench'i ayırmadı.** Dördü de çalışan bir üreteç çıkardı — base'li üçü de,
base'siz olan da. Bench'in ana skoru olarak koyduğum "en derin doğru perft" hiçbir şey
ayırt etmedi.

---

## Ayrışma — hız, boyut, yöntem

Hız ölçümü beşi için de bu makinede, arka arkaya yapıldı.

| | yalin | eco | normal | premium | premium-2 |
|---|---|---|---|---|---|
| kiwipete d5 | 23,2 sn | 19,8 sn | 20,3 sn | 14,0 sn | **12,2 sn** |
| Kod | **750 / 4** | 786 / 6 | 1008 / 7 | 2825 / 18 | 1411 / 10 |
| Kendi testi | **1268** | — | 47 | — | 73 |
| Ajan | 0 (base yok) | **0 (kendi kararı)** | 4 | sayı kayıp | 5 |
| Token | **~113.000** | ~157.709 | 226.856 | ölçüm eksik | ~350.000 |
| Süre | 37 dk | 27 dk | 28 dk | ~45 dk (kesintili) | 27 dk |
| En derin perft | d8 | d7 | d7 | — | **d8** |

Premium iki turda da en hızlı üreteci yazdı; ikinci tur yalın koşunun **iki katı** hızlı.

**Varyans büyük.** Aynı profil iki kez koştu ve kod boyutu iki katına yakın ayrıştı:
2825 satıra karşı 1411. İkinci tur hem daha küçük hem daha hızlı. Tek koşunun neden kanıt
sayılmadığı burada görünüyor — profil sabitken bile çıktı bu kadar oynuyor.

---

## Profillerin kendi kurallarını uygulaması

Üç koşu da profilinin felsefesine göre davrandı ve gerekçesini yazdı.

**eco hiç ajan açmadı.** Gerekçesi kendi kuralından geliyor: paralel tavanı 1, ve
*"haiku'ya perft doğruluğu gerektiren iş vermek eco felsefesinin 'doğruluk feda edilemez'
maddesine aykırı"*. Yani profil, ucuz modeli doğruluk gerektiren işe sürmek yerine işi
ana oturumda tuttu. Bu, eco'nun tasarlandığı gibi çalıştığının kanıtı.

**normal dört ajan açtı ve ikisi denetçiydi** — profilinde `audit: every-contract` yazdığı
için. Denetim dört bulgu çıkardı, dördü de gerçekti.

**premium en fazla kodu ve en hızlı üreteci çıkardı**, ama koşusu iki kesintiye uğradı.

**yalin hiçbir base mekanizması olmadan koştu** — ajan yok, sözleşme yok, denetçi yok, ölçü
satırı yok. En az token harcayan koşu bu oldu, ki beklenen bir sonuç: base'in kendisi de
token yakıyor.

---

## Bench'in en değerli bulgusu

`normal` koşusunun denetçisi şunu buldu:

> `@types/node` depoda yok, üst klasörden çözülüyordu — **temiz bir klonda `tsc` çökerdi.**

Motorun kendisi doğruydu. Bütün perft testleri geçiyordu. Ama depo başka bir makinede
derlenmezdi.

**Perft testleri bunu asla yakalayamazdı** — doğruluk ölçümü ile denetim farklı şeylere
bakıyor. Bench'in ana skoru (en derin doğru perft) üç profili ayırt etmedi; ayırt eden
şey, bir profilin denetçi açıp açmadığı oldu.

Denetçinin bulduğu diğer üçü de aynı sınıftan: bozuk FEN'in sessizce başka bir konuma
dönüşmesi, test koşucusunun import hatasını yutması, ve adını taşıdığı senaryoyu hiç
kurmayan bir test.

---

## Denetim iki kez perft'in kör noktasını buldu

Bu bench'in en sağlam sonucu bu, çünkü **iki bağımsız koşuda tekrarlandı.**

`premium-2`'nin denetçisi motoru satır satır okudu ve şunu buldu:

> Sahte en passant alanı — FEN'den gelen ep karesi doğrulanmıyordu. Arkasında düşman piyonu
> olmayan bir ep alanı verildiğinde `makeMove` hiçbir şey almıyor ama `unmakeMove` koşulsuz
> piyon yazıyordu; **tahtaya yoktan taş geliyordu.**

Ajanın kendi gerekçesi meselenin özü:

> *"Referans perft bunu yakalamaz, çünkü referans FEN'lerin hepsinde ep alanı tutarlı."*

Aynı denetim iki hata daha buldu: 512 yarım hamleden sonra sessiz `MAX_PLY` taşması, ve
README'nin "test dosyası yok" demesi — oysa dört dosya ve 66 test vardı.

`normal` koşusunda da aynı sınıftan bir bulgu çıkmıştı: `@types/node` eksikliği, temiz
klonda derlenmeyen depo. İkisi de perft yeşilken bulundu.

**Örüntü şu: denetçi açan koşular, doğruluk testinin göremediği kusurları buldu; açmayanlar
bulamadı.** Bir kez olsa tesadüf sayılırdı, iki kez oldu.

---

## Base'in aleyhine çıkan bulgu

Yalın koşu, referans perft sayılarını **web'den çekti** ve kendi hatırladığının yanlış
olduğunu buldu:

> *"Published table fetched — my recall of position 4 was wrong, the real values differ."*

Sonra elli Chess960 konumunu yayınlanmış tabloya karşı doğruladı ve 1268 test yazdı.

Eco koşusu aynı yerde ters yönde davrandı: referansları **modelin kendi bilgisinden** yazdı
ve yalnız koda karşı doğruladı. Tutmayan bir referansı da testten çıkardı — kendi ifadesiyle
*"hatırlanan sayı yanlış olabileceği için"*. Bu savunulabilir bir karar ama doğrulanmamış
bir temele dayanıyor, ve web araması token yakacağı için eco felsefesiyle de uyumlu.

**Yani tasarruf profili, doğrulama titizliğini düşürdü.** Eco'nun kendi kuralı "doğruluktan
feda edilmez" diyor; bu koşuda doğruluk *çıktıda* korundu (perft sayıları doğru), ama
*doğrulama yönteminde* feda edildi. Kural ihlali değil, kuralın kör noktası.

Bench'in en dürüst cümlesi bu: base'li bir profil, base'siz koşudan daha az titiz davrandı.

---

## Ölçümün bilinen sınırları

**Paralel koşu profilleri karıştırdı — ama üretimi bozmadı.** Üç koşu aynı anda
başlatıldı ve `/teknesyum:premium` makine geneline yazıyor; eco penceresi profili değiştirince
premium koşusu bunu gördü.

Etkisi sonradan ölçüldü ve sanılandan küçük çıktı. Ajanların hangi modelle açıldığı
profilin o an ne olduğunu ele veriyor:

- **normal geçerli.** Dört ajanın dördü de sonnet (2 builder `sonnet/medium`, 2 auditor
  `sonnet/high`). Auditor'lar koşunun sonlarına doğru açılıyor; profil ortada eco'ya
  kaysaydı onlar haiku çıkardı. Çıkmadı.
- **premium'un üretimi geçerli.** İşin tamamı ilk oturumda premium profille üretildi;
  profilin eco göründüğü ikinci oturumda hiç ajan açılmadı, yalnız doğrulama koşuldu.

Yine de bu bir tasarım kusuru: paralel koşu önerisi bana ait ve makine geneli anahtarı
hesaba katmıyordu. Bir sonraki turda profiller sıralı koşuluyor.

**Premium'un token ölçümü eksik.** Oturum düştü, ara turların `Total Süre` / `Tahmini
Token` satırları bağlamla birlikte gitti. Bu koşunun token sütunu kullanılamaz — premium
ikinci kez koşuluyor ve karşılaştırma o turla yapılacak.

**Ana oturum eco felsefesine aykırı koştu.** Dört koşuda da `opus` + `high` sabitlendi —
tek değişken kuralı için doğru, ama eco kullanıcısının gerçek deneyimi bu değil. Ölçülen
şey "eco profilinin katkısı", "eco ile çalışmanın maliyeti" değil.

**Tek koşu kanıt değildir.** Üç profil birer kez koştu. Aynı profil iki kez koşsa farklı
sonuç verir; bu tablo eğilim gösterir, kanıt değil.

---

## Base'e değer mi — bu koşunun cevabı

Tek turluk bir ölçüm, ve cevabı tek yönlü değil.

**Base'in lehine:** denetçi açan iki koşu da, perft'in yakalayamayacağı gerçek kusurlar
buldu — biri temiz klonda derlenmeyen depo, öteki tahtaya yoktan taş koyan bir unmake.
İkisi de bütün testler yeşilken bulundu ve bu iki bağımsız koşuda tekrarlandı. Premium iki
turda da en hızlı kodu yazdı, ikincisi yalın koşunun iki katı.

**Base'in aleyhine:** yalın koşu en az token harcadı (~113.000, normal'in yarısı) ve en çok
testi yazdı (1268'e karşı 47). Referans doğrulamasında da en titiz o davrandı.

**Ayırt etmeyen:** doğruluk. Dördü de aynı perft sayılarını üretti.

**Ölçülemeyen:** varyans. Premium iki turda 2825 ve 1411 satır yazdı — aynı profil, aynı
görev, iki kat fark. Tek turluk her satır bu kadar oynayabilir.

Dürüst özet: base bu görevde **hız ve denetim** kattı, **token ve test yoğunluğu** açısından
maliyet getirdi. Görev tek başına bir modelin bitirebileceği boyuttaydı — 750 satırlık bir
üreteç için dört ajan açmak, sözleşme yazmak ve denetim turu koşmak kendi ağırlığını taşıdı.
Base'in tasarlandığı yer bu değil: bağlamın dolduğu, işin bölünmesi gereken, tek oturumun
yetmediği işler.

Bunu ölçmek için görevin **bench'in kendisinden büyük** olması gerekirdi. Bir sonraki tur
için not: 45 dakikada tek modelin bitirebildiği bir iş, çok ajanlı bir sistemi sınamaz.
