# obra/superpowers — en çok yıldızlanan Claude Code eklentisi

Karşılaştırma tabanı: bizde 2 skill (53.147 B + 27.730 B), 7 alt ajan (ort. 3.324 B),
hook'larda 6 `additionalContext` çağrısı (yerel ölçüm, 2026-08-22).

## 1. Ne yapıyor, hangi problemi çözüyor

Süreç disiplinini skill'e çeviren bir eklenti: beyin fırtınası, plan yazma, TDD,
sistematik hata ayıklama, kod incelemesi isteme/alma, worktree kullanımı, alt ajanlarla
paralel iş dağıtımı. Bizim relay + agents ikilisinin doğrudan muadili — aynı problemi
çözüyor: ajanın keyfine bırakılmış çalışma sırasını kurallaştırmak.

API verileri (2026-08-22): son push `2026-08-19T17:33:23Z`, son etiketli sürüm **v6.3.0**
(2026-08-12), 275.966 yıldız, **300 açık issue**, **MIT**.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök: `skills/`, `hooks/`, `docs/`, `tests/`, `scripts/`, `assets/`, `CLAUDE.md` (8.873 B),
`README.md` (12.137 B), `RELEASE-NOTES.md` (94.003 B). Ayrıca her koşum ortamı için ayrı
eklenti dizini: `.claude-plugin`, `.codex-plugin`, `.cursor-plugin`, `.devin-plugin`,
`.hermes-plugin`, `.kimi-plugin`, `.opencode`, `.pi`, `.agents`. `AGENTS.md` 9 B ve
`GEMINI.md` 92 B — sadece yönlendirme.

14 skill, SKILL.md boyutları (bayt): subagent-driven-development 32.339,
writing-skills 26.360, brainstorming 15.456, systematic-debugging 9.465,
test-driven-development 9.015, finishing-a-development-branch 7.781, writing-plans 7.053,
using-git-worktrees 6.813, receiving-code-review 6.203, dispatching-parallel-agents 6.078,
verification-before-completion 3.646, using-superpowers 3.108,
requesting-code-review 2.956, executing-plans 2.305. **Toplam 138.578 B, ortalama 9.898 B.**

Alt ajan dosyası yok — iş `Skill` aracı ve alt ajan gönderimiyle yapılıyor
(`dispatching-parallel-agents` 6.078 B, `subagent-driven-development` 32.339 B).

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**SessionStart hook'u tek bir skill'i tam metin enjekte ediyor; geri kalan her şey
tembel.** `hooks/session-start` (2.274 B, bash) `skills/using-superpowers/SKILL.md`
dosyasının **tamamını** (3.108 B) okuyup `<EXTREMELY_IMPORTANT>` etiketleri arasında
`additionalContext` olarak veriyor. Yani oturum başına sabit enjeksiyon **~3,1 KB
≈ 800 token**; kalan 135 KB skill yalnız tetiklenince geliyor.

Enjekte edilen metnin kendisi de bir yönlendirici: "bir skill uygulanıyorsa kullanmak
zorundasın", skill önceliği (önce süreç skill'i, sonra uygulama skill'i) ve 12 satırlık
"kırmızı bayrak" tablosu. İçerik değil, **içeriğe gitme kuralı** enjekte ediliyor.

Üçüncü ayrıntı: aynı hook üç farklı çıktı biçimini ayırt ediyor (Cursor
`additional_context`, Claude Code `hookSpecificOutput.additionalContext`, Copilot CLI
`additionalContext`) ve yorumda şu not var — Claude Code her ikisini de okuyup
tekrarı ayıklamıyor, bu yüzden **tek alan** basılmalı. Çift enjeksiyon tuzağı.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Marketplace üzerinden eklenti kurulumu; `.claude-plugin/plugin.json` 497 B,
`marketplace.json` 514 B. Hook Windows için `hooks/run-hook.cmd` (1.460 B) ile
sarmalanmış. `hooks/hooks.json` 334 B, `hooks-cursor.json` 137 B.

Hata hâli iki yerde görünür: session-start okuma hatasında dosya içeriği yerine
"Error reading using-superpowers skill" enjekte ediliyor (oturum ölmüyor); ve bash 5.3+
heredoc kilitlenmesi için printf'e geçilmiş (issue #571 referansı kodda yazılı).

## 5. Alınmaya değer en fazla 3 fikir

**1. Oturum açılışında içerik değil, yalnız "giriş skill'i" enjekte et — 3.108 B.**
Ne: SessionStart'ta tek bir 3,1 KB'lık yönlendirici metin; geri kalan 135 KB skill
tembel. Bizde `relay-watch.js` içinde 6 ayrı `additionalContext` noktası var ve toplam
bayt yazılı değil.
Neden değerli: hedef ölçülebilir hâle gelir — "oturum açılış enjeksiyonu ≤ 3 KB, tek
noktadan". Bugünkü toplamı ölçmek bile tek başına bulgu üretir.
Maliyet: enjeksiyon noktalarını tek fonksiyonda toplamak + bayt sayacı; yarım gün.
Risk: relay'in devir/sözleşme durumunu bildirmesi gerekiyor, o metin sabit değil —
tavanı aşan durumda kısaltma kuralı gerekir.

**2. Skill'i sınıflandır: "her oturum yüklenen" ve "gerektiğinde yüklenen".**
Ne: `skills/writing-skills/SKILL.md` içinde yazılı bütçe var — getting-started akışları
**<150 kelime**, sık yüklenen skill'ler **toplam <200 kelime**, diğerleri **<500 kelime**,
description **<500 karakter**, 100+ satırlık referans ayrı dosyaya.
Neden değerli: bizde böyle bir ayrım yok; `relay/SKILL.md` hem her oturum okunan
yönlendirici hem de protokol el kitabı. Ayrım konursa "her oturum yüklenen" parça
200 kelime ≈ 1,3 KB'ye iner, bugünkü 53.147 B'nin %2,5'i.
Maliyet: relay'in bölünmesi — en pahalı fikir, ama en büyük kazanç burada.

**3. Enjeksiyon çıktısını tek alandan bas.**
Ne: kodda yazılı uyarı — Claude Code hem `additional_context` hem
`hookSpecificOutput.additionalContext` okur ve **tekrarı ayıklamaz**; ikisi birden
basılırsa aynı metin iki kez bağlama girer.
Neden değerli: doğrudan sessiz iki kat maliyet. Burada somut karşılığı 3.108 B yerine
6.216 B, yani oturum başına ~800 token yerine ~1.600. Bizim 6 enjeksiyon noktasının
hangi alanı bastığı denetlenmeli — tek satırlık bir grep.
Maliyet: bir grep, bir düzeltme.

## 6. Şüpheli/riskli yanlar

- **Lisans temiz:** MIT (`LICENSE` 1.070 B). Marka ayrı korunuyor diye bir kayıt yok.
- **Bakım canlı:** son push 2026-08-19, son sürüm v6.3.0 (2026-08-12), 300 açık issue.
- **Kendi bütçesini çiğniyor.** "Diğer skill'ler <500 kelime" derken
  `subagent-driven-development` 32.339 B (~4.800 kelime), `writing-skills` 26.360 B.
  Sınır yalnız sık yüklenenler için tutulmuş; tetiklenince yine de 8 KB token gelir.
- **Yıldız sayısı şüpheli okunmalı.** API 275.966 yıldız veriyor — bu, resmi
  `anthropics/claude-code` deposunun (142.386) neredeyse iki katı. Rakam API'den geldi,
  ama popülerlik göstergesi olarak tek başına yorumlanmamalı.
- **Gizli kurulum maliyeti:** dokuz ayrı koşum ortamı klasörü ve senkron script'leri
  (`scripts/sync-to-codex-plugin.sh` 14.995 B, testi 24.022 B). Tek ortam kullanıyorsak
  bu yüzeyin bakımını devralmak gerekmez, ama depo okunurken kafa karıştırır.
- `docs/superpowers/plans/` altında tek plan dosyası 77.641 B. Bunlar bağlama girmiyor
  ama depo boyutunun büyük kısmı burada; "skill boyutu" ile karıştırılmamalı.

## Kaynaklar

- `gh api repos/obra/superpowers` — push, yıldız, issue, lisans (2026-08-22)
- `gh api repos/obra/superpowers/releases/latest` — v6.3.0, 2026-08-12
- `gh api repos/obra/superpowers/git/trees/HEAD?recursive=1` — SKILL.md ve hook boyutları
- `raw.githubusercontent.com/obra/superpowers/main/hooks/session-start` — enjeksiyon biçimi
- `raw.githubusercontent.com/obra/superpowers/main/skills/using-superpowers/SKILL.md`
- `raw.githubusercontent.com/obra/superpowers/main/skills/writing-skills/SKILL.md` — kelime bütçeleri
- Frontmatter ölçümü: 8 skill örneklendi, toplam 1.354 B, ortalama 169 B
