# microsoft/LLMLingua

## 1. Ne yapıyor, hangi problemi çözüyor

Prompt'u küçük bir dil modeliyle (GPT2-small, LLaMA-7B, ya da LLMLingua-2'de BERT
büyüklüğünde bir encoder) tarayıp "az bilgi taşıyan" token'ları siliyor. Kalan kısaltılmış
metin büyük modele gönderiliyor. Amaç: aynı işi daha az input token ile yaptırmak.

Üç ayrı yöntem tek depoda:

- **LLMLingua** (EMNLP'23) — perplexity tabanlı, bütçeye göre kaba-ince eleme.
- **LongLLMLingua** (ACL'24) — soruyu bilerek eliyor, uzun RAG bağlamı için.
- **LLMLingua-2** (ACL'24 Findings) — GPT-4'ten damıtılmış veriyle eğitilmiş token
  sınıflandırıcı; göreve bakmadan çalışıyor, öncekilerden hızlı.

Bizim problemimizle örtüşen kısım: sabit, tekrar eden metin yükünü küçültmek.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Tek Python paketi. Giriş noktası `PromptCompressor` sınıfı; üç yöntem aynı sınıfın
farklı çağrı biçimleri olarak sunuluyor. Sınırlar:

- **Sıkıştırıcı model ayrı.** Hedef LLM'e dokunulmuyor, eğitim gerekmiyor. Sıkıştırma
  yerel bir modelle yapılıyor, sonuç API'ye gidiyor.
- **Üç bölüm ayrımı**: `instruction` (korunur), `context` (sıkıştırılır), `question`
  (korunur). Bu ayrım deseninin kendisi öğretici — hangi metnin dokunulmaz olduğunu
  kullanıcı beyan ediyor.
- **Force tokens / force digits** — silinmemesi gereken şeyler (sayılar, JSON anahtarları,
  satır sonu) beyaz listeye alınıyor.

LangChain ve LlamaIndex entegrasyonları depo dışında, o projelerin içinde duruyor
(README'de bağlantı veriliyor).

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Bilgi yoğunluğunun token başına ölçülebilir olması.** Küçük model her token için bir
olasılık üretiyor; düşük şaşırtıcılıklı (tahmin edilebilir) token siliniyor, çünkü büyük
model onu zaten kendi kendine tamamlayabilir. Tüm yöntem bu tek varsayıma dayanıyor.

LLMLingua-2 bu varsayımı değiştirdi: perplexity yerine GPT-4'e "bu metni anlam kaybı
olmadan kısalt" dedirtip çıktıyı token etiketine çevirdiler, sonra bir encoder'a bunu
öğrettiler. Yani sinyal artık "tahmin edilebilirlik" değil, "GPT-4 bunu atardı".
Bu değişiklik, perplexity'nin yanlış şeyleri attığının itirafı sayılır.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`pip install llmlingua`. İlk çalıştırmada HuggingFace'ten sıkıştırıcı model iniyor —
LLMLingua-2 için ~500 MB sınıfında bir encoder, klasik LLMLingua için GPT2 ya da 7B'lik
bir model. **Yerelde bir model çalıştırmak zorunlu.**

Çıktı bir sözlük: sıkıştırılmış prompt, orijinal/sıkıştırılmış token sayısı, oran.
Bu ölçüm alanlarının kutudan çıkması iyi — sıkıştırmayı ölçmeden kullanmak mümkün değil.

Hata hâli: hedef oran tutturulamazsa yöntem sessizce daha az sıkıştırıyor; istisna
atmıyor. Yani "istediğim %80'i aldım mı" sorusunu kullanıcının kendisi kontrol etmeli.

## 5. Alınmaya değer en fazla 3 fikir

**1 — Metni "dokunulmaz / sıkıştırılabilir" diye ikiye ayırma beyanı.**
Ne: skill dosyasının hangi bölümü aynen kalmalı (komut adları, dosya yolları, sözleşme
şablonu), hangisi anlatım (gerekçe, örnek, uyarı) — bunu dosyanın kendisinde işaretlemek.
Neden değerli: relay/SKILL.md 53.147 bayt, 881 satır. İçindeki her satır aynı kritiklikte
değil; ayrım yapılmadan kısaltma yapılırsa komut adı kaybolur.
Maliyet: sıfır çalışma zamanı — sadece dosya düzeni kararı. Bir kereye mahsus elden geçirme.

**2 — Sıkıştırma oranını çıktının parçası yapmak.**
Ne: her kısaltma işleminde önce/sonra token sayısını ve oranı raporlamak.
Neden değerli: bizim bench'imiz 44.000 token farkı ölçtü ama farkın hangi dosyadan
geldiğini ölçmedi. Dosya başına oran olmadan hangi kısaltmanın işe yaradığı bilinmiyor.
Maliyet: token sayacı gerekiyor (bkz. `tokencost.md`, `litellm.md`).

**3 — Perplexity temelli otomatik sıkıştırmayı almamak, kararı sabit kılmak.**
Ne: LLMLingua-2'nin kendi geçmişi, otomatik sinyalin (perplexity) yanlış token attığını
gösteriyor — yöntem GPT-4 etiketine geçti. Bizim çıkarımımız: **statik markdown'ı çalışma
zamanında otomatik sıkıştırma, elle bir kez kısalt.**
Neden değerli: bizim dosyalarımız her istekte değişmiyor; bir kere elle kısaltılan dosya
sonsuz kez bedava kalır, her istekte çalışan bir sıkıştırıcı sonsuz kez ücret yazar.
Maliyet: elle kısaltma emeği; buna karşılık kalıcı ve ölçülebilir.

## 6. Şüpheli/riskli yanlar

**Lisans.** MIT. Marka ayrı korunmuyor; "LLMLingua" adı Microsoft'un ama depoda ayrı bir
marka maddesi yok — MIT'in standart metni. Kullanımda sorun yok.

**Bakım.** Son push 2026-04-08, ama varsayılan daldaki son commit **2025-10-28**
(SecurityLingua eklemesi). Son etiketli sürüm **v0.2.2, 2024-04-09** — iki yıldan eski.
6.593 yıldız, **119 açık issue**. Sürüm çıkmaması, issue birikimi ve commit seyrekliği
birlikte okununca: araştırma deposu, ürün değil.

**Doğrulanamayan iddialar.**
- "up to 20x compression with minimal performance loss" — depo açıklamasında ve README
  TL;DR'da geçiyor. Yazarların kendi ölçümü; bağımsız doğrulama bulunamadı. `doğrulanamadı`
- "improving RAG performance by up to 21.4% using only 1/4 of the tokens" (LongLLMLingua)
  — yazarların kendi makalesi. `doğrulanamadı`
- "3x-6x speed improvement over LLMLingua" (LLMLingua-2) — yazarların ölçümü.
  `doğrulanamadı`
- **Karşı bulgu:** LLaDA üzerinde LLMLingua-2'yi değerlendiren bağımsız bir çalışma,
  ~2x sıkıştırmada özetleme görevlerinin dayandığını ama **matematiksel akıl yürütmenin
  belirgin biçimde bozulduğunu**, yüksek anlamsal benzerlik skorlarına rağmen — bozulmanın
  anlam kayması değil **bilgi eksilmesi** kaynaklı olduğunu bildiriyor. Bu, "minimal
  performance loss" ifadesinin görev bağımlı olduğunu gösteriyor. Kaynak: arXiv 2605.17932.

**Gizli kurulum maliyeti — bizim için belirleyici.** Sıkıştırma için yerelde bir model
çalıştırmak gerekiyor (PyTorch + transformers + model ağırlıkları).

Base ölçümü bunu kesinleştirdi: `relay/SKILL.md` etkinleştiğinde **10.112 token** giriyor
ve **80 çağrı ölçüldü** — ama içerik seksen çağrının hepsinde **aynı**. Değişmeyen bir
metni her çağrıda yeniden sıkıştırmak, bir kez elle kısaltmanın işini seksen kez ücretle
yapmaktır. Aynı 10.112 token için doğru araç sıkıştırıcı değil, **prompt cache**
(okuma 0,1x) ve **elle kısaltma** (bir kerelik).

## Kaynaklar

- `gh api repos/microsoft/LLMLingua` — 2026-08-22: pushed_at 2026-04-08, 6.593 yıldız,
  119 açık issue, MIT, arşivlenmemiş, oluşturma 2023-07-07.
- `gh api repos/microsoft/LLMLingua/releases/latest` — v0.2.2, 2024-04-09.
- `gh api repos/microsoft/LLMLingua/commits` — varsayılan dal son commit 2025-10-28.
- Depo README (GitHub Contents API ile okundu).
- LLMLingua EMNLP'23: https://aclanthology.org/2023.emnlp-main.825/
- LLMLingua-2 ACL'24 Findings: https://aclanthology.org/2024.findings-acl.57/
- Bağımsız değerlendirme (LLaDA): https://arxiv.org/abs/2605.17932
- Yerel ölçüm: `wc -c teknesyum/skills/relay/SKILL.md` → 53.147 bayt, 881 satır.
