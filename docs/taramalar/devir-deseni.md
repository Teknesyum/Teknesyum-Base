# Modeller/Oturumlar Arası İş Devri (Handoff) Deseni

## 1. Desenin adı

Sektörde tek bir isim yok, birkaç eşanlamlı terim dolaşıyor:

- **"Handoff"** — en yaygın terim. OpenAI Agents SDK, LangGraph, Amp hepsi bunu kullanıyor.
- **"Context handoff" / "context handover"** — özellikle oturum sürekliliği bağlamında (raggiecode.com).
- **"Briefing document" / "handoff document"** — devredilen dosyanın adı.
- **"Blackboard pattern"** — 1970'lerden gelen, paylaşılan bir mekâna yazıp okuma deseni; doğrudan ajan-ajan mesajı yerine ortak depoya yazma fikri buradan geliyor.
- **"Context Dump Fallacy"** — xtrace.ai'nin, tam geçmişi kopyalamanın yanlış olduğunu anlatmak için kullandığı karşıt-kavram.
- Anthropic kendi makalesinde özel bir isim vermiyor, "task delegation" / "condensing findings for the lead agent's synthesis" diyor.

## 2. Somut örnekler (en az 4)

**a) Anthropic — çok ajanlı araştırma sistemi** (anthropic.com/engineering/multi-agent-research-system)
Patron (lead agent) alt ajana (subagent) görev verirken paket 4 alan taşıyor: **hedef, çıktı formatı, araç/kaynak rehberi, görev sınırları**. Kısa talimatlar ("research the semiconductor shortage") başarısız bulunmuş, detaylı talimat gerekli görülmüş. Alt ajan işini bitirince patrona geniş metin değil, **özetlenmiş bulgu** döner ("condensing findings for the lead agent's synthesis").

**b) OpenAI Swarm / Agents SDK — handoff fonksiyonu**
Handoff, bir fonksiyonun başka bir ajanı döndürmesiyle olur; `context_variables` adında yapılandırılmış bir durum nesnesi taşınır. Kalıcı hafıza yok — "every handoff must include all context the next agent needs, no hidden variables". Yani paket kısa değil, **her şey açıkça mesajda** taşınıyor (bizim istediğimiz "dosyaya yaz, kısa işaretçi ver" deseninin tersi bir örnek).

**c) LangGraph — `Command` nesnesiyle handoff**
Düğüm (node), hedef ajanı ve `state` güncellemesini birlikte taşıyan bir `Command` döndürür. Devredilen paket = **hedef düğüm adı + payload (state diff)**. Alt-graf durumunda `graph=Command.PARENT` ile üst grafa çıkılır.

**d) Google A2A protokolü**
Ajanlar arası iletişim **Task** nesnesi üzerinden yürür; çıktı **Artifact** (tipli veri) olarak paketlenir. Ajanlar birbirini "Agent Card" (JSON yetenek kartı) ile keşfeder. Devredilen paket = görev durumu + tipli artifact, ham konuşma geçmişi değil.

**e) Sourcegraph Amp — `/handoff` komutu**
Mevcut thread'in en ilgili durumunu **yapılandırılmış bir prompt**a sıkıştırıp yeni thread'e tohum olarak veriyor; kullanıcı yeni prompt'u göndermeden önce düzenleyebiliyor. Tam içerik dokümantasyonda bulunamadı (resmi manual sayfasında ayrıntı yok) — **doğrulanamadı**.

**f) session-handoff skill (softaworks/agent-toolkit, GitHub)**
En somut örnek. Devir dokümanı `.claude/handoffs/YYYY-MM-DD-HHMMSS-[slug].md` dosyasına yazılıyor, 10 bölüm: Metadata, Current State Summary, Important Context, Decisions Made, Immediate Next Steps, Pending Work, Critical Files, Key Patterns Discovered, Potential Gotchas, Handoff Chain. Yeni ajan sadece dosya yolunu alıp "Immediate Next Steps"ten başlıyor — **tam olarak aradığımız "dosyaya yaz, kısa işaretçi ver" deseni**.

**g) CrewAI — `context=[task1, task2]`**
Task nesnesine önceki task'ların çıktısı referans olarak veriliyor; ajan sıfırdan başlamıyor ama sadece belirtilen önceki çıktılarla besleniyor, tüm geçmişle değil.

## 3. Ölçülmüş bulgular

- **Mem0 / LoCoMo benchmark**: retrieval tabanlı (kısa, ilgili parça) yaklaşım sorgu başına ortalama **~6.956 token**, tam-bağlam (full-context) yaklaşım **~26.000 token** — yaklaşık **4 kat** fark. Doğruluk/F1 rakamı kaynakta verilmemiş (mem0.ai/blog/context-compression-vs-memory-in-ai-agents). **Kısmen ölçülmüş** — sadece token tarafı sayısal, kalite tarafı sayısal değil.
- **Anthropic çok ajanlı sistem**: çoklu ajan mimarisi (Opus patron + Sonnet işçi) tek-ajan Opus'a göre görevlerde **%90,2 daha iyi** performans; ama bu rakam "çoklu ajan mimarisi vs tek ajan" ölçümü, "kısa devir paketi vs tam bağlam kopyalama" ölçümü değil — **doğrudan karşılık gelmiyor, dikkatli okunmalı**.
- Aynı makale: ajanlar sohbet arayüzüne göre **~4 kat**, çoklu ajan sistemleri **~15 kat** daha fazla token harcıyor — devir/özetleme maliyetinin nedeni olarak gösteriliyor.
- **raggiecode.com (context compaction vs handover)**: şema tabanlı handover'ın sıkıştırmaya (compaction) göre kritik alanları (başarısız denemeler, kullanıcı kısıtları) kaybetmediği iddia ediliyor ama **sayısal karşılaştırma yok**, sadece akıl yürütme.
- **xtrace.ai örneği**: bir araştırma ajanının 45 dakikalık analizinde 40.000 token'lık süreçten yalnızca ~3.000 token'lık gerçek bilgi çıktığı belirtiliyor — bağlam gürültüsünün büyüklüğüne dair **anekdot, kontrollü ölçüm değil**.
- **Sonuç**: kısa-brief + dosya-işaretçisi ile tam-bağlam-kopyalama arasında **doğrudan, kontrollü kalite/token karşılaştırması yapan akademik ya da endüstriyel bir kaynak bulunamadı**. Mem0/LoCoMo en yakın veri ama o "retrieval vs full-context", bizim senaryomuz (patron→işçi tek seferlik devir) değil.

## 4. Devir paketinde ortak alan listesi

Kaynaklar arası kesişim (Anthropic, session-handoff skill, raggiecode, xtrace):

1. **Hedef / görev** — ne yapılacak (Anthropic: "objective", session-handoff: "Current State Summary")
2. **Kabul kriteri / çıktı formatı** — ne zaman bitmiş sayılır (Anthropic: "output format")
3. **Sınırlar / dokunulmayacak yerler** — "bunu araştırma, o başka ajanın işi" (Anthropic: "clear task boundaries"), kullanıcı kısıtları (raggiecode: "user_constraints")
4. **Önceki kararlar ve gerekçe** — denenenler, işe yaramayanlar (session-handoff: "Decisions Made", raggiecode: "errors_and_failed_attempts")
5. **Okunacak/kritik dosyalar** — (session-handoff: "Critical Files")
6. **Sıradaki somut adım** — tek, belirsizliksiz ilk hamle (session-handoff: "Immediate Next Steps", raggiecode: "exact_next_step")
7. **Bilinen tuzaklar** — (session-handoff: "Potential Gotchas")

Ortak payda: **paket kısa ve alanlara bölünmüş olmalı; ham konuşma geçmişi değil, süzülmüş durum taşınmalı.**

## 5. Ters yön — işçi patrona dönerken

Kaynaklarda işçi→patron yönü daha az işlenmiş ama üç desen çıkıyor:

- **Anthropic**: alt ajan bulgularını **özetleyip** ("condensing findings") patrona döner — ham arama sonuçlarını değil, sentezlenmiş metni.
- **Amp subagent**: "the main agent only receives their final summary rather than monitoring their step-by-step work" — alt ajanın adım adım işi görünmez, sadece son özet gelir.
- **A2A protokolü**: çıktı tipli bir **Artifact** olarak paketlenir, serbest metin değil.

Yani ters yönde de aynı ilke geçerli: işçi patrona **kısa özet + varsa üretilen dosya/artifact işaretçisi** verir, tüm işlem geçmişini değil.

## 6. Alınmaya değer kurallar (en fazla 4)

1. Devir paketi metne değil dosyaya yazılır; sohbete sadece dosya yolu ve tek satırlık özet düşer.
2. Paket en az şu alanları taşır: hedef, kabul kriteri, sınırlar, okunacak dosyalar, sıradaki somut adım.
3. İşçiden patrona dönüş de aynı kurala tabidir — ham iş günlüğü değil, özet + varsa üretilen dosyanın yolu.
4. Belirsiz/kısa talimat ("şunu araştır") yerine her zaman açık sınır ve format belirtilir — kısalık, netlik eksikliği anlamına gelmez.

## Kaynaklar

- [Anthropic — Building a Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [OpenAI Swarm — GitHub README](https://github.com/openai/swarm/blob/main/README.md)
- [OpenAI Agents SDK — Orchestration and handoffs](https://developers.openai.com/api/docs/guides/agents/orchestration)
- [OpenAI Agents SDK Python — Handoffs](https://openai.github.io/openai-agents-python/handoffs/)
- [LangChain Docs — Handoffs](https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs)
- [Google Developers Blog — Announcing A2A](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [Galileo — Google's Agent2Agent Protocol Explained](https://galileo.ai/blog/google-agent2agent-a2a-protocol-guide)
- [Medium — Blackboard Architecture (Democratic Multi-Agent AI)](https://medium.com/@edoardo.schepis/patterns-for-democratic-multi-agent-ai-blackboard-architecture-part-1-69fed2b958b4)
- [Cognition — Devin June '24 / Sept '24 Product Updates](https://cognition.com/blog/sept-24-product-update)
- [Fastio — Devin AI Playbook Guide](https://fast.io/resources/devin-ai-playbook-guide/)
- [Amp Owner's Manual](https://ampcode.com/manual)
- [Medium — Subagents in AI coding with Amp](https://medium.com/@matthewtanner91/how-to-use-subagents-in-ai-coding-with-amp-8b8418486782)
- [GitHub — softaworks/agent-toolkit, session-handoff skill](https://github.com/softaworks/agent-toolkit/blob/main/skills/session-handoff/README.md)
- [aipatternbook.com — Handoff pattern](https://aipatternbook.com/handoff)
- [Mem0 — Context Compression vs Memory in AI Agents](https://mem0.ai/blog/context-compression-vs-memory-in-ai-agents)
- [raggiecode.com — Context Compaction vs. Agent Handover](https://raggiecode.com/blog/context-compaction-vs-handover)
- [xtrace.ai — AI Agent Handoff: Why Context Breaks & How to Fix It](https://xtrace.ai/blog/ai-agent-context-handoff)
- [CrewAI — Passing context between agents (community)](https://community.crewai.com/t/passing-context-between-agents/5341)
- [CrewAI GitHub Issue #759 — 'Context' in Agent Tasks](https://github.com/crewAIInc/crewAI/issues/759)
- [AKF Partners — Agentic Pattern: Handoff + Resume](https://akfpartners.com/growth-blog/agentic-pattern-handoff-resume)
- [RiffOn — Create "Handoff Documents"](https://riffon.com/insight/ins_lseas03dkhah)
