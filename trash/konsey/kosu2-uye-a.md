# Özel brifing — Üye A

Bu dosya **yalnız sana**. Karşı üyenin kendi brifingi var; sen onu okumazsın, o bunu
okumaz. Kişisel notunu bu dosyanın altına ekleyebilirsin; masaya taşımak zorunda
değilsin.

## Kimlik

Masada sen **Üye A**'sin. Karşındaki **Üye B**.

Karşı üyenin hangi model olduğu, masada kaç farklı model bulunduğu, ve senin kim
olduğun karşı tarafa **bildirilmez**. Sen de karşı tarafın kim olduğunu bilmiyorsun ve
tahmin etmeye çalışma — metni yazarın kimliğine göre değil, iddianın kendisine göre
değerlendir.

Kimseye üstünlük tanınmamıştır. Bir tarafın diğerine göre daha yetkili olduğu bilgisi
yoktur; öyle bir varsayımla yazma.

## Görevin

Konsey mekaniğinin revizyonunu değerlendir. Mekanik şu an **senin üzerinde koşuyor** —
kullandığın dosya düzeni ve anonimlik, değerlendirdiğin şeyin ta kendisi.

## Dosya düzeni

| Dosya | Kim okur | Ne için |
|---|---|---|
| `docs/konsey/uye-a.md` | yalnız sen | görev, kişisel not |
| `docs/konsey/masa.md` | ikiniz | sorular ve cevaplar |
| `docs/konsey/log.md` | ikiniz + yönetici | kim ne zaman ne yazdı |

Karşı üyenin özel brifingini **açma**.

## Akış — tur 1

1. `docs/konsey/masa.md` dosyasını oku. Karşı üyenin bölümü doluysa **okuma**, tur 1'de
   bağımsız yazman gerekiyor; yalnız kendi başlığına git.
2. `log.md`'ye düş: `tur 1 · A · yazıyor · <saat>`
3. Cevabını `masa.md` içindeki **## Üye A** başlığının altına yaz. Karşı tarafın
   metnine dokunma.
4. `log.md`'ye düş: `tur 1 · A · yazıldı · <saat>`
5. Bitir. Karşı tarafın metnini **tur 2'de** göreceksin; yönetici seni sürdürecek.
   Yeniden brifing almayacaksın, bağlamın duruyor.

**Dosyayı açık tutma, işgal etme.** Yaz, kapat. Karşı tarafın `yazıyor` satırını
görürsen bekle.

## Biçim

Beş sorunun her birine ayrı cevap ver. Satır sınırı yok ama özet yaz — cilalı cümle
değil, sınanabilir iddia. Emin olmadığın yerde **"emin değilim"** yaz; bu bilgi
yöneticinin işine yarıyor.

Türkçe. Gövdeni dönüş mesajında da bas.

---

## Kişisel notlar — Üye A

Tur 2 için kendime: karşı metni okuyunca "makul görünüyor" hissine karşı tetikte ol —
katılacaksan sınanabilir gerekçe göster, gösteremiyorsan katılma, "yakınsama basıncı"
de. Tur 1'de en zayıf bulduğum kendi iddiam: statü etkisinin LLM'lerde büyüklüğü —
kanıtsız sezgi, karşı taraf çürütürse direnme.

---

# TUR 2 — çapraz okuma

Yeniden brifing yok, bağlamın duruyor.

## Akış

1. `docs/konsey/masa.md` içindeki **## Üye B** bölümünü şimdi oku. Tur 1'de yasaktı, artık serbest.
2. `log.md`'ye düş: `tur 2 · A · yazıyor · <saat>`
3. Revizyonunu **`docs/konsey/tur2-a.md`** dosyasına yaz. Bu tur masaya değil kendi dosyana yazıyorsun — çakışma yapısal olarak kesildi. `tur2-b.md` dosyasını açma.
4. `log.md`'ye düş: `tur 2 · A · yazıldı · <saat>`

## Bu turda ne bekleniyor

Pozisyonunu **değiştirdiysen açıkça yaz**; değiştirmediysen "revizyona gerek yok" meşru cevaptır. İki taraf da "gerek yok" derse konsey burada kapanır.

Karşı üye bir ölçüt önerdi, bu turda **uyguluyoruz** — her geri çekmeni tiplendir:

- **bulgu** — daha önce hesaba katmadığın somut bir nesne adlandırıyorsan (bir vaka, bir maliyet, bir bozulma senaryosu). Nesneyi yaz.
- **yakınsama** — "ikna oldum", "haklı sayılır", "itiraz etmiyorum". Nesne yoksa bu.

Turu şu biçimde bir **madde listesiyle bitir** — yönetici düzyazı yorumlamasın, etiket eşlesin:

```
| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
```

## Yöneticinin işaretlediği ayrışmalar

Tur 1'de çoğu maddede yakınsadınız. Şu altısı gerçekten ayrışıyor ya da tek taraflı kaldı — **isim vererek** cevap ver.

**1 · Lite'ın varsayılanı.** Sen "geri dönüşü ucuz mu" ölçütünün kendi sigortasını taşıdığını, tahmin hatasının sınırlı kaldığını söyledin. Karşı üye tersini savunuyor: bu tahmin **tam da yanlış olması en pahalı olan yerde en zayıftır** — geri dönüşü pahalı vakalar tipik olarak kimsenin öngörmediği vakalardır; o yüzden belirsizlik altında varsayılan tam konsey olmalı, lite ancak ucuzluğun *olumlu kanıtıyla* seçilmeli. Ayrıca senin "emniyet valfi" fikrinle aynı yere varıyor ama ileri götürüyor: lite ile tam konseyin turu 1'i birebir aynı olduğuna göre lite **kaybedilmiş bahis değil, "turu 1'de durmuş tam konsey"** olsun; T0 tur 1 metinlerini okur, taşıyıcı bir maddede çelişki ya da "emin değilim" varsa iş tam konseye yükselir. Bu, senin ön-tahmin savunmanı gereksiz kılıyor mu?

**2 · Yakınsama tipi geri çekmenin işlemi.** Sen "düşük güvenle loglanır, yönetici öyle okur" dedin. Karşı üye mekanik sonuç istiyor: yakınsama tipi geri çekme **durak koşulunu tetiklemez**. İkisi aynı şey değil — hangisi?

**3 · Tur 3-4'ün kısıtı.** Sen içerik kısıtı önerdin (sınanabilir yeni gerekçe şartı). Karşı üye kapsam kısıtı önerdi: tur 3 ancak T0'ın adıyla listelediği açık maddeler için açılır, üye o maddelerin dışına yazamaz — gerekçesi *"yeniden formüle etme alanı kalmayınca birbirine kayacak yer de kalmaz"*. İkisi birlikte alınabilir mi, yoksa biri diğerini gereksiz mi kılıyor?

**4 · Ölçüme bel bağlamak.** Sen iki çare verdin: aynı boyut sınıfı içinde karşılaştırma + arada bir lite'lık işi bilerek tam konseye verme. Karşı üye ikisini de onaylıyor ama üstüne koyuyor: *"Bu projede ayda kaç konsey koşacak? Onlarca değilse hiçbir istatistik iki grubu ayıramaz; karşılaştırmaya bel bağlamayın."* Yerine grup-içi iki ölçü öneriyor — **yükseltme oranı** (lite seçilen işlerin yüzde kaçı tam konseye çıkmak zorunda kaldı) ve grup-içi yeniden ele alınma oranı. Bu itiraz senin çarelerini geçersiz mi kılıyor, tamamlıyor mu?

**5 · Yöneticinin sekreterlik çelişkisi** — sen değinmedin, cevap gerekiyor. İddia: protokol T0'a *"iki farklı sözcükle yazılmış iddia aynı şeyi mi söylüyor, buna karar verme"* diyor ama aynı anda *"çelişiyor mu, buna karar ver"* diyor; **çelişkiyi tespit etmek eşdeğerliği tespit etmenin değillemesidir**, yani aynı muhakeme. Sonuç: mekanik sanılan hüküm aslında yorum ve yorum "T0 içerik üretmez" ilanının arkasında görünmez halde. Önerilen düzeltme, bu turda sana uygulattığım madde listesi. İddia doğru mu?

**6 · Kalibrasyon** — sen değinmedin. İddia: konsey kendini kendi üstünde değerlendiriyor, dışarıdan denetim yok; mekanik en az bir kez **cevabı zaten bilinen** bir işte denenmeli — bu depoda geçmişte verilmiş ve sonradan doğru ya da yanlış çıktığı belli olan bir karar. *"Aksi halde teraziyi kendi ağırlığıyla kalibre ediyoruz."* Katılıyor musun; katılıyorsan bu depoda somut olarak hangi geçmiş karar aday?

Ek olarak karşı üye senin değinmediğin iki şeyi işaretledi, kısaca değerlendir: brifingdeki *"kimseye üstünlük tanınmamıştır"* cümlesinin deferansı kestiği kadar **sahte ihtilaf** üretebileceği; ve mevcut durak koşulunun **"hemfikiriz" ile "tıkandık"ı** ayırt etmediği.

Gövdeni dönüş mesajında da bas.

---

# TUR 3

Kullanıcı mekaniği değiştirdi ve onay istiyor. Ortak metin **`docs/konsey/tur3-maddeler.md`**
dosyasında. Oku ve uygula.

Sen **Üye A**'sın. Yeni tasarımda **ikinci üye** sensin: karşı üyenin tur 3 metnini
görürsün ve **uzatma kararı sende**. Cevabını `docs/konsey/tur3-a.md` dosyasına yaz.

Yönetici seni karşı üye yazdıktan sonra sürdürecek — şimdi bekle.

## Tur 3 · adım 1 — önce kendi metnin

Yöneticinin düzeltmesi: kullanıcının birebir metni *"eski usul iki üyeye fikirleri
sorulur"* diyor — yani **ikiniz de bağımsız yazarsınız**, sonra birincininki sana atılır.
İlk tablom bunu yanlış özetlemişti, `tur3-maddeler.md` düzeltildi.

Şimdi **kendi metnini yaz.** `docs/konsey/tur3-b.md` dosyasını **açma** — karşı üyenin
metnini bu adımdan sonra alacaksın, o zaman uzatma kararını vereceksin.

Cevabını `docs/konsey/tur3-a.md` dosyasına yaz, log'a `yazıyor`/`yazıldı` düş.
Gövdeni dönüş mesajında da bas.

## Tur 3 · adım 2 — karşı metin ve uzatma kararı

Karşı üyenin bağımsız metni hazır: **`docs/konsey/tur3-b.md`**. Oku.

**Uzatma kararı sende.** Kullanıcının tasarımı gereği bu karar yöneticinin değil, ikinci
üyenin. İki seçenek:

- **Uzat** — karşı metinde kapatılması gereken bir şey görüyorsan. Kendi koyduğun şarta
  uy: uzatma gerekçesi **bulgu standardında somut bir nesne** adlandırsın. Uzatırsan
  hangi maddelerde uzattığını yaz; yönetici o kapsamda tur 4 açar.
- **Kapat** — gerek görmüyorsan. Kapanış tipini kendin yaz: **uzlaşı** mı **yakınsama**
  mı. Nesnesiz kapanış `yakınsama` olarak loglanır, bu senin ve karşı üyenin ortak kuralı.

Kararını verirken kendi metnini geri çekiyorsan açıkça yaz ve tiplendir.

**Zaten kapanmış olan:** karşı üye yöneticinin özetinin kullanıcının birebir metninden
saptığını tespit etti (masada bir bağımsız örnek mi var iki mi). Yönetici düzeltti, sen
düzeltilmiş metinle yazdın. **Bu madde için uzatma.**

Kararını ve gövdeni dönüş mesajında bas.
