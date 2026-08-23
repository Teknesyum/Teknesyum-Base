# Hata: Teknesyum imzasına simge konulmuş — standart o satırda simgeyi açıkça yasaklıyor

**Durum:** açık.
**Belirti:** Başlık çubuğundaki `Teknesyum` düğmesinin solunda `< >` biçiminde bir kod ayracı simgesi çiziliyor; standart bu satır için "simge yok" diyor.
**Kaynak:** `VidShrink/src/VidShrink.App/MainWindow.axaml` satır 60-67 · kural: `teknesyum-ui/SKILL.md` §4
**Görüldüğü proje:** VidShrink

---

## 1. Ne oldu

VidShrink penceresinin başlık çubuğundaki imza bloğu tarandı. `Teknesyum` düğmesinin
içinde metnin solunda bir `Path` öğesi duruyor ve bu öğe `< >` kod ayracı çiziyor:

```xml
Data="M 9 5 L 3 12 L 9 19 M 15 5 L 21 12 L 15 19"
```

Çizim iki kırık çizgiden ibaret — soldaki `<`, sağdaki `>`. Yani düğme metinden önce
bir simge gösteriyor.

### Kural vardı ve uygulanmadı

`teknesyum-ui` §4 "İmza bloğu — pencere başlık çubuğunda" bölümündeki tablo iki satırı
ayrı ayrı tanımlıyor ve ikisinin simge sütunu farklı:

| Yer | Metin | Renk | Simge | Davranış |
|---|---|---|---|---|
| Küçült'ün hemen solu | `Teknesyum` | `neon-blue` | yok | yalnız anahat, hover'da tepki |
| Onun solu | `Destek` | `pink-text` | kahve fincanı | hover'da tepki |

`Teknesyum` satırının Simge sütunu boş değil, açıkça **"yok"** yazıyor. Yani bu belirsiz
bırakılmış bir nokta değil, doğrudan ihlal edilmiş bir hüküm.

Aynı tablonun `Destek` satırı doğru uygulanmış: `BtnSponsor` içindeki `Path` gerçekten
kahve fincanı çiziyor. Standardın okunduğu ama tablonun yalnız bir satırının
uygulandığı görülüyor.

Bu maddenin cevabı "kural yoktu" değil, **"kural vardı ve uygulanmadı"**.

## Aynı taramada çıkan iki sapma

Bu ikisi yukarıdaki simge maddesinden **ayrıdır** — aynı blokta duruyorlar ama farklı
kurallara aykırılar ve ayrı ele alınmaları gerekiyor.

**1. Etiket Title Case yazılmış.** Metin `Buy Me a Coffee` olarak gömülü. §4'ün verdiği
İngilizce karşılık `Buy me a coffee`. Ayrıca §3'ün "ilki büyük gerisi küçük" kuralı da
aynı yöne bakıyor; Title Case ikisine birden aykırı.

**2. İki metin de koda gömülü.** Hem `Buy Me a Coffee` hem `Teknesyum`, XAML'de
doğrudan `Text=` özniteliğinde duruyor. §4 ikisinin de `locale/` altından gelmesini
şart koşuyor, §3.1 ise metnin koda gömülmesini yasaklıyor. VidShrink deposunda
`locale/` klasörü hiç yok.

Bu ikinci madde yeni bir keşif değil: T14 raporu da "ikisi de çevrilmiyor" demişti.
Bilinen ama kapatılmamış bir sapma.

## 2. Ölçü

Bu günlük şu üçü birden sağlandığında kapanır:

1. `MainWindow.axaml` içindeki `BtnGitHub` düğmesinde metin dışında çizilen bir öğe
   kalmaz; `Teknesyum` düğmesi §4 tablosunun dediği gibi yalnız metinden oluşur.
   Bu madde VidShrink **T16 sözleşmesinde** düzeltiliyor.
2. Destek etiketi `Buy me a coffee` biçimine iner ve §3'ün büyük-küçük harf kuralına
   uyar. Bu madde henüz kimseye atanmadı.
3. `Teknesyum` ve destek etiketi XAML'den çıkar, `locale/` altındaki kaynaklardan
   okunur; VidShrink deposunda bir `locale/` klasörü bulunur. Bu madde de henüz
   kimseye atanmadı.

İkinci ve üçüncü maddeler kapanmadan günlük kapatılmaz, birincisi tek başına yeterli
değildir.

---

## 3. Desen: kural yazılı, üretim anında kapı yok

Bu günlük aynı hafta açılan diğer iki günlükle aynı deseni gösteriyor. Üçünde de kural
bir yerde yazılıydı; üçünde de kuralı üretim anında hatırlatan ya da ölçen bir kapı
yoktu.

`HATA-turkce-karakter-ps1-kodlama.md` — kodlama kuralı biliniyordu, betik yazıldı,
Türkçesi bozuldu ve bunu kimse yazma anında yakalamadı.

`HATA-sohbet-metni-duz-yazi-duvari.md` — paragraf uzunluğu kuralı ölçülebilir biçimde
vardı, ama kapsamı arayüz metniyle sınırlıydı; sohbet çıktısı denetlenen yüzeyin dışında
kaldı.

Buradaki durum aynı: §4 tablosu tek bakışta okunacak kadar açık, iki satırından biri
doğru uygulandı, diğeri gözden kaçtı ve arada bunu söyleyen hiçbir adım olmadı.
Ortak sonuç, kuralın metni değil, kuralın ne zaman okunacağıdır — yazılı olması
uygulanmasını sağlamıyor.

---

## Duzeltme — 23.08.2026

**Bu raporun Title Case tespiti gecersiz.** `Buy Me a Coffee` etiketinin her kelimesinin
buyuk harfle baslamasini §3 ihlali diye yazmistim; o tespit `teknesyum-ui` 2.46.0'a
dayaniyordu. 2.50.1'de §3 tersine dondu ve tam cumlelerin de kurala uydugunu, yani her
kelimenin ilk harfinin buyuk oldugunu soyluyor. Title Case dogru olan.

Raporun **asil bulgusu etkilenmiyor**: `Teknesyum` etiketine `<>` simgesi konmasi §4
imza tablosuna hala aykiri, o satirin Simge sutunu "yok" diyor. Bu madde VidShrink T16
sozlesmesinde duzeltildi.

Metinlerin `locale/` yerine XAML'e gomulu olmasi maddesi de gecerliligini koruyor.

Nedeni ayri bir gunlukte: `HATA-surum-gomulu-yol-eski-standardi-okuyor.md`.
