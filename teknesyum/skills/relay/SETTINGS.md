# Relay ayarları

Davranış düğmeleri. Değiştirmek için satırı düzenle — skill her yüklendiğinde okunur.
Proje bazında ezmek için `.claude/relay/SETTINGS.md` oluştur; oradaki satırlar buradakini geçer.

```
ask_threshold          : kritik      # never | critical | ambiguity | often
approval_gate         : yok         # none | plan | every-contract
denetim             : her-sozlesme # off | critical | every-contract
fix_ceiling     : 5           # kaç tur sonra karar sana gelir
model_escalation     : acik        # on | off
parallel_width    : 2           # eşzamanlı ajan sayısı (1-3)
default_model    : sonnet      # haiku | sonnet | opus
worktree_isolation : kapali      # on | off
report_length      : kisa        # short | normal | detailed
briefing       : donum-noktasi # quiet | milestone | every-step
```

## Anlamları

**ask_threshold** — ajan ne zaman durup sorar.
`asla` hiç sormaz, eksik bilgiyi varsayımla doldurup Çıktı'ya yazar ·
`kritik` sadece geri dönüşü olmayan veya veri kaybettirecek durumda ·
`belirsizlik` sözleşme iki farklı şekilde okunabiliyorsa da sorar ·
`sik` her mimari seçimde onay bekler.

**approval_gate** — T0 sana ne zaman durur.
`yok` planı yapar ve başlar · `plan-onayi` PLAN.md'yi onaylatır ·
`her-sozlesme` her sözleşmeyi dağıtmadan önce gösterir.

**denetim** — `auditor` ne zaman çalışır.
`kritik` = güvenlik, veri kaybı, mimari sınır veya 3+ dosya değiştiren sözleşmeler.
Varsayılan `her-sozlesme`: ilk gerçek testte bir ajan kabul kriterini eksik karşılayıp
Çıktı'sında "temiz" raporladı ve `kritik` ayarıyla hiç denetlenmeyecekti. Ajan raporu
denetim yerine geçmez. `kritik`'e ancak ölçüp güvendikten sonra düş.

**fix_ceiling** — kabul kriteri geçmezse: tur 1-3 aynı ajan devam ettirilir
(`SendMessage`), tur 4-5 taze ajan atanır. Tavana gelince karar sana sorulur.

**model_escalation** — `acik` ise 3 tur sonunda çözülmeyen sözleşme, **4. turda açılan
taze ajanla** bir üst modele çıkar (haiku→sonnet→opus). Sorun modelin seviyesindeyse tur
harcamayı keser. Devam ettirilen ajanın modeli değiştirilemez, bu yüzden tırmanış hep
taze ajanla gelir.

**parallel_width** — `owns` kümeleri kesişmeyen sözleşmeler için tavan. 3'ü aşma;
her paralel ajan tam dispatch maliyeti taşır.

**worktree_isolation** — `acik` ise ajanlar `isolation: worktree` ile reponun izole
kopyasında çalışır. Paralel çakışmayı dosya sisteminde çözer, ama her ajana repo
kopyası maliyeti çıkarır. Sadece 3 paralel ajanda ve büyük projede aç.

**report_length** — ajanın T0'a dönen raporu. `kisa` = değişen dosyalar + tek paragraf.
Bu düğme **ajan→T0** trafiğini ayarlar, sana gösterileni değil.

**briefing** — T0'ın **sana** ne sıklıkta rapor verdiği (`protocol.md` §8).
`donum-noktasi` varsayılan: açılış brifingi, her sözleşme kapanışı, her dalga sonu ara
raporu, sapma anı, kapanış raporu · `her-adim` ajan başlangıçlarını ve düzeltme turlarını
da ekler, uzun işte gürültü yapar · `sessiz` yalnızca brifing, sapma ve kapanış; gerisini
`/report` ile sen istersin. Hiçbir değerde sapma bildirimi kapanmaz.

`approval_gate` ile karıştırma: o **beklemeyi**, bu **anlatmayı** yönetir.

**Hook bildirimleri** bu düğmeden bağımsızdır. `Adamantium ▸ …` satırlarını hook basar:
oturum açılışı, her görev dağıtımı, her ajan bitişi. Modelin unutabileceği bir şey değil,
ölçülmüş olaydan gelir. Kapatmak için ortam değişkeni: `TEKNESYUM_SESSIZ=1`.

## Kural

Kullanılmayan düğmeyi sil. Dokuz düğme anlaşılır, otuz düğme anlaşılmaz.
Yeni düğme eklemeden önce sor: bunu gerçekten iki farklı projede farklı ayarlayacak mıyım?
