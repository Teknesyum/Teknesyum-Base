# Goose ve Continue Taraması

## 1. Ne yapıyor, hangi problemi çözüyor?

**Goose** (Block/Square imzalı, Apache-2.0): Yerel/CLI+Desktop çalışan, herhangi bir LLM'e bağlanabilen açık kaynak kodlama ajanı. MCP uzantılarıyla dosya/terminal/araç erişimi verir, "recipe" adlı YAML tarifleriyle iş akışlarını paketler.
[github.com/block/goose](https://github.com/block/goose)

**Continue** (Apache-2.0, VS Code/JetBrains eklentisi): Model+kural+araç bileşenlerini `config.yaml` ile birleştirip özelleştirilmiş bir kodlama asistanı kurmayı sağlar; bileşenler `hub.continue.dev` üzerinden paylaşılır.
[docs.continue.dev](https://docs.continue.dev/) — **18 Haziran 2026'da Cursor tarafından satın alındı, ürün yolu kapatıldı** (bkz. madde 6).
[thenewstack.io](https://thenewstack.io/cursor-acquires-continue-coding/)

## 2. İş devri (handoff) nasıl oluyor?

**Goose — recipe/sub-recipe:** `recipe.yaml` dosyası name/version/description/parameters/extensions/instructions (Jinja2 şablonlu) alanlarından oluşur. `sub_recipes:` alanıyla başka recipe dosyaları sırayla çağrılıp parametre aktarılabilir.
[block-goose.mintlify.app/guides/recipes](https://block-goose.mintlify.app/guides/recipes)

Dağıtım: yerel dosya, ham URL veya `github:owner/repo/recipe.yaml` — Goose indirip önbelleğe alıyor. Resmi bir paket registry'si **yok**; topluluk paylaşımı GitHub Issues tabanlı "Recipe Cookbook" ile yürüyor (ödüllü Hacktoberfest kampanyası dahil), sürüm/otomatik güncelleme mekanizması yok.
[github.com/block/goose/issues/6768](https://github.com/block/goose/issues/6768), [x.com/blockopensource](https://x.com/blockopensource/status/1963293467100004762)

**Goose — subagent:** Ayrı `Agent` örneği, kendi izole oturumunda çalışır (`platform__create_task`/`execute_tasks`). Doğal dille tetiklenir ("2 subagent kullan..."), resmi bir dosya formatı yok; sadece subrecipe'ler subagent olarak delege edilebiliyor. Aralık 2025'te açılan tartışmada (#6202) recipe/skill/subagent arasında ortak `load`/`delegate` arayüzü planlandı, Şubat 2026'da PR #6964 ile kapatıldı — kısmen bizim "işçi ajan sözleşme dosyası alır" modeline yaklaşıyor ama denetçi/kabul kriteri kavramı yok.
[block.github.io/goose/blog/.../subagents-vs-subrecipes](https://block.github.io/goose/blog/2025/09/26/subagents-vs-subrecipes/), [github.com/block/goose/discussions/6202](https://github.com/block/goose/discussions/6202)

**Continue — blocks/hub:** Blok = tek bir bileşen (model, rule, context provider, prompt, docs, MCP server) tanımlayan YAML; `owner/slug` ile `hub.continue.dev`'den `uses:` söz dizimiyle çekiliyor, secrets `${{ secrets.X }}` ile enjekte ediliyor. Assistant = birden çok bloğun birleşimi. Bu, npm/registry benzeri gerçek bir paket dağıtım modeli — versiyon ve slug var.
[docs.continue.dev/guides/configuring-models-rules-tools](https://docs.continue.dev/guides/configuring-models-rules-tools)

**Continue — rules:** `.continue/rules/*.md` (frontmatter: `name, globs, alwaysApply, description`), leksikografik sırayla yükleniyor, dosya adı numaralanarak sıra kontrol ediliyor.
[docs.continue.dev/customize/deep-dives/rules](https://docs.continue.dev/customize/deep-dives/rules)

## 3. Bağlam/token disiplini için somut mekanizma

**Goose subagent izolasyonu** en güçlü bulgu: her subagent kendi `ExtensionManager`/tool-monitor/context'ine sahip ayrı oturumda çalışıyor, ana oturuma sadece özet (başarı/hata, süre, sonuç) dönüyor — verbose tool çıktısı ana bağlamı hiç kirletmiyor. Limit: eşzamanlı 10 subagent, varsayılan 5 dk timeout, 25 tur tavanı (`GOOSE_SUBAGENT_MAX_TURNS` ile değiştirilebilir).
[nickyt.co/.../advent-of-ai-day-11-goose-subagents](https://www.nickyt.co/blog/advent-of-ai-day-11-goose-subagents/)

**Continue** tarafında token/bağlam disiplinine yönelik özel bir mekanizma **doğrulanamadı** — rules dosyaları context'e eklenen metin talimatları, ayrı bağlam yönetimi/özetleme sistemi bulunamadı.

## 4. Kurallar model disiplinine mi bırakılıyor, mekanik mi uygulanıyor?

**Goose:** İki katman var. Kod/dosya kuralları tamamen prompt/recipe metnine bağlı (model disiplini). Ancak **araç izinleri mekanik**: `permission.yaml` + çok aşamalı inceleme hattı, Auto/Approve/Chat/SmartApprove modlarıyla tool çağrısını modelin isteğinden bağımsız engelleyebiliyor.
[deepwiki.com/block/goose/6.1-permission-system-architecture](https://deepwiki.com/block/goose/6.1-permission-system-architecture)

**Continue:** Aynı ayrım var. Kod stili/mimari kuralları (`rules/*.md`) **modele bırakılmış** — `alwaysApply:false` olduğunda glob eşleşmezse "model description'ı okuyup karar veriyor", yani mekanik değil. Araç izinleri ise mekanik: CLI'de `--allow/--ask/--exclude`, read-only araçlar varsayılan allow, Write/Edit/Bash varsayılan ask, kalıcı ayar `~/.continue/permissions.yaml`.
[docs.continue.dev/cli/tool-permissions](https://docs.continue.dev/cli/tool-permissions)

Sonuç: **ikisi de bizdeki gibi hook tabanlı, tool-çağrısından bağımsız, kod kuralı düzeyinde mekanik bir uygulama katmanına sahip değil** — sadece tool-izin katmanı mekanik.

## 5. Alınmaya değer en fazla 3 fikir

1. **Subagent context izolasyonu + özet-dönüş sözleşmesi** (Goose) — Ne: alt ajan kendi oturumunda çalışır, ana oturuma sadece başarı/hata + sonuç döner, ayrıntı hiç sızmaz. Neden değerli: bizim işçi ajan modelimizde de rapor disiplinini (bu ajanın kendisi de örneği) somutlaştırıyor — süre/tur tavanı gibi sayısal limitler ekleyebiliriz. Maliyet: düşük, zaten benzer bir desenimiz var; eklenecek olan sadece "max tur/timeout" gibi sınırların sözleşme şablonuna yazılması.

2. **`uses: owner/slug` + `with: secrets` blok referans söz dizimi** (Continue Hub) — Ne: bileşenleri (kural, model, MCP server) slug+versiyonla merkezi bir registry'den çekip parametre/secret enjekte etme. Neden değerli: bizim "eklenti kendi marketplace'i olan git deposu" modeline versiyonlu, parametrik bir referans sözdizimi katmanı ekler; şu an git deposu klonlama/dosya kopyalama seviyesindeyiz. Maliyet: orta — slug çözümleme + secret enjeksiyonu için küçük bir CLI/script katmanı gerekir, ama **Continue Hub'ın kendisi artık bakımsız ve login akışı kapatılmış** (bkz. madde 6), yani örnek alınacak olan sözdizimi fikri, altyapısı değil.

3. **Topluluk "Recipe Cookbook" + ödül modeli** (Goose) — Ne: GitHub Issues üzerinden tarif gönderimi, onaylanana küçük bir teşvik (OpenRouter kredisi). Neden değerli: bizim marketplace deposuna dışarıdan katkı akışı yok; bu düşük maliyetli bir "issue-template + onay + teşvik" deseni. Maliyet: düşük — sadece bir issue template ve onay süreci; gerçek bir paket/versiyon sistemi değil, bizim git-depo modelimizden daha zayıf, sadece katkı akışı fikri alınmaya değer.

**Kıyas — paylaşılabilir tarif/blok dağıtımı:** Goose'ta merkezi bir marketplace **yok** (sadece GitHub/URL + gayriresmi cookbook), Continue'da vardı ama artık **canlı değil sayılır** (satın alma sonrası login akışı kaldırıldı). Bizim "kendi marketplace'i olan git deposu" modelimiz ikisinden de daha somut ve sürdürülebilir bir dağıtım şekli — buradan çalınacak tek şey Continue'nun `uses:`+slug+secret söz dizimi.

## 6. Şüpheli/riskli yanlar

- **Continue artık pratikte terk edilmiş.** 18 Haziran 2026'da Cursor tarafından satın alındı, son sürüm (v2.0.0-vscode) 19 Haziran'da çıktı, bulut verisi 15 Temmuz'dan sonra siliniyor, login akışı kaldırıldı ("Sign in link removed — login flow retired after acquisition"). Repo arşivlenmemiş/pushedAt güncel görünüyor ama commit geçmişi Haziran ortasından sonra neredeyse tamamen docs/CI temizliği; açık PR'lar merge edilmeden kapatılıyor (`merged_at: null`). Kod Apache-2.0 kalıyor ama aktif geliştirme bitti — **Hub'ın (paylaşım altyapısının) geleceği belirsiz**, buna dayanarak plan kurmak riskli.
  [thenewstack.io](https://thenewstack.io/cursor-acquires-continue-coding/), [bodegaone.ai](https://www.bodegaone.ai/blog/cursor-acquires-continue-dev), gh api repos/continuedev/continue (doğrudan sorgu, 2026-08-19)

- **Cursor'ın kendisi de belirsiz bir el değiştirme sürecinde**: haber akışlarına göre 16 Haziran 2026'da SpaceX'in Cursor'ı 60 milyar dolarlık hisse takasıyla satın alacağı duyuruldu (xAI şemsiyesi altında, Q3 2026 kapanış bekleniyor) — bu iddia ikincil kaynaklardan geliyor, **doğrulanamadı** düzeyinde tutulmalı, ama Continue'nun üstündeki belirsizliği katmerliyor.
  [forum.level1techs.com](https://forum.level1techs.com/t/continue-dev-acquired-by-cursor-acquired-by-spacex/251651)

- **Goose recipe dağıtımı registry değil.** "Marketplace support: No" resmi olarak kabul ediliyor (issue #6768); recipe'ler README/versiyon/imza metadata'sından yoksun, klasör/dosya ağacına sıkı bağımlı — yeniden kullanılabilir modül değil, gevşek script koleksiyonu. Cookbook ödül kampanyası pazarlama amaçlı abartılı görünüyor ("Let the community cook 🎁") ama arkasında kalite kontrolü zayıf.

- **Goose subagent dosya formatı resmi olarak belgelenmemiş** — doğal dil talimatına dayanıyor, deterministik bir sözleşme dosyası (bizdeki gibi) yok; bu da tekrarlanabilirlik açısından zayıf nokta.

- Lisans tarafında risk yok: ikisi de Apache-2.0, ticari kullanım serbest.
  gh api repos/block/goose, gh api repos/continuedev/continue (doğrudan sorgu, 2026-08-19)

## Kaynaklar

- [github.com/block/goose](https://github.com/block/goose)
- [block-goose.mintlify.app/guides/recipes](https://block-goose.mintlify.app/guides/recipes)
- [block.github.io/goose/blog/2025/09/26/subagents-vs-subrecipes](https://block.github.io/goose/blog/2025/09/26/subagents-vs-subrecipes/)
- [github.com/block/goose/discussions/6202](https://github.com/block/goose/discussions/6202)
- [github.com/block/goose/issues/6768](https://github.com/block/goose/issues/6768)
- [nickyt.co/blog/advent-of-ai-day-11-goose-subagents](https://www.nickyt.co/blog/advent-of-ai-day-11-goose-subagents/)
- [deepwiki.com/block/goose/6.1-permission-system-architecture](https://deepwiki.com/block/goose/6.1-permission-system-architecture)
- [x.com/blockopensource/status/1963293467100004762](https://x.com/blockopensource/status/1963293467100004762)
- [docs.continue.dev/hub/blocks/intro](https://docs.continue.dev/hub/blocks/intro)
- [docs.continue.dev/customize/deep-dives/rules](https://docs.continue.dev/customize/deep-dives/rules)
- [docs.continue.dev/guides/configuring-models-rules-tools](https://docs.continue.dev/guides/configuring-models-rules-tools)
- [docs.continue.dev/cli/tool-permissions](https://docs.continue.dev/cli/tool-permissions)
- [thenewstack.io/cursor-acquires-continue-coding](https://thenewstack.io/cursor-acquires-continue-coding/)
- [bodegaone.ai/blog/cursor-acquires-continue-dev](https://www.bodegaone.ai/blog/cursor-acquires-continue-dev)
- [forum.level1techs.com — Continue/Cursor/SpaceX zinciri](https://forum.level1techs.com/t/continue-dev-acquired-by-cursor-acquired-by-spacex/251651)
- GitHub API doğrudan sorgu: `gh api repos/block/goose`, `gh api repos/continuedev/continue` (2026-08-19)
