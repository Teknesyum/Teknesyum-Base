---
description: Otomatik sıkıştırma penceresini profilden türetir ya da elle bir değere sabitler
argument-hint: <100000-1000000> | auto | (boş — profilden türet)
allowed-tools: Bash
---

İstenen: $ARGUMENTS

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/premium.js" autocompact $ARGUMENTS
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/premium.js`
altındadır. Çıktıyı olduğu gibi bas, kendin `settings.json` düzenleme.

Argüman **boşsa** değer makine profilinden türer: `eco 100000` · `normal auto` · `premium
1000000`. Argüman **`auto`** ise anahtar `settings.json`'dan silinir ve Claude Code kendi
varsayılanına döner. Argüman bir **sayıysa** o değer yazılır ve profil bağı kopar — sonraki
profil değişimleri pencereyi geri almaz, tekrar bağlamak için komutu argümansız çalıştır.

**Geçerli aralık 100000–1000000.** Ölçüldü (23.08.2026, `claude.exe` 2.1.241): ayarın şeması
`int().min(1e5).max(1e6)` ve aralık dışını `.catch(void 0)` ile **sessizce düşürüyor** —
hata almazsın, pencere `auto`ya döner ve yazdığını sandığın değer hiç uygulanmaz. Komut bu
yüzden aralık dışını yazmadan önce durur.

**Pencere neden profile bağlı.** Sıkıştırma eşiği konfor ayarı değil maliyet ayarıdır:
pencere büyüdükçe her istek daha çok bağlam taşır. `eco` seçen kullanıcı ucuz istek
istemiştir, 1M'lik pencere o kararı sessizce iptal eder. Bu yüzden kurulum kendi başına bir
sayı seçmez — `/teknesyum:setup` önce profili sorar, pencere ondan çıkar.

**`1000000` bir garanti değil tavandır.** Fiili pencere modelin bağlam penceresiyle
sınırlıdır. **Opus 4.7 ve Sonnet 5'in yerel penceresi 1M'dir**; bir dönem burada "Opus'ta
~200k" yazıyordu ve yanlıştı (`docs/openlogs/kapali/HATA-200k-baglam-penceresi-iddiasi.md`). 200k
bugün varsayılan değil, **kapatılmış hâlin** sonucudur: `CLAUDE_CODE_DISABLE_1M_CONTEXT`
set edilmiştir, `CLAUDE_CODE_MAX_CONTEXT_TOKENS` elle kısılmıştır ya da model 1M
taşımıyordur. Premium'da bu değer
"modelin verdiği en genişi kullan" demektir.

**Max 20x'te kısıt token faturası değil oturum limitleridir.** Geniş pencere limitleri daha
hızlı tüketir; premium'da erken limite takılıyorsan ilk kısılacak düğme budur.

**`CLAUDE_CODE_AUTO_COMPACT_WINDOW` ortam değişkeni bu ayarı ezer.** Set edilmişse yazdığın
değerin etkisi olmaz; komut bunu çıktısında söyler, önce onu kaldır.

**Değer makine genelidir.** `settings.json`'a yazılır, çünkü koşum ortamı onu oturum
açılışında okur. Profilin kendisi oturuma inebilir (`/premium eco` yalnız o sohbeti
değiştirir) ama pencere inemez: oturum içi profil geçişi `autoCompactWindow`'a **dokunmaz**,
`/premium durum` bunu tek satırla söyler.

Kullanıcının kendi yazdığı bir değer varsa kurulum onu **ezmez**; bu komut ezer, çünkü
çağıran kullanıcının kendisidir.
