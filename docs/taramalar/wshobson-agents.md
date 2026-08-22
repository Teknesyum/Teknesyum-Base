# wshobson/agents — 91 eklentilik üretim hattı

Karşılaştırma tabanı: bizde 7 alt ajan, ortalama **3.324 B** (planner 4.220, auditor 3.953,
scout 3.534, builder 3.443, advisor 3.265, ui-builder 2.619, scribe 2.236).

## 1. Ne yapıyor, hangi problemi çözüyor

Alan uzmanı alt ajanların, komutların ve skill'lerin toplu koleksiyonu; Claude Code
marketplace'i olarak kuruluyor. "Her iş için bir uzman ajan" yaklaşımının en büyük
örneklerinden biri. Bizim `teknesyum/agents/` klasörünün 29 katı hacimde aynı fikir.

API verileri (2026-08-22): son push `2026-08-18T15:56:45Z`, 39.018 yıldız,
**9 açık issue**, **MIT**. Etiketli sürüm sorgulanmadı (`releases/latest` çağrılmadı —
`doğrulanamadı`).

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök: `plugins/` (91 eklenti), `tools/`, `docs/`, `.claude-plugin/`, `.cursor-plugin/`,
`.agents/`, `ARCHITECTURE.md`, `CLAUDE.md`, `AGENTS.md`, `Makefile`.
Toplam **1.156 dosya / 7.825.436 B**.

Ölçüm (gh api git/trees, bayt):

| Tür | Adet | Toplam | Ortalama | En büyük | En küçük |
|---|---|---|---|---|---|
| agent `.md` | 202 | 1.364.901 | 6.757 | 18.364 | 797 |
| `SKILL.md` | 181 | 1.028.117 | 5.680 | 26.448 | 1.375 |
| command `.md` | 105 | 1.486.096 | **14.153** | 49.294 | 274 |

`marketplace.json` 45.343 B; aynı katalog `.agents/plugins/marketplace.json` (38.497 B)
ve `.cursor-plugin/marketplace.json` (35.932 B) olarak iki kez daha üretilmiş.
`docs/agents.md` 30.456 B, `docs/agent-skills.md` 35.339 B.

Sınır: içerik 91 ayrı eklentiye bölünmüş, kullanıcı yalnız ihtiyacı olanı kuruyor.
Bölünme birimi **skill değil eklenti** — bu, her zaman yüklenen metadata yüzeyini
kurulan eklenti sayısıyla orantılı tutuyor.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Üretim hattı.** İçerik elle değil `tools/` altındaki jeneratör ve doğrulayıcılarla
çoğaltılıyor: `tools/validate_generated.py` 32.255 B, `tools/adapters/codex.py` 27.897 B,
`tools/tests/test_adapters.py` 66.014 B, tepede `Makefile`. Aynı kaynak Claude, Cursor ve
`.agents` biçimlerine dönüştürülüyor; üç marketplace.json bu yüzden var.

Bu, ölçek sorununun çözümü: 202 ajan + 181 skill + 105 komut elle tutarlı tutulamaz.
Bizde 36 markdown var ve elle tutuluyor — ölçek eşiği henüz aşılmamış, ama
`teknesyum/agents` ve `teknesyum/commands` çoğaldıkça aynı duvara çarpılır.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Marketplace ekle, istediğin eklentiyi kur. Katalog 45 KB'lık JSON — arayüzde listeleniyor,
bağlama girmiyor. `ARCHITECTURE.md` ve `CONTRIBUTING.md` var; katkı akışı `Makefile` +
doğrulayıcı üzerinden, yani eklenen dosya biçim testinden geçmeden girmiyor.

## 5. Alınmaya değer en fazla 3 fikir

**1. Komut dosyalarına tavan koy — burada ortalama 14.153 B ve bu yanlış tarafı.**
Ne: komutlar bu depoda en şişkin katman (ort. 14.153 B, en büyük 49.294 B). Komut
çağrıldığında gövdesi doğrudan bağlama giriyor, üstelik skill gibi tembel değil.
Bizde `commands/premium.md` 7.291 B, `setup.md` 6.047 B, `scan.md` 3.597 B,
`report.md` 3.475 B — ortalama ~3 KB, yani iyi durumdayız; ama yazılı tavan yok.
Neden değerli: `/help` (3.081 B) gibi sık çağrılan komutlar için 2 KB tavanı koymak
oturum başına doğrudan tasarruf.
Maliyet: bir kural satırı + boyut kontrolü; test'e bağlanabilir.

**2. Bölünme birimini "eklenti" yap, kullanıcı yalnız kullandığını kursun.**
Ne: 91 eklenti, 181 skill; hiç kimse hepsini kurmuyor. Her zaman yüklenen metadata,
kurulu eklenti sayısıyla orantılı.
Neden değerli: bizde tek eklenti içinde her şey açık — relay, ui ve tüm komutlar birlikte
geliyor. Kullanıcı yalnız UI işi yapıyorsa relay'in 53 KB'lık gövdesi ve tüm komut
tanımları yine de tetiklenebilir durumda duruyor.
Maliyet: `teknesyum/` içeriğini iki-üç eklentiye bölmek; kurulum ve `/setup` akışı
değişir, README yeniden yazılır. Pahalı, ama ölçeklenebilir tek yol.

**3. Türetilmiş dosyaları üret, elle yazma.**
Ne: 202 ajan + 181 skill tek kaynaktan üç hedef biçime dönüştürülüyor
(`tools/adapters/`, `validate_generated.py` 32.255 B, testler 66.014 B).
Neden değerli: bizde `AGENTS.md` + tek satırlık `CLAUDE.md` ikilisi zaten elle
çoğaltılıyor; jeneratör bunu deterministik hâle getirir ve model kullanmadan yapar.
Maliyet: küçük bir script; asıl maliyet doğrulayıcıyı yazmak.

## 6. Şüpheli/riskli yanlar

- **Lisans MIT**, temiz. Marka koruması ayrıca belirtilmemiş.
- **9 açık issue / 39.018 yıldız** — oran alışılmadık derecede düşük; issue'ların
  kapatılma politikası bilinmiyor, "sorunsuz" diye okunmamalı (`doğrulanamadı`).
- **Son etiketli sürüm sorgulanmadı** — bu taramada `releases/latest` çağrılmadı.
- **Şişkinlik burada.** Tek komut dosyası 49.294 B (`cost-optimize.md`) ≈ 12.000 token;
  çağrıldığı anda bağlama giriyor. 105 komutun toplamı 1,49 MB.
- **Üçe katlanmış katalog:** aynı marketplace verisi 45.343 + 38.497 + 35.932 B olarak
  üç dosyada. Jeneratör olmasa sürüklenme kaçınılmaz.
- **Gizli maliyet:** `tools/` Python bağımlılığı getiriyor (`uv.lock` 341.047 B ve
  182.165 B). Katkı vermek isteyen ayrı bir çalışma zamanı kurmak zorunda.

## Kaynaklar

- `gh api repos/wshobson/agents` — push, yıldız, issue, lisans (2026-08-22)
- `gh api repos/wshobson/agents/git/trees/HEAD?recursive=1` — ajan/skill/komut boyut istatistikleri
- `gh api repos/wshobson/agents/contents/plugins` — 91 eklenti
- Yerel karşılaştırma: `teknesyum/agents/*.md` ve `teknesyum/commands/*.md` boyutları
