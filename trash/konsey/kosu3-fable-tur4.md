# Tur 4 — fable · tavan turu

opus'un tur 3 metni: **`docs/konsey/opus-tur3-cevap.md`**. Oku.

**Bu tur tavanı bağlıyor.** Tavan 4 arka-durdurucu: bu turda açık madde kalırsa yeni tur
açılmaz, kapanış nedeni `tavan` yazılır. Tavanın seyrek bağlaması gerekiyor — iki koşu üst
üste bağlarsa cırcır emniyeti tetiklenir.

## Kapanan

opus **M1'de geri çekildi**, tip `bulgu`: yumuşatmanı aldı. Nesnesi seninkini de aşıyor —
*"sahte gözlem uydurma görünür, tahmine dönme görünmez"*; iki kaçağı tek sınıfta
topladığını, ayrılması gerektiğini yazdı. Senin ikinci gerekçeni de aldı: "emin değilim"
erken kapatmaya karşı çalışan **tek** valf, onu daraltmak kendi ayrışma kuralıyla
tutarsızdı.

Cırcır emniyeti, okuma sırası dönüşümü, log kırılmasının ayrı nesne olması, üçünün tek
değişiklikte girmesi — hepsi kabul.

## Karar verilecekler — opus'un yeni eklemeleri

**E1 · `gozlemsiz_belirsizlik` alanının çıkış yolu.** opus alanın tek başına sessiz çöp
olacağını söylüyor: madde kapanışta yöneticiye **zorunlu iki yoldan birine** çıkmalı —
gözlem yönetici tarafından adlandırılır ve madde `devredildi`ye geçer, ya da madde açık
kalır ve koşu `kapanis_nedeni = uzlasi` ile kapanamaz. *"Aksi halde 'loglandı' ile
'kesinliğe döndü' arasında fark kalmaz."*

**E2 · Dondurma sınırı.** Senin formülünü aldı ama boşalabileceğini söylüyor ve sınır
koyuyor: koşullu kural ancak **tetikleyicisi ve sonucu birlikte, önceden, metinde
yazılıysa** dondurma dışıdır. *"Şu olursa bakarız"* biçimindeki madde koşullu kural değil,
**ertelenmiş serbest karardır** ve dondurmaya tabidir.

**E3 · Geç tur dedektörün bu testi geçmiyor.** opus nesneyi kabul ediyor ama tetikleyicisi
sayısal değil — *"oranın artması bir yön, eşik değil."* Dondurma öncesi metne girecekse
eşiği şimdi yazılmalı. Önerisi: **tur 3 ve sonrasında nesnesiz kapanış/uzatma oranı, aynı
koşunun tur 1-2 oranının iki katını aşarsa** ateşler — koşu-içi karşılaştırma olduğu için
n=1 sorununa girmiyor. Eşiği eminlikle savunmuyor; savunduğu *bir sayı yazılması
gerektiği*.

**E4 · Okuma sırası sayacının paydası.** "Tek yönlü" sayılırken payda
`tasiyici_madde_sayisi` olmalı, ham geri çekme sayısı değil — yoksa aynı payda sorunu bu
sayaca da girer.

**E5 · Eski satır nasıl korunur.** opus iki biçimi aynı tabloda yaşatmayı reddediyor:
`Tip` sütununun tek gerçek bilgisi zaten `Tur`'da duruyor (koşu 2 = `tam`/`4`), yani
kaybolacak bilgi yok — eski satır silinmez, taşınmaz, koşu 2'nin kendi bloğuna bir satır
yazılır. Genel kural: **düşen sütunun bilgisi ya başka sütundan türetilebilir olmalı, ya
da düşmeden önce koşu bloğuna yazılmalı.**

Bu senin "eski satırlara dokunulmaz" nesneni karşılıyor mu, yoksa hâlâ bir kırılma mı var?

## Kapanış kararı

Karar seninle bende ortak. **Ben kapatma yönünde oy veriyorum**: opus geri çekildi, kalan
maddeler ayrışma değil ekleme, ve tavan zaten bu turu bağlıyor.

Sen de kapatıyorsan **kapanış tipini yaz** — `uzlasi` mı `yakinsama` mı. Nesnesiz kapanış
`yakinsama` loglanır, bu ikinizin ortak kuralı.

Uzatmak istersen nesne yazmak zorundasın; tavan bağladığı için yeni tur açılmaz ama
kapanış nedeni `tavan` olur ve o madde açık kalır — bu bilgi cırcır emniyetinin girdisi.

Turu madde listesiyle bitir. Kısa yaz.

```
| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
```
