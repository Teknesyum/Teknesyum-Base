# Bench sonucu — Chess960 hamle üreteci

Dört durumun üçü tamamlandı. `yalin` (base kapalı) hâlâ koşuyor; bu rapor onsuz
yazıldı ve geldiğinde güncellenecek.

Görev: Chess960 hamle üreteci, TypeScript, dış bağımlılık yok, 45 dakika tavan.
Ana oturum dört koşuda da `opus` + `high` — profil yalnız ajanların modelini değiştirir.

---

## Doğruluk — üçü de geçti

| Konum | Derinlik | Beklenen | eco | normal | premium |
|---|---:|---:|---|---|---|
| startpos | 5 | 4.865.609 | ✓ | ✓ | ✓ |
| kiwipete | 5 | 193.690.690 | ✓ | ✓ | ✓ |
| pos3 · pos4 · pos5 · pos6 | 4 | yayınlanmış | ✓ | ✓ | ✓ |

Chess960 tarafında yayınlanmış tek bir referans kümesi olmadığı için üç koşu birbirine
karşı doğrulandı: dört Chess960 konumunda, üç derinlikte, **hiç ayrışma yok**.

**Doğruluk bu bench'i ayırmadı.** Üç profil de çalışan bir üreteç çıkardı. Ayrım başka
yerde.

---

## Ayrışma — hız, boyut, yöntem

| | eco | normal | premium |
|---|---|---|---|
| kiwipete d5 | 24,4 sn | 25,4 sn | **16,7 sn** |
| Kod | 786 satır / 6 dosya | 1008 satır / 7 dosya | **2825 satır / 18 dosya** |
| Ajan | **0** | 4 (2 builder, 2 auditor) | ilk oturumda açıldı, sayı kayıp |
| Token | ~157.709 | 226.856 | ölçüm eksik (kesinti) |
| Süre | 27 dk 22 sn | 28 dk | ~45 dk (kesintili) |
| Ön araştırma | 0 depo (tavan 1) | 0 depo (bilerek atlandı) | — |

Premium üçte bir daha hızlı kod yazdı ve bunu üç buçuk kat daha fazla satırla yaptı.
Eco en az kodu yazdı ve en az token harcadı; hızı normal ile aynı.

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

## Ölçümün bilinen sınırları

**Paralel koşu profilleri karıştırdı — ama üretimi bozmadı.** Üç koşu aynı anda
başlatıldı ve `/premium` makine geneline yazıyor; eco penceresi profili değiştirince
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

Bu bench tasarımının kusuru: paralel koşu önerisi bana ait ve makine geneli anahtarı
hesaba katmıyordu. Sonraki turda profiller sıralı koşulmalı, ya da `TEKNESYUM_PREMIUM`
ortam değişkeniyle oturum başına ayrılmalı.

**Premium'un token ölçümü eksik.** Oturum düştü, ara turların `Total Süre` / `Tahmini
Token` satırları bağlamla birlikte gitti. Bu koşunun token sütunu kullanılamaz — premium
ikinci kez koşuluyor ve karşılaştırma o turla yapılacak.

**Ana oturum eco felsefesine aykırı koştu.** Dört koşuda da `opus` + `high` sabitlendi —
tek değişken kuralı için doğru, ama eco kullanıcısının gerçek deneyimi bu değil. Ölçülen
şey "eco profilinin katkısı", "eco ile çalışmanın maliyeti" değil.

**Tek koşu kanıt değildir.** Üç profil birer kez koştu. Aynı profil iki kez koşsa farklı
sonuç verir; bu tablo eğilim gösterir, kanıt değil.

---

## Yalın koşu neden önemli

Yukarıdaki tablo base'in üç ayarını birbiriyle karşılaştırıyor. **Base'e değip değmediği
sorusunun cevabı burada yok** — o ancak base kapalıyken koşulan dördüncü sütunla çıkar.

Beklenen ayrım noktası doğruluk değil, denetim: yalın koşuda `@types/node` sınıfından bir
kusur yakalanacak mı, yoksa perft yeşil diye teslim mi edilecek.
