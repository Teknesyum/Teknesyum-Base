# Ölçüm: description bütçesi

Ölçüm tarihi: 2026-08-22 · ölçen: teknesyum-builder · salt ölçüm, hiçbir kaynak dosya
değiştirilmedi. Ölçüm betiği: `scripts/olcum/butce.js` (`node scripts/olcum/butce.js`).

İkili: `~/.local/share/claude/versions/2.1.237` (PE32+, 314,9 MB, `grep -a` ile okundu).

---

## 0. Baş bulgu

Bütçe **karakter** cinsindendir, bayt değil, ve sabit 8.000 değildir. Formül ikilide:

```
qcr(e,t=jkf){ ... let n=lmS(),o=(e??smS)*t*n; return Math.max(1,Math.floor(o)) }
var imS=0.01, jkf=4, smS=200000, amS=1536;
```

`bütçe = bağlam penceresi × 4 × 0,01`. 200k pencerede **8.000**, 1M pencerede **40.000**.

Bu makinede ölçülen liste toplamı **13.938 karakter**.

| Pencere | Bütçe | Uzaklık | Kip |
|---|---|---|---|
| 200.000 token | 8.000 | **−5.938 (aşılıyor, %74)** | `priority` |
| 1.000.000 token | 40.000 | +26.062 (yer var) | `fits` |

**Şu an aşılmıyor.** Doğrudan gözlem: bu oturumun skill listesinde Base'in 18 girdisinin
tamamı tam `description`'ıyla görünüyor, hiçbiri `- ad` biçiminde değil. Aşım olsaydı
(aşağıda §4) Base'in tamamı isme düşerdi. Yani yürürlükteki pencere 1M, bütçe 40.000.
`settings.json`'da `skillListingBudgetFraction` yok, `SLASH_COMMAND_TOOL_CHAR_BUDGET`
ortam değişkeni tanımlı değil — bütçe varsayılan formülden geliyor.

**Asıl risk pencerede.** Bağlam penceresi 200k'ya düştüğü anda (200k'lık bir model,
`CLAUDE_CODE_MAX_CONTEXT_TOKENS`, ya da ikilideki `oXs()` kısıtlaması devreye girerse)
Base'in **18 girdisinin tamamı** aynı anda `name-only`'a düşer. Ara durum yok.

**İkinci bulgu: kısaltma bu sorunu çözmüyor.** 200k senaryosunda açık **3.635 karakter**;
Base'in bütün `description`'ları toplamı **1.842 karakter**. Base'i sıfıra indirsen bile
liste bütçeyi aşmaya devam eder. Base kısaltmak burada kaldıraç değil.

---

## 1. Base'in payı

`teknesyum/skills/*/SKILL.md` (2) + `teknesyum/commands/*.md` (16) = **18 girdi**.

| | Karakter | Bayt |
|---|---|---|
| `description` toplamı | **1.842** | **2.005** |
| Liste satır maliyeti (`ad + 4 + desc`) | **2.202** | — |

Base payı: 200k bütçenin **%27,5**'i, 1M bütçenin **%5,5**'i.

`agents/*.md` (7 girdi, 1.849 karakter / 2.058 bayt) bu bütçenin **dışında** — §5.

### 1.1 `OLCUM-METIN.md`'nin 5.217 baytı tutmuyor

Önceki ölçüm Base payını 5.217 bayt vermişti. Ayrıştırması:

| Küme | `OLCUM-METIN.md` | Bu ölçüm | Fark |
|---|---|---|---|
| `skills` | 821 | 821 | 0 |
| `commands` | 2.338 | **1.184** | −1.154 |
| `agents` | 2.058 | 2.058 (bütçe dışı) | 0 |
| Toplam | 5.217 | 2.005 | −3.212 |

İki hata var:

**Komut satırında fazladan alan sayılmış.** 16 komut dosyasının `description` alanı
1.184 bayt. Aynı dosyaların `argument-hint` + `allowed-tools` satırları 1.126 bayt;
`description + argument-hint + allowed-tools = 2.310` — bildirilen 2.338'e 28 bayt uzak.
Bu iki alan listede görünmüyor, `Kcr(e)` yalnız `description` ve `whenToUse` okuyor:

```
function Kcr(e){ return e.whenToUse ? `${e.description} - ${e.whenToUse}` : e.description }
```

Base'in hiçbir komut ya da skill dosyasında `whenToUse` yok, yani listeye giren metin
`description` alanının birebir kendisi. Bu oturumun listesindeki `teknesyum:scan`
satırı `scan.md`'nin `description` satırıyla harfi harfine aynı — doğrulandı.

**Ajanlar bütçeye katılmış.** Ajan listesi ayrı bir üreteçten geçiyor ve hiçbir bütçe
ya da kırpma uygulanmıyor (§5).

Düzeltilmiş sayı: Base'in bütçedeki payı **2.005 bayt / 1.842 karakter**, bildirilen
rakamın **%38'i**.

### 1.2 Bayt mı karakter mi

Fark Base için önemli: 1.842 karakter, 2.005 bayt — Türkçe harfler yüzünden %8,9 sapma.
Harness `v.length` ile ölçüyor, yani **karakter**. Base bütçede bildiğinden daha az yer
kaplıyor. Base dışı girdilerde sapma %0,8 (neredeyse tümü ASCII).

---

## 2. Base dışı pay

**26 girdi, 11.190 karakter / 11.276 bayt**, liste satır maliyeti 11.693.

| Kaynak | Girdi | Karakter |
|---|---|---|
| İkiliye gömülü (`bundled`) | 24 | 10.769 |
| Kişisel skill (`~/.claude/skills/`) | 1 (`graphify`) | 351 |
| Kişisel komut (`~/.claude/commands/`) | 1 (`tani`) | 70 |
| Kurulu eklenti (`~/.claude/plugins/`) | **0** | 0 |

Kurulu eklentiler `installed_plugins.json`'a göre üç tane: `typescript-lsp`,
`csharp-lsp`, `teknesyum`. İlk ikisinde `skills/` ya da `commands/` klasörü **yok** —
yalnız LSP tanımı taşıyorlar, listeye hiç girmiyorlar. `plugins/cache/teknesyum/`
altındaki eski sürümler (1.0.0 … 2.41.x) kurulu değil, sayılmadı.

Yani Base dışı yükün **%96'sı ikiliye gömülü** girdilerden geliyor. Bunlar kullanıcının
kurduğu bir şey değil, harness'ın kendisiyle geliyor ve kaldırılamıyor.

Bunları diskte bulamadım: `anthropic-skills:*`, `artifact-*`, `code-review`, `dataviz`
vb. dosya olarak çıkarılmıyor, ikilinin içinde duruyor. Ölçüm için bu oturumun
sistem mesajında **görünen** liste metnini kaynak aldım ve betiğe birebir gömdüm
(`GOZLENEN_HARICI`). Bu, çalışma anındaki gerçek çıktının kendisi.

### 2.1 En ağır on Base dışı girdi

| Karakter | Girdi |
|---|---|
| 1.135 | `dataviz` |
| 1.068 | `claude-api` |
| 1.019 | `design` |
| 948 | `anthropic-skills:xlsx` |
| 835 | `anthropic-skills:docx` |
| 791 | `code-review` |
| 732 | `anthropic-skills:pptx` |
| 690 | `update-config` |
| 437 | `anthropic-skills:pdf` |
| 425 | `artifact-capabilities` |

İlk üçü (3.222 karakter) tek başına Base'in tamamının **1,75 katı**.

---

## 3. Toplam ve uzaklık

Harness'ın topladığı büyüklük `description` baytı değil, **satır** uzunluğu:

```
entryLen = ad.uzunluğu + 4 + min(desc.uzunluğu, 1536)
toplam   = Σ entryLen + (girdi sayısı − 1)
```

| | Değer |
|---|---|
| Girdi sayısı | 44 |
| Liste toplamı | **13.938 karakter** |
| 200k bütçe (8.000) | **5.938 aşım** |
| 1M bütçe (40.000) | 26.062 pay kaldı |

Hiçbir girdi 1.536 karakterlik skill-başı tavanını aşmıyor — en uzunu `dataviz` 1.135.
**Kırpma riski yok**, ne Base'te ne dışında.

---

## 4. Sınırın doğrulanması

`OLCUM-METIN.md`'nin 8.000 rakamı **kısmen doğru**: formül doğru, sabitler doğru, ama
"8.000" pencereye bağlı bir türev, sabit değil.

### 4.1 Ölçülen sabitler

```
var imS=0.01, jkf=4, smS=200000, amS=1536;
function Vcr(){ return zo().skillListingMaxDescChars ?? amS }
function lmS(){ return zo().skillListingBudgetFraction ?? imS }
function qcr(e,t=jkf){
  let r=wee(process.env.SLASH_COMMAND_TOOL_CHAR_BUDGET); if(r) return r;
  let n=lmS(), o=(e??smS)*t*n; return Math.max(1,Math.floor(o))
}
```

- `skillListingBudgetFraction` = 0,01 — şema açıklaması: *"Fraction of the context
  window (in characters) res…"* — birim açıkça **karakter**.
- `jkf` = 4 — token başına karakter kabulü.
- `smS` = 200.000 — pencere bilinmezse varsayılan.
- `skillListingMaxDescChars` = 1.536 — skill başına tavan, aşan `…` ile kesiliyor
  (`umS`: `t.slice(0,r-1)+"…"`).

Ölçüm karakter üzerinden: `zkf` içinde `v.length`, `_.cmd.name.length` — hepsi
JS string uzunluğu. Bayt değil.

### 4.2 Pencere nereden geliyor

`zkf` çağrısı `XFi` içinden `Vx(r,FC())` ile besleniyor:

```
function Chd(e,t){ if(jE(e)) return 1e6; if(t?.includes(fK.header)&&gK(e)) return 1e6;
                   if(SU(e)) return 1e6; ... return XDr }
XDr=200000; i_e=200000;
```

Yani pencere modele göre 200.000 ya da 1.000.000. Bütçe sırasıyla **8.000** ya da
**40.000**. `oXs()` doğru dönerse 1M model bile 200.000'e (`i_e`) kısılıyor.

Hangi dalın bu oturumda seçildiğini ikiliden statik olarak **çıkaramadım**; çalışma
anındaki değeri okuyan bir kullanıcı arayüzü de yok (`budgetMode` yalnız telemetri
alanı olarak geçiyor). Onun yerine sonucu ölçtüm: liste `fits` kipinde basılmış,
13.938 > 8.000 olduğuna göre bütçe 8.000 değil. Bu, 40.000'i dolaylı ama kesin
gösteriyor.

### 4.3 Aşımda tam olarak ne oluyor

`zkf` iki kip veriyor. Kritik olan ikincisi:

```
let f=(_)=>cmS(_.cmd)||n?.has(_.cmd.name),
    m=u.filter((_)=>!f(_)),
    h=u.reduce((_,v)=>_+(f(v)?v.entryLen:v.cmd.name.length+2),0)+Math.max(0,u.length-1),
    g=i-h;
m.sort((_,v)=>t(v.cmd)-t(_.cmd));
for(let _ of m){ let v=_.entryLen-(_.cmd.name.length+2); if(v<=g) g-=v; else y.push(_) }
```

`cmS(e)` = `e.type==="prompt" && e.source==="bundled"`. Yani:

- **İkiliye gömülü girdiler dokunulmaz.** Tam `description`'larıyla `h` tabanına
  yazılıyorlar, hiç aday olmuyorlar.
- **Eklenti ve kişisel girdiler önce isme indiriliyor**, sonra artan yerden geri
  satın alınıyor. Base bu ikinci kümede.

Ölçülen taban: `h` = **11.635 karakter**. 200k bütçede kalan `g` = **−3.635**, yani
negatif. Negatif `g` ile hiçbir aday geri alınamıyor:

> 200k pencerede `name-only`'a düşenler: `teknesyum:relay`, `teknesyum:teknesyum-ui`,
> `teknesyum:help`, `load`, `loadall`, `premium`, `rc`, `rcadvanced`, `rcall`,
> `report`, `rule`, `save`, `saveall`, `scan`, `setup`, `uicheckup`, `uisetup`,
> `update` — **18'inin tamamı** — artı `graphify` ve `tani`.

`Wkf` bunları `- ${h.name}` olarak basıyor; model açıklamayı görmediği için komutu
kendiliğinden **çağıramaz** hale geliyor.

Öncelik sıralaması `kcr(u.name)` ile yapılıyor ama burada önemsiz: `g` negatif olduğu
için sıra hiçbir şeyi kurtarmıyor.

### 4.4 Kaçış kapıları

| Yol | Etki |
|---|---|
| `SLASH_COMMAND_TOOL_CHAR_BUDGET` ortam değişkeni | Bütçeyi doğrudan ezer, formülü atlar |
| `settings.json` → `skillListingBudgetFraction` | 0–1 arası, pencerenin yüzdesi |
| `settings.json` → `skillListingMaxDescChars` | Skill başına tavan |

Üçü de bu makinede tanımsız.

---

## 5. Ajanlar bütçenin dışında

Ajan listesi ayrı bir üreteçten geçiyor:

```
function BTf(e,t){ let r=yfS(e), n=t&&e.whenToUseLean||e.whenToUse;
                   return `- ${e.agentType}: ${n} (Tools: ${r})` }
```

`zkf` bu yolda hiç çağrılmıyor; ne bütçe kontrolü ne `name-only` düşürme var. Base'in
7 ajanının 1.849 karakteri liste bütçesini **hiç tüketmiyor**.

| Karakter | Ajan |
|---|---|
| 312 | `teknesyum:advisor` |
| 283 | `teknesyum:planner` |
| 269 | `teknesyum:builder` |
| 265 | `teknesyum:scout` |
| 258 | `teknesyum:auditor` |
| 233 | `teknesyum:ui-builder` |
| 229 | `teknesyum:scribe` |

Ajan `description`'larını kısaltmak bütçeye **hiçbir şey** kazandırmaz. Token
kazandırır, işlev riskini azaltmaz.

---

## 6. Base girdileri, ağırdan hafife

| Karakter | Bayt | Satır | Girdi | Payın kümülatifi |
|---|---|---|---|---|
| 387 | 414 | 413 | `teknesyum:teknesyum-ui` | %21,0 |
| 367 | 407 | 386 | `teknesyum:relay` | %40,9 |
| 91 | 96 | 109 | `teknesyum:scan` | %45,9 |
| 87 | 96 | 110 | `teknesyum:uicheckup` | %50,7 |
| 84 | 93 | 105 | `teknesyum:premium` | %55,2 |
| 78 | 86 | 97 | `teknesyum:rcall` | |
| 76 | 82 | 94 | `teknesyum:save` | |
| 74 | 84 | 98 | `teknesyum:rcadvanced` | |
| 74 | 79 | 90 | `teknesyum:rc` | |
| 72 | 75 | 91 | `teknesyum:setup` | |
| 66 | 72 | 87 | `teknesyum:uisetup` | |
| 64 | 73 | 85 | `teknesyum:loadall` | |
| 59 | 66 | 77 | `teknesyum:load` | |
| 59 | 62 | 79 | `teknesyum:report` | |
| 58 | 61 | 79 | `teknesyum:saveall` | |
| 55 | 63 | 75 | `teknesyum:update` | |
| 46 | 48 | 64 | `teknesyum:help` | |
| 45 | 48 | 63 | `teknesyum:rule` | |

**Payın yarısını yiyen girdiler:** `teknesyum-ui` + `relay` ikisi başına **%40,9**;
yarıya ulaşmak için dördüncüye (`uicheckup`) kadar inmek gerekiyor — ilk dört %50,7.
İstenen "beş girdi" ölçütüyle: ilk beş = 1.016 karakter, **%55,2**.

### 6.1 Kısaltılabilir mi, tetiklenme isabeti düşer mi

| Girdi | Kısaltılabilir mi | İsabet riski |
|---|---|---|
| `teknesyum:teknesyum-ui` | Evet — 387 karakterin ~140'ı platform sayımı (`Web, React, Electron ve WPF/WinForms`) ve içerik dökümü (`Renk paleti, tipografi ölçeği, başlık hiyerarşisi…`) | **Ölçemedim.** Platform adları muhtemel tetikleyici; atılırsa XAML/WPF işinde açılmama riski var |
| `teknesyum:relay` | Evet — 367 karakterin ~180'i örnek talep listesi (`özellik ekleme, uygulama yazma, hata düzeltme, refactor…`) | **Ölçemedim.** Bu liste tam olarak tetikleyici işlevi görüyor; kısaltmak en riskli müdahale |
| `teknesyum:scan` | Sınırlı — 91 karakter, üç profil adını sayıyor | Düşük |
| `teknesyum:uicheckup` | Sınırlı — 87 karakter | Düşük |
| `teknesyum:premium` | Sınırlı — 84 karakter | Düşük |

**Tetiklenme isabetini ölçemedim.** Ölçmek için aynı istem kümesini kısaltılmış ve
kısaltılmamış `description` ile karşılaştıran bir koşu gerekiyor; bu ölçümün kapsamında
yok ve tahmin yazmadım.

Yapısal olan şu, ve ölçüldü: ilk iki girdiyi yarıya indirsen **377 karakter** kazanılır.
200k senaryosundaki açık **3.635**. Kazanç açığın **%10'u**. Kısaltma bu sorunu çözmez.

---

## 7. Ölçemediklerim

- Yürürlükteki bağlam penceresinin sayısal değeri. Dolaylı olarak 1M gösterildi
  (§0, §4.2) ama doğrudan okunamadı.
- `kcr()` öncelik fonksiyonunun sıralama ölçütü. `g` negatif olduğu için sonuca
  etkisi yok, ama aşımın sınırda olduğu bir durumda hangi Base girdisinin önce
  düşeceğini söyleyemem.
- `description` kısaltmanın tetiklenme isabetine etkisi (§6.1).
- İkiliye gömülü girdilerin listesi harness sürümüne bağlı; 2.1.237'de gözlenen 24
  girdi başka sürümde değişir. Ölçüm bu sürüme aittir.

---

## 8. Ne yapılmalı

Bu bölüm öneri, uygulama değil. Hiçbir dosya değiştirilmedi.

1. **Kısaltma yapma.** Base'in bütün payı 1.842 karakter; 200k senaryosundaki açık
   3.635. Matematik tutmuyor.
2. **Pencereyi izle.** Tek gerçek eşik bu. Bağlam penceresi 200k'ya düştüğü an Base'in
   18 girdisi birden çağrılamaz hale gelir, hiçbir uyarı da verilmez.
3. **Kaçış kapısı hazır.** 200k pencerede çalışmak gerekirse
   `SLASH_COMMAND_TOOL_CHAR_BUDGET=16000` (ya da `skillListingBudgetFraction: 0.02`)
   listeyi `fits` kipinde tutar. Ölçülen 13.938 için 16.000 rahat bir tavan.
4. **Girdi sayısını azaltmak, metni kısaltmaktan etkili.** Her girdi metninden bağımsız
   olarak `ad + 4` sabit maliyet taşıyor; 16 komutun sabit maliyeti 315 karakter.
   Ama bu da §1'deki oranı değiştirmiyor — asıl yük Base'te değil.
