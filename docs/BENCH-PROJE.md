# Proje bench'i — ağır görev, 4 koşul × 3 blok

> **GEÇERSİZLİK UYARISI (26.08.2026)**
>
> Bu sürüm geçersiz koşulara dayanan hükümler içerir. 12 koşunun 6'sı tek paylaşılan
> hesabın oturum kotasına çarpıp ortasından kesildi (`You've hit your session limit`);
> `kos.js` çıkış kodunu başarı kararına katmadığı için kesilmiş koşular geçerli sonuç
> gibi rapora girdi. Kesilen koşular elendiğinde **eklentili koşullarda hiç kusur
> kalmıyor.**
>
> Aşağıda üstü çizili satırlar geri çekilmiştir; silinmedi, altlarına düzeltme notu
> eklendi. Geçerli koşu sayısı azaldığı için istatistik yeniden koşulana dek yerlerine
> yeni sayısal hüküm konmadı — **yeterli veri yok.** Bulguların özeti sondaki
> "Errata ve bulgular" bölümünde; kaynak `docs/BRIFING-ONARIM.md` §2.

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
- ~~**Tasarım:** randomize blok — 3 tekrar bloğu; blok içinde 4 koşul eşzamanlı (yük adil),
  bloklar sıralı.~~
  **Düzeltme (26.08.2026):** hiçbir rastgeleleştirme yoktu; koşul sırası her blokta sabitti
  (premium, normal, eco, native). Tasarım "randomize blok" değil, sabit sıralı bloktur.
- r1 bloğu 13:08'de, r2/r3 blokları 15:31'de koştu (oturum limiti molası;
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

~~Başarı: native 3/3, eco 3/3, normal 2/3, premium 2/3.~~ Ajan sayısı her koşuda 1 —
hiçbir koşul alt ajan açmadı.

**Düzeltme (26.08.2026):** tablonun `cache-read ort` sütunu ve ondan çıkarılan "eco en çok
bağlam okudu" okuması geri çekilmiştir. r(tur, cacheRead) = 0,992; sıralama tur sayısı
sıralamasının aynısıdır (native 16,0 · premium 16,7 · normal 21,0 · eco 24,7). Metrik
profili değil iş hacmini ölçüyor ve `tazeToken` ile çift sayım yapıyor. Ayrıca `kusur`
sütunundaki premium r1 = 27 değeri kesilmiş bir koşudan gelir (bkz. §4); başarı sayıları
da kesilmiş koşuları geçerli saydığı için geçersizdir. Geçerli koşularla yeniden
hesaplanana dek bu satırlardan sonuç çıkarılmamalı — yeterli veri yok.

## 3. Çıkarımsal analiz

**Düzeltme (26.08.2026):** bu bölümdeki bütün testler 12 koşunun tamamını geçerli sayar;
6'sı kesilmiştir. Aşağıdaki p değerleri ve fark yüzdeleri bu yüzden bağlayıcı değildir.
Analiz geçerli koşu kapısıyla yeniden koşulana dek yeterli veri yok.

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
- ~~**Kusur:** 12 koşunun 10'u sıfır kusur. İki kusurlu koşunun ikisi de eklentili koşulda
  (premium r1: 27, normal r3: 1) ama blok eşlemesinde p=1 — tek blokluk olaylardan
  istatistiksel sonuç çıkmaz.~~
  **Düzeltme (26.08.2026):** iki kusurlu koşunun ikisi de artefakttır. premium r1 kota
  kesintisi (§4), normal r3 fixture belirsizliği (§4). Kesilen koşular elendiğinde
  eklentili koşullarda hiç kusur kalmıyor.

## 4. Kusurlu koşuların nitel dökümü

- ~~**premium r1 (27 kusur):** 13 araç çağrısıyla erken bitirdi; `mutabakat`/`durum`/
  `hareket` komutları hiç çalışmıyor ("Command failed"), rapor çıktısı biçim
  denetimlerinin çoğunu karşılamıyor. Yarım teslim. Aynı profil r2/r3'te 0 kusur çıkardı.~~
  **Düzeltme (26.08.2026):** koşu erken bitmedi, ortasından kesildi — hesap oturum
  kotasına çarptı (`You've hit your session limit`). Model `rapor.js`'i yazmış, `cli.js`'e
  sıra gelmemişti; 27 kusurun hemen hepsi "CLI dosyası yok" diye patlayan komut testi.
  Aynı blokta dört profil de aynı duvara çarptı; farkı yaratan yalnız kesinti anında
  hangi dosyanın yazılmış olduğuydu. Bu koşu geçersizdir, profil davranışı hakkında
  hiçbir şey söylemez.
- ~~**normal r3 (1 kusur):** JSON raporundaki `iadeliSatislar` listesi iadesiz satırları
  da içeriyor — tek süzgeç kuralı kaçmış.~~
  **Düzeltme (26.08.2026):** model hatası değil, istem belirsizliğiydi —
  `iadeAdedi`/`iadeToplami` fixture'da tanımsızdı. `bench/gorevler/proje.md` bu arada
  düzeltildi.

## 5. Dürüstlük şerhleri

- n=3 blok: p tabanı 0,25; hiçbir karşılaştırma anlamlı çıkamaz. Bu tur bir **tarama**dır —
  büyük fark olsaydı tutarlı yön + büyük etki olarak görünürdü, görünmedi.
- ~~Kusur dağılımı aşırı çarpık (0,0,27); ortalama/ss bu metrikte yanıltıcıdır, ham üçlü
  rapor edildi.~~
  **Düzeltme (26.08.2026):** 27 değeri kesilmiş koşudan gelir; çarpıklık gerçek bir kalite
  dağılımı değil, veri kusurudur.
- İki blok arasında 2,5 saatlik ara var (oturum limiti). Blok eşleme bunu soğurur ama
  bloklar-arası koşul×zaman etkileşimi n=3'te sınanamaz.
- Harness eklentinin **tek-oturum headless** maliyetini ölçer. Eklentinin asıl iddiası
  (çok-ajanlı relay orkestrasyonu, oturum sürekliliği, sözleşme akışı) bu düzenekte hiç
  tetiklenmedi — o eksen ölçülmedi.

## 6. Hüküm — gold mu, çöp mü, hava mı?

**Düzeltme (26.08.2026):** aşağıdaki hüküm 12 koşunun tamamını geçerli sayan veriye
dayanır; 6'sı kesilmiştir. Bu haliyle bağlayıcı değildir. Hükmün yönü hakkında geçerli
koşularla yeniden koşulana dek yeterli veri yok.

Ölçülen eksende (tek oturumluk gerçek iş): **hava.** Eklenti bu görev sınıfında ölçülebilir
fayda üretmiyor — başarı, süre, token ve maliyette native'den ayırt edilemiyor. Aynı veriyle
**çöp de değil**: mikro görevlerdeki %33 token yükü gerçek iş boyutunda ≤%6'ya amorti oluyor,
sistematik yavaşlatma ya da bozma kanıtı yok.

İki açık uç bu hükmün sınırı:

1. ~~**Premium r1 uyarısı:** 3 premium koşusunun 1'i yarım teslimle 27 kusur verdi. n=1,
   gürültü olabilir; ama "premium profili headless'ta erken bitirmeye meyilli mi" sorusu
   tekrar koşusuyla izlenmeye değer.~~
   **Düzeltme (26.08.2026):** böyle bir açık uç yok. Koşu kota kesintisiyle sonlandı;
   "premium erken bitirmeye meyilli" sorusu geçersiz veriden türetilmiştir ve geri
   çekilmiştir. Kesilen koşular elendiğinde eklentili koşullarda hiç kusur kalmıyor.
2. **Gold iddiası sınanmadı:** eklentinin varlık sebebi orkestrasyon; bu harness tek-ajan
   headless koşar. Gold/çöp kararı o eksende ancak çok-oturumlu, işi ajanlara bölen bir
   düzenekle verilebilir — mevcut sonuç yalnız "eklenti taşımak bedava değil ama ucuz"
   diyor.

## 7. Errata ve bulgular

Dört bağımsız incelemenin çıkardığı bulguların özeti. Ayrıntı: `docs/BRIFING-ONARIM.md` §2.

- **(A) Bench'in yarısı geçersiz veri.** 12 koşunun 6'sı tek paylaşılan OAuth hesabının
  oturum kotasına çarpıp ortasından kesildi. `kos.js` çıkış kodunu başarı kararına hiç
  katmıyor (`kos.js:348-349`, yalnız `dogrula`), kesilmiş koşular geçerli sonuç diye
  rapora girdi. Raporun tek nitel bulgusu — "premium yarım teslim etti" — bu artefakttır.
  Kesilenler atılınca eklentili koşullarda hiç kusur kalmıyor.
- **(B) Cache-read yanlış şeyi ölçüyor.** r(tur, cacheRead) = 0,992; tur başına cache-read
  dört koşulda %10'luk bir bantta. "Eco en çok bağlam okudu" sıralaması aslında tur sayısı
  sıralaması. Eklenti yükünü zaten `tazeToken` ölçüyor; cache-read çift sayım.
- **(C) Tasarımın gücü sıfır.** %10'luk farkı %80 güçle yakalamak için ~12 blok gerekirdi,
  3 kullanıldı. Tur ekseninde model varyansı CV %45. Kalite ekseninde tavan etkisi var:
  görev koşulları ayırt etmiyor. "Randomize blok" denmiş ama rastgeleleştirme yok, sıra
  sabit. Bloklar arası zaman etkisi koşullar arası etkinin üç katı.
- **(D) Profiller kod olarak neredeyse hiçbir şey yapmıyor.** Diskte değişen tek şey profil
  adı ve `autoCompactWindow`. Paralellik, ajan başına model, plan konseyi, worktree
  izolasyonu — hepsi prompt'a enjekte edilen cümleler. `agents/*.md` frontmatter'ında
  `model:` alanı yok. Tek yaptırım `kimlikDenetle()`, sapmayı log'a yazar, bloklamaz.
- **(E) Eklenti yükleniyor ama davranışı değiştirmiyor.** Sistem promptu native'e göre
  belirgin şişiyor; 21 skill ve 7 ajan tanımı yükleniyor. Buna karşılık 12/12 koşuda sıfır
  Agent çağrısı, sıfır Skill çağrısı; araç kümesi her yerde aynı.
- **(F) Görev eklentinin iddiasını sınamıyor.** Tek oturum, tek ajan, temiz fixture, tek
  atışta bitecek iş. Relay orkestrasyonu, oturum sürekliliği, sözleşme akışı tetiklenemez;
  relay koşularda "setup incomplete" diyerek devre dışı kalmış.
- **(G) Fixture'da bir gerçek kusur.** `normal r3`ün tek kusuru istem belirsizliğiydi
  (`iadeAdedi`/`iadeToplami` tanımsız). Düzeltildi.

Sonuç: bu rapor "eklenti değersiz" demiyor; "bu düzenek eklentinin iddiasını ölçmüyor"
diyor. Yeni sayısal hüküm bench geçerli koşu kapısıyla yeniden koşulduktan sonra yazılır.
