# DSPy

## 1. Ne yapıyor, hangi problemi çözüyor

Prompt yazmak yerine program yazmayı öneriyor. Modülleri Python'da bileşen olarak
tanımlıyorsun (`Signature`, `Module`), sonra bir optimizer prompt'ları ve örnekleri
**ölçülen bir metriğe göre** derliyor. Slogan: *"Programming—not prompting—Foundation
Models."*

Bu listede tek "ajan orkestrasyonu değil" olan depo. Buraya alınma sebebi şu: bizim
sorunumuz "ajan açmanın sabit maliyeti yüksek", ve DSPy bu maliyeti düşürmenin bambaşka
bir yolunu gösteriyor — **ajanı ucuzlatmak yerine prompt'u ölçülü hâle getirmek.**

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Sınır üçe ayrılmış ve bu ayrım fikrin kendisi:

- **Program** — ne yapılacağı (signature + module bileşimi). Elle yazılır.
- **Metrik** — iyi neye denir. Elle yazılır.
- **Prompt / örnekler / ağırlıklar** — optimizer üretir. Elle yazılmaz.

Bizim tarafta karşılığı: ajan brifingi elle yazılan bir metin. DSPy'ın iddiası bunun
elle yazılmaması gerektiği; ölçüye göre üretilmesi gerektiği.

Ayrıca `dspy/utils/usage_tracker.py` ile bir kullanım muhasebesi var.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

Ölçülebilir metrik + optimizer döngüsü. Bir metrik tanımlamadan DSPy hiçbir şey
optimize edemez; yani çerçeve **ölçüm yoksa iyileştirme yok** kuralını mimari olarak
dayatıyor.

Yanında `UsageTracker`: LM adı başına kullanım kayıtlarının listesini tutuyor
(`{"openai/gpt-4o-mini": [{"prompt_tokens": 100, "completion_tokens": 200}, ...]}`),
`get_total_tokens()` ile toplam veriyor. `_merge_usage_entries` iç içe sözlükleri de
topluyor — yani sağlayıcının detay alanları (cache, reasoning) kaybolmuyor.

`track_usage` bir context manager: **ölçüm bir kapsam içinde açılıp kapanıyor.** Global
sayaç değil, ölçmek istediğin bloğu sarmalıyorsun. Bu, "denetçi kaç token harcadı"
sorusunun temiz cevabı.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`pip install dspy`. README neredeyse tamamen `dspy.ai` belgelerine yönlendiriyor —
depo README'si bilinçli olarak ince tutulmuş, kurulum ve atıf dışında içerik yok.

İlk çalıştırma bir LM yapılandırması + bir signature + bir module. Optimizasyon için
ayrıca bir eğitim kümesi ve metrik gerekiyor — yani **ilk faydayı görmek için üç şey
hazırlaman gerekiyor**, bu giriş engelini yükseltiyor.

## 5. Alınmaya değer en fazla 3 fikir

**1. Kapsamlı token ölçümü (`track_usage` deseni).**
Ne: global sayaç yerine, ölçmek istediğin bloğu saran bir kapsam; kapsam kapanınca o
bloğun LM başına token toplamı çıkıyor.
Neden değerli: bench'te `premium` koşusunun ajan sayısı kayıp, token ölçümü eksik
(BENCH-SONUC.md tablosunda "sayı kayıp" ve "ölçüm eksik" yazıyor). Kapsamlı ölçüm bu
boşluğu kapatır: her ajan açılışı bir kapsam, kapanışta token yazılır. Karşılaştırma
"227k'ya karşı 113k" değil, "ajan-1: 31k, ajan-2: 24k, denetçi-1: 18k" olur.
Maliyet: düşük — kapsam açma/kapama zaten sözleşme yaşam döngüsüyle örtüşüyor. Ölçüm
sağlayıcı yanıtından okunuyor, ek çağrı yok.

**2. Metriksiz iyileştirme yok kuralı.**
Ne: çerçeve, ölçülebilir bir metrik tanımlanmadan optimize etmeyi reddediyor.
Neden değerli: bench'imizin en dürüst bulgusu "doğruluk bu bench'i ayırmadı" oldu —
dördü de geçti. Yani seçtiğimiz metrik (en derin doğru perft) ayırt etmiyordu. Ayıran
şeyler hız (12,2 sn ile 23,2 sn arası), kod boyutu (750 ile 2825 satır arası) ve token
(113k ile 350k arası) çıktı. DSPy'ın kuralı bunu baştan zorlar: metriği önce tanımla,
sonra koş.
Maliyet: sıfır kod, yüksek disiplin. Bir sonraki bench'te metrik önden yazılmalı.

**3. Brifingi elle yazma, ölçüye göre üret.**
Ne: prompt bir sabit değil, metriğe göre derlenen bir çıktı.
Neden değerli: bizim ajan brifinglerimiz elle yazılmış sabit metinler ve token
maliyetinin ana kalemi. "Bu brifingin hangi paragrafı çıkarılırsa sonuç bozulmaz"
sorusu ölçüyle cevaplanabilir — brifingi kısaltıp aynı sözleşmeyi tekrar koşmak.
`premium` iki koşusunun 2825 ve 1411 satır çıkarması gösteriyor ki varyans zaten yüksek;
bu yüzden brifing kısaltma denemesi **tek koşuyla değil, en az üç koşuyla** ölçülmeli.
Maliyet: yüksek — her deneme tam bir bench koşusu. `premium-2` koşusu 27 dakika sürdü;
üç koşuluk bir karşılaştırma yaklaşık 1,5 saat ve ~1M token.

## 6. Şüpheli/riskli yanlar

- **Lisans:** MIT (`gh api repos/stanfordnlp/dspy`). OSI onaylı. "DSPy" adı akademik
  köken taşıyor; ayrı marka koruması bu taramada bulunmadı.
- **Konu dışılık riski.** DSPy çok ajanlı orkestrasyon çerçevesi değil. Ajan başına sabit
  maliyet, ajan açma eşiği, ajanlar arası iletişim ve denetçi konularında **hiçbir
  mekanizma sunmuyor**. Alınabilecek tek şey ölçüm disiplini.
- **Son push 2026-08-21, son sürüm `3.3.1` (2026-08-21)** — çok canlı. Ama 3.x'e geçiş
  büyük kırıcı değişiklikler içeriyor; eski öğreticiler çalışmıyor.
- **Açık issue: 643** (2026-08-22), 37.498 yıldız.
- **README bilinçli olarak boş.** Tüm içerik `dspy.ai` sitesinde; depo README'si mimari
  bilgi vermiyor. Belgeler dış siteye bağımlı — site değişince birincil kaynak kayboluyor.
- **Makale iddiaları rapora alınmadı.** README'de sekiz makale listeli (GEPA, MIPRO,
  DSPy vb.) ve bunlar sayısal iyileştirme iddiaları taşıyor. Bu taramada hiçbiri birincil
  kaynaktan okunmadı — **doğrulanamadı.**
- **Gizli kurulum maliyeti:** optimizasyon için eğitim kümesi ve metrik hazırlamak
  gerekiyor; ayrıca optimizer koşusu kendisi çok sayıda LM çağrısı yapıyor. Yani
  "prompt'u ucuzlatma" işleminin peşin bir token maliyeti var ve bu maliyet README'de
  nicel olarak verilmiyor.

## Kaynaklar

- `gh api repos/stanfordnlp/dspy` — 37.498 yıldız, 643 açık issue, MIT, son push
  2026-08-21T23:07:33Z, oluşturma 2023-01-09.
- `gh api repos/stanfordnlp/dspy/releases/latest` — `3.3.1`, 2026-08-21T23:07:09Z.
- README — "Programming—not prompting", kurulum, makale listesi, belgelerin `dspy.ai`'de
  olduğu.
- `dspy/utils/usage_tracker.py` — `UsageTracker`, `add_usage`, `get_total_tokens`,
  `_merge_usage_entries`, `track_usage` context manager.
