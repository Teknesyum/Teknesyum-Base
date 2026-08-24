# Relay ayarları

**Bu dosya makine varsayılanıdır ve `normal` profilin değerlerinde durur. `/premium` onu
ezmez, hiç yazmaz.** Profilin tabandan sapan düğmeleri oturumun kanca enjeksiyonuyla
gelir ve buradaki satırı geçer; sapmayan düğme buradan okunur.

Davranış düğmeleri. Değiştirmek için satırı düzenle — skill her yüklendiğinde okunur.
Proje bazında ezmek için `.claude/relay/SETTINGS.md` oluştur; oradaki satırlar buradakini geçer.
Sıralama üç katmandır: **oturum profili → proje `SETTINGS.md` → bu dosya.**

```
ask_threshold      : critical       # never | critical | ambiguity | often
approval_gate      : none           # none | plan | every-contract
audit              : critical       # off | very-critical | critical | high | every-contract
fix_ceiling        : 5              # kaç tur sonra karar sana gelir
model_escalation   : on             # on | off
parallel_width     : 2              # eşzamanlı ajan tavanı — eco 1 · normal 2 · premium 20
default_model      : sonnet         # haiku | sonnet | opus
worktree_isolation : off            # on | off
report_length      : short          # short | normal | detailed
briefing           : milestone      # quiet | milestone | every-step
plan_council       : off            # off | on — planı iki model bağımsız önerir
second_opinion     : off            # off | on — karar düğümünde fable kısa görüş verir
research_repos     : 10             # ön araştırmada taranacak en az depo sayısı — eco 1 · normal 10 · premium 50
agent_stall        : 10             # kaç dakika sessiz kalan ajan bildirilir
agent_loop         : 5              # aynı eylem kaç kez üst üste tekrarlarsa döngü sayılır
autocompact        : auto           # settings.json → autoCompactWindow — eco 100000 · premium 1000000
```

## Anlamları

**ask_threshold** — ajan ne zaman durup sorar.
`never` hiç sormaz, eksik bilgiyi varsayımla doldurup Çıktı'ya yazar ·
`critical` sadece geri dönüşü olmayan veya veri kaybettirecek durumda ·
`ambiguity` sözleşme iki farklı şekilde okunabiliyorsa da sorar ·
`often` her mimari seçimde onay bekler.

**approval_gate** — T0 sana ne zaman durur.
`none` planı yapar ve başlar · `plan` PLAN.md'yi onaylatır ·
`every-contract` her sözleşmeyi dağıtmadan önce gösterir.

**audit** — `auditor` ne zaman çalışır. Değer bir **eşiktir**: sözleşmenin geri dönüş
maliyeti bu seviyede ya da üstündeyse denetçi açılır.

| Değer | Denetlenen sözleşme | Ne kadarı denetlenir |
|---|---|---|
| `off` | hiçbiri | — |
| `very-critical` | geri dönüşü olmayan: veri kaybı, üretim verisi, güvenlik sınırı | en az |
| `critical` | + mimari sınır, 3+ dosya, genel API değişikliği | |
| `high` | + geri alması pahalı olan her şey: göç, şema, yayımlanmış arayüz | |
| `every-contract` | hepsi | en çok |

Ölçek risk sırasıdır, denetim sırası değil: `high` eşiği `critical` eşiğinden **daha çok**
sözleşme denetler, çünkü daha alçak bir riskten itibaren açılır.

Varsayılan `critical`. Premium bile `every-contract` değildir: basit ve geri dönüşü ucuz
işte denetçi açmak tur ve token harcar, karşılığında hiçbir şey yakalamaz. Denetimin
karşılığı geri dönüş maliyeti yüksekken doğar; premium orada `high` ile daha erken açılır
ve daha titiz çalışır. Ajan raporu denetim yerine geçmez — eşiği aşan sözleşmede denetçi
atlanamaz.

**fix_ceiling** — kabul kriteri geçmezse: tur 1-3 aynı ajan devam ettirilir
(`SendMessage`), tur 4-5 taze ajan atanır. Tavana gelince karar sana sorulur.

**model_escalation** — `on` ise 3 tur sonunda çözülmeyen sözleşme, **4. turda açılan
taze ajanla** bir üst modele çıkar (haiku→sonnet→opus). Sorun modelin seviyesindeyse tur
harcamayı keser. Devam ettirilen ajanın modeli değiştirilemez, bu yüzden tırmanış hep
taze ajanla gelir.

**parallel_width** — `owns` kümeleri kesişmeyen sözleşmeler için tavan. Normal profilde
3'ü aşma; her paralel ajan tam dispatch maliyeti taşır. eco profilinde tavan 1'dir —
paralellik oradaki tek kısıtı, süreç sayısını, doğrudan çarpar.

Premium profilde tavan **20**'dir ve 3'ü geçtiğinde `worktree_isolation` kendiliğinden
açılır. Kaç ajan açılacağına T0 karar verir ve ölçüsü **hızdır, token değil**. Tavan
token için konmadı: `worktree_isolation` açıkken her ajan bir repo kopyası ve bir süreç
demektir, ve T0 hatalı bir döngüye girerse tavan güvenlik ağı olur. Yirmi, "ne kadar
lazımsa o kadar"ı fiilen karşılar — pratikte ona dayanmadan iş biter.

**worktree_isolation** — `on` ise ajanlar `isolation: worktree` ile reponun izole
kopyasında çalışır. Paralel çakışmayı dosya sisteminde çözer, ama her ajana repo
kopyası maliyeti çıkarır. Sadece 3 paralel ajanda ve büyük projede aç.

**report_length** — ajanın T0'a dönen raporu. `short` = değişen dosyalar + tek paragraf.
Bu düğme **ajan→T0** trafiğini ayarlar, sana gösterileni değil.

**briefing** — T0'ın **sana** ne sıklıkta rapor verdiği (`protocol.md` §8).
`milestone` varsayılan: açılış brifingi, her sözleşme kapanışı, her dalga sonu ara
raporu, sapma anı, kapanış raporu · `every-step` ajan başlangıçlarını ve düzeltme turlarını
da ekler, uzun işte gürültü yapar · `quiet` yalnızca brifing, sapma ve kapanış; gerisini
`/report` ile sen istersin. Hiçbir değerde sapma bildirimi kapanmaz.

`approval_gate` ile karıştırma: o **beklemeyi**, bu **anlatmayı** yönetir.

**plan_council** — `on` ise plan tek modelin işi olmaktan çıkar. T0, `PLAN.md` yazmadan
önce aynı brifingle **iki `planner` ajanı** açar: biri `fable`, biri `opus`. İkisi de iş
yapmaz — kod, dosya, sözleşme yazmazlar; tek çıktıları öneridir. T0 iki öneriyi
sentezler ve planı kendisi yazar. Ayrıntı relay `references/plan-akisi.md` §1.5.

Bu, "planlamayı asla delege etme" kuralını delmez: delege edilen **karar** değil
**seçenek üretimi**. Kararı hâlâ T0 verir ve gerekçesi `PLAN.md`'ye girer.

**second_opinion** — `on` ise T0, doğru kararın ne olduğunu bilmediği bir düğümde
**`advisor` ajanını** açar ve `fable`'dan kısa bir ikinci görüş alır. Tek üye, tek soru,
üç başlıklı ve en fazla 20 satırlık cevap. Konseyle karıştırma: konsey planın tamamı
içindir ve iki üyelidir, görüş tek bir karar içindir ve tek üyelidir.

`advisor` ayrı bir ajandır, `planner`'ın bir kipi değil. Ayrılmasının sebebi ölçülmüş bir
kısıt: `Agent` aracının şemasında `model` var ama `effort` yok — efor yalnızca ajan
tanımının frontmatter'ından gelir. Tek dosyada iki kip, iki kipin eforunu da birbirine
bağlıyordu. `advisor` premiumda bile **düşük eforla** çalışır; danışmanın sık olması
ancak ucuz olmasıyla mümkün.

Görüş bağlayıcı değildir — T0 katılmazsa gerekçesini yazar. Kullanıcıya sormanın yerini
de tutmaz: `ask_threshold` sormaya izin veriyorsa önce sorulur. eco ve normal profilde
kapalıdır, premiumda açılır. Hangi dokuz durumda tetiklendiği relay `references/plan-akisi.md` §1.5.1.

**research_repos** — ön araştırmada (SKILL `references/plan-akisi.md` §1.4) taranacak en az depo sayısı. eco
profilinde 1, normal profilde 10, premium profilde 50. Elli depo, on depoyla aynı
derinlikte okunmaz: ilk tarama tabakası sığdır, konsey ve planlama derinleşeceği yeri
kendi seçer.

eco'da tavan **1**'dir çünkü ön araştırma bir oturumun en pahalı kalemidir: her depo bir
`scout` ajanı payı demektir ve eco'nun tek gerçek kısıtı ajan sayısıdır. Tek depo bile
"birileri bu problemi nasıl çözmüş" sorusuna cevap verir; beş depo eco felsefesiyle
çelişir. Kapı da eco'da engellemez, uyarır — ayrıntısı SKILL `references/plan-akisi.md` §1.4'te. Atlamanın gerekçesi
hâlâ `docs/taramalar/ATLANDI.md` dosyasına yazılır; eco'da kanca atlamayı ayrıca
`live/_sorun.log` dosyasına kaydeder, çünkü ekrandan kayan uyarı kalıcı iz değildir.

**agent_stall** — bir ajan kaç dakika olay üretmezse sağlıksız sayılır. Kanca her ajanın
`live/<agent_id>.json` kaydındaki `last_seen` alanına bakar; süre dolmuş ve `SubagentStop`
gelmemişse ana oturuma tek satır bildirim çıkar ve `live/_sorun.log` dosyasına yazılır.
Kanca ajanı durduramaz — durdurma kararı ana oturumdadır, `TaskStop` aracıyla verilir.
Statusline'ın kayıp ajan eşiği de 10 dakikadır; ikisini birlikte değiştir.

**autocompact** — `settings.json` içindeki `autoCompactWindow`, yani otomatik sıkıştırmanın
hangi token doluluğunda tetikleneceği. Eşik konfor ayarı değil maliyet ayarıdır: pencere
büyüdükçe her istek daha çok bağlam taşır. `eco` seçen kullanıcı ucuz istek istemiştir,
geniş pencere o kararı sessizce iptal ederdi. Bu yüzden profile bağlıdır.

**Ölçüldü (23.08.2026, `claude.exe` 2.1.241 üzerinden):** şema `int().min(1e5).max(1e6)` —
yani geçerli aralık **100000–1000000**, ondalık yok. Aralık dışındaki değer hata vermez,
şema `.catch(void 0)` ile onu **sessizce düşürür** ve pencere `auto`ya döner; bu yüzden
`/autocompact` aralık dışını yazmadan önce durur. CLI karşılığı `--autocompact <auto|tokens>`.

Üç profilin değeri:

- **eco `100000`** — şemanın izin verdiği en küçük pencere. En erken sıkıştırma, en ucuz istek.
- **normal `auto`** — anahtar `settings.json`'a **hiç yazılmaz**. Claude Code'un kendi
  varsayılanı modele göre pencere seçer; `/config` ekranı bunu ezmeyi "yüksek token
  kullanımına yol açabilir" diye işaretler. Taban profil satıcı varsayılanının dışına çıkmaz.
- **premium `1000000`** — şemanın tavanı. "Token bütçesi kısıt olmaktan çıkar" felsefesinin
  karşılığı. **Fiili pencere modelin bağlam penceresiyle sınırlıdır:** Opus'ta ~200k, 1M
  bağlam açık Sonnet'te gerçekten 1M. Yani `1000000` yazmak "modelin verdiği en genişi kullan"
  demektir, 1M garantisi değil.

**Max 20x uyarısı.** Bu abonelikte kısıt token faturası değil oturum limitleridir. Geniş
pencere limitleri daha hızlı tüketir — premium'da erken limite takılıyorsan ilk bakılacak
düğme budur.

**`CLAUDE_CODE_AUTO_COMPACT_WINDOW` ortam değişkeni ayarı ezer.** Set edilmişse `settings.json`
ne yazarsa yazsın etkisi olmaz; `/premium durum` ve `/autocompact` bunu tek satırla söyler.

Modele hiç yazılmaz; `agent_stall` gibi bunu da kanca değil koşum ortamı okur. **Makine
genelidir:** oturuma inen profil (`/premium eco`) ajan modellerini değiştirir ama bu pencereyi
değiştirmez, çünkü koşum ortamı değeri oturum açılışında okur. Pencereyi gerçekten oynatmak
makine kararıdır — `/premium <profil> --genel` ya da `/autocompact`.

**agent_loop** — ajan ilerliyor ama aynı yerde: `last_action` bu sayı kadar üst üste aynı
kalır ve ajanın transkript dosyası bu sırada büyümeye devam ederse döngü sayılır. Büyüme
şartı takılmayı döngüden ayırır: transkript büyümüyorsa ajan dönmüyor, susuyor demektir —
o durumu `agent_stall` yakalar. Bildirim ve günlük kaydı `agent_stall` ile aynı yoldan gider.

Bu iki düğme `steering` 0 olmadıkça çalışır ve `debug` bayrağından bağımsızdır.

**Hook bildirimleri** bu düğmeden bağımsızdır ve buradan değil, `~/.claude/teknesyum.json`
içindeki `steering` alanından yönetilir — makine başına tek ayar, proje değil kullanıcı
tercihi olduğu için:

| steering | Ne görürsün |
|---|---|
| `0` | Hiç `Teknesyum ▸` satırı yok. Base sessizce çalışır. |
| `1` | Temel yönlenmeler: oturum açılışı, görev dağıtımı, ajan bitişi, ölçü satırı. Varsayılan. |
| `2` | Hepsi + `Teknesyum ▸ Fark ▸ …` satırları: base olmasaydı farklı sonuçlanacak her karar. |

**Dil** de aynı dosyadadır: `dil` alanı `en` (varsayılan) ya da `tr`. Tek alan iki
yeri birden yönetir — kullanıcıya çıkan bildirimler ve ajanların birbirine yazdığı metin
(sözleşme, rapor, kayıt noktası, engel açıklaması). `TEKNESYUM_DIL=en|tr` tek oturumluk
ezer. Geçersiz değer `en` sayılır.

`/setup` sorar ve yazar. `TEKNESYUM_SESSIZ=1` hâlâ 0'a eşdeğerdir, `TEKNESYUM_STEERING=0|1|2`
tek oturumluk ezer. Satırların çoğunu hook basar — model unutsa da gelir, ölçülmüş olaydandır.

## Üç profil

Yukarıdaki blok **taban**dır: `normal` profilin değerleridir ve `/premium` ona dokunmaz.
Profil oturuma yazılır (`~/.claude/teknesyum/oturumlar/<oturum>.json`), tabandan sapan
düğmeleri de oturumun enjeksiyonuyla taşır. Böylece iki pencere aynı makinede iki farklı
profille çalışabilir; eskiden üçü aynı dosyaya yazıldığı için son çalışan komut ötekini
eziyordu.

Ajan frontmatter'ı da tabandır: `effort` ve `maxTurns` `normal` değerlerinde donar,
`model` alanı dosyalarda hiç yoktur — modeli her çağrıda T0 geçer ve çağrı anındaki
değer frontmatter'ı ezer. `effort` çağrı anında geçilemediği için **oturuma izole
edilemez**; premium farkını `model` taşır, efor ikinci derece kaldıraçtır.

| Düğme | eco | normal | premium |
|---|---|---|---|
| `default_model` | haiku | sonnet | opus |
| `parallel_width` | 1 | 2 | 20 |
| `worktree_isolation` | off | off | on |
| `model_escalation` | on | on | off |
| `audit` | very-critical | critical | high |
| `fix_ceiling` | 3 | 5 | 8 |
| `report_length` | short | short | detailed |
| `briefing` | quiet | milestone | every-step |
| `plan_council` | off | off | on — fable + opus |
| `second_opinion` | off | off | on — fable |
| `research_repos` | 1 | 10 | 50 |
| `agent_stall` | 10 | 10 | 10 |
| `agent_loop` | 5 | 5 | 5 |
| `autocompact` | 100000 | auto | 1000000 |

**normal** varsayılandır ve eski `standart` profilin aynısıdır — yalnız adı değişti.
`/premium kapat` hâlâ buraya götürür.

Bu tablo yalnız neyin nasıl çalışacağını değil, **neyin sertifika sayılacağını** da
belirler: `/scan <profil>` projenin şu anki halini bu düğmelere karşı denetler. Ölçüyü
yaptığı yer `scripts/tarama.js`'tir ve eşikleri buradan değil, bu satırları yazan
`scripts/premium.js` içindeki `DUGME` tablosundan okur — düğme ile sertifika aynı sayıyı
görmek zorunda. Denetimin "hangi dosya incelendi" sorusuna `.claude/relay/kapsam.json`
cevap verir; kayıt ajan bitişinde ve ana oturumun her düzenlemesinde kendiliğinden düşer,
`live/` gibi süpürülmez.

**premium**, Max 20x planı içindir: token bütçesi kısıt olmaktan çıkar, sonnet ve haiku
tamamen bırakılır, efor tavanı `xhigh` olur. Tek istisna `advisor`: modeli `fable`,
eforu `low`. Danışma sık olacaksa ucuz olmak zorundadır.

**eco**, token'ın gerçekten kısıt olduğu profildir. Felsefesi tek cümle: **token tasarrufu
önceliği en yüksek, hız ve verimlilik ondan feda edilebilir.** Feda edilmeyen şey
doğruluktur — eco yavaş ve daha az zarif olabilir, yanlış olamaz. Bu yüzden denetim,
mühür kapısı, `owns` disiplini ve kabul kriteri eco'da da aynen durur.

Her ajan `haiku` çalışır; efor kod
üreten ve denetleyen üç rolde (`builder`, `ui-builder`, `auditor`) `medium`, kalanında
`low`. Sebebi: haiku maliyeti zaten bir mertebe düşürüyor, kod yazan rolü bunun üstüne
`low`'a indirmek kabul kriterini geçmeyen iş üretir ve harcanan tur kazanılan tokenden
pahalıya gelir. `audit` `critical`'e düşer — eco'nun en büyük tasarruf kolu ajan
sayısıdır, denetim ajanı sözleşme başına ikinci ajandır. `model_escalation` açık kalır:
haiku'nun yetmediği sözleşmede tur harcamak yerine modeli yükseltmek eco'da daha da
önemlidir. `fix_ceiling` 3'tür, `briefing` `quiet`'tir. `research_repos` 1'e iner: ön
araştırma ajan sayısıyla çarpılan tek kalemdir ve eco'nun kestiği ilk şey odur.

Üç profilde de değişmeyen şey deterministik araç tercihidir — `biome`, `rg`, `sed`
modelden ucuz olduğu için değil daha doğru olduğu için seçilir. `/premium durum`
yürürlükteki profili söyler, `TEKNESYUM_PREMIUM=1|0` tek oturumluk ezer.

`~/.claude/teknesyum.json` profili `profil` alanında tutar: `eco` · `normal` · `premium`.
Alan yoksa eski `premium` bayrağı okunur — `true` premium, gerisi normal sayılır. Betik
yazarken ikisini birlikte yazar, böylece eski bayrağı okuyan kanca bozulmaz.

## Kural

Kullanılmayan düğmeyi sil. On düğme anlaşılır, otuz düğme anlaşılmaz.
Yeni düğme eklemeden önce sor: bunu gerçekten iki farklı projede farklı ayarlayacak mıyım?
