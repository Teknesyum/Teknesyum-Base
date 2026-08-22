# stanfordnlp/dspy — prompt boyutu açısından

Bu depo başka bir taramada da var. Burada tek bir soruya bakılıyor: **DSPy prompt'u
küçültüyor mu, büyütüyor mu?**

Cevap: **büyütüyor.** Ve bunu bilerek yapıyor. Bizim için değerli olan da bu.

## 1. Ne yapıyor, hangi problemi çözüyor

Prompt yazmayı bırakıp program yazmayı öneriyor. Kullanıcı bir **signature** tanımlıyor
(`soru -> cevap` gibi girdi/çıktı sözleşmesi), DSPy bunu bir prompt'a çeviriyor. Sonra
bir **optimizer** (teleprompter) etiketli örneklerle bu prompt'u iyileştiriyor: yönergeyi
yeniden yazıyor, few-shot örnek seçiyor, bazen ağırlık ince ayarı yapıyor.

Çözdüğü problem: elle prompt yazmanın kırılganlığı — model değişince prompt bozuluyor.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Paket içindeki bölümler doğrudan kavramsal sınırları veriyor:

- `signatures/` — girdi/çıktı sözleşmesi. **Prompt metni değil, şema.**
- `adapters/` — şemayı gerçek prompt metnine çeviren katman. Chat formatı, JSON formatı
  gibi seçenekler burada.
- `predict/` — çağrı modülleri (Predict, ChainOfThought, ReAct).
- `teleprompt/` — optimizerlar (BootstrapFewShot, MIPROv2, GEPA vb.).
- `propose/` — yeni yönerge metni öneren bileşen.
- `evaluate/` — metrik ve değerlendirme.
- `clients/` — LM sağlayıcı katmanı.

En önemli sınır: **prompt metni kullanıcının elinde değil, `adapters/` katmanının
elinde.** Kullanıcı ne yazacağını değil ne istediğini söylüyor. Bu, prompt boyutunun
kullanıcı kontrolünden çıkması demek — hem iyi hem kötü.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Optimizer, prompt'a örnek doldurarak kalite kazanıyor.** BootstrapFewShot ve MIPROv2'nin
yaptığı iş özünde şu: eğitim kümesinden başarılı çalışma izlerini toplayıp bunları
prompt'a few-shot demo olarak yerleştirmek, ve yönerge metnini arama yoluyla iyileştirmek.

Yani **kalite artışının para birimi input token'dır.** Optimize edilmiş bir DSPy programı,
optimize edilmemişten daha uzun prompt gönderir. Kazanç doğrulukta, kayıp bağlamda.

Bu bizim için doğrudan bir ders: **44.000 token fazla harcamak kendi başına başarısızlık
değil.** DSPy'ın bütün tezi, doğru yerleştirilmiş fazladan token'ın karşılığını verdiği.
Soru "fazla mı harcadık" değil, "harcadığımızın karşılığını aldık mı". Bizim bench'imiz
(`docs/BENCH-SONUC.md`) doğruluk tarafında **hiçbir ayrışma bulamadı** — dördü de geçti.
DSPy çerçevesinden bakınca bu, 44.000 token'ın karşılığının alınmadığı anlamına geliyor.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`pip install dspy`. Belgeler depo dışında (dspy.ai); README neredeyse tamamen oraya
yönlendiriyor — depo kendi başına öğretici değil.

İlk çalıştırma: bir LM tanımla, bir signature yaz, `dspy.Predict` çağır. Optimizasyon
ayrı bir adım ve **maliyetli**: optimizer eğitim kümesi üzerinde onlarca/yüzlerce LM
çağrısı yapıyor.

Hata hâli: optimizasyon sırasında çıktı formatı tutmazsa adapter yeniden deniyor; bu
sessiz ek çağrı maliyeti yaratıyor.

## 5. Alınmaya değer en fazla 3 fikir

**1 — Yönergeyi "şema" ve "anlatım" diye ayırmak (signature deseni).**
Ne: DSPy'ın signature'ı bir sözleşme; anlatım metni değil. Bizim SKILL.md'lerimizde ikisi
karışık duruyor — 881 satırın içinde hem "sözleşme dosyası şu alanları içerir" (şema) hem
"çünkü geçen sefer şöyle oldu" (anlatım) var.
Neden değerli: şema kısmı kısa ve dokunulmaz, anlatım kısmı uzun ve kısaltılabilir.
relay/SKILL.md 53.147 bayt; ayrım yapılmadan hangi 30 KB'ın gidebileceği belirlenemiyor.
Maliyet: bir kerelik okuma ve işaretleme. Sıfır çalışma zamanı.

**2 — Prompt değişikliğini ölçüye bağlamak (evaluate deseni).**
Ne: DSPy'da hiçbir prompt değişikliği metriksiz kabul edilmiyor; `evaluate/` optimizerın
zorunlu girdisi.
Neden değerli: bizim bench'imiz dört koşuda doğruluk farkı bulamadı — yani mevcut metrik
prompt değişikliğine duyarsız. Skill dosyasını 53 KB'dan 20 KB'a indirdiğimizde neyin
bozulduğunu ölçecek bir metriğimiz **yok**. Kısaltmadan önce metrik gerekiyor, yoksa
kısaltma kör bir bahis.
Maliyet: bench'in yeniden tasarımı — doğruluk değil, davranışa duyarlı bir ölçüt.
Ciddi emek, ama kısaltma kararının ön koşulu.

**3 — Few-shot örneği prompt'a gömmek yerine referansa itmek.**
Ne: DSPy örnekleri prompt'a gömer çünkü optimizer başka yol bilmez. Bizim skill
mekanizmamız `references/` üzerinden koşullu yükleme yapabiliyor — DSPy'ın yapamadığı şey.
Neden değerli: DSPy'ın "örnek = token" denklemi bizde geçerli değil. Örnekler
`references/` altına taşınırsa maliyet, örneğe ihtiyaç duyulan oturumlara sınırlanır.
relay'de `references/` zaten kullanılıyor (protocol.md 17.424 bayt) — genişletilebilir.
Maliyet: dosya taşıma + SKILL.md'de "şu durumda şunu oku" satırları. Düşük.

## 6. Şüpheli/riskli yanlar

**Lisans.** MIT. Marka ayrı korunmuyor, standart MIT.

**Bakım.** Çok canlı: son push 2026-08-21, son etiketli sürüm **3.3.1, 2026-08-21** —
aynı gün. 37.498 yıldız. Ama **643 açık issue**. Hızlı sürüm temposu + yüksek issue
sayısı, API'nin oynak olduğuna işaret ediyor; 1.x → 2.x → 3.x geçişleri kırıcı olmuş.

**Doğrulanamayan iddialar.**
- README'de bağlanan GEPA makalesi (arXiv 2507.19457) başlığında "Can Outperform
  Reinforcement Learning" diyor. Yazarların kendi ölçümü, bağımsız doğrulama görülmedi.
  `doğrulanamadı`
- MIPROv2'nin (arXiv 2406.11695) kazanç rakamları yine yazarların. `doğrulanamadı`
- **Depoda prompt boyutuna dair hiçbir ölçüm yok.** DSPy token maliyetini birinci sınıf
  bir metrik olarak sunmuyor; optimizasyonun prompt'u ne kadar büyüttüğü belgelenmemiş.
  Bizim sorumuz açısından bu bir boşluk.

**Bize uymayan kısım — belirleyici.** DSPy prompt'u **çalışma zamanında Python'la**
üretiyor. Bizim yükümüz statik markdown ve Claude Code'un skill yükleyicisi. DSPy'ın
optimizerını bizim SKILL.md'lerimize uygulamanın yolu yok: ne bir eğitim kümemiz var,
ne prompt'u program olarak üretiyoruz, ne de bir metriğimiz. **Araç olarak uymaz;
disiplin olarak (şema/anlatım ayrımı, ölçüsüz değişiklik yok) uyar.**

**Gizli maliyet.** Optimizasyon bir kerelik değil, süregelen bir maliyet: model
değişince yeniden koşmak gerekiyor. Ayrıca Python + LiteLLM bağımlılık yüzeyi geliyor.

## Kaynaklar

- `gh api repos/stanfordnlp/dspy` — 2026-08-22: pushed_at 2026-08-21, 37.498 yıldız,
  643 açık issue, MIT, arşivlenmemiş, oluşturma 2023-01-09.
- `gh api repos/stanfordnlp/dspy/releases/latest` — 3.3.1, 2026-08-21.
- `gh api repos/stanfordnlp/dspy/contents/dspy` — paket klasör yapısı.
- Depo README (Contents API ile okundu).
- GEPA: https://arxiv.org/abs/2507.19457
- MIPRO: https://arxiv.org/abs/2406.11695
- Yerel: `docs/BENCH-SONUC.md` — dört koşuda doğruluk ayrışması yok.
