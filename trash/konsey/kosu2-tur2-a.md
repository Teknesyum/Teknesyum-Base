# Tur 2 — Üye A revizyonu

## 1 · Lite'ın varsayılanı

Kısmen geri çekiyorum, tipi **bulgu**. Nesne: sigorta argümanımın döngüselliği.
"Geri dönüşü ucuz işte kaçırılan kusur ucuz düzeltilir" iddiam, sınıflandırmanın doğru
yapıldığını varsayıyor; oysa asıl bozulma kipi sınıflandırmanın kendisinin yanlış
olması. Pahalı-geri-dönüşlü vakaların tipik olarak öngörülmeyen vakalar olduğu itirazı
somut ve benim hesaba katmadığım bir şey — sigorta, poliçeyi yazanın hata yaptığı yerde
ödemiyor.

Yükseltilebilir lite tasarımı ön-tahmin savunmamı **büyük ölçüde gereksiz kılıyor**:
tahmin artık nerede biteceğine değil yalnız nerede başlanacağına karar veriyor ve
yanlışlığının bedeli bir tur gecikmeye iniyor. Benim emniyet valfim bunun zayıf haliydi;
güçlü halini kabul ediyorum.

Bir kalıntı tutuyorum: yükseltme kapısı yalnız tur 1 metinlerini okur. İki üyenin kör
noktası korelasyonluysa (tur 1'deki bozulma vakam: aynı model iki sandalyede) çelişki
de "emin değilim" de üretilmez, kapı açılmaz, lite sahte güvenle kapanır. Bu yüzden
kapı, kategori tabanlı bir sert zemini ikame etmez: geri alınması yapısal olarak pahalı
iş sınıfları (şema değişikliği, veri silme, dış API sözleşmesi) tahminden ve kapıdan
bağımsız olarak lite'a hiç yönlenmesin. Kapı + kategori tabanı birlikte; tek başına
kapı değil.

## 2 · Yakınsama tipi geri çekmenin işlemi

Karşı üyenin mekanik kuralını seçiyorum: yakınsama tipi geri çekme **durak koşulunu
tetiklemez.** "Düşük güvenle loglanır, yönetici öyle okur" biçimindeki önerim T0'a
yorum yükü bindiriyordu — kendi 5. maddemdeki "yönetici tek nokta" itirazımla ve
sekreterlik eleştirisiyle tutarsızdı. Mekanik kural bu yükü kaldırıyor.

Ama kuralın **yönü belirsiz** ve bu yeni bir nesne: "tetiklemez"in iki zıt okuması var.
(i) Yakınsama geri çekmesi ilerleme sayılmaz → yalnız yakınsama üreten tur "hiçbir şey
üretmedi" muamelesi görür, konsey **durak** nedeniyle kapanır. (ii) Yakınsama uzlaşı
sayılmaz → kapanışı geciktirir, tur açık kalır. Bu ikisi ters yönde çalışır. Benim
seçimim (i): yakınsama ilerleme değildir, tur kapanır — ama kapanış nedeni log'a
**durak** yazılır, **uzlaşı** değil, ve kapanış raporu "yakınsadı" der, "doğrulandı"
demez. Böylece tur 1'deki önerimden hayatta kalan tek parça rapor dili katmanı oluyor;
işlem katmanı karşı üyenin.

## 3 · Tur 3-4'ün kısıtı

Geri çekme yok: **ikisi birlikte alınmalı, biri diğerini gereksiz kılmıyor.** Dik
eksenler: kapsam kısıtı *nereye* yazılabileceğini sınırlar, içerik kısıtı *neyin geri
çekme sayılacağını*. Yalnız kapsam olursa açık madde içinde hâlâ nesnesiz "haklısın"
üretilebilir; yalnız içerik olursa geçerli görünen nesneler yeni formülasyonlar üzerine
imal edilerek kayma devam eder. İkisinin bileşik maliyeti sıfıra yakın — ikisi de
yazım kuralı, tur eklemez.

Not: bulgu/yakınsama tiplendirmesi zaten benim içerik şartımın işletilmiş hali —
"sınanabilir yeni gerekçe" ile "somut nesne adlandırma" aynı test. Burada ayrışma
sanılan şey büyük ölçüde aynı önerinin iki yazımıymış.

## 4 · Ölçüm

Kısmen geri çekiyorum, tipi **bulgu**. Nesne: örneklem büyüklüğü. Stratifikasyon
önerim N'i daha da böler; ayda birkaç konsey koşan bir projede boyut sınıfı başına
1-2 gözlem düşer ve hiçbir katman karşılaştırması sinyal taşımaz. "Aynı boyut sınıfı
içinde karşılaştır" önerim bu ölçekte pratikte boş küme — düşürüyorum.

İtiraz çarelerimi geçersiz kılmıyor, **hedefini değiştiriyor**: log alanları kalsın
(maliyet muhasebesi ve geriye dönük teşhis için hâlâ değerli), ama karar dayanağı
gruplar arası karşılaştırma değil grup-içi iki oran olsun — yükseltme oranı ve
yeniden ele alınma oranı. Kasıtlı çapraz atamam hayatta kalıyor, ama istatistiksel
temel olarak değil; karşı üyenin işaret ettiği tek işlevle: sıfıra yakın yükseltme
oranının "yönlendirme iyi" mi "kapı dar" mı olduğunu ayırt eden nadir kalibrasyon
sondası. Rol küçüldü, gerekçe netleşti.

## 5 · Sekreterlik çelişkisi

Sonuç doğru, mantık düzeltilmeli. "Çelişki tespiti eşdeğerlik tespitinin
değillemesidir" ifadesi fazla sıkı: iki iddia eşdeğer olmadan da çelişmeyebilir
(bağımsız iddialar), yani ikisi birbirinin değillemesi değil. Ama taşıyıcı nokta
ayakta: ikisi de **aynı yetenek sınıfından semantik hükümler** ve birini yasaklayıp
diğerini zorunlu kılmak, yorumu "T0 içerik üretmez" ilanının arkasına saklar. İddia
bu düzeltmeyle kabul.

Düzeltme önerisi olan madde listesi doğru ve şu an üzerimde çalışıyor — ama tek başına
yorumu sıfırlamaz: A'nın madde adlarıyla B'ninkileri hizalamak yine T0'a düşer. Tam
mekanikleşme için eşlemenin tersine çevrilmesi gerekiyor: **kanonik madde listesini T0
yayınlar, üyeler o adların altına yazar.** Bu tur tam böyle koştu (yönetici altı
ayrışmayı adlandırdı, ben adlara cevap veriyorum) ve işlediğine dair bir gözlem
üretti. Kural haline gelsin.

## 6 · Kalibrasyon

Katılıyorum; itirazsız. Aday seçim ölçütü: bu depoda verilmiş, sonradan **revize
edilmek zorunda kalmış** bir karar — revizyon, karar anında bulunabilir bir kusurun
varlığının kanıtıdır; konsey o kararın *orijinal* metni üzerinde koşturulur ve kusuru
yakalayıp yakalamadığına bakılır.

Somut aday olarak git geçmişindeki autocompact penceresi zinciri görünüyor (önce bir
ayar, sonra "premium 500k, eco 150k" revizyonu) — bir kararın sonradan değiştirildiği
belgeli bir vaka. Ama orijinal kararın "yanlış çıktığı" için mi yoksa koşullar
değiştiği için mi revize edildiğinden **emin değilim**; bunu yönetici git geçmişinden
benden ucuza doğrular. Ölçüt net, örnek doğrulanmalı.

## Ek 1 · "Kimseye üstünlük tanınmamıştır" ve sahte ihtilaf

Risk gerçek ve ölçüsü karşı üyenin dediği gibi geri çekme sayısı — ama aynı ölçüt
simetrik genişletilebilir: geri çekmeler gibi **itirazlar da tiplendirilsin**. Nesne
adlandıran itiraz ile nesnesiz direnme ("katılmıyorum" + yeni nesne yok) ayrı sayılırsa,
sahte mutabakat ve sahte ihtilaf aynı tek mekanizmayla görünür hale gelir. İki sapma
için iki ayrı denetim gerekmiyor.

## Ek 2 · "Hemfikiriz" ile "tıkandık"

Kabul; nesneli düzeltmeleri de (kapanış nedeni alanı: uzlaşı · durak · tavan · iptal;
madde başına açık "açık kalan yok" beyanı) alıyorum. Madde 2'deki yön seçimimle
birleşiyor: yalnız-yakınsama turu **durak** olarak kapanır, uzlaşı olarak değil —
iki durum log'da zaten ayrışmış olur.

## Madde listesi

| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
|---|---|---|---|---|
| 1 lite varsayılanı | yükseltilebilir lite + kategori sert zemini | kısmen | bulgu | sigorta argümanının döngüselliği; korele kör noktada kapının körlüğü |
| 2 yakınsama işlemi | mekanik kural, yön (i): durak olarak kapatır; rapor dili "yakınsadı" | kısmen | bulgu | "tetiklemez"in iki zıt okuması — yön protokole yazılmalı |
| 3 tur 3-4 kısıtı | kapsam + içerik birlikte | hayır | — | dik eksenler; her biri diğerinin açığını kapatıyor |
| 4 ölçüm | grup-içi oranlar birincil; stratifikasyon düştü; çapraz atama yalnız sonda | kısmen | bulgu | örneklem: katman başına 1-2 gözlem, karşılaştırma boş küme |
| 5 sekreterlik | iddia kabul, mantık düzeltilmiş; kanonik listeyi T0 yayınlar | hayır | — | çelişki/eşdeğerlik değilleme değil, aynı yetenek sınıfı |
| 6 kalibrasyon | kabul | — | — | ölçüt: sonradan revize edilmiş karar; aday autocompact zinciri, emin değilim |
| ek-1 sahte ihtilaf | kabul + simetrik genişletme | — | — | itirazlar da tiplendirilsin: nesnesiz direnme sayılır |
| ek-2 hemfikir/tıkandık | kabul | — | — | kapanış nedeni alanı; madde 2 yön seçimiyle birleşik |

Genel: taşıyıcı maddelerde revizyon var, "revizyona gerek yok" demiyorum. Açık kalan
tek şey madde 2'deki yön seçiminin karşı tarafça onayı ve madde 6'daki adayın
doğrulanması.
