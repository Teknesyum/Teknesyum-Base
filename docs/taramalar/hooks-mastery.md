# disler/claude-code-hooks-mastery — 13 hook türünün referans uygulaması

Karşılaştırma tabanı: bizde 6 hook dosyası (`relay-watch.js` 52,1 KB, `dil.js` 37,1 KB,
`contract-guard.js` 13,9 KB, `ortak.js` 6,6 KB, `kapsayici.js` 5,0 KB, `hooks.json` 2,6 KB)
ve 11 hook olayı bağlı.

## 1. Ne yapıyor, hangi problemi çözüyor

Claude Code'un tüm hook yaşam döngüsünü tek depoda gösteren eğitim/referans projesi:
her hook türü için çalışan bir Python script'i, akış kontrolü, çıkış kodları, JSON
çıktı biçimleri ve durum satırı örnekleri. Bizim `teknesyum/hooks/` klasörünün doğrudan
muadili — ama üretim eklentisi değil, vitrin.

API verileri (2026-08-22): son push `2026-03-04T18:16:25Z` (**~5,5 ay hareketsiz**),
3.900 yıldız, **37 açık issue**, **lisans yok** (`license` alanı boş, depoda LICENSE
dosyası görünmüyor).

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök: `.claude/`, `apps/`, `ai_docs/`, `specs/`, `images/`, `README.md` (41.392 B),
`CLAUDE.md` (**0 B** — boş dosya), `ruff.toml`, `ty.toml`, `.mcp.json.sample`.

`.claude/` içeriği (bayt): `hooks/subagent_stop.py` 10.803, `hooks/setup.py` 10.661,
`hooks/validators/validate_file_contains.py` 10.641, `hooks/permission_request.py` 7.915,
`hooks/stop.py` 7.465, `hooks/validators/validate_new_file.py` 7.152,
`hooks/session_start.py` 6.629, `hooks/user_prompt_submit.py` 6.424,
`hooks/pre_tool_use.py` 5.145, `hooks/subagent_start.py` 4.962,
`hooks/session_end.py` 4.063, `hooks/notification.py` 4.063, `hooks/pre_compact.py` 3.941,
`settings.json` 3.572. Ayrıca dokuz sürüm durum satırı (`status_line.py` → `_v9.py`,
4.147–5.723 B) ve `commands/plan_w_team.md` 14.297 B.

Sınır: kod Python'da, markdown'da değil. Yani **hook mantığı bağlama girmiyor**;
bağlama giren tek şey hook'un bastığı metin.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Enjeksiyonun kaynakta kırpılması.** `session_start.py` (6.629 B) oturum açılışında
geliştirme bağlamı yüklüyor: `get_git_status()`, `get_recent_issues()` ve proje bağlam
dosyaları. Kritik satır, okunan her bağlam dosyasının **ilk 1.000 karakterle**
sınırlanması (`content[:1000]`), sonuç `hookSpecificOutput.additionalContext` ile
veriliyor.

Yani enjeksiyonun üst sınırı dosya boyutundan değil **hook kodundan** geliyor. Bu,
"kural dosyası büyürse enjeksiyon büyür" zincirini kesiyor: dosya 50 KB olsa da bağlama
1 KB giriyor.

İkinci mekanizma: `UserPromptSubmit` hook'u hem doğrulama hem enjeksiyon noktası olarak
kullanılıyor ve **istem engelleyebiliyor**; `PreToolUse` araç çağrısını iptal edebiliyor.
Yani bir kuralı "metinle hatırlat" yerine "ihlali durdur" biçiminde uygulama örneği.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Script'ler `uv` tek dosya biçiminde: bağımlılıklar dosyanın başındaki blokta, ayrı
kurulum yok. Opsiyonel olarak TTS ve LLM yardımcıları (`utils/llm/anth.py` 5.760 B,
`oai.py` 5.747 B, `ollama.py` 5.637 B) — yani hook içinden model çağırma örneği.

README 41.392 B ve her hook türü için çıkış kodu davranışını ve akış kontrolünü tablo
hâlinde veriyor. Hata hâli: çıkış kodu 2 engelleme, diğerleri uyarı; `PostToolUse`
engelleyemez (araç zaten çalışmıştır).

## 5. Alınmaya değer en fazla 3 fikir

**1. Enjekte edilen her parçayı kaynakta kırp — burada dosya başına 1.000 karakter.**
Ne: `content[:1000]`. Bağlam dosyası ne kadar büyürse büyüsün enjeksiyon sabit kalıyor.
Neden değerli: bizim `relay-watch.js` içinde 6 `additionalContext` noktası var ve
bastıkları metnin uzunluğu sözleşme/devir dosyalarının boyutuna bağlı — yani sınırsız.
Sözleşme dosyası büyüdükçe her oturum daha pahalı hâle geliyor; bu, "base açık koşu daha
pahalı" bulgusunun doğrudan açıklaması olabilir.
Maliyet: her enjeksiyon noktasına tek satırlık kırpma; risk, kırpılan yerin kritik bilgi
taşıması — bu yüzden kırpma sonuna "…kısaltıldı, tam metin: <yol>" eklenmeli.

**2. Kuralı hatırlatma yerine engelleme olarak yaz.**
Ne: `PreToolUse` çıkış kodu 2 ile araç çağrısını iptal ediyor; kural metni bağlamda
durmuyor, ihlal anında bir satır uyarı çıkıyor.
Neden değerli: bizim `RULES.md` (30 satır tavanlı) ve `dil.js` (37,1 KB kod) karışımında
bazı kurallar hem metinde hem hook'ta yaşıyor. Hook'ta zaten yakalanan bir kuralın
metinde tekrar edilmesi net kayıp; `relay/SKILL.md` 53.147 B gövdesinde bu tekrarların
ayıklanması ölçülebilir hedef — her çıkarılan 400 B ≈ 100 token/çağrı.
Maliyet: hangi kuralın deterministik olarak yakalanabileceğini ayıklamak — bir oturumluk
envanter işi, kod değişikliği küçük.

**3. Durum satırını sürümle, bağlama hiç dokunma.**
Ne: dokuz sürüm durum satırı (4.147–5.723 B), tamamı Python; kullanıcıya bilgi veriyor,
modele tek karakter göndermiyor.
Neden değerli: "ajan bilsin" diye enjekte ettiğimiz bazı bilgiler aslında **kullanıcının**
bilmesi gereken şeyler. Onları durum satırına taşımak bağlam maliyetini sıfırlar.
Maliyet: statusline zaten bizde var; taşınacak içeriğin ayıklanması yarım gün.

## 6. Şüpheli/riskli yanlar

- **Lisans yok.** `gh api repos/... --jq .license` boş, depoda LICENSE dosyası
  görünmüyor. Lisanssız kod varsayılan olarak "tüm hakları saklı" sayılır — **kod
  kopyalanamaz**, yalnız desen alınır. Bu tarama zaten kod kopyalamıyor.
- **Bakım durmuş.** Son push 2026-03-04, bugün 2026-08-22 → ~5,5 ay. 37 açık issue.
  Bağımlılık kurulmamalı; okumak serbest.
- **Etiketli sürüm yok** (`releases` sorgulanmadı — `doğrulanamadı`).
- **`CLAUDE.md` 0 B.** Vitrin deposu olduğu için proje talimatı boş; "referans uygulama"
  diye alınırken bunun taklit edilmemesi gerekir.
- **README 41.392 B.** Depo dokümanı bağlama girmez, ama bu boyut bir hook rehberinin
  kendi kendine şişebileceğini gösteriyor.
- **Gizli kurulum maliyeti:** `uv` (Python) çalışma zamanı; TTS ve LLM yardımcıları için
  ayrıca API anahtarları (`.env.sample` 152 B). Bizim hook'lar Node ile çalışıyor,
  ikinci bir çalışma zamanı eklemek istemiyoruz.

## Kaynaklar

- `gh api repos/disler/claude-code-hooks-mastery` — push, yıldız, issue, lisans (2026-08-22)
- `gh api repos/disler/claude-code-hooks-mastery/git/trees/HEAD?recursive=1` — dosya boyutları
- `raw.githubusercontent.com/disler/claude-code-hooks-mastery/main/.claude/hooks/session_start.py`
  — `content[:1000]` kırpma, `additionalContext` çıkışı
- `raw.githubusercontent.com/disler/claude-code-hooks-mastery/main/README.md` — hook türleri,
  çıkış kodları, akış kontrolü
