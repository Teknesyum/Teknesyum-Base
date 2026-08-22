# anthropics/claude-code — resmi depo, plugin ve skill mimarisi

Karşılaştırma tabanı: Teknesyum Base. Bizde `teknesyum/skills/relay/SKILL.md` **53.147 B**,
`teknesyum/skills/teknesyum-ui/SKILL.md` **27.730 B**, 7 alt ajan ortalama **3.324 B**,
36 markdown dosyası toplam **223.754 B** (yerel ölçüm, 2026-08-22).

## 1. Ne yapıyor, hangi problemi çözüyor

Claude Code'un genel depo yüzü: CLI'ın kendisi kapalı kaynak, depoda **resmi eklenti
koleksiyonu**, örnekler, changelog ve issue takibi duruyor. Bizi ilgilendiren kısım
`plugins/` altındaki 13 resmi eklenti — özellikle `plugin-dev`, bir eklentinin skill,
komut, hook ve ajanının nasıl yazılacağını anlatan referans uygulama.

API verileri (gh api, 2026-08-22): son push `2026-08-22T14:45:30Z`, son etiketli sürüm
**v2.1.240** (2026-08-22), 142.386 yıldız, **15.048 açık issue**, 22.828 fork.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök ağaç: `plugins/`, `examples/`, `scripts/`, `Script/`, `.claude-plugin/`,
`CHANGELOG.md` (543.817 B), `demo.gif` (11.002.760 B), `feed.xml` (82.748 B).
Depo boyutunun tamamı sürüm geçmişi ve varlıklardan geliyor; **çalışma zamanında
yüklenen** kısım yalnızca `plugins/` altındaki eklenti.

Eklentiler: agent-sdk-dev, claude-opus-4-5-migration, code-review, commit-commands,
explanatory-output-style, feature-dev, frontend-design, hookify, learning-output-style,
plugin-dev, pr-review-toolkit, ralph-wiggum, security-guidance.

`plugin-dev` skill'lerinin ölçüsü (gh api git/trees, bayt):

| Skill | SKILL.md | referans/örnek dosyaları |
|---|---|---|
| skill-development | 22.827 | skill-creator-original.md 11.547 |
| command-development | 18.941 | 7 dosya: 20.980 / 16.437 / 14.971 / 14.803 / 14.622 / 13.618 / 13.989 |
| hook-development | 16.246 | 3 referans + 4 script |
| plugin-structure | 13.796 | advanced-plugin.md 18.746, standard-plugin.md 13.310, manifest-reference 12.061 |
| mcp-integration | 12.519 | tool-usage.md 11.674 |
| plugin-settings | 12.101 | parsing-techniques.md 11.513 |

Yani gövde 12–23 KB, ağır içerik 11–21 KB'lık ayrı dosyalarda. Hiçbir SKILL.md kendi
referans dosyalarını içine almamış.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Üç katmanlı progressive disclosure ve bunun yazılı sayısal sınırı.**
`plugins/plugin-dev/skills/skill-development/SKILL.md` içinde açıkça yazıyor:

1. Metadata (name + description) — **her zaman bağlamda**, ~100 kelime
2. SKILL.md gövdesi — skill tetiklenince, **<5.000 kelime**, hedef 1.500–2.000
3. Paket kaynakları — gerektiğinde; script'ler **bağlama okunmadan** çalıştırılır

Resmi belge (platform.claude.com, agent-skills/best-practices) aynı sınırı başka birimle
veriyor: `description` **en fazla 1.024 karakter**, `name` en fazla 64 karakter, SKILL.md
gövdesi **500 satırın altında**, referanslar **SKILL.md'den bir seviye derinlikte** (iki
seviye olursa Claude `head -100` ile kısmi okuyor), 100 satırdan uzun referans dosyasının
başına içindekiler.

`security-guidance` eklentisi bunun tersini gösteriyor: kural metnini bağlama enjekte
etmek yerine **ayrı bir model çağrısına** taşımış. Üç katman: ~25 regex deseni (yalnız
eşleşince uyarı basar), Stop hook'unda diff'i ayrı LLM'e gönderen inceleme, commit'te
SDK ile çalışan ajanik inceleme. Hook script'leri 103.394 B ve 112.010 B — bunlar Python,
bağlama hiç girmiyor.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`/plugin install <ad>@claude-plugins-official`. Marketplace CC ile birlikte varsayılan
açık geliyor; security-guidance için ek şart yalnızca CC ≥ v2.1.144 ve PATH'te Python 3.8+
(`python3`, `python`, `py -3` sırayla denenir).

Hata ve kaçış yolu tasarımı örnek alınacak cinsten: her katman ayrı ayrı kapatılabiliyor
(`SECURITY_GUIDANCE_DISABLE=1` toptan, `ENABLE_PATTERN_RULES=0`, `ENABLE_STOP_REVIEW=0`,
`ENABLE_COMMIT_REVIEW=0`) ve maliyet artıran mod (`SG_DUAL_OR=on`, README'ye göre "kabaca
2× API maliyeti") varsayılan kapalı.

## 5. Alınmaya değer en fazla 3 fikir

**1. SKILL.md gövdesine 500 satır / ~2.000 kelime tavanı koy, fazlasını bir seviye
derinlikte referansa taşı.**
Neden değerli: `relay/SKILL.md` 53.147 B ≈ 13.000 token; resmi tavan ~2.000 kelime
≈ 2.700 token. relay zaten `references/protocol.md` (17.424 B), `multi-session.md`
(9.017 B), `standartlar.md` (5.751 B) ile bölünmüş — ama çekirdek hâlâ referansların
toplamından büyük. plugin-dev'de oran tersine: gövde 12–23 KB, referanslar ondan büyük.
Maliyet: relay SKILL.md'yi bölmek bir oturumluk yazım işi; risk, protokol adımlarının
ikinci dosyaya taşınınca okunmaması — resmi belge bunu "bir seviye derinlik" kuralıyla
sınırlıyor.

**2. Kuralı metinle değil, eşleşince ateşlenen deterministik hook'la uygula.**
Neden değerli: security-guidance ~25 deseni bağlama tek karakter yazmadan uyguluyor;
metin yalnız desen eşleşince çıkıyor. Bizim `dil.js` (37,1 KB) ve `contract-guard.js`
(13,9 KB) zaten bu modelde — ama `relay-watch.js` içinde 6 ayrı `additionalContext`
çağrısı var, yani hâlâ enjeksiyon yapıyoruz. Ölçülebilir hedef: her enjeksiyon noktasının
bayt sayısını sabitleyip toplamı bir tavana bağlamak.
Maliyet: mevcut hook'ları değiştirmek değil, enjeksiyonların uzunluğunu ölçüp raporlamak —
yarım günlük iş.

**3. Enjeksiyona hız sınırı ve kapatma düğmesi koy.**
Neden değerli: security-guidance'ta sayılar sabit ve okunabilir —
`MAX_COMMIT_REVIEWS_PER_HOUR=20`, `MAX_DIFF_FILES=30`, `MAX_STOP_HOOK_FIRINGS=3`, ayrıca
katman başına ortam değişkeniyle kapatma. Bizde bir hook'un aynı oturumda kaç kez metin
bastığına dair yazılı sınır yok; "base açık koşu daha çok token harcıyor" bulgusunun en
olası kaynağı bu.
Maliyet: hook başına sayaç + ortam değişkeni; küçük kod, ama `SETTINGS.md` (12.750 B)
zaten büyük — yeni düğmeleri oraya eklemek belgeyi daha da şişirir.

## 6. Şüpheli/riskli yanlar

- **Lisans OSI değil.** `LICENSE.md` 150 B: "© Anthropic PBC. All rights reserved.
  Use is subject to Anthropic's Commercial Terms of Service". `gh api repos/.../license`
  404 dönüyor. Eklenti kodunu kopyalamak serbest değil — desen alınır, satır alınmaz.
  Marka ayrı korunuyor: skill `name` alanında "anthropic" ve "claude" rezerve kelime.
- **15.048 açık issue.** Bu depo aynı zamanda CLI'ın issue kuyruğu; eklenti kalitesine
  dair sinyal değil, ama "bakımlı" diye de okunmamalı.
- **Rehber ile örnek çelişiyor.** Kendi belgesi ~2.000 kelime derken `skill-development`
  SKILL.md 22.827 B (~3.400 kelime). Sınır tavsiye, zorlayıcı değil.
- **Gizli maliyet:** security-guidance her turda ek bir model çağrısı yapıyor
  (varsayılan Opus). Token bütçesini bağlamdan çıkarıp faturaya taşıyor — sorun bağlam
  ise çözüm, para ise değil.
- Depoda 11 MB `demo.gif` ve 543 KB CHANGELOG var; klonlama maliyeti eklentinin çalışma
  maliyetiyle karıştırılmamalı.

## Kaynaklar

- `gh api repos/anthropics/claude-code` — push, yıldız, issue, fork (2026-08-22)
- `gh api repos/anthropics/claude-code/releases/latest` — v2.1.240, 2026-08-22
- `gh api repos/anthropics/claude-code/git/trees/HEAD?recursive=1` — tüm dosya boyutları
- `raw.githubusercontent.com/anthropics/claude-code/main/LICENSE.md`
- `.../plugins/plugin-dev/skills/skill-development/SKILL.md` — üç katman, kelime sınırları
- `.../plugins/security-guidance/README.md` — katmanlar, ortam değişkenleri, 2× maliyet notu
- `.../plugins/security-guidance/hooks/security_reminder_hook.py` — MAX_* sabitleri
- `.../plugins/hookify/README.md` — markdown kural dosyaları
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices —
  1.024 karakter, 64 karakter, 500 satır, bir seviye derinlik
