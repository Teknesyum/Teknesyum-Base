# Özet — Claude Code eklentileri ve skill sistemleri, token verimliliği taraması

On depo tarandı (2026-08-22). Tüm rakamlar `gh api .../git/trees` ve ham dosya
ölçümünden; blog ya da README iddiası değil. Depo başına ayrıntı aynı klasörde.

## Ölçüt neden "toplam boyut" değil

Bizim tarafta yapılan ölçüme göre Base'in **her oturumda** yüklediği kısım yalnızca
**5.217 B** (description satırları); gövdeler çağrılana kadar yüklenmiyor. Buna karşılık
`relay/SKILL.md` çağrıldığında **10.112 token** tek seferde giriyor ve harness'ın
description listesi bütçesi **8.000 karakter** — Base bunun **%65'ini** alıyor.

Dolayısıyla tabloda iki sütun asıl belirleyici: **çağrı başına yük** (skill boyutu) ve
**her zaman yüklenen metadata** (description uzunluğu). Depo toplamı ilgisizdir.

## Tablo

| Depo | Skill boyutu (çağrı başına yük) | Bölünme deseni | Enjeksiyon | Ölçüm |
|---|---|---|---|---|
| **anthropics/claude-code** | plugin-dev: 12.101–22.827 B | gövde 12–23 KB, referans 11–21 KB (gövdeden büyük); yazılı tavan: 500 satır / ~2.000 kelime, description ≤1.024 karakter | Var ama koşullu: security-guidance yalnız ~25 regex eşleşince metin basar; `MAX_COMMIT_REVIEWS_PER_HOUR=20`, `MAX_DIFF_FILES=30`, `MAX_STOP_HOOK_FIRINGS=3`; katman başına kapatma düğmesi | Yok (kelime bütçesi yazılı, ölçen mekanizma yok) |
| **anthropics/skills** | 1.511–**75.707 B**, medyan ~8 KB, 19 skill | alan klasörü: `shared/`, `python/`, `go/`; `references/` altında tüm depoda 1 dosya; ağır içerik 175.868 B'ye kadar ama tembel | Yok | Yok |
| **obra/superpowers** | 2.305–**32.339 B**, 14 skill toplam 138.578 B, ort. 9.898 B | skill sınıfı bütçesi yazılı: getting-started <150 kelime, sık yüklenen <200 kelime, diğer <500 kelime, description <500 karakter | **Var, ölçülü:** SessionStart tek dosyayı tam basar — **3.108 B ≈ 800 token**; tek alan basma uyarısı kodda (çift enjeksiyon tuzağı) | Yok |
| **wshobson/agents** | 181 skill ort. **5.680 B** (max 26.448); 202 ajan ort. 6.757 B; 105 komut ort. **14.153 B** (max 49.294) | 91 ayrı eklenti; içerik `tools/` jeneratörüyle üç hedef biçime üretiliyor (`validate_generated.py` 32.255 B) | Görülmedi | Yok |
| **davepoon/buildwithclaude** ⚠ | 366 skill ort. 6.878 B, **max 160.358 B / 3.121 satır / 20.422 kelime ≈ 40.000 token**; 343 ajan max 48.988 B | **Yok** — 141 eklenti, boyut denetimi yok; yapılandırma JSON'u SKILL.md gövdesine gömülü | Bilinmiyor | Yok |
| **disler/claude-code-hooks-mastery** | Skill yok; hook script'leri 3.941–10.803 B (Python, bağlama girmez) | Mantık koda, metin dışarı: 13 hook türü ayrı dosyada | **Var, kırpılmış:** SessionStart git durumu + bağlam dosyalarını basar, **dosya başına ilk 1.000 karakter** (`content[:1000]`) | Yok |
| **upstash/context7** | 2.727–7.429 B; ajan yüzeyi toplam **~13 KB** | Bilgi dosyada değil serviste; `references/` 2.066–5.541 B; `docs-researcher` alt ajanı **2.146 B** ile getirilen belgeyi ana bağlamdan uzak tutar | Yok | Yok |
| **anthropics/claude-cookbooks** | Skill yok (defter koleksiyonu); `registry.yaml` 32.142 B tek indeks | 670 dosya konu klasörlerinde; gezinme manifest üzerinden, dosya açmadan | Yok | **Var:** `cost_optimization.ipynb` (1.286.487 B) — eval sabit, maliyet kolları **teker teker** açılıyor |
| **ccusage/ccusage** | Skill yok; kök `CLAUDE.md` **9 B**, kök `README.md` **24 B** (yönlendirme) | İçerik alt pakette; kök yalnız işaret | Yok — ölçüm ajanın dışından | **Var:** oturum/gün/hafta/ay + 5 saatlik blok; **cache creation / cache read ayrı**; `statusline` (Beta) bilgiyi kullanıcıya verir, bağlama değil |
| **PatrickJS/awesome-cursorrules** ⚠ | 257 kural ort. **3.966 B**, max 39.701 B, min 118 B | Mekanizma var, disiplin yok: `globs` + `alwaysApply: false`, ama örneklerde `globs: **/*` → fiilen her dosyada aday | Glob eşleşince dosyanın tamamı | Yok (hijyen ve güvenlik script'i var, boyut denetimi yok) |
| **Teknesyum Base** (karşılaştırma) | `relay/SKILL.md` 53.147 B = **10.112 token/çağrı**; `teknesyum-ui/SKILL.md` 27.730 B; 7 ajan ort. 3.324 B; 105 B–7.291 B komut | relay: gövde 53.147 B > referanslar 32.192 B (**oran ters**); ui: gövde 27.730 B > referanslar 27.093 B | Var: `relay-watch.js` içinde **6 ayrı `additionalContext`** noktası, bayt sınırı yazılı değil | Bench var (`docs/BENCH-SONUC.md`), cache kırılımı yok |

⚠ = karşı örnek.

## Beş soruya kısa cevap

**1. Skill dosyaları ne kadar büyük?** Medyan 3–9 KB. Anthropic'in kendi koleksiyonunda
medyan ~8 KB, en küçük gerçek skill 1.511 B, şablon 140 B. Bizim 53.147 B tarandığı
sürecin en büyük ikinci değeri — yalnız buildwithclaude'un 160.358 B'lik dosyası üstünde.

**2. Progressive disclosure var mı?** Üç katman her yerde aynı: metadata her zaman →
SKILL.md tetiklenince → referans/script gerektiğinde. Sayısal sınır iki yerde yazılı:
resmi belge (500 satır, ~2.000 kelime, description ≤1.024 karakter) ve superpowers
(sık yüklenen skill <200 kelime).

**3. Alt ajan tanımları ne kadar uzun?** context7 2.146 B, bizde ort. 3.324 B,
wshobson ort. 6.757 B, buildwithclaude uç 48.988 B. Bizim ajanlarımız iyi tarafta;
kısa tutanlar örnek ve gerekçe atmış, yalnız görev + sınır + çıktı biçimi bırakmış.

**4. Her istekte enjekte edilen metin var mı?** Üç depoda var, üçü de sınırlı:
superpowers oturum başına 3.108 B (tek dosya), hooks-mastery dosya başına 1.000 karakter,
claude-code yalnız desen eşleşince + saatlik kota. Bizde altı nokta var ve **tavan yok** —
en olası kaçak burası.

**5. Ölçüm yapmışlar mı?** On depodan ikisi: ccusage (dışarıdan, oturum bazlı, cache
ayrımlı) ve claude-cookbooks (eval'e bağlı, kolları teker teker açan çalışma). Kalan
sekizi körlemesine yazıyor.

## Optimizasyon planına giden üç ölçülebilir hedef

1. **Çağrı başına yük:** `relay/SKILL.md` 10.112 token → ≤2.700 token (500 satır /
   ~2.000 kelime tavanı). Fark ≈ **7.400 token, her relay çağrısında**.
2. **Description bütçesi:** bugün 5.217 B, harness tavanı 8.000 karakter (%65). Anthropic
   ortalaması 570 B/skill, superpowers 169 B/skill. Hedef belirlenirken tetiklenme
   isabeti bench'le doğrulanmalı — kısa description isabeti düşürür.
3. **Enjeksiyon tavanı:** 6 `additionalContext` noktası → tek nokta + bayt sayacı;
   referans değer superpowers'ın 3.108 B'si ve hooks-mastery'nin 1.000 karakterlik
   kırpması.

## Dosyalar

`claude-code-resmi.md` · `anthropic-skills.md` · `superpowers.md` · `wshobson-agents.md` ·
`buildwithclaude.md` · `hooks-mastery.md` · `context7.md` · `claude-cookbooks.md` ·
`ccusage.md` · `awesome-cursorrules.md`
