---
description: Yeni bir huy/kural kaydeder — doğru katmana yazar
argument-hint: <kural veya takıldığın şey>
allowed-tools: Read, Edit, Write
---

Kaydedilecek: $ARGUMENTS

Argüman boşsa: bu oturumda beni düzelttiğin veya tercihini belirttiğin anları tara,
aday kuralı tek cümlede çıkar ve onaylat.

Doğru katmana yaz:
- İstisnasız her işte geçerli → `~/.claude/CLAUDE.md` (25 satır tavanı)
- Tekrar eden takıntı / tökezleme → `~/.claude/HUYLAR.md` (30 satır tavanı)
- Bir davranış ayarı ise (soru sıklığı, denetim, model) → `skills/relay/AYAR.md` düğmesi
- Sadece arayüz işinde → `skills/teknesyum-ui/SKILL.md`
- Sadece görev dağıtımında → `skills/relay/SKILL.md`
- Sadece belirli bir stack'te → ilgili stack skill'i (yoksa kur)

Tavan doluysa yeni satır ekleme: en zayıf kuralla birleştir veya sil, ne yaptığını söyle.
Kural emir kipinde ve tek satır olsun. Yazdıktan sonra sadece "→ <dosya>: <kural>" bas.

**Sadece ben istediğimde çalışır.** Kendiliğinden huy çıkarma, tarz analizi yapma.
