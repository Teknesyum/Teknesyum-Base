# Relay ayarları

Davranış düğmeleri. Değiştirmek için satırı düzenle — skill her yüklendiğinde okunur.
Proje bazında ezmek için `.claude/relay/SETTINGS.md` oluştur; oradaki satırlar buradakini geçer.

```
ask_threshold      : critical       # never | critical | ambiguity | often
approval_gate      : none           # none | plan | every-contract
audit              : every-contract # off | critical | every-contract
fix_ceiling        : 5              # kaç tur sonra karar sana gelir
model_escalation   : on             # on | off
parallel_width     : 2              # eşzamanlı ajan sayısı (1-3)
default_model      : sonnet         # haiku | sonnet | opus
worktree_isolation : off            # on | off
report_length      : short          # short | normal | detailed
briefing           : milestone      # quiet | milestone | every-step
plan_council       : off            # off | on — planı iki model bağımsız önerir
research_repos     : 10             # ön araştırmada taranacak en az depo sayısı
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

**parallel_width** — `owns` kümeleri kesişmeyen sözleşmeler için tavan. Standart profilde
3'ü aşma; her paralel ajan tam dispatch maliyeti taşır. Premium profilde tavan 6'dır ve
3'ü geçtiğinde `worktree_isolation` kendiliğinden açılır.

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

**research_repos** — ön araştırmada (SKILL §1.4) taranacak en az depo sayısı. Standart
profilde 10, premium profilde 50. Elli depo, on depoyla aynı derinlikte okunmaz: ilk
tarama tabakası sığdır, konsey ve planlama derinleşeceği yeri kendi seçer.

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

## Premium profil

Yukarıdaki blok iki profilden birini taşır ve elle değil `/premium` ile değiştirilir —
düğmeler, ajan frontmatter'ı ve `~/.claude/teknesyum.json` birlikte yazılır, üçü ayrı
düşerse ölçü tutmaz.

| Düğme | Standart | Premium |
|---|---|---|
| `default_model` | sonnet | opus |
| `parallel_width` | 2 | 6 |
| `worktree_isolation` | off | on |
| `model_escalation` | on | off |
| `fix_ceiling` | 5 | 8 |
| `report_length` | short | detailed |
| `briefing` | milestone | every-step |
| `plan_council` | off | on — fable + opus |
| `research_repos` | 10 | 50 |

Premium, Max 20x planı içindir: token bütçesi kısıt olmaktan çıkar, sonnet ve haiku
tamamen bırakılır, efor tavanı `xhigh` olur. Değişmeyen tek şey deterministik araç
tercihidir — `biome`, `rg`, `sed` modelden ucuz olduğu için değil daha doğru olduğu için
seçilir. `/premium durum` yürürlükteki profili söyler, `TEKNESYUM_PREMIUM=1|0` tek
oturumluk ezer.

## Kural

Kullanılmayan düğmeyi sil. On düğme anlaşılır, otuz düğme anlaşılmaz.
Yeni düğme eklemeden önce sor: bunu gerçekten iki farklı projede farklı ayarlayacak mıyım?
