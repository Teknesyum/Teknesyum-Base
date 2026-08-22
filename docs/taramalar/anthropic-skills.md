# anthropics/skills — Anthropic'in kendi skill koleksiyonu

Karşılaştırma tabanı: bizde iki skill var, `relay/SKILL.md` 53.147 B ve
`teknesyum-ui/SKILL.md` 27.730 B; frontmatter'ları 433 B ve 447 B (yerel ölçüm).

## 1. Ne yapıyor, hangi problemi çözüyor

Skill formatının referans koleksiyonu: 19 skill + 1 şablon. İçinde Claude.ai'nin belge
üretme yeteneğini çalıştıran gerçek üretim skill'leri (docx, pdf, pptx, xlsx) da var,
yani "örnek için yazılmış" değil, kullanımda olan kod. Depo aynı zamanda Claude Code
marketplace'i olarak eklenebiliyor (`/plugin marketplace add anthropics/skills`).

API verileri (2026-08-22): son push `2026-08-21T17:10:55Z`, 170.962 yıldız,
**1.140 açık issue**, depo düzeyinde lisans alanı boş, **etiketli sürüm yok**
(`releases/latest` 404).

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök: `skills/`, `spec/`, `template/`, `README.md` (5.552 B),
`THIRD_PARTY_NOTICES.md` (46.162 B). `spec/agent-skills-spec.md` yalnızca 87 B — spec
depodan çıkarılıp agentskills.io/specification adresine taşınmış.

19 SKILL.md, bayt (gh api git/trees):

| Skill | SKILL.md | Skill | SKILL.md |
|---|---|---|---|
| claude-api | 75.707 | pdf | 8.072 |
| skill-creator | 33.168 | slack-gif-creator | 7.841 |
| pptx | 20.796 | academy-guide | 7.755 |
| algorithmic-art | 19.769 | docx | 6.911 |
| doc-coauthoring | 15.815 | webapp-testing | 3.913 |
| canvas-design | 11.939 | theme-factory | 3.124 |
| discernment-nudge | 10.592 | web-artifacts-builder | 3.087 |
| mcp-builder | 9.092 | brand-guidelines | 2.235 |
| xlsx | 8.598 | internal-comms | 1.511 |
| frontend-design | 8.260 | template | 140 |

Medyan ~8 KB, en küçük 1.511 B. Şablon 140 B — yeni skill bu boyuttan başlıyor.

Bölünme deseni klasör adıyla değil **alan adıyla** yapılmış: `references/` altında
tüm depoda yalnızca **1 dosya** var. Bunun yerine `claude-api/shared/`,
`claude-api/python/`, `/typescript/`, `/go/` gibi konu ve dil klasörleri kullanılmış —
resmi belgedeki "domain-specific organization" deseni. `claude-api` altında
`shared/model-migration.md` 175.868 B, `shared/tool-use-concepts.md` 33.807 B,
`shared/managed-agents-api-reference.md` 33.634 B; bunlar SKILL.md tetiklense bile
okunmadıkça bağlama girmiyor.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Her zaman yüklenen tek şey frontmatter; onun bütçesi ölçülebilir.** Ölçtüm
(raw içerik, frontmatter blokları):

- 19 skill'in frontmatter toplamı **10.826 B**, ortalama **570 B**
- En büyük: claude-api **1.156 B** (description bloğu 1.140 B — 1.024 karakter tavanına
  dayanmış), academy-guide 1.100 B, discernment-nudge 1.097 B, xlsx 1.033 B
- En küçük: webapp-testing 277 B, frontend-design 278 B

Yani 19 skill kurulu olsa oturum başına sabit maliyet ~10,8 KB ≈ 2.700 token; gövdeler
(toplam ~257 KB) yalnız tetiklenince geliyor. Uzun description bilinçli bir takas:
tetikleme isabetini artırıp yanlış skill yüklenmesini önlüyor.

İkinci mekanizma **skill-creator** (33.168 B): skill yazmayı skill'e bağlamış, yani
format disiplinini insana değil ajana yaptırıyor.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Üç yol: Claude Code'da marketplace olarak eklemek ve `document-skills` /
`example-skills` paketlerinden birini kurmak; Claude.ai'de hazır kullanmak; API'ye
yüklemek. Kurulumdan sonra çağırma serbest metinle: "PDF skill'ini kullan…".

Hata hâli belgelenmemiş; README'de bunun yerine sorumluluk reddi var: "bu skill'ler
gösterim ve eğitim amaçlıdır, Claude'un davranışı farklı olabilir".

## 5. Alınmaya değer en fazla 3 fikir

**1. Frontmatter bütçesini skill sayısıyla çarpıp yaz.**
Ne: her skill'in description'ı için üst sınır belirle (Anthropic'te fiilen 277–1.156 B,
ortalama 570 B) ve toplamı belgelendir. Bizim iki skill'in frontmatter'ı 433 + 447 = 880 B —
bu taraf zaten iyi, ama yazılı bir tavan yok, skill sayısı artınca sessizce büyür.
Neden değerli: oturum başına sabit maliyetin tek kalemi bu; ölçülmediği sürece kontrol
edilemez.
Maliyet: neredeyse sıfır — bir kural satırı ve bir ölçüm script'i.

**2. Ağır içeriği `references/` yerine alan klasörüne böl.**
Ne: claude-api SKILL.md'si 75.707 B ile devasa ama yanındaki `shared/` klasöründe
175.868 B'lık tek dosya duruyor ve sorulmadıkça okunmuyor. Bizde `teknesyum-ui` altında
`desktop.md` 18.397 B, `layout.md` 5.079 B, `components.md` 3.617 B zaten böyle —
`relay` tarafında ise SKILL.md referansların iki katından büyük (53.147 B'ye karşı
17.424 + 9.017 + 5.751 = 32.192 B).
Neden değerli: relay'de oran tersine dönerse tetiklenme başına ~20 KB tasarruf edilir.
Maliyet: relay içeriğinin konu başlıklarına ayrılması; içerik taşınırken kaybolan
çapraz gönderme riski var.

**3. Yeni skill'i 140 B'lık şablondan başlat.**
Ne: `template/SKILL.md` 140 B — sadece frontmatter ve iki başlık. Boyut disiplini
"kısalt" diyerek değil, boş sayfayı küçük tutarak sağlanıyor.
Neden değerli: bizde yeni skill kopyalanarak açılırsa 27–53 KB'lık bir dosyadan başlar;
şablon 140 B ise ilk hâli 200× küçük olur.
Maliyet: bir dosya; `/uisetup` ve `/setup` akışlarına bağlanması gerekir.

## 6. Şüpheli/riskli yanlar

- **Lisans karışık.** Depo düzeyinde lisans yok (`gh api ... --jq .license` boş). Skill
  başına `LICENSE.txt` var: çoğu 11.345 B (Apache 2.0 metni boyutunda), `docx` için
  1.467 B farklı bir metin. README açıkça yazıyor: docx/pdf/pptx/xlsx **kaynağı açık ama
  açık kaynak değil**. Kopyalamadan önce skill başına lisansa bakmak zorunlu.
- **Etiketli sürüm yok.** Sürümleme yok, breaking change bildirimi yok; bağımlılık
  kurulacaksa commit sabitlemek gerekir.
- **1.140 açık issue.** Bakım yükü görünür durumda.
- **Kendi kuralını çiğniyor.** Resmi tavan 500 satır / ~2.000 kelime iken claude-api
  SKILL.md 75.707 B (~11.000 kelime), skill-creator 33.168 B. Tavan zorlayıcı değil.
- **Gizli kurulum maliyeti:** koleksiyon ikili varlık taşıyor —
  `canvas-design/canvas-fonts/` altında 40'a yakın TTF (tek dosya 191.304 B'ye kadar),
  `docx/pptx/xlsx` altında aynı XSD şemaları üç kez tekrarlanmış (242.277 B × 3).
  Depoyu klonlamak bağlam maliyeti değil ama disk ve kurulum süresi maliyeti.

## Kaynaklar

- `gh api repos/anthropics/skills` — push, yıldız, issue, lisans (2026-08-22)
- `gh api repos/anthropics/skills/releases/latest` — 404, etiketli sürüm yok
- `gh api repos/anthropics/skills/git/trees/HEAD?recursive=1` — SKILL.md ve varlık boyutları
- `raw.githubusercontent.com/anthropics/skills/main/README.md` — lisans ve kurulum
- `raw.githubusercontent.com/anthropics/skills/main/spec/agent-skills-spec.md` — 87 B, yönlendirme
- Frontmatter ölçümü: her SKILL.md'nin `---` blokları raw içerikten sayıldı (2026-08-22)
