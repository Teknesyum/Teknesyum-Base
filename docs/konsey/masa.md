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
