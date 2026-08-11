---
description: Yeni proje için relay iskeletini ve neon tema paketini kurar
argument-hint: <proje adı> — <ne yapacak> [stack]
---

`relay` ve `teknesyum-ui` skill'lerini yükle, `AYAR.md`'yi oku, sonra:

Proje: $ARGUMENTS

1. Stack belirtilmemişse mevcut klasöre bakıp çıkar; çıkaramıyorsan **tek soru** sor.
2. `.claude/relay/` kur: `PLAN.md`, boş `LOG.md`, `contracts/done/`.
3. `PLAN.md`'yi doldur — hedef, kısıtlar, görev grafiği, rol+model dağılımı, bitti tanımı.
   Görevleri gerçekten böl: 3-8 dosyalık, tek tutarlı yetenek. 5-9 sözleşme hedefle.
4. Her görev için `contracts/T<n>.md` üret. UI içerenlerin `rol`'ü `usta-arayuz`.
   `Bağlam` bölümüne ajanın keşifle bulacağı tespitleri sen yaz.
5. Tema paketini kur (stack'e uygun dosyayı `teknesyum-ui/assets/`'ten kopyala),
   imza bloğunu ayarlar/hakkında bölümüne yerleştir.
6. Kök `CLAUDE.md` yaz: komutlar, mimari özet, klasör haritası, relay dizinine işaret.
   Ayrıca compact talimatı ekle.
7. `LOG.md`'ye ilk satır.

Sonra planı **tek ekranda** özetle: görev tablosu + rol/model + ilk adım.
`onay_kapisi: yok` ise onay bekleme, ilk sözleşmeyi dağıt.
