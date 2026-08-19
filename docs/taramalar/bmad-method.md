# BMAD-METHOD — Tarama

Kaynak repo: https://github.com/bmad-code-org/BMAD-METHOD (MIT + ayrı ticari marka notu,
52.067 yıldız, 5.944 fork, son push 2026-08-19, güncel sürüm v6.11.0 — 2026-08-10)

## 1. Ne yapıyor, hangi problemi çözüyor?

Tek bir kod asistanı yerine Analiz → Planlama → Çözümleme (Solutioning) → Uygulama
diye dört fazlı, uzman rollere ayrılmış bir "sanal ajan takımı" kurar; her faz bir
sonrakinin okuyacağı kalıcı bir belge üretir (PRD, mimari, epic/story, spec).
Çözdüğü problem: AI kodlama asistanlarının "belirtilmemiş varsayımları koda gömmesi" —
niyet netleşmeden koda atlanması.
(https://github.com/bmad-code-org/BMAD-METHOD, https://bmad-code-org.github.io/BMAD-METHOD/docs/reference/workflow-map.md)

## 2. İş devri (handoff) nasıl oluyor?

Tamamen **dosya tabanlı**, context'e güvenmiyor; kullanıcı elle kopyala-yapıştır
yapmıyor — her ajan/"skill" aynı repoda yaşayan dosyaları doğrudan okuyup yazıyor
(Claude Code / Cursor dosya sistemi erişimiyle çalıştığı için).

Zincir ve somut dosyalar:
- **Phase 1 Analiz**: `brief.md` + `addendum.md`, `prfaq-{project}.md` (opsiyonel)
- **Phase 2 Planlama**: `bmad-prd` → `prd.md` + `addendum.md` + `.memlog.md`;
  `bmad-ux` → `DESIGN.md` + `EXPERIENCE.md`; `bmad-spec` → **`SPEC.md`** — 5 alanlı
  sabit çekirdek (Why, Capabilities, Constraints, Non-goals, Success signal),
  `{output_folder}/specs/spec-{slug}/` altında companion dosyalarla
- **Phase 3 Çözümleme**: `bmad-architecture` → `ARCHITECTURE-SPINE.md`;
  `bmad-create-epics-and-stories` → `## Epic N:` / `### Story N.M:` başlıklı epic
  dosyaları; `bmad-sprint-planning` → readiness gate (PASS/CONCERNS/FAIL) +
  **`sprint-status.yaml`** — tüm geliştirme döngüsünün okuyup yazdığı tek takip dosyası
- **Phase 4 Uygulama**: `bmad-build` her girdiyi (serbest metin, issue, planlı story)
  kabul edip kod + `spec-*.md` üretir; story dosyası "yukarı akış" ürünü/kabul
  bağlamı olarak kalır, build kendi çalıştırma kaydını ayrı tutar

`sprint-status.yaml` LLM tarafından değil **`sprint_plan.py`** adlı deterministik
script tarafından üretiliyor/birleştiriliyor (epic başlıklarını kebab-case story
key'e çeviriyor, "durum asla geriletilmez" kuralını uyguluyor, atomik yazma +
doğrulama başarısızsa geri alma).

Ajan çağrısı **yarı-manuel**: kullanıcı menü tetikleyicisini yazıyor (`PRD`, `CA`,
`BD` gibi kısa kod) veya `bmad-help` yönlendiriyor — Teknesyum'daki gibi bir
"patron" otomatik dağıtım yapmıyor. Tam otomasyon isteyenler için ayrı
`bmad-build-auto` var: `stories.yaml`'dan sırayla story çekip insansız döngü koşuyor.

Not: Eski (v4/v5) sürümde "epic/mimari dokümanını hyper-detaylı story dosyalarına
parçalama" (`bmad-shard-doc`) mekanizması vardı; v6'da bu **kaldırıldı**, yerini
SPEC.md + sprint-status.yaml aldı — arama sonuçlarında hâlâ dolaşan "sharding"
anlatıları güncel değil.
(https://bmad-code-org.github.io/BMAD-METHOD/docs/reference/workflow-map.md,
https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/sprint-planning.md,
https://bmad-code-org.github.io/BMAD-METHOD/docs/reference/core-tools.md)

## 3. Bağlam/token disiplini için somut mekanizma var mı?

Var, ama sayısal bütçe (satır/token limiti) yok — ilke bazlı:

- **"Retrieval cost" ilkesi** (`bmad-project-context`): `AGENTS.md`'ye sadece
  ajanın ucuza yeniden keşfedemeyeceği bilgi girer (politika, non-default
  konvansiyon, kanıtlanmış hata) — repo özeti, dizin ağacı, teknoloji listesi gibi
  koddan ucuzca türetilebilecek şeyler **asla** yazılmaz; bu "ucuz-türetilebilir
  bilgi her çağrıda tekrar ücretlendirilen bayat kopyadır" gerekçesiyle açıkça
  belirtiliyor.
- **SPEC.md**, sabit 5 alanlı küçük çekirdek olarak tasarlanmış — build ajanı
  her seferinde tüm PRD/mimariyi değil bu dondurulmuş sınırı okuyor.
- **Context-free/firewalled subagent** kullanımı (`bmad-review`, `bmad-deep-recon`):
  inceleme ajanları ana konuşma bağlamını taşımadan paralel çalışıyor, "bulgu
  gürültüsü" ve konudan sapmayı azaltmak için.
- **`bmad-build`**: "intent'i önce sıkıştır" — otonom çalışmaya geçmeden önce
  isteği tek, çelişkisiz hedefe indirgiyor; insan-döngüsü duraklarını (checkpoint)
  azaltarak insan dikkatini koruyor — ama bu insan-dikkati tasarrufu, token
  tasarrufu iddiası değil.

Somut bir token/context-window bütçesi, otomatik özetleme eşiği veya "şu satırı
geçme" kuralı **doğrulanamadı**.
(https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/project-context.md,
https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/build.md)

## 4. Kuralları model disiplinine mi bırakıyor, mekanik olarak mı uyguluyor?

**Karışık, ağırlıklı olarak model disiplini + dar kapsamlı mekanik yardımcılar.**

Mekanik olan: `sprint_plan.py` script'i — epic başlığı ayrıştırma, story key
üretme, sıralama, mevcut dosyayla birleştirme, durum sayımı, "asla geriletme"
kuralı, atomik yazma + doğrulama açıkça **"judgment call değil, bu yüzden
inference ile yapılmıyor"** diye script'e devredilmiş. `bmad-review`'ın
adversarial lens'i de mekanik bir alt sınır zorluyor: en az 10 bulgu üretmeden
boş liste kabul edilmiyor.

Model disiplinine bırakılan: Readiness gate (`IR`) "şüpheci kıdemli geliştirici"
rolündeki LLM'nin PASS/CONCERNS/FAIL kararı — dışarıdan doğrulayan bir CI/hook
yok. Mimari çakışma önleme (`preventing-agent-conflicts.md`) tamamen ADR
belgesinin ajanlar tarafından "okunup uyulmasına" dayanıyor, zorlayıcı bir
kontrol mekanizması yok. Genel olarak Claude Code hook'larına (araç çağrısında
tetiklenen shell script) benzer bir dış zorlama katmanı **bulunamadı** — kurallar
skill/workflow prompt'ları (markdown/YAML talimat) olarak LLM'e veriliyor.
(https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/sprint-planning.md,
https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/preventing-agent-conflicts.md,
https://bmad-code-org.github.io/BMAD-METHOD/docs/reference/core-tools.md)

## 5. Alınmaya değer en fazla 3 fikir

1. **Durum takibini LLM'den çıkarıp deterministik script'e verme.** Ne:
   `sprint_plan.py` — epic/story ayrıştırma, key üretme, "asla geriletme"
   invaryantı, atomik yazma + rollback, `--dry-run` ile drift raporu.
   Neden değerli: Teknesyum sözleşme durumu (kim ne aldı, kabul edildi mi) şu an
   muhtemelen ajan beyanına dayanıyor; benzer bir script relay'in sözleşme
   defterini (kim hangi aşamada) model çağrısı olmadan tutabilir. Maliyet: orta —
   sözleşme dosya formatı zaten YAML/benzeriyse birkaç saatlik script işi.

2. **"Retrieval cost" filtresi — CLAUDE.md'ye ne yazılır, ne yazılmaz kuralı.**
   Ne: bir bilgi ancak koddan/config'ten ucuza yeniden türetilemiyorsa veya
   kayıtlı geçmiş bir hataysa yönlendirici dosyaya girer; dizin ağacı, teknoloji
   listesi gibi ucuz bilgiler asla girmez. Neden değerli: Teknesyum'un "≤20 satır
   CLAUDE.md" kuralına somut bir *seçim kriteri* ekler — şu an sınır sadece uzunluk,
   içerik seçimi sezgisel. Maliyet: düşük, mevcut CLAUDE.md yazma kuralına bir
   cümlelik filtre eklemek.

3. **Checkpoint Preview — diff'i dosya sırası yerine "concern" ve risk etiketiyle
   sunma.** Ne: büyük bir diff'i konuya göre gruplayıp ("input validation", "API
   contract") her birine "neden bu yaklaşım" açıklaması ekliyor, sonra en yüksek
   blast-radius'lu 2-5 noktayı `[auth]`, `[schema]`, `[billing]` gibi etiketlerle
   ayrıca vurguluyor. Neden değerli: auditor ajanının insana sunduğu rapor şu an
   muhtemelen dosya/satır sırasına göre; konuya göre gruplama insanın onay
   kalitesini artırır. Maliyet: orta — auditor'a "concern-based gruplama + risk
   etiketi" çıktı şablonu eklemek.
(https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/sprint-planning.md,
https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/project-context.md,
https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/checkpoint-preview.md)

## 6. Şüpheli/riskli yanlar

- **Lisans**: Kod MIT; ama "BMad", "BMad Method", "BMad Core" isim/marka ayrı
  bir `TRADEMARK.md` ile korunuyor — türetilmiş ticari bir ürüne "BMad" adını
  veremezsin, sadece "BMad ile uyumlu" diyebilirsin. Sorun değil ama gözden kaçabilir.
- **Rol enflasyonu**: Çekirdek BMM paketi 5 ajanla (Analyst, PM, Architect, Dev,
  UX Designer) makul, ama ekosistem modülleriyle (Creative Intelligence Suite tek
  başına 6+ persona: Innovation Strategist, Design Thinking Coach, Storyteller,
  Presentation Master vb.; Game Dev Studio; Test Architect'in "Murat" ajanı)
  toplam ajan sayısı hızla büyüyor — üçüncü parti kaynaklarda geçen "19 ajan"
  rakamı resmi sayfada teyit edilemedi (**doğrulanamadı**). `party-mode` gibi
  "çoklu persona sohbeti" özelliği gerçek üretimden çok tiyatro değeri taşıyabilir.
- **Hızlı churn**: v6 yakın zamanda köklü bir yeniden yazım oldu (`bmad-shard-doc`,
  `bmad-document-project` gibi eski mekanizmalar kaldırıldı/deprecated),
  aylık-altı haftalık sürüm ritmi var (v6.9→v6.10→v6.11 son ~2 ayda), "deprecated
  compatibility shim" kurma/kaldırma akışı var. Entegrasyonu güncel tutmak sürekli
  bakım ister, dokümantasyon hızla eskiyebilir.
- **Terk edilmişlik**: Yok — tam tersi, bugün push var, 30 contributor (çekirdek
  repo), 52k yıldız, aktif Discord/YouTube.
- **Gizli maliyet**: Node.js 20.12+ ve `npx bmad-method install` kurulumu şart;
  ekosistem modülleri (`bmb`, `cis`, `gds`, `tea`) ayrı npm paketleri/repolar —
  bağımlılık yüzeyi ve kurulum karmaşıklığı Teknesyum'un tek-plugin modeline göre
  çok daha geniş.

## Kaynaklar

- https://github.com/bmad-code-org/BMAD-METHOD
- https://bmad-code-org.github.io/BMAD-METHOD/docs/reference/workflow-map.md
- https://bmad-code-org.github.io/BMAD-METHOD/docs/reference/agents.md
- https://bmad-code-org.github.io/BMAD-METHOD/docs/reference/core-tools.md
- https://bmad-code-org.github.io/BMAD-METHOD/docs/reference/modules.md
- https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/sprint-planning.md
- https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/project-context.md
- https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/build.md
- https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/preventing-agent-conflicts.md
- https://bmad-code-org.github.io/BMAD-METHOD/docs/explanation/checkpoint-preview.md
- https://bmad-code-org.github.io/BMAD-METHOD/docs/how-to/install-bmad.md
- https://github.com/bmad-code-org/BMAD-METHOD/blob/main/LICENSE
- https://github.com/bmad-code-org/BMAD-METHOD/blob/main/TRADEMARK.md
- GitHub API (`gh api repos/bmad-code-org/BMAD-METHOD`) — stars/forks/license/pushed_at/releases/contributors
