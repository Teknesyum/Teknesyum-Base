# Ölçüm: Base'in metin yükü

Ölçüm tarihi: 2026-08-22 · ölçen: teknesyum-builder · salt ölçüm, hiçbir dosya değiştirilmedi.

Bayt değerleri diskteki ham hâldir (CRLF dahil). Python ile okunan değerler CRLF'i LF'e
indirdiği için yer yer 1-2% düşük çıkar; ikisi ayrıldığında not düşülmüştür.

---

## 0. Baş bulgu

Base'in tanım metinlerinin toplamı **147.225 bayt**. Bunun her oturumda bağlama giren
kısmı **5.217 bayt (%3,5)** — yalnızca `description` alanları. Gövdeler çağrılana kadar
yüklenmiyor.

Yani "Base ağır" iddiası oturum açılışı için **ölçümle yanlış**. Ağırlık tek bir anda
toplanıyor: `relay` skill'i etkinleştiğinde **53.147 bayt** tek seferde bağlama giriyor.
Sorun toplam boyut değil, tek bir dosyanın tavanı aşması.

| Küme | Gövde toplam | Her oturumda yüklenen (`description`) | Oran |
|---|---|---|---|
| `agents/*.md` (7) | 23.270 | 2.058 | %8,8 |
| `commands/*.md` (16) | 43.078 | 2.338 | %5,4 |
| `skills/*/SKILL.md` (2) | 80.877 | 821 | %1,0 |
| **Toplam** | **147.225** | **5.217** | **%3,5** |

`references/*.md` (55.795 bayt) ve `SETTINGS.md` (12.750 bayt) bu tabloda yok: hiçbir
listede görünmüyorlar, yalnız `Read` ile okunduklarında maliyet oluyorlar.

`docs/` ve `README.md` (56.828 bayt) hiçbir zaman otomatik yüklenmiyor. Depoda
`CLAUDE.md` veya `AGENTS.md` **yok** — otomatik yüklenen proje talimatı sıfır bayt.

**İkinci baş bulgu:** o %3,5'lik dilimin kendisinin sert bir tavanı var. Harness
`description` listesine bağlam penceresinin **%1'ini** (varsayılan **8.000 karakter**)
ayırıyor; Base bunun **%65'ini** tek başına dolduruyor. Aşılırsa düşük öncelikli
girdiler `name-only`'a düşüyor ve model tarafından çağrılamaz hale geliyor. Token
maliyeti bir ekonomi sorunu; bu bir **işlev** sorunu. Ayrıntı §3.0.1.

---

## 1. Bölüm bölüm ağırlık

### 1.1 `skills/relay/SKILL.md` — 53.147 bayt

Kendi §6'sında yazdığı **~30 kB tavanını 22.427 bayt aşıyor (%73 aşım)**. Aşım
doğrulandı; bildirimi ölçüye çevirdim.

| Bayt | Bölüm |
|---|---|
| 4.868 | `## 1.5.1 İkinci görüş — tek soruluk konsey` |
| 4.040 | `## 2. Hazırlık — sormadan yap` |
| 4.036 | `## 4. Kim yapacak: rol → model` |
| 3.870 | `## 1.4 Ön araştırma — sıfırdan projede zorunlu` |
| 2.801 | `## 5. Delege etme eşiği` |
| 2.696 | `## 3.1 Görev paketi — işi oturum dışına çıkar` |
| 2.473 | `## 3. Tam röle` |
| 2.295 | `## 1. Sınıflandır — sessizce` |
| 2.290 | `## 1.5 Plan konseyi — planı iki model önerir` |
| 2.224 | `## 6. Token disiplini` |
| 2.159 | `## 1.7 Sertifika — proje profili karşılıyor mu` |
| 2.054 | `## 0.1 Üç profil — eco, normal, premium` |
| 1.998 | `## 1.2 Proje düzeni — kök sade kalır` |
| 1.946 | `## 7.2 Fark satırları — base'in dokunduğu yer` |
| 1.898 | `## 3.2 Rota — uzun iş kaldığı yerden devam eder` |
| 1.816 | `## 0. İlke sırası ve takas` |
| 1.598 | (frontmatter + giriş) |
| 1.514 | `## 1.6 Ürün standardı — üç platform ve kendini güncelleme` |
| 1.487 | `## 2.1 Hata ayıklama — belirtiyi değil nedeni düzelt` |
| 1.335 | `## 1.1 Oturum açılışı — sorma, sürdür` |
| 1.265 | `## 7. Kullanıcıya ne söylersin` |
| 1.237 | `## 7.1 Dönüş bloğu — işçi oturumun son sözü` |
| 883 | `## 1.3 Netleştirme — yalnızca sıfırdan projede` |
| 365 | `## 7.1 Dil` |

**Dosyanın yarısını yiyen beş bölüm:** 1.5.1 · 2 · 4 · 1.4 · 5 = **19.615 bayt (%36,9)**.
İlk yedi bölüm 24.784 bayt (%46,6); yarıya ulaşmak için sekizinci bölüme kadar inmek
gerekiyor: ilk sekiz = **27.079 bayt (%50,9)**.

İki numaralandırma hatası ölçümde çıktı, kapsam dışı olduğu için dokunulmadı:
`## 7.1` iki kez kullanılmış (`Dönüş bloğu` ve `Dil`).

Yapısal dağılım: kod blokları 14 adet / 2.844 bayt (%5), tablo satırları 49 / 3.025 bayt.
Metnin %89'u düzyazı.

### 1.2 `skills/teknesyum-ui/SKILL.md` — 27.730 bayt

Tavanın altında; aşım yok.

| Bayt | Bölüm |
|---|---|
| 4.410 | `## 5.4 Hareket — ölçülü, iptal edilebilir, kapatılabilir` |
| 2.979 | `## 2. Palet (varsayılan)` |
| 2.491 | `## 3. Tipografi (varsayılan)` |
| 2.150 | `## 6. Sık yapılan hatalar` |
| 2.100 | `## 5.3 Bileşen ölçüleri` |
| 1.674 | `## 3.1 Arayüz dili — Türkçe, ama koda gömülü değil` |
| 1.665 | `## 5.5 Tanıtım sayfası istisnası` |
| 1.522 | `## 1. Kurulum (yeni proje)` |
| 1.316 | `## 8.2 Doğrulama — çalışan uygulamaya bakmadan "tamam" yok` |
| 1.170 | `## 9. Etki raporu — arayüz işinin sonunda zorunlu` |
| 934 | `## 4. İmza bloğu` |
| 842 | `## 8.1 Uygulama yöntemi — önce token, sonra kontrol` |
| 840 | `## 3.2 Metin yazımı — duvar değil, blok` |
| 798 | `## 5.6 Dış kaynak kullanımı — önce lisans` |
| 796 | `## 8. Varsayılanlar — tartışılmadan uygulanır` |
| 715 | `## 5. Bileşen kalıpları` |
| 627 | `## 0. ÖNCE KULLANICI AYARINI OKU` |
| 485 | (frontmatter + giriş) |
| 217 | `## 7. Masaüstü ve dil yamaları` |

**En ağır beş bölüm:** 14.130 bayt (%51) — bu dosyada yarı gerçekten beş bölümde.

### 1.3 `skills/relay/SETTINGS.md` — 12.750 bayt

| Bayt | Bölüm |
|---|---|
| 7.632 | `## Anlamları` |
| 3.513 | `## Üç profil` |
| 1.410 | (frontmatter + giriş) |
| 196 | `## Kural` |

`## Anlamları` içinde `###` alt başlık **yok**; 14 ayarın düz tanım listesi
(`ask_threshold`, `approval_gate`, `audit`, `fix_ceiling`, `model_escalation`,
`parallel_width`, `worktree_isolation`, `report_length`, `briefing`, `plan_council`,
`second_opinion`, `research_repos`, `agent_stall`, `agent_loop`), ayar başına ortalama
**545 bayt**. Bölüm bir referans; her işte değil yalnız ayar değiştirilirken gerekiyor.

### 1.4 Referans dosyaları (ölçüldü, sorulmamıştı — tamlık için)

| Dosya | Bayt | En ağır bölümü |
|---|---|---|
| `relay/references/protocol.md` | 17.424 | `## 1. Dizin` — 4.778 |
| `ui/references/desktop.md` | 18.397 | `## 10. Masaüstü varsayılanları` — 8.961 |
| `relay/references/multi-session.md` | 9.017 | `## 4. Paket formatı` — 2.188 |
| `relay/references/standartlar.md` | 5.751 | `## 1. Üç platform` — 2.711 |
| `ui/references/layout.md` | 5.079 | `## 5.1 Piksel disiplini` — 2.257 |
| `ui/references/components.md` | 3.617 | `## Butonlar` — 946 |

---

## 2. Tekrar avı

### 2.1 Birebir tekrar — ölçüldü

Bütün `teknesyum/**/*.md` ve `README.md` üzerinde 80 baytı aşan paragraflar
normalize edilip karşılaştırıldı. **Birebir aynı 7 blok** bulundu:

| İsraf bayt | Blok | Kaç yer | Yerler |
|---|---|---|---|
| 1.640 | `**Beklemediğin durumu sessizce geçme.**` (410 bayt) | 5 | `auditor`, `builder`, `scout`, `scribe`, `ui-builder` |
| 1.168 | `**Yalın yaz.**` (292 bayt) | 5 | aynı beş ajan |
| 220 | Sponsor rozeti HTML'i (220 bayt) | 2 | `README.md` içinde iki kez |
| 218 | `kok <klasör> → --kok <klasör>` (218 bayt) | 2 | `loadall.md`, `saveall.md` |
| 146 | `T3 teslim edildi …` dönüş bloğu örneği (146 bayt) | 2 | `relay/SKILL.md`, `README.md` |
| 138 | `Harness sana yine de Write veya Edit vermiş olabilir` (138 bayt) | 2 | `advisor.md`, `planner.md` |
| 110 | `Bunlar her yeni arayüzde başlangıç hâlidir…` (110 bayt) | 2 | `ui/SKILL.md`, `ui/references/desktop.md` |
| **3.640** | | | **toplam birebir israf** |

**Birebir tekrar küçük.** Depo kopyala-yapıştır yapmıyor; tekrar anlamsal düzeyde.

### 2.2 "Yalın yaz" bloğu — soruya doğrudan cevap

Soru: yedi ajan dosyasının hepsinde aynı metin var mı? **Hayır — beşinde birebir aynı,
ikisinde farklı.**

`**Yalın yaz.**` ile `## Rapor` arasındaki blok, dosya başına:

| Dosya | Blok bayt | İçerik |
|---|---|---|
| `auditor.md` | 705 | A sürümü |
| `builder.md` | 705 | A sürümü |
| `scout.md` | 705 | A sürümü |
| `scribe.md` | 705 | A sürümü |
| `ui-builder.md` | 705 | A sürümü |
| `advisor.md` | 610 | B sürümü (`_sorun.log` satırı yok) |
| `planner.md` | 595 | C sürümü |
| **Toplam** | **4.730** | üç ayrı sürüm |

Sapma tesadüf değil: `advisor` ve `planner` dosya yazmayan ajanlar, `_sorun.log`
maddesi onlar için anlamsız. Yani **tek kaynağa indirmek metni bozar** — üç sürüm
kasıtlı görünüyor. Birebir aynı beş kopyanın israfı: **4 × 705 = 2.820 bayt**.

### 2.3 Anlamsal tekrar — kural bazında

| Kural | Kaç yerde | Yerler ve bayt |
|---|---|---|
| **"denetçi yazamaz"** | 6 | `auditor.md` frontmatter (283, her oturumda yüklü) · `commands/help.md` §2 satır (2 satır) · `protocol.md` §2 (`Ajan done yazamaz`) · `multi-session.md` ×2 satır · `relay/SKILL.md` "üç katlı güvence" paragrafı (~610) · `README.md` satır 28 + 229-230 |
| **Profil (eco/normal/premium)** | 5 dosya | `SETTINGS.md` `## Üç profil` 3.513 · `relay/SKILL.md` §0.1 2.054 · `commands/premium.md` 7.291 (dosyanın tamamı) · `commands/scan.md` 3.597 içinde · `README.md` 9 tablo satırı 696 |
| **Ajan rol listesi** | 11 dosya | `relay/SKILL.md` ×3, `README.md` ×4, `commands/report.md` ×3, `protocol.md` ×2, ayrıca `premium.md`, `uicheckup.md`, `contract.template.md`, `SETTINGS.md` birer kez |
| **Dönüş bloğu / ölçü satırı biçimi** | 4 | `relay/SKILL.md` §7.1 (1.237) + §7.2 (1.946) · `multi-session.md` §5.1 (1.668) · `hooks/dil.js` (kod, bağlama girmiyor) · `README.md` (146 birebir) |

**Profil tekrarı en pahalısı.** Aynı üç profil `SETTINGS.md`'de tam tabloyla,
`SKILL.md`'de özet olarak, `premium.md`'de üçüncü kez anlatılıyor. Kanonik kaynak
`SETTINGS.md`'nin `## Üç profil` tablosu; diğer ikisi ondan türetilebilir.
**Türetilebilir tekrar: 2.054 (SKILL §0.1) + ~2.100 (premium.md profil anlatımı) ≈ 4.150 bayt.**

### 2.4 Tek kaynağa indirilebilir mi — **ölçülen cevap: hayır**

Bu soruya tahmin değil ölçüm istendi. Ölçüm iki taraftan yapıldı:

**a) Kendi bağlamımdan doğrudan gözlem.** Bu ajan oturumunun sistem promptunda
`Available agent types` listesi var. `teknesyum:builder` girdisinde görünen metin,
`teknesyum/agents/builder.md` dosyasının `description:` alanının **birebir aynısı**
(301 bayt) artı `(Tools: All tools)`. Dosyanın kalan 3.142 baytı — `## Ajan hafızası`,
`## İletişim`, `**Yalın yaz.**` bloğu dahil — bağlamda **yok**.

Aynı şey skill listesinde: `teknesyum:relay` girdisi `SKILL.md`'nin `description:`
alanının birebir aynısı (407 bayt); 53.147 baytlık gövde bağlamda yok.

Komutlar da aynı listede `description` ile görünüyor: `teknesyum:report` girdisi
`commands/report.md` frontmatter'ındaki tek satırın aynısı (94 bayt).

**b) İkiliden doğrulama.** Ajan gövdesi `j=n.trim()` olarak saklanıp yalnız
`getSystemPrompt` ile, ajan başlatıldığında o ajanın **kendi** sistem promptuna
konuyor. Ana oturuma giden satır yalnız `- ${e.agentType}: ${whenToUse} (Tools: ...)`.

**c) Sonuç.** Harness her ajan tanımını bağımsız okuyor. Ajan tanım dosyaları için bir
dahil-etme (`@dosya`) mekanizması ikilide **bulunamadı** — ajan gövdesi kendi başına
yüklenen tek parça. Ortak blok bu yolla tek kaynağa indirilemez.

**Ama tekrarın maliyeti göründüğünden küçük.** 4.730 baytlık "yalın yaz" toplamı
**hiçbir zaman tek bir bağlamda birlikte bulunmuyor** — her ajan yalnız kendi 705
baytını taşır. Yedi ajan aynı anda açılsa bile bunlar yedi ayrı bağlamdır. Yani
**bu tekrarın per-oturum maliyeti 705 bayt, 4.730 değil.** Tek kaynağa indirmenin
token kazancı sıfıra yakın; kazanç yalnızca bakım tarafında (bir kuralı değiştirince
beş dosya düzenlemek).

---

## 3. Ne zaman yükleniyor

İki bağımsız yöntemle ölçüldü ve ikisi aynı sonucu verdi:

**A) Bu ajan oturumunun kendi sistem promptu** ile depo dosyalarının karşılaştırılması,
alıntı düzeyinde eşleşme aranarak.

**B) Claude Code ikilisinden dizgi çıkarma** — `~/.local/share/claude/versions/2.1.237`
(330.167.456 bayt, tek dosya, minify JS bundle; `grep -a` ile okundu).

| Metin | Ne zaman yükleniyor | Ölçülen kanıt |
|---|---|---|
| `SKILL.md` **frontmatter `description`** | **Her oturumda**, `available-skills` listesinde | Listedeki `teknesyum:relay` metni `SKILL.md` `description:` alanının birebir aynısı (407 bayt) |
| `SKILL.md` **gövde** | Yalnız skill çağrıldığında, **tamamı tek seferde** | Gövdenin hiçbir cümlesi bu oturumun bağlamında yok. `SKILL.md` §6 aynı davranışı yazıyor: "Bir `SKILL.md` her etkinleşmede tamamen bağlama girer" |
| `references/*.md` | **Otomatik yüklenmiyor.** Model `Read` ile açtığında girer | Hiçbir listede görünmüyorlar. `SKILL.md` içinde 3 yerde açık işaretçi var (satır 394, 540, 616): "Röle kuracaksan onu oku", "Bu yola gireceksen onu oku" — yani okuma modelin kararı |
| `SETTINGS.md` | **Otomatik yüklenmiyor.** `SKILL.md` içinden 6 yerde işaret ediliyor (satır 18, 64, 207, 268, 313, 558) | Aynı gerekçe: listede yok, yalnız `Read` ile |
| `commands/*.md` | **`description` her oturumda**, gövde yalnız komut çağrıldığında | Skill listesinde `teknesyum:report` = `report.md` `description` satırının aynısı (94 bayt). `report.md`'nin 3.475 baytlık gövdesi bağlamda yok |
| `agents/*.md` | **Yalnız `description`** ana oturumda; **tam gövde** yalnız o ajan açıldığında, ajanın kendi bağlamına | `Available agent types` listesindeki `teknesyum:builder` metni = `builder.md` `description` (301 bayt). Gövde yok |

**Sorunun asıl cevabı:** ajan listesi ana oturumda **tam gövde değil, yalnız
`description`** gösteriyor. Yedi ajanın 23.270 baytlık gövdesinden ana oturuma giren
**2.058 bayt**.

### 3.0 İkiliden çıkan mekanizma

Yukarıdaki tablonun her satırı ikilide de doğrulandı. Ölçülen kod:

**Skill ve komut listesi tek satır üretiyor.** Liste satırı `- <isim>: <description>`
kalıbında; `whenToUse` varsa ona ekleniyor:

```
function dmS(e){ ... return `- ${e.name}: ${umS(e)}` }
function Kcr(e){ return e.whenToUse ? `${e.description} - ${e.whenToUse}` : e.description }
```

Skill'ler ve slash komutları **aynı listeleme yolunu** (`skill_listing` eki) paylaşıyor.
Gövde yalnız `getPromptForCommand` çağrıldığında (kullanıcı `/x` yazdığında ya da model
`Skill` aracıyla çağırdığında) genişletiliyor ve konuşmaya mesaj olarak basılıyor.

**Ajan listesi de yalnız `description`.** Başlık `Available agent types for the Agent tool:`,
satır üreteci:

```
function BTf(e,t){ let r=yfS(e), n=t&&e.whenToUseLean||e.whenToUse;
                   return `- ${e.agentType}: ${n} (Tools: ${r})` }
```

Ajanın markdown gövdesi `j=n.trim()` olarak saklanıp yalnız tembel `getSystemPrompt` ile,
**ajan başlatıldığında** o ajanın kendi sistem promptu olarak kullanılıyor.

**`references/*.md` bağlama hiç girmiyor.** İkilide bunlar `SKILL_FILES` haritası olarak
**diske çıkarılıyor** (`mkdir` + dosya yazma), enjekte edilmiyor. Skill gövdesindeki
`${CLAUDE_SKILL_DIR}` yol değişkeni ikame ediliyor — yani dosyayı model `Read` ile
kendisi açıyor. Base'in `SKILL.md` içindeki "Röle kuracaksan onu oku" işaretçileri
tam da bu mekanizmayı kullanıyor; kurulum doğru.

### 3.0.1 Ölçülen tavan: liste bütçesi — **Base'in gerçek riski burada**

İkilide `description` listesi için sert bir bütçe var:

```
var imS=0.01, jkf=4, smS=200000, amS=1536;
```

- **`skillListingMaxDescChars` = 1.536 karakter** — skill başına `description` tavanı.
  Aşan kırpılıyor.
- **`skillListingBudgetFraction` = 0,01** — bağlam penceresinin **%1'i** listeye ayrılmış.
  Varsayılan hesap: `200.000 token × 4 char/token × 0,01 =` **8.000 karakter**.
- Bütçe aşılınca `budgetMode: "priority"` devreye giriyor ve düşük öncelikli skill'ler
  **yalnız isme** düşüyor: `if(fet(h)==="name-only"){ ... return {cmd:h, full:`- ${h.name}`} }`
- Override: `SLASH_COMMAND_TOOL_CHAR_BUDGET` ortam değişkeni.

Base'in bu bütçedeki payı ölçüldü:

| | Bayt |
|---|---|
| Bütçe (varsayılan, 200k pencere) | 8.000 |
| Base'in `description` toplamı | **5.217** |
| Base'in payı | **%65** |

Hiçbir Base `description`'ı 1.536 tavanını aşmıyor (en uzunu `ui/SKILL.md`, 414 bayt) —
**kırpma riski yok**. Ama Base tek başına bütçenin üçte ikisini alıyor. Bu makinede
listede Base dışı ~30 skill daha var (`anthropic-skills:*`, `design`, `dataviz`,
`code-review`, `claude-api` vb.) ve bunların bazılarının `description`'ı Base'in
tamamından uzun. **Bütçenin şu an aşılıp aşılmadığını ölçemedim** (bkz. §6), ama
aşılıyorsa `name-only`'a düşen ilk şeyler Base'in 16 komutu olabilir — ve isimden
ibaret bir komut, model tarafından çağrılamaz hale gelir.

Bu, raporun tek **eylem gerektiren** bulgusudur: `relay/SKILL.md`'nin 53 kB'si bir
token maliyetidir, `description` bütçesi ise bir **işlev kaybı** riskidir.

### 3.0.2 Ölçülen dosya boyutu sınırı

İkilide skill dosyası için üst sınır var: `var LZ=1e6` → **1.000.000 bayt**. Uyarı metni:

```
${y}: SKILL.md is ${A.size} bytes — Claude Code skips skills over ${LZ} bytes,
so the copy would never load
```

`relay/SKILL.md` 53.147 bayt — harness sınırının **%5,3'ü**. Yani 30 kB tavanı
harness'ın değil, **Base'in kendi koyduğu** tavandır ve sebebi teknik değil ekonomik.
Aşım işlevi bozmuyor, token yakıyor.

`agents/*.md` ve `commands/*.md` gövdesi için ikilide **hiçbir boyut sınırı veya kırpma
dizgisi bulunamadı**. Sınır yalnız skill listesi tarafında.

### 3.1 Bir işin gerçek metin maliyeti

| Senaryo | Yüklenen metin |
|---|---|
| Oturum açılışı, hiçbir şey çağrılmadı | **5.217 bayt** (54 `description`) |
| + `relay` skill'i etkinleşti | **58.364 bayt** |
| + `SETTINGS.md` okundu | **71.114 bayt** |
| + `protocol.md` okundu (röle kuruluyorsa) | **88.538 bayt** |
| Arayüz işi: `teknesyum-ui` etkin + `desktop.md` okundu | **51.344 bayt** |
| Açılan her `builder` ajanı (kendi bağlamında) | **3.443 bayt** |

Tam röle kurulan bir premium oturumda ana bağlama giren tanım metni **~88 kB (~22k token)**.
Bunun **%60'ı tek dosyadan**: `relay/SKILL.md`.

### 3.2 Ölçemediklerim bu başlıkta

- Tokenizer'ın bu Türkçe metin için bayt/token oranı ölçülmedi. Rapordaki token
  tahminleri 4 bayt/token kabulüyle yapılmıştır; Türkçe için bu oran **iyimser**
  olabilir (ekler ve `ğ ş ı ç ö ü` çok baytlı).
- Skill gövdesinin çağrıldıktan sonra bağlamda **kalıcı mı yoksa geçici mi** olduğu
  ölçülemedi. Kalıcıysa maliyet her istekte tekrar ediyor demektir; bu ayrımın
  optimizasyon planı için önemi büyük.
- `SETTINGS.md`'nin projede bir kopyası varsa (`.claude/relay/SETTINGS.md`) iki dosyanın
  birden mi yoksa yalnız birinin mi okunduğu ölçülmedi. Bu depoda proje kopyası **yok**.

---

## 4. Kelime yağı

### 4.1 `ÖLÇÜLDÜ:` kalıbı — beklenenden farklı çıktı

Görevde "gerekçenin skill dosyasında mı referansta mı durması gerektiği" soruldu.
Ölçüm başka bir cevap verdi: **`ÖLÇÜLDÜ:` kalıbı markdown'da neredeyse hiç yok.**

- `.js` dosyalarında (kod yorumu): **38 yer** — `hooks/`, `scripts/`
- `.md` dosyalarında: **2 yer**

Yani bu deponun gerekçe hafızası **koda gömülü** ve kod yorumları hiçbir zaman bağlama
girmiyor. Gerekçelerin token maliyeti **sıfır**. "Gerekçeyi referansa taşıyalım mı"
sorusunun konusu yok; taşınacak bir şey zaten skill dosyasında değil.

### 4.2 Ölçülebilir yağ

**a) CRLF.** `teknesyum/**/*.md` = 223.754 bayt ham, içinde **4.137 adet `\r`**
(%1,8). Tokenizer büyük ihtimalle `\r\n`'i tek token sayar, o yüzden bunu **kazanç
saymıyorum** — ama ham bayt raporlarında %1,8'lik sistematik şişkinlik olarak vardır.

**b) Örnek fazlalığı.** Ölçüldü, **anlamlı fazlalık yok**:

| Dosya | Kod bloğu | Bayt | Oran |
|---|---|---|---|
| `relay/SKILL.md` | 14 | 2.844 | %5 |
| `ui/SKILL.md` | 5 | 1.940 | %7 |
| `SETTINGS.md` | 1 | 1.156 | %9 |

14 kod bloğu 24 bölüme dağılmış — bölüm başına 1'den az. "Üç örnek yerine bir örnek"
diyecek bir yer bulunamadı.

**c) Tablo + düzyazı tekrarı.** `SETTINGS.md` `## Üç profil` bölümünde 12 satırlık
profil tablosu (932 bayt) var, ardından `normal` / `premium` / `eco` düzyazı
açıklamaları geliyor (satır 163-199, ~1.900 bayt). Düzyazı tabloyu **tekrarlamıyor**,
felsefeyi anlatıyor — birinden diğeri türetilemez. **Yağ değil.**

**d) İki kez anlatılan tek yer.** `relay/SKILL.md` §1.5.1 içinde plan konseyi ile plan
teyidinin farkı **önce 6 satırlık tabloda**, sonra tablonun altında **iki paragraf
düzyazıyla** anlatılıyor (~430 bayt). Tablo tek başına yeter; düzyazı yalnız
"konsey çalıştıysa teyit ayrıca alınmaz" kuralını ekliyor — o bir cümle tabloya
satır olarak girebilir. **Kesilebilir: ~330 bayt.** Kaybedilen: hiçbir şey; kural korunur.

### 4.3 Yağ olmayan ama pahalı olan — asıl bulgu

Ölçümün gösterdiği şey şu: `relay/SKILL.md`'de **işini yapmayan cümle bulunamadı.**
Aşımın sebebi gevşek yazı değil, **her işte gerekmeyen kuralların her işte yüklenmesi.**

`SKILL.md` §6 bunun ölçütünü kendisi koymuş: taşınacak olan seçilirken ölçüt
"önemli mi" değil **"her işte gerekli mi"**. Bu ölçüt aşan bölümlere uygulandığında:

| Bölüm | Bayt | Ne zaman gerçekten gerekli | Kaç işte gerekli |
|---|---|---|---|
| §1.5.1 İkinci görüş | 4.868 | `second_opinion: on` — **yalnız premium** | 3 profilden 1 |
| §1.4 Ön araştırma | 3.870 | **yalnız sıfırdan proje** | işlerin azınlığı |
| §3.1 Görev paketi | 2.696 | **yalnız oturum dışına iş çıkarılırken** | nadiren |
| §1.7 Sertifika | 2.159 | **yalnız `/scan` çağrıldığında** | nadiren |
| §1.5 Plan konseyi | 2.290 | `plan_council: on` — **yalnız premium** | 3 profilden 1 |
| §3.2 Rota | 1.898 | **yalnız uzun, kesilen iş** | nadiren |
| §1.6 Ürün standardı | 1.514 | **yalnız ürün yayınlanırken** | nadiren |
| §1.3 Netleştirme | 883 | **yalnız sıfırdan proje** | işlerin azınlığı |
| **Toplam** | **20.178** | | |

Bu sekiz bölüm **20.178 bayt** ve hepsi koşullu. Tamamı `references/` altına
taşınsa `SKILL.md` **32.969 bayta** iner — tavana bir adım kalır.

---

## 5. En pahalı on bölüm

Sıralama tüm dosyaları kapsar. "Ne zaman" sütunu §3'te ölçülen davranıştır.

| # | Bölüm | Bayt | Ne zaman yükleniyor | Kesilirse ne kaybedilir | Sınıf |
|---|---|---|---|---|---|
| 1 | `ui/references/desktop.md` §10 Masaüstü varsayılanları | 8.961 | Yalnız `Read` ile, masaüstü işinde | — zaten referansta, doğru yerde | **zorunlu** |
| 2 | `SETTINGS.md` `## Anlamları` | 7.632 | Yalnız `Read` ile | 14 ayarın ne yaptığı. Ayar değiştirilmeden gerekmiyor — zaten `SKILL.md` dışında | **zorunlu** (yeri doğru) |
| 3 | `relay/SKILL.md` §1.5.1 İkinci görüş | 4.868 | **Skill her etkinleştiğinde** | Dokuz tetikleyici, konsey/teyit ayrımı, `advisor` efor gerekçesi. eco ve normal profilde bu bölüm hiç iş yapmıyor | **referansa taşınabilir** |
| 4 | `protocol.md` §1 Dizin | 4.778 | Yalnız `Read` ile, röle kurulurken | Dizin yapısı, debug modu, mekanik ağ | **zorunlu** (yeri doğru) |
| 5 | `ui/SKILL.md` §5.4 Hareket | 4.410 | **ui skill her etkinleştiğinde** | Süre/yumuşatma tokenları, `prefers-reduced-motion`, mikro etkileşim tavanları, WPF `Storyboard` kuralı. Animasyon yazılmayan arayüz işinde (tablo, form, rapor) hiç iş yapmıyor. `references/layout.md` yalnız 5.079 bayt — yer var | **referansa taşınabilir** |
| 6 | `relay/SKILL.md` §2 Hazırlık | 4.040 | **Skill her etkinleştiğinde** | Sormadan yapılacak hazırlık adımları — her işte gerekli | **zorunlu** |
| 7 | `relay/SKILL.md` §4 Rol → model | 4.036 | **Skill her etkinleştiğinde** | Hangi iş hangi ajana, hangi model. Her delege kararında gerekli | **zorunlu** |
| 8 | `relay/SKILL.md` §1.4 Ön araştırma | 3.870 | **Skill her etkinleştiğinde** | `scout` kullanımı, kaç depo, ne aranır. Yalnız sıfırdan projede iş yapıyor; hata düzeltmede ölü ağırlık | **referansa taşınabilir** |
| 9 | `SETTINGS.md` `## Üç profil` | 3.513 | Yalnız `Read` ile | Profil tablosu — **kanonik kaynak.** `SKILL.md` §0.1 ve `premium.md` bunun türevi | **zorunlu** (kaynak) |
| 10 | `ui/SKILL.md` §2 Palet | 2.979 | **ui skill her etkinleştiğinde** | Renk tokenları. Her arayüz işinde gerekli, uydurma yasağının dayanağı | **zorunlu** |

### 5.1 Sınıf toplamları

| Sınıf | Bayt | Not |
|---|---|---|
| **zorunlu** | — | Ölçümde `relay/SKILL.md`'nin çekirdeği (§0, §1, §1.1, §1.2, §2, §2.1, §3, §4, §5, §6, §7) = **32.969 bayt** |
| **referansa taşınabilir** | **20.178** (relay) + **4.410** (ui §5.4) = **24.588** | Koşullu bölümler; §4.3 tablosu |
| **kısaltılabilir** | **~330** | §1.5.1 tablo-sonrası düzyazı |
| **silinebilir** | **0** | İş yapmayan bölüm bulunamadı |
| Bakım tekrarı (token kazancı ~0) | 2.820 | Beş ajan dosyasındaki birebir "yalın yaz" kopyaları |

**Ölçümün özeti:** silinecek metin yok. Taşınacak metin **24.588 bayt** var ve taşıma,
`relay/SKILL.md`'yi 53.147'den **32.969'a** indirerek kendi tavanına yaklaştırır.

---

## 6. Ölçemediklerim

1. **Bayt/token oranı.** Türkçe metin için gerçek tokenizer ölçümü yapılmadı; rapordaki
   token sayıları 4 bayt/token kabulüdür.
2. **Skill gövdesinin bağlamda kalıcılığı.** Etkinleşmeden sonra her istekte tekrar
   gönderiliyor mu, yoksa bir kez mi — ölçülemedi. Optimizasyonun değeri bu cevaba bağlı.
3. **Prompt cache etkisi.** Aynı skill gövdesi önbelleğe alınıyorsa ikinci ve sonraki
   isteklerin maliyeti farklıdır; ölçülemedi.
4. **`references/` dosyalarının gerçek okunma sıklığı.** İşaretçi var ama modelin
   bunları kaç işte açtığı ölçülemedi — bu ancak transkript taramasıyla ölçülür.
5. **Liste bütçesinin şu an aşılıp aşılmadığı.** §3.0.1'deki 8.000 karakterlik bütçe
   ölçüldü ve Base'in payı (5.217) ölçüldü, ama listedeki **Base dışı ~30 skill'in
   `description` toplamı** ölçülemedi — dosyaları bu depoda değil. Bütçe aşılıyorsa
   Base'in komutları `name-only`'a düşebilir. **Bu, ölçülmesi gereken bir sonraki şeydir**
   ve tek satırlık bir ölçümle kapanır: `~/.claude/plugins` altındaki tüm frontmatter
   `description` alanlarının bayt toplamı.
6. **`LZ=1e6` sabitinin kesinliği.** Skill boyut sınırı olduğu bağlamsal çıkarım;
   bundle'da `LZ` adı birden çok modülde yeniden kullanılıyor, birebir
   `SKILL_MAX_BYTES` gibi bir isimlendirme bulunamadı.
7. **Sistem promptunun Base dışı kısmı.** Harness'ın kendi talimatları (araç şemaları,
   güvenlik kuralları) ölçülmedi — Base'in payını oransal olarak vermek için o taban
   gerekli, elde yok.

---

## 7. Kapsam dışı notlar

- Depoda `CLAUDE.md` veya `AGENTS.md` **yok**. Kullanıcının global kuralı her önemli
  klasörde ≤20 satırlık `AGENTS.md` istiyor; bu depo kendi kuralını uygulamıyor.
  Ölçüm görevi olduğu için dokunulmadı.
- `relay/SKILL.md` içinde `## 7.1` numarası iki kez kullanılmış (`Dönüş bloğu` ve `Dil`).
- Sözleşme dosyası bulunamadı: `.claude/relay/contracts/` boş ve prompt'ta kanonik yol
  verilmemişti. Sözleşme gövdesi prompt içinde tam olduğu için iş yapıldı; durum alanı
  bir dosyaya yazılamadı. Aynı satır `.claude/relay/live/_sorun.log` dosyasına eklendi.
