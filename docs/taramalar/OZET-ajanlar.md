# Özet — ajan orkestrasyon çerçeveleri

On depo tarandı. Aranan şey mimari değil maliyet: ajan açmanın sabit maliyeti nasıl
düşürülmüş, ajan açma kararı neye göre veriliyor, ajanlar arası iletişimde ne taşınıyor,
denetçi nasıl finanse ediliyor, ölçüm var mı.

Karşılaştırma zemini kendi bench'imiz: aynı iş, base'li koşu **226.856 token**, base'siz
koşu **~113.000 token** (`docs/BENCH-SONUC.md`). 4 ajan açılmıştı, ajan başına yaklaşık
**28.000 token** sabit maliyet.

## Tablo

| Depo | Ajan maliyetini düşürme yöntemi | Eşik kuralı var mı | Ölçüm var mı |
|---|---|---|---|
| **SWE-agent** | `history_processors` zinciri: `LastNObservations` (makalede n=5) eski gözlemleri kırpar, `CacheControlHistoryProcessor` prompt cache işaretler, `polling` cache kırılmasını seyreltir | **Var, para birimiyle.** `per_instance_cost_limit` varsayılan **$3.00**; `total_cost_limit`, `per_instance_call_limit`. Aşımda `InstanceCostLimitExceededError` fırlar. Yeniden deneme döngüsünde "yeni denemeye başlamak için kalması gereken en az $" alanı | **Var.** `InstanceStats.instance_cost`, `GLOBAL_STATS.total_cost`; denetim maliyeti bütçede **ayrı kalem** |
| **OpenHands** | `LLMSummarizingCondenser`: görünümün ilk yarısı tek özet olayına iner, arka yarı dokunulmaz; silme yerine tombstone olayı (append-only günlük) | **Var, olay sayısıyla.** `max_size=240` olay, `keep_first=2`, `minimum_progress=0.1` (az kazanç için cache kırma), `hard_context_reset_context_scaling=0.8` | Kısmen. Condenser README'si cache maliyetini gerekçe olarak yazıyor; koşu düzeyinde toplam raporu bu taramada bulunmadı |
| **langgraph** | Paylaşılan durum (`channels/` + reducer) = blackboard, mesaj kopyalanmaz. Devirde yalnız **handoff çifti** taşınır (tool-call AI mesajı + ToolMessage); ek bağlam gerekirse ham geçmiş değil özet | **Var, ama üst katmanda.** Deep Agents belgesi: özetleme `max_input_tokens` değerinin **%85**'inde, profil yoksa **170.000** token / **6 mesaj**, son bağlamın **%10**'u tutulur, **20.000** token üstü araç çıktısı dosyaya taşınır. Ayrıca kural: çoğu handoff için tek ajan + middleware kullan | Kısmen. LangSmith üzerinden — **ayrı, ticari ürün** |
| **microsoft/autogen** | `SocietyOfMindAgent` iç takımı tek ajan gibi paketler (iç konuşma dışarı çıkmaz, sonra takım reset). `MessageFilterAgent` kaynak bazlı süzme (`first N` / `last N`). `model_context` beş strateji: unbounded / buffered / token-limited / head-and-tail | **Yok.** `token_limit` elle veriliyor, ajan açma kararı için eşik yok. `max_tool_iterations` var ama token değil tur sayar | Zayıf. `RequestUsage` ile çağrı başına; takım düzeyinde toplam bulunmadı |
| **crewAI** | Hiyerarşik süreçte yönetici ajan; `allow_delegation` rol bazlı bayrak; ayrı `planning_llm` | Kısmen. `max_rpm` **hız** sınırı, maliyet sınırı değil. Yapılandırma doğrulaması: yönetici zorunlu, yönetici işçi listesinde olamaz | **Var ve en ayrıntılı.** `UsageMetrics`: `prompt_tokens`, `cached_prompt_tokens`, `cache_creation_tokens`, `completion_tokens`, `reasoning_tokens`, `successful_requests`. Ama ölç ama durdurma — aşımda kesen yok |
| **openai/swarm + openai-agents-python** | Devirde **yeni bağlam açılmaz** — devralan aynı mesaj listesini sürdürür, değişen yalnız sistem promptu ve araç kümesi. `remove_all_tools` devirden önce tüm araç öğelerini siler. Ayrıca araç-olarak-ajan ile devir ayrı kavram | **Yok.** Tek tavan `max_turns` (Swarm'da varsayılan sonsuz). Token/dolar tavanı yok | Kısmen. Agents SDK'da Tracing + usage; Swarm'da yok |
| **MetaGPT** | Paylaşılan `Environment` mesaj havuzu + abonelik: `publish_message` sonra `is_send_to(message, addrs)`; rol `_watch(actions)` ile yalnız izlediği eylem tipini okur. Brifing yerine abonelik | Kısmen. `max_react_loop` varsayılan **1** — rol tek turda işini yapar. Token eşiği yok | **Yok.** Token/maliyet sayacı bu taramada bulunmadı. Desen mantıklı, kazancı projenin kendisi tarafından da ölçülmüyor |
| **DSPy** | Orkestrasyon değil: prompt'u elle yazmak yerine ölçülen metriğe göre derliyor. Ajan maliyeti mekanizması yok | **Yok** (konu dışı) | **Var.** `UsageTracker` + `track_usage` **context manager** — global sayaç değil, ölçülen blok sarmalanıyor; LM başına prompt/completion toplamı, iç içe alanlar korunuyor |
| **AutoGPT** | *(yanlış yapılmış örnek)* Classic'te özerk döngü, hiçbir maliyet mekanizması yok. Çözüm ajanı ucuzlatmak değil, **kaldırıp yerine kullanıcının çizdiği grafik koymak** oldu | **Yok** (kütüphane seviyesinde). Adım sayısı grafikle sabitleniyor | Yalnız ürün panosunda (run, cost) — ve o kısım **Polyform Shield**, OSI onaylı değil |
| **sweep** | *(terk edilmiş örnek)* Yok. Bu taramanın aradığı beş mekanizmadan hiçbiri kurulmamış | **Yok** | **Yok** |

## Üç çıkarım

**1. Eşik kuralını para/token birimiyle koyan tek depo SWE-agent.** Diğerlerinin tavanı
ya tur sayısı (`max_turns`, `max_react_loop`), ya hız (`max_rpm`), ya da hiç. SWE-agent
aşımı **hata olarak fırlatıyor** — log satırı değil. Bizim eksiğimiz tam olarak bu:
bench'te 114.000 token'lık fark kimsenin bütçesinde görünmedi.

**2. Ölçüm ile tavan farklı şeyler ve çoğu depo yalnız birine sahip.** crewAI ölçüyor,
durdurmuyor. SWE-agent hem ölçüyor hem durduruyor. MetaGPT ikisini de yapmıyor. Bizim
durumumuz crewAI'dan geride: `premium` koşusunda ölçüm tamamen kayboldu
(`docs/BENCH-SONUC.md` — "ölçüm eksik", "sayı kayıp").

**3. Denetçinin maliyetini ayrı kalemde tutan tek depo yine SWE-agent.**
`ScoreRetryLoopConfig.cost_limit` tanımı: tüm denemeler ve son denetim hariç denetimler
için harcanacak azami maliyet. Bench'imizde `normal` koşusunun 4 ajanının 2'si denetçiydi
— yani ajan bütçesinin yarısı denetime gitti ve bu hiçbir yerde yazılı değildi. Denetçi
değerliydi (temiz klonda `tsc` çökertecek eksik `@types/node` bağımlılığını buldu), ama
değerini savunmak için maliyetinin ayrı sayılması gerekiyor.

## Sonraki adım için sıralama

Yaşayan depoların ortak paydası şu sırayı öneriyor: **önce ölçüm, sonra tavan, sonra
bağlam yoğunlaştırma.** Ölçüm olmadan tavan kalibre edilemez; tavan olmadan yoğunlaştırma
kazancı doğrulanamaz.

Somut ilk adım — bir sonraki bench koşusunda ajan başına altı kalemde token toplamak
(crewAI `UsageMetrics` alanları, DSPy `track_usage` kapsam deseni). Bu, 227k'ya karşı 113k
cümlesini "ajan-1: 31k, denetçi-1: 18k, brifing: 12k" cümlesine çevirir ve 114.000
token'lık farkın nereye gittiğini gösterir.

## Depo künyeleri (2026-08-22, `gh api`)

| Depo | Yıldız | Açık issue | Lisans | Son push | Son etiketli sürüm |
|---|---:|---:|---|---|---|
| Significant-Gravitas/AutoGPT | 186.756 | 530 | NOASSERTION (Polyform Shield + MIT) | 2026-08-22 | autogpt-platform-beta-v0.7.2 · 2026-08-21 |
| OpenHands/OpenHands | 84.780 | 534 | MIT | 2026-08-22 | v1.15.0 · 2026-08-21 |
| FoundationAgents/MetaGPT | 69.945 | 131 | MIT | 2026-01-21 | v0.8.1 · 2024-04-22 |
| microsoft/autogen | 60.570 | 992 | CC-BY-4.0 (kök) + MIT (LICENSE-CODE) | 2026-04-15 | python-v0.7.5 · 2025-09-30 |
| crewAIInc/crewAI | 57.460 | 825 | MIT | 2026-08-22 | 1.15.17 · 2026-08-20 |
| langchain-ai/langgraph | 40.234 | 709 | MIT | 2026-08-22 | sdk==0.4.3 · 2026-08-19 |
| stanfordnlp/dspy | 37.498 | 643 | MIT | 2026-08-21 | 3.3.1 · 2026-08-21 |
| openai/openai-agents-python | 28.864 | 16 | MIT | 2026-08-22 | v0.22.0 · 2026-08-19 |
| openai/swarm | 21.913 | 33 | MIT | 2026-04-15 | **yok** (HTTP 404) |
| SWE-agent/SWE-agent | 20.107 | 82 | MIT | 2026-08-17 | v1.1.0 · 2025-05-22 |
| OpenHands/software-agent-sdk | 1.017 | 362 | MIT | 2026-08-22 | — |
| sweepai/sweep | 7.701 | 752 | NOASSERTION (Sweep EE, OSI değil) | 2025-09-18 | sweep-sandbox-v1 · 2023-09-11 |

Not: `geekan/MetaGPT` artık `FoundationAgents/MetaGPT`, `All-Hands-AI/OpenHands` artık
`OpenHands/OpenHands` olarak yönlendiriliyor. OpenHands'in Python ajanı ana depodan
`software-agent-sdk` deposuna taşınmış; bu yüzden künyede iki satır var.

## Ayrıntılı dosyalar

`swe-agent.md` · `openhands.md` · `langgraph.md` · `autogen.md` · `crewai.md` ·
`metagpt.md` · `swarm-agents-sdk.md` · `dspy.md` · `autogpt.md` · `sweep.md`
