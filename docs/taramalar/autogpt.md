# AutoGPT

## 1. Ne yapıyor, hangi problemi çözüyor

Bu depo iki farklı projeyi barındırıyor ve ikisi de aynı sorunu farklı yönden çözmeye
çalışmış:

- **AutoGPT Classic** (`classic/` altında) — 2023'ün özerk ajan denemesi. Hedef verirsin,
  ajan kendi kendine görev listesi üretip döngüye girer.
- **AutoGPT Platform** (`autogpt_platform/` altında) — bugün geliştirilen şey. Görsel blok
  düzenleyici, zamanlanmış/tetiklenen çalıştırmalar, pazar yeri, barındırılan servis.

Bu tarama içinde **"bu işi yanlış yapmış" örneği** olarak duruyor. Yanlışın kendisi
öğretici: Classic, ajanın maliyetini sınırlayan hiçbir yapısal mekanizma kurmadan özerk
döngü kurdu; sonuç, ajanın kendi bağlamını sürekli büyüterek pahalı ve sonuçsuz koşular
üretmesi oldu. Proje bu yaklaşımı sürdürmedi — **çözüm ajanı ucuzlatmak değil, ajanı
kaldırıp yerine kullanıcının çizdiği bir grafik koymak oldu.**

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök klasörde ayrım keskin ve lisansla da işaretlenmiş:

- `autogpt_platform/` — canlı ürün. Bloklardan kurulu iş akışı motoru, arayüz, pazar yeri.
- `classic/` — dondurulmuş. `forge` (ajan iskeleti), `benchmark` (AG Benchmark),
  `frontend`.
- `docs/`

Platform'un koyduğu sınır şu: **ajan artık kendi adım dizisini üretmiyor.** Kullanıcı
blokları bağlıyor, çalışma zamanı o grafiği yürütüyor. LLM tek tek blokların içinde,
sürücü koltuğunda değil. Bu, LangGraph'ın grafik yaklaşımıyla aynı yöne bakıyor — ama
LangGraph geliştirici için, AutoGPT Platform son kullanıcı için.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

Grafik olarak iş akışı. Özerk döngünün yerini deterministik yürütme almış; LLM çağrısı
grafiğin bir düğümü.

Maliyet açısından sonuç: **bir koşunun kaç adım süreceği önceden belli.** Classic'te
belli değildi — ajan durma kararını kendi veriyordu ve bu, öngörülemeyen maliyetin
kaynağıydı.

README bunu ürün diliyle ifade ediyor: ajan panosunda *"every agent, run, cost, and
action that needs your attention"* görünüyor. Yani maliyet ürünün birinci sınıf bir
kavramı — ama bu kısım **kapalı lisanslı tarafta** (aşağıya bakınız).

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

README neredeyse tamamen barındırılan servise (`platform.agpt.co`) yönlendiriyor;
kendi kendine barındırma bağlantısı README'nin altında. Kurulum Docker Compose tabanlı
(platform), yani depo klonlayıp `pip install` ile başlanan bir şey değil.

Classic tarafı çalıştırılabilir durumda ama bakımı yapılmıyor.

## 5. Alınmaya değer en fazla 3 fikir

**1. Adım sayısı önceden belli olmayan döngüye girmemek.**
Ne: özerk "kendi görev listesini üret, bitene kadar koş" döngüsünün yerine adımları
önceden tanımlı bir akış.
Neden değerli: bench'te `premium` koşusu iki kez kesintiye uğradı ve ~45 dakika sürdü;
ikinci koşusu 27 dakikada bitti ama 350.000 token harcadı — `yalin` koşusunun **üç
katından fazla**. Bu varyans, adım sayısının önceden belli olmamasının doğrudan sonucu.
Sözleşme başına adım tavanı koymak (örneğin: en fazla 6 ajan turu) varyansı sınırlar.
Maliyet: düşük — sözleşmede tek sayı. Riski: tavan işi yarıda kesebilir, yani tavanın
kalibrasyonu için önce mevcut koşuların tur dağılımını ölçmek gerekir.

**2. Maliyeti kullanıcı arayüzünün birinci sınıf alanı yapmak.**
Ne: ajan panosunda her koşunun maliyeti, durumu ve bekleyen eylemi tek listede.
Neden değerli: bizde token ölçümü koşu sonrası elle toplanıyor ve `premium` koşusunda
**tamamen kayboldu** (BENCH-SONUC.md: "ölçüm eksik", "sayı kayıp"). Ölçüm arayüzde
görünmüyorsa toplanmıyor. Statusline'a "bu oturumda açılan ajan sayısı ve toplam token"
koymak bu boşluğu kapatır.
Maliyet: düşük-orta — statusline zaten var; token verisi transcript'te mevcut.

**3. Terk edilen yaklaşımı silmeyip işaretlemek.**
Ne: `classic/` klasörü duruyor, lisansı ve durumu açıkça yazılı.
Neden değerli: bizim bench'imiz de terk edilecek yaklaşımlar üretecek (`eco`'nun ajan
açmama kararı gibi). Silmek yerine "denendi, şu sonucu verdi" diye tutmak, aynı fikrin
altı ay sonra yeniden denenmesini engeller. Ölçüsü: `docs/kararlar/` altındaki her
kararın yanında koşu numarası ve token sayısı.
Maliyet: sıfır — klasör ve bir satır not.

## 6. Şüpheli/riskli yanlar

- **Lisans OSI onaylı değil — en azından canlı kısmı için.** `LICENSE` dosyası açıkça
  ikiye ayırıyor: `autogpt_platform/` klasörü **Polyform Shield License** altında,
  dışındaki her şey MIT. Polyform Shield rakip ürün geliştirmeyi yasaklayan bir
  "kaynak açık" lisans, **OSI onaylı değil.** GitHub API lisansı `NOASSERTION` diye
  raporluyor. Yani geliştirilen kısım açık kaynak değil; MIT olan kısım terk edilmiş
  kısım.
- **Yıldız sayısı yanıltıcı.** 186.756 yıldız (2026-08-22) — listedeki en yüksek sayı.
  Ama bu yıldızların çoğu 2023'teki Classic dalgasından; bugünkü ürünün kalitesi hakkında
  bilgi vermiyor.
- **README pazarlama metni.** *"Get 10 hours back every week"* iddiası kaynaksız ve
  **doğrulanamadı.** Karpathy, Amjad Masad ve Lior Alexander alıntıları 2023 tarihli ve
  Classic hakkında; bugünkü platform hakkında değil — README bu ayrımı yapmıyor.
- **Açık issue: 530** (2026-08-22). Son sürüm `autogpt-platform-beta-v0.7.2`,
  2026-08-21 — sürüm adında hâlâ **beta** var.
- **Ajan maliyeti mekanizması yok.** Bu taramanın aradığı beş şeyden — sabit maliyet
  düşürme, ajan açma eşiği, iletişim maliyeti, denetçi, ölçüm — depoda **hiçbiri**
  orkestrasyon katmanında bulunmadı. "Cost" ürün panosunda bir alan; kütüphane
  seviyesinde bir kavram değil.
- **Gizli kurulum maliyeti yüksek:** platform Docker Compose, veritabanı, arayüz ve
  arka uç servisleri gerektiriyor. Bir orkestrasyon fikri almak için kurulması gereken
  yüzey çok geniş.

## Kaynaklar

- `gh api repos/Significant-Gravitas/AutoGPT` — 186.756 yıldız, 530 açık issue, lisans
  `NOASSERTION`, son push 2026-08-22T14:16:44Z, oluşturma 2023-03-16.
- `gh api repos/Significant-Gravitas/AutoGPT/releases/latest` —
  `autogpt-platform-beta-v0.7.2`, 2026-08-21T04:54:17Z.
- `LICENSE` — Polyform Shield (`autogpt_platform/`) + MIT (geri kalan), `classic/forge`,
  `classic/benchmark`, `classic/frontend` sayımı.
- README — ürün yüzeyleri (AutoPilot, Agents, Marketplace), "10 hours back every week",
  2023 tarihli alıntılar, kendi kendine barındırma bağlantısı.
