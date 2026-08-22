# Özet: bağlam küçültme ve prompt sıkıştırma taraması

On depo tarandı. Sorulan beş soru: sıkıştırma gerçekten işe yarıyor mu, bağlam bütçesi
paylaştıran bir desen var mı, prompt caching bize ne kazandırır, lazy loading'in somut
uygulaması var mı, token muhasebesini kim yapıyor.

## Zemin — Base'in kendi ölçümleri

Tarama bittikten sonra Base ekibinin ölçümleri geldi ve son sütunun zeminini değiştirdi.
Bu bölüm tabloyu okumadan önce okunmalı.

| Ölçüm | Değer | Anlamı |
|---|---|---|
| Oturum açılışında yüklenen | **5.217 bayt** (yalnız description satırları) | Gövdeler çağrılana kadar girmiyor |
| `relay/SKILL.md` etkinleşince | **10.112 token**, tek seferde | Asıl yük burada |
| Ölçülen çağrı sayısı | **80** | Yük çağrı başına tekrarlanıyor |
| Description listesi bütçesi | **8.000 karakter**, Base **%65**'ini alıyor | Aşılırsa girdiler **çağrılamaz** — işlev sorunu |
| `systemMessage` | Bağlama giriyor (`bounded context` dizgisi) | Hook bildirimleri bedava değil |

**Bunun üç sonucu var:**

1. **"Dosyayı böl" fikri oturum açılışı için kazanç getirmiyor.** Açılış zaten 5.217 bayt.
   Bölmenin değeri varsa çağrı başına yükte var.
2. **Tahminler yanlıştı.** Bu raporun ilk hâli 4 bayt/token kabülüyle relay'i ~13.300
   token saydı; ölçüm **10.112** dedi — gerçek oran 5,26 bayt/token, tahmin **%31 yüksek**.
   Ayrıca "Türkçe daha çok token harcar" varsayımı da yanlış yönde çıktı. Aşağıdaki
   tabloda `kaba tahmin` etiketli kalan sayılara aynı şüpheyle bakılmalı.
3. **Uygunluk ölçütü daraldı.** Bir teknik ancak şunlardan birine dokunuyorsa uyar:
   **(a)** çağrı başına yükü düşürmek, **(b)** description'ı kısaltmak, **(c)** tekrar
   eden bağlamı cache'e almak. Dokunmuyorsa uymaz — aşağıda nedeni tek cümleyle yazılı.

Bench referansı: base'li koşu, base'siz koşudan 44.000 token fazla harcadı; doğruluk
tarafında dört koşu arasında ayrışma çıkmadı (`docs/BENCH-SONUC.md`).

---

## Tablo

| Depo | Teknik | Ölçülmüş kazanç | Kalite kaybı | Bize uyar mı |
|---|---|---|---|---|
| **anthropics/claude-cookbooks** (+ API belgeleri) | Prompt caching: sabit prefix'i önbelleğe alma | Fiyat çarpanları belgeli: yazma **1,25x** (5 dk) / **2x** (1 sa), okuma **0,1x**. 10.112 token × 80 çağrı: tam fiyatta ≈809.000, cache'li ≈92.500 token karşılığı → **~%89 indirim** | Sıfır — içerik değişmiyor. Risk kalitede değil geçersizleşmede: araç tanımı, görsel, effort değişikliği cache'i bozar | **Evet — (c)'ye doğrudan.** Gövde çağrıdan çağrıya değişmiyor, asgari eşiğin (512 token) 20 katı. **Ön koşul: `cache_control` bizde konuyor mu — doğrulanmadı** |
| **anthropics/skills** | Progressive disclosure, üç kademe | Şartname: metadata ~100 token, gövde **<5.000 token**, <500 satır. Bizim gövde **10.112 token** = tavanın **2,02 katı**, 881 satır = **1,76 katı**. `pdf` skill ölçütü: gövdenin **3,5 katı** içerik referansta | Ölçülmemiş. Bölünürse ajanın referansı okumayı atlama riski | **Evet — (a) ve (b)'ye.** Ama gerekçe açılış değil çağrı: 10.112 → 5.000 indirimi, 80 çağrıda ~400.000 token. Şartname **8.000 karakterlik toplam description bütçesinden hiç söz etmiyor** — o tuzak belgede yok |
| **letta-ai/letta** (+ letta-code) | Kapsam ayrımı (global/proje/ajan), MemFS, `/palace` + `/doctor` | **Hiçbir sayı yok** — ne MemGPT özetinde ne letta-code README'sinde tasarruf rakamı var. `doğrulanamadı` | Ölçülmemiş. `/doctor`'ın varlığı, otomatik bellek yönetiminin bozulabildiğinin itirafı | **Kısmen — (a)'ya.** Kapsam ayrımı 23 KB ajan tanımını ve 32 KB referansı koşullu kılabilir. Çalışma zamanı sayfalama **uymaz**: kararın kendisi token harcar, dosyalarımız statik |
| **BerriAI/litellm** | `message_stubbing` — silmek yerine yerine taş koymak | Kendi ölçümü yok; `compression/` modülünün kazancı depoda ölçülmemiş | Yok (ölçüm/araç katmanı) | **Kısmen — (a)'ya, tek desen olarak.** Gövde bölünürken "ayrıntı `references/protocol.md`'de" satırı **kalmalı**. Proxy ve bütçe zorlaması **uymaz**: çağrıları Claude Code yapıyor, araya giremeyiz |
| **nelson-liu/lost-in-the-middle** | Konum etkisinin ölçümü | GPT-3.5-Turbo, 20 belge: ilk **%75,8**, orta **%53,8-57,2**, son **%63,2**. Orta konum kapalı kitap temel çizgisinin (**%56,1**) **altında** | Ölçülen şeyin kendisi kayıp: en kötü konumda 22 puan | **Kısmen — yalnız (c) üzerinden.** Sıralama kuralı cache hiyerarşisiyle (`tools`→`system`→`messages`) örtüştüğü için bedava geliyor. Tek başına ne çağrı yükünü ne description'ı düşürüyor; ayrıca ölçüm 2023 modelleriyle ve belge listeleri üzerinde — markdown satırlarına aktarımı **doğrulanmamış varsayım** |
| **AgentOps-AI/tokencost** | İstemci tarafı token sayımı | Sayı iddiası yok, sadece hesap örneği. Dürüst | Yok | **Uymaz.** Üçüne de dokunmuyor: ölçer, kazandırmaz — ve ölçümü Base zaten kendisi yaptı. Ayrıca `tiktoken` OpenAI içindir, depo 2025-09'dan beri durmuş |
| **microsoft/LLMLingua** | Küçük modelle token eleme | "**20x** sıkıştırma, minimal kayıp" — `doğrulanamadı`. LongLLMLingua "**%21,4** RAG iyileşmesi, 1/4 token" — `doğrulanamadı` | **Bağımsız ölçüm olumsuz:** ~2x sıkıştırmada özetleme dayanıyor, **matematiksel akıl yürütme belirgin bozuluyor**; neden anlam kayması değil **bilgi eksilmesi** (arXiv 2605.17932) | **Uymaz.** (a)'ya dokunuyor gibi görünüyor ama sıkıştırmanın kendisi her çağrıda yerel model koşturmak demek — 10.112 token'lık **sabit** metni her çağrıda yeniden sıkıştırmak, bir kez elle kısaltmanın işini 80 kez ücretle yapmaktır |
| **stanfordnlp/dspy** | Prompt derleme — bizim açımızdan prompt'u **büyüten** optimizasyon | Prompt boyutuna dair **hiçbir ölçüm yok**. GEPA/MIPRO iddiaları yazarların — `doğrulanamadı` | Yok — kaliteyi artırıyor, bedeli token | **Uymaz (araç), uyar (disiplin).** Prompt'u Python üretiyor, bizimki statik markdown; ne eğitim kümemiz ne metriğimiz var. Kalan ders: fazla token kusur değil, **karşılığını almamak** kusur — bench doğruluk farkı bulamadı |
| **guidance-ai/guidance** | Kısıtlı üretim + token fast-forwarding | **README'de tek sayı yok.** "reducing latency and cost", "substantial number of tokens" — ölçüsüz, `doğrulanamadı` | Ölçülmemiş | **Uymaz.** Fast-forwarding logit erişimi ister (Anthropic API'sinde yok) ve kazanç **çıktı** token'ında; bizim üç kaldıracımızın üçü de **girdi** tarafında |
| **liyucheng09/Selective_Context** | Self-information ile öbek eleme | "**2x** daha fazla içerik" — `doğrulanamadı`. **README'de tek ölçüm yok** | Ölçülmemiş | **Uymaz — ve alınamaz.** LLMLingua ile aynı gerekçe, üstüne `license: null`: lisanssız kod kullanılamaz |

---

## Beş soruya cevap

**1. Prompt sıkıştırma gerçekten işe yarıyor mu?**

İddia edildiği kadar değil, ve **bizim problemimizin çözümü değil**. Taramada bulunan tek
bağımsız ölçüm olumsuz: LLMLingua-2 üzerinde ~2x sıkıştırmada özetleme dayanıyor ama
matematiksel akıl yürütme belirgin bozuluyor, üstelik **bilgi eksilmesi** yüzünden
(arXiv 2605.17932). "20x sıkıştırma, minimal kayıp" iddiasının bağımsız doğrulaması yok.

Bizim için asıl gerekçe teknik değil ekonomik: sıkıştırma **çalışma zamanında değişen**
metin içindir. Bizim 10.112 token'ımız 80 çağrının hepsinde aynı. Aynı metni 80 kez
sıkıştırmak yerine bir kez elle kısaltmak, aynı kazancı sıfır çalışma zamanıyla veriyor.

**2. Bağlam bütçesi paylaştıran bir desen var mı?**

Evet — Anthropic'in kendi şartnamesi, üç kademe ve her birine sayı. Ölçümlerimiz
kademelerin bizde nasıl işlediğini gösterdi: 1. kademe (5.217 bayt) zaten sağlıklı,
2. kademe (10.112 token) tavanın iki katı, 3. kademe kullanılıyor ama az.

Şartnamenin **söylemediği** bir bütçe daha var: harness'ın 8.000 karakterlik description
listesi. Bu, belgeyi okuyarak öğrenilemeyecek bir sınır ve token değil **işlev** sınırı.

**3. Prompt caching — kazanç ne?**

**Taramanın en yüksek ve tek belgelenmiş kazancı.** Cache okuma temel fiyatın 0,1 katı.
10.112 token × 80 çağrı üzerinden kaba hesap: tam fiyatta ≈809.000 token karşılığı,
cache'li senaryoda ≈92.500 — **~%89 indirim**.

Ama bu bir tahmin, ölçüm değil. Ön koşulu: `cache_control` gerçekten konuyor mu, ve
profil değişimi (eco/normal/premium) effort ayarını değiştirip cache'i bozuyor mu.
İkisi de **doğrulanmadı**.

**4. Lazy loading / progressive disclosure — somut uygulama var mı?**

Evet, kullandığımız mekanizmanın içinde, ve ölçüm gerekçeyi düzeltti: **açılış için
kazanç yok**, çağrı için var. Anthropic'in `pdf` skill'i ölçüt veriyor — SKILL.md 8.072
bayt, yanında 28,5 KB referans; **gövdenin 3,5 katı içerik dışarıda**. Bizde ters:
gövde 53 KB, referanslar ~32 KB.

Not: Anthropic kendi `skill-creator/SKILL.md`'sini 33.168 baytta tutuyor, yani 5.000
token önerisini kendisi ihlal ediyor. Sınır kırmızı çizgi değil hedef.

**5. Token muhasebesi?**

Bu soru **kapandı** — Base ekibi ölçümü kendisi yaptı ve hazır araçların hepsinden daha
doğru sonuç aldı. LiteLLM çağrı yolunda değil, tokencost bir yıldır güncellenmemiş ve
yanlış tokenizer kullanıyor. Alınacak tek şey kalmıştı, o da artık gereksiz.

Geriye kalan iş: henüz ölçülmemiş dosyalar (teknesyum-ui/SKILL.md, SETTINGS.md, ajan
tanımları) ve `systemMessage` üzerinden giren hook bildirimlerinin çağrı başına payı.

---

## Bize uyanlar — uygulama sırası

**1. Cache'i doğrula.** `cache_control` konuyor mu; profil değişimi bozuyor mu; sabit blok
gerçekten başta mı. Getirisi taramadaki en yüksek (~%89), maliyeti bir denetim turu.
Cevap "hayır"sa aşağıdaki hiçbir madde bu kadar kazandırmaz — bu yüzden ilk sırada.
Kaynak: `claude-cookbooks.md` §3, §5.1-5.2.

**2. Description'ı kısalt — token için değil, işlev için.** 8.000 karakterin %65'i dolu.
Kalan %35 yeni skill ve komut için tek yer; bütçe aşılırsa girdiler **çağrılamaz**.
Maliyet: frontmatter düzenlemesi, neredeyse sıfır. Getiri: hareket alanı.
Kaynak: `anthropic-skills.md` §5.2.

**3. relay/SKILL.md gövdesini böl.** 10.112 → ~5.000 token, 881 → <500 satır. 80 çağrı
üzerinden yaklaşık 400.000 token.
**Önce ölç:** 80 çağrının kaçında taşınacak bölümler gerçekten okunuyor? Çoğunda
okunuyorsa bölme yükü artırır — tek çağrı iki okumaya döner. Bu **doğrulanmadı**.
Bölerken stubbing kuralı: "ayrıntı `references/…`'da" satırı SKILL.md'de kalmalı.
Kaynak: `anthropic-skills.md` §5.1, §5.3; `litellm.md` §5.2.

**4. Kapsam ayrımı.** 23 KB ajan tanımı yalnızca ajan açılırken, 32 KB referans yalnızca
ilgili adımda. 3. maddenin genişletilmiş hâli. Maliyet: orta, yükleyicinin desteğine bağlı.
Kaynak: `letta-memgpt.md` §5.1.

**5. Hook bildirimlerini say.** `systemMessage` bağlama giriyor, yani her bildirim çağrı
başına ücretli. Kaç bildirim, kaç token — **ölçülmedi**. Ölçülmeden kısaltılmamalı;
bildirimlerin bir kısmı davranışı taşıyor olabilir.
Kaynak: `litellm.md` §5.2 (stubbing), `claude-cookbooks.md` §6 (context editing).

**6. Kritik kuralları dosyanın ortasına koymamak.** Bedava, ama tek başına hiçbir kaldıraca
dokunmuyor; 1. maddenin sıralama çalışmasıyla birlikte yapılırsa ek maliyeti yok.
Kaynak: `lost-in-the-middle.md` §5.1-5.2. Aktarım **doğrulanmamış varsayım**.

---

## Bize uymayanlar — ve tek cümlelik nedeni

| Teknik | Neden uymaz |
|---|---|
| LLMLingua / Selective Context çalışma zamanı sıkıştırma | 10.112 token 80 çağrının hepsinde aynı; sabit metni her çağrıda sıkıştırmak, bir kez elle kısaltmanın işini 80 kez ücretle yapmaktır |
| Selective Context (ayrıca) | Lisans yok — kullanılamaz |
| Guidance token fast-forwarding | Kazanç çıktı token'ında ve logit erişimi gerektiriyor; bizim üç kaldıracımızın üçü de girdi tarafında |
| DSPy optimizer | Prompt'u çalışma zamanında Python üretiyor; bizimki statik markdown, elimizde ne eğitim kümesi ne metrik var |
| LiteLLM proxy / bütçe zorlaması | Çağrıları Claude Code yapıyor, araya proxy sokamayız |
| tokencost kütüphanesi | Ölçer, kazandırmaz — ve ölçümü Base zaten kendisi ve daha doğru yaptı |
| Letta çalışma zamanı bellek sayfalama | Sayfalama kararının kendisi token harcar; statik dosya için gereksiz karmaşıklık, `/doctor` komutu bu riskin gerçek olduğunun kanıtı |
| "Dosyayı böl, oturum açılışı ucuzlasın" | Açılışta zaten yalnız 5.217 bayt yükleniyor — bölmenin değeri açılışta değil, çağrı başına yükte |

---

## Depo künyeleri (2026-08-22, `gh api` ile doğrulandı)

| Depo | Son push | Son etiketli sürüm | Yıldız | Açık issue | Lisans |
|---|---|---|---:|---:|---|
| anthropics/skills | 2026-08-21 | **yok** (404) | 170.962 | 1.140 | **null** — klasör klasör değişiyor |
| anthropics/claude-cookbooks | 2026-08-19 | **yok** (404) | 51.970 | 313 | MIT |
| BerriAI/litellm | 2026-08-22 | v1.97.0 (2026-08-16) | 57.002 | **5.003** | NOASSERTION (MIT + `enterprise/` istisnası) |
| stanfordnlp/dspy | 2026-08-21 | 3.3.1 (2026-08-21) | 37.498 | 643 | MIT |
| letta-ai/letta | 2026-08-16 | 0.16.8 (2026-05-14) | 24.341 | 42 | Apache-2.0 — **kod burada değil** |
| letta-ai/letta-code | 2026-08-22 | — | 3.083 | 237 | Apache-2.0 |
| guidance-ai/guidance | 2026-05-21 | 0.3.2 (2026-03-18) | 21.713 | 319 | MIT |
| microsoft/LLMLingua | 2026-04-08 (dal commit'i 2025-10-28) | v0.2.2 (2024-04-09) | 6.593 | 119 | MIT |
| AgentOps-AI/tokencost | 2025-09-05 | 0.1.26 (2025-08-13) | 2.004 | 31 | MIT |
| nelson-liu/lost-in-the-middle | 2024-01-04 | **yok** (404) | 391 | 1 | MIT |
| liyucheng09/Selective_Context | 2024-02-12 | v0.1.0rc1 (2023-12-26) | 425 | 12 | **yok** |

---

## Bu taramanın kendi sınırı

Beş şey **doğrulanamadı**, beşi de yukarıdaki önerilerin ön koşulu:

1. Claude Code `cache_control` işaretçisini koyuyor mu, nereye.
2. Skill gövdesi prompt'un hangi rolüne giriyor (`system` mi `messages` mi).
3. Her istekte enjekte edilen 800-2500 karakterlik yönergenin hangi role gittiği.
4. Profil değişiminin (eco/normal/premium) effort ayarını ve dolayısıyla cache'i bozup
   bozmadığı.
5. 80 çağrının kaçında `references/`'a taşınacak bölümlerin gerçekten okunduğu — bölme
   kararının yönü buna bağlı.

Beşi de Claude Code'un iç davranışı; depo taramasıyla değil ölçümle cevaplanır.
1-4 cevaplanmadan cache kazancı tahmin olmaktan çıkmaz; 5 cevaplanmadan bölme kazanç
değil kayıp yazabilir.

Ayrıca: bu raporda **ölçüldü** yazmayan her token sayısı 4 bayt/token kabülüyle
hesaplandı ve bu kabul relay/SKILL.md'de **%31 yanılmıştı**.

## Rapor dosyaları

- `docs/taramalar/anthropic-skills.md`
- `docs/taramalar/claude-cookbooks.md`
- `docs/taramalar/lost-in-the-middle.md`
- `docs/taramalar/letta-memgpt.md`
- `docs/taramalar/llmlingua.md`
- `docs/taramalar/litellm.md`
- `docs/taramalar/tokencost.md`
- `docs/taramalar/dspy-prompt-boyutu.md`
- `docs/taramalar/guidance.md`
- `docs/taramalar/selective-context.md`
