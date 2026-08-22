# OpenHands

## 1. Ne yapıyor, hangi problemi çözüyor

Kod yazan, terminal çalıştıran, web gezen bir yazılım ajanı. Depo 2026 içinde ikiye
ayrılmış: `OpenHands/OpenHands` artık **Agent Canvas** adlı bir kontrol paneli
(TypeScript/Electron, birden çok ajan arka ucunu yönetiyor), ajanın kendisi
`OpenHands/software-agent-sdk` deposunda (Python).

Bizim sorunumuzla kesişen yeri: **uzun süren tek ajanın bağlamı sınırsız büyüyor** ve
bunu bir "condenser" katmanıyla çözmüşler.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

SDK tarafındaki sınır tek cümleyle özetlenebilir: **olay günlüğü append-only, modele
giden şey bir "View".**

- Konuşma bir olay günlüğü. Hiçbir olay silinmiyor.
- `LLMConvertibleEvent` alt sınıfı olan olaylar mesaja çevriliyor.
- Silme yerine `Condensation` olayı yazılıyor — condenser README'si bunu açıkça
  Cassandra/Kafka'daki **tombstone**'a benzetiyor.
- `View` sınıfı, günlüğü okurken bu tombstone'ları uygulayarak modele gidecek listeyi
  üretiyor.

Sonuç: "unutma" işlemi geri alınabilir ve denetlenebilir. Ajanın gördüğü bağlam küçülüyor
ama kaydın kendisi bozulmuyor.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

`LLMSummarizingCondenser`. Kuralı sert ve sayısal:

- `max_size` varsayılanı **240 olay**. View bunu aşınca yoğunlaştırma tetiklenir.
- `keep_first` varsayılanı **2** — konuşmanın ilk 2 olayı asla özetlenmez.
- Hedef boyut `max_size // 2`, yani **görünümün ilk yarısı tek bir özet olayına indirilir**,
  arka yarı olduğu gibi kalır.
- `minimum_progress` varsayılanı **0.1** — olayların en az %10'u yoğunlaştırılamıyorsa
  işlem yapılmaz (küçük kazanç için cache kırmaya değmiyor).
- `hard_context_reset_context_scaling` **0.8** — özetleme başarısız olursa bağlam
  %80'ine indirilip tekrar denenir, en fazla `hard_context_reset_max_retries` = **5** kez.

Gerekçe README'de dört maddede yazılı ve **ikinci madde doğrudan cache maliyeti**:
yoğunlaştırma prompt cache'i bozar, ama düzenli aralıklarla yapılması cache'i yeniden
kurma maliyetini düşük tutar. Yani "ne zaman özetleyeyim" sorusunu token maliyeti değil,
**token maliyeti + cache maliyeti** birlikte cevaplıyor.

`PipelineCondenser` ile birden çok condenser zincirlenebiliyor; ilki bir `Condensation`
döndürünce zincir kısa devre oluyor.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Agent Canvas tarafı: npm paketi (`@openhands/agent-canvas`), yerelde çalışıyor, Docker/VM
arka uçlarına bağlanabiliyor, Claude Code ve Codex dahil ACP uyumlu ajanları
koşturabiliyor.

SDK tarafı: Python kütüphanesi.

Hata hâli iyi düşünülmüş: yoğunlaştırma her zaman mümkün değil (mesaj yapısı API
kurallarını bozabilir). Condenser bu durumda "şu an gerçekten gerekli mi yoksa sadece üst
sınırı mı koruyorum" diye ayırıyor; ikincisiyse view'i olduğu gibi döndürüyor.
Bağlam penceresi taşması `is_context_window_exceeded` ile sağlayıcı bazında yakalanıyor.

## 5. Alınmaya değer en fazla 3 fikir

**1. Yarıyı özetle, yarıyı bırak — sabit oranlı yoğunlaştırma.**
Ne: bağlam eşiği aşılınca ilk yarıyı tek özete indir, son yarıya dokunma; ilk 2 olayı
(bizde: sözleşme metni) hiç dokunma listesine al.
Neden değerli: bizde uzun ana oturum bağlamı ajan brifinglerine kopyalanıyor. Ana oturum
bağlamı yarıya inerse her yeni ajan brifingi de yarıya iner — kazanç ajan sayısıyla
çarpılır. 4 ajanlı `normal` koşusunda brifing başına ~10k tasarruf 40k eder, 227k'lık
toplamın %18'i.
Maliyet: özetleme bir LLM çağrısı — yoğunlaştırma başına bir ek çağrı. `minimum_progress`
= 0.1 kuralı bu çağrının boşa gitmesini engelliyor.

**2. Silme yerine tombstone.**
Ne: bağlamdan çıkarılan şey dosyadan silinmiyor, "çıkarıldı" olayı yazılıyor; modele
giden liste bu olaylar uygulanarak üretiliyor.
Neden değerli: bizde relay sözleşmeleri ve kayıt noktaları zaten dosyada. Aynı ayrımı
kurarsak "ajanın gördüğü" ile "kayıtta duran" ayrışır — denetçi tam kaydı okur, işçi
kırpılmış görünümü alır. Denetçinin bench'te bulduğu `@types/node` hatası tam kayıt
gerektiren türden.
Maliyet: düşük — dosya zaten append-only; gereken şey okuma tarafında bir görünüm
fonksiyonu.

**3. Yoğunlaştırma eşiğini olay sayısıyla koy, token'la değil.**
Ne: `max_size = 240 olay`, `keep_first = 2`. Token değil olay sayılıyor.
Neden değerli: olay sayısı ölçmesi bedava, token saymak model istemcisi gerektiriyor.
Bizde ajan turları (tool call + sonuç) sayılabilir; "40 turdan sonra özetle" kuralı
transcript'ten doğrulanabilir.
Maliyet: sıfıra yakın — sayaç zaten var. Riski: olay boyutları eşit değil, 240 olay bir
koşuda 50k, başka koşuda 200k token olabilir. Token eşiğiyle birlikte kullanılmalı
(OpenHands da `max_tokens` alternatifini tutuyor).

## 6. Şüpheli/riskli yanlar

- **Lisans:** her iki depo da MIT (LICENSE dosyalarından doğrulandı). OSI onaylı.
  Marka koruması ayrı metin olarak bu taramada incelenmedi.
- **Depo kimliği değişmiş.** `All-Hands-AI/OpenHands` → `OpenHands/OpenHands` yönlendirmesi
  var ve README artık ajanı değil bir kontrol panelini anlatıyor. Python ajanı
  `OpenHands/software-agent-sdk`'ya taşınmış (1.017 yıldız, 362 açık issue). **Eski
  belgelere ve blog yazılarına dayanan her yol adı yanlış olabilir** — bu taramada
  `openhands/memory/condenser` yolu 404 verdi, doğru yol SDK deposunda bulundu.
- **Açık issue:** ana depo 534, SDK 362 (2026-08-22). İkisi de yüksek.
- **Sürüm hızı:** ana depoda `v1.15.0`, 2026-08-21 — çok taze, yani API oturmamış olabilir.
- **Doğrulanmayan iddia:** condenser README'si stratejinin *"performs well in benchmarks"*
  dediğini yazıyor ama hangi benchmark, hangi sayı yazmıyor — **doğrulanamadı.**
- **Gizli kurulum maliyeti:** Agent Canvas Electron + npm + Docker arka ucu istiyor.
  Bizim için alınacak olan yalnız condenser deseni; ürünün kendisi bağımlılık olarak
  ağır.

## Kaynaklar

- `gh api repos/All-Hands-AI/OpenHands` → `OpenHands/OpenHands` — 84.780 yıldız, 534 açık
  issue, MIT, son push 2026-08-22T13:24:50Z.
- `gh api repos/OpenHands/OpenHands/releases/latest` — `v1.15.0`, 2026-08-21T14:01:34Z.
- `gh api repos/OpenHands/software-agent-sdk` — 1.017 yıldız, 362 açık issue, MIT, son
  push 2026-08-22T13:13:01Z.
- `openhands-sdk/openhands/sdk/context/condenser/README.md` — tombstone benzetmesi,
  dört maddelik gerekçe, tetikleme koşulları, başarısızlık davranışı.
- `.../condenser/llm_summarizing_condenser.py` — `max_size=240`, `keep_first=2`,
  `minimum_progress=0.1`, `hard_context_reset_max_retries=5`,
  `hard_context_reset_context_scaling=0.8`.
- `.../condenser/pipeline_condenser.py` — zincirleme ve kısa devre.
