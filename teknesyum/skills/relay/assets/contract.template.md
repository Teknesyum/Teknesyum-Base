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
borc: []
---
## Amaç
<tek paragraf: ne yapılacak, neden gerekli>

## Kabul kriteri
- [ ] <ölçülebilir, doğrulanabilir madde>
      CHECK: <geçti/kaldı yapan kabuk komutu>
      EXPECT: <çıktıda aranan dizgi — isteğe bağlı>
- [ ] <gözle doğrulanan madde — CHECK yazılamıyorsa satır hiç konmaz>

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
(`audit: passed`, `auditor_id`, `diff`, `verification`) işler, denetim kaydını
`.claude/relay/audits/` altına yazar ve `contract.js complete --id <ID>` çalıştırır.
Başka hiçbir yolla done/ altına girilmez. Ajan done/'a taşımaz.

eco profilinde bu şablon kısalır. Şablon ikiye ayrılmaz; T0 doldururken düşürür.
Asla düşmeyenler: `id` · `status` · `owns` · mühür alanları · `## Kabul kriteri` ·
`## Kayıt noktası` · `## Çıktı`. Doğruluk ve kurtarma bunlardan gelir.
eco'da düşenler:
- `## Amaç` — başlık ve kabul kriteri işi zaten anlatıyorsa.
- `## Arayüzler` — yalnızca `depends: []` iken. Bağımlılık varsa kalır; imzayı ajana
  aratmak yazmaktan pahalıdır.
- boş `side_effects` satırı ve bu yorum bloğunun kendisi.
- `## Bağlam` düşmez, 3 satırla sınırlanır: bir `Oku`, bir `Tespit`, gerekiyorsa `Kural`.
-->

