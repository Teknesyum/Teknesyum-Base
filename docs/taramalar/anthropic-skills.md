<<<<<<< HEAD
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
=======
# anthropics/skills

**Bu tarama içindeki en doğrudan eşleşme.** Bizim skill dosyalarımızı yükleyen mekanizmanın
kendi şartnamesi ve referans uygulaması burada.

## 1. Ne yapıyor, hangi problemi çözüyor

Skill = bir klasör, içinde `SKILL.md` ve isteğe bağlı `scripts/`, `references/`, `assets/`.
Çözdüğü problem tam bizimki: **modelin bilmesi gereken çok fazla şey var, hepsi bağlama
sığmıyor ve sığsa bile her istekte ödemek pahalı.**

Depo iki şeyi taşıyor: (a) `spec/` altında Agent Skills şartnamesi — artık
agentskills.io/specification'a taşınmış, (b) `skills/` altında 19 örnek skill; bunların
dördü (docx, pdf, pptx, xlsx) Claude'un üretimdeki belge yeteneklerini çalıştıran gerçek
kod.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Şartnamenin koyduğu sınırlar sayı olarak net:

| Alan | Sınır |
|---|---|
| `name` | en fazla 64 karakter, küçük harf/rakam/tire, klasör adıyla aynı olmalı |
| `description` | en fazla 1024 karakter, boş olamaz |
| `compatibility` | en fazla 500 karakter, isteğe bağlı |
| `allowed-tools` | boşlukla ayrılmış araç listesi, **deneysel** |

Klasör sözleşmesi: `scripts/` çalıştırılabilir kod, `references/` gerektiğinde okunan
belge, `assets/` şablon ve statik dosya. Bunlar zorunlu değil, öneri.

Şartnamenin doğrudan uyarısı: *"Keep file references one level deep from SKILL.md. Avoid
deeply nested reference chains."* — referans zinciri derinleşmesin.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Progressive disclosure, üç kademe ve her kademenin sayısal bütçesi var.** Şartnameden
birebir:

1. **Metadata (~100 token)** — `name` ve `description`, **bütün skill'ler için açılışta
   yükleniyor**.
2. **Instructions (< 5000 token önerilir)** — `SKILL.md` gövdesi, **yalnızca skill
   etkinleştiğinde**.
3. **Resources (gerektiğinde)** — `scripts/`, `references/`, `assets/` içindeki dosyalar
   yalnızca gerekince.

Ek kural: *"Keep your main SKILL.md under 500 lines. Move detailed reference material to
separate files."*

Ve gövde bölümünde açık uyarı: *"the agent will load this entire file once it's decided to
activate a skill. Consider splitting longer SKILL.md content into referenced files."*
Yani **SKILL.md kısmi yüklenmiyor — ya hep ya hiç.**

Bu bizim ölçümümüzle doğrudan çarpışıyor:

| Dosya | Bayt | Satır | Token | Şartname sınırı |
|---|---:|---:|---:|---|
| `relay/SKILL.md` | 53.147 | 881 | **10.112 (ölçüldü)** | <5.000 token, <500 satır |
| `teknesyum-ui/SKILL.md` | 27.730 | 485 | ölçülmedi | <5.000 token, <500 satır |

relay/SKILL.md önerilen gövde bütçesinin **2,02 katı**, satır tavanının **1,76 katı**.

**Ölçüm düzeltmesi.** Bu raporun ilk hâlinde 4 bayt/token kabülüyle ~13.300 token tahmin
edilmişti. Base ekibinin ölçümü **10.112 token** verdi — gerçek oran 5,26 bayt/token, yani
tahmin **%31 yüksekti**. Türkçe metnin token oranını kötüleştireceği varsayımı da yanlış
çıktı. Ders: bu alanda tahmin yürütmemek gerekiyor, ölçüm ucuz.

**Asıl bulgu — şartnamenin üç kademesi bizde nasıl işliyor.** Base ölçümüne göre:

| Kademe | Şartname | Base'de gerçekleşen |
|---|---|---|
| 1. Metadata | ~100 token/skill, hep yüklü | **5.217 bayt** (description satırları), her oturum |
| 2. Instructions | <5.000 token, etkinleşince | **10.112 token**, tek seferde, **80 çağrı ölçüldü** |
| 3. Resources | gerektiğinde | `references/` — koşullu |

Yani **birinci kademe zaten küçük**; oturum açılışındaki yük 5.217 bayt. Şişkinlik
ikinci kademede ve **çağrı başına** ödeniyor.

**Şartnamenin söylemediği bir sınır var.** Harness'ın description listesi bütçesi
**8.000 karakter** ve Base bunun **%65'ini** kullanıyor. Şartname `description` için
skill başına 1024 karakter tavanı koyuyor ama **toplam liste bütçesinden hiç söz
etmiyor**. Bu sınır aşılırsa girdiler çağrılamaz hâle geliyor — token maliyeti değil,
**işlev kaybı**. Şartnameyi okuyup bu tuzağı öngörmek mümkün değil.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Claude Code'da eklenti pazarı olarak kayıt: `/plugin marketplace add anthropics/skills`,
sonra `/plugin install document-skills@anthropic-agent-skills`. Kurulduktan sonra skill'i
adıyla anmak yeterli.

Claude.ai'de ücretli planlarda hazır; API'de Skills API üzerinden yükleniyor.

Doğrulama için ayrı bir referans kütüphanesi var: `skills-ref validate ./my-skill` —
frontmatter'ı ve adlandırma kurallarını denetliyor. Depo ayrı: agentskills/agentskills.

Hata hâli belgelenmemiş; şartname doğrulama aracını gösteriyor ama geçersiz bir skill'in
çalışma zamanında ne olacağını söylemiyor.

## 5. Alınmaya değer en fazla 3 fikir

Üçü de Base'in ölçtüğü üç kaldıraçtan birine dokunuyor: **çağrı başına yük**,
**description bütçesi**, **tekrar eden bağlamın cache'lenmesi**.

**1 — relay/SKILL.md'yi bölmek — ama gerekçe oturum açılışı değil, çağrı başına yük.**
Ne: 881 satırlık gövdeden akış sırasında her zaman gerekmeyen bölümleri (protokol
ayrıntısı, çok oturumlu senaryolar, örnekler) `references/`'a almak. Klasör zaten var ve
kullanılıyor — protocol.md 17.424 bayt, multi-session.md 9.017 bayt.
Neden değerli: **oturum açılışında kazanç yok** — açılışta yalnızca 5.217 baytlık
description listesi yükleniyor, gövdeler çağrılana kadar girmiyor. Kazanç çağrı anında:
relay etkinleştiğinde **10.112 token tek seferde** giriyor ve **80 çağrı ölçüldü**.
Gövdeyi 10.112'den ~5.000'e indirmek, ölçülen 80 çağrı üzerinden yaklaşık **400.000
token** demek. Şartnamenin tavanı (<5.000 token) tam da bu yükü hedefliyor.
Maliyet: bir kerelik yeniden düzenleme. Risk: ajanın referans dosyasını okumayı atlaması —
bu yüzden SKILL.md'de "şu durumda şu dosyayı oku" satırları kalmalı.
**Uyarı:** kazanç ancak çağrıların çoğu taşınan bölümlere ihtiyaç duymuyorsa gerçekleşir.
80 çağrının kaçında protokol ayrıntısının gerçekten okunduğu **ölçülmedi** — bölmeden
önce bakılmalı, yoksa tek çağrı iki okumaya dönüşür ve yük artar.

**2 — `description`'ı token için değil, işlev için kısaltmak.**
Ne: şartname skill başına 1024 karakter tavanı koyuyor. Harness'ın **toplam liste
bütçesi 8.000 karakter** ve Base **%65'ini** alıyor.
Neden değerli: bu bir maliyet sorunu değil. 5.217 bayt zaten küçük bir token yükü.
Sorun şu: kalan %35, yeni skill ve komut için tek yer. Bütçe aşılırsa **girdiler
çağrılamaz hâle geliyor** — Base büyüdükçe önce yavaşlamaz, **çalışmaz**. Şartname bu
toplam sınırdan hiç söz etmiyor, yani belgeyi okuyarak öngörülemez.
Maliyet: frontmatter düzenlemesi. Neredeyse sıfır. **Getiri token değil, hareket alanı.**

**3 — Anthropic'in kendi `pdf` skill'indeki oranı ölçüt almak.**
Ne: `skills/pdf`'te SKILL.md 8.072 bayt (~2.000 token), yanında forms.md 11.854 +
reference.md 16.692 bayt. **Gövdenin 3,5 katı içerik referansa itilmiş.**
Neden değerli: 1. fikre somut hedef veriyor. Bizde oran ters: relay'de gövde 53 KB
(10.112 token), referanslar ~32 KB. Aynı orana gelmek gövdeyi ~12 KB'a indirmek demek —
şartnamenin 5.000 token tavanının altı.
Maliyet: yeniden düzenleme emeği. Ölçüt hazır olduğu için karar tartışması bitiyor.

## 6. Şüpheli/riskli yanlar

**Lisans — dikkat.** `gh api repos/anthropics/skills` **`license: null`** döndürüyor; depo
kökünde tek bir LICENSE dosyası yok. README diyor ki skill'lerin çoğu Apache 2.0, ama
`docx`, `pdf`, `pptx`, `xlsx` **"source-available, not open source"**. Her skill klasörü
kendi `LICENSE.txt`'siyle geliyor (skill-creator'ınki 11.345 bayt, pdf'inki 1.467 bayt).
Yani **depo düzeyinde OSI onaylı lisans yok, klasör klasör bakmak zorunlu.** Marka ayrıca
korunuyor: `THIRD_PARTY_NOTICES.md` var, README'de "Anthropic's implementation" ayrımı
yapılmış.

**Şartname depo dışına taşınmış.** `spec/agent-skills-spec.md` artık tek satır:
"The spec is now located at agentskills.io/specification". Yani depo şartnamenin
sürümlenmiş kopyasını tutmuyor; şartname değişirse eski hâlini git'ten alamıyorsun.
Bize bağlayan sayılar (5.000 token, 500 satır) **depoda değil, bir web sayfasında** ve
sayfanın değişmeyeceğinin garantisi yok.

**Bakım ve issue.** Son push 2026-08-21, oldukça canlı. 170.962 yıldız. Ama **1.140 açık
issue** ve **hiç etiketli sürüm yok** (`releases/latest` → 404). Örnek deposu olduğu için
sürümsüzlük anlaşılır; issue sayısı yıldız sayısıyla orantılı gürültü olabilir, ama
sürüm etiketi olmaması "hangi hâline sabitleneyim" sorusunu cevapsız bırakıyor.

**Şartname kendi örneklerinde tutulmuyor.** `skills/skill-creator/SKILL.md` **33.168
bayt** — kabaca 8.300 token, kendi önerdikleri 5.000 token tavanının üstünde. Yani
"<5000 token" bir öneri, zorlayıcı bir kural değil ve Anthropic kendi deposunda ihlal
ediyor. Bu, sınırın kırmızı çizgi değil hedef olduğunu gösteriyor — ama bizim 13.300
token'ımız hem hedefin hem Anthropic'in kendi ihlalinin üstünde.

**Kendi sorumluluk reddi.** README: *"These skills are provided for demonstration and
educational purposes only... the implementations and behaviors you receive from Claude may
differ."* Yani örnekler üretim garantisi vermiyor.

## Kaynaklar

- `gh api repos/anthropics/skills` — 2026-08-22: pushed_at 2026-08-21, 170.962 yıldız,
  1.140 açık issue, **license null**, arşivlenmemiş, oluşturma 2025-09-22.
- `gh api repos/anthropics/skills/releases/latest` — 404, etiketli sürüm yok.
- `gh api repos/anthropics/skills/contents/skills` — 19 skill listelendi.
- `gh api repos/anthropics/skills/contents/skills/pdf` — SKILL.md 8.072, forms.md 11.854,
  reference.md 16.692 bayt.
- `gh api repos/anthropics/skills/contents/skills/skill-creator` — SKILL.md 33.168 bayt.
- Şartname: https://agentskills.io/specification (2026-08-22 okundu) — 100 token metadata,
  <5000 token instructions, <500 satır, 1024 karakter description.
- Depo README (Contents API ile okundu).
- Yerel ölçüm: `wc -c` / `wc -l` — relay/SKILL.md 53.147 bayt 881 satır,
  teknesyum-ui/SKILL.md 27.730 bayt 485 satır.
>>>>>>> worktree-agent-a4d03523eefcf7d71
