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

**opus:** Dalga 5 olarak ekledi — `PostToolUse` eşleyicisini durum değiştiren araçlara
indir, `sozdizim`'i ayrı `node --check` süreci yerine süreç içi `vm.Script` ile çalıştır.
Hedef 57,6 sn → ≤25 sn.

**Karar: opus. Ama en son dalga olarak.** Kullanıcının cümlesi *"hem token tüketimini
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

**opus:** eylem dalgası yapmadı, `cache_creation`/`cache_read` ayrımını ölçüme koydu.

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

## Dalgalar

Sıra kazanca göre, ölçüm kapıları açıkça yazılı.

### Dalga 0 — ölçüm (bloklayıcı)

Hiçbir dosya değişmez. Dördü paralel yürür.

| | İş | Cevaplayacağı tek soru |
|---|---|---|
| `Ö1` | Relay çağrı defteri | İkinci çağrı gövdeyi yeniden mi yazıyor, cache'ten mi okuyor |
| `Ö2` | Bölüm kullanım sayımı | 80 çağrının kaçında §1.4 · §1.5 · §3.1 gerçekten iş yaptı |
| `Ö3` | Description bütçe sayımı | 8.000 karakterlik liste bütçesi aşılıyor mu |
| `Ö4` | eco taban koşusu | 157.709'un kalem dökümü |

**Kapı:** `Ö4` farkın en az %80'ini kalemlemezse Dalga 2 ve 3 başlamaz — hipotez yanlış
demektir ve plan baskın kaleme yeniden hedeflenir.

`Ö2` deterministik vekil kullanır: `references/*.md` Read sayısı, açılan scout/planner/advisor
sayısı, yazılan görev paketi ve rota dosyası sayısı. Bölüm okunmuşsa iz bırakır.

### Dalga 1 — ölçümsüz kesin kazançlar

`Ö1`'i beklemez, çünkü kazancı ölçümden bağımsız.

- **`ecoNotu` tek cümleye iner** (532 → ~80 B), `premiumNotu` 1.758 → ≤600 B. `SETTINGS.md`'de
  zaten yazılı olanın kopyası atılır.
- **Tur özeti yönergesi bir kez verilir**, sonraki turlarda yalnız satır (155 → 48 B).
  Otuz turluk oturumda `Stop` trafiği 3.906 → ≤1.700 B.
- **eco'da `duyur()` bildirimleri asgariye iner** — `systemMessage` bağlama giriyor, bedava
  değil.
- **Enjeksiyon tek noktaya toplanır ve yazılı bayt tavanı konur.** Referans: `superpowers`
  3.108 B. eco tek enjeksiyon ≤400 B.

**Kabul:** 271 test geçer · eco tek enjeksiyonu normal'inkinden **küçük** · profil adları ve
komutlar değişmez.

### Dalga 2 — profil kapsamı ve görünürlük

- **`S4` profil oturuma bağlanır.** Makine kaydı varsayılan kalır, oturum kaydı üzerine yazar.
  `/teknesyum:premium` aynı adla çalışır.
- **`S5` ajan bütçe defteri.** `SubagentStop`'ta altı kalem: input, cache_creation, cache_read,
  output, brifing baytı, rapor baytı. **Denetim ayrı kalem** — maliyeti savunulabilsin diye
  (SWE-agent deseni). Oturum toplamı profil eşiğini geçince tek satır uyarı.

**Tavan uyarır, kesmez.** SWE-agent aşımda hata fırlatıyor ama o denemeyi baştan alabiliyor;
bizim oturumumuz alamaz. İş ortasında sert kesmek yazılmış işi çöpe atar.

**Kabul:** bir sonraki bench "227k'ya karşı 113k" yerine kalem dökümü verir.

### Dalga 3 — eco ince giriş (en büyük kazanç, `Ö1`'e bağlı)

eco'da §1 sınıflandırma tablosu ve eco davranış maddeleri enjeksiyona gömülür; relay yalnız
sınıf "oturum içi röle" ya da üstüyse çağrılır. Enjeksiyon ~1.500 bayt büyür, 10.112 tokenlik
yükleme düşer.

**İki konsey üyesi de bu noktada buluştu** — fable "hiç yüklemez", opus "küçük ve orta işte
hiç yüklemez". Bench'te eco zaten ajan açmamıştı; protokolün çoğu o koşuda ölü ağırlıktı.

**Risk:** eco protokolü kaybeder. Karşılığı: enjeksiyona "sınıf röle ve üstüyse relay'i çağır"
eşiği yazılır; ilk çağrı hiçbir koşulda engellenmez.

**Kabul:** eco'da tek dosyalık iş relay'i hiç çağırmaz.

### Dalga 4 — gövdeyi böl (yalnız `Ö2` onay verirse)

`Ö2`'de "işlerin çoğunda kullanılmıyor" çıkan bölümler `references/` altına taşınır, yerinde
tek satır işaretçi kalır. Hedef 53.147 B → ≤33.000 B, ≤500 satır.

**Çift kabul kriteri:** çağrı başına delta ≤3.500 token **ve** on gerçek oturumda
`references/` Read toplamı kazanılan tokenden küçük. İkincisi tutmuyorsa **taşıma geri
alınır** — bölme tek çağrıyı iki okumaya çevirdiyse zarar etmişizdir.

`Ö2` "çoğunda okunuyor" derse bu dalga iptal; o bölümler yerinde kısaltılır.

### Dalga 5 — description bütçesi (`Ö3` aşım diyorsa öne alınır)

Komut ve profil adları **değişmez**, yalnız açıklama metni kısalır. Hedef 5.217 → ≤3.400 B.

**Kabul:** yirmi promptluk tetikleme testinde relay ve teknesyum-ui isabeti kısaltma
öncesiyle aynı. İsabet düşerse metin geri uzatılır — kısa description işlevi bozarsa kazanç
değil kayıptır.

Bu bir token meselesi değil **işlev** meselesi: 8.000 karakterlik bütçe aşılırsa girdiler
`name-only`'a düşüyor ve çağrılamaz hale geliyor.

### Dalga 6 — süreç maliyeti (token değil, saniye)

- `PostToolUse` eşleyicisi durum değiştiren araçlara iner (Write/Edit/NotebookEdit/Task).
- `sozdizim` ayrı `node --check` süreci yerine süreç içi `vm.Script` ile denetler; ESM
  dosyada eski yol kalır.
- `test/run.js` `calistir()` işçi havuzuyla paralelleşir, her işçi kendi konfig kumhavuzunda.

**Kabul:** kanca toplamı 57,6 → ≤25 sn · test 25,9 → ≤9 sn · 271/271 geçer · iki ardışık
koşuda aynı sonuç.

**Geri alma şartı:** ajan takılma uyarısı beş dakikadan geç gelirse eşleyiciye `Bash` geri
eklenir.

---

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

Planın dayandığı ama henüz bilinmeyenler. Hepsi Dalga 0'da kapatılıyor.

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
sonuç ancak Dalga 0 bittiğinde söylenebilir.

Bir şey kesin: bench'in bir sonraki turu **sıralı ve profil başına en az iki koşu** olacak.
Paralel koşu profilleri karıştırdı, tek koşu ise varyansı gizledi.
