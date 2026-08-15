# Röle protokolü — mekanizma

`SKILL.md` ne zaman röle kurulacağını söyler; burası nasıl kurulacağını.

## 1. Dizin

```
.claude/relay/
├── PLAN.md            Görev grafiği + bağımlılıklar. Nadiren değişir.
├── AYAR.md            (opsiyonel) proje bazlı düğme ezmesi
├── LOG.md             Append-only, tek satırlık olaylar.
├── canli/             Ajan izleri — HOOK yazar, model değil. Elle dokunma.
│   └── <agent_id>.json
└── contracts/
    ├── T2.md          AÇIK sözleşmeler
    └── done/          TAMAMLANMIŞ — salt okunur, hook koruyor
```

**Tek doğruluk kaynağı sözleşme dosyasıdır.** Ayrı durum dosyası tutma; iki kaynak ayrışır.
İlerleme = `done/` içindeki dosya sayısı.

**`canli/` neden var:** kayıt noktası ajanın yazmasına bağlıydı, ajan ölünce yazılmıyordu.
`relay-izle.js` hook'u `SubagentStart` / `PostToolUse` / `SubagentStop` olaylarında
kendiliğinden yazar. Her dosyada: `contract` (ajanın okuduğu sözleşmeden bağlanır),
`steps`, `last_action`, `files`, `last_seen`, `stop_reason`, `son_soz`.

`stop_reason`: `end_turn` normal bitiş · başka her değer **ölüm** · `null` çalışıyor.

`_hook-tani.json` teşhis sayacıdır — `toplam` hook'un kaç kez ateşlendiğini, `ajanli`
kaçında `agent_id` geldiğini sayar. Yoksa hook hiç çalışmamıştır.

## 2. Sözleşme formatı

```markdown
---
id: T2
title: Form validasyonu
rol: usta | usta-arayuz | kayitci
model: haiku | sonnet | opus
depends: [T1]
owns: [src/components/Form.tsx, src/lib/validate.ts]
yan_etki: []
status: open | active | blocked | done
tur: 0
agent_id: —
---
## Amaç            tek paragraf: ne, neden
## Kabul kriteri   ölçülebilir maddeler
## Arayüzler       önceki görevlerin ürettiği ve buna dayanan imzalar
## Bağlam          dar dosya yolları + 3-5 tespit
## Kayıt noktası   ajan doldurur, ÜZERİNE YAZAR
## Çıktı           bitince: değişen dosyalar + tek paragraf
```

`owns` **çakışamaz**. İki sözleşme aynı dosyayı sahiplenemez — paralel çalışacaklarsa
pazarlığa kapalı. Sahiplik düzeltme turunda da geçerlidir: düzeltme başka bir sözleşmenin
dosyasına düşüyorsa düzeltmeyi kendi `owns`una yönlendir.

`yan_etki`: ajanın yazmadığı ama çalıştırdığı aracın değiştireceği dosyalar
(`package-lock.json`, biçimlendirici çıktısı, derleme artefaktı). Kümeleri kesişen
sözleşmeleri paralel çalıştırma.

**T0 her sözleşme kapanışında `git status --porcelain` çalıştırır.** `owns` ∪ `yan_etki`
dışında değişen dosya varsa `done` olamaz: LOG'a `sahipsiz` satırı, dosyayı kümeye ekle
veya değişikliği geri al.

`agent_id` devam ettirme için kritik — ajan bitince dönen ID'yi buraya yaz.

## 3. Akış

**T0:** `PLAN.md` → sözleşmeler → dağıt (paralel tavanı `paralel_genislik`) → Çıktı'yı oku
→ `denetim` ayarına göre `denetci`'ye doğrulat → kaldıysa §4 → `LOG.md`.

**Ajan:** sözleşmeyi oku → `status: active` → sadece `owns`'a yaz → kayıt noktasını güncelle
→ Çıktı + `status: done` → `contracts/done/`'a taşı → LOG satırı.

**Bir görev tanımı tek görevi anlatır, oturumun geçmişini değil.** Dispatch prompt'una
konuşma özeti koyma, sözleşmenin yolunu ver.

## 4. Düzeltme döngüsü

`denetci` KALDI derse, `duzeltme_tavani` kadar tur:

| Tur | Ne yapılır |
|---|---|
| 1-3 | **Aynı ajanı devam ettir** — `SendMessage` ile `agent_id`'ye. Bağlamı korur. |
| 4-5 | **Taze ajan.** `model_tirmanisi: acik` ise bir üst modele çık. |
| tavan | Dur. Açık bulguları kullanıcıya özetle, kararı o versin. |

Her turda `tur:` artır. Tur 3'te hâlâ çözülmüyorsa sorun genelde ajanın değil
**sözleşmenin**: kabul kriteri ölçülemez veya bağlam eksiktir.

**Açık kritik bulgu varken bir sonraki göreve geçme.**

Tek satırlık, gözle doğrulanabilir düzeltmelerde denetçi ajanı harcama — grep'le kontrol et.

## 5. Düşen ajan

Üçüncü hal: **öldü.** `canli/<agent_id>.json` içinde `stop_reason` `end_turn` dışındaysa
ajan ölmüştür. Sözleşme `active` ama ajanı ölü — kurtar:

1. `LOG.md`: `T<n> olu · <stop_reason>`
2. `SendMessage` ile `agent_id`'ye yaz, dirilt.
3. Yanıt yoksa **taze ajan**. Devir teslim metnini `canli/`'den kur: `last_action`,
   `files`, `son_soz`, `steps` + varsa sözleşmenin Kayıt noktası.
   `tur:` artırma — bu kesinti kurtarması, düzeltme turu değil.
4. İki kurtarma da başarısızsa `status: blocked`, kullanıcıya söyle.

**Denetçi ölürse denetimi atlama.** Denetimsiz `done` yasak; taze `denetci` ata.
Ajan sözleşmeyi denetimsiz `done/`'a taşımışsa geri al.

`canli/` boşsa (hook çalışmamışsa) geri düş: notification, `git status` ve diskteki
dosyalar durumu anlatır. Bilgi kaybı olmadan kurtarılabilir ama otomatik değildir.

## 6. Oturum kesilince

Yeni oturum sırayla okur, başka hiçbir şey:

1. `canli/*.json` — **önce burası.** Hook yazdı, ajanın iş birliğine bağlı değil.
2. `LOG.md` son 15 satır
3. Açık sözleşmelerin frontmatter'ı (`done/` değil)
4. `active` olanın Kayıt noktası — `canli/`'yi tamamlar, yerine geçmez

Sonra: `stop_reason: null` → `SendMessage` ile yokla · ölü → §5 · ajan yok, bağımlılığı
karşılanmış `open` var → dağıt.

`PLAN.md`'yi ancak yeni görev üretecekse oku. Sözleşme `done/`'a taşınınca ilgili
`canli/<agent_id>.json` dosyasını sil.

## 7. LOG formatı

```
2026-08-11 14:22 T0  plan: 8 sozlesme, T1->T2, T3 paralel
2026-08-11 14:31 T1  done   · src/LockSolver.ts + testler yesil
2026-08-11 14:48 T2  kaldi  · tur 1, kabul 2 karsilanmadi
2026-08-11 14:55 T4  olu    · max_tokens, SendMessage ile dirildi
2026-08-11 14:58 T4  sahipsiz · package-lock.json, yan_etki'ye eklendi
```

Etiketler: `plan` `done` `kaldi` `olu` `sahipsiz` `blocked`.

## 8. Kullanıcıya raporlama

Kullanıcı ajanların içini göremez. Rapor vermezsen sistem ona kara kutu gibi görünür ve
yönetemez. **Aşağıdaki altı an zorunludur**, `onay_kapisi: yok` olsa bile — o düğme
*onay beklemeyi* kapatır, *bilgilendirmeyi* değil.

Her rapor dört soruyu cevaplar: **neredeyiz · ne oldu · sırada ne var · senden bir şey
gerekiyor mu.** Cevap yoksa satırı yazma.

### 8.1 Açılış brifingi — dağıtmadan önce

```
Plan: <tek cümle, işin tamamı>
```

| Sözleşme | Ne yapacak | Rol / model | Bekliyor | Dokunacağı dosyalar |
|---|---|---|---|---|

Tablonun altına üç satır: **paralel çalışacaklar**, **bilerek kapsam dışı bıraktıklarım**,
**gördüğüm risk**. Sonra tek satır: neyi şimdi değiştirebileceği (sıralama, kapsam,
`paralel_genislik`). `onay_kapisi: yok` ise beklemeden başla — ama brifingi yaz.

### 8.2 Dalga başlarken

Aynı anda başlayan ajanlar tek satırda: `▸ T3 usta-arayuz · T4 usta — paralel, owns kesişmiyor`.

### 8.3 Sözleşme kapanınca

Dört satır, fazlası değil: **ne yapıldı** · **değişen dosyalar** · **denetim kararı**
(geçti / kaldı + kaç tur) · **sırada ne açıldı**. Ajanın Çıktı metnini olduğu gibi
yapıştırma, kendi cümlenle yaz.

### 8.4 Dalga sonunda ara rapor

İlerleme `x/y`, harcanan düzeltme turu, açık risk, kalan iş ve **plandan sapma varsa
sapmanın kendisi**. Kullanıcı en çok burada müdahale eder; ara raporu atlama.

### 8.5 Sapma anında — beklemeden

Şunlar sessizce olmaz: plan değişti, sözleşme eklendi/iptal edildi, `owns` genişletildi,
model tırmandı, ajan öldü, sahipsiz dosya çıktı, denetim tavana dayandı.
Tek satır + sebep + ne yaptığın.

### 8.6 Kapanış raporu

Sözleşme tablosu (durum + tur sayısı), toplam değişen dosya, denetimde yakalanan bulgular,
yapılmayanlar ve sebebi, önerilen sonraki adım.

### Biçim kuralı

Rapor **yapılandırılmış durum bildirimidir, düzyazı özet değildir.** Tablo, madde, tek
satırlık olay. Bitmiş işi tekrar anlatma; anlatılacak şey değişimdir. `bilgilendirme: sessiz`
ayarında yalnızca 8.1, 8.5 ve 8.6 kalır — diğerlerini kullanıcı `/durum` ile ister.

## 9. Yönlendirici CLAUDE.md

Klasörde 5+ kaynak dosya varsa veya klasör mimari sınırsa (main/renderer, core/ui, api/db)
→ ≤20 satırlık `CLAUDE.md` şart. Şablon: `assets/folder-claude.template.md`.
20 satırı aşıyorsa fazlasını ayrı referans dosyasına taşı.
