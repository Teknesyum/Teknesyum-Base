# Brifing — Teknesyum onarım projesi

Bu dosya plan konseyi üyeleri için yazıldı. Sıfırdan bir plan öneriyorsun; aşağıdaki
bulgular kanıtlanmış veridir, tartışma konusu değil. Tartışma konusu **ne yapacağımız**.

## 1. Nereden geldik

Teknesyum, Claude Code için Türkçe bir eklenti: relay çok-ajanlı orkestrasyon (sözleşme →
builder → denetçi → mühür), üç profil (premium/normal/eco), neon UI standardı, ~30 kanca.
Kullanıcının kodlama sisteminin temeli olacak; "kusurlu olamaz" dedi.

Eklentiyi eklentisiz Claude Code'a karşı ölçmek için bir bench kuruldu (B0-B3, v2.65-2.66).
Ağır görev: 63 gereksinimli mini proje, 230 denetim. 4 koşul × 3 tekrar, headless `claude -p`,
hepsi opus. Sonuç: dört koşul da istatistiksel olarak ayırt edilemedi. Kullanıcı bu sonuçtan
memnun değil ve haklı olarak soruyor: "gecemizi gündüzümüze kattık, çıkardığımız eklenti
native Claude'dan kötü mü çıktı?"

## 2. Dört bağımsız ajanın kanıtladığı teşhis

**(A) Bench'in yarısı geçersiz veri.** 12 koşunun 6'sı tek paylaşılan OAuth hesabının oturum
kotasına çarpıp ortasından kesildi (`You've hit your session limit`). `kos.js` çıkış kodunu
başarı kararına hiç katmıyor (`kos.js:348-349`, yalnız `dogrula`), bu yüzden kesilmiş koşular
geçerli sonuç diye rapora girdi. Raporun tek nitel bulgusu — "premium 27 kusurla yarım teslim
etti" — bu artefakttır: model `rapor.js`'i yazmış, `cli.js`'e sıra gelmeden kesilmiş, 27 kusurun
hemen hepsi "CLI dosyası yok" diye patlayan komut testi. Kesilen koşular atılınca **eklentili
koşullarda hiç kusur kalmıyor.**

**(B) Cache-read metriği yanlış şeyi ölçüyor.** r(tur, cacheRead) = 0,992. Tur başına cache-read
dört koşulda %10'luk bir bantta (native 61,3K … normal 67,8K). Rapordaki "eco en çok bağlam
okudu" sıralaması tamamen tur sayısı sıralaması (native 16,0 · premium 16,7 · normal 21,0 ·
eco 24,7). Eklenti yükünü zaten `tazeToken` ölçüyor; cache-read çift sayım.

**(C) Tasarımın gücü sıfır.** Blok eşli fark ss'i süre için 8-12 puan, token için 8-11 puan.
%10'luk farkı %80 güçle yakalamak için ~12 blok gerekirdi, 3 kullandık. Tur ekseninde model
varyansı CV %45 (eco: 14/36/24 tur) — o eksende fark aramak pratikte imkânsız. Kalite ekseninde
tavan etkisi var: 12 koşunun 10'u sıfır kusur, görev ayırt etmiyor. Ayrıca "randomize blok"
denmiş ama hiçbir rastgeleleştirme yok, sıra hep sabit. Bloklar arası zaman etkisi (%20)
koşullar arası etkinin (%6) üç katı.

**(D) Profiller kod olarak neredeyse hiçbir şey yapmıyor.** `premium.js` diskte yalnız iki şey
değiştiriyor: `teknesyum.json`'daki profil adı ve `settings.json`'daki `autoCompactWindow`
(eco 150k / normal auto / premium 500k). "20 paralele kadar", "her ajan opus", "plan konseyi
açık", "worktree izolasyonu" — hepsi `UserPromptSubmit` ile prompt'a enjekte edilen birkaç
cümle. Kod hiçbir ajanı paralel açmıyor, hiçbir ajana model atamıyor; `agents/*.md`
frontmatter'ında `model:` alanı **yok**. Tek yaptırım `kimlikDenetle()`: beyan/gerçek sapmasını
log'a yazar, bloklamaz (defterde 63 kayıtlık sapma borcu bundan).

**(E) Eklenti yükleniyor ve okunuyor, ama davranışı değiştirmiyor.** 2 skill, 22 komut ve
7 ajan tanımı yükleniyor, `SessionStart` kancası koşuyor, model banner'ı basıp talimata
itaat ediyor. **Ama 12/12 koşuda sıfır Agent çağrısı, sıfır Skill çağrısı.** Araç kümesi her
yerde aynı: Bash, Write, Edit, Grep. Ödenen yükün karşılığı bir banner satırı.

> **Düzeltme (26.08.2026, O8 tur 3).** Bu bölümün ilk hâli yükü "+3,5-4,6k token" diye
> veriyordu ve iki bakımdan yanlıştı.
>
> **Katsayı yanlıştı.** Rakam `karakter/3,6` tahminine dayanıyordu. Gerçek `usage`
> alanlarıyla A/B ölçümü yapıldı: katsayı **1,894-1,902**, yani eski tahmin **%47 eksik**.
>
> **Kalem ayrımı yoktu.** Ölçülen gerçek yük:
>
> | kalem | token | ne zaman |
> | --- | ---: | --- |
> | skill + komut + ajan tanımları | 2.979 | oturumda bir kez |
> | `UserPromptSubmit` enjeksiyonu | 3.488 | ilk iki tur |
> | **oturum toplamı** | **6.722** | |
>
> Enjeksiyonun "her turda tekrarlanır" sanılması da yanlıştı: `relay-watch.js:981`
> `sayacGecti(j, eko ? 1 : 2)` ile ilk iki turda yazıp susuyor (kapsayıcı proje etkinse
> istisna var).
>
> **Küçültme denendi ve fiilen başarısız oldu.** Net kazanç **85 token**. Kesilen iki ibare
> `test/run.js` içindeki iki testi kırdı — yani davranış kaybettiriyorlardı, geri kondu.
> Sahiplenilen dilim tamamen silinse toplam 2.590'da kalır. Hedef 2.000 idi, **tutturulamadı.**
>
> Buradan çıkan iş kısaltma değil **kaldırma** kararıdır: hangi skill/komut/ajan kaleminin
> faydası maliyetini karşılıyor — bu Dalga 3'ün konusu.

**(F) Görev, eklentinin iddiasını sınamıyor.** Tek oturum, tek ajan, temiz fixture, tek atışta
bitecek iş. Relay orkestrasyonu, oturum sürekliliği, sözleşme akışı — hiçbiri tetiklenemez.
Üstelik relay koşularda "setup incomplete" diyerek devre dışı kalmış.

**(G) Fixture'da bir gerçek kusur.** `normal r3`ün tek kusuru model hatası değil istem
belirsizliğiydi (`iadeAdedi`/`iadeToplami` tanımsızdı). Düzeltildi.

## 3. Fable'ın stratejik görüşü (alınmış, konseye girdi)

"Önce ölçümü onar. Elindeki veri 'eklenti değersiz' demiyor, 'bu düzenek eklentinin iddiasını
ölçmüyor' diyor. Alt ajan hiç açılmadıysa bağımsız değişken fiilen sistem promptu boyutu olmuş.
Eklentinin değer önerisi tek-oturum verim değil, oturumlar-arası dayanıklılık ve insan maliyeti:
doğal birim token/dakika değil, **kullanıcının yazdığı mesaj sayısı** ve **kesinti sonrası
kurtarılan iş yüzdesi**. `claude -p` relay'in yaşadığı ortamı (interaktif, kesintili, çok
oturumlu) baypas ediyor — araç seçimi sonucu baştan belirlemiş. Bir de olumlu okuma: eklenti
performansı düşürmemiş (≤%6), 'zarar yok' kanıtı elde, sıra 'fayda var' kanıtında."

## 4. Senden istenen plan

Kapsamlı bir onarım projesi öner. Kapsam en az şu üç ekseni ayırmalı ve sıralamayı
gerekçelendirmeli:

1. **Ölçüm onarımı** — geçerli koşu kapısı, kota izolasyonu, doğru metrik seti, yeterli güç,
   gerçek rastgeleleştirme. Mevcut iki rapordaki (trash/bench/BENCH-PROJE.md, BENCH-SONUC.md) yanlış
   hükümlerin düzeltilmesi.
2. **Doğru ekseni ölçen düzenek** — eklentinin iddiasını (orkestrasyon, süreklilik, insan
   maliyeti) sınayan görev sınıfları ve metrikler. Headless mi, interaktif taklidi mi, hibrit mi?
3. **Ürün onarımı** — profillerin yaptırıma bağlanması (ajan frontmatter'ında model, gerçek
   paralellik, kanca düzeyinde zorlama), relay'in koşularda neden devre dışı kaldığı, ~4k
   token'lık bağlam yükünün karşılığının üretilmesi ya da yükün küçültülmesi.

Her eksende: hangi işler, hangi sırayla, hangi bağımlılıkla, hangi kabul kriteriyle. Nelerin
paralel yürüyebileceğini söyle. Riskleri ve "bu iş boşa gider" dediğin kalemleri açıkça yaz.
Kod yazma, dosya oluşturma — yalnız plan öner.
