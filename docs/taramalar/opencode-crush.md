# OpenCode ve Crush — Teknesyum Base Karşılaştırması

İkisi de terminal tabanlı, çoklu-model destekli AI kodlama ajanı. Kaynak repo aynı
2025 projesinden ikiye ayrılmış: OpenCode (SST/Anomaly ekibi, TypeScript) ve Crush
(Charm'ın orijinal kurucu liderliğindeki Go devamı).
(https://vibecodinghub.org/blog/crush-coding-agent-review)

## 1. Ne yapıyor, hangi problemi çözüyor?

**OpenCode**: Terminalde çalışan, client/server mimarili, sağlayıcı-bağımsız (75+
model) AI kodlama ajanı; TUI sadece olası istemcilerden biri, sunucuya uzaktan da
bağlanılabiliyor. (https://deepwiki.com/sst/opencode/3.2-agent-system,
https://www.openaitoolshub.org/en/blog/opencode-review-terminal-ai-coding)

**Crush**: Go ile yazılmış, Bubble Tea TUI üzerine kurulu terminal kodlama asistanı;
LSP ve MCP'yi doğrudan ajan bağlamına entegre ediyor, oturum içi model değiştirmeyi
destekliyor. (https://github.com/charmbracelet/crush,
https://deepwiki.com/charmbracelet/crush/5.1-tui-architecture-and-appmodel)

Her ikisi de Claude Code'un kapalı/tek-sağlayıcılı modeline karşı "sağlayıcıdan
bağımsız terminal ajanı" boşluğunu dolduruyor.

## 2. İş devri (handoff) — bağlamla mı dosyayla mı?

**OpenCode**: Alt ajanlar (subagent) kendi child session'ında çalışır, temiz sistem
promptu ve filtrelenmiş izinlerle başlar; ebeveynin promptu + önceki işin bir kısmını
miras alır ama kendi konuşma geçmişi ayrı tutulur. Task tool çağrısı bir session_id
döndürür; alt görev bitince sonucu ebeveyne senkron mesaj olarak yazar (foreground
çağrılarda tool-result üzerinden zaten dönüyor).
(https://deepwiki.com/sst/opencode/3.2-agent-system,
https://github.com/anomalyco/opencode/pull/7756)
Built-in subagent'lar: General (tam araç), Explore (salt-okunur keşif), Scout
(salt-okunur bağımlılık/dış dokümantasyon araştırması).
(https://opencode.ai/docs/agents/)
Bilinen kusur: alt ajanlar ebeveyn oturumun aktif modelini değil global config
modelini kullanıyor — bağlam devri modelle birlikte tam taşınmıyor.
(https://github.com/anomalyco/opencode/issues/17870)

**Crush**: "Coordinator" bileşeni adlandırılmış ajanları (coder, task) yönetiyor,
her biri oturum başına ayrı LLM konuşması. Proje bağlamı **dosya tabanlı**: çalışma
dizininden AGENTS.md, CRUSH.md, CLAUDE.md, GEMINI.md (ve `.local` varyantları)
okunup talimat olarak enjekte ediliyor — bizim sözleşme dosyası fikrine yakın ama
tek yönlü (statik okuma, ajanlar arası canlı devir yok).
(https://github.com/charmbracelet/crush/blob/main/AGENTS.md)
Aynı `--cwd` ile açılan istemciler aynı workspace'e katılır; session listesi, mesaj
geçmişi, izin kuyruğu, LSP/MCP durumu paylaşılır — çoklu istemci senkronu var, ama
bu "ajanlar arası devir" değil "aynı oturumu paylaşma".
(https://github.com/charmbracelet/crush)

Özet: OpenCode'da devir **context-native** (child session + senkron mesaj), Crush'ta
**dosya-native** (statik kural dosyaları) + paylaşımlı oturum durumu. İkisinde de
bizdeki gibi "sözleşme dosyası + ilerleme kaydı" biçiminde durağan, denetlenebilir
bir iz dosyası yok.

## 3. Bağlam/token disiplini için somut mekanizma

**OpenCode**: `/compact` komutu ve otomatik context compaction var; plugin katmanında
`experimental.session.compacting` hook'u compaction promptuna ek bağlam enjekte
edebiliyor, `PostCompact` hook'u compaction sonrası LSP diagnostics çalıştırıyor.
(https://gist.github.com/johnlindquist/0adf1032b4e84942f3e1050aba3c5e4a,
https://deepwiki.com/code-yeongyu/oh-my-opencode/7.1-context-management-hooks)
TUI'de token/context kullanım göstergesi var fakat açık bug kaydı mevcut: cumulative
cache-read sayısını context penceresine bölüp %228 gibi anlamsız değerler
gösterebiliyor; ayrı bir `/context` komutu (Claude Code'daki gibi) henüz feature
request aşamasında. (https://github.com/anomalyco/opencode/issues/13003,
https://github.com/anomalyco/opencode/issues/10575)

**Crush**: Doğrulanamadı — resmi dokümantasyonda ayrı bir token-bütçe veya otomatik
özetleme mekanizması bulunamadı; sadece "oturum içi model değiştirme, bağlam
korunur" ifadesi var. (https://github.com/charmbracelet/crush)

Sonuç: OpenCode'un compaction + hook mekanizması bizim "diskteki iz dosyasını okuyan
sıfır-token statusline" fikrimizden farklı bir eksen (context'i küçültme, sıfır-token
okuma değil) ama ilgili bir disiplin katmanı.

## 4. Kurallar model disiplinine mi bırakılmış, mekanik mi?

**OpenCode**: Gerçek bir plugin/hook sistemi var — `@opencode-ai/plugin` şu event'leri
expose ediyor: `tool`, `auth`, `event`, `config`, `chat.message`, `chat.params`,
`permission.ask`, `tool.execute.before`, `tool.execute.after` (+ experimental
`chat.system.transform`, `session.compacting`).
(https://gist.github.com/johnlindquist/0adf1032b4e84942f3e1050aba3c5e4a)
Agent bazında izin (`read/edit/glob/grep/list/bash/task/lsp/skill` → allow/ask/deny,
glob pattern destekli) config'te tanımlı — mekanik uygulanıyor, modele bırakılmıyor.
(https://opencode.ai/docs/agents/)

**Crush**: `internal/permission/` içinde araç izin/allow-list kontrolü var; AGENTS.md
dosyasına göre "Hooks: kullanıcı tanımlı shell komutları, `crushrc` içinde tanımlı,
tool execution öncesi tetikleniyor" deniyor — fakat resmi kullanıcı dokümantasyonunda
(mintlify sitesi) bu hook sistemi doğrulanamadı, sadece iç mimari dosyasında
(AGENTS.md, geliştirici notu) geçiyor; "preliminary" (erken/deneysel) olarak
tanımlanıyor. (https://github.com/charmbracelet/crush/blob/main/AGENTS.md,
https://charmbracelet-crush.mintlify.app/)
Varsayılan davranış her tool çağrısında onay istemek; `permissions allow` ile
kalıcı izin veya `--yolo` ile tümünü atlama mümkün.
(https://github.com/charmbracelet/crush)

Özet: OpenCode'un hook/izin sistemi olgun ve dokümante; Crush'ınki var ama erken
aşamada ve resmi dokümantasyonda zayıf anlatılmış.

## 5. Alınmaya değer fikirler (en fazla 3)

1. **OpenCode'un granüler agent-permission matrisi** (araç × allow/ask/deny × glob
   pattern). Ne: her ajan tipi için hangi aracın hangi yol/desende otomatik,
   sorulur ya da yasak olduğunu tek config'te tanımlamak. Neden değerli: bizim
   builder/scribe/ui-builder/auditor ayrımı şu an ajan tanımıyla (prompt) sınırlı;
   glob bazlı izin matrisi "auditor kod yazamaz" gibi kuralları mekanik olarak da
   kilitler. Maliyet: orta — mevcut ajan tanım dosyalarına bir permission bloğu
   eklemek, hook sistemine dokunmadan yapılabilir.
   (https://opencode.ai/docs/agents/)

2. **`PostCompact`/`session.compacting` tipi bağlam-olayı hook'ları.** Ne: context
   sıkıştırma (compaction) anında devreye giren, özel bağlam enjekte eden veya
   compaction sonrası doğrulama (örn. LSP diagnostics) çalıştıran hook noktası.
   Neden değerli: relay'de sözleşme/ilerleme dosyaları context sıkışınca kaybolma
   riski taşıyor; compaction anında "sözleşme durumunu diske yaz" gibi bir hook
   veri kaybını önler. Maliyet: düşük-orta — mevcut hook altyapımıza yeni bir olay
   (PreCompact/PostCompact) eklemek yeterli, ayrı bir sistem gerekmiyor.
   (https://deepwiki.com/code-yeongyu/oh-my-opencode/7.1-context-management-hooks)

3. **Terminal tema tarafı — Crush'ın token-tabanlı stil katmanı** (quickstyle.go):
   tema, primary/secondary/fgBase/bgBase/success/error gibi adlandırılmış
   "design token" setinden inşa ediliyor, her tema bu token setini dolduran ayrı
   bir fonksiyon. Neden değerli: bizim neon paletimiz (cyan/magenta/mor) zaten
   token disiplinli ama Crush'ın "bir token seti → çoklu tema üret" kalıbı,
   ileride açık/koyu terminal varyantı ya da alternatif renk şeması eklemeyi
   kolaylaştırır. Maliyet: düşük — sadece tasarım kalıbı, uygulanacaksa
   teknesyum-ui içinde mevcut token dosyasının fonksiyon haline getirilmesi yeterli.
   (https://deepwiki.com/charmbracelet/crush/5.8-styling-system)

Statusline tarafında ikisinde de bizim "diskteki iz dosyasını okuyan sıfır-token
statusline" fikrine denk bir şey yok — OpenCode statusline'ı model/oturum
durumunu canlı API'den okuyor, Crush'ta statusline özelleştirmesi henüz açık bir
feature request (#2648). Bu bizim tarafımızda hâlâ özgün bir fark.
(https://github.com/charmbracelet/crush/issues/2648)

## 6. Şüpheli/riskli yanlar

- **Crush lisansı FSL-1.1-MIT** — OSI onaylı değil, "source-available"; rakip
  ticari ürün/hizmet olarak yeniden paketlemeyi kısıtlıyor, her sürüm 2 yıl sonra
  MIT'e dönüşüyor. Ne sayılır "rakip ürün" belirsiz, topluluk kendi içinde bunu
  tartışıyor. (https://github.com/charmbracelet/crush/discussions/1482)
- **OpenCode/Crush ayrılığı tartışmalı** — aynı isim (opencode) üzerinde iki ekip
  arasında anlaşmazlık yaşanmış, bazı kullanıcılar isim kullanımını yanıltıcı
  bulmuş; iki proje de birbirinin "gölgesinde" başladı.
  (https://vibecodinghub.org/blog/crush-coding-agent-review,
  https://github.com/charmbracelet/crush/issues/1097)
- **OpenCode kurumsal arkası ticari şirket (Anomaly/SST)** — repo yakın zamanda
  `sst/opencode`'dan `anomalyco/opencode`'a taşındı (rebranding, teknik risk düşük
  ama entegrasyon/CI referansları güncellenmesi gerekiyor).
  (https://news.ycombinator.com/item?id=46552218)
- **OpenCode context% göstergesi bilinen hata içeriyor** — cumulative cache-read
  sayısını context penceresine bölüp %228 gibi anlamsız oranlar üretebiliyor;
  token disiplini iddiasına rağmen gösterge katmanı olgun değil.
  (https://github.com/anomalyco/opencode/issues/13003)
- **Crush'ın hook sistemi "preliminary"** — resmi kullanıcı dokümantasyonunda
  neredeyse hiç anlatılmıyor, sadece iç geliştirici notunda (AGENTS.md) geçiyor;
  üzerine mekanik kural kurmak şu an riskli. (https://github.com/charmbracelet/crush/blob/main/AGENTS.md)
- **Alt ajan/session hataları** — OpenCode'da "subagent bitince otomatik ebeveyne
  dönmüyor" ve "REST API üzerinden Task tool çağrılınca session sonsuza kadar
  askıda kalabiliyor" gibi açık bug kayıtları var; alt-ajan mimarisi henüz
  tam oturmamış. (https://github.com/anomalyco/opencode/issues/6491,
  https://github.com/sst/opencode/issues/6573)

## Kaynaklar

- https://deepwiki.com/sst/opencode/3.2-agent-system
- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/
- https://opencode.ai/docs/themes/
- https://github.com/anomalyco/opencode
- https://github.com/anomalyco/opencode/pull/7756
- https://github.com/anomalyco/opencode/issues/17870
- https://github.com/anomalyco/opencode/issues/13003
- https://github.com/anomalyco/opencode/issues/10575
- https://github.com/anomalyco/opencode/issues/6491
- https://github.com/sst/opencode/issues/6573
- https://gist.github.com/johnlindquist/0adf1032b4e84942f3e1050aba3c5e4a
- https://deepwiki.com/code-yeongyu/oh-my-opencode/7.1-context-management-hooks
- https://news.ycombinator.com/item?id=46552218
- https://github.com/charmbracelet/crush
- https://github.com/charmbracelet/crush/blob/main/AGENTS.md
- https://github.com/charmbracelet/crush/discussions/1482
- https://github.com/charmbracelet/crush/issues/1097
- https://github.com/charmbracelet/crush/issues/2648
- https://deepwiki.com/charmbracelet/crush/5.1-tui-architecture-and-appmodel
- https://deepwiki.com/charmbracelet/crush/5.8-styling-system
- https://charmbracelet-crush.mintlify.app/
- https://vibecodinghub.org/blog/crush-coding-agent-review
- https://www.openaitoolshub.org/en/blog/opencode-review-terminal-ai-coding
