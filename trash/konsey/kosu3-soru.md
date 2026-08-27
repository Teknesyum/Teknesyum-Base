# Konsey — koşu 3 · mekaniğin sadeleştirilmesi

Bu dosya iki üyeye de ortaktır. Yönetici yönlendirmesi burada durur, ayrı brifing yok —
önceki koşuda "ortak metin iki dosyaya kopyalanırsa ayrışmasını kimse göremez" kusuru
tespit edilmişti, düzeltmesi bu.

**Üyeler adlarıyla anılır: opus ve fable.** Anonimlik kalktı.

## Kullanıcının kararı — birebir

> *"Şimdi lite diye bir kavram kalmadı; eski konsey, yeni konsey, hard konsey vb. hiçbir
> şey kalmadı. Şu an sadece konseyin mekaniğini biraz değiştirdik: fable opusun yanıtını
> da görecek ve fikir alışverişini uzatmayı tercih edecek — burada karar fable ve yönetici
> opusta.*
>
> *Kimliği gizlemenin de bir espirisi kaldı mı bilmiyorum, ama her halükârda konsey 'üye
> A' görmektense fable'ı seçebilmeyi tercih ederim. Kullanıcıdan gizlenmesinin hiçbir
> amacı yok. Bu metodu bu metod ile incele ve sonuçları bana bildir."*

## Yürürlükteki akış

1. **opus ve fable bağımsız yazar.** Aynı soru, aynı anda, birbirini görmeden.
2. **opus'un metni fable'a verilir.** Ters yön yok.
3. **Uzatma kararı fable ve yönetici opus'ta ortaktır.** Uzatma gerekçesi bulgu
   standardında somut nesne adlandırmak zorunda; nesnesiz kapanış `yakınsama` loglanır.
4. **Oturumlar kapatılmaz** — üye yeniden çağrılmaz, sürdürülür.
5. Tavan 4, arka-durdurucu olarak. Efor medium.

Zorunlu valfler (üyenin takdirine bırakılmaz): opus taşıyıcı bir maddede *"emin değilim"*
yazdıysa fable kapatamaz · şema değişikliği, veri silme, dış API sözleşmesi, dosya biçimi,
migration tek turda kapanmaz.

Protokolün tamamı: `docs/konsey/PROTOKOL.md`. Önceki koşuların metinleri:
`docs/konsey/arsiv/`.

## Sorular

**1 · Anonimliğin kalkması.** Koşu 2'de anonimlik şu gerekçeyle konmuştu: deferansı keser
— *"karşımdaki daha yetkili, geri adım atayım"*. Aynı koşuda ikiniz de anonimliğin
**yakınsamayı** kesmediğini, kaymanın kimlikten değil karşı metni okumaktan doğduğunu
yazdınız; ve biri şunu ekledi: anonimlik statü etkisini kaldırmaz, *hedefli deferansı
öz-değerlendirmeye endeksli bir sapmaya çevirir*, çünkü üye kendi ne olduğunu bilir.

Şimdi asimetri zaten açık: fable opus'un metnini görüyor ve uzatma kararını veriyor.
Kimlik gizlemenin **kalan** bir faydası var mı, yoksa yalnız maliyet mi — hem kullanıcı
tarafında (okunabilirlik) hem üye tarafında?

Eğer kalkıyorsa: `masa_kompozisyonu` alanının gerekçesi *"mutabakatı iskonto etmek için
kaç ayrı model olduğunu bilmek gerekir, bu bilgi üyeden saklanıyor"* idi. Kimlik açıkken
o alan hâlâ gerekli mi, yoksa iskonto artık üyenin kendi işi mi?

**2 · Uzatma kararının iki kişilik olması.** Kullanıcı kararı fable **ve** yönetici opus'a
verdi. Koşu 2'de bu yetki tek başına fable'daydı ve *"çapa karar veren tarafa kurulur"*
diye tek ciddi kusur olarak işaretlenmişti. Yöneticinin karara ortak olması bu kusuru
azaltıyor mu — yönetici metinleri okuyor ama masada yazmıyor, yani çapası farklı?

İki taraf ayrı düşerse ne olur: biri uzat, öteki kapat derse hangisi geçerli? Bunun
mekanik bir kuralı olmalı, yorum bırakılmamalı.

**3 · Kavramların sadeleşmesi.** Kullanıcı *"lite, eski konsey, yeni konsey, hard konsey —
hiçbiri kalmadı"* diyor. `docs/konsey/PROTOKOL.md` ve `docs/stats/konsey.md` şu an bu
kavramların izini taşıyor mu? Taşıyorsa hangi cümle/alan düşmeli — somut ad ver.
`uzatildi_mi`, `mekanik`, `kapanis_nedeni` alanları bu sadeleşmeden sonra hâlâ anlamlı mı?

**4 · Bu koşuda ölçülecek olan.** Koşu 2'nin ölçüsü: çıktı 111.1k, eşdeğer 2162.7k, duvar
2358sn, dört tur, beş nesneli geri çekme. Bu koşu **medium eforda** koşuyor ve **anonimlik
yok**. İkisi de değişken. Sonuçlar karşılaştırılırken hangi çıkarım **yapılamaz**? Bir
koşudan ne öğrenilebilir, ne öğrenilemez?

**5 · Ne bozulur.** Bu sadeleşmiş tasarımda hangi durumda çuvallarız?

## Biçim

Beş soruya ayrı ayrı cevap ver. Emin olmadığın yerde **"emin değilim"** yaz — tahmin etme;
o kelime mekanikte zorunlu valf tetikliyor, bilerek kullan.

Turu şu listeyle bitir:

```
| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
```

- **bulgu** — daha önce hesaba katılmamış somut nesne. Nesneyi yaz.
- **yakınsama** — "ikna oldum", "haklı sayılır". Nesne yoksa bu.

Dosya yazmıyorsun; gövdeni dönüş mesajında bas, yönetici masaya geçirir. Türkçe, özet.
