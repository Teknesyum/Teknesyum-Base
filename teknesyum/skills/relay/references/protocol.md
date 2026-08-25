# Röle protokolü — mekanizma

`SKILL.md` ne zaman röle kurulacağını söyler; burası nasıl kurulacağını.

## 1. Dizin

```
.claude/relay/
├── PLAN.md            Görev grafiği + bağımlılıklar. Nadiren değişir.
├── SETTINGS.md            (opsiyonel) proje bazlı düğme ezmesi
├── LOG.md             Append-only, tek satırlık olaylar.
├── live/             Ajan izleri — HOOK yazar, model değil. Elle dokunma.
│   └── <agent_id>.json
└── contracts/
    ├── T2.md          AÇIK sözleşmeler
    └── done/          TAMAMLANMIŞ — salt okunur, hook koruyor
```

**Tek doğruluk kaynağı sözleşme dosyasıdır.** Ayrı durum dosyası tutma; iki kaynak ayrışır.
İlerleme = `done/` içindeki dosya sayısı.

### Durum makinesi — kim hangi geçişi yapar

```
open ──► active ──► submitted ──► done          (dosya done/ altına taşınır)
           ▲            │
           └────────────┘  audit: failed
```

| Geçiş | Yapan | Koşul |
|---|---|---|
| `open → active` | ajan | sözleşmeyi aldı |
| `active → submitted` | ajan | kabul kriterlerini işaretledi, Çıktı dolu |
| `submitted → active` | T0 | denetçi KALDI dedi, düzeltme turu açılır |
| `submitted → done` | **yalnız T0** | denetçi GEÇTİ dedi **ve** mühür işlendi |

**Ajan `done` yazamaz, dosyayı `done/`'a taşıyamaz.** Kendi işini tamamlanmış ilan
edebilen ajan, denetimi fiilen atlar — bu, denetçinin kod yazamamasıyla aynı ağırlıkta
bir sınır.

**Tamamlamanın tek yolu tek komuttur.** `Write` ve `Edit` ile `done/` altına girmek
mühürlü de olsa engellidir; kabukta `done/` geçen parça ya bu komuttur ya bilinen bir
okuma komutudur, gerisi tanınmadığı için engellenir:

```bash
node teknesyum/scripts/contract.js complete --id T7
```

Komut `.claude/relay/audits/<ID>-<tur>.json` altındaki denetim kaydını okur ve dört
eksende eşleşme arar: sözleşme kimliği, o anki `HEAD`, sözleşmenin `owns` kümesi ve o
dosyaların içerik hash'i. Kayıt kullanıldıktan sonra tüketilir — aynı denetim ikinci turu
mühürleyemez. Kaydın alanları:

```json
{ "contractId": "T7", "auditorRunId": "<live/ altındaki denetçi ID'si>",
  "headSha": "<git rev-parse HEAD>", "diffHash": "<owns dosyalarının içerik hash'i>",
  "owns": ["..."], "verification": ["<komut> → exit <kod>"],
  "result": "passed", "createdAt": "<ISO>" }
```

Kancanın göremediği yol (`node -e renameSync`, junction, hardlink) sonuçtan yakalanır:
her `Bash` sonrası ve her kapanışta `done/` içeriği defterle karşılaştırılır, karşılığı
olmayan sözleşme kullanıcıya bildirilir ve `_sorun.log`'a yazılır.

**Merdiven tek yönlüdür ve hook uygular.** `contracts/*.md` üzerine yazılan `status`
öncekinden geride olamaz — `submitted` sözleşmeyi `open` yapıp turu sıfırlamak engellenir.
Tek istisna `blocked`: her durumdan girilir, her duruma çıkılır.

**Mühür**, T0'ın `done/`'a taşımadan önce sözleşme frontmatter'ına işlediği dört alandır:

```yaml
audit: passed
auditor_id: <denetçi ajanın ID'si — live/ altında kaydı olmalı>
diff: <denetime verilen dosya listesi: git diff --name-only çıktısı>
verification: <çalıştırılan komut> → exit <kod>
```

`diff` alanı "denetlenen kod ile teslim edilen kod aynı mı" sorusunu ölçülebilir yapar:
mühürden sonra `owns` dosyalarında değişiklik olduysa sözleşme yeniden denetlenir.
`verification: —` bırakıp `audit: passed` yazma; kanıtsız mühür mührün kendisini değersizleştirir.

`owns` kontrolü de bu kapıda yapılır: `live/<agent_id>.json` içindeki `files` listesi
`owns` ∪ `side_effects` kümesini aşıyorsa mühür işlenmez.

**Kapı alanların dolu olmasına değil karşılığına bakar.** `contract.js complete` denetim
kaydını `live/` izleriyle karşılaştırır:

- `auditorRunId` `live/` altında gerçekten var olan bir kayda işaret eder ve o kaydın
  `agent_type`'ı `auditor`'dür.
- O kaydın `files` listesi **boştur**. Denetçi tek bir dosyaya yazmışsa denetim geçersizdir.
  Bu, denetçinin `tools:` satırına bağlı olmayan tek güvencedir: `agents/auditor.md`
  `Write` ve `Edit` istemiyor ama harness listeyi tamamlayabiliyor — ölçümde tamamladı.
- `verification` boş değildir ve `diffHash` o anki `owns` dosyalarının hash'ini tutar.

**Kapı kapalı tarafa düşer.** Kanca doğrulama yapamıyorsa — bozuk girdi, beklenmedik
hata — geçirmez. Bilerek geçmek için `TEKNESYUM_KAPI_ACIK=1`. Neyin doğrulanamadığı
`live/_sorun.log`'a yazılır.

**`live/` neden var:** kayıt noktası ajanın yazmasına bağlıydı, ajan ölünce yazılmıyordu.
`relay-watch.js` hook'u `SubagentStart` / `PostToolUse` / `SubagentStop` olaylarında
kendiliğinden yazar. Her dosyada: `contract` (ajanın okuduğu sözleşmeden bağlanır),
`last_action`, `files`, `last_seen`, `stop_reason`, `last_word`.

`stop_reason`: `end_turn` normal bitiş · başka her değer **ölüm** · `null` çalışıyor.

**Dördüncü hal: kayıp.** Arka planda düşen ajan `SubagentStop` üretmez — kaydı sonsuza
kadar `stop_reason: null` kalır ve ölü ajan "çalışıyor" görünür. Kural: `ended` yok **ve**
`last_seen` 10 dakikadan eskiyse ajan **kayıp** sayılır, statusline'da `⨯ yanıt yok`.
Kayıp ajan ölü ajan gibi ele alınır (§5) — yoklamayla vakit kaybetme.

**Kayıtta tutarsızlık varsa kayıt karışmıştır.** `ended` `started`'dan önceyse veya
`last_seen` `ended`'den sonraysa iki ajanın izi birbirine geçmiştir; o kayda güvenme,
debug günlüğüne bak.

## 1.1 Debug modu

Normalde hiçbir debug dosyası yazılmaz. Açmanın iki yolu var:

- **Ayar dosyası (varsayılan yol):** `~/.claude/teknesyum.json` içine `"debug": true`.
  Oturum uygulamadan açıldığında kabuk yoktur; kullanıcıya terminal komutu verme,
  bayrağı kendin yaz. Kapatmak için alanı `false` yap veya sil.
- **Ortam değişkeni:** `TEKNESYUM_DEBUG=1` — yalnızca terminalden açılan oturumda.

Açıkken iki dosya oluşur:

| Dosya | Ne söyler |
|---|---|
| `_hook-debug.json` | Sayaç: toplam olay, olay dağılımı, `agent_id` gelen olay oranı, olay başına alan listesi |
| `_hook-debug.log` | Zaman damgalı olay günlüğü: `zaman \| olay \| kimlik \| araç \| kısa alanlar` |

`_sorun.log` bunlardan ayrıdır: **debug kapalıyken de yazılır** ve açılışta sayısı bildirilir.
İçine iki kaynak yazar — kanca, başarısız her araç çağrısını (`zaman | kimlik | araç | hedef |
hata`); ajanlar, bulamadıkları dosyayı ve belirsiz talimatı (`zaman | sözleşme | rol | ne
aradın | ne bulamadın | ne yaptın`). T0 her turda okur. Sorun tespiti kullanıcının ekran
görüntüsüne bırakılmaz.

Sayaç "hook ateşledi mi" sorusunu cevaplar; günlük **"ajan hangi olaydan sonra sustu"**
sorusunu cevaplar. Yarım kesilen ajanı ararken günlükte o ajanın `id:`/`tr:` kimliğini
`grep`'le ve son satırına bak — orada duran araç çağrısı kesilme noktasıdır.

Kimlik alanı hangi kanaldan geldiğini de söyler: `id:` gerçek `agent_id`, `tr:`
transcript adından türetilmiş yedek kimlik. Bir ajan boyunca kanal değişiyorsa
birleştirme devreye girmiştir.

## 1.2 Mekanik ağ — hangi olay neyi kurtarıyor

Kural yazılı olduğu için uygulanmaz; olaya bağlandığı için uygulanır. Bugün bağlı olanlar:

| Olay | Ne yapar |
|---|---|
| `Stop` | Devir ihlalini engeller: sohbete basılan paket, sohbete basılan rapor, kopyalanması istenen uzun blok |
| `PreToolUse` | `contracts/done/` mühür kapısı; alan ihlali |
| `PostToolUse` | Adım, dokunulan dosya, sözleşme bağı |
| `PostToolUseFailure` | Başarısız araç adım saymaz; `last_error` yazılır |
| `SubagentStop` | Ajanın **gerçekte** hangi modelde ve eforda koştuğunu transcript'ten okur |
| `SessionEnd` | Bitmemiş ajan kaydını mühürler — hayalet "çalışıyor" satırı kalmaz |
| `StopFailure` | API hatasında (`rate_limit`, `overloaded`) kesinti kaydı açar |
| `PostCompact` | Sıkışma sonrası açık sözleşmeleri ve rota konumunu bağlama geri verir |

`PostCompact` özellikle önemli: sıkışma bağlam kaybının ikinci yoludur ve model
"hatırladığını" sanarak devam eder. Çıktısı bağlama enjekte edilir; disiplin değil süreç.

**Beyan ile gerçek ayrışabilir.** Ajan tanımında `model: sonnet` yazması o modelde
koştuğu anlamına gelmez. `live/*.json` içindeki `model` ve `effort` alanları transcript'ten
okunur — beyanla uyuşmuyorsa `/report` bunu RİSK olarak basar.

## 2. Sözleşme formatı

```markdown
---
id: T2
title: Form validasyonu
role: builder | ui-builder | scribe
model: haiku | sonnet | opus
depends: [T1]
owns: [src/components/Form.tsx, src/lib/validate.ts]
side_effects: []
status: open | active | submitted | blocked | done
round: 0
agent_id: —
audit: —          # passed | failed — mührü YALNIZ T0 işler
auditor_id: —
diff: —             # denetime verilen dosyalar: git diff --name-only, owns ile kesişir
verification: —        # <komut> → exit <kod>
---
## Amaç            tek paragraf: ne, neden
## Kabul kriteri   ölçülebilir maddeler
## Arayüzler       önceki görevlerin ürettiği ve buna dayanan imzalar
## Bağlam          dar dosya yolları + 3-5 tespit
## Kayıt noktası   ajan doldurur, ÜZERİNE YAZAR
## Çıktı           bitince: değişen dosyalar + tek paragraf
```

`owns` **çakışamaz**. İki sözleşme aynı dosyayı sahiplenemez — paralel çalışacaklarsa
pazarlığa kapalı. Sahiplik düzeltme turunda da geçerlidir: düzeltme başka bir sözleşmenin
dosyasına düşüyorsa düzeltmeyi kendi `owns`una yönlendir.

`side_effects`: ajanın yazmadığı ama çalıştırdığı aracın değiştireceği dosyalar
(`package-lock.json`, biçimlendirici çıktısı, derleme artefaktı). Kümeleri kesişen
sözleşmeleri paralel çalıştırma.

**T0 her sözleşme kapanışında `git status --porcelain` çalıştırır.** `owns` ∪ `side_effects`
dışında değişen dosya varsa `done` olamaz: LOG'a `unowned` satırı, dosyayı kümeye ekle
veya değişikliği geri al.

`agent_id` devam ettirme için kritik — ajan bitince dönen ID'yi buraya yaz.

## 3. Akış

**T0:** `PLAN.md` → sözleşmeler → dağıt (paralel tavanı `parallel_width`) → Çıktı'yı oku
→ `audit` ayarına göre `auditor`'ye doğrulat → kaldıysa §4 → `LOG.md`.

**Ajan:** sözleşmeyi oku → `status: active` → sadece `owns`'a yaz → kayıt noktasını güncelle
→ Çıktı + `status: submitted` → LOG satırı. **Burada durur.**

**T0 kapısı:** `git diff --name-only` ve sözleşmenin doğrulama komutunu çalıştır → çıktıyı
denetçiye ver → GEÇTİ ise mührü işle, denetim kaydını `audits/` altına yaz → `node teknesyum/scripts/contract.js complete --id <ID>`.

**Uzun koşu içeren sözleşmede iki satır baştan yazılır.** Biri kayıt noktası
talimatı — *her kabul kriterinden sonra `## Kayıt noktası`na tek satır düş ve ara ara
commit at* — ki araç tavanına takılan ajan nerede kaldığını okunabilir bıraksın.
Öteki, ölçüm istenen her maddede "öncesi" değerinin depoda belgeli olup olmadığı:
belgeliyse sözleşme onu kaynağıyla alıntılar ve yeniden ölçtürmez. Koşunun bitişi
ajan uyandırılarak değil gözcüyle beklenir (relay `rele-akisi.md` §3.3).
**Bir görev tanımı tek görevi anlatır, oturumun geçmişini değil.** Dispatch prompt'una
konuşma özeti koyma, sözleşmenin yolunu ver.

## 4. Düzeltme döngüsü

`auditor` KALDI derse, `fix_ceiling` kadar tur:

| Tur | Ne yapılır |
|---|---|
| 1-3 | **Aynı ajanı devam ettir** — `SendMessage` ile `agent_id`'ye. Bağlamı korur. |
| 4-5 | **Taze ajan.** `model_escalation: acik` ise bir üst modele çık. |
| tavan | Dur. Açık bulguları kullanıcıya özetle, kararı o versin. |

Model tırmanışı **4. turda, taze ajanla** olur. Üçüncü turda mevcut ajanı modelini
değiştirerek devam ettiremezsin; devam ettirme bağlamı korur, model değiştirmez.

Her turda `round:` artır. Tur 3'te hâlâ çözülmüyorsa sorun genelde ajanın değil
**sözleşmenin**: kabul kriteri ölçülemez veya bağlam eksiktir.

### Turun ne zaman biteceği — durdurma kuralı

`fix_ceiling` **düzeltme** turlarının tavanı; **denetim** turunun ne zaman
biteceğini söylemiyordu. Söylemeyince döngü kendiliğinden durmadı: bir sözleşme on
iki tur döndü, on bir bağımsız denetim gördü, her turda on kriterin onu geçti ve her
tur bir öncekinin taksonomisi dışından yeni bir kusur *sınıfı* adlandırıldı. Sınıfların
hiçbiri uydurma değildi. Fark, kodun karmaşıklığından değil o sözleşmeye ayrılan
sabırdan geliyordu ve sabrın sınırı hiçbir yerde yazılı değildi.

Üç kural, üçü de otomatik:

1. **Tur yalnızca KRİTİK bulunursa açılır.** KRİTİK'in tanımı `agents/auditor.md`
   içindedir ve iki maddeyle sınırlıdır: gerçekçi girdide yanlış çıktı/çıkış kodu, ya
   da yazılı bir kabul kriterinin delinmesi. Kalan her bulgu **borçtur**: mühür
   notuna yazılır, sözleşme mühürlenir.
2. **Üçüncü turdan sonra `advisor` zorunlu.** `round >= 3` ve denetim hâlâ
   geçmemişse brifing yazmadan önce görüş alınır (relay `plan-akisi.md` §1.5.1 madde 2). Kanca
   `UserPromptSubmit`'te hatırlatır ve her görüş `.claude/relay/GORUS.md`'ye düşer.
   Açmamayı seçen gerekçesini sözleşmeye yazar.
3. **Beşinci turdan sonra durdurma kuralı yürürlüktedir.** Denetim raporu BORÇ'u tur
   gerekçesi olarak kullanamaz; KRİTİK gösterilemiyorsa sözleşme borçlarıyla
   mühürlenir ve borçlar bir sonraki sözleşmeye taşınır.

Borçlar frontmatter'daki `borc:` listesinde durur — serbest metin değil, çünkü bir
sonraki sözleşme onları `depends` gibi okuyabilsin. Boşsa `borc: []`.

Ölçüldü: `docs/openlogs/kapali/HATA-denetim-turu-durdurma-kurali-yok.md`.

**Açık kritik bulgu varken bir sonraki göreve geçme.**

Tek satırlık, gözle doğrulanabilir düzeltmelerde denetçi ajanı harcama — grep'le kontrol et.

**Denetçi komut çalıştıramaz** — `Bash`'i yok, kabuktan dosya değiştirebileceği için
alındı ve verilmeyecek. Kanıtı sen üretirsin: dağıtmadan önce `git diff --name-only` ve
her kriterin **`CHECK:`** satırındaki komutu **sen çalıştır**, çıktıyı denetim isteğine
yapıştır. Yapıştırmadığın kriteri denetçi `? kanıtsız` işaretler; o işaret sende iş kalmış
demektir, denetçide değil.

### Koşulabilir kriter — `CHECK:` / `EXPECT:`

Kriterin yanına hangi komutun kanıt sayıldığı yazılır. Yetki değişmiyor: komutu yine T0
koşuyor, denetçi yalnız çıktıyı okuyor. Değişen tek şey, "geçti" derken neye bakıldığının
sözleşmede **yazılı** olması — bugün o bilgi T0'ın o anki hatırlamasında duruyor.

```markdown
- [ ] K1: bütün testler geçiyor
      CHECK: node test/run.js
      EXPECT: GEÇTİ
```

| Alan | Zorunlu mu | Ne işe yarar |
|---|---|---|
| `CHECK:` | `audit` eşiği `high` ve üstündeyse **evet** | Kanıtı üreten komut |
| `EXPECT:` | hayır | Çıktıda aranan dizgi |
| `CWD:` | hayır | Komutun koşacağı dizin — yazılmazsa proje kökü |

**Asıl şart çıkış kodudur.** Sıfırdan farklı çıkış hiçbir koşulda geçmez; hata metninde
`EXPECT`'in dizgisi geçiyor olması bunu değiştirmez. `EXPECT` bilerek isteğe bağlı:
metin eşleşmesi kırılgandır — çıktı dili değişir, renk kodu araya girer, sürüm satırı
kayar. Kırılgan bir şartı zorunlu yapmak yanlış `kaldı` üretir.

**Zorunluluk denetim eşiğine bağlıdır.** `high` ve üstünde `CHECK`siz kriter sözleşmeye
giremez; `critical` ve altında serbesttir. Küçük ve geri alması ucuz işte her kritere
komut yazdırmak tören olur, tören de atlanır.

`CHECK` yazılamayan bir kriter varsa iki yol var: kriteri komutu yazılabilir hâle getir,
ya da `plan-akisi.md` §1.5.1 madde 8'i uygula ve sözleşmeye koymadan önce sor. Gözle doğrulanan madde
`CHECK` satırı olmadan yazılır — uydurma komut, komutsuzluktan kötüdür.

**Yapıştırma biçimi.** Denetim isteğine her kriter için tek blok:

```
K1 · CHECK: node test/run.js → exit 0
✓ GEÇTİ  385/385
```

## 5. Düşen ajan

Üçüncü hal: **öldü.** `live/<agent_id>.json` içinde `stop_reason` `end_turn` dışındaysa
ajan ölmüştür. Sözleşme `active` ama ajanı ölü — kurtar:

1. `LOG.md`: `T<n> dead · <stop_reason>`
2. `SendMessage` ile `agent_id`'ye yaz, dirilt.
3. Yanıt yoksa **taze ajan**. Devir teslim metnini `live/`'den kur: `last_action`,
   `files`, `last_word` + varsa sözleşmenin Kayıt noktası.
   `round:` artırma — bu kesinti kurtarması, düzeltme turu değil.
4. İki kurtarma da başarısızsa `status: blocked`, kullanıcıya söyle.

**Denetçi ölürse denetimi atlama.** Denetimsiz `done` yasak; taze `auditor` ata.
Ajan `done/`'a taşımayı denemişse hook zaten engellemiştir — LOG'a `mühürsüz taşıma
denemesi` satırı at ve sözleşmeyi `submitted`'da bırak.

`live/` boşsa (hook çalışmamışsa) geri düş: notification, `git status` ve diskteki
dosyalar durumu anlatır. Bilgi kaybı olmadan kurtarılabilir ama otomatik değildir.

## 6. Oturum kesilince

Yeni oturum sırayla okur, başka hiçbir şey:

1. `live/*.json` — **önce burası.** Hook yazdı, ajanın iş birliğine bağlı değil.
2. `LOG.md` son 15 satır
3. Açık sözleşmelerin frontmatter'ı (`done/` değil)
4. `active` olanın Kayıt noktası — `live/`'yi tamamlar, yerine geçmez

Sonra: `stop_reason: null` → `SendMessage` ile yokla · ölü → §5 · ajan yok, bağımlılığı
karşılanmış `open` var → dağıt.

**Düzeltme turuna girerken kayıt noktası önce güncellenir.** `submitted` bir sözleşme
`active`'e dönüyorsa kayıt noktası hâlâ "tamamlandı" diyor demektir; oturum orada kesilirse
kurtarma sözleşmeyi bitmiş sanar ve kalan maddeler kaybolur. Sırası: kayıt noktasına turun
kaçıncı olduğunu ve açık maddeleri yaz → `status: active`. Ters sırayı `contract-guard`
engeller.

**Durum tablosu sözleşmeyle birlikte değişir.** `PLAN.md`'deki satır sözleşmenin
frontmatter'ından geri kalırsa iki kaynak çelişir; kurtarma hangisine inanacağını bilemez.
Sözleşme durumu değiştiğinde tabloyu da o turda güncelle.

`PLAN.md`'yi ancak yeni görev üretecekse oku. Sözleşme `done/`'a taşınınca ilgili
`live/<agent_id>.json` dosyasını sil.

## 7. LOG formatı

```
2026-08-11 14:22 T0  plan: 8 sozlesme, T1->T2, T3 paralel
2026-08-11 14:31 T1  done   · src/LockSolver.ts + testler yesil
2026-08-11 14:48 T2  failed · round 1, kabul 2 karsilanmadi
2026-08-11 14:55 T4  dead   · max_tokens, SendMessage ile dirildi
2026-08-11 14:58 T4  unowned · package-lock.json, side_effects'ye eklendi
```

Etiketler: `plan` `done` `failed` `dead` `unowned` `blocked`.

## 8. Kullanıcıya raporlama

Kullanıcı ajanların içini göremez. Rapor vermezsen sistem ona kara kutu gibi görünür ve
yönetemez. **Aşağıdaki altı an zorunludur**, `approval_gate: yok` olsa bile — o düğme
*onay beklemeyi* kapatır, *briefingyi* değil.

Her rapor dört soruyu cevaplar: **neredeyiz · ne oldu · sırada ne var · senden bir şey
gerekiyor mu.** Cevap yoksa satırı yazma.

### 8.1 Açılış brifingi — dağıtmadan önce

```
Plan: <tek cümle, işin tamamı>
```

| Sözleşme | Ne yapacak | Rol / model | Bekliyor | Dokunacağı dosyalar |
|---|---|---|---|---|

Tablonun altına üç satır: **paralel çalışacaklar**, **bilerek kapsam dışı bıraktıklarım**,
**gördüğüm risk**. Sonra tek satır: neyi şimdi değiştirebileceği (sıralama, kapsam,
`parallel_width`). `approval_gate: yok` ise beklemeden başla — ama brifingi yaz.

### 8.2 Dalga başlarken

Aynı anda başlayan ajanlar tek satırda: `▸ T3 ui-builder · T4 builder — paralel, owns kesişmiyor`.

### 8.3 Sözleşme kapanınca

Dört satır, fazlası değil: **ne yapıldı** · **değişen dosyalar** · **denetim kararı**
(geçti / kaldı + kaç tur) · **sırada ne açıldı**. Ajanın Çıktı metnini olduğu gibi
yapıştırma, kendi cümlenle yaz.

### 8.4 Dalga sonunda ara rapor

İlerleme `x/y`, harcanan düzeltme turu, açık risk, kalan iş ve **plandan sapma varsa
sapmanın kendisi**. Kullanıcı en çok burada müdahale eder; ara raporu atlama.

### 8.5 Sapma anında — beklemeden

Şunlar sessizce olmaz: plan değişti, sözleşme eklendi/iptal edildi, `owns` genişletildi,
model tırmandı, ajan öldü, sahipsiz dosya çıktı, denetim tavana dayandı.
Tek satır + sebep + ne yaptığın.

### 8.6 Kapanış raporu

Sözleşme tablosu (durum + tur sayısı), toplam değişen dosya, denetimde yakalanan bulgular,
yapılmayanlar ve sebebi, önerilen sonraki adım.

### Biçim kuralı

Rapor **yapılandırılmış durum bildirimidir, düzyazı özet değildir.** Tablo, madde, tek
satırlık olay. Bitmiş işi tekrar anlatma; anlatılacak şey değişimdir. `briefing: sessiz`
ayarında yalnızca 8.1, 8.5 ve 8.6 kalır — diğerlerini kullanıcı `/report` ile ister.

## 9. Yönlendirici AGENTS.md

Klasörde 5+ kaynak dosya varsa veya klasör mimari sınırsa (main/renderer, core/ui, api/db)
→ ≤20 satırlık `AGENTS.md` şart. Şablon: `assets/folder-agents.template.md`.
20 satırı aşıyorsa fazlasını ayrı referans dosyasına taşı.

**Neden AGENTS.md, neden yanına tek satırlık CLAUDE.md.** Yönlendirici dosyayı Claude Code
dışındaki araçlar da okuyor (Codex, Cursor, Copilot); `AGENTS.md` hepsinin ortak adı.
Claude Code'un o dosyayı kendiliğinden bulduğu doğrulanamadı — garanti yol, yanına tek
satırlık bir `CLAUDE.md` koyup içine `@AGENTS.md` yazmaktır. İçe aktarma sözdizimi
ölçüldü, çalışıyor. Bilgi tek yerde durur, ikinci dosya bir satırdır.
