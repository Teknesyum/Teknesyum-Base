# Tarama: OpenAI Codex CLI ve AGENTS.md Ekosistemi

Karşılaştırma hedefi: Teknesyum Base (Claude Code eklentisi — patron/işçi/denetçi rölesi,
hook'la mekanik kural, neon UI, token disiplini).

## 1. Ne yapıyor, hangi problemi çözüyor

Codex CLI, terminalde yerel olarak çalışan, OpenAI'nin açık kaynak kodlama ajanı —
kod tabanını okur, çok dosyalı değişiklik önerir, sandbox içinde komut çalıştırır.
([github.com/openai/codex](https://github.com/openai/codex))

AGENTS.md ise ayrı ve daha geniş bir girişim: depo köküne konan, ajana "nasıl build/test
edilir, hangi kurallara uyulur" anlatan düz Markdown format — Codex'in CLAUDE.md karşılığı.
([agents.md](https://agents.md/))

İkisi birlikte: yerelde çalışan ajan + o ajanın (ve 30'dan fazla başka aracın) ortak okuduğu
tek bir talimat dosyası standardı.

## 2. İş devri (handoff) nasıl oluyor

**Bağlamla değil, dosyayla.** İki katman var:

- **AGENTS.md** — proje kökünde, monorepo'da alt proje başına ayrı da olabilir. Ajan dizin
  ağacında **en yakın** dosyayı okur (en yakın kazanır). `/init` komutu otomatik üretir.
  ([agents.md](https://agents.md/), [learn.chatgpt.com/docs/codex/cli](https://learn.chatgpt.com/docs/codex/cli))

- **Subagent tanımı** — `~/.codex/agents/` (kişisel/global) veya `.codex/agents/`
  (proje ölçekli, proje kazanır) altında **TOML dosyası**. Zorunlu alanlar: `name`,
  `description`, `developer_instructions`; opsiyonel `model`, `model_reasoning_effort`,
  `sandbox_mode`, `mcp_servers`, `skills.config`.
  ([learn.chatgpt.com/docs/agent-configuration/subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents))

Yerleşik 3 ajan tipi: `default`, `worker` (uygulama odaklı), `explorer` (okuma-ağırlıklı
kod keşfi). Çoklu ajan **otomatik tetiklenmiyor** — kullanıcı veya AGENTS.md/skill talimatı
açıkça "şu işi böl, şu ajanları harca" demeli. Paralel ajanlar bittiğinde ana thread
sonuçları **özetleyerek** tek yanıtta toplar (ham çıktı değil, konsolide özet).
`/agent` komutuyla çalışan thread'ler arasında geçiş/izleme yapılır.
([codex.danielvaughan.com](https://codex.danielvaughan.com/2026/04/27/codex-cli-custom-agent-definitions-toml-specialised-subagents/))

Teknesyum'daki ayrı **sözleşme dosyası + bağımsız denetçi ajan** ikilisine karşılık gelen
bir şey yok: worker/explorer var ama işi doğrulayan, kabul kriterini kontrol eden üçüncü
bir "auditor" rolü resmi dokümantasyonda **doğrulanamadı**.

## 3. Bağlam/token disiplini mekanizması

Var, ve somut: **auto-compaction**, model bazlı mutlak token eşiğinde (~180k–244k token,
`model_auto_compact_token_limit` ile config.toml'dan ayarlanabilir, ama pencerenin
%90'ının üstüne çıkarılamaz — üstü sessizce yok sayılır) devreye giriyor.
([codex.danielvaughan.com](https://codex.danielvaughan.com/2026/04/14/context-compaction-deep-dive-codex-cli-claude-code-opencode/))

Mekanik: önce oturum belleğindeki yapılandırılmış bilgiyle (LLM çağrısı olmadan) ikame
denenir; çoğu auto-compaction bu yoldan gidip **model çağrısı yapmadan** halloluyor. Gerekirse
tüm geçmiş özel bir özetleme prompt'uyla modele gönderiliyor, özet + son ~20k token'lık
kullanıcı mesajı korunup gerisi atılıyor. Manuel `/compact` komutu da var. Dokümantasyon
kendi uyarısını veriyor: "uzun konuşmalar ve çoklu compaction modeli daha az doğru
yapabilir." ([codex.danielvaughan.com](https://codex.danielvaughan.com/2026/04/14/context-compaction-deep-dive-codex-cli-claude-code-opencode/), [github.com/openai/codex issue #11716](https://github.com/openai/codex/issues/11716))

Teknesyum'un "token tasarrufu ilkesi" (grep önce, geniş arama alt ajana, kısa rapor iste)
gibi **proaktif önleyici** bir disiplin değil — bu reaktif/otomatik bir sıkıştırma.

## 4. Kurallar model disiplinine mi bırakılıyor, mekanik mi uygulanıyor

**Karışık — güvenlik mekanik, davranış kuralları değil.**

- **Sandbox_mode**: işletim sistemi seviyesinde zorlanıyor — macOS'ta Apple Seatbelt
  (`sandbox-exec`), Linux'ta Landlock + seccomp. Dosya/ağ erişimi gerçekten engelleniyor,
  modelin "yapmama kararına" bağlı değil.
  ([vladimirsiedykh.com](https://vladimirsiedykh.com/blog/codex-cli-approval-modes-2025), [github.com/openai/codex issue #10390](https://github.com/openai/codex/issues/10390))
- **approval_policy**: bunun üstüne binen ayrı bir katman — "ne zaman kullanıcıya sorulsun"
  iş akışı tercihi, sandbox'tan bağımsız.
- **danger-full-access**: tüm kısıtlamaları kaldırıyor; dokümantasyon açıkça "gerçek
  sandbox'ın makine/konteyner olduğu durumlar dışında kullanma" diyor.

Ama **AGENTS.md içeriğinin kendisi** (kod stili, hangi komutla test edilir, hangi dosyaya
dokunulmaz vb.) salt metin — hook gibi mekanik bir uygulayıcısı yok, modelin okuyup
uyması bekleniyor. Teknesyum'un hook-tabanlı mekanik kural uygulaması (RULES.md içeriğinin
zorlanması) karşılığı **yok**.

## 5. Alınmaya değer en fazla 3 fikir

1. **OS seviyesinde sandbox (Seatbelt/Landlock) ile approval_policy'nin ayrılması.**
   Ne: "ajan teknik olarak ne yapabilir" (sandbox) ile "ne zaman kullanıcıya sorar"
   (approval) iki bağımsız eksen. Neden değerli: Teknesyum'daki kural ihlali riski hâlâ
   "ajan dosyayı silmeye çalışırsa hook yakalar" seviyesinde — Codex'teki gibi işletim
   sistemi düzeyinde dosya/ağ erişimini fiilen imkânsız kılan bir katman yok. Maliyet:
   Windows'ta Seatbelt/Landlock eşdeğeri yok (AppContainer/Job Object ile taklit edilebilir,
   ciddi mühendislik işi).

2. **Token-eşikli otomatik compaction + "önce yapılandırılmış bellekle ikame, olmazsa
   LLM özeti" iki kademeli strateji.** Neden değerli: Teknesyum'un token disiplini şu an
   tamamen "ajan grep kullansın" kuralına dayanıyor; oturum uzayınca sistematik bir
   otomatik sıkıştırma yok. Maliyet: orta — relay sözleşme/rapor formatı zaten yapılandırılmış
   olduğundan ilk kademe (LLM'siz ikame) nispeten ucuz eklenebilir.

3. **AGENTS.md'nin "en yakın dosya kazanır" nested-repo kuralı + tek format olarak 30+
   araç tarafından okunması.** Neden değerli: Teknesyum'un "her klasörde ≤20 satır CLAUDE.md"
   kuralı zaten benzer bir fikri uyguluyor ama AGENTS.md kadar dışa açık/taşınabilir değil
   — CLAUDE.md sadece Claude Code okuyor. Maliyet: düşük, ama fayda da düşük (Teknesyum
   zaten tek araç hedefliyor); yalnızca başka araçlarla ortak çalışma ihtimali varsa değerli.

## 6. Şüpheli/riskli yanlar

- **Lisans**: Apache-2.0, temiz. ([github.com/openai/codex](https://github.com/openai/codex))
- **Terk edilmişlik**: yok — son push bugüne ait (2026-08-19), 106.816 yıldız, ama
  **13.143 açık issue** — bakım yükü/backlog çok büyük, yanıt hızı düşük olabilir.
- **Gizli/örtük maliyet**: Compaction'ın "LLM'siz ikame" kademesi dışında kalan yolu ayrı
  bir özetleme modeli çağrısı yapıyor — bu maliyet dokümantasyonda ayrıştırılmış token/ücret
  olarak **doğrulanamadı** (muhtemelen aynı model/aboneliğe dahil, ama teyit edilemedi).
- **Telemetri**: OpenAI, CLI'ye anonim kullanım/sağlık verisi gönderen opsiyonel analytics
  eklemeyi planladığını duyurdu; PII içermediği belirtiliyor ama "opsiyonel" olsa da varsayılan
  davranış ve kapsam netliği **doğrulanamadı**. ([github.com/openai/codex/discussions/8291](https://github.com/openai/codex/discussions/8291))
- **Kullanıcı şikayetleri (2026)**: GPT-5-Codex performans regresyonu, düşürülen rate
  limit/kullanım tavanları, halüsinasyon, talimat görmezden gelme, kod/veri kaybı vakaları
  raporlanmış; bir kullanıcı macOS Codex App'in ~8 gün "invalid schema" hatasıyla
  kullanılamaz olduğunu bildirmiş. ([chatgptdisaster.com](https://chatgptdisaster.com/codex-complaints.html))
- **Abartılı iddia riski**: "60.000+ repo AGENTS.md kullanıyor, 20+ araç destekliyor" gibi
  rakamlar üçüncü taraf blog/rehber kaynaklı — resmi agents.md sitesinde teyit edilen
  sayı yok, rakamlar **doğrulanamadı** olarak işaretlenmeli.

## Kaynaklar

- [github.com/openai/codex](https://github.com/openai/codex) — ana depo, lisans, aktivite
- [github.com/openai/codex/blob/main/README.md](https://github.com/openai/codex/blob/main/README.md)
- [github.com/openai/codex/blob/main/AGENTS.md](https://github.com/openai/codex/blob/main/AGENTS.md)
- [agents.md](https://agents.md/) — resmi format sitesi, yönetişim
- [learn.chatgpt.com/docs/codex/cli](https://learn.chatgpt.com/docs/codex/cli)
- [learn.chatgpt.com/docs/agent-configuration/subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [developers.openai.com/codex/agent-approvals-security](https://developers.openai.com/codex/agent-approvals-security)
- [vladimirsiedykh.com/blog/codex-cli-approval-modes-2025](https://vladimirsiedykh.com/blog/codex-cli-approval-modes-2025)
- [codex.danielvaughan.com — context compaction deep dive](https://codex.danielvaughan.com/2026/04/14/context-compaction-deep-dive-codex-cli-claude-code-opencode/)
- [codex.danielvaughan.com — custom agent definitions](https://codex.danielvaughan.com/2026/04/27/codex-cli-custom-agent-definitions-toml-specialised-subagents/)
- [github.com/openai/codex/issues/10390](https://github.com/openai/codex/issues/10390) — sandbox network_access sorunu
- [github.com/openai/codex/issues/11716](https://github.com/openai/codex/issues/11716) — compaction config talebi
- [github.com/openai/codex/discussions/8291](https://github.com/openai/codex/discussions/8291) — telemetri planı
- [chatgptdisaster.com/codex-complaints.html](https://chatgptdisaster.com/codex-complaints.html) — kullanıcı şikayetleri
- [openai.com/index/running-codex-safely](https://openai.com/index/running-codex-safely/) — OpenAI güvenlik yaklaşımı
- GitHub API sorgusu (`api.github.com/repos/openai/codex`) — güncel yıldız/issue/push tarihi
