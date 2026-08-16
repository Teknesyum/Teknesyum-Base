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

**parallel_width** — `owns` kümeleri kesişmeyen sözleşmeler için tavan. 3'ü aşma;
her paralel ajan tam dispatch maliyeti taşır.

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

**Hook bildirimleri** bu düğmeden bağımsızdır. `Teknesyum ▸ …` satırlarını hook basar:
oturum açılışı, her görev dağıtımı, her ajan bitişi. Modelin unutabileceği bir şey değil,
ölçülmüş olaydan gelir. Kapatmak için ortam değişkeni: `TEKNESYUM_SESSIZ=1`.

## Kural

Kullanılmayan düğmeyi sil. On düğme anlaşılır, otuz düğme anlaşılmaz.
Yeni düğme eklemeden önce sor: bunu gerçekten iki farklı projede farklı ayarlayacak mıyım?
