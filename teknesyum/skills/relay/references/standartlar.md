# Ürün standartları — ürettiğimiz her programın uyacağı taban

Bu dosya **çalışma tarzı** değil, **ürün mühendisliği** kuralıdır. `RULES.md` bana nasıl
davranacağımı söyler; burası ürettiğim programın nasıl olacağını söyler.

Yeni bir proje açılırken ikisi de varsayılan olarak devrededir. Mevcut bir projede kural
ilk kez çalıştığında **uygulanmaz, sorulur.**

---

## 1. Üç platform

**Yeni projede varsayılan: Windows + macOS + Linux.** Aksi söylenmediyse üçü de hedeftir.

### Proje bazında kapatma

Proje kökünde `.claude/teknesyum.json`:

```json
{ "platformlar": ["win"], "platformNeden": "Windows dosya ilişkilendirmesi üstüne kurulu" }
```

`platformlar` yazılmışsa kural o projede susar. Gerekçe satırı zorunludur — kapatmak
serbest, sessizce kapatmak değil. Doğası gereği tek platform olan işler böyledir: bir
Windows oyununun üstüne çizen overlay, kabuk ilişkilendirmesi kuran launcher, ETW/registry
okuyan araç.

### Mevcut projede

Kural mevcut bir projede ilk kez çalıştığında geçiş **kendiliğinden yapılmaz.** Tek soru
sorulur: *"Bu proje şu an yalnız Windows. Üç platforma taşıyalım mı?"*

`hayır` → `platformlar` kilitlenir, bir daha sorulmaz ·
`evet` → geçiş kendi sözleşmesini alır, mevcut işin içine karıştırılmaz.

Aynı yaklaşım arayüz için de geçerlidir: eski arayüzler `teknesyum-ui` standardından önce
yazıldı. `uicheckup` tarar, raporlar, **kullanıcı onaylamadan hiçbir dosyaya yazmaz.**

### Teknik kurallar

- İş mantığı katmanı platform API'si çağırmaz. Platforma bağlı olan tek katman kabuktur.
  Bu ayrım baştan kurulursa port, yeniden yazım değil kabuk değişimi olur.
- Yol birleştirme elle yapılmaz: `path.join` / `Path.Combine`. Gömülü `C:\`, `/home/`,
  `%USERPROFILE%` yok — ev dizini çalışma zamanında çözülür.
- Kabuk çağrısı yok: `cmd.exe`, `powershell -c`, `sh -c` yerine süreç doğrudan
  argüman dizisiyle başlatılır. Kabuk hem taşınmaz hem enjeksiyon yüzeyidir.
- Dosya adları **küçük-büyük harf duyarlı** varsayılır. Linux'ta `Utils.js` ≠ `utils.js`;
  Windows'ta çalışan yanlış import orada patlar.
- Metin dosyaları UTF-8, satır sonu `.gitattributes` ile sabitlenir.
- Ayrıcalık istenmez: yönetici/root gerektiren bir adım varsa tasarım yanlıştır.
- CI matrisi üç işletim sistemini de çalıştırır. Test yeşilse taşınabilirlik iddiası
  ölçülmüş olur; yoksa temennidir.

### Arayüz seçimi

.NET'te WPF/WinForms tek platformdur — çok platform hedefleniyorsa **Avalonia**. Web
teknolojisiyle masaüstü isteniyorsa **Tauri** (ikili küçük, sistem WebView'i kullanır),
Electron ancak Node'a özgü bir zorunluluk varsa.

### Denetim

```
node teknesyum/scripts/platform-denetim.js <kök>
```

Model çağırmaz: gömülü sürücü harfi, ev dizini, kabuk çağrısı, `-windows` hedef çerçevesi
ve CI matrisinin eksik ayağı için kaynağı tarar. Bulgu listesi verir, dosya değiştirmez.

---

## 2. Kendini güncelleme

**Açılış yolunda ağ işi yoktur.** Program açılırken yalnızca bir zaman damgası okur
(`sonKontrol`); 24 saat dolmamışsa hiçbir şey yapmaz. Bu bir dosya okumasıdır, ölçülebilir
bir gecikme üretmez.

Süre dolmuşsa kontrol **pencere açıldıktan sonra**, arka planda, 3 saniyelik zaman aşımıyla
çalışır ve **sessizce başarısız olur.** Ağ yoksa kullanıcı hiçbir şey görmez; art arda
başarısızlıkta aralık geriye doğru açılır.

### İki mod

| Mod | Davranış | Şart |
|---|---|---|
| `check` (varsayılan) | Yeni sürümü **haber verir**, indirmeyi kullanıcı başlatır | — |
| `silent` | Arka planda indirir, sonraki açılışta takas eder | Yayınlanan SHA-256 doğrulanır |

Ayar standart yapılandırma yolunda: `autoUpdate: check | silent | off`.

### Değişmez kurallar

- **Doğrulanmamış ikili çalıştırılmaz.** Güncelleyici bir kod çalıştırma kanalıdır; HTTPS
  tek başına yetmez, yayınlanan `SHA256SUMS` karşılaştırılır. Doğrulama yoksa mod `check`
  seviyesinin üstüne çıkamaz.
- **Paket yöneticisi kurulumu kendini güncellemez.** winget, Homebrew, apt veya mağaza
  üzerinden kurulduysa güncelleme onların işidir; ikisi birden çalışırsa kurulum bozulur.
  Kurulum kaynağı işaretlenir ve güncelleyici kendini kapatır.
- Kullanıcı bir sürümü atlarsa (`atlanmisSurum`) o sürüm bir daha hatırlatılmaz.
- Windows'ta çalışan çalıştırılabilir dosyanın üzerine yazılamaz: yeni sürüm yanına iner,
  takas sonraki açılışta yapılır.
- Kontrol adresi tek ve sabittir (GitHub Releases `latest`). Günde bir istek, kimliksiz
  sınırın çok altında.

### Ön koşul — sürüm boru hattı

Güncelleyici, **makine tarafından okunabilir bir sürüm akışı** olmadan çalışmaz. Her etiket
CI'da üç platforma derlenir, çıktılar `SHA256SUMS` ile birlikte GitHub Release'e yüklenir.
Bu boru hattı kurulmadan güncelleyici yazılmaz — sırası budur.

---

## 3. Her programda ortak

- **Ayar ve veri exe'nin yanına yazılmaz.** `%APPDATA%` / `~/.config` /
  `~/Library/Application Support`. Program Files salt okunurdur, taşınabilir kopya gezer.
- **Hata kopyalanabilir olur.** Günlük standart yola yazılır, hata penceresinde kopyala
  düğmesi bulunur. Ekran görüntüsünden hata okumak kimsenin işi değildir.
- **İlk çalıştırmada yapılandırma istenmez.** Program varsayılanlarla açılır.
- **Pencere tam ekran açılır.** Aksi özellikle belirtilmedikçe program büyütülmüş halde
  açılır. Ortada, ekranın bir parçasını kaplayarak açılan pencere içeriği sıkıştırır: üstü
  altı boş dururken paneller gereksiz kaydırma çubuğuna düşer. Normal boyut değerleri
  yine de tanımlanır — kullanıcı geri yükle dediğinde pencerenin döneceği boyut odur.
- **Kurulum zorunlu değildir.** Mümkünse tek dosya, yönetici izni istemeden çalışır.

## 4. Üretilen dosyanın kodlaması

**Türkçe karakter içeren `.ps1` dosyasında, dosyanın nasıl çalıştırılacağı kodlamayı
belirler.** Windows PowerShell 5.1 BOM taşımayan bir betiği UTF-8 değil sistemin ANSI kod
sayfası olarak okur (Türkçe Windows'ta cp1254); dosya gerçekten UTF-8 olduğu için her
Türkçe harfin iki baytı iki ayrı karakter olarak çözülür — `ı` dosyada `c4 b1`, ekranda
`Ä±`.

| Çalıştırma yolu | Kodlama | Neden |
|---|---|---|
| `irm <url> \| iex` | **BOM'suz** UTF-8 | `irm` metni HTTP `charset=utf-8` başlığından çözer; BOM eklenirse `iex` ilk komutu tanımaz (`ï»¿$global:…`) |
| `powershell -File betik.ps1` | **BOM'lu** UTF-8 | BOM'suzken ANSI okunur ve Türkçe bozulur |

**İkisi aynı dosyaysa BOM'suz kalır** — barındırılan yol belgelenmiş yoldur ve orada
sorun yoktur. O durumda belgelerde `-File` verilmez, açık UTF-8 okuma verilir:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ([IO.File]::ReadAllText('<yol>',[Text.Encoding]::UTF8))"
```

ÖLÇÜLDÜ (23.08.2026, VidShrink): aynı içerik BOM'lu ve BOM'suz yazılıp `-File` ile
koşuldu, karşılaştırma konsola bakarak değil çözülen dizge dosyaya yazdırılıp bayt bayt
yapıldı — konsol katmanı kendi başına bozabildiği için konsol çıktısı kanıt sayılmadı.
BOM'suz: `68 61 7a c3 84 c2 b1 …` · BOM'lu: `68 61 7a c4 b1 …` (beklenen).

`.cs`, `.axaml`, `.md`, `.json` etkilenmez: Roslyn ve öteki okuyucular BOM'suz dosyayı
önce UTF-8 olarak çözmeyi dener ve geçerli UTF-8'i doğru okur. Kural yalnız PowerShell
betikleri içindir.
