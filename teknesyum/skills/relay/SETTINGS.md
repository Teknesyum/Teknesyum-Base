# Relay ayarları

Davranış düğmeleri. Değiştirmek için satırı düzenle — skill her yüklendiğinde okunur.
Proje bazında ezmek için `.claude/relay/SETTINGS.md` oluştur; oradaki satırlar buradakini geçer.

```
ask_threshold      : critical       # never | critical | ambiguity | often
approval_gate      : none           # none | plan | every-contract
audit              : every-contract # off | critical | every-contract
fix_ceiling        : 5              # kaç tur sonra karar sana gelir
model_escalation   : on             # on | off
parallel_width     : 2              # eşzamanlı ajan tavanı — eco 1 · normal 2 · premium 20
default_model      : sonnet         # haiku | sonnet | opus
worktree_isolation : off            # on | off
report_length      : short          # short | normal | detailed
briefing           : milestone      # quiet | milestone | every-step
plan_council       : off            # off | on — planı iki model bağımsız önerir
second_opinion     : off            # off | on — karar düğümünde fable kısa görüş verir
research_repos     : 10             # ön araştırmada taranacak en az depo sayısı
agent_stall        : 10             # kaç dakika sessiz kalan ajan bildirilir
agent_loop         : 5              # aynı eylem kaç kez üst üste tekrarlarsa döngü sayılır
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

**audit** — `auditor` ne zaman çalışır.
`critical` = güvenlik, veri kaybı, mimari sınır veya 3+ dosya değiştiren sözleşmeler.
Varsayılan `every-contract`: ilk gerçek testte bir ajan kabul kriterini eksik karşılayıp
Çıktı'sında "temiz" raporladı ve `critical` ayarıyla hiç denetlenmeyecekti. Ajan raporu
denetim yerine geçmez. `critical`'e ancak ölçüp güvendikten sonra düş.

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
sentezler ve planı kendisi yazar. Ayrıntı relay SKILL §1.5.

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
kapalıdır, premiumda açılır. Hangi dokuz durumda tetiklendiği relay SKILL §1.5.1.

**research_repos** — ön araştırmada (SKILL §1.4) taranacak en az depo sayısı. eco
profilinde 5, normal profilde 10, premium profilde 50. Elli depo, on depoyla aynı
derinlikte okunmaz: ilk tarama tabakası sığdır, konsey ve planlama derinleşeceği yeri
kendi seçer. Beş depo kapıyı kapatmaz, yalnız daraltır — atlamanın gerekçesi hâlâ
`docs/taramalar/ATLANDI.md` dosyasına yazılır.

**agent_stall** — bir ajan kaç dakika olay üretmezse sağlıksız sayılır. Kanca her ajanın
`live/<agent_id>.json` kaydındaki `last_seen` alanına bakar; süre dolmuş ve `SubagentStop`
gelmemişse ana oturuma tek satır bildirim çıkar ve `live/_sorun.log` dosyasına yazılır.
Kanca ajanı durduramaz — durdurma kararı ana oturumdadır, `TaskStop` aracıyla verilir.
Statusline'ın kayıp ajan eşiği de 10 dakikadır; ikisini birlikte değiştir.

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

Yukarıdaki blok üç profilden birini taşır ve elle değil `/premium` ile değiştirilir —
düğmeler, ajan frontmatter'ı ve `~/.claude/teknesyum.json` birlikte yazılır, üçü ayrı
düşerse ölçü tutmaz.

| Düğme | eco | normal | premium |
|---|---|---|---|
| `default_model` | haiku | sonnet | opus |
| `parallel_width` | 1 | 2 | 20 |
| `worktree_isolation` | off | off | on |
| `model_escalation` | on | on | off |
| `audit` | critical | every-contract | every-contract |
| `fix_ceiling` | 3 | 5 | 8 |
| `report_length` | short | short | detailed |
| `briefing` | quiet | milestone | every-step |
| `plan_council` | off | off | on — fable + opus |
| `second_opinion` | off | off | on — fable |
| `research_repos` | 5 | 10 | 50 |
| `agent_stall` | 10 | 10 | 10 |
| `agent_loop` | 5 | 5 | 5 |

**normal** varsayılandır ve eski `standart` profilin aynısıdır — yalnız adı değişti.
`/premium kapat` hâlâ buraya götürür.

**premium**, Max 20x planı içindir: token bütçesi kısıt olmaktan çıkar, sonnet ve haiku
tamamen bırakılır, efor tavanı `xhigh` olur. Tek istisna `advisor`: modeli `fable`,
eforu `low`. Danışma sık olacaksa ucuz olmak zorundadır.

**eco**, token'ın gerçekten kısıt olduğu profildir. Her ajan `haiku` çalışır; efor kod
üreten ve denetleyen üç rolde (`builder`, `ui-builder`, `auditor`) `medium`, kalanında
`low`. Sebebi: haiku maliyeti zaten bir mertebe düşürüyor, kod yazan rolü bunun üstüne
`low`'a indirmek kabul kriterini geçmeyen iş üretir ve harcanan tur kazanılan tokenden
pahalıya gelir. `audit` `critical`'e düşer — eco'nun en büyük tasarruf kolu ajan
sayısıdır, denetim ajanı sözleşme başına ikinci ajandır. `model_escalation` açık kalır:
haiku'nun yetmediği sözleşmede tur harcamak yerine modeli yükseltmek eco'da daha da
önemlidir. `fix_ceiling` 3'tür, `briefing` `quiet`'tir.

Üç profilde de değişmeyen şey deterministik araç tercihidir — `biome`, `rg`, `sed`
modelden ucuz olduğu için değil daha doğru olduğu için seçilir. `/premium durum`
yürürlükteki profili söyler, `TEKNESYUM_PREMIUM=1|0` tek oturumluk ezer.

`~/.claude/teknesyum.json` profili `profil` alanında tutar: `eco` · `normal` · `premium`.
Alan yoksa eski `premium` bayrağı okunur — `true` premium, gerisi normal sayılır. Betik
yazarken ikisini birlikte yazar, böylece eski bayrağı okuyan kanca bozulmaz.

## Kural

Kullanılmayan düğmeyi sil. On düğme anlaşılır, otuz düğme anlaşılmaz.
Yeni düğme eklemeden önce sor: bunu gerçekten iki farklı projede farklı ayarlayacak mıyım?
