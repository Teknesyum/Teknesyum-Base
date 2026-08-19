# Tarama: Claude Flow (ruvnet) ve claude-swarm (parruda)

İki proje incelendi: **ruvnet/claude-flow** (repo artık `ruvnet/ruflo` adı altında,
"agent meta-harness") ve **parruda/claude-swarm** (Ruby gem, `claude_swarm`).
Karşılaştırma hedefi: Teknesyum Base.

## 1. Ne yapıyor, hangi problemi çözüyor?

**Ruflo (claude-flow):** Claude Code / Codex için 100+ uzmanlaşmış ajan, "swarm"
koordinasyonu, vektör bellek ve makineler-arası iletişim katmanı sunan bir yönetim
katmanı. Hedef: izole ajanların manuel orkestrasyon gerektirmesi ve oturum sonu
bağlam kaybı sorununu çözmek.
([github.com/ruvnet/ruflo](https://github.com/ruvnet/ruflo))

**claude-swarm:** Birden fazla Claude Code örneğini MCP protokolü üzerinden
birbirine bağlayan Ruby aracı. YAML dosyasında ajan topolojisi (rol, dizin, model,
izinli araçlar, bağlantılar) tanımlanır; "lead" ajan diğerlerini MCP tool çağrısı
gibi çağırır. ([rubygems.org/gems/claude_swarm](https://rubygems.org/gems/claude_swarm),
[code.dblock.org yazısı](https://code.dblock.org/2025/06/21/using-claude-swarm-to-upgrade-ruby-projects.html))

## 2. İş devri (handoff) nasıl oluyor?

**Ruflo:** "Ajanlar için Slack" olarak tarif ediliyor. Paylaşılan bellek AgentDB
(HNSW indeksli vektör DB, `agentdb.rvf`) + "ReasoningBank" üzerinden; koordinasyon
queen-led hiyerarşi (Raft/Byzantine/Gossip) ve 27 hook ile. Depolama `.claude/`,
`.claude-flow/` dizinlerinde. Somut dosya formatı/şema dokümantasyonda **verilmemiş**
— sadece kavramsal isimler var. Doğrulanamadı.

**claude-swarm:** Her ajan **ayrı bir Claude Code örneği**, ayrı bağlamla çalışır —
bağlam paylaşılmıyor, görev MCP tool çağrısıyla taşınıyor (dosya değil, canlı
MCP mesajı). Koordinasyon "session directory" içinde tutuluyor; lead ajan bir
TODO listesiyle ilerlemeyi izliyor. SQLite kullanımı belirtilmemiş, YAML + oturum
dizini esas.

## 3. Bağlam/token disiplini için somut mekanizma var mı?

**Ruflo:** Dokümantasyonda somut bir mekanizma **yok**. Yalnızca ayrı bir eklenti
olan `ruflo-cost-tracker`'ın "token kullanımı takibi, bütçe/maliyet uyarısı"
yaptığı belirtiliyor — nasıl hesaplandığı, hangi noktada devreye girdiği
açıklanmamış. Doğrulanamadı.

**claude-swarm:** Açık bir disiplin mekanizması yok; yazar "lots of tokens for
breakfast" diyerek yüksek tüketimin farkında olduğunu itiraf ediyor. Her görev
sonunda token kullanımı raporlanıyor (örn. "38.0k tokens") ama önleyici/kısıtlayıcı
bir mekanizma yok — sadece gözlem.

## 4. Kurallar model disiplinine mi bırakılıyor, mekanik mi uygulanıyor?

**Ruflo — kritik bulgu:** "27 Hooks" iddiası var ama GitHub Issue #377
(`ruvnet/ruflo`) resmi Claude Code hook sözleşmesiyle uyuşmazlığı belgeliyor:
- Resmi Claude Code hook'ları stdin'den JSON alıp tool çağrısını **onaylayabilir/
  bloke edebilir**; `claude-flow`'un hook'ları CLI komutları (`pre-command`,
  `post-edit` vb.) olup **ateş-ve-unut** şeklinde çalışıyor, akışı durduramıyor.
- Dokümante edilen resmi event'ler (`UserPromptSubmit`, `SubagentStop`,
  `PreCompact`) `claude-flow` tarafında **hiç yok**.
- Yani kural uygulaması gerçekte mekanik değil, model disiplinine (ajanın
  komutu doğru çağırmasına) dayanıyor — "hook" adı verilse de blocking kontrol
  sağlamıyor.
([github.com/ruvnet/ruflo/issues/377](https://github.com/ruvnet/ruflo/issues/377))

**claude-swarm:** Hook sistemi yok; kural uygulaması tamamen ajan/prompt
disiplinine bırakılmış (YAML'daki `allowed_tools` dışında mekanik bir kısıt yok).

## 5. Alınmaya değer en fazla 3 fikir

1. **Federe/çoklu-makine ajan iletişimi (ruflo).** Ne: ajanların farklı
   makineler arasında koordine olabilmesi. Neden değerli: Teknesyum tek
   makinede çalışıyor, çoklu-makine relay şu an kapsam dışı ama uzak-ajan
   (worktree/remote isolation) senaryosunda ilham olabilir. Maliyet: yüksek —
   ayrı bir iletişim katmanı, güvenlik/kimlik doğrulama yükü gerektirir;
   şimdilik gerekçesiz.

2. **Vektör tabanlı "geçmiş görev" hafızası (AgentDB/ReasoningBank, ruflo).**
   Ne: geçmiş sözleşme/görev sonuçlarının semantik aranabilir hale gelmesi.
   Neden değerli: relay'de "bu iş daha önce nasıl çözüldü" sorgusu şu an yok.
   Maliyet: orta — yerel bir embedding index + sorgu katmanı; token disiplini
   ilkesiyle çelişmemesi için sıfır-token (deterministik grep/FTS) alternatifi
   tercih edilmeli, tam vektör DB gerekmeyebilir.

3. **Ajan başına ayrı süreç/bağlam izolasyonu (claude-swarm modeli).**
   Ne: her işçi ajanın tamamen ayrı Claude Code örneği olarak, sızıntısız
   bağlamla çalışması. Neden değerli: Teknesyum'da işçi ajanlar zaten sözleşme
   dosyası alıyor (bağlam sızıntısı düşük) ama claude-swarm'ın YAML topoloji +
   `allowed_tools` per-agent kısıtlaması, sözleşmeye "bu ajan sadece şu araçları
   kullanabilir" alanı eklemek için basit bir örnek. Maliyet: düşük — mevcut
   sözleşme şemasına bir alan eklemek yeterli.

## 6. Şüpheli/riskli yanlar

- **Hook iddiası yanıltıcı (ruflo):** "27 Hooks" pazarlanıyor ama Issue #377'ye
  göre bunlar resmi Claude Code hook kontratını (blocking, JSON stdin/stdout)
  uygulamıyor — sadece adı hook olan CLI komutları. Teknesyum'un gerçek
  blocking hook mekanizmasıyla karıştırılmamalı.
- **Performans iddiaları kısmen doğrulanabilir, kısmen değil:** "SOTA matrix"
  (LangGraph/AutoGen/CrewAI'a karşı 1.3x–1953x) için gist'te metodoloji
  şeffaf (N=10 agent, K=50 tool, 7 trial, medyan) ve repro talimatı var —
  ama yalnızca orchestration/başlatma maliyetini ölçüyor, **model kalitesini
  ölçmüyor**. "Mode B" (gerçek LLM çağrılarıyla ölçüm) henüz yayınlanmamış.
  SWE-Bench gibi bir doğruluk iddiası **yok** (aranan "%84" tipi rakam bu
  projede bulunamadı — muhtemelen başka bir projeyle karışıyor, doğrulanamadı).
- **İsim/repo kararsızlığı:** `ruvnet/claude-flow` artık `ruvnet/ruflo`'ya
  yönlendiriliyor (GitHub API teyit etti); ayrıca `kodflow/claude-flow` adlı
  bağımsız bir fork kendini "#1 ranked" ilan ediyor — marka karışıklığı riski.
- **claude-swarm repo durumu belirsiz:** RubyGems sayfası kaynak kodu olarak
  `github.com/parruda/claude-swarm`'ı gösteriyor (son gem sürümü 28 Kasım 2025,
  v1.0.11) ama bu adres bugün (2026-08-19) hem web hem GitHub API üzerinden
  **404** dönüyor; yazarın hesabında (`parruda`, artık Shopify'da) bu isimde
  görünür bir repo yok. Repo silinmiş, private yapılmış veya taşınmış olabilir
  — doğrulanamadı, ancak proje sürekliliği açısından uyarı işareti.
- **Bağımlılık ağırlığı (ruflo):** MCP Server + Router + 27 Hook + vektör DB +
  federe iletişim gibi çok parçalı bir mimari; npm paketi olarak kurulum
  gerektiriyor, Teknesyum'un "deterministik araç + düşük ayak izi" ilkesinin
  tersi yönde.
- **Terk edilmişlik:** Ruflo aktif görünüyor (868 açık issue, 2026-08-19'da
  push, MIT lisans) — terk edilmiş değil, tam tersi çok hızlı/kararsız
  büyüyor (isim değişimi, fork karmaşası). claude-swarm'ın güncelliği repo
  erişilemediği için doğrulanamadı.

## Kaynaklar

- [github.com/ruvnet/ruflo](https://github.com/ruvnet/ruflo)
- [GitHub Issue #377 — Claude Code Hooks vs. claude-flow Implementation](https://github.com/ruvnet/ruflo/issues/377)
- [Ruflo benchmark gist (metodoloji)](https://gist.github.com/ruvnet/298f8c668c8859b369f91734a0e9cbbe)
- [Claude Flow Playbook gist](https://gist.github.com/ruvnet/9b066e77dd2980bfdcc5adf3bc082281)
- [rubygems.org/gems/claude_swarm](https://rubygems.org/gems/claude_swarm)
- [code.dblock.org — Using Claude-Swarm to Upgrade Ruby Projects](https://code.dblock.org/2025/06/21/using-claude-swarm-to-upgrade-ruby-projects.html)
- GitHub API sorguları (`api.github.com/repos/ruvnet/ruflo`,
  `api.github.com/repos/parruda/claude-swarm` — 404), 2026-08-19 tarihli.
