# Denetim — 22.08.2026

Yüksek eforda, salt okuma denetimi. Kapsam: kök düzeni, README, `docs/`, CHANGELOG,
`teknesyum/` altındaki bütün kanca ve betikler, `test/run.js`, relay SKILL ve referansları,
son 20 commit. Hiçbir dosya değiştirilmedi.

Her bulgu dosya ve satırla kanıtlanmıştır. Kanıtlanamayan hiçbir şey yazılmadı.

Sürüm: 2.37.0 · denetim anındaki HEAD `b9c8a3d` · 164/164 test geçiyordu.

**Onarım durumu** — Faz 1 kapandı, 187/187 test geçiyor. B14 dışındaki bütün bulgular
düştü; B14 (isimlendirme ve kurulum dili) son turda. Kapanan bulgular başlıklarında
işaretli. Kapanmayanlar dalga 2 ve 3'te.

---

## B1 · Denetçinin "yazamaz" garantisi gerçekte tutmuyor — **kapandı**

**Boy:** büyük

Base'in taşıyıcı güvencesi, denetçinin denetlediği şeyi düzeltememesi. `agents/auditor.md:5`
`tools: Read, Grep, Glob, LSP` yazıyor ve README bunu mimarinin kilit taşı olarak anlatıyor:

> `README.md:311` — "it holds `Read`, `Grep`, `Glob` and `LSP` — no `Write`, no `Edit`, and
> **no `Bash`**, because a shell is a write tool."

Claude Code ajanı gerçekte **`Read, Grep, Glob, LSP, Write, Edit`** ile açıyor. Aynı sapma
üç ajanda birden var ve ortak yanları `memory: project` alanı:

| Ajan | Dosyada yazan | Ajan açılırken gerçekte verilen |
|---|---|---|
| `auditor` | Read, Grep, Glob, LSP | + **Write, Edit** |
| `planner` | Read, Grep, Glob, LSP, WebSearch, WebFetch | + **Write, Edit** |
| `scout` | Read, Grep, Glob, WebSearch, WebFetch, Bash, Write | + **Edit** |

Hafıza yazabilmesi için harness'ın araç listesini tamamladığı anlaşılıyor — `tools:`
satırı bir tavan değil, taban.

**Neden sorun:** Denetçi denetlediği dosyayı düzeltebiliyor. `planner` için az önce
"yazma aracı yok, o yüzden planı yapan işe giremez" diye yazdığım garanti de aynı şekilde
boş. İkisi de prompt disiplinine düşmüş durumda; oysa belge bunu harness güvencesi diye
satıyor.

**İkinci kat — test yalan söylüyor.** `test/run.js:189` yalnızca dosyadaki `tools:`
metnini okuyor:

```js
const tools = (md.match(/^tools:\s*(.+)$/m) || [])[1] || '';
```

Harness'ın gerçekte ne verdiğini hiç görmüyor. README `README.md:315` "A test asserts the
tool list, so the guarantee cannot quietly erode" diyor — test yeşil, garanti yok, erozyon
sessizce olmuş.

**Önerilen düzeltme:** Karar gerektiriyor, üç yol var.
1. `memory: project`i `auditor` ve `planner`dan kaldır — hafıza gider, araç listesi
   daralır (harness'ın gerçekten bu yüzden eklediği doğrulanmalı).
2. Garantiyi belgede düzelt ve denetimi mekanik doğrulamaya bağla: denetçinin turunda
   `git diff` alınıp denetçi dosyaya dokunduysa denetim geçersiz sayılır.
3. İkisi birden.

Ne seçilirse seçilsin `README.md:311-316` ve `SKILL.md`'nin denetçi bölümü, gerçekte
duran garantiyi yazacak şekilde güncellenmeli.

**Onarımda ne yapıldı:** ikisi birden, mekanik doğrulama önce. Mühür kapısı artık
`auditor_id`'yi `live/` kaydına çözüyor, kaydın `agent_type`'ı denetçi olmalı ve `files`
listesi boş olmalı — dosyaya dokunmuş denetçi kendi denetimini mühürleyemiyor, eline
hangi araç verilirse verilsin. `memory: project` `auditor` ve `planner`dan kaldırıldı.
README garantiyi üç katman olarak yazıyor ve ilk ikisinin bir istek, üçüncüsünün dayatma
olduğunu açıkça söylüyor.

**Doğrulanmayı bekleyen:** `memory: project` kaldırmanın harness'ın araç listesini
gerçekten daralttığı hipotezi. Ajan tanımları oturum başında yükleniyor, bu yüzden ancak
Claude Code yeniden başlatıldıktan sonra ölçülebilir. Ölçüm yöntemi: yeni oturumda ajan
listesinde `teknesyum:auditor` satırının araçlarına bak — `Write` ve `Edit` düştüyse
hipotez doğru. Düşmediyse üçüncü katman zaten tek başına ayakta, ama belgedeki 2. madde
gerçeği yazmıyor demektir ve düzeltilmeli.

---

## B2 · `[object Object]` klasörü hâlâ üretiliyor ve depoda duruyor — **kapandı**

**Boy:** küçük (düzeltmesi), orta (etkisi)

`git ls-files` iki dosya döndürüyor:

```
[object Object]/teknesyum/live/kap-1.hatirlatma
[object Object]/teknesyum/live/kap-1.kapsayici
```

Kaynak `test/run.js:2705` ve devamı. `konfig()` (`test/run.js:70-82`) zaten bir ortam
nesnesi döndürüyor:

```js
return { CLAUDE_CONFIG_DIR: c };
```

Kapsayıcı testi onu bir kez daha sarıyor:

```js
const cfg = konfig(true);
… calistir(IZLE, {...}, { CLAUDE_CONFIG_DIR: cfg })
```

Kanca konfig dizini olarak `"[object Object]"` string'ini alıyor, göreli çözüyor ve depo
köküne klasör açıyor. `node test/run.js` her koşuşta yeniden yaratıyor — silinip tekrar
üretildiği doğrulandı.

Yan etki: o testler iddia ettikleri konfigi hiç sınamıyor; kanca varsayılan konfige
düşüyor.

`b9c8a3d` commit'i bu düzeltmenin yalnızca ilk yarısını (`test/run.js:2645`) içeriyor.
İkinci yarı, reddedilen bir kabuk çağrısının içinde kaldığı için hiç uygulanmadı.

**Önerilen düzeltme:** `test/run.js:2705-2727` arasındaki `{ CLAUDE_CONFIG_DIR: cfg }`
kullanımlarını `cfg` yap; klasörü depodan çıkar; CI'ya testten sonra
`git status --porcelain` boş mu diye bakan bir adım ekle — bu sınıf hatanın tekrarı ancak
öyle yakalanır.

---

## B3 · `SON.json` oturum işaretçisi yazılıyor ama hiç okunmuyor — **kapandı**

**Boy:** orta

`scripts/oturum.js:601` yorumu amacı açıkça yazıyor: "SON.json tek işaretçi değil, oturum
başına işaretçi tutar: iki sohbet aynı projede kaydettiğinde biri ötekinin izini
silmesin." `sonYaz` (612-619) bunu yazıyor.

`sonOku` (603-610) **yalnızca `sonYaz` içinde** çağrılıyor. Yükleme tarafında hiç
kullanılmıyor: `/load` argümansız çağrıldığında `kayitSec` (660-673) `hepsi[0]` döndürüyor
— yani en yeni kayıt, bu oturumun kaydı değil.

Sonuç: iki sohbet açıkken `/load` hâlâ öteki sohbetin kaydını açabiliyor. CHANGELOG 2.30.0
bu sorunu çözülmüş sayıyor; yazma tarafı çözülmüş, okuma tarafı hiç yazılmamış.

**Test bunu örtüyor.** `test/run.js:2233` yalnızca dosyada iki anahtar bulunduğunu
doğruluyor:

```js
esit(Object.keys(son.oturumlar).length, 2, 'her oturumun kendi isaretcisi olmali');
```

Özelliğin amacı — doğru kaydın seçilmesi — hiç sınanmıyor.

**Önerilen düzeltme:** `kayitSec`, ad verilmediğinde önce `SON.json.oturumlar[CLAUDE_CODE_SESSION_ID]`
kaydına baksın, bulamazsa en yeniye düşsün. Test, iki oturumlu bir projede `/load`'un
çağıran oturumun kaydını açtığını doğrulasın.

---

## B4 · Röle kökünü bulan üç ayrı uygulama, biri farklı davranıyor — **kapandı**

**Boy:** orta

Aynı kavramın üç adı ve üç gövdesi var:

| Dosya | Fonksiyon |
|---|---|
| `hooks/relay-watch.js:939` | `findRelay` |
| `hooks/contract-guard.js:78` | `relayKoku` |
| `scripts/statusline.js:56` | `releKoku` |

`gitSor` iki kancada da var ve **aynı şeyi yapmıyor**:

```js
// relay-watch.js:982
if (path.basename(common).toLowerCase() === '.git') common = path.dirname(common);

// contract-guard.js:72
return { top, common: path.dirname(path.resolve(top, git)) };
```

`relay-watch` `.git` son ekini koşullu kırpıyor, `contract-guard` koşulsuz bir üst dizine
çıkıyor. `--git-common-dir` çıktısı `.git` ile bitmeyen bir kurulumda ikisi farklı köke
varır — kanca sözleşmeyi korurken izleyici başka yere bakar.

Aynı sınıftan: `projeMi` iki kez tanımlı (`hooks/kapsayici.js:18`, `scripts/rc.js:213`);
`norm` üç, `read` üç, `yaz` üç dosyada ayrı ayrı yazılmış.

**Önerilen düzeltme:** `hooks/ortak.js` (ya da `scripts/ortak.js`) açılıp röle kökü, git
bilgisi, konfig kökü, `read`/`yaz`/`norm`/`safe` tek yere alınmalı. Öncelik `gitSor`'da:
iki kanca aynı kökü görmek zorunda.

---

## B5 · Ölçü ve fark satırı biçimi SKILL.md'de eski kalmış — **kapandı**

**Boy:** küçük

`613d59b` commit'i biçimi değiştirdi: etiket büyük harf, ayraç `▸`, cümle içinde ok yok.
`hooks/dil.js` bu biçimi her istekte modele dayatıyor. Ama relay SKILL hâlâ eskisini
öğretiyor:

```
SKILL.md:65   Teknesyum ▸ ölçü: 6 dosya / tek yetenek → oturum içi röle · …
SKILL.md:72   Teknesyum ▸ ölçü: tek dosya / gözle doğrulanabilir → ajan gerekmedi …
SKILL.md:73   Teknesyum ▸ ölçü: sıfırdan proje / 3 yetenek → görev paketi · 8 sözleşme
SKILL.md:630  `Teknesyum ▸ fark · işi 4 sözleşmeye bölüp 2 ajana verdim — …`
SKILL.md:631  `Teknesyum ▸ fark · bağları harita.js ile taradım — …`
SKILL.md:632  `Teknesyum ▸ fark · denetçi T2'yi geri çevirdi — …`
SKILL.md:633  `Teknesyum ▸ fark · builder'ı sonnet'e yükselttim — …`
SETTINGS.md:86  `Teknesyum ▸ fark · …`
```

O commit `dil.js`, `test/run.js`, `README.md` ve `commands/setup.md`'yi güncellemiş,
skill dosyalarını atlamış. Model iki çelişik talimat okuyor.

`SKILL.md:633` ayrıca premium profille çelişiyor: "builder'ı sonnet'e yükselttim — haiku
3 turda çözemedi" — premiumda ikisi de yok ve model tırmanışı kapalı.

**Önerilen düzeltme:** Sekiz satırı yeni biçime çevir. `SKILL.md:83` `Teknesyum ▸ etki`
bloğu ve `SKILL.md:175,181` araştırma bildirimleri de aynı elden geçmeli — bunlar alan
listesi olduğu için `·` ayracı doğru kalabilir, ama karar bir kez verilip her yere
uygulanmalı.

---

## B6 · Transkript yolu `CLAUDE_CONFIG_DIR`'i yok sayıyor — **kapandı**

**Boy:** orta

```js
// scripts/oturum.js:87
return path.join(os.homedir(), '.claude', 'projects', kok.replace(/[^a-zA-Z0-9]/g, '-'));
// scripts/oturum.js:95
const dip = path.join(os.homedir(), '.claude', 'projects');
// hooks/relay-watch.js:615
process.env.USERPROFILE || process.env.HOME || '.', '.claude', 'projects'
```

Projedeki her yerde konfig kökü `CLAUDE_CONFIG_DIR || <ev>/.claude` kalıbıyla okunuyor
(`dil.js`, `relay-watch.js`, `bridge.js`, `premium.js`, `statusline.js` — dokuz yer).
Transkript yolunda bu kalıp kullanılmamış.

Konfig dizinini taşımış bir kullanıcıda `/save`, `/load`, `/saveall`, `/loadall` ve
"önceki oturum var" bildirimi çalışmaz. Testler `USERPROFILE`'ı ezerek geçtiği için sorun
görünmüyor.

**Önerilen düzeltme:** Ortak `konfigKok()` yardımcısını kullan (B4 ile birlikte yapılmalı).

---

## B7 · `done/` mührü doğrulanmıyor, yalnızca dolu olup olmadığına bakılıyor — **kapandı**

**Boy:** orta

```js
// hooks/contract-guard.js:28-34
const MUHUR = /^audit:[ \t]*(passed|gecti)[ \t]*$/im;
const KANIT = ['auditor_id', 'diff', 'verification'].map(alan);
function muhurlu(metin) {
  return MUHUR.test(s) && KANIT.every((r) => r.test(s));
}
```

Kapı dört alanın **boş olmamasını** istiyor. Alanların doğruluğunu — `auditor_id`'nin
gerçekten çalışmış bir denetçiye ait olduğunu, `diff`in gerçek diff olduğunu — hiçbir yer
kontrol etmiyor. Sözleşmeyi yazan ajan dört satırı kendi uydurup `done/` altına
taşıyabilir.

`SETTINGS.md`'deki "Ajan raporu denetim yerine geçmez" ve README'deki "the audit cannot be
skipped" iddiaları bu kapıyla sağlanmıyor; kapı yalnızca **biçim** denetliyor.

B1 ile birlikte okunmalı: denetçi zaten yazabiliyor.

**Önerilen düzeltme:** `auditor_id` `live/` altındaki gerçek bir ajan kaydıyla eşleşsin
(`relay-watch.js` zaten `agent_id` yazıyor); `diff` alanı boş olmayan bir `git diff
--name-only` çıktısı taşısın ve `owns` kümesiyle kesişsin.

---

## B8 · `CLAUDE.md` kapısı yalnız `Write`'ta duruyor — **kapandı**

**Boy:** küçük

```js
// hooks/contract-guard.js:230
if (arac === 'Write') yonlendirici(hedef, t.content || '');
```

`Edit` ile mevcut bir `CLAUDE.md`'ye gövde eklenebilir; kapı görmez. `gerileme` aynı
satırda her iki aracı da kapsıyor, `yonlendirici` kapsamıyor.

**Önerilen düzeltme:** `Edit` için de çalıştır — `new_string` tek satırlık işaretçi
kuralını bozuyorsa engelle.

---

## B9 · Ölü kod: `CONTRACT_DIZIN` — **kapandı**

**Boy:** küçük

`hooks/contract-guard.js:165` tanımlı, hiçbir yerde kullanılmıyor (depo genelinde tek
eşleşme kendi tanımı). Muhtemelen `canonical()` yazılırken yerini kaybetmiş.

**Önerilen düzeltme:** Sil.

---

## B10 · Debug izleme varsayılan açık ve hiç temizlenmiyor — **kapandı**

**Boy:** küçük

`~/.claude/teknesyum.json` içinde `"debug": true` duruyor. `relay-watch.js:58` her olayda
`_hook-debug.json` ve `_hook-debug.log` yazıyor (`iz`, `izSatiri` — 758-807).

`supur()` (826-843) yalnızca röle **kurulu olmayan** oturumda çağrılıyor
(`relay-watch.js:56`: `if (!root) supur();`). Röle kurulu bir projede `live/` altındaki
debug dosyaları hiç budanmıyor.

**Önerilen düzeltme:** `debug`i kapat; günlüğe boyut tavanı koy (son N satır); `supur`u
röle kurulu projede de çalıştır.

---

## B11 · `genelKok()` worktree'ye göre kayıyor — **kapandı**

**Boy:** küçük

```js
// hooks/relay-watch.js:818-823
function genelKok() {
  const ev = process.env.CLAUDE_CONFIG_DIR || …;
  return izYolu(path.join(ev, 'teknesyum'));
}
```

`izYolu` (811-816) `_worktree` doluysa yola `worktrees/<ad>` ekliyor. Genel kök makine
geneli olmalı; worktree'de açılan oturumda hatırlatma sayacı (`sayacGecti`, 393),
kapsayıcı durumu (20) ve `kullanim.json` (927) ayrı bir alt klasöre düşüyor. Sayaç
sıfırlanıyor, kullanım istatistiği bölünüyor.

**Önerilen düzeltme:** `genelKok()` `izYolu`yu değil doğrudan `<konfig>/teknesyum/live`
yolunu kursun.

---

## B12 · `kapsayici.kok()` her araç çağrısında dizin okuyor — **kapandı**

**Boy:** küçük

`hooks/kapsayici.js:34-38` her çağrıda `readdirSync` + alt klasör başına üç `existsSync`
yapıyor; `relay-watch.js:18` bunu **her olayda** çağırıyor. Üst klasörde yirmi proje varsa
her araç çağrısında altmışın üzerinde dosya sistemi sorgusu.

`gitBilgisi` aynı gerekçeyle önbelleğe alınmış (`relay-watch.js:956-967` — "Windows'ta
süreç açmak 20-60 ms"); burada aynı önlem yok.

**Önerilen düzeltme:** Süreç ömrü boyunca tek seferlik önbellek — `gitBellek` kalıbı.

---

## B13 · Yetim ve yanlış yerdeki belgeler — **kapandı**

**Boy:** küçük

- `docs/tarama-bulgulari.md` (30 kB) ve `docs/worktree-kalinti.md` (41 kB) `docs/` kökünde
  duruyor; SKILL.md §1.4 tarama çıktısının yeri olarak `docs/taramalar/` diyor ve orada
  ayrıca bir `RAPOR.md` var. İki paralel tarama arşivi.
- `docs/ROTA-kutuphane-taramasi.md` ilk satırında "tarama kapandı" diyor, ama
  `relay-watch.js:856-861` `PostCompact` olayında `docs/ROTA-*.md` dosyalarını okuyup
  bağlama enjekte etmeye devam ediyor. Kapanmış rota her sıkışmadan sonra geri geliyor.

**Önerilen düzeltme:** Tarama dosyalarını `docs/taramalar/` altına taşı; kapanmış rotaya
`durum: kapandı` alanı ekleyip `sikismaSonrasi`'nın onu atlamasını sağla.

---

## B14 · İsimlendirme ve dil iki yerde tutarsız

**Boy:** küçük

- `scripts/uicheckup.js` içinde İngilizce (`collectFiles`, `readCatalog`, `ruleFor`,
  `finding`) ve Türkçe (`gorunenParcalar`) fonksiyon adları yan yana;
  `scripts/uicheckup-apply.js` tamamen İngilizce. Diğer bütün betikler Türkçe
  (`tara`, `denetle`, `kur`, `yaz`).
- `install.sh` ve `install.ps1` kullanıcıya Türkçe yazıyor. Depo kuralı, dışarı bakan
  yüzün İngilizce olmasını istiyor (README bu kurala uyuyor, kurulum betikleri uymuyor).

**Önerilen düzeltme:** Tek dil seç ve `uicheckup*.js`'i ona çevir; kurulum betiklerinin
kullanıcıya bastığı metni İngilizceye al.

---

## B15 · Hafıza taşımada çakışma eki tek seferlik — **kapandı**

**Boy:** küçük

```js
// hooks/kapsayici.js:152
else fs.renameSync(a, b.replace(/(\.md)?$/, '-2$1'));
```

İkinci çakışmada yine `-2` üretiliyor ve önceki `-2` dosyasının üzerine yazılıyor. Üç
farklı projeden aynı adlı hafıza dosyası gelirse biri sessizce kayboluyor.

**Önerilen düzeltme:** Boş bulunana kadar `-2`, `-3`, … dene.

---

## B16 · Model ve efor doğrulaması yarım kalmış — **kapandı**

**Boy:** küçük

`relay-watch.js:184-187` yorumu şunu vaat ediyor:

> "İkisi birlikte 'beyan edilen model/efor gerçekten uygulandı mı' sorusunu mekanik olarak
> cevaplar; ajan tanımındaki `model:`/`effort:` artık doğrulanabilir."

`kimlikOku` (235-247) değerleri okuyup kayda yazıyor, `statusline.js:167-174` gösteriyor.
Beyanla karşılaştıran, uyuşmazlıkta uyaran kod yok. Vaat edilen doğrulama yapılmamış;
elde yalnızca gösterim var.

**Önerilen düzeltme:** Ya karşılaştırmayı yaz (ajan dosyasındaki `model:` ile kayıttaki
`model` tutmuyorsa `_sorun.log`'a satır), ya da yorumu gerçeğe indir.

---

## B17 · 2.37.0 etiketlenmemiş

**Boy:** küçük

`git tag` `v2.36.1`'e kadar gidiyor; `2.37.0` commit'i (`ad9b453`) push edilmiş ama
etiketi yok. Önceki her sürümün etiketi var, zincir burada kırılıyor.

**Önerilen düzeltme:** `git tag v2.37.0 ad9b453 && git push --tags` — ancak B2 düzeltmesi
de girecekse etiketi ondan sonra at.

---

## B18 · Ajan hafızası depoya sızabiliyor — **kapandı**

**Boy:** küçük

`.gitignore` `.claude/relay/live/`, `.claude/worktrees/`, `.claude/oturumlar/` ve harita
çıktılarını kapsıyor ama `.claude/agent-memory/` kapsamıyor. Bütün ajanlarda
`memory: project` açık; ajan hafıza yazdığı anda dosya takipsiz olarak beliriyor ve ilk
`git add -A` ile depoya giriyor.

Onarım dalgasının ilk turunda üç ajandan biri gerçekten hafıza yazdı ve worktree'de
takipsiz `.claude/agent-memory/` klasörü olarak göründü.

Hafıza ajan başına yerel öğrenmedir, üretilen içeriktir ve okuduğu dosyalardan alıntı
taşıyabilir; `live/` gibi makine alanıdır.

**Önerilen düzeltme:** `.gitignore`'a `.claude/agent-memory/` ekle. (Faz 1.1 içinde
yapıldı.)

---

# Onarım planı

## Faz 1 — Mantık hataları ve eksikler

Sıra bağımlılığa göre. Faz 1 bitmeden Faz 2 ve 3'e geçilmez; ikisi de bu dosyalara
dokunacak.

### 1.1 · Depoyu temizle (B2, B17)

Tek oturumluk, kimseyi beklemiyor.

- `test/run.js:2705-2727` arasındaki `{ CLAUDE_CONFIG_DIR: cfg }` → `cfg`.
- `[object Object]/` depodan ve diskten çıkar.
- CI'ya adım: `node test/run.js` sonrası `git status --porcelain` boş olmalı.
- Test artığı üretmeyen bir koşu doğrulandıktan sonra `v2.37.0` etiketi.

**Ölçüsü:** `git ls-files | grep object` boş; test iki kez üst üste koşup depo temiz kalıyor.

### 1.2 · Denetçi garantisini gerçek yap (B1, B7)

Faz 1'in ağırlık merkezi. **Karar gerektiriyor** — üç yoldan hangisi (bkz. B1) seçilmeden
başlanmaz.

- Harness'ın `memory: project` yüzünden araç eklediği hipotezi önce doğrulanır:
  `memory` alanı kaldırılmış bir kopya ajanla tek deneme yeter.
- Doğrulanırsa `auditor` ve `planner` hafızasız kalır ya da denetim mekanik doğrulamaya
  bağlanır.
- `muhurlu()` biçim denetiminden kanıt denetimine çıkarılır: `auditor_id` `live/` altındaki
  gerçek ajan kaydıyla eşleşir, `diff` `owns` kümesiyle kesişir.
- README ve SKILL'deki garanti cümleleri gerçekte duran şeyi yazar.
- Test, dosyadaki metni değil **çalışan ajanın davranışını** doğrular: denetçi turunda
  `owns` dışına yazılmışsa denetim geçersiz.

**Ölçüsü:** Denetçiye kasten yazdırılan bir dosya denetimi düşürüyor; README'deki cümle
gözlenen davranışla birebir.

### 1.3 · `/load` doğru kaydı açsın (B3)

- `kayitSec`, ad verilmediğinde `SON.json.oturumlar[CLAUDE_CODE_SESSION_ID]`'e bakar,
  bulamazsa en yeniye düşer.
- Test iki oturumlu projede doğru kaydın açıldığını doğrular — dosyada iki anahtar
  olduğunu değil.

**Ölçüsü:** İki sohbetli senaryoda `/load` çağıran oturumun kaydını açıyor.

### 1.4 · Ortak katman (B4, B6, B11, B12)

Dördü aynı dosyaya dokunuyor, tek sözleşme.

- `hooks/ortak.js`: `konfigKok`, `genelKok`, `relayKoku`, `gitBilgisi`, `projeMi`,
  `read`, `yaz`, `norm`, `safe`.
- Üç röle-kökü uygulaması teke iner; `gitSor` farkı kapanır.
- Transkript yolu `konfigKok()` üzerinden geçer.
- `genelKok` worktree'den bağımsızlaşır.
- `kapsayici.kok` önbelleğe alınır.

**Ölçüsü:** `grep -c "CLAUDE_CONFIG_DIR" teknesyum/` tek dosyaya iner; `CLAUDE_CONFIG_DIR`
ayarlı bir kabukta `/save` çalışıyor.

### 1.5 · Kapılar ve ölü kod (B8, B9, B10, B15)

Mekanik, karar gerektirmiyor — `scribe` işi.

- `yonlendirici` `Edit`'i de kapsar.
- `CONTRACT_DIZIN` silinir.
- `debug` kapatılır, günlüğe tavan konur, `supur` röle kurulu projede de çalışır.
- `tasi()` çakışma eki artan sayaç olur.

### 1.6 · Belge tutarlılığı (B5, B13, B16)

- Sekiz ölçü/fark satırı yeni biçime çevrilir (`SKILL.md`, `SETTINGS.md`).
- `SKILL.md:633`'teki haiku örneği premium gerçeğiyle uyumlu hale gelir.
- Tarama dosyaları `docs/taramalar/` altına taşınır.
- Kapanmış rota `PostCompact` enjeksiyonundan çıkar.
- `relay-watch.js:184-187` yorumu ya gerçeğe iner ya karşılaştırma yazılır.

**Ölçüsü:** `grep -rn "▸ ölçü:\|▸ fark ·"` boş döner.

---

## Faz 2 — Üç platform şartına uyum

Kapsam listesi. Ayrıntı ayrı emirle.

- `scripts/platform-denetim.js` ne denetliyor, kuralları (`KURAL`, satır 47) bugünkü kod
  tabanını kapsıyor mu — denetimin kendisi denetlenecek.
- `yamaUret`'teki `/dev/null` (`oturum.js:334`) — Git for Windows'ta çalışıyor, saf Windows
  git'te doğrulanmadı.
- `install.ps1` ile `install.sh` arasındaki davranış farkı.
- Harf büyüklüğü çakışması ve yol ayracı taraması (`harfCakismasi`, `platform-denetim.js:114`)
  güncel dosya listesiyle.
- CI matrisi üç platformda koşuyor; `platform-denetim --kati` adımının gerçekte neyi
  yakaladığı ölçülecek.
- `rc.js` ve `statusline.js`'in Windows dışı davranışı.

## Faz 3 — teknesyum-ui standardına uyum

Kapsam listesi. Ayrıntı ayrı emirle.

- `skills/teknesyum-ui/SKILL.md` ile `scripts/uicheckup.js` kural kümesi arasındaki fark.
- `uicheckup.js` içindeki sabitler (`PALET:176`, `PUNTO:186`) skill'deki tokenlerle
  birebir mi.
- `uicheckup-apply.js` manifest doğrulamasının kapsamı.
- `assets/*.svg` (banner, logo, badge, flow) palet ve punto ölçeğine uyuyor mu.
- README'deki UI bölümünün bugünkü standardı yazıp yazmadığı.
- `teknesyum-ui/SKILL.md:475,485` etki satırlarının biçimi (Faz 1.6 ile aynı karar).
