---
id: T<n>
title: <kısa başlık>
role: builder | ui-builder | scribe
model: haiku | sonnet | opus
depends: []
owns: []
side_effects: []
status: open
round: 0
agent_id: —
audit: —
auditor_id: —
diff: —
verification: —
---
## Amaç
<tek paragraf: ne yapılacak, neden gerekli>

## Kabul kriteri
- [ ] <ölçülebilir, doğrulanabilir madde>
- [ ] <ölçülebilir, doğrulanabilir madde>

## Arayüzler
<önceki görevlerin ürettiği ve buraya dayanan imzalar — ajan bunları aramasın>
- `<fonksiyon/tip imzası>` — `<dosya>`

## Bağlam
- Oku: `<dar dosya yolu>` — <neden>
- Tespit: <ajanın keşifle bulacağı şeyi burada söyle>
- Kural: <varsa proje kısıtı>

## Kayıt noktası
henüz başlanmadı

## Çıktı
—

<!--
status: open → active → submitted → done
`submitted`'a kadar ajan yürütür. Sonrası T0'ındır: denetçi GEÇTİ derse T0 mührü
(`audit: passed`, `auditor_id`, `diff`, `verification`) işler ve dosyayı done/'a taşır.
Mühürsüz dosyanın done/ altına girmesini hook engeller. Ajan done/'a taşımaz.
-->

