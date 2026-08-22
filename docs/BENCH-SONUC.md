# Bench sonucu — Chess960 hamle üreteci

Dört durum da tamamlandı. `yalin` başka bir makinede koşuldu (base kurulu değil, aynı
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

Hız ölçümü dördü için de bu makinede, arka arkaya yapıldı.

| | yalin | eco | normal | premium |
|---|---|---|---|---|
| kiwipete d5 | 29,4 sn | 21,8 sn | 21,6 sn | **15,5 sn** |
| Kod | **750 satır / 4 dosya** | 786 / 6 | 1008 / 7 | 2825 / 18 |
| Kendi testi | **1268** | — | 47 | — |
| Ajan | 0 (base yok) | **0 (kendi kararı)** | 4 | ilk oturumda açıldı, sayı kayıp |
| Token | **~113.000** | ~157.709 | 226.856 | ölçüm eksik (kesinti) |
| Süre | 37 dk | 27 dk | 28 dk | ~45 dk (kesintili) |
| Ön araştırma | 0 depo | 0 depo (tavan 1) | 0 depo (bilerek atlandı) | — |

Premium en hızlı üreteci yazdı — yalın koşudan **iki kat hızlı** — ve bunu dört kat fazla
satırla yaptı. Yalın en az token harcadı ve en yavaş kodu yazdı, ama en çok testi o yazdı:
1268'e karşı 47.

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

**Base'in lehine:** `normal` profilinin denetçisi, perft'in asla yakalayamayacağı bir kusur
buldu — temiz klonda derlenmeyen bir depo. Denetçi açan profil buldu, açmayanlar bulamadı.
Premium en hızlı kodu yazdı, yalın koşunun iki katı.

**Base'in aleyhine:** yalın koşu en az token harcadı (~113.000, normal'in yarısı) ve en çok
testi yazdı (1268'e karşı 47). Referans doğrulamasında da en titiz o davrandı.

**Ayırt etmeyen:** doğruluk. Dördü de aynı perft sayılarını üretti.

Dürüst özet: base bu görevde **hız ve denetim** kattı, **token ve test yoğunluğu** açısından
maliyet getirdi. Görev tek başına bir modelin bitirebileceği boyuttaydı — 750 satırlık bir
üreteç için dört ajan açmak, sözleşme yazmak ve denetim turu koşmak kendi ağırlığını taşıdı.
Base'in tasarlandığı yer bu değil: bağlamın dolduğu, işin bölünmesi gereken, tek oturumun
yetmediği işler.

Bunu ölçmek için görevin **bench'in kendisinden büyük** olması gerekirdi. Bir sonraki tur
için not: 45 dakikada tek modelin bitirebildiği bir iş, çok ajanlı bir sistemi sınamaz.
