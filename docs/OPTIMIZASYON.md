# Optimizasyon planı

Kaynak: üç ölçüm raporu (`OLCUM-MALIYET.md`, `OLCUM-KOD.md`, `OLCUM-METIN.md`), otuz depo
taraması (`taramalar/OZET-*.md`), beş koşulu bench (`BENCH-SONUC.md`).

Plan konseyi iki üyeyle çalıştı: `fable` ve `opus`, aynı brifing, birbirinden habersiz.
Ortaklaştıkları doğrulanmış sayıldı; ayrıştıkları yer aşağıda gerekçesiyle karara bağlandı.

Hedef, kullanıcının kendi cümlesiyle: **eco profili, base'siz koşunun altına insin.**

---

## Konseyin ortaklaştığı yedi nokta

Bunlar tartışmaya açılmadı — iki bağımsız plan aynı şeyi söyledi.

**1. Farkın %90'ı ölçülmemiş, plan ölçümle başlamalı.**

```
eco koşusu            157.709 token
yalın koşu           ~113.000 token
fark                  ~45.000
eco'da ölçülen base sabiti  ~3.000
açıklanamayan         ~42.000
```

En güçlü hipotez `relay/SKILL.md`'nin tekrar tekrar yüklenmesi (10.112 × 4 ≈ 40.448) ama
**hipotez**. Ölçülmeden optimizasyon yapmak, yanlış yeri kesmek demek.

**2. Metin kısaltarak hedefe varılamaz.** Yalın koşu daha çok iş yaptı — 1268 test, web'den
referans doğrulama — ve yine az harcadı. Farkın bir kısmı metin değil **davranış**.

**3. `ecoNotu` anomalisi kapatılacak.** Tasarruf talimatı 779 bayt, tasarrufsuz profilinki
645. Bu tek başına küçük bir kazanç ama düzeltilmemesi saçma.

**4. Skill gövdesini bölmek ölçüme bağlı.** Seksen çağrının kaçında taşınacak bölümlerin
gerçekten okunduğu bilinmeden bölmek, tek çağrıyı iki okumaya çevirip **yükü artırabilir**.

**5. Çalışma zamanı sıkıştırma reddedildi.** Metin seksen çağrının hepsinde aynı; sabit
metni her seferinde ücretle sıkmak, bir kez elle kısaltmanın işini tekrar etmek.

**6. Denetim korunacak.** İki bağımsız bench koşusunda perft'in göremediği gerçek hata
buldu. Kısıt olduğu için değil, **ölçüm gösterdiği için** duruyor.

**7. Hedef garantili değil ve söz verilmiyor.** Yalın koşu base'siz taban; base sıfır ek
metinle koşsa bile eco ancak davranış tasarrufuyla altına iner. İki plan da bunu yazdı,
ikisi de söz vermeyi reddetti. Bu rapor da vermiyor.

---

## Konsey ayrışması

### A · Süreç maliyeti bu plana girer mi

Kancalar oturum başına 57,6 saniye yiyor ve bunun **33,4 saniyesi** (%58) boş süreç tabanı
— node'u 2.879 kez başlatmanın bedeli, hesabın değil.

**fable:** plandan çıkardı. *"Süre yakıyor, token yakmıyor; kullanıcının hedefi token."*

**opus:** Aşama 5 olarak ekledi — `PostToolUse` eşleyicisini durum değiştiren araçlara
indir, `sozdizim`'i ayrı `node --check` süreci yerine süreç içi `vm.Script` ile çalıştır.
Hedef 57,6 sn → ≤25 sn.

**Karar: opus. Ama en son aşama olarak.** Kullanıcının cümlesi *"hem token tüketimini
azaltalım hem verimliliği artıralım"* — verimlilik süreyi de kapsıyor. Fable'ın önceliklendirmesi
doğru, kapsam dışı bırakması değil. Sona konuyor çünkü token hedefine katkısı sıfır.

### B · Skill çağrısını engellemek

**opus:** `PreToolUse`'ta `Skill` eşleyicisi, aynı oturumda ikinci `teknesyum:relay`
çağrısını `decision: block` ile geri çevir — "gövde zaten bağlamda, §N'yi oradan oku".

**fable:** önermedi.

**Karar: ölçümden sonra.** Opus'un kendi riski doğru: model şaşırabilir, engel sonrası
işi bırakabilir. Ve daha önemlisi — `Ö1` ölçümü "ikinci çağrı zaten cache'ten okunuyor,
deltası %10" derse bu adım **hiçbir şey kazandırmaz**. Ölçüm kapısının arkasına konuyor.
Uygulanırsa `block` değil önce `additionalContext` ile uyarı — bu depoda `block` yanlış
pozitifte bir tur yakıyor.

### C · Cache eylem mi ölçüm mü

**fable:** ölçüme indirdi. *"`cache_control` harness'ın elinde, bizim eylem alanımız değil;
muhtemelen zaten çalışıyor."*

**opus:** eylem aşaması yapmadı, `cache_creation`/`cache_read` ayrımını ölçüme koydu.

**Karar: ikisi de aynı yere varmış.** Fable opus'un ayrışacağını tahmin etmiş, ayrışmamış.
Cache ölçümü `Ö1`'in içinde — ve tam da doğru soruyu soruyor: *ikinci çağrı gövdeyi yeniden
mi yazıyor, yoksa cache'ten mi okuyor.* Bu tek sayı planın yarısını belirliyor.

### D · Profilin oturuma bağlanması

**opus:** `S4` — profil önce oturum kaydından, yoksa makine kaydından okunsun.

**fable:** hiç bahsetmedi.

**Karar: opus, ve öncelikli.** Bu yalnız bir tercih değil, bench'te **gerçek zarar verdi**:
paralel koşan üç profil birbirinin ayarını bozdu, premium koşusu ortasında eco'ya döndü.
İkinci bir kazancı da var — oturum ortasında efor değişmesi prompt cache'i kırıyor.

Fable'ın görmemesi kusur değil; opus bench raporunu farklı okumuş.

---

## Aşamalar

Aşama 0 koştu ve planın gerekçesini çürüttü. Aşağıdaki aşamalar **ölçüm sonrası** halidir;
ölçüm öncesi sıralama git geçmişinde duruyor.

### Aşama 0 — ölçüm · TAMAMLANDI

Hiçbir dosya değişmedi. Üç ajan paralel koştu (`Ö1` ve `Ö2` aynı veriye baktığı için birleşti).

| | Soru | Cevap | Rapor |
|---|---|---|---|
| `Ö1` | İkinci relay çağrısı gövdeyi yeniden mi yazıyor | **Yeniden yazıyor.** Delta birincinin %103'ü, `cache_creation` on iki çağrının hepsinde 0 | `OLCUM-CAGRI.md` |
| `Ö2` | Bölümlerin kaçı gerçekten iş yaptı | **Azı.** En yaygın bölüm relaylı oturumların yarısında; §1.6 hiç okunmadı, §3.2 toplam 1 kez | `OLCUM-CAGRI.md` |
| `Ö3` | 8.000 karakterlik bütçe aşılıyor mu | **Hayır.** Bütçe sabit değil, `pencere × 4 × 0,01`; 1M'de 40.000, liste 13.938 | `OLCUM-BUTCE.md` |
| `Ö4` | 157.709'un kalem dökümü | **Kalemlenen %10,9.** Base'in tüm ayak izi 4.826 token | `OLCUM-TABAN.md` |

#### Kapı: GEÇİLMEDİ

> `Ö4` farkın en az %80'ini kalemlemezse Aşama 2 ve 3 başlamaz — hipotez yanlış demektir
> ve plan baskın kaleme yeniden hedeflenir.

Kalemlenen %10,9, eşik %80'di. **Üç hipotezin üçü de çürüdü:**

1. **Relay gövdesi bench farkını açıklamıyor.** eco ve normal koşularında `teknesyum:relay`
   sıfır kez çağrıldı. `OLCUM-MALIYET.md`'nin "10.112 × 4 = 40.448, farka çok yakın"
   akıl yürütmesi tesadüftü.
2. **Description bütçesi aşılmıyor.** `OLCUM-METIN.md`'nin "Base bütçenin %65'ini
   dolduruyor" cümlesi iki sayım hatasından geliyordu; gerçek pay %5,5.
3. **Base'in enjeksiyonu pahalı değil.** eco koşusunun toplam maliyetinin %2,5'i.

#### Baskın kalem nerede çıktı

Farkın %89'u **konuşma hacmi**: 72 tur, 67.814 token çıktı, ve o çıktının her turda
bağlama geri yazılması. eco'nun parasının %71'i kendi ürettiği metni yazıp geri okumaya
gitti. Araç sonuçlarının tamamı 4.814 token — **iş girdisi değil, tur sayısı pahalı.**

#### Ölçümün bulduğu iki hata

**eco koşusu eco'yu hiç ölçmedi.** `UserPromptSubmit` istem başına bir kez çalışıyor ve
bench isteminde `/premium eco` uygulanmadan **önce** çalıştı. Bağlamdaki profil metni 72 tur
boyunca premium kaldı: *"yirmi paralel ajana kadar çıkabilirsin, paralel açmak bu modda
varsayılandır."* Ajan açmaması modelin kendi kararıydı, profilin değil.

**Profil değiştirmek bağlamdan tek bayt silmiyor.** Tur 1 tabanı eco 60.498, normal 60.490 —
8 token fark. eco yalnız model ve ajan ayarlarını değiştiriyor.

---

### Aşama 1 — tur ve çıktı hacmi · yeni baskın kalem

Ölçümün gösterdiği tek büyük kalem. Kazanç ölçüme bağlı değil.

- **eco'da cevap uzunluğu ve tur sayısı bağlayıcı hale gelir.** Bugün eco felsefesi
  "token tasarrufu önceliği en yüksek" diyor ama bunu davranışa çeviren tek satır yok.
- **Uzun koşuları tur harcamadan bekle.** Base'siz koşu 13 satırlık bir döngüyle bitirdi;
  eco 72 tur harcadı. Arka plan koşusu + tek okuma, tur başına bağlam yazmaktan ucuz.
- **`edited_text_file` yankısı eco'da kapanır** — tek başına 6.882 token, Base'in bütün
  ayak izinden büyük.

**Kabul:** aynı görevde tur sayısı ≥%40 düşer · 271 test geçer · doğruluk düşmez.

### Aşama 2 — eco'yu gerçekten eco yapmak · konsey sentezi

`Ö4`'ün bulduğu iki hatanın kapatılması. Bunlar optimizasyon değil **düzeltme**.

Plan konseyi (fable + opus) bu aşama için açıldı. Sorulan tek soru: profil makine geneli
yazdığı için iki oturum birbirini eziyor, hangi yol.

#### Konseyin ortaklaştığı

**Profil kaydı oturuma iner.** Üç yazma noktasının hiçbiri oturum kimliği taşımıyor;
ikinci pencere birincinin ayarını eziyor. Kayıt oturum başına **ayrı dosyada** tutulur —
tek haritalı dosya oku-değiştir-yaz yarışı taşır, ayrı dosya yarışı tümden kaldırır.

**Ajan dosyaları taban olur.** `ajanlariYaz()` kalkar, `model` çağrı anında geçilir.
Yan kazanç: "eklenti güncellemesi profili geri aldı" uyuşmazlık sınıfı kendiliğinden
kapanır.

**Düğmeler enjeksiyona geçer.** `SETTINGS.md` makine varsayılanı olarak donar; profile
göre değişen düğmeler `UserPromptSubmit` metnine katılır. Yalnız **tabandan sapan**
düğmeler yazılır — tam liste enjeksiyonu büyütür ve `Ö4`'ün baskın kalemi zaten konuşma
hacmiydi.

**Efor tabanı `normal` profilin eforudur.** Tek taban kalınca eco `xhigh` öderse eco
anlamını yitirir, premium `medium`'da kalırsa premium anlamını yitirir. Premium farkını
`model` ve düğmeler taşır — efor ikinci dereceden kaldıraç, model birinci dereceden.
İki üye de aynı yeri seçti.

#### Konsey ayrışması

**Kısmi izolasyon dürüst mü.** fable "iki cümleye ayrılırsa dürüst" dedi: sohbetler
birbirini etkilemiyor **doğru**, her profil tam uygulanıyor **yanlış** — ikincisi
söylenmeden satılırsa yarım tam gösterilmiş olur. opus daha sert çıktı: `parallel_width`,
`audit`, `worktree_isolation` da makine geneli kalıyorsa izolasyon yok, ve bench
çakışmasını yaratan zaten bunlardı, model değil.

**Sentez opus'un itirazını alır**: düğmeler de taşınır, geriye yalnız `effort` kalır.
fable'ın dürüstlük satırı da alınır — `durum()` çıktısında kalıcı olarak durur.

**Kalıntıya ret mi uyarı mı.** opus uyarıyı seçti: efor için bütün profil geçişini
reddetmek, kazanılan izolasyonu kullanılamaz kılar. Ret izolasyon **yokken** doğru cevap,
varken fazla ceza. Alındı.

#### Konseyin doğrulayamadığı, T0'ın ölçtüğü

İki üye de oturum kimliğinin betiğe ulaşıp ulaşmadığını doğrulayamadı ve ikisi de kancaya
dayanan bir dolambaç önerdi. **Gerek yok:** `CLAUDE_CODE_SESSION_ID` bash ortamında dolu
ve ana oturumun transkript dosya adıyla birebir aynı. İkisi de `CLAUDE_SESSION_ID`
aramıştı — ad yanlıştı.

opus "çağrı anındaki `model` frontmatter'ı ezerse Aşama 2 sessizce çöker" diye risk yazdı.
**Ezmiyor, eziliyor:** tek bir `teknesyum:planner` tanımıyla aynı anda `claude-fable-5` ve
`claude-opus-5` açıldı; kayıtlar `.claude/relay/live/` altında duruyor. Risk kapandı.

`effort` kısıtı ise gerçek ve iki bağımsız yoldan doğrulandı: opus ikilide `subagent_type`
ile efor enum'u arasındaki mesafeyi ölçtü (2000 karakter içinde sıfır komşuluk), T0
`Agent` şemasında `effort` alanının olmadığını gördü. Ajan kayıtlarında frontmatter
değerleri birebir görünüyor — advisor `low`, builder `xhigh`, scribe `low`.

#### Sözleşmeler

| | İş | `owns` |
|---|---|---|
| `T1` | Profil kaydı oturuma iner | `ortak.js`, `dil.js`, `premium.js`, `commands/premium.md` |
| `T2` | Düğmeler enjeksiyona, ajan dosyaları tabana | `relay-watch.js`, `SETTINGS.md`, `agents/*.md` |
| `T3` | `S5` ajan bütçe defteri | `relay-watch.js` |

`T2` ve `T3` `T1`'in açtığı `profil(sid)` API'sini bekler. İkisi aynı dosyaya dokunduğu
için sıralı yürür.

#### Ayrıca — tur makbuzu adı ayrışır

`Ö4` bir raporlama karışıklığı buldu: `normal` koşusunun `Stop` satırı ~313.500 token
diyor, harness bütçe sayacı 171.114. Base'in tahmini alt ajanları sayıyor, sayaç saymıyor.
**İki rakam aynı isimle raporlanıyor.**

#### Ölçülmemiş yan kazanç

Efor artık hiç değişmediği için prompt önbelleği de bozulmuyor. Bu, taramalardan gelen bir
bulgunun (`docs/taramalar/OZET-baglam.md`) doğal sonucu ama ölçülmedi.

**Kabul:** iki pencere, biri eco biri premium; her `/teknesyum:premium durum` kendi
profilini der · `/teknesyum:premium premium` sonrası `git status` temiz · eco'nun tur 1
tabanı normal'inkinden ölçülebilir biçimde küçük.


### Aşama 3 — alt ajan başına relay yüklemesi

`Ö1`'in bulduğu asıl çarpan. Bench farkını açıklamıyor ama **gerçek oturumlarda** en pahalı
tek mekanizma bu.

83 relay çağrısının **59'u alt ajan transkriptinde**. Tek bir oturumda 56 çağrı — 8'i ana
oturum, 48'i alt ajanlar. O oturum yalnız relay gövdesine ~76.000 token ödedi. Çarpan
tekrar eden ana çağrı değil, **her alt ajanın relay'i kendi bağlamında baştan yüklemesi.**

Alt ajanın relay'in tamamına ihtiyacı yok: sözleşmesini, `owns` kümesini ve mühür kurallarını
okuması yeter. Ajan brifingine gömülecek olan bu; protokolün tamamı değil.

**Kabul:** builder/auditor açılan bir oturumda alt ajan başına relay yüklemesi sıfıra iner ·
mühür ve denetim bağımsızlığı testleri geçer.

### Aşama 4 — gövdeyi böl · `Ö2` onay verdi

`Ö2` "çoğu çağrıda kullanılmıyor" tarafında çıktı: en yaygın bölüm (§3.1 görev paketi)
relaylı oturumların 8/15'inde, §1.6 ürün standardı 87 oturum grubunun **tamamında sıfır**,
§3.2 rota bütün transkriptlerde toplam 1 kez.

İz bırakmayan bölümler `references/` altına taşınır, yerinde tek satır işaretçi kalır.
Hedef 53.147 B → ≤33.000 B, ≤500 satır.

**Çift kabul kriteri:** çağrı başına delta ≤3.500 token **ve** on gerçek oturumda
`references/` Read toplamı kazanılan tokenden küçük. İkincisi tutmuyorsa taşıma geri alınır.

`Ö2` bir uyarı da yazdı: bu bir vekil ölçüm, bölümün okunduğunu değil sonucunun görüldüğünü
sayıyor. Bölüm okunup "gerekmiyor" denerek atlandıysa bu tabloda kullanılmamış görünür.

### Aşama 5 — description kısaltma · İPTAL, yerine pencere koruması

`Ö3` bütçenin aşılmadığını ölçtü. Kısaltma matematik olarak da çözüm değil: Base'in bütün
payı 1.842 karakter, 200k senaryosundaki açık 3.635. **Base'i sıfıra indirsen bile liste
aşar.**

Yerine geçen iş — gerçek bir kırılganlık:

Bağlam penceresi 200k'ya düştüğü an Base'in **18 girdisinin tamamı** aynı anda `name-only`'a
düşüyor ve model onları çağıramıyor. Ara durum yok, uyarı yok. Sebep Base değil: gömülü
girdiler dokunulmaz sayılıp tabana yazılıyor, kalan bütçe negatife düşüyor.

- `/scan` bu eşiği denetler ve aşımda tek satır uyarır.
- Kaçış kapısı belgelenir: `SLASH_COMMAND_TOOL_CHAR_BUDGET=16000` ya da
  `skillListingBudgetFraction: 0.02`.

**Kabul:** 200k pencereli bir oturumda `/scan` uyarıyı basar.

### Aşama 6 — süreç maliyeti (token değil, saniye)

Ölçümden etkilenmedi, olduğu gibi duruyor.

- `PostToolUse` eşleyicisi durum değiştiren araçlara iner (Write/Edit/NotebookEdit/Task).
- `sozdizim` ayrı `node --check` süreci yerine süreç içi `vm.Script` ile denetler; ESM
  dosyada eski yol kalır.
- `test/run.js` `calistir()` işçi havuzuyla paralelleşir, her işçi kendi konfig kumhavuzunda.

**Kabul:** kanca toplamı 57,6 → ≤25 sn · test 25,9 → ≤9 sn · 271/271 geçer · iki ardışık
koşuda aynı sonuç.

**Geri alma şartı:** ajan takılma uyarısı beş dakikadan geç gelirse eşleyiciye `Bash` geri
eklenir.

### Aşama 7 — bench yeniden koşulur

Mevcut bench sonucu iki sebeple kullanılamaz:

1. **eco koşusu eco'yu ölçmedi** (yukarıda). Aynı hata her profil için geçerli olabilir —
   `/premium <profil>` ilk kullanıcı isteminden **önce** uygulanmalı.
2. **Token sütunu dayanaksız.** `Ö1` ve `Ö4`, `BENCH-SONUC.md`'deki ~157.709 ve 226.856
   rakamlarının transkriptin hiçbir `usage` toplamına denk gelmediğini ölçtü. `yalin`
   koşusunun 113.257'si hiç doğrulanamadı — transkripti başka makinede.

**Şart:** koşular sıralı · profil ilk istemden önce · her koşu kendi klasöründe açılır
(bu turda transkriptler üst klasöre düştü, eşleme elle yapıldı) · görev 45 dakikada tek
modelin bitiremeyeceği boyutta.


## Ne yapılmayacak

İki konsey üyesinin de eledikleri, gerekçeleriyle.

| Fikir | Neden hayır |
|---|---|
| Çalışma zamanı sıkıştırma (LLMLingua, Selective Context) | Sabit metni 80 kez ücretle sıkmak; bağımsız ölçüm akıl yürütmede bozulma gösteriyor; Selective Context'in lisansı yok |
| Denetimi kısmak | İki bağımsız koşuda perft'in göremediği gerçek hata buldu |
| Ajan dosyalarındaki "yalın yaz" bloklarını tek kaynağa indirmek | Bloklar hiçbir zaman aynı bağlamda buluşmuyor; kazanç ~0 |
| `ÖLÇÜLDÜ:` yorumlarını temizlemek | Kod yorumu bağlama hiç girmiyor; maliyeti sıfır, değeri gerçek |
| CRLF temizliği | Tokenizer `\r\n`'i muhtemelen tek token sayıyor; ölçülmemiş kazanç için 223 KB diff |
| Etkisiz önbellekleri sökmek | Kazancı 0, sökmenin kazancı da 0 |
| Komut sayısını azaltmak | Kullanıcının ezberindeki adları kırar; aynı yer açıklama kısaltarak açılıyor |
| Kancayı daemon'a çevirmek | 33,4 sn'yi sıfırlardı, ama harness her olayda süreç açıyor; araya girmek kontrolümüzde değil |
| Kendi bağlam yoğunlaştırıcımız (OpenHands condenser) | Sıkıştırmayı harness yapıyor; ikinci katman cache'i kırar |
| SKILL.md'yi ölçümsüz bölmek | Bölme tek çağrıyı iki okumaya çevirebilir |
| Aynı 45 dakikalık görevle "kanıt" benchi | Tek modelin bitirdiği iş çok ajanlı sistemi sınamaz |

---

## Eksik ölçümler

Planın dayandığı ama henüz bilinmeyenler. Hepsi Aşama 0'da kapatılıyor.

- eco ile yalın arasındaki ~42.000 tokenin kalem dökümü
- Relay'in oturum başına gerçek çağrı sayısı ve ikinci çağrının cache davranışı
- Koşullu bölümlerin gerçek kullanım oranı
- Makinedeki Base dışı skill description toplamı
- Bench varyansı — aynı profil iki koşuda iki kata yakın ayrıştı, tek koşu kanıt değil

---

## Dürüst kapanış

İki konsey üyesi de aynı cümleyi kurdu: **eco'nun yalının altına inmesi garantili değil.**

Opus planlanan kazancı ~38.000 token diye verdi ve kalan ~7.000 için *"emin değilim, Ö4
dökümü olmadan bu boşluğu kapatacak adımı yazamam; yazsam uydurma olur"* dedi.

Bu rapor da aynı yerde duruyor. Hedef ölçülebilir, adımlar ölçülmüş veriye dayanıyor, ama
sonuç ancak Aşama 0 bittiğinde söylenebilir.

Bir şey kesin: bench'in bir sonraki turu **sıralı ve profil başına en az iki koşu** olacak.
Paralel koşu profilleri karıştırdı, tek koşu ise varyansı gizledi.
