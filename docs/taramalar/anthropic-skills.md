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
