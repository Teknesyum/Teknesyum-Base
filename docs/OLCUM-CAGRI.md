# Ölçüm — relay çağrı defteri ve bölüm kullanımı

Salt ölçüm. Hiçbir dosya değiştirilmedi, hiçbir şey optimize edilmedi. `docs/OPTIMIZASYON.md`
planının Dalga 0'ı: Ö1 (çağrı defteri) ve Ö2 (bölüm kullanım sayımı).

Ölçüm tarihi 22.08.2026. Kaynak: `~/.claude/projects/**` altındaki bütün transkriptler —
14 proje klasörü, **405 `.jsonl` dosyası**, 87 oturum grubu (ana oturum + kendi
`subagents/` klasörü). Betik: `scripts/olcum/relay-defter.js`, satır satır akıtır, hiçbir
şey yazmaz.

---

## 0. En önemli sonuç, başa

**Ana hipotez yanlış çıktı.** `docs/OLCUM-MALIYET.md` §5 bench farkının en güçlü adayı
olarak `relay/SKILL.md`'nin defalarca yüklenmesini gösteriyordu (10.112 × 4 = 40.448,
farka çok yakın). Bench koşularının transkriptleri o ölçüm sırasında "elimde yok"
denmişti; **bu ölçümde bulundular.**

Eco bench koşusu `C--Users-Administrator-Desktop-Projeler/b3e59f34-…` — ilk kullanıcı
mesajı `docs/BENCH-PROMPT.md oku ve uygula. Durum: eco`. O koşuda 70 araç çağrısı var ve
içindeki **tek `Skill` çağrısı `teknesyum:premium`** (profil anahtarı). **`teknesyum:relay`
hiç çağrılmadı — sıfır kez.**

Normal koşu (`71b22475-…`, `Durum: normal`) da aynı: 66 araç çağrısı, tek `Skill` çağrısı
`teknesyum:premium`, relay sıfır.

Yani eco ile yalın koşu arasındaki ~45.000 tokenin **hiçbiri relay gövdesi değil.**
Dalga 1'in gerekçesi bu farksa, gerekçe düşmüştür; relay gövdesini küçültmek bench
farkını kapatmaz. (Relay gövdesi gerçek oturumlarda pahalı — §2 — ama bench koşularında
hiç yüklenmemiş.)

---

## Ö1 · Relay çağrı defteri

### 1.1 Kaç çağrı, kaç oturum

| | |
|---|---:|
| Taranan transkript dosyası | 405 |
| Oturum grubu (ana + alt ajanları) | 87 |
| `teknesyum:relay` / `relay` çağrısı | **83** |
| Deltası ölçülebilen çağrı | 83 |
| Çağrının geçtiği transkript dosyası | 74 |
| Çağrının geçtiği oturum grubu | **15** |
| Bunların alt ajan transkriptinde olanı | **59** |

Transkript dosyası başına: **medyan 1, en çok 8.**
Oturum grubu başına (ana + alt ajanlar birlikte): **medyan 1, en çok 56.**

İki sayının ayrışması ölçümün asıl bulgusu: **83 çağrının 59'u alt ajan transkriptlerinde.**
Tek bir oturum grubunda (`Teknesyum-Base/baefd0ee-…`) 8'i ana oturumda, 48'i alt ajanlarda
olmak üzere 56 relay çağrısı var. Yani çarpan tekrar eden ana oturum çağrısı değil,
**her alt ajanın kendi bağlamında relay'i bir kez daha yüklemesi.**

### 1.2 Kritik sayı — ikinci çağrının deltası

Ölçüm yöntemi: `Skill` çağrısını yapan asistan mesajının toplam girdisi
(`input_tokens + cache_creation_input_tokens + cache_read_input_tokens`) ile bir sonraki
asistan mesajının toplam girdisi arasındaki fark.

Aynı transkript içinde birden çok relay çağrısı olan **üç oturumun tamamı**, çağrı çağrı:

| Oturum | Sıra | Önce | Sonra | Delta | cache_creation | cache_read |
|---|---:|---:|---:|---:|---:|---:|
| `baefd0ee` | 1 | 37.021 | 46.440 | **9.419** | 0 | 33.779 |
| `baefd0ee` | 2 | 68.565 | 78.273 | **9.708** | 0 | 66.543 |
| `baefd0ee` | 3 | 111.105 | 120.662 | **9.557** | 0 | 109.083 |
| `baefd0ee` | 4 | 54.701 | 63.893 | **9.192** | 0 | 52.561 |
| `baefd0ee` | 5 | 106.080 | 115.305 | **9.225** | 0 | 104.058 |
| `baefd0ee` | 6 | 154.591 | 163.815 | **9.224** | 0 | 152.569 |
| `baefd0ee` | 7 | 52.021 | 62.249 | **10.228** | 0 | 49.999 |
| `baefd0ee` | 8 | 76.113 | 86.339 | **10.226** | 0 | 74.091 |
| `78565888` | 1 | 32.387 | 41.669 | **9.282** | 0 | 27.580 |
| `78565888` | 2 | 47.720 | 56.990 | **9.270** | 0 | 45.685 |
| `1ec4b79f` | 1 | 32.738 | 42.070 | **9.332** | 0 | 27.931 |
| `1ec4b79f` | 2 | 86.888 | 97.200 | **10.312** | 0 | 84.784 |

(4 ve 7. sıradaki `önce` değerinin düşmesi araya giren sıkıştırmadan; delta etkilenmiyor.)

**İkinci çağrının deltası birincinin yüzde kaçı:**

| Oturum | 1. delta | 2. delta | Oran |
|---|---:|---:|---:|
| `baefd0ee` | 9.419 | 9.708 | **%103** |
| `78565888` | 9.282 | 9.270 | **%100** |
| `1ec4b79f` | 9.332 | 10.312 | **%110** |

Medyan **%103**.

Sıra gruplarının medyanı da aynı yerde duruyor: 1. çağrı 10.112 (n=74), 2. çağrı 9.708
(n=3), 3. çağrı 9.557 (n=1), 4 ve sonrası 9.225 (n=5).

**Cevap: ikinci çağrı gövdeyi yeniden yazıyor, cache'ten okumuyor.** Gerekçe iki ayrı
gözlem:

1. Bağlam ikinci çağrıda da ~9.700 token **büyüyor**. Cache'ten okunan bir gövde bağlamı
   büyütmez; cache okuması bağlamı ucuzlatır, kısaltmaz.
2. `cache_creation_input_tokens` on iki çağrının **hepsinde 0**, `cache_read` ise bağlamın
   tamamına yakın. Yani prompt cache çalışıyor — ama gövdenin **ikinci bir kopyası**
   cache'lenen içeriğe ekleniyor. Cache maliyeti düşürüyor, tekrarı engellemiyor.

Pratik sonucu: bir oturumda n relay çağrısı ≈ n × ~9.700 token bağlam. Sekiz çağrılık
`baefd0ee` oturumu yalnız relay gövdesine **~76.000 token** ödemiş.

### 1.3 `OLCUM-MALIYET.md`'nin 10.112 × 80 rakamı tutarlı mı

**Evet, ölçüm tutarlı.** Bağımsız olarak yeniden çalıştırıldığında:

| | OLCUM-MALIYET.md | Bu ölçüm |
|---|---:|---:|
| Çağrı sayısı (n) | 80 | **83** |
| Medyan delta | 10.112 | **10.112** |
| En çok | 19.736 | **19.736** |
| En az | 2.776 | −33.754 |

Medyan ve maksimum **birebir** aynı çıktı; yöntem aynı. n farkı (80 → 83) ölçüm tarihinden
sonra biriken üç yeni çağrı. En az değerinin ayrışması yöntem farkı değil eleme farkı:
`OLCUM-MALIYET.md` araya sıkıştırma girmiş çağrıları elemiş, bu betik elemiyor, bu yüzden
negatif delta görünüyor. Medyanı etkilemiyor.

**Ama "10.112 × 80" ifadesi yanıltıcı**, iki ayrı sebeple:

- 10.112 **birinci çağrıların** medyanı (n=74). Tekrar çağrılarda gövde biraz daha ucuz
  oturuyor (9.225–9.708). Oturum içi tekrar için doğru rakam **~9.700**.
- 80 çağrı **tek bir oturumun** yükü değil; 15 oturum grubuna dağılmış. Oturum başına
  medyan 1, en çok 8. Toplam yükü hesaplarken 83 doğru, tek oturumu suçlarken değil.

### 1.4 Bench farkı üzerine — ölçülen kısım

Bench koşularının transkriptleri bulundu ama `BENCH-SONUC.md`'deki token rakamları
transkriptten **yeniden üretilemedi**. Eco koşusu için `usage` toplamları:

| | eco (`b3e59f34`) | normal (`71b22475`) |
|---|---:|---:|
| `input_tokens` | 244 | 226 |
| `cache_creation_input_tokens` | 220.614 | 254.143 |
| `cache_read_input_tokens` | 14.698.129 | 13.979.848 |
| `output_tokens` | 123.047 | 154.780 |
| asistan mesajı | 122 | 113 |

`BENCH-SONUC.md` eco için ~157.709, normal için 226.856 diyor. Bu rakamlar yukarıdaki
hiçbir toplama denk gelmiyor; nasıl türetildiğini **ölçemedim**. Yalın koşunun transkripti
`~/.claude/projects` altında yok — base'siz koşu ayrı bir yapılandırma dizininde
çalıştığı için kaydı buraya düşmemiş.

Kesin olan tek şey §0'daki: **eco koşusunda relay hiç çağrılmadı**, dolayısıyla farkın
açıklaması relay gövdesi değil.

---

## Ö2 · Bölüm kullanım sayımı

Doğrudan ölçülemez; bölümün okunduğunu gösteren iz yok. Deterministik vekil kullanıldı:
bir bölüm iş yaptıysa arkasında araç çağrısı izi bırakır.

Payda seçimi önemli. İki payda birden veriliyor:

- **relaylı grup (15):** relay çağrısı yapılmış oturum grupları. Ö2'nin sorduğu payda bu.
- **tüm grup (87):** izin görüldüğü bütün oturum grupları — bölüm relay çağrısı olmadan
  da uygulanmış olabilir.

| Bölüm | İz | relaylı grup | tüm grup | toplam çağrı |
|---|---|---:|---:|---:|
| §3.1 görev paketi | sözleşme dosyası yazımı | **8 / 15** | 11 | 181 |
| Genel | herhangi `references/*.md` okuması | **4 / 15** | 5 | 21 |
| §1.5 plan konseyi | `planner` (ve eski `usta`) ajanı | **3 / 15** | 6 | 18 |
| §1.4 ön araştırma | `scout` ajanı | **1 / 15** | 7 | 66 |
| §1.4 ön araştırma | `docs/taramalar/` yazımı | **1 / 15** | 7 | 225 |
| §1.5.1 ikinci görüş | `advisor` ajanı | **0 / 15** | 2 | 6 |
| §3.2 rota | `docs/ROTA-*.md` yazımı | **0 / 15** | 1 | 1 |
| §1.6 ürün standardı | `references/standartlar.md` okuması | **0 / 15** | 0 | 0 |

**En çok kullanılan üç bölüm:** §3.1 görev paketi (8/15), genel `references/` okuması
(4/15), §1.5 plan konseyi (3/15).

**En az kullanılan üç bölüm:** §1.6 ürün standardı (0/15, hiç okunmadı — 87 grubun
tamamında sıfır), §3.2 rota (0/15, bütün transkriptlerde toplam 1 yazım), §1.5.1 ikinci
görüş (0/15).

**Dalga 4 için okuma:** en yaygın bölüm bile relaylı oturumların ancak yarısında iz
bırakıyor; beş bölümden üçü relaylı oturumlarda hiç iz bırakmıyor. Tablo "çoğu çağrıda
kullanılmıyor" tarafında. `references/`'a taşıma bu veriye göre yükü artırmaz —
ama bu **bir vekil ölçümü**, bölümün okunduğunu değil, sonucunun görüldüğünü sayıyor
(§Ölçemediklerim, madde 1).

Bir uyarı: relay ajanları çokça kullanılan büyük oturum (`Teknesyum-Base/1fe541f9-…`,
5,8 MB, 66 `scout` çağrısı ve 225 `taramalar/` yazımı) **hiç `Skill` çağrısı yapmıyor**.
Yani §1.4 gerçekte 7 grupta iş yapmış ama bunların 6'sı relay skill'i çağırmadan. Bu,
relaylı paydanın bölüm kullanımını **olduğundan düşük** gösterdiği anlamına gelir.

---

## Ölçemediklerim

1. **Bölümün okunup okunmadığı.** Ö2'nin tamamı vekil ölçümüdür. Bir bölüm okunup
   "gerekmiyor" denerek atlandıysa iz bırakmaz ve bu tabloda kullanılmamış görünür.
   Bunu ölçmenin transkriptten yolu yok.
2. **`BENCH-SONUC.md` token rakamlarının türetimi.** ~157.709 ve 226.856, koşuların
   `usage` toplamlarının hiçbirine denk gelmiyor.
3. **Yalın (base'siz) bench koşusunun transkripti.** `~/.claude/projects` altında yok;
   ayrı yapılandırma dizininde koşmuş. ~113.000 ile karşılaştırmalı kalem dökümü
   yapılamadı.
4. **Eco/yalın farkının kalemleri.** Relay elendi (§0) ama yerine ne geçtiği bulunamadı;
   yalın koşunun kaydı olmadan kalem kalem karşılaştırma mümkün değil.
5. **Skill gövdesinin tam mı kısmi mi yüklendiği.** Delta ~9.700; gövde 47.974 bayt.
   Oran 4,9 bayt/token — `OLCUM-MALIYET.md` §0'daki tutarsızlık aynen duruyor. Gövdenin
   tamamı mı yükleniyor yoksa bir kısmı mı, delta bunu ayırt etmiyor.
6. **`references/` otomatik mi geliyor.** Ölçülen 21 `references/*.md` `Read` çağrısının
   hepsi modelin açık okuması; `Skill` çağrısının references'ı kendiliğinden yükleyip
   yüklemediği yine ayrılamadı.
7. **`baefd0ee` alt ajanlarının hangi tipte olduğu.** 48 alt ajan relay çağırıyor ama
   transkript dosya adından ajan tipi çıkarılamıyor; hangi ajan tipinin relay yüklediğini
   ölçemedim.

---

## Betiği çalıştırma

```
node scripts/olcum/relay-defter.js
```

`~/.claude/projects` altını gezer, JSON basar. Yazma yok. Alanlar: `ozet`, `siraGoreDelta`,
`oturumBasinaDagilim`, `grupBasinaDagilim`, `bolumIzleri`, `cagrilar` (çağrı çağrı ham
veri).
