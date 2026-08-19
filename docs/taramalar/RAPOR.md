# 10 proje taraması — birleşik rapor

Tarih: 2026-08-19 · Sürüm: 2.19.0 · Tarama dosyaları: `docs/taramalar/*.md`

Taranan: aider · bmad-method · claude-flow/ruflo · cline + roo code · codex cli ·
cursor rules · goose + continue · opencode + crush · spec kit · devir deseni (çapraz
desen taraması).

---

## 1. Entegre edilenler

| Fikir | Kaynak | Nereye girdi | Sürüm |
|---|---|---|---|
| Devir paketi dosyaya yazılır, sohbete yol düşer | devir-deseni | `relay/references/multi-session.md` 5.2 + `Stop` kancası | 2.17 |
| Ters yön de aynı tavana tabi — işçinin dönüş satırı ≤5 satır | devir-deseni | `multi-session.md` 5.1 + `Stop` kancası | 2.17 |
| Compaction anında durumu diske/bağlama geri yazan kanca | opencode | `PostCompact` → açık sözleşme + rota + bitmemiş ajan | 2.18 |
| Engellemeyle birlikte gerekçeyi modele enjekte etme | cline | tüm kancalar `decision: block` + `reason` | 2.18 |
| Edit sonrası otomatik denetim ve hata döngüsü | aider | `.js`/`.json` yazımında `node --check` / `JSON.parse` | 2.19 |
| "Asla geriletme" durum invaryantı | bmad | `contract-guard` durum merdiveni | 2.19 |
| Araç seviyesinde salt-okunur kilit | cline / opencode | `auditor` ajanı: `Read, Grep, Glob, LSP` — Write/Edit yok | vardı |
| Getirme maliyeti filtresi — ucuza türetilebilen bilgi dosyaya yazılmaz | bmad | `relay/SKILL.md` 6 | 2.17 |
| Tek "şu an neredeyim" dosyası | cline memory bank | `docs/ROTA-*.md` "Kaldığım yer" | vardı |

## 2. Bilerek alınmayanlar

**Repo map — tree-sitter + PageRank ile otomatik bağlam seçimi (aider).** Kurulum
maliyeti yüksek, `graphify` skill'i boşluğun büyük kısmını dolduruyor. Karar: graphify
sembol seviyesinde kalsın, dosya seviyesi PageRank eklenmesin.

**OS seviyesinde sandbox — Seatbelt/Landlock (codex).** Windows'ta karşılığı yok;
Teknesyum tek platformda çalışıyor. Kanca katmanı sınırın kendisi olarak kalır.

**AGENTS.md'ye geçiş (codex).** Fayda ancak başka araçlarla ortak çalışmada doğar.
Teknesyum tek araç hedefliyor; `CLAUDE.md` ≤20 satır kuralı aynı işi görüyor.

**Model yeteneğine göre edit formatı — whole/diff/udiff (aider).** Claude Code'un
`Edit` aracı tek kanal, format seçimi bize açık değil.

**knip — kullanılmayan export taraması.** Depoda 6 JS dosyası var; aracın kendi
eşiği (~30+ dosya) altında. Gürültü/fayda oranı olumsuz.

**Rol çoğaltma — 19 persona, party-mode (bmad).** Dört rol (builder, ui-builder,
auditor, scribe) işi karşılıyor. Persona sayısı arttıkça hangi rolün ne yapacağı
belirsizleşiyor; bmad'in kendi ekosisteminde bu görülüyor.

**Cline Hooks'un kendisi.** macOS/Linux'a bağlı, Windows'ta çalışmıyor. Fikir alındı,
kod alınmadı.

## 3. Şüpheliler — senin bilmen gerekenler

**Ölü ya da ölmekte olan projeler.** Bunlara dayanan bir bağımlılık kurmadık, ama
tarama dosyalarındaki bilgiler tarihî sayılmalı:

- **Roo Code** 15 Mayıs 2026'da kapatıldı, depo arşivlendi. Custom modes ve Boomerang
  Tasks bilgileri donmuş durumda. Üstüne kurulu `roo-code-memory-bank` öksüz kaldı.
- **Continue** 18 Haziran 2026'da Cursor tarafından satın alındı; login akışı
  kaldırıldı, açık PR'lar merge edilmeden kapatılıyor, bulut verisi silindi. Hub'ın
  geleceği belirsiz.
- **Aider** son etiketli sürüm v0.86.0 (2025-08-09) — bir yılı aşkın süredir yeni
  sürüm yok, commit'ler release'e dönüşmüyor. 1.818 açık issue.

**Doğrulanamayan ya da yanıltıcı iddialar:**

- **claude-flow / ruflo** "27 Hooks" diye pazarlıyor; Issue #377'ye göre bunlar resmi
  kanca kontratını (blocking, JSON stdin/stdout) uygulamıyor — adı kanca olan CLI
  komutları. Bizim kanca katmanımızla karıştırılmamalı.
- Aynı projenin "SOTA" karşılaştırması yalnızca orkestrasyon başlatma maliyetini
  ölçüyor, model kalitesini değil. Depo `ruvnet/claude-flow` → `ruvnet/ruflo`'ya
  taşınmış; `parruda/claude-swarm` kaynak adresi bugün 404 dönüyor.
- **Spec Kit** kurallara uyumu tamamen modelin "kontrol ettim" beyanına bırakıyor;
  mekanik doğrulama yok. Bizim tercihimizin doğru olduğunu gösteren örnek.
- **Cursor** kapalı kaynak; "kural yok sayılıyor" şikayetleri yaygın, iki format
  (`.cursorrules` + `.mdc`) çakışıyor. MAX modu her koşuya %20 ek ücret bindiriyor.
- **Codex CLI** 13.143 açık issue; opsiyonel telemetri planı duyuruldu, varsayılan
  davranışı net değil.
- **OpenCode** context% göstergesi cache-read'i pencereye bölüp %228 gibi anlamsız
  oranlar üretiyor (issue #13003).

**Lisans/marka:**

- **Crush** FSL-1.1-MIT — OSI onaylı değil, "source-available". Her sürüm 2 yıl sonra
  MIT'e dönüyor. Kod almadık, sadece tema token deseni incelendi.
- **BMad** kodu MIT ama isim ayrı `TRADEMARK.md` ile korunuyor. Türev bir ürüne
  "BMad" adı verilemez. Bizde isim kullanımı yok.
- Diğerleri (aider, cline, codex, goose, continue, opencode, spec-kit) Apache-2.0
  veya MIT — risk yok.

## 4. Açık kalan

`assets/components/` bileşen deposu (Base UI + motion + auto-animate, shadcn tarzı
kopyalanan kaynak) — önceki oturumda karar verildi, henüz kurulmadı. Bu taramalarla
ilgisi yok, listede kaybolmasın diye buraya yazıldı.
