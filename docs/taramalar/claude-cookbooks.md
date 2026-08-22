# anthropics/claude-cookbooks — örnek koleksiyonu ve maliyet defteri

## 1. Ne yapıyor, hangi problemi çözüyor

Claude API'siyle çalışan uçtan uca örnek defterleri: ajan desenleri, değerlendirme
(eval), gözlemlenebilirlik, uzun düşünme, çoklu ortam, araç kullanımı, skill'ler ve
**maliyet optimizasyonu**. Eklenti değil; ölçüm ve deney kültürünün kaynağı olarak
tarandı — sorumuz "kim token maliyetini ölçmüş" idi.

API verileri (2026-08-22): son push `2026-08-19T20:42:54Z`, 51.970 yıldız,
**313 açık issue**, **MIT**, 2023-08-15'ten beri açık.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök klasörler konuya göre: `capabilities/`, `coding/`, `cost_optimization/`, `evals/`,
`extended_thinking/`, `managed_agents/`, `multimodal/`, `observability/`, `patterns/`,
`skills/`, `tool_use/`, `tool_evaluation/`, `third_party/`, `misc/`,
`claude_agent_sdk/`, `finetuning/`.

İndeks tek dosyada: `registry.yaml` **32.142 B** — her defter için başlık, açıklama,
yol, yazar, tarih, kategori. Yani içerik gezinmesi klasör taramasıyla değil, tek bir
manifest üzerinden yapılıyor.

Ölçek: **670 dosya, toplam 218.039.379 B** (en büyük tek dosya 12.877.873 B).
`cost_optimization/cost_optimization.ipynb` tek başına **1.286.487 B**.
`CLAUDE.md` 3.520 B, `README.md` 6.083 B, `uv.lock` 408.644 B.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Eval'e bağlı maliyet çalışması.** `registry.yaml` içindeki tanım aynen şunu diyor:
"Cost Optimization on the Claude API — An eval-driven guide to running agents on
frontier models at production cost, applying the Claude API's cost levers **one at a
time**" (tarih: 2026-08-09).

Buradaki yöntem bizim sorunumuzun tam karşılığı: maliyet kollarını **teker teker**
uygulamak ve her adımda eval ile ölçmek. "Base açıkken neden daha pahalı" sorusu ancak
böyle cevaplanır — bir seferde bir değişken.

İkinci kaynak `skills/` defteri: README'sinde "Progressive Disclosure Architecture —
Skills load only when needed, optimizing token usage" yazıyor ve üçüncü defterde "Token
optimization strategies" başlığı var. **Rakam verilmiyor** — kazanç oranı belirtilmemiş
(`doğrulanamadı`). Yardımcı kod: `skill_utils.py` 12.406 B, `file_utils.py` 9.767 B,
`CLAUDE.md` 8.202 B, `README.md` 11.698 B.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Jupyter defteri: klonla, `requirements.txt` (1.260 B) kur, API anahtarını `.env`'e
(`.env.example` 554 B) yaz, çalıştır. `Makefile` (4.384 B), `tox.ini` (3.459 B),
`.pre-commit-config.yaml` ve `lychee.toml` (bağlantı denetimi) var — yani defterler CI
ile doğrulanıyor.

Hata hâli defter içinde; koleksiyon düzeyinde bir hata yolu yok.

## 5. Alınmaya değer en fazla 3 fikir

**1. Maliyet kollarını teker teker uygula ve her adımı ölç.**
Ne: `cost_optimization.ipynb`'nin yöntemi — eval sabit, kol tek tek açılıyor.
Neden değerli: bizde `docs/BENCH-SONUC.md` (9,3 KB) ve `BENCH-PROMPT.md` (7,7 KB) zaten
var, yani ölçüm altyapısı kurulmuş. Eksik olan, **tek değişken** disiplini: tasarruf
profilinin tasarrufsuz koşunun üstünde çıkması, birden fazla kolun aynı anda değişmiş
olabileceğini gösteriyor.
Maliyet: yeni araç değil, koşu planı — her koşuda tek değişiklik, bench'i tekrar çalıştır.
Ölçülebilir hedef: her kol için "kaç token eksildi" satırı.

**2. İçerik indeksini tek manifest dosyasında tut.**
Ne: `registry.yaml` 32.142 B, 670 dosyanın tamamını başlık+açıklama+yol olarak
listeliyor; hiçbiri okunmadan ne olduğu görülüyor.
Neden değerli: bizde skill ve komut keşfi frontmatter taramasıyla oluyor; bu doğru, ama
`docs/` altındaki 6 belge ve `docs/taramalar/` altındaki 13+ dosya için indeks yok.
Ajan doğru dosyayı bulmak için birkaçını açıyor.
Maliyet: küçük bir manifest + güncel tutma disiplini; otomatik üretilirse bakım sıfır.

**3. Skill'i "en az ekleme" ilkesiyle yaz.**
Ne: resmi belge (aynı ekipten) "Claude zaten çok akıllı — her parçayı sorgula: bunu
gerçekten bilmiyor mu?" diyor ve iki örnek veriyor: iyi sürüm ~50 token, kötü sürüm
~150 token; aynı bilgi, **3× fark**.
Neden değerli: bizim 53 KB'lık relay gövdesinin ne kadarı modelin zaten bildiği şey?
Bu soru tek başına en büyük kısaltma kaynağı olabilir.
Maliyet: metin gözden geçirme; ölçülebilir hedef, her bölümde "bu paragraf token
maliyetini hak ediyor mu" kontrolü.

## 6. Şüpheli/riskli yanlar

- **Lisans MIT** (`LICENSE` 1.065 B), temiz. Marka koruması ayrıca belirtilmemiş.
- **313 açık issue**, son push 2026-08-19 — canlı ama kuyruklu.
- **Etiketli sürüm yok** — koleksiyon sürümlenmemiş (`releases` sorgulanmadı,
  `doğrulanamadı`).
- **"Progressive disclosure token kazandırır" iddiası rakamsız.** `skills/README.md`
  bunu özellik listesinde iddia ediyor ama ölçüm vermiyor (`doğrulanamadı`).
- **Depo 218 MB / 670 dosya.** Tek dosya 12,8 MB'ye kadar çıkıyor; klonlamak pahalı,
  ilgili defteri tek tek çekmek daha ucuz.
- **Gizli maliyet:** defterler gerçek API çağrısı yapıyor. `cost_optimization` defterini
  çalıştırmak para harcar; okumak ise 1,28 MB'lık bir ipynb'yi açmak demek — özet için
  `registry.yaml` satırı yeterli.

## Kaynaklar

- `gh api repos/anthropics/claude-cookbooks` — push, yıldız, issue, lisans (2026-08-22)
- `gh api repos/anthropics/claude-cookbooks/git/trees/HEAD?recursive=1` — 670 dosya, 218 MB
- `gh api repos/anthropics/claude-cookbooks/contents/cost_optimization` — ipynb 1.286.487 B
- `raw.githubusercontent.com/anthropics/claude-cookbooks/main/registry.yaml` — defter tanımı
- `raw.githubusercontent.com/anthropics/claude-cookbooks/main/skills/README.md` — progressive
  disclosure iddiası (rakamsız)
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices —
  50'ye karşı 150 token örneği

---

# Ikinci tarama — baglam ve prompt verimliligi acisindan

# anthropics/claude-cookbooks

## 1. Ne yapıyor, hangi problemi çözüyor

Anthropic'in resmî örnek defteri: çalışan Jupyter notebook'larla API özelliklerini
gösteriyor. Bizim için ilgili olan üç dosya:

- `misc/prompt_caching.ipynb` — sabit prefix'i önbelleğe alma.
- `misc/speculative_prompt_caching.ipynb` — kullanıcı yazarken önbelleği önden ısıtma.
- `misc/session_memory_compaction.ipynb` — konuşma geçmişini özetleyip küçültme.
- `cost_optimization/cost_optimization.ipynb` — maliyet düşürme derlemesi.

Çözdüğü problem: "API'nin bu özelliği var" ile "bu özellik benim işimde ne kazandırıyor"
arasındaki boşluk. Notebook çıktıları gerçek sayı içeriyor.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Konu klasörleri: `capabilities`, `coding`, `cost_optimization`, `evals`,
`extended_thinking`, `managed_agents`, `misc`, `multimodal`, `observability`, `patterns`,
`skills`, `tool_use`, `tool_evaluation`, `third_party`.

Sınırlar:

- **`registry.yaml` + `authors.yaml`** — her notebook kayıtlı ve sahibi belli. Örnek
  deposunun çürümesini engellemek için konmuş bir sınır.
- **`tests/` + `tox.ini` + `lychee.toml`** — notebook'lar test ediliyor, bağlantılar
  ölü link taramasından geçiyor. Bir cookbook için sıra dışı disiplin.
- **`third_party/`** — dış entegrasyonlar ayrı tutulmuş, çekirdek örneklerle karışmıyor.

Depoda kendi `CLAUDE.md`'si ve `.claude/` klasörü var — kendi kendine ajanla bakım
yapılan bir depo.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Prompt caching'in hiyerarşi kuralı.** Cookbook'un gösterdiği ve API belgelerinin
tanımladığı davranış:

> "Cache prefixes are created in the following order: `tools`, `system`, then `messages`.
> This order forms a hierarchy where each level builds upon the previous ones."

> "Changes at each level invalidate that level and all subsequent levels."

Bu tek cümle bütün deseni belirliyor: **değişmeyen her şey öne, değişen her şey sona.**
Sistem promptunun sonuna konan bir `cache_control` işaretçisi, ondan önceki her şeyi
önbelleğe alıyor; sonraki mesajlar önbelleği bozmuyor.

Sayısal çerçeve (API belgeleri, 2026-08-22):

| Şey | Değer |
|---|---|
| 5 dakikalık cache yazma | temel input fiyatının **1,25 katı** |
| 1 saatlik cache yazma | temel input fiyatının **2 katı** |
| Cache okuma | temel input fiyatının **0,1 katı** |
| Asgari önbelleklenebilir uzunluk (Opus 5) | **512 token** |
| Asgari uzunluk (Sonnet 5, Opus 4.x çoğu) | **1.024 token** |
| Asgari uzunluk (Opus 4.5 / 4.6, Haiku 4.5) | **4.096 token** |
| En fazla `cache_control` işaretçisi | **4** |

Önbelleği bozan şeyler listesi de belgelenmiş: araç tanımları, web arama anahtarı,
alıntı anahtarı, hız ayarı, `tool_choice`, prompt'un herhangi bir yerine görsel
eklemek/çıkarmak, thinking parametreleri, `output_config.effort`.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`git clone`, `.env.example`'ı kopyala, `uv` ile bağımlılıkları kur, notebook'u aç.
`Makefile` ve `pyproject.toml` var; `uv.lock` sabitlenmiş.

`session_memory_compaction.ipynb` çalıştırıldığında ekrana çıkan gerçek örnek çıktı:

- oturum 12.847 token'a ulaşınca sıkıştırma tetikleniyor,
- sıkıştırma sonrası **11.321 token tasarruf, %88 azalma**,
- **sıkıştırma süresi 41,42 saniye — kullanıcı bekliyor.**

Notebook bu bekleme süresini problem olarak sunuyor ve arka planda iş parçacığıyla
"anlık sıkıştırma" alternatifini gösteriyor.

## 5. Alınmaya değer en fazla 3 fikir

**1 — Sabit prefix / değişken kuyruk ayrımı ve cache işaretçisi.**
Ne: skill gövdesi, ayarlar ve ajan tanımları prompt'un başında sabit blok olarak dursun;
her istekte enjekte edilen 800-2500 karakterlik yönerge **sona** gitsin.
Neden değerli — artık ölçülmüş zeminle: relay/SKILL.md etkinleştiğinde **10.112 token**
tek seferde giriyor ve **80 çağrı ölçüldü**. Bu içerik çağrıdan çağrıya **değişmiyor**;
tanım gereği önbelleklenebilir. Asgari eşiğin (Opus 5 için **512 token**) yirmi katı
büyüklükte, yani eşik sorun değil.
Kaba hesap: 80 çağrının ilkinde 1,25x yazma, kalan 79'unda 0,1x okuma. Tam fiyattan
80 çağrı ≈ 809.000 token karşılığı; cache'li senaryoda ≈ 12.600 + 79×1.011 ≈ **92.500
token karşılığı** — yaklaşık **%89 indirim**. Bu, taramada bulunan en yüksek ve tek
belgelenmiş kazanç.
Maliyet: **kod değişikliği değil, önce bir doğrulama.** `cache_control` işaretçisini
Claude Code koyuyor; bizde konup konmadığı **doğrulanmadı**. Konmuyorsa yukarıdaki hesap
sıfır. Konuyorsa ve profil değişimi cache'i bozuyorsa yine sıfır (bkz. 2. fikir).

**2 — Önbelleği bozan şeylerin listesini bir kontrol listesine çevirmek.**
Ne: araç tanımı değişikliği, görsel ekleme, effort değişikliği, tool_choice — hepsi
`tools` ya da `system` katmanını bozup **altındaki her şeyi** iptal ediyor.
Neden değerli: bizim base'imiz oturum içinde ajan açıyor, profil değiştiriyor. Profil
değişikliği efor ayarını değiştiriyorsa önbellek her seferinde baştan yazılıyor — yani
1,25x ödenip 0,1x hiç alınmıyor, **sabit yük pahalılaşıyor**. Bench'in 44.000 token farkı
bu senaryoyla tutarlı; ölçülmesi gerek.
Maliyet: bir denetim turu. Kod değişikliği gerekmeyebilir.

**3 — En fazla 4 işaretçi kısıtına göre katman planı.**
Ne: 4 `cache_control` işaretçisi var. Doğal bölünme: (1) araç tanımları, (2) skill gövdesi
+ ayarlar, (3) ajan tanımları, (4) sözleşme/durum. Beşinci bir sabit katman eklenirse
API 400 dönüyor.
Neden değerli: bizim dört ayrı sabit yükümüz var (53+12+32+23 KB) — tam dört işaretçi.
Beşinciyi eklemek için birleştirme gerekir; bunu şimdi bilmek sonra çarpmaktan iyi.
Maliyet: planlama. Sıfır kod.

## 6. Şüpheli/riskli yanlar

**Lisans.** MIT. Marka ayrıca korunmuyor, standart MIT metni; depo adı Anthropic'in ama
kod kullanımı serbest.

**Bakım.** Son push 2026-08-19 — canlı. 51.970 yıldız. **313 açık issue.** **Etiketli
sürüm yok** (`releases/latest` → 404); notebook deposu olduğu için beklenen ama
sabitlenecek bir sürüm numarası yok, `uv.lock` dışında referans noktası yok.

**Doğrulanamayan iddialar.**
- Notebook metni: *"latency by >2x and costs by up to 90% for repetitive tasks"* —
  Anthropic'in kendi ifadesi, "up to" nitelemesiyle. Bağımsız doğrulama yok.
  `doğrulanamadı` — ama %90 rakamı cache okuma fiyat çarpanıyla (0,1x) matematiksel
  olarak tutarlı, yani üst sınır olarak savunulabilir.
- `session_memory_compaction.ipynb` çıktısındaki **%88 azalma** ve **41,42 saniye** —
  tek bir demo koşusunun çıktısı, benchmark değil. Kendi verimizde tekrarlanmadı.
  `tek örnek, genellenemez`
- İlgili Anthropic blog yazısı (claude.com/blog/context-management) context editing için
  **%29 iyileşme**, memory tool ile birlikte **%39 iyileşme**, 100 turluk web arama
  değerlendirmesinde **%84 token azalması** bildiriyor. Üçü de "internal evaluation set
  for agentic search" üzerinde; **koşu sayısı, istatistiksel anlamlılık ve benchmark adı
  verilmemiş**. `doğrulanamadı`

**Bize uymayan kısım.** Cookbook'ların çoğu Python SDK'sı üzerinden ham API çağrısı
yapıyor. Bizim yükümüz Claude Code'un skill yükleyicisinden geçiyor; `cache_control`
işaretçisini biz koymuyoruz. **Prompt caching'i doğrudan kontrol edip edemediğimiz
doğrulanmadı** — bu, listedeki 1. ve 3. fikrin ön koşulu.

**Gizli maliyet.** `session_memory_compaction`'ın gösterdiği gibi, sıkıştırma bedava
değil: 41 saniyelik bir özetleme çağrısı hem zaman hem token harcıyor. Kazanç ancak
oturum yeterince uzarsa amorti oluyor.

## Kaynaklar

- `gh api repos/anthropics/claude-cookbooks` — 2026-08-22: pushed_at 2026-08-19,
  51.970 yıldız, 313 açık issue, MIT, arşivlenmemiş, oluşturma 2023-08-15.
- `gh api repos/anthropics/claude-cookbooks/releases/latest` — 404.
- `gh api .../contents` ve `.../contents/misc` — klasör ve notebook listesi.
- `misc/prompt_caching.ipynb` ve `misc/session_memory_compaction.ipynb` metin içeriği
  (Contents API + grep ile okundu, kod kopyalanmadı).
- Prompt caching belgeleri: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
  (2026-08-22) — fiyat çarpanları, asgari uzunluklar, 4 işaretçi, hiyerarşi kuralı.
- Context editing belgeleri:
  https://platform.claude.com/docs/en/docs/build-with-claude/context-editing (2026-08-22).
- https://claude.com/blog/context-management — %29 / %39 / %84 iddiaları.
