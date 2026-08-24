# Hata: scout ajanları PR sayfası açınca oturuma yabancı PR rozeti yapışıyor

**Durum:** açık.
**Belirti:** 50 depo taramasından sonra oturum listesinde pembe PR rozeti çıktı; oturum kaydında depoyla ilgisi olmayan yedi PR duruyordu.
**Kaynak:** teknesyum/skills/relay scout akışı
**Görüldüğü proje:** Runly

---

## 1. Ne oldu

Runly'de `research_repos 50` ile sekiz scout ajanı açıldı. Ajanlar `WebFetch` ile
GitHub üzerinde depo incelerken **PR sayfalarını da açtı** — issue tartışmaları
PR bağlantısı taşıdığı için bu kaçınılmaz oldu.

Claude Code masaüstü uygulamasının kendi PR izleyicisi, oturum sırasında görünen
her GitHub PR bağlantısını "bu oturumun PR'ı" sayıp oturum kaydına yazıyor. Kayıt
burada:

```
%APPDATA%\Claude\claude-code-sessions\<a>\<b>\local_<id>.json  →  "prs": [...]
```

Runly oturumunda biriken liste:

| PR | Depo | Durum |
|---|---|---|
| 5103 | ramensoftware/windhawk-mods | MERGED |
| 46786 | microsoft/PowerToys | OPEN |
| 46056 | microsoft/PowerToys | OPEN |
| 49996 | microsoft/PowerToys | OPEN |
| 2886 | picoe/Eto | OPEN |
| 2 | denfry/pdfsmith | OPEN |
| 1 | Teknesyum/CodeXRay | OPEN |

Runly deposunda (`Teknesyum/Runly`) **hiç PR yok** — `gh pr list --state all` boş
dönüyor. Yani listenin tamamı yabancı. Son satır ayrıca **başka bir oturumdan**
sızmış: CodeXray oturumunun gerçek PR'ı Runly oturumuna da yazılmış.

Sonuç kullanıcı tarafında: oturum listesinde pembe dal simgesi. Kullanıcı hiç PR
açmadığı için bunu üç ayrı turda sordu, işin akışı üç kez bölündü.

Aynı kirlenme iki oturumda daha bulundu:

- Teknesyum-Base → `style-dictionary/style-dictionary#1714`
- VideoEdit → `remotion-dev/remotion#3750`

İkisi de tarama sırasında gezilmiş yabancı depolar. Yani bu Runly'ye özgü değil,
**scout akışının olduğu her projede tekrarlanıyor**.

### Yanlış teşhisler — tekrarlanmasın

İlk bakışta rozetin metni oturum adı sanıldı (`custom-title` kaydı, transkriptte
138 kez tekrar ediyor). Yanlış: `custom-title` her oturumda var, rozetsiz
oturumlarda da var. Ayırt eden alan yalnızca `prs`.

advisor (fable) worktree/dal göstergesi dedi — oturumda `isolation: worktree` ile
iki ajan açılıp silinmişti, bağlantı makul görünüyordu. Yanlış: Vidshrink
oturumunda ne worktree ne PR var ve rozet yok; CodeXray'de worktree yok ama PR var
ve rozet var. Belirleyici tek değişken `prs`.

Doğru ayırt etme yolu tahmin değil karşılaştırma oldu: rozeti olan ve olmayan iki
oturumun kayıt dosyasını yan yana koyup fark alan alanı bulmak.

### Geçici çözüm

`~/.claude/pr-rozet-temizle.py` yazıldı. `claude.exe` süreçlerinin tümü bitene
kadar bekliyor, sonra her oturum kaydını tarayıp o oturumun kendi `origin`
adresiyle eşleşmeyen PR kayıtlarını siliyor; silmeden önce `.yedek` bırakıyor.
Gerçek PR'lara dokunmuyor — CodeXray'in kendi PR#1 kaydı korundu.

Bu bir yama, kaynağı kapatmıyor. Bir sonraki taramada liste yeniden dolar.

### İkinci mekanizma — oturumlar arası sızma

Yedinci kayıt (`Teknesyum/CodeXRay#1`) tarama kirliliği değil, ayrı bir hata.

CodeXRay PR#1 bugün 19:39'da **CodeXray oturumu** tarafından açıldı
(`agent/titan-relay`, +2500/−211). Runly'nin kendi transkriptinde bu PR adresi
hiçbir yerde geçmiyor — bugünkü teşhis çıktılarım hariç, onlar da kayıt zaten
oluştuktan sonra basıldı. Yani adres Runly konuşmasından okunmadı.

İki oturum aynı uygulama örneğinde koşuyor ve `lastFocusedAt` değerleri saniyesi
saniyesine aynı (21:30:00 / 21:30:01). Uygulamanın PR algılayıcısı PR'ı açan
oturuma değil, o anda açık olan oturumlara yazmış. Kayıt listenin **sonunda**,
yani en son eklenen.

Sonuç: tarama hiç yapılmasa bile, aynı anda açık iki proje varsa birinin PR'ı
ötekinin oturumuna yapışabiliyor. Ölçü bölümündeki üç öneri bu mekanizmayı
kapatmıyor — 3. madde (relay'in `origin` eşleşmeyen kayıtları düşürmesi) tek
başına ikisini birden kapatan seçenek.

### Asıl kaynak — oturum kaydı değil, transkript

Yamayı denedim, tutmadı. Ölçüm:

- 21:36:56 — uygulama kapalıyken temizleyici çalıştı ve **hiçbir dosyada `prs`
  bulamadı**. Uygulama kapanırken alanı zaten siliyor.
- 21:38:50 — uygulama yeniden açıldı, aynı dosyaya yedi kayıt geri yazıldı.
- Aradaki tek fark uygulamanın açılması. Yani `prs` kalıcı değil, **her açılışta
  yeniden üretiliyor**.

Nereden ürettiğini aradım. `windhawk-mods` dizgesini taşıyan tek kalıcı yerler:

```
.claude/projects/<proje>/<oturum>.jsonl                    ← ana transkript
.claude/projects/<proje>/<oturum>/subagents/agent-*.jsonl  ← scout transkriptleri
```

Başka bir önbellek, veritabanı ya da kayıt yok. Uygulama her açılışta transkripti
tarayıp içinde geçen GitHub PR adreslerini yeniden topluyor.

Scout transkriptlerinde **21 ayrı PR adresi** birikmiş: PowerToys (6 tane),
arcagate (3), uv, PowerShell, nvm-windows, reactos, Eto, pdfsmith, viewr, InLook,
EdSharp, nexaflow, windhawk-mods. Rozete düşenler bunların bir alt kümesi.

İkinci kanıt: çubuktaki fark sayısı `+2.500` iken `+2.907` oldu. Uygulama PR'ı
GitHub'dan yeniden sorguluyor, yani listeyi taze kuruyor.

**Teşhis eden kendi izini bırakıyor.** Bu hatayı araştırırken PR adreslerini
çıktıya bastım; `CodeXRay` adresi transkripte benim yüzümden altı kez girdi ve
rozet büyüdü. Bu tür bir hatayı incelerken adresi tam biçimde yazma — `#1` gibi
kısalt.

### Kalıcı geçici çözüm

`~/.claude/pr-rozet-temizle.py` yeniden yazıldı. Uygulama kapanınca ana ve scout
transkriptlerinde `github.com/<sahip>/<depo>/pull/<n>` kalıbını
`.../pull-<n>` yapıyor — aynı bayt uzunluğu, JSON bozulmuyor, dosyalar
`~/.claude/pr-rozet-yedek/` altına yedekleniyor. Kuru koşuda 8 + 26 eşleşme
değiştirildi, bozuk satır sıfır.

## 2. Ölçü

Base'de kalıcı çözüm şu üçünden biri olmalı:

1. Scout brifingine "PR sayfası açma" kuralı girer — inceleme `/pull/<n>` adresi
   yerine issue, kod ve README üzerinden yürür; PR içeriği gerekiyorsa
   `gh api` ile çekilir, tarayıcı adresi açılmaz.
2. Ya da scout ajanları worktree yerine ayrı oturumda koşar, PR kirliliği ana
   oturuma bulaşmaz.
3. Ya da tarama biter bitmez relay temizliği kendisi yapar. **Oturum kaydına
   dokunmak işe yaramaz** — kayıt her açılışta transkriptten yeniden üretiliyor.
   Temizlik transkript üzerinde olmalı: scout çıktısındaki PR adresleri
   yazılırken `/pull/<n>` yerine `#<n>` biçimine indirgenmeli. En ucuz yer
   scout'un rapor yazma adımı; adres oraya hiç tam biçimde girmezse rozet hiç
   oluşmaz.

**Kapandığını gösteren tek şey:** `research_repos` taraması yapılmış yeni bir
projede tarama bittikten sonra o oturumun kayıt dosyasında `prs` alanının
**ya hiç olmaması ya da yalnız projenin kendi deposuna ait PR taşıması**.

Kontrol komutu:

```powershell
Get-ChildItem "$env:APPDATA\Claude\claude-code-sessions" -Recurse -Filter "local_*.json" |
  ForEach-Object {
    $d = Get-Content $_.FullName -Raw | ConvertFrom-Json
    if ($d.prs) { "{0} -> {1}" -f (Split-Path $d.cwd -Leaf), ($d.prs.repo -join ", ") }
  }
```

Her satırda soldaki proje adı ile sağdaki depo adı örtüşüyorsa hata kapanmıştır.

---

## 3. Temizlik turu — 2026-08-24

**Kapsam ilk sanılandan geniş çıktı.** Yalnız Runly, Teknesyum-Base ve VideoEdit
değil, **sekiz proje** kirlenmiş. Transkriptlerdeki tam PR adresi sayısı:

| Proje | Yabancı adres |
|---|---|
| ProcWitness | 42 |
| Ghostlist | 30 |
| Projeler (üst klasör oturumları) | 60 |
| CodeXray | 19 |
| VideoEdit | 9 |
| vidshrink | 6 |
| Runly | 6 |
| Teknesyum-Base | 1 |

Toplam 173. Neredeyse tamamı `agent-*.jsonl` yani **scout alt ajan transkriptlerinde** —
teşhis doğrulandı, kaynak tarama akışı.

### Oturum kaydı temizliği (yapıldı, kalıcı değil)

Dört kayıt dosyasında dört yabancı PR bulundu ve silindi; yedekleri alındı.
CodeXray'in kendi `Teknesyum/CodeXRay#1` kaydı korundu. Ama bu **beklendiği gibi
geçici** — kayıt uygulama her açıldığında transkriptten yeniden üretiliyor.

### Temizleyici bütün projelere genelleştirildi

`~/.claude/pr-rozet-temizle.py` yeniden yazıldı. Öncekinden farkları:

- Tek proje klasörüne sabitlenmiş değil, `~/.claude/projects/*` altındaki **her**
  projeyi geziyor.
- Projenin kendi `origin` adresini transkriptteki `cwd` alanından çözüyor ve
  **kendi PR'larına dokunmuyor**. Eski sürüm hepsini etkisizleştiriyordu, bu
  CodeXray'in gerçek rozetini de silerdi.
- `--kuru` kuru koşu, `--simdi` beklemeden çalıştırma anahtarları eklendi.
- Varsayılan davranış aynı: `claude.exe` kapanana kadar bekler, sonra hem
  transkripti hem oturum kaydını temizler, yedek bırakır.

Kuru koşu 19 dosyada 173 değişiklik saydı, bozuk satır sıfır. Süreç arka planda
kurulu; uygulama kapandığında kendiliğinden çalışacak.

### Teşhis edenin kendi izi — yine oldu

Bu turda oturum kayıtlarını JSON olarak okurken **tam PR adresleri yeniden
transkripte girdi** (Runly'deki 6 adresin kaynağı bu). Kayıt defterinin başındaki
uyarıyı geç okudum. Kural netleşsin: bu hatayı incelerken JSON'u ham basma,
yalnız `depo#numara` alanlarını yazdır.

### Durum

**Hâlâ açık.** Temizlik yapıldı ama kaynak kapanmadı — bir sonraki
`research_repos` taraması listeyi yeniden doldurur. Kapanması için 2. bölümdeki
1. veya 3. madde base'e girmeli: scout brifingine "PR sayfası açma" kuralı, ya da
scout'un rapor yazma adımında adresin `#<n>` biçimine indirgenmesi.

### Düzeltme — yeniden üretim açılışa bağlı değil

Kayıt defterinde "her açılışta yeniden üretiliyor" yazıyordu. Bu turda ölçüldü:
kayıt dosyasındaki yabancı PR'lar silindikten **birkaç dakika sonra, uygulama hiç
kapanmadan** geri geldi. Yani izleyici sürekli çalışıyor ve transkripti canlı
tarıyor.

Sonuç değişmiyor ama ölçü keskinleşiyor: oturum kaydına dokunmanın ömrü dakikalar,
açılışa kadar bile değil. Tek işe yarayan müdahale transkript üzerinde ve uygulama
kapalıyken.

---

## 4. Çözüm turu — 2026-08-24, ikinci oturum

Kullanıcı rozetleri hâlâ görüyordu. Bu turda üç katman ayrıldı ve hangisinin ne
zaman temizlendiği ölçüldü.

### Üç katman

| Katman | Ne tutuyor | Temizlenince |
|---|---|---|
| Transkript (`*.jsonl`) | Adresin kendisi. Tek kalıcı kaynak. | Kalıcı temizlenir |
| Oturum kaydı (`local_*.json`) | İzleyicinin türettiği liste | Dakikalar içinde geri gelir |
| Uygulama belleği | Açık oturumun rozet durumu | Yalnız uygulama kapanınca gider |

Önceki turlarda hep 2. katman temizlendi, o yüzden hata dört tur sürdü.

### Canlı yerinde bayt yazma — çalışıyor

Uygulama **açıkken** transkripti düzeltmenin yolu bulundu: dosya `r+b` kipinde
açılıyor, `pull` kelimesinin ikinci baytı `-` ile üzerine yazılıyor (`p-ll`).
Dosya uzunluğu değişmiyor, sona ekleme yapan uygulama etkilenmiyor, JSON kaçış
dizileri bozulmuyor.

Neden ayraç değil de kelime: kaçışlı serileştirmede adres `...\/pull\/<n>`
biçiminde geçiyor. Ayracı bozarsan `\-` çıkar, bu geçersiz bir JSON kaçışıdır ve
satırı çürütür. Kelimenin ortasını bozmak her iki biçimde de güvenli.

Ölçüm: **8 projede 179 adres** etkisizleştirildi. Ardından bütün transkriptler
satır satır doğrulandı — **579 dosya, 103.452 satır, 0 bozuk**. Yedekler
`~/.claude/pr-rozet-yedek/` altında.

### Sandbox tuzağı — kaybedilen tur

`kayit_ov` "0 kayıt" dedi ama kayıtta iki PR duruyordu. Sebep koddaki hata değil:
Bash aracının kum havuzu python'ın `%APPDATA%\Claude` altına **yol üzerinden**
erişmesini engelliyor, `os.path.isdir` `False` dönüyor. Aynı python, bash o klasöre
`cd` ettikten sonra göreli yolla okuyabiliyor.

Belirti sinsi: hata yok, izin reddi yok, sadece klasör yokmuş gibi davranıyor.
Betiğe `--kok <yol>` anahtarı eklendi; oturum kaydına dokunan her çağrı o klasöre
`cd` ederek `--kok .` ile çalıştırılmalı.

### Kaynak kapatıldı — scout kuralı

`teknesyum/agents/scout.md` içine kural girdi (Teknesyum-Base `7da02bf`):

> PR bağlantısı rapora ve mesaja tam adres olarak yazılmaz, `<sahip>/<depo>#<n>`
> kısa biçimi kullanılır. PR içeriği gerekiyorsa `gh api .../pulls/<n>` ile
> çekilir, `WebFetch` ile PR sayfası açılmaz.

Kurulu eklenti sürümü (2.42.1) kaynaktan geride olduğu için önbellekteki kopyaya
da elle uygulandı; bir sonraki eklenti güncellemesinde kaynaktan gelecek.

### Kalan tek adım

Rozetler hâlâ görünüyorsa sebebi 3. katman: açık uygulamanın belleği. Transkript
temiz olduğu için **uygulama bir kez kapatılıp açıldığında liste yeniden
üretilemez ve rozet döner gelmez**. Rozetin sağındaki `×` de aynı işi geçici olarak
yapar.

Betik `--bekle` kipinde arka planda kurulu; `claude.exe` kapandığında bu oturum
sırasında transkripte eklenen adresleri de süpürecek.

### Durum

Kaynak kapandı, temizlik otomatikleşti. **Kapanma ölçüsü değişmedi:** yeni bir
`research_repos` taraması yapıldıktan sonra o oturumun kaydında `prs` alanı ya hiç
olmayacak ya da yalnız projenin kendi deposunu taşıyacak. O ölçüm alınana kadar
günlük açık kalır.

---

## 4. Durum — 24.08.2026: kural yerinde, kanıt bekliyor

**Ölçü 1 uygulandı ve teste bağlandı.** `agents/scout.md` içindeki kural üç şeyi birden
söylüyor: tam adres yazma, kısa biçimi (`<sahip>/<depo>#<n>`) kullan, içerik gerekiyorsa
`gh api repos/<sahip>/<depo>/pulls/<n>` ile çek — `WebFetch` ile PR sayfası açma. Test
`scout tam PR adresi yazmayi yasaklar ve kisa bicimi verir` dördünü de tutuyor; kural
silinirse takım kalır. Ölçü 2 (scout'u ayrı oturuma taşımak) gereksiz kaldı, ölçü 3'ün
transkript temizliği bu kuralın yokluğunda anlamlıydı.

**Kirlilik taraması.** Kayıtlarda tek yabancı satır Runly'de kaldı; CodeXray'deki
kayıt kendi deposunun PR'ı, yani doğru. Runly'ninkinin kaynağı bir tarama değil, **bu
günlüğün kendisi**: metin bu turda okundu ve adresler ana oturumun transkriptine yeniden
girdi. Günlüğün "teşhis eden kendi izini bırakıyor" uyarısı bir kez daha doğrulandı.

**Yapılan bir hata ve geri alınışı.** Transkript temizleyicisi önce deponun kendi PR'ını
ayırt etmeden koşturuldu ve CodeXray'de **65 meşru adres** düşürüldü — hepsi
`Teknesyum/CodeXRay`'in kendi PR'larıydı. Yedekten birebir geri alındı ve doğrulandı.
Ders: temizleyici "yabancı mı" sorusunu sormadan koşturulmaz; deponun kendi `origin`
adresiyle eşleşen kayıt rozetin doğru çalışan hâlidir, kirlilik değil.

**Neden kapatılmıyor.** Günlüğün kapanış ölçütü kendi metninde yazılı ve üretilemez:
*"`research_repos` taraması yapılmış **yeni** bir projede tarama bittikten sonra o
oturumun kayıt dosyasında `prs` alanının ya hiç olmaması ya da yalnız projenin kendi
deposuna ait PR taşıması."* Böyle bir tarama bu turda yapılmadı; yapılmış gibi yazmak
ölçüyü kanıt olmadan kapatmak olurdu.

Kalan tek iş kod değil **gözlem**: bir sonraki gerçek `scout` taramasından sonra günlüğün
kontrol komutu koşulur. Temiz çıkarsa kapanır.
