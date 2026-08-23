# Hata: BOM'suz UTF-8 yazılan `.ps1` dosyaları Windows PowerShell 5.1'de Türkçe karakterleri bozuyor

**Durum:** açık.
**Belirti:** Kurulum betiği dosyadan çalıştırıldığında konsol yazıları `hazırlanıyor` yerine `hazÄ±rlanÄ±yor` çıkıyor.
**Kaynak:** Üretilen her `.ps1` dosyası — somut örnek `VidShrink/Install-VidShrink.ps1`
**Görüldüğü proje:** VidShrink

---

## 1. Ne oldu

Kullanıcı VidShrink'i kurdu, kurulum başarılı oldu ama konsola basılan Türkçe metinler
bozuk göründü.

### Tekrar üretme

1. İçinde Türkçe karakter geçen bir `.ps1` dosyasını **BOM'suz UTF-8** olarak kaydet.
2. Windows PowerShell 5.1 ile dosya olarak çalıştır:
   `powershell -NoProfile -ExecutionPolicy Bypass -File betik.ps1`
3. `ı` yerine `Ä±`, `ş` yerine `ÅŸ`, `ü` yerine `Ã¼` çıkar.

### Kök neden

Windows PowerShell 5.1, BOM taşımayan bir betik dosyasını **UTF-8 değil, sistemin ANSI
kod sayfası** olarak okur (Türkçe Windows'ta cp1254). Dosya gerçekten UTF-8 olduğu için
her Türkçe harfin iki baytı iki ayrı ANSI karakteri olarak çözülür.

`ı` harfi dosyada `c4 b1` baytlarıyla duruyor; cp1254 bunu `Ä` + `±` diye okuyor.

### Ölçüm

Aynı içerik iki kez yazıldı, biri BOM'lu biri BOM'suz, ikisi de PS 5.1 ile `-File`
olarak çalıştırıldı. Karşılaştırma konsola bakarak değil, betiğin çözdüğü dizgeyi
dosyaya yazdırıp bayt bayt karşılaştırarak yapıldı — konsol katmanı kendi başına
bozma yapabildiği için konsol çıktısı kanıt sayılmadı.

| Kaynak dosya | Çözülen baytlar | Sonuç |
|---|---|---|
| BOM'suz UTF-8 | `68 61 7a c3 84 c2 b1 72 6c 61 6e ...` | bozuk |
| BOM'lu UTF-8 | `68 61 7a c4 b1 72 6c 61 6e ...` | doğru |
| beklenen | `68 61 7a c4 b1 72 6c 61 6e ...` | — |

### Kritik ayrıntı: BOM eklemek tek başına çözüm değil, karşı tarafı bozuyor

İlk akla gelen düzeltme "dosyaya BOM ekle" oldu. Ölçüldüğünde bunun **asıl kurulum
yolunu bozduğu** görüldü.

VidShrink'in belgelenmiş kurulum yolu şu:

```
irm https://raw.githubusercontent.com/.../Install-VidShrink.ps1 | iex
```

Burada dosya diske hiç inmiyor; `irm` metni HTTP başlığındaki `charset=utf-8` bilgisine
göre çözüyor ve Türkçe **doğru geliyor**. Kullanıcının ilk kurulum çıktısında
`hazırlanıyor` ve `yükleniyor` kelimeleri düzgün basılmıştı, bu yol sağlam.

Dosyaya BOM eklenirse `irm` çözülmüş metnin başına `U+FEFF` karakterini koyuyor ve
`iex` ilk komutu tanıyamıyor:

```
The term 'ï»¿$global:SONUC' is not recognized as the name of a cmdlet...
```

Yani Windows PowerShell 5.1'de iki yol birbirine zıt istekte bulunuyor:

| Yol | BOM'suz | BOM'lu |
|---|---|---|
| `irm ... \| iex` (belgelenmiş yol) | çalışır, Türkçe doğru | **kırılır** |
| `powershell -File betik.ps1` | çalışır, **Türkçe bozuk** | çalışır, Türkçe doğru |

Tek bir dosya ikisini birden memnun edemiyor.

### Doğru düzeltme

Barındırılan betik **BOM'suz kalır** — belgelenmiş yol odur ve orada sorun yok.
Dosyayı yerelden çalıştırmak gerektiğinde `-File` kullanılmaz, metin açıkça UTF-8
okunup çalıştırılır:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ([IO.File]::ReadAllText('C:\yol\betik.ps1',[Text.Encoding]::UTF8))"
```

Ölçüldü: aynı dosya `[Text.Encoding]::UTF8` ile okunduğunda Türkçe doğru,
`[Text.Encoding]::Default` (PS 5.1'in `-File` davranışı) ile okunduğunda bozuk.

### Kapsam

Bu bir VidShrink hatası değil, **üretilen her `.ps1` dosyasını ilgilendiren bir kodlama
kuralı eksikliği.** VidShrink'te ortaya çıkmasının tek sebebi, kurulum betiğinin Türkçe
mesaj basan ilk betik olması.

Aynı taramada VidShrink'in 13 dosyasında Türkçe karakter bulundu, 8'i BOM'suz. Bunların
`.cs` ve `.axaml` olanları **etkilenmiyor**: Roslyn BOM'suz dosyayı önce UTF-8 olarak
çözmeyi deniyor ve dosya geçerli UTF-8 olduğu için doğru okuyor. Kurulu
`VidShrink.App.dll` içinde 17 Türkçe dizge bayt bayt doğrulandı, bozuk olan çıkmadı;
uygulama arayüzü sağlam. Sorun yalnızca PowerShell betiklerinde.

## 2. Ölçü

Bu hata şu üçü aynı anda sağlandığında kapanır:

1. Türkçe karakter içeren bir `.ps1` üreten her akışta, dosyanın hangi kodlamayla
   yazılacağı ve nasıl çalıştırılacağı yazılı bir kurala bağlanmış olur.
2. VidShrink deposunda yerelden çalıştırma komutu `-File` yerine UTF-8 okuyan biçimiyle
   belgelenir; `irm | iex` yolu BOM'suz kalmaya devam eder ve bozulmadığı doğrulanır.
3. Aynı ölçüm tekrarlandığında BOM'suz dosyanın `-File` ile çözdüğü baytlar beklenen
   baytlarla birebir eşleşir ya da o çağrı biçimi belgelerden tamamen kalkmış olur.

---

## 3. Öneri: standart üretim modülü

Bu hatanın asıl dersi kodlama değil. Kural aslında biliniyordu; **kuralı hatırlatacak
bir yer yoktu.** Betik yazıldı, çalıştı, Türkçesi bozuldu ve bunu kimse üretim anında
yakalamadı.

Aynı boşluk `README.md` üretiminde de var. Şu an her proje README'sini kendi oturumu
kendi kafasına göre yazıyor: kimi İngilizce kimi Türkçe, kurulum bölümü kimi projede
var kimi projede yok, kod bloklarının dili tutarsız, kurulum komutunun hangi kabukta
çalıştığı bazen hiç yazmıyor. VidShrink README'sindeki "kısıtlıysa dosyayı indirip
çalıştırın" cümlesi tam olarak bu yüzden yanlıştı — indirip `-File` ile çalıştıran
kullanıcıyı doğrudan bu hataya gönderiyordu.

Önerilen: **üretilen dosyaların biçimini standarda bağlayan bir modül.** `teknesyum-ui`
arayüz için ne yapıyorsa, bu modül de üretilen metin dosyaları için onu yapar — README,
kurulum betiği, CHANGELOG, lisans başlığı.

Modülün kural setine girmesi gereken, bu hatadan çıkan kural:

> **Kodlama kuralı.** Türkçe karakter içeren `.ps1` dosyası üretildiğinde, dosyanın nasıl
> çalıştırılacağı kodlamayı belirler. Barındırılan ve `irm | iex` ile çalıştırılan betik
> **BOM'suz UTF-8** yazılır. Yerelden dosya olarak çalıştırılacak betik **BOM'lu UTF-8**
> yazılır. İkisi aynı dosyaysa BOM'suz kalır ve belgelerde `-File` yerine
> `iex ([IO.File]::ReadAllText($yol,[Text.Encoding]::UTF8))` biçimi verilir. Windows
> PowerShell 5.1 BOM'suz dosyayı ANSI okur; bu kural o davranışın etrafından dolaşır.

Modülün kapsaması gereken diğer maddeler, bu hatanın komşuları:

- README'nin dili ve zorunlu bölümleri (kurulum, gereksinimler, lisans) tek biçimde olur.
- Bir kurulum komutu belgelenirken hangi kabukta çalıştığı yazılır; komut kopyalanıp
  çalıştırıldığında olduğu gibi çalışır.
- Belgede verilen her komut, verilmeden önce en az bir kez gerçekten koşulur. Bu
  hatadaki `-File` komutu koşulmadan yazılmıştı.
- Üretilen dosyanın satır sonu ve kodlaması dosya türüne göre sabittir, oturumun
  keyfine bırakılmaz.

Modül kurulana kadar kural en azından `RULES.md` düzeyinde bir satır olarak durmalı;
yoksa bir sonraki Türkçe betikte aynı hata tekrar edecek.
