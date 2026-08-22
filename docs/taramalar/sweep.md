# sweep

## 1. Ne yapıyor, hangi problemi çözüyor

GitHub issue'sundan PR üreten kod ajanıydı. Issue açıyordun, Sweep depoyu okuyup planlıyor,
yama yazıp PR açıyor, CI geri bildirimiyle düzeltiyordu.

**Bugün böyle bir şey yok.** Deponun README'si beş satırlık bir veda notu: teşekkür ve
JetBrains eklentisine yönlendirme. Kod duruyor, proje kapalı kaynaklı bir IDE eklentisine
dönüşmüş.

Bu tarama içinde **terk edilmiş depo örneği** olarak duruyor. Bağımlılık yapılmaz; ama
kapanış biçiminin kendisi bir veri noktası.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Bu taramada kod tabanına inilmedi ve inilmesi de anlamlı değil: README hiçbir mimari
bilgi vermiyor, belge bağlantısı yok, mimari dosyası yok.

Söylenebilecek tek yapısal şey lisans dosyasından çıkıyor: depo **ikiye bölünmüş**.
`LICENSE`, "Sweep Enterprise Edition (EE)" metni ve şunu diyor: bu EE lisansı yalnız
Sweep'in **Free Software** olarak dağıtılmayan kısmını kapsıyor; Free Software olarak
dağıtılan kısım MIT.

Yani sınır teknik değil ticari: aynı depoda ücretsiz çekirdek ve ücretli kabuk.
**Hangi dosyanın hangi tarafta olduğu lisans metninden anlaşılmıyor.**

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

Yok. Depo ayakta değil.

Bunun kendisi bulgu: son commit **2025-09-18**, son etiketli sürüm **`sweep-sandbox-v1`,
2023-09-11**. Yani üç yıl boyunca hiç sürüm etiketlenmemiş, ve son bir yıldır hiç commit
yok. 7.701 yıldız, 752 açık issue — issue sayısı yıldızın **onda birinden fazla** ve
hiçbiri kapanmıyor.

Öğretici olan taraf şu: Sweep'in çözdüğü problem (issue → PR) hâlâ geçerli ve SWE-agent,
OpenHands gibi depolar aynı işi yapıyor. Sweep'i ayıran şey, **ne maliyet tavanı, ne
bağlam yoğunlaştırma, ne token ölçümü** — bu taramada aradığımız beş mekanizmadan
hiçbirini kurmamış olması. Yaşayan depolar bu mekanizmalara sahip; ölmüş olan değil.
Bu bir nedensellik kanıtı değil, ama dikkat çekici bir örüntü.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

README'de kurulum talimatı **yok**. Tek içerik veda notu ve JetBrains Marketplace
bağlantısı — ve o bağlantı bile bozuk: bağlantı metni `26275-sweep-ai`, hedefi
`26860-sweep-ai`.

Yeni ürün kapalı kaynaklı bir IDE eklentisi. Bu depodan hiçbir şey çalıştırılamaz.

## 5. Alınmaya değer en fazla 3 fikir

**1. Kapanışı tek ekranda ilan etmek.**
Ne: README'yi silmek veya olduğu gibi bırakmak yerine, en üste "bu proje kapandı, yerine
şu geçti" yazmak. Sweep bunu yapmış; AutoGen de bakım modu uyarısıyla yapmış.
Neden değerli: bizim `docs/taramalar/` ve `docs/kararlar/` klasörlerimiz büyüyor. Terk
edilen yaklaşımın üstüne tek satırlık durum notu, aynı fikri yeniden değerlendirmenin
maliyetini sıfırlar. Ölçüsü: bir yaklaşımı ikinci kez taramak bu taramanın kendisi kadar
tutuyor — on depo, bir oturum.
Maliyet: sıfır. Tek satır.

**2. Yaşayan alternatiflerin ortak paydasını eşik olarak kullanmak.**
Ne: bu taramadaki on depodan maliyet tavanı olan (SWE-agent), bağlam yoğunlaştırması olan
(OpenHands, autogen, langgraph) ve token ölçümü olan (crewAI, dspy, SWE-agent) depoların
hepsi aktif; hiçbiri olmayan Sweep durmuş.
Neden değerli: hangi mekanizmanın önce kurulacağına karar verirken bu sıralama kullanılır
— önce ölçüm, sonra tavan, sonra yoğunlaştırma. Bench'imiz zaten ölçümün eksik olduğunu
gösterdi (`premium` koşusunda token ölçümü kayıp).
Maliyet: sıfır — bu bir sıralama kararı, kod değil.

**3. Ücretsiz/ücretli sınırını dosya düzeyinde yazmak.**
Ne: Sweep'in yapmadığı şey. Lisans "Free Software kısmı MIT" diyor ama hangi dosyaların
o kısımda olduğunu söylemiyor.
Neden değerli: bizim depolarımız da ileride ikiye ayrılabilir. AutoGPT bunu doğru yapmış
— `autogpt_platform/` Polyform, dışı MIT, klasör adıyla yazılı. Sweep yapmamış ve sonuç
kullanılamaz bir lisans.
Maliyet: sıfır — LICENSE dosyasında klasör adı vermek.

## 6. Şüpheli/riskli yanlar

- **Lisans OSI onaylı değil.** `LICENSE` = "Sweep Enterprise Edition (EE) license".
  Üretimde veya ticari amaçla kullanmak için Sweep aboneliği şart; kopyalama, birleştirme,
  yayınlama, dağıtma, türev eser üretme ve satma **açıkça yasak**
  (*"it is forbidden to copy, merge, publish, distribute, create derivative works of,
  sublicense, and/or sell the Software"*). Kişisel, ticari olmayan geliştirme ve test
  serbest. GitHub API lisansı `NOASSERTION` diye raporluyor.
  **Bu depodan kod alınamaz. Bu taramada da alınmadı — yalnız README ve LICENSE okundu.**
- **Terk edilmiş.** Son commit 2025-09-18T06:10:57Z (yaklaşık 11 ay). Son etiketli sürüm
  `sweep-sandbox-v1`, 2023-09-11 — neredeyse üç yıl.
- **Açık issue: 752**, yıldız 7.701. Oran çok kötü; issue'lar cevapsız.
- **Arşivlenmemiş.** `archived: false` — yani GitHub arayüzünde hâlâ canlı bir proje gibi
  görünüyor. Depo listesine bakan biri terk edildiğini ancak README'yi açınca anlar.
  Bu, arşivlemenin neden yapılması gerektiğine dair iyi bir karşı örnek.
- **README'deki tek bağlantı bozuk** (metin `26275`, hedef `26860`).
- **Halef ürün kapalı kaynak.** JetBrains eklentisi; ne kaynağı ne mimarisi
  incelenebiliyor. Yani "nereye evrildi" sorusunun cevabı doğrulanamıyor —
  **doğrulanamadı.**

## Kaynaklar

- `gh api repos/sweepai/sweep` — 7.701 yıldız, 752 açık issue, lisans `NOASSERTION`,
  `archived: false`, son push 2025-09-18T06:10:59Z, oluşturma 2023-06-14.
- `gh api repos/sweepai/sweep/releases/latest` — `sweep-sandbox-v1`,
  2023-09-11T03:51:48Z.
- `gh api repos/sweepai/sweep/commits?per_page=1` — son commit 2025-09-18T06:10:57Z.
- README — beş satırlık veda notu, JetBrains Marketplace bağlantısı.
- `LICENSE` — Sweep Enterprise Edition metni, ticari kullanım ve dağıtım yasağı,
  MIT olan "Free Software" kısmına atıf.
