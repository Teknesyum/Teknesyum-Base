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
