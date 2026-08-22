# crewAI

## 1. Ne yapıyor, hangi problemi çözüyor

Rol tabanlı ajan ekipleri. `Agent` (rol, hedef, arka plan), `Task` (iş), `Crew` (ekip +
süreç). İki süreç tipi var: `sequential` (görevler sırayla) ve `hierarchical` (bir yönetici
ajan görevleri dağıtır).

Bizim için değeri: **token kullanımını ekip ve ajan düzeyinde raporlayan yerleşik bir
yapıya sahip.** Aday listesindeki çerçeveler arasında ölçümü en ayrıntılı olan bu.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

`lib/crewai/src/crewai/` altında geniş bir yüzey: `agent/`, `agents/`, `crew.py`,
`task.py`, `flow/`, `memory/`, `knowledge/`, `rag/`, `tools/`, `telemetry/`, `llm.py`,
`process.py`, `utilities/`.

`crew.py` içindeki maliyetle ilgili sınırlar:

- `manager_agent` / `manager_llm` — hiyerarşik süreçte zorunlu; yoksa doğrulama hatası
  veriyor (`missing_manager_llm_or_manager_agent`).
- `manager_agent` ekibin normal ajanları arasında olamaz (`manager_agent_in_agents`) —
  yönetici işçi olamaz, rol karışması engellenmiş.
- Yönetici oluşturulurken `manager_agent.allow_delegation = True` zorlanıyor; buna karşılık
  başka bir kod yolunda `agent.allow_delegation = False` set ediliyor. Yani **delege etme
  yetkisi rol bazında açılıp kapanan bir bayrak.**
- `max_rpm` — dakikada istek tavanı, `RPMController` ile uygulanıyor.
- `planning` / `planning_llm` — ayrı bir planlayıcı LLM, `CrewPlanner` üzerinden.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

`UsageMetrics`. `types/usage_metrics.py` içinde alanlar:

- `total_tokens`
- `prompt_tokens`
- `cached_prompt_tokens`
- `completion_tokens`
- `reasoning_tokens` (o-serisi / Gemini thinking)
- `cache_creation_tokens` (Anthropic cache yazımları)
- `successful_requests`

`crew.py` bunu `calculate_usage_metrics()` ile koşu sonunda dolduruyor ve
`add_usage_metrics()` ile birden çok crew'ün metriğini topluyor.

Önemli olan **ayrıştırma**: cache okuması ile cache yazımı ayrı, reasoning token'ı ayrı
sayılıyor. Bizim bench'imizde "227k'ya karşı 113k" tek sayıydı; bu sayının ne kadarının
cache yazımı, ne kadarının brifing tekrarı olduğu bilinmiyor. crewAI'ın kalem ayrımı
tam olarak bu soruyu cevaplıyor.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`pip install crewai`, CLI ile proje iskeleti. Ajan ve görevler YAML ya da Python'da
tanımlanıyor, `crew.kickoff()` ile koşuyor.

Hata hâli yapılandırma doğrulamasında güçlü: hiyerarşik süreçte yönetici tanımlanmamışsa,
yönetici ajan aynı zamanda işçi olarak listelenmişse hata veriyor. Koşu sonunda
`crew.usage_metrics` okunabiliyor.

Bütçe tavanı yok: `max_rpm` **hız** sınırı, **maliyet** sınırı değil. Token aşımında
duran bir mekanizma bu taramada bulunmadı.

## 5. Alınmaya değer en fazla 3 fikir

**1. Token'ı tek sayı değil, altı kalemde ölç.**
Ne: `prompt_tokens`, `cached_prompt_tokens`, `cache_creation_tokens`,
`completion_tokens`, `reasoning_tokens`, `successful_requests` ayrı sayılır.
Neden değerli: bench'te elimizde tek sayı var — `normal` 226.856, `yalin` ~113.000,
`premium-2` ~350.000. Bu sayılarla "ajan açmak neden pahalı" sorusunu cevaplayamıyoruz.
Kalem ayrımı olsaydı brifing tekrarının `prompt_tokens` mi yoksa `cache_creation_tokens`
mi olduğunu görürdük — ikisi tamamen farklı çözümler gerektiriyor.
Maliyet: düşük. Sağlayıcı yanıtı bu alanları zaten döndürüyor; gereken şey ölçü satırında
altı alan. Bir sonraki bench koşusundan itibaren toplanabilir.

**2. `allow_delegation` — delege etme yetkisini rol bazında kapat.**
Ne: her ajanın "başkasına iş verebilir mi" bayrağı var; yönetici için `True`, işçi için
`False` zorlanıyor.
Neden değerli: bizde ajan zinciri derinleşebiliyor ve her seviye kendi sabit maliyetini
ekliyor. Tek seviyeli delege (`yalnız ana oturum ajan açar`) kuralı, ajan sayısının üst
sınırını doğrudan belirler. `normal` koşusunda 4 ajan × ~28k = ~112k; ikinci seviye
açılsaydı bu katlanırdı.
Maliyet: sıfıra yakın — sözleşme şemasında tek bayrak. Ölçüsü: koşu başına açılan toplam
ajan sayısı ve maksimum derinlik.

**3. Yöneticiyi işçi listesinden çıkarmayı zorunlu kıl.**
Ne: `manager_agent_in_agents` doğrulaması — yönetici aynı ekipte işçi olarak duramaz.
Neden değerli: bizde ana oturum hem dağıtıcı hem işçi. `eco` koşusu hiç ajan açmadı ve
işi ana oturumda tuttu (157.709 token), `normal` böldü (226.856). Rolün açıkça ayrılması
"ana oturum ne zaman kendi yapar, ne zaman dağıtır" kararını yapılandırma hatası
seviyesinde denetlenebilir yapar.
Maliyet: düşük, ama davranış değişikliği — ana oturumun kendi kod yazmasını kısıtlamak
`eco`'nun kazandığı yolu kapatır. Karşılaştırmalı ölçüm gerektirir.

## 6. Şüpheli/riskli yanlar

- **Lisans:** MIT (`gh api repos/crewAIInc/crewAI`). OSI onaylı. "CrewAI" markası
  CrewAI Inc.'e ait; depo ile ticari `CrewAI Enterprise` ürünü ayrı — bu taramada marka
  koruma metni ayrıca incelenmedi.
- **Sürüm hızı çok yüksek.** Son sürüm `1.15.17`, 2026-08-20; son push 2026-08-22.
  Yama numarası 17'de — haftalık birden fazla sürüm demek. API sabitliği beklenmemeli.
- **Açık issue: 825** (2026-08-22). 57.460 yıldıza göre yüksek; bakım yükü ağır.
- **Klasör yolu değişmiş.** Paket artık `lib/crewai/src/crewai/` altında; eski
  `src/crewai/` yolunu veren belgeler ve blog yazıları geçersiz. Bu taramada ilk deneme
  404 verdi.
- **Ölçüm var, eşik yok.** `UsageMetrics` koşu sonunda dolduruluyor; **koşu sırasında
  bütçe aşımını durduran bir mekanizma yok.** `max_rpm` hız sınırı, maliyet sınırı değil.
  Yani "ölç ama durdurma" — SWE-agent'ın tersi.
- **Bağımlılık yüzeyi geniş.** `rag/`, `knowledge/`, `memory/`, `telemetry/`, `a2a/`,
  `mcp/` gibi çok sayıda alt sistem tek pakette. Yalnız orkestrasyon isteyen için ağır.
- **`telemetry/` klasörü var** — varsayılan olarak ne gönderdiği bu taramada
  incelenmedi; kapalı ortamda kullanılacaksa önce bakılmalı.

## Kaynaklar

- `gh api repos/crewAIInc/crewAI` — 57.460 yıldız, 825 açık issue, MIT, son push
  2026-08-22T02:36:57Z, oluşturma 2023-10-27.
- `gh api repos/crewAIInc/crewAI/releases/latest` — `1.15.17`, 2026-08-20T00:27:23Z.
- `lib/crewai/src/crewai/types/usage_metrics.py` — `UsageMetrics` alanları.
- `lib/crewai/src/crewai/crew.py` — `manager_agent`, `manager_llm`, `max_rpm`,
  `planning` / `planning_llm`, `allow_delegation`, `calculate_usage_metrics()`,
  `add_usage_metrics()`, `missing_manager_llm_or_manager_agent`,
  `manager_agent_in_agents` doğrulamaları.
- `lib/crewai/src/crewai/utilities/rpm_controller.py`, `planning_handler.py` — dosya
  varlığı listeden doğrulandı.
