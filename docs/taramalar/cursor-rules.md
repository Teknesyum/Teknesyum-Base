# Cursor — .cursor/rules ve Arka Plan Ajanları

Karşılaştırma hedefi: Teknesyum Base (Claude Code eklentisi). Bizde kurallar iki
katmanda yaşıyor — her klasörde ≤20 satırlık yönlendirici `CLAUDE.md` ve
metadata'sı taranıp gövdesi etkinleşince yüklenen skill'ler (skill başına ~30 kB tavan).

## 1. Ne yapıyor, hangi problemi çözüyor

Cursor, VS Code tabanlı bir AI kod editörü; `.cursor/rules/*.mdc` sistemi
projeye özgü konvansiyonları (mimari, kod stili, yasaklı API'ler) kalıcı
context olarak ajana enjekte ediyor, böylece her promptta tekrar yazmaya
gerek kalmıyor. Cloud/background agent ise uzun süren görevleri yerel
makineden ayırıp bulut VM'de baştan sona çalıştırıyor.
([Cursor Docs — Rules](https://cursor.com/docs/rules), [Cursor Help — Background agents](https://cursor.com/help/ai-features/background-agents))

## 2. İş devri (handoff) nasıl oluyor

Ajan Ctrl+E, cursor.com/agents, Slack/GitHub/Linear @-bahsi veya zamanlanmış
tetikleyicilerle başlatılıyor; repo'yu kendi Ubuntu VM'ine klonluyor, ayrı bir
branch'te çalışıyor. Bitince sonucu bir **pull request** olarak sunuyor;
PR'a değişikliği doğrulayan video, ekran görüntüsü ve loglar ekliyor, böylece
kullanıcı dalı checkout etmeden doğrulayabiliyor. Uzak masaüstü kontrolüyle
üretilen yazılımı doğrudan da kullanabiliyorsunuz.
([Cursor Help — Background agents](https://cursor.com/help/ai-features/background-agents))

Bizim relay'de teslim ajan raporu + sözleşme dosyası üzerinden oluyor,
Cursor'da teslim birimi PR + kanıt eki. İkisi de "kontrol edilebilir çıktı"
ilkesini paylaşıyor ama Cursor'ınki repo barındırma platformuna (GitHub)
bağımlı.

## 3. Bağlam/token disiplini mekanizması

Dört kural türü var, hepsi `.mdc` frontmatter alanlarıyla tanımlanıyor:

- **Always Apply** (`alwaysApply: true`) — her sohbette otomatik yükleniyor,
  globs/description yok sayılıyor. Cursor kendi dokümanında bunun "her
  mesajda token tükettiğini" ve 20 satırın altında tutulması gerektiğini
  söylüyor.
- **Apply Intelligently** (`description` dolu, `alwaysApply: false`) — model
  description'ı okuyup ilgiliyse kuralı çekiyor; description zorunlu, globs
  opsiyonel.
- **Apply to Specific Files** (`globs` dolu) — context'e giren dosya glob'a
  uyuyorsa otomatik ekleniyor.
- **Apply Manually** — hiçbir otomatik tetik yok, yalnızca `@rule-name` ile
  sohbette çağrılıyor.

Kurallar 500 satırın altında tutulmalı, büyükse birden çok kurala
bölünmeli; dosya içeriğini kopyalamak yerine `@filename` referansı
öneriliyor. Ayrıca `AGENTS.md` iç içe (nested) dosyalar destekleniyor — alt
dizindeki daha spesifik talimat üst dizinin talimatını geçersiz kılıyor.
([Cursor Docs — Rules](https://cursor.com/docs/rules))

**Bizimle karşılaştırma:** Cursor'ın "Apply Intelligently" türü bizim
skill'lerin metadata-tarama / gövde-yükleme modeline en yakın parça —
description alanı bizim skill description'ımızın karşılığı. Fark:
- Cursor'da dört ayrı tetikleme modu (always/glob/description/manual) var,
  biz tek modelde (metadata her zaman görünür, gövde talep üzerine) çalışıyoruz.
- Cursor glob-tabanlı otomatik ekleme sunuyor (dosya türüne göre kural),
  bizde bunun doğrudan karşılığı yok — CLAUDE.md yönlendiricileri klasöre
  göre çalışıyor ama dosya uzantısına göre değil.
- İkisi de "her zaman açık" katmanı kısa tutmayı zorunlu görüyor (Cursor
  20 satır önerisi, biz ≤20 satır CLAUDE.md + skill başına ~30 kB tavan).
- Cursor'ın 500 satır / @filename referansı önerisi bizim "skill gövdesini
  şişirme, referansla" ilkemizle örtüşüyor.

## 4. Model disiplinine mi bırakıyor, mekanik mi uyguluyor

Karma yapı. Always Apply ve glob eşleşmesi **mekanik** — sistem kararı
almadan, koşul sağlanınca kural context'e giriyor. Apply Intelligently ise
**modelin kararına bağlı** — model description'ı okuyup relevance
değerlendiriyor ve kuralı yok sayabiliyor; "intelligent selection kesin
değildir" ifadesi resmi dokümanda geçmiyor ama pratikte topluluk
şikayetlerinin kaynağı bu (bkz. madde 6). Yani dosya-glob ve always-apply
katmanı deterministik, description-tabanlı katman modelin muhakemesine
teslim edilmiş.

## 5. Alınmaya değer en fazla 3 fikir

1. **Glob-tabanlı otomatik kural ekleme.** Ne: dosya uzantısı/yoluna göre
   (`src/api/**/*`, `**/*.tsx`) kuralın context'e mekanik olarak girmesi.
   Neden değerli: description okuma/model kararına hiç girmeden, "bu dosya
   türünde şu kural her zaman geçerli" garantisi veriyor — bizim skill
   sisteminde bunun karşılığı yok, hepsi ya her zaman açık (CLAUDE.md) ya
   da model kararına bağlı (skill description). Maliyet: düşük — skill
   frontmatter'ına opsiyonel bir `globs` alanı eklemek, yükleyicide dosya
   yoluna bakan bir eşleşme adımı. Mevcut progressive disclosure modelini
   bozmuyor, üçüncü bir tetik modu olarak ekleniyor.

2. **Nested AGENTS.md / kural miras zinciri, açık override kuralıyla.** Ne:
   alt dizindeki kural üst dizininkini bilinçli olarak geçersiz kılabiliyor,
   bu resmi olarak belgelenmiş bir davranış. Neden değerli: bizim CLAUDE.md
   yönlendiricilerinde "alt klasör üstünü override eder" kuralı örtük, yazılı
   değil — büyük projelerde çakışma ihtimalini artırıyor. Maliyet: neredeyse
   sıfır, sadece dokümantasyon/kural netleştirme (RULES.md veya
   teknesyum-relay kurallarına bir satır).

3. **PR'a otomatik kanıt eki (video/ekran görüntüsü/log) ile teslim.** Ne:
   arka plan ajanı işini bitirince sonucu sadece diff olarak değil, çalıştığını
   gösteren kanıtla (test logu, ekran görüntüsü) PR'a ekliyor. Neden değerli:
   auditor ajanımızın doğrulama yükünü azaltır — "geçti/kaldı" kararını
   kanıt eşliğinde verebilir. Maliyet: orta — builder/ui-builder ajanlarının
   çıktı sözleşmesine "kanıt eki" alanı eklemek, ekran görüntüsü alma
   altyapısını (zaten preview/browser araçları var) rapora bağlamak gerekir.

## 6. Şüpheli/riskli yanlar

- **Kapalı kaynak.** Cursor'ın kural yorumlama motoru ve "intelligent
  selection" mantığı yayınlanmıyor; hangi model hangi eşiklerle description'ı
  değerlendiriyor doğrulanamadı.
- **Kural yok sayma şikayetleri yaygın.** Topluluk forumunda "Cursor just
  ignores rules" başlıklı aktif şikayet var; 2026'da iki eş zamanlı format
  (eski `.cursorrules` + yeni `.mdc`) aynı projede varsa çakışma çıkıyor,
  hangi rule'un kazandığı tutarsız bulunuyor. Kullanıcılar "kural birkaç
  prompt çalışıyor sonra kayboluyor" diyor; tek büyük dosyaya kural
  yığmanın bunu kötüleştirdiği raporlanıyor.
  ([Cursor forum — "Cursor just ignores rules"](https://forum.cursor.com/t/cursor-just-ignores-rules/69188))
- **Maliyet.** Cloud/background agent MAX mode zorunlu kılıyor, bu da her
  çalıştırmaya %20 ek ücret biniyor; 50 bin satırlık bir kod tabanında tek
  bir agent koşusu aylık $20 kredinin ~%22,5'ini tüketebiliyor. Günlük agent
  kullanıcıları ayda $60-100, çoklu agent koşturanlar $200+ harcıyor —
  doğrulanmış tek kaynak pazarlama/üçüncü taraf blog, resmi fiyat sayfası
  ayrı doğrulanmalı.
  ([FlexPrice — Cursor Pricing Guide](https://flexprice.io/blog/cursor-pricing-guide))

## Kaynaklar

- [Cursor Docs — Rules](https://cursor.com/docs/rules)
- [Cursor Help — What are background agents?](https://cursor.com/help/ai-features/background-agents)
- [Cursor Community Forum — "Cursor just ignores rules"](https://forum.cursor.com/t/cursor-just-ignores-rules/69188)
- [FlexPrice — The Complete Guide to Cursor Pricing in 2026](https://flexprice.io/blog/cursor-pricing-guide)
