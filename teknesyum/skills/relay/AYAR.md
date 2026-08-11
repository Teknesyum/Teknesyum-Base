# Relay ayarları

Davranış düğmeleri. Değiştirmek için satırı düzenle — skill her yüklendiğinde okunur.
Proje bazında ezmek için `.claude/relay/AYAR.md` oluştur; oradaki satırlar buradakini geçer.

```
soru_esigi          : kritik      # asla | kritik | belirsizlik | sik
onay_kapisi         : yok         # yok | plan-onayi | her-sozlesme
denetim             : her-sozlesme # kapali | kritik | her-sozlesme
duzeltme_tavani     : 5           # kaç tur sonra karar sana gelir
model_tirmanisi     : acik        # acik | kapali
paralel_genislik    : 2           # eşzamanlı ajan sayısı (1-3)
varsayilan_model    : sonnet      # haiku | sonnet | opus
worktree_izolasyonu : kapali      # acik | kapali
rapor_uzunlugu      : kisa        # kisa | normal | ayrintili
```

## Anlamları

**soru_esigi** — ajan ne zaman durup sorar.
`asla` hiç sormaz, eksik bilgiyi varsayımla doldurup Çıktı'ya yazar ·
`kritik` sadece geri dönüşü olmayan veya veri kaybettirecek durumda ·
`belirsizlik` sözleşme iki farklı şekilde okunabiliyorsa da sorar ·
`sik` her mimari seçimde onay bekler.

**onay_kapisi** — T0 sana ne zaman durur.
`yok` planı yapar ve başlar · `plan-onayi` PLAN.md'yi onaylatır ·
`her-sozlesme` her sözleşmeyi dağıtmadan önce gösterir.

**denetim** — `denetci` ne zaman çalışır.
`kritik` = güvenlik, veri kaybı, mimari sınır veya 3+ dosya değiştiren sözleşmeler.
Varsayılan `her-sozlesme`: ilk gerçek testte bir ajan kabul kriterini eksik karşılayıp
Çıktı'sında "temiz" raporladı ve `kritik` ayarıyla hiç denetlenmeyecekti. Ajan raporu
denetim yerine geçmez. `kritik`'e ancak ölçüp güvendikten sonra düş.

**duzeltme_tavani** — kabul kriteri geçmezse: tur 1-3 aynı ajan devam ettirilir
(`SendMessage`), tur 4-5 taze ajan atanır. Tavana gelince karar sana sorulur.

**model_tirmanisi** — `acik` ise 3. turda çözülmeyen sözleşme bir üst modele çıkar
(haiku→sonnet→opus). Sorun modelin seviyesindeyse tur harcamayı keser.

**paralel_genislik** — `owns` kümeleri kesişmeyen sözleşmeler için tavan. 3'ü aşma;
her paralel ajan tam dispatch maliyeti taşır.

**worktree_izolasyonu** — `acik` ise ajanlar `isolation: worktree` ile reponun izole
kopyasında çalışır. Paralel çakışmayı dosya sisteminde çözer, ama her ajana repo
kopyası maliyeti çıkarır. Sadece 3 paralel ajanda ve büyük projede aç.

**rapor_uzunlugu** — ajanın T0'a dönen raporu. `kisa` = değişen dosyalar + tek paragraf.

## Kural

Kullanılmayan düğmeyi sil. Dokuz düğme anlaşılır, otuz düğme anlaşılmaz.
Yeni düğme eklemeden önce sor: bunu gerçekten iki farklı projede farklı ayarlayacak mıyım?
