# Hata: Uzun ölçüm koşuları kullanıcıyı dakikalarca bekletiyor, çoğu gereksiz

**Durum:** çözüldü 24.08.2026 — üç ölçü de relay skill'ine yazıldı, `test/run.js`
kilitliyor.
**Önceki durum:** açık.
**Belirti:** Ajanlar gerçek kodlama koşusu beklerken oturum ilerlemiyor; kullanıcı ekranda saatlerce "sürüyor" görüyor.
**Kaynak:** `teknesyum/skills/relay/SKILL.md` — sözleşme yazımı ve uzun iş yönetimi
**Görüldüğü proje:** VidShrink

---

## 1. Ne oldu

VidShrink'te T10 sözleşmesi GPU kalibrasyonunu düzeltiyordu. Sözleşmeye "düzeltme
öncesi ve sonrası ölçüm" yazdım. Ajan dört hedefli gerçek ffmpeg koşuları yaptı; her
koşu dakikalar sürdü.

Kullanıcı bu sırada bekledi ve sonunda sordu: "bu 1 saattir süren işlemler nedir
gerekli mi".

### Neyin gerekli olduğu, neyin olmadığı

**Gerekliydi:** düzeltme *sonrası* ölçüm. "Üç geçiş sorunu çözüldü mü" sorusuna ölçmeden
cevap verilemezdi. 400 sn 1080p60 bir klibi dört hedefe kodlamak dakikalar sürüyor; bu
ffmpeg'in hızı, kısaltılabilecek bir şey değil.

**Gereksizdi:** düzeltme *öncesi* ölçüm. O sayı zaten depoda yazılıydı —
`CHANGELOG.md` "Known gaps" bölümü ve röle `LOG.md`, `av1_nvenc`'in 2-3 düzeltme turu
yediğini kaydetmişti. Ajan bilinen bir sayıyı yeniden ölçmek için uzun süre koştu, ben
sonunda iptal ettim. O süre tamamen boşa gitti.

Sebebi sözleşmeyi yazarken "öncesi/sonrası" kalıbını düşünmeden uygulamamdı. Kalıp
doğru; ama "öncesi" ölçülmüş ve belgelenmişse yeniden ölçmek ölçüm değil tekrar.

### İkinci kayıp: ajanların kesilmesi ve elle sürdürülmesi

Bu oturumdaki ajanlar 70-100 araç çağrısı civarında tavana takılıp durdu. Sekiz kez
elle sürdürmek gerekti. Her sürdürme bir tur gecikme ve bağlamın yeniden okunması
demek.

Bunu geç fark ettim. T21 ve T22'ye "her kriterden sonra rapora satır düş ve ara ara
commit at" talimatını verdim ve orada işe yaradı — kesildiklerinde nerede kaldıkları
okunabildi. Aynı talimatı T10, T17, T18 ve T19'a baştan vermemiştim.

### Üçüncü kayıp: seri bekleme

Ajan koşuyu beklerken durdu, ben ajanı uyandırdım, ajan "hâlâ sürüyor" deyip yine
durdu. Bu döngü birkaç kez tekrarlandı ve her turu kullanıcı ekranda gördü.

Sonunda doğru olanı yaptım: koşunun bitişini arka planda bekleyen bir gözcü kurup
ajanı yalnız bir kez, iş bittiğinde sürdürdüm. Ama bunu üçüncü tekrardan sonra yaptım.

### Dördüncü kayıp: artakalan süreç

Gözcü olarak kurduğum bekleme döngüleri "bitti" bildirdikten sonra bile arkalarında bir
`sleep` süreci bıraktı. Kullanıcı bunu fark edip sordu. İş yapmıyorlardı ama
listede duruyorlardı ve "hâlâ bir şey çalışıyor" izlenimi verdiler.

## 2. Ölçü

Bu günlük şu üçü sağlandığında kapanır:

1. Sözleşme yazarken "öncesi/sonrası ölçüm" istenen her maddede, "öncesi"nin depoda
   zaten belgeli olup olmadığı kontrol edilir; belgeliyse kaynağı gösterilir ve yeniden
   ölçülmez.
2. Uzun ölçüm gerektiren sözleşmelerde ajana baştan kayıt noktası talimatı verilir ve
   ölçümün bitişi ajanı uyandırarak değil, arka plan gözcüsüyle beklenir.
3. Gözcü olarak kurulan komutlar arkalarında süreç bırakmaz; bittiğinde süreç
   listesinde iz kalmadığı doğrulanır.

---

## 3. Öneri

Üç madde, üçü de `relay` skill'ine ait.

**Ölçüm tekrarı kapısı.** Sözleşmeye ölçüm yazarken sorulacak soru: *bu sayı zaten
ölçülmüş ve bir yere yazılmış mı?* Yazılmışsa sözleşme onu kaynağıyla alıntılar. Relay
§6'daki "getirme maliyeti ölçütü" bunun kardeşi — orada bilgi için sorulan soru, burada
ölçüm için sorulmalı.

**Uzun iş için gözcü kalıbı.** Dakikalar süren bir dış koşuyu (kodlama, CI, büyük
derleme) bekleyen ajan uyandırılarak yoklanmaz. Koşu başlatılır, ajan bırakılır, bitişi
arka planda bekleyen bir gözcü haber verir, ajan bir kez sürdürülür. Bu oturumda kalıp
çalıştı ama üçüncü tekrardan sonra bulundu; yazılı olsaydı ilk seferde uygulanırdı.

**Kayıt noktası talimatı varsayılan olsun.** Ajanların araç tavanına takılması istisna
değil, bu oturumda kural oldu. "Her kriterden sonra rapora tek satır düş ve ara ara
commit at" talimatı, uzun sözleşmelerde brifingin standart parçası olmalı — sonradan
hatırlanan bir şey değil.

Bu günlük, aynı hafta açılan diğerleriyle aynı deseni gösteriyor: kural biliniyor ama
üretim anında hatırlatan bir yer yok. Kardeşleri `HATA-turkce-karakter-ps1-kodlama.md`,
`HATA-sohbet-metni-duz-yazi-duvari.md` ve `HATA-imza-teknesyum-simgesi.md`.

---

## 4. Ne yapıldı — 24.08.2026

Üç öneri de kabul edildi ve üçü de relay skill'ine girdi. Günlüğün kendi teşhisi
("kural biliniyor ama üretim anında hatırlatan bir yer yok") burada bir adım
öteye taşındı: kurallar **sözleşme yazılırken** okunan yerlere kondu, sonradan
hatırlanacak yerlere değil.

**Ölçü 1 — ölçüm tekrarı kapısı.** relay §6'ya, "getirme maliyeti ölçütü"nün hemen
yanına yazıldı; ikisi kardeş sorudur, biri bilgi biri ölçüm için. Soru: *bu sayı
zaten ölçülmüş ve bir yere yazılmış mı?* `CHANGELOG`, röle `LOG.md`,
`docs/olcumler/`, önceki sözleşmenin `## Çıktı`sı. Yazılıysa sözleşme kaynağıyla
alıntılar. Kalıbın kendisi ("öncesi/sonrası") doğru kaldı — düzeltilen, belgelenmiş
tarafı yeniden ölçmek.

**Ölçü 2 — gözcü kalıbı.** relay §3.3 açıldı. Üç adım: koşu arka planda başlar ·
ajan bırakılır · bitişi gözcü haber verir, ajan bir kez sürdürülür. Yoklama tur
harcar, koşuyu hızlandırmaz. Aynı bölümde kayıt noktası talimatının uzun
sözleşmelerde brifingin standart parçası olduğu yazıldı — bu oturumda talimatı alan
iki sözleşme kesildiğinde okunabildi, almayan dördü okunamadı.

**Ölçü 3 — artakalan süreç.** Aynı bölümde: gözcü "bitti" dedikten sonra süreç
listesi **o turda** kontrol edilir, artakalan varsa kapatılır. Sonraki tura
bırakılmaz; o tur gelmeyebilir. İş yapmayan bir `sleep` bile "hâlâ bir şey
çalışıyor" izlenimi veriyor ve kullanıcı onu soruyor.

**Sözleşme tarafı.** `references/protocol.md` §3'e iki satır: uzun koşu içeren
sözleşmede kayıt noktası talimatı ve "öncesi" değerinin belgeli olup olmadığı
kontrolü baştan yazılır. Sözleşme yazılırken okunan yer burasıdır.

**Kilit.** `test/run.js` → `uzun kosu kurallari yerinde: gozcu, olcum tekrari,
kayit noktasi`. 420/420.
