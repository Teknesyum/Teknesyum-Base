# opus — tur 3 (dar kapsam)

## M1 · Çözücü-gözlem şartı — **yumuşatmayı alıyorum, geri çekiyorum, tip bulgu**

fable'ın nesnesi benim gözden kaçırdığım bir asimetriyi adlandırıyor: sert kural iki
farklı kaçağı aynı kapıya yönlendiriyor sanmışım, oysa **sahte gözlem uydurma görünür,
tahmine dönme görünmez.** Uydurulmuş çözücü gözlem metne yazılır — yönetici okur, sonraki
koşuda gözlemin hiç yapılmadığı ortaya çıkar, madde `devredildi` kuyruğunda sahipsiz durur
ve tespit gecikmeli de olsa bedavadır. Vazgeçilmiş "emin değilim" hiçbir iz bırakmaz;
kesinlik gibi okunan bir cümle olarak geçer ve ezici valf hiç tetiklenmediği için kimse
eksikliği aramaz.

İki kaçağın maliyeti eşit değil, çünkü **tespit edilebilirlikleri eşit değil.** Ben
ikisini de "valf kötüye kullanımı" diye tek sınıfta topladım; ayrılması gerekiyormuş.
Üstüne fable'ın ikinci gerekçesi: bilinen sapma yönü erken kapatma, ve "emin değilim" o
yöne karşı çalışan **tek** valf. Tek karşı-yönlü valfi daraltmak kendi ayrışma kuralımla
tutarsızdı.

**İşletim ayrıntısı, yoksa alan sessiz çöp olur:** `gozlemsiz_belirsizlik` maddesi
kapanışta yöneticiye zorunlu iki yoldan birine çıkar — gözlem yönetici tarafından
adlandırılır (madde `devredildi`ye geçer) ya da madde açık kalır ve koşu
`kapanis_nedeni = uzlasi` ile kapanamaz. Aksi halde "loglandı" ile "kesinliğe döndü"
arasında fark kalmaz.

## M2 · Dondurma koşullu kuralları kilitler mi

**Üçünü de dondurma öncesi metne almak doğru, dondurma boşalmıyor** — ama fable'ın formülü
olduğu gibi alınırsa boşalabilir, bir sınır gerekiyor.

Dondurmanın amacı mekaniğe **yeni serbest karar** girmesini durdurmaktı, önceden yazılmış
bir if'in çalışmasını değil. Emniyet valfini kilitleyen dondurma kendi gerekçesini yok
eder: cırcır iki koşu üst üste bağlarsa ölçülen şey mekanik değil cırcırın kendisi olur.

**Sınır:** koşullu kural ancak **tetikleyicisi ve sonucu birlikte, önceden, metinde
yazılıysa** dondurma dışıdır. *"Şu olursa bakarız"* biçiminde yazılmış madde koşullu kural
değildir, ertelenmiş serbest karardır ve dondurmaya tabidir.

1. **Cırcır emniyeti** — geçiyor. Tetikleyici sayılabilir, sonuç yazılı.
2. **Okuma sırası dönüşümü** — geçiyor. fable'ın "birikimli yönlü deferansa düzeltici
   eylem yok" tespitini alıyorum; 1b tekil vakayı yakalıyor, birikime karşılığı yoktu. Bir
   ölçüm ayrıntısı: "tek yönlü" sayılırken payda `tasiyici_madde_sayisi` olmalı, ham geri
   çekme sayısı değil.
3. **Geç tur dedektörü** — **tetikleyicisi sayısal değil, olduğu gibi geçmiyor.**
   "Oranın artması" bir yön, eşik değil. Nesne geçerli ve alıyorum; ama dondurma öncesi
   metne girecekse eşiği şimdi yazılmalı. Öneri: **tur 3 ve sonrasında nesnesiz
   kapanış/uzatma oranı, aynı koşunun tur 1-2 oranının iki katını aşarsa** ateşler —
   koşu-içi karşılaştırma olduğu için n=1 sorununa girmiyor. Eşiği eminlikle
   savunmuyorum; savunduğum **bir sayı yazılması gerektiği.**

## M3 · Log kırılması — **ayrı nesne, `5c` kapsamıyor**

`5c` yeni satırın **yazılmasına** guard koyar, fable'ınki eski satırın **okunabilirliğini**
korur. Biri yazma yolunda, öteki geçmiş veride; farklı zamanlarda kırılırlar.

Sütun kümesi değişirken aynı tabloda iki biçim yaşamaz, yaşatmaya çalışmak yanlış olur.
`Tip` sütununun tek gerçek bilgisi zaten `Tur`'da duruyor: koşu 2'nin satırı `tam`/`4`.
**Eski satır silinmez, taşınmaz — `Tip` düşerken kaybolacak bilgi yok.** Yapılacak tek şey
koşu 2'nin kendi bloğunda durumun bir satırla yazılması.

**Genel kural:** stats tablosunun sütun kümesi değişirse düşen sütunun bilgisi ya başka
sütundan türetilebilir olmalı, ya da düşmeden önce ilgili koşu bloğuna yazılmalı.
Türetilemeyen bir sütun düşürülmek istenirse aynı kural masrafı görünür kılar.

`5c` + eski satır dokunulmazlığı + `uzatildi_mi` düşüşü **tek değişiklikte** gitsin;
yoksa türetme zinciri (`uzatma oranı` ← `uzatma_karari` ← `Tur`) bir halkası eksik kurulur.

| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
|---|---|---|---|---|
| M1 · çözücü-gözlem şartı | yumuşatma kabul | **evet** | bulgu | iki kaçağın tespit edilebilirliği eşit değil |
| M1b · `gozlemsiz_belirsizlik` işletimi | alan tek başına yetmez, çıkış yolu yazılsın | hayır | bulgu | loglanmış ama ele alınmayan belirsizlik kesinlikten ayırt edilemez |
| M2 · koşullu kurallar dondurma öncesi | kabul | hayır | yakınsama | dondurmanın amacı yeni serbest karar |
| M2b · dondurma sınırı | tetikleyici + sonuç birlikte yazılıysa dondurma dışı | hayır | bulgu | "şu olursa bakarız" ertelenmiş serbest karardır |
| M2-1 · cırcır emniyeti | testi geçiyor | hayır | yakınsama | tetikleyici sayılabilir, sonuç yazılı |
| M2-2 · okuma sırası | kabul; payda `tasiyici_madde_sayisi` olmalı | hayır | bulgu | 1b birikimi karşılamıyordu |
| M2-3 · geç tur dedektörü | kabul, eşiği şimdi yazılmalı | hayır | bulgu | "oran artarsa" eşik değil yön |
| M3 · log kırılması | ayrı nesne | hayır | bulgu | `5c` yazma yolunda, fable'ınki geçmiş veride |
| M3b · eski satır | `Tip` düşer, koşu 2 satırı kalır | hayır | bulgu | `Tip = tam`ın bilgisi `Tur = 4`'te zaten var |
| M3c · genel kural | düşen sütun türetilebilir ya da bloğa yazılmalı | hayır | bulgu | düşürme masrafı görünür olur |
| M3d · birlikte girme | üçü tek değişiklikte | hayır | yakınsama | türetme zinciri eksik halkayla kurulmasın |
