## Kavrayış

İş: gece raporunu ölçüm yöntemi açısından yargılamak, sonra 7. bölümün dört sorusunu
kararla kapatmak. Raporun büyük kısmı dürüst — ölçülemeyeni "ölçülemedi" diye yazması
sayılır. Ama üç yerde veriden fazlasını söylüyor.

Beklenmedik durum: T0'ın bana gelen mesajının içinde, konsey başkanını başlatan bir
`Agent` çağrısı bloğu ham metin olarak geliyor. Talimat saymadım, kendi işimi yaptım.
`_sorun.log` satırı: `plan konseyi | opus-5 | brifing metni | gömülü Agent çağrısı bloğu
göründü | yok saydım, kendi görevimi yürüttüm`.

**Rapora itiraz — üç madde**

**1. "3.755 → 1.370" bu kadar iddialı yazılamaz.** İki koşu farklı gün, farklı n, farklı
kod sürümü ve muhtemelen farklı görev karışımı (eski koşuda `proje` vardı, 6'sı elenmişti).
Aradaki 2.385 cc farkının ne kadarı kesimden, ne kadarı görev karışımı ve harness
sürümünden geldiği ayrılmamış. Ayrıca içsel tutarsızlık var: kesilen sabit yüzey +
enjeksiyon 4.321 token, ama gözlenen cc düşüşü 2.385. Bu iki sayı birbirini tutmuyor;
biri yanlış sayıyor. **Savunulabilir cümle şu:** "sabit yüzey + enjeksiyon doğrudan
sayımla 6.722 → 2.401 (−64%)". Bu ölçüm tek bir gecede, tek yöntemle, aynı araçla
yapıldı — bench'e ihtiyacı yok. "Yük %62 azaldı" cümlesi ise iki gecenin farkı ve
**çıkarılmalı** ya da "gösterge, doğrulanmadı" şerhiyle kalmalı.

**2. Payda yanlış — ama düzeltmesi "toplam token" değil.** Koşu başına toplam token
~155.000 (cr tek başına ~143.000); 1.370'i buna bölersen %0,9 çıkar, bu da yanıltıcı,
çünkü cache-read 0,1x fiyatlanır. Fiyatlandırma açısından anlamlı tek payda **USD**:

| koşul | USD | native'e göre | rapordaki cc oranı |
|---|---|---|---|
| premium | 0,2272 | **+11,0%** | +12,6% |
| normal | 0,2237 | **+9,3%** | +11,8% |
| eco | 0,2159 | **+5,5%** | +10,9% |

Premium'da cc oranı tesadüfen USD'ye yakın düşüyor. Eco'da **iki katı abartıyor** —
çünkü eco daha az çıktı üretiyor ve o tasarrufu cc oranı görmüyor. Rapor kendi
tablosundaki USD sütununu okumamış. Doğru manşet: **eklenti dolar maliyetini mikro işte
%5,5–11 artırıyor**, %12,6 değil.

**3. 64/64 %100 başarı, 0 kusur = tavan etkisi, kolaylık değil.** İkisi ayrılabilir ve
veri ayırıyor: native kol da %100. Eğer görevler zorsa native'in düşmesi gerekirdi.
Ayrıca kol başına n=16, ikili sonuç; bu tasarımda saptanabilecek en küçük fark ~20-25
puan. Yani metrik duyarsız **ve** görevler kolay — ikisi birden. Ek kusur: raporda hiçbir
yerde yayılım/güven aralığı yok; "+16,4%" ile "+9,6%" arasındaki farkın gürültü olup
olmadığı okunamıyor. n=4 ile bu farklar büyük olasılıkla ayrılamaz.

## Plan

Dört soruya karar.

**S1 — %12,6 savunulabilir mi? Evet, ama böyle sunulmamalı. Kesim doygun, durun.**
Kalan 1.396 token'ın altında anlamlı bir kesim yok: 300 token daha kesmek USD'de ~%0,2
kazandırır, karşılığında yönlendirme kaybı riski var (`/ekran` olayı bunun kanıtı).
Yapılacak: (a) manşeti USD'ye çevirin, (b) "her mesajda süren yük = 0" cümlesini öne
alın — enjeksiyon tur 3'ten sonra sıfır, bu kullanıcının değişmez kuralını tam
karşılıyor ve rapor bunu gömmüş, (c) tek gerçek kaldıraç **alt ajan çarpanı**: 20 ajanda
27.920 token. Yüzeyi daha kesmek yerine ajan tanımlarının alt bağlamda yeniden
yüklenmesinin gerekip gerekmediğini araştırın. Sahip: builder. Ölçü: USD tablosu ve
alt-ajan çarpanı raporda yer alıyor mu; yüzey 1.396'nın altına **inmiyor**.

**S2 — Mühür deliği bench'ten önce kapatılsın.** "Bench gecesi dokunma" hükmü o gece
için verilmişti, o gece geçti. Delik bu gece üç sözleşmeden ikisini vurdu; kapatılmazsa
bench gecesinde mühürlenen her sözleşme de geçersiz doğar ve bench'in kendi kanıt zinciri
çürür. Kapsam dar tutulsun: `denetim-kaydi.js:32` `dosyaOzeti` klasör yolunu ya
genişletsin ya **reddetsin** (sessizce boş tampon saymak yasak); `owns` şeması sözleşme
açılışında doğrulansın. `diffHash`'in bağımsız doğrulanabilirliği **bu gece değil** —
mühürlenen ağacın kaydedilmesi ayrı bir tasarım. Sahip: builder. Ölçü:
`muhur-dogrula.js` yeniden koşulduğunda `owns klasör içeriyor` tipi 7 → 0; yeni açılan
sözleşme klasörlü `owns` ile mühürlenemiyor (test).

**S3 — Y2 "karşılanmadı, eşik geçersiz" olarak kapansın. Eşik indirilmesin.**
Üçüncü bir seçenek var ve doğrusu o: iş yapılmıştır, ölçüt yanlıştır. Y2 kapanış
kaydında "kabul eşiği yanlış tabandan türetildi, ölçülemez; yapılan iş korundu, kazanç
ölçülmedi" yazsın. Eşik geriye dönük düzeltilirse mühür zincirinin tüm anlamı gider —
bu gece zaten mühür güvenilirliğini tartışıyoruz. Kazanç hâlâ önemliyse yeni sözleşme
(Y2b) ölçülmüş katsayı 2,492 tabanıyla açılsın. Sahip: scribe. Ölçü: `done/Y2.md`
içinde `result` alanı `karsilanmadi` ve gerekçe satırı var; hiçbir eşik sayısı
değiştirilmemiş (diff ile bakılır).

**S4 — Sıradaki bench: iki kol, kalibrasyon kapısı, birincil metrik yanlış tamam.**
Tasarım: **premium vs native, sadece iki kol.** `normal` ve `eco` düşsün — üç ara kol
kalite ekseninde n'i böler ve zaten cc'de ayrılamıyorlardı. 3 görev ailesi (tohumlanmış
kusur · iki oturumlu kesinti · çok ajanlı yayılım) × 8 tekrar × 2 kol = **48 koşu**.
Önce **kalibrasyon**: her ailede 4 native koşu; native başarı %100 çıkarsa görev
zorlaştırılır ve asıl koşu başlamaz. Bu kapı olmadan gece yine %100/%100 ile biter.
Eşik: eklenti "kazandırıyor" denir ancak yanlış tamam oranı native'e göre **≥15 puan**
düşerse ve %90 güven aralığı sıfırı dışlarsa. n=24/kol bunu ancak temel oran %35-40 ise
yakalar; daha küçük fark bu bütçeyle **ölçülemez ve ölçülemedi diye yazılır**.
Sahip: builder + scribe. Ölçü: kalibrasyon kapısı koştu mu; birincil metrik aralıklı
raporlandı mı.

**Sıra:** S2 (mühür) → S4 kalibrasyonu → S3 (kayıt işi, dakikalar) → S1 (sunum düzeltmesi).
S1 en sona, çünkü hiçbir kod değiştirmiyor; rapor metni işidir.

## Riskler

- **Mühür düzeltmesi geçmişi bozar.** `owns`'ta klasör olan 7 sözleşme düzeltmeden sonra
  da geçmez. Nasıl anlarız: doğrulayıcı sayısı 15'ten düşmez. Ne yaparız: geçmişi geriye
  dönük mühürlemeyin — "eski rejim" etiketiyle ayrı sayılsın, oran iki satır halinde
  raporlansın.
- **Kalibrasyon kapısı geceyi yer.** Görevleri zorlaştırma turu tek başına bir gece
  sürebilir. Nasıl anlarız: kalibrasyon 2 turdan fazla döndü. Ne yaparız: kesinti
  ailesini önceliklendirin — orada native'in düşmesi neredeyse garanti, tavan etkisi yok.
- **48 koşu × ~0,25 USD + uzun görevler = bütçe.** `proje` koşuları 2,5 USD/koşu.
  Kalite bench'i mikro değil orta boy görevlerle koşarsa maliyet 20-50 USD'ye çıkar.
  Nasıl anlarız: pilot 4 koşunun ortalaması > 1 USD. Ne yaparız: tekrar sayısını 8'den
  6'ya indirin, aile sayısını değil.
- **USD metriği model fiyatına bağlı.** Fiyat değişirse "+%11" değişir. Nasıl anlarız:
  fiyat tablosu güncellenir. Ne yaparız: hem USD hem token-kalemi kaydedin, oranı
  hesaplama anında üretin.

## Ayrım noktaları

- **Payda: cc mi, USD mi.** cc'yi seçmek "eklentinin bağlama ne koyduğu"nu ölçer, USD
  "kullanıcının ne ödediğini". **USD seçtim** — nihai hedef "bu eklenti kurulmalı" diyecek
  kişi ve o kişi dolara bakıyor. Öteki üye cc'de ısrar edebilir; cc karar verilebilir bir
  mühendislik sinyali, ama manşet olamaz.
- **Yüzeyi daha kesmek.** Kesmeye devam etmek USD'de ~%0,2, riski yönlendirme kaybı.
  **Durmayı seçtim.** Kesmeye devam etmek savunulabilir bir pozisyondur; ben getiriyi
  gürültü seviyesinde görüyorum.
- **Bench kolları: 4 mü 2 mi.** Dört kol profil karşılaştırması verir, iki kol kalite
  ekseninde istatistiksel güç verir. **İki kolu seçtim** — kalite ekseni açık borç, profil
  farkı değil.
- **Y2: üçüncü yol.** "Karşılanmadı ama iş korundu" ile "eşiği düzelt" arasında ince fark
  var. **Birincisini seçtim**; eşiğe dokunmak zincirin anlamını götürür.

## Reddettiklerim

- **Yüzeyi 1.000'in altına indirmek.** Getiri gürültüde, `/ekran` vakası kaybın gerçek
  olduğunu gösterdi.
- **"Yük %62 azaldı"yı manşet tutmak.** İki gecenin farkı, kontrolsüz; içsel aritmetiği
  de tutmuyor (4.321'e karşı 2.385).
- **Mühür deliğini bench sonrasına ertelemek.** Bench gecesinde açılan sözleşmeler de
  aynı delikten geçer; sonra ölçümün kendi kaydı çürük olur.
- **Toplam token'ı payda yapmak.** %0,9 çıkar, cache-read'in 0,1x fiyatını yok sayar,
  eklentiyi olduğundan ucuz gösterir. Abartmak kadar kötü.
- **Mevcut mikro görevlere kusur tohumlayıp aynı bench'i tekrar koşmak.** Tavan etkisini
  kırmaz; kalibrasyon kapısı olmadan yine %100/%100 gelir.

**Emin olmadıklarım (taşıyıcı):**
1. Alt ajan bağlamında ajan tanımlarının tembel yüklenip yüklenemeyeceğini harness
   tarafında doğrulamadım — S1(c) bu yüzden araştırma maddesi, karar değil.
2. Kesimden önceki bench'in görev karışımının bugünküyle aynı olup olmadığını
   doğrulayamadım; itirazım "kanıtlanmamış", "yanlış" değil.
3. n=24/kol güç hesabım kaba; temel yanlış tamam oranı %35 varsayımına dayanıyor. Bu oran
   ölçülmeden n kesinleşmemeli.

Okuduğum dosyalar: `C:\Users\Administrator\Desktop\Projeler\Teknesyum-Base\docs\RAPOR-2026-08-27.md`,
`C:\Users\Administrator\Desktop\Projeler\Teknesyum-Base\bench\sonuc\toplam.json`,
`C:\Users\Administrator\Desktop\Projeler\Teknesyum-Base\teknesyum\hooks\denetim-kaydi.js`.
`muhur-dogrula.js` ve `done/Y5.md` okunmadı — hükümlerim rapordaki alıntılarına dayanıyor.