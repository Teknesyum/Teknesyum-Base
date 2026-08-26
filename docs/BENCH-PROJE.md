# Proje bench'i — ağır görev, 4 koşul × 3 blok

Üretim: koşular `node scripts/bench/kos.js --gorev=proje --tekrar=3`, analiz
`node scripts/bench/istatistik.js` (ham: `bench/sonuc/proje-istatistik.json`).
Bu dosya analiz çıktısının yorumlanmış halidir; sayılar elle değiştirilmez.

## 1. Deney tasarımı

- **Görev:** `satis-rapor` — 63 gereksinimli, 15 ekili hatalı, 12 modüllü Node projesi;
  ~230 satırlık istem, 4 yeni modül + 3 çıktı biçimi (tablo/JSON/CSV). Doğrulayıcı
  230 bağımsız davranış denetimi; temiz ağaç 174 kusur, referans çözüm 0.
- **Koşullar:** premium / normal / eco (Teknesyum eklentisi, ilgili profil) ve native
  (eklentisiz Claude Code). Her koşu izole `CLAUDE_CONFIG_DIR`, taze fixture kopyası,
  `claude -p` headless, opus, tavan 45 dk.
- **Tasarım:** randomize blok — 3 tekrar bloğu; blok içinde 4 koşul eşzamanlı (yük adil),
  bloklar sıralı. r1 bloğu 13:08'de, r2/r3 blokları 15:31'de koştu (oturum limiti molası;
  blok eşlemeli analiz zaman etkisini bloklar içinde tutar).
- **Kalibrasyon:** üç ön koşu (129 sn → 359 sn → 547 sn) ile görev iki kez büyütüldü;
  nihai görevde native tek başına ~7,5-8,5 dk çalışıyor.

## 2. Betimleyici sonuçlar (n=3 blok / koşul)

| koşul | süre ort±ss (sn) | taze token ort±ss | cache-read ort | kusur (r1/r2/r3) | maliyet ort |
|---|---|---|---|---|---|
| premium | 485 ± 60 | 114.307 ± 12.095 | 1.078.433 | **27** / 0 / 0 | $2,30 |
| normal | 502 ± 92 | 117.370 ± 18.176 | 1.420.145 | 0 / 0 / **1** | $2,53 |
| eco | 473 ± 30 | 111.878 ± 4.096 | 1.651.813 | 0 / 0 / 0 | $2,54 |
| native | 475 ± 32 | 111.107 ± 7.169 | 993.185 | 0 / 0 / 0 | $2,25 |

Başarı: native 3/3, eco 3/3, normal 2/3, premium 2/3. Ajan sayısı her koşuda 1 —
hiçbir koşul alt ajan açmadı.

## 3. Çıkarımsal analiz

Blok eşlemeli işaret değiş-tokuşlu permütasyon testi, 6 çift × 3 metrik = 18 test,
Bonferroni eşiği p < 0,00278. **On sekiz testin tamamı "ayırt edilemedi".** n=3 blokla
ulaşılabilir en küçük iki yönlü p 0,25'tir; bu tasarım anlamlılık üretemez, yalnız büyük
ve tutarlı farkları eleyebilir. Elediği şudur:

- **Süre:** koşullar arası ortalama fark ≤ %6,1 ve yönü tutarsız. Mikro benchteki %16
  yavaşlama büyük görevde görünmüyor.
- **Taze token:** en büyük fark normal−native %5,6 (p=0,5). Mikro benchteki %33'lük
  eklenti yükü büyük görevde amorti oluyor — kanca/bağlam maliyeti sabit, iş büyüyünce
  oransal olarak eriyor.
- **Maliyet:** $2,25–2,54 bandı, örtüşen dağılımlar.
- **Kusur:** 12 koşunun 10'u sıfır kusur. İki kusurlu koşunun ikisi de eklentili koşulda
  (premium r1: 27, normal r3: 1) ama blok eşlemesinde p=1 — tek blokluk olaylardan
  istatistiksel sonuç çıkmaz.

## 4. Kusurlu koşuların nitel dökümü

- **premium r1 (27 kusur):** 13 araç çağrısıyla erken bitirdi; `mutabakat`/`durum`/
  `hareket` komutları hiç çalışmıyor ("Command failed"), rapor çıktısı biçim
  denetimlerinin çoğunu karşılamıyor. Yarım teslim. Aynı profil r2/r3'te 0 kusur çıkardı.
- **normal r3 (1 kusur):** JSON raporundaki `iadeliSatislar` listesi iadesiz satırları
  da içeriyor — tek süzgeç kuralı kaçmış.

## 5. Dürüstlük şerhleri

- n=3 blok: p tabanı 0,25; hiçbir karşılaştırma anlamlı çıkamaz. Bu tur bir **tarama**dır —
  büyük fark olsaydı tutarlı yön + büyük etki olarak görünürdü, görünmedi.
- Kusur dağılımı aşırı çarpık (0,0,27); ortalama/ss bu metrikte yanıltıcıdır, ham üçlü
  rapor edildi.
- İki blok arasında 2,5 saatlik ara var (oturum limiti). Blok eşleme bunu soğurur ama
  bloklar-arası koşul×zaman etkileşimi n=3'te sınanamaz.
- Harness eklentinin **tek-oturum headless** maliyetini ölçer. Eklentinin asıl iddiası
  (çok-ajanlı relay orkestrasyonu, oturum sürekliliği, sözleşme akışı) bu düzenekte hiç
  tetiklenmedi — o eksen ölçülmedi.

## 6. Hüküm — gold mu, çöp mü, hava mı?

Ölçülen eksende (tek oturumluk gerçek iş): **hava.** Eklenti bu görev sınıfında ölçülebilir
fayda üretmiyor — başarı, süre, token ve maliyette native'den ayırt edilemiyor. Aynı veriyle
**çöp de değil**: mikro görevlerdeki %33 token yükü gerçek iş boyutunda ≤%6'ya amorti oluyor,
sistematik yavaşlatma ya da bozma kanıtı yok.

İki açık uç bu hükmün sınırı:

1. **Premium r1 uyarısı:** 3 premium koşusunun 1'i yarım teslimle 27 kusur verdi. n=1,
   gürültü olabilir; ama "premium profili headless'ta erken bitirmeye meyilli mi" sorusu
   tekrar koşusuyla izlenmeye değer.
2. **Gold iddiası sınanmadı:** eklentinin varlık sebebi orkestrasyon; bu harness tek-ajan
   headless koşar. Gold/çöp kararı o eksende ancak çok-oturumlu, işi ajanlara bölen bir
   düzenekle verilebilir — mevcut sonuç yalnız "eklenti taşımak bedava değil ama ucuz"
   diyor.
