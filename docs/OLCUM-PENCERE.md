# Ölçüm · Autocompact penceresi — 200k / 500k / 1M

Yöntem: bench değil, **transkript replay**. Elde bulunan uzun transkriptlerden her asistan
turunun `usage` kalemleri satır satır okundu, kümülatif bağlam eğrisi çıkarıldı, üç eşikte
ne olacağı deterministik olarak hesaplandı. Yeni koşu yok, varyans yok, tekrar edilebilir.

Betik: `scripts/olcum/pencere.js` (salt okur, `readFileSync` kullanmaz, `readline` ile akıtır).

```
node scripts/olcum/pencere.js --enaz 1000000 --adet 20
node scripts/olcum/pencere.js --yan --enaz 100000 --adet 400
```

## Sonuç

**500k.** 1M pencere, ölçülen iş yükünde 200k'ya göre yaklaşık **2,4 kat**, 500k'ya göre
**1,45 kat** daha pahalı; 200k ise ölçülen alt ajan zirvelerinin %8'ini kesecek kadar dar.
500k hem 1M'in taşıma maliyetinin üçte birini geri veriyor hem de ölçülen hiçbir alt ajan
oturumunu kesmiyor (360 oturumun sıfırı 500k'yı aştı).

Bu sonuç kullanıcının sezgisiyle aynı yöne çıktı; aşağıdaki "Ters çıkma ihtimali" bölümü
sonucun neden buna rağmen güvenilir sayıldığını ve nerede zayıf olduğunu yazar.

## Veri

| | Küme A | Küme B |
|---|---|---|
| Dosya | 6 (en büyükler) | 20 |
| Toplam boyut | 203 MB | 419 MB |
| Ana zincir turu | 3.223 | 7.494 |
| Gerçek sıkıştırma olayı | 13 (hepsi `auto`) | 25 (hepsi `auto`) |

En büyük dosya 72 MB. Alt ajan ölçümü ayrı koşuda: 360 `subagents/agent-*.jsonl`.

## Çarpanlar — varsayım, bu makinede ölçülmedi

| Kalem | Çarpan | Kaynak |
|---|---|---|
| `input_tokens` | 1,0x | taban |
| `cache_creation_input_tokens` | 1,25x | Anthropic prompt caching fiyatlaması (5 dk TTL) |
| `cache_read_input_tokens` | **0,1x** | Anthropic prompt caching fiyatlaması |
| `output_tokens` | 5,0x | Opus 5 listesi: 5 $ girdi / 25 $ çıktı per MTok |

Bunlar **belgeye dayalı varsayımdır**, bu makinede fatura ile doğrulanmadı. Hepsi
"girdi eşdeğeri token" biriminde toplanır; dolar iddiası yoktur.

## Sıkıştırma modeli — ölçüldü

Sıkıştırma varsayılmadı, transkriptteki gerçek `compact_boundary` kayıtlarından ölçüldü.

| Ölçü | Değer |
|---|---|
| Tetik | 25/25 `auto` — elle sıkıştırma yok |
| `preTokens` ortanca | 217.390 (en az 216.349 · en çok 443.591) |
| Sonra/önce bağlam oranı | **0,254** (n=13) |
| Sıkıştırma sonrası ilk tur `cache_creation` ortanca | **26.188** |
| Sıkıştırma öncesi normal tur `cache_creation` ortanca | **1.165** |

Fable'ın uyarısı burada **doğrulandı ve sayıldı**: sıkıştırmadan sonraki ilk tur, normal bir
turun **22,5 katı** `cache_creation` yazıyor. Yani her sıkıştırma gerçekten cache'i geçersiz
kılıp pahalı bir tazeleme turu başlatıyor. Simülasyon bu davranışı taklit eder: sıkıştırmadan
sonraki tur soğuk sayılır ve bütün bağlam yeniden `cache_creation` olarak yazılır.

Sıkıştırma özetinin **kendi API çağrısının** `usage` kaydı transkriptte yok — **ölçülmedi**.
Modelde bu çağrı, tüm bağlamın bir `cache_read`'i artı ölçülen 0,254 oranı kadar çıktı olarak
sayılır. Bu tek kalem varsayımdır ve sonucu 1M lehine, 200k aleyhine kaydırır: sıkıştırma
başına maliyet abartılırsa çok sıkıştıran küçük pencere cezalanır. Yani seçilen yön aşağıdaki
sonucun **aleyhine** çalışıyor, lehine değil.

## Cache bayatlaması — ölçüldü

Modelin ilk hâli cache'i hep sıcak varsaydı ve gerçeği %35 aşağıdan ıskaladı. Bayatlama
transkriptten ölçüldü: `cache_creation >= bağlam/2` olan turlar soğuk sayıldı.

| | Küme A | Küme B |
|---|---|---|
| Soğuk tur | 73/3.199 | 153/7.494 |
| Oran | %2,3 | %2,0 |

Simülasyonda her ~49. tur soğuk işlenir. Bu kalem **1M aleyhinedir**: bir soğuk tur, o anda
taşınan bağlamın tamamını 1,25x ile yeniden yazdırır, pencere büyüdükçe pahalanır.

## Eşik karşılaştırması — dört kalem ayrı

Küme B (20 dosya, 7.494 tur). Birim: token; son sütun girdi eşdeğeri.

| Eşik | Sıkıştırma | Ort. taşınan bağlam | `input` | `cache_creation` | `cache_read` | `output` | **Girdi eşdeğeri** |
|---|---|---|---|---|---|---|---|
| 200k | 90 | 121.558 | 0 | 36.939.864 | 919.676.060 | 11.829.044 | **197.287.656** |
| 500k | 29 | 266.304 | 0 | 60.033.407 | 2.026.706.682 | 10.282.950 | **329.127.177** |
| 1M | 11 | 397.090 | 0 | 85.595.586 | 3.231.384.237 | 9.031.440 | **475.290.106** |

1M'e göre: **200k %−58,5 · 500k %−30,8**.

Küme A (6 dosya) aynı yönü verir: 200k %−64,2 · 500k %−34,2. İki bağımsız küme, aynı sıralama.

`input` sütununun sıfır olması modelin sonucudur: benzetim her turun ya sıcak ya soğuk cache
yolundan geçtiğini varsayar, cache'siz girdi kalemi üretmez. Gerçek veride bu kalem toplamın
%0,1'i kadardır, sıralamayı etkilemez.

### Gerçek toplam (transkriptte ölçülen, simülasyon değil)

Küme B: `input` 2.715.630 · `cache_creation` 50.115.992 · `cache_read` 2.087.125.813 ·
`output` 5.834.204 → girdi eşdeğeri 303.244.221.

**`cache_read` payı %97,5.** Fable'ın "taşınan bağlamın çoğu `cache_read` ise on kat ucuzdur"
uyarısı doğru: taşıma gerçekten ucuz. Ama ucuz olması sonucu çevirmiyor, çünkü 0,1x çarpanı
uygulandıktan **sonra** bile `cache_read` toplam maliyetin %69'unu tutuyor — hacim çarpanı
yeniyor.

## Ters çıkma ihtimali — nerede zayıf

Fable küçük pencerenin kâğıt üstünde göründüğünden pahalı çıkabileceğini söyledi. Ölçüm
bunu doğrulamadı; sebebini ve modelin zayıf noktalarını açıkça yazmak gerekiyor.

1. **Model gerçeği %31 aşağıdan ıskalıyor.** Eşik, ölçülen `preTokens` ortancasına
   (217.390) sabitlenip koşulduğunda benzetim 208.840.322, gerçek 303.244.221 verdi.
   Sapma −%31,1. Yön doğru, seviye değil — tablodaki mutlak sayılar değil, **oranlar**
   okunmalıdır.
2. **Sıkıştırma sayısı fazla çıkıyor** (82'ye 25). Sebebi ölçülü: gerçek oturumlar karışık
   pencerelerle koştu, `preTokens` 216k ile 443k arasında dağılıyor; tek bir ortanca eşik
   büyük pencereli oturumları olduğundan sık sıkıştırıyor. Bu sapma **200k'yı cezalandırır** —
   yani gerçek fark muhtemelen 200k lehine daha da büyüktür, tersi değil.
3. **Kalite ölçülmedi.** Bu ölçüm yalnız tokendir. Sıkıştırmanın bağlam kaybı, tekrar eden
   iş, yanlış hatırlama gibi maliyetleri **hiç sayılmadı**. 200k'nın 90 sıkıştırması bu
   sayılmayan maliyetin ana kaynağıdır ve 500k'yı 200k'ya tercih etme gerekçesidir.
4. **Sıkıştırma özetinin kendi çağrısı ölçülmedi** (yukarıda).

## Alt ajan sorusu

Fable: "alt ajanların aldığı bağlamın ne kadarına gerçekten atıf yaptığını say."

**Atıf sayılamadı** — hangi bölüme geri dönüldüğü `usage` alanlarından çıkarılamaz, metin
analizi gerektirir. Bu haliyle **ölçülmedi**. Ölçülen şey boyut tarafı: 360 alt ajan oturumu.

| Ölçü | Değer |
|---|---|
| Tur ortanca | 25 |
| Başlangıç bağlamı ortanca | 24.929 |
| Büyüme ortanca | 61.212 |
| Başlangıç / zirve payı ortanca | **0,266** |
| Zirve bağlam ortanca | 81.839 |
| Zirve en çok | 385.524 |
| 200k aşan | 28/360 (%7,8) |
| 500k aşan | **0/360** |

Alt ajanın taşıdığı bağlamın dörtte üçünü kendi topladığı görülüyor; devredilen paket
zirvenin yalnız %27'si. Hiçbir alt ajan 500k'yı aşmadı, en büyüğü 386k'da kaldı — alt ajan
tarafı 1M için hiçbir gerekçe üretmiyor.

## Karar

**500k.** 1M'in taşıma maliyeti ölçülen iş yükünde karşılığını vermiyor: bağlam %97,5
`cache_read` olsa ve 0,1x ile çarpılsa bile 1M, 500k'nın 1,45 katına mal oluyor, ve ölçülen
360 alt ajan oturumunun hiçbiri 500k'yı aşmıyor. 200k daha ucuz çıkıyor (%−58,5) ama 90
sıkıştırma üretiyor ve alt ajan zirvelerinin %8'ini kesiyor; bu ölçümün saymadığı kalite
maliyeti orada birikir.
