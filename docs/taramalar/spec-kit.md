# GitHub Spec Kit — Tarama

Kaynak repo: https://github.com/github/spec-kit (MIT, 130.273 yıldız, 11.688 fork, son push 2026-08-19)

## 1. Ne yapıyor, hangi problemi çözüyor?

"Spec-Driven Development" (SDD) metodolojisini uygular: kod yerine spesifikasyonu birincil
kaynak yapar, kod onun türevi olur. `specify` CLI ile proje iskeleti kurulur, ardından
Claude Code / Copilot / Cursor gibi 30+ ajan üzerinde slash-komut zinciriyle çalışır.
Amaç: niyet (intent) ile üretilen kod arasındaki sapmayı azaltmak.
(https://github.com/github/spec-kit, https://github.com/github/spec-kit/blob/main/spec-driven.md)

## 2. İş devri nasıl oluyor?

Tamamen **dosya tabanlı**, context'e güvenmiyor. Akış: `constitution.md` → `spec.md` →
`plan.md` → `tasks.md` → kod. Her komut bir öncekini dosyadan okur:
`/speckit.plan` spec.md'yi okur, `/speckit.tasks` plan.md'yi okur. Dosyalar repoya
commit edilir, `.specify/memory/constitution.md` kalıcı ilke deposu olarak durur.
Branch adları da özellik ile eşleşir (semantik dal adlandırma).
Komut sırası: `/speckit.constitution` → `/speckit.specify` → `/speckit.plan` →
`/speckit.tasks` → `/speckit.implement`; ek olarak `/speckit.clarify`,
`/speckit.analyze`, `/speckit.checklist`, `/speckit.converge`.
(https://github.com/github/spec-kit/blob/main/spec-driven.md,
https://github.com/github/spec-kit/blob/main/templates/plan-template.md)

## 3. Bağlam/token disiplini için somut mekanizma var mı?

Zayıf. Tek somut pratik: karmaşık içeriği ana dosyadan ayırıp
`implementation-details/` gibi alt dosyalara taşımak (ana dokümanı kısa tutma).
Bunun dışında token bütçesi, otomatik özetleme veya context-budget kontrolü
**yok**. `scripts/bash/check-prerequisites.sh` gibi scriptler var ama bunlar
dosya varlığını kontrol ediyor, token/context yönetimi yapmıyor.
(https://github.com/github/spec-kit/blob/main/spec-driven.md — doğrulanamadı: token
bütçesi iddiası yok)

## 4. Kurallar model disiplinine mi bırakılıyor, mekanik mi uygulanıyor?

Büyük ölçüde **model disiplinine bırakılmış**. constitution.md dokuz maddelik ilke
seti tanımlıyor ("Every feature MUST begin as a standalone library" gibi) ama
uygulamayı zorlayan bir hook/CI kontrolü yok — belge şöyle diyor: "The LLM must
either pass the gates or document justified exceptions." tasks-template.md'de de
acceptance-criteria doğrulaması ve paralel görev ([P] işaretli) çakışma kontrolü
insan/model yargısına bırakılmış, otomatik doğrulama scripti yok.
Repo kökünde `.pre-commit-config.yaml` var ama bu muhtemelen lint/format
seviyesinde — SDD kurallarını (spec-plan-task tutarlılığı) mekanik doğrulamıyor
(doğrulanamadı, içerik incelenmedi).
(https://github.com/github/spec-kit/blob/main/templates/tasks-template.md)

## 5. Alınmaya değer en fazla 3 fikir

1. **constitution.md — kalıcı proje ilkesi dosyası.** Ne: `.specify/memory/constitution.md`,
   her plan/task'ın karşı kontrol edildiği sabit ilke seti. Neden değerli: Teknesyum'da
   kurallar CLAUDE.md katmanlarına dağınık; tek, versiyonlanan "anayasa" dosyası proje
   başına netlik katar. Maliyet: düşük — mevcut CLAUDE.md yapısına ek bir dosya,
   entegrasyon 1 saatlik iş.

2. **Faz kapıları (Phase Gates) şablonda somut checklist olarak yazılı.** Ne: plan
   şablonunda "Phase -1 Gate" gibi geçilmeden ilerlenemeyen kontrol listeleri. Neden
   değerli: Teknesyum'daki sözleşme/denetçi akışına eklenebilecek, builder'ın kendi
   kendine "geçtim mi" diye işaretlediği somut adım. Maliyet: orta — sözleşme şablonuna
   checklist bölümü eklemek, auditor ajanının bunu okuması.

3. **Branch adı = özellik adı (semantik dal adlandırma).** Ne: her spec kendi git
   dalıyla eşleşiyor, iz sürmek kolay. Neden değerli: relay'de ajan/iş takibini git
   geçmişiyle hizalar, hangi commit'in hangi sözleşmeye ait olduğunu otomatik gösterir.
   Maliyet: düşük — create-new-feature.sh benzeri küçük bir script.

## 6. Şüpheli/riskli yanlar

- **Lisans**: MIT — sorun yok.
- **Terk edilmişlik**: yok, son push bugün (2026-08-19), 130k yıldız, 11,7k fork,
  342 açık issue — aktif ve büyük bir proje.
- **Abartılı iddia**: "30+ ajan destekliyor" doğrulanabilir görünüyor (`specify
  integration list`) ama entegrasyon derinliği (her ajan için ne kadar test
  edildiği) doğrulanamadı.
- **Gizli maliyet**: Mekanik doğrulama olmadığı için kurallara uyum tamamen modelin
  "kendi kendine kontrol ettim" beyanına dayanıyor — Teknesyum'un hook tabanlı
  zorlamasıyla karşılaştırıldığında bu, büyük ekiplerde sessiz sapmaya (spec ile
  kodun ayrışması) açık bir tasarım. `.pre-commit-config.yaml` içeriği incelenmedi,
  gerçekten SDD tutarlılığı kontrol ediyor mu doğrulanamadı.
- **Genişleme ekosistemi** (extensions/presets/bundles) topluluk katkılı ve
  "kaynak incelemesi gerektirir" uyarısı repo tarafından da yapılıyor — üçüncü
  taraf bundle'lara güvenmeden önce inceleme şart.

## Kaynaklar

- https://github.com/github/spec-kit
- https://github.com/github/spec-kit/blob/main/spec-driven.md
- https://github.com/github/spec-kit/blob/main/templates/plan-template.md
- https://github.com/github/spec-kit/blob/main/templates/tasks-template.md
- https://github.com/github/spec-kit/tree/main/scripts/bash
- https://github.com/github/spec-kit/tree/main/.specify/memory
- GitHub API (`gh api repos/github/spec-kit`) — stars/forks/license/pushed_at
