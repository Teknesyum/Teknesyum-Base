# langgraph

## 1. Ne yapıyor, hangi problemi çözüyor

Durum makinesi olarak ajan kurma çerçevesi. Ajanı bir konuşma değil, düğümleri ve
kenarları olan bir grafik olarak yazıyorsun; durum düğümler arasında paylaşılıyor,
checkpointer ile kalıcı hâle geliyor, iş yarıda kesilirse kaldığı yerden sürüyor.

Bizim sorunumuza en yakın duran şey: **ajanlar arası veri taşımanın maliyetini bir tasarım
kararı hâline getirmiş olması.** "Alt ajana ne gönderiyorsun, geri ne alıyorsun" sorusuna
belgelerde açık ve sayısal cevaplar var.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

`libs/` altında ayrı paketler: `langgraph` (çekirdek), `checkpoint` +
`checkpoint-postgres` / `checkpoint-sqlite` (kalıcılık), `prebuilt` (hazır ajan
kalıpları), `cli`, `sdk-py`, `sdk-js`.

Çekirdekte `langgraph/channels/` klasörü var: `last_value`, `topic`, `binop`,
`ephemeral_value`, `named_barrier_value`, `any_value`, `untracked_value`. Bunlar
**paylaşılan durumun yazma kuralları** — iki düğüm aynı alana yazarsa ne olur sorusunun
cevabı burada tanımlı.

Bu tam olarak blackboard deseni: ajanlar birbirine mesaj göndermiyor, ortak duruma yazıp
ortak durumdan okuyor. Mesaj kopyalama maliyeti yok; ama okuma alanını daraltma işi
tasarımcıya kalıyor.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

Paylaşılan durum + reducer. Düğüm tam geçmişi taşımıyor, durumun bir dilimini okuyup bir
dilimine yazıyor; reducer birleştirmeyi yapıyor. Checkpointer her adımda durumu yazıyor,
bu yüzden kesilen iş yeniden brifing gerektirmiyor — **devir maliyeti sıfıra yakın.**

Handoff belgesinde bunun mesaj tarafındaki karşılığı açık yazılmış: devirde yalnız
**handoff çifti** taşınıyor — tool call'u içeren AI mesajı ve onu onaylayan ToolMessage.
Gerekçe birebir maliyet: *"The receiving agent may become confused by irrelevant internal
reasoning, and token costs increase unnecessarily."* Ek bağlam gerekiyorsa ham geçmiş
değil, alt ajanın işinin **özeti** ToolMessage içeriğine konuyor.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`pip install -U langgraph`. Grafiği Python'da tanımlıyorsun, `invoke`/`stream` ile
koşuyorsun. Kesinti (interrupt) ile insan araya girebiliyor, durum okunup değiştirilip
devam edilebiliyor.

Gözlem tarafı **LangSmith**'e bağlı — ayrı, ticari bir ürün. Token maliyetini grafik
içinden okuyan yerleşik bir sayaç README'de tanıtılmıyor.

## 5. Alınmaya değer en fazla 3 fikir

**1. Devirde tam geçmiş değil, iki mesajlık handoff çifti.**
Ne: ajandan ajana geçerken yalnız devir çağrısı ve onun sonucu taşınır; gerekiyorsa
alt ajanın işi özetlenip tek mesaja konur.
Neden değerli: bench'te base'li koşu base'siz koşudan **114.000 token fazla** harcadı
(227k'ya 113k) ve bu farkın büyük kısmı brifing + rapor trafiği. Brifingi tam bağlamdan
iki mesaja indirmek doğrudan bu kalemi vuruyor.
Maliyet: özet üretmek bir ek LLM çağrısı ya da ajanın kendi raporunu şablona sığdırması.
Şablon ücretsiz, ek çağrı değil.

**2. Sayısal bağlam eşikleri — %85, 20.000, %10.**
Ne: LangChain'in Deep Agents belgesi somut varsayılanlar veriyor — özetleme modelin
`max_input_tokens` değerinin **%85**'inde tetikleniyor; model profili yoksa **170.000
token** eşiği ve **6 mesaj** tutma; son bağlamın **%10**'u korunuyor; araç girdisi veya
çıktısı **20.000 token**'ı aşarsa dosyaya taşınıp yerine dosya yolu ve **ilk 10 satırlık
önizleme** konuyor.
Neden değerli: bizde eşik yok, "gerekirse özetle" var. Bu sayılar kopyalanabilir
başlangıç noktası; araç çıktısını dosyaya taşıma özellikle bizim durumumuzda ucuz, çünkü
ajanlar zaten worktree'de dosya yazıyor.
Maliyet: düşük. Araç çıktısı dosyaya taşıma tamamen deterministik, model gerektirmiyor.

**3. "Çoğu durumda alt ajan açma" kuralının belgeye yazılması.**
Ne: handoff belgesi net bir varsayılan koyuyor: *"Use single agent with middleware for
most handoffs use cases—it's simpler. Only use multiple agent subgraphs when you need
bespoke agent implementations."*
Neden değerli: bench'imizin en dürüst bulgusu buydu — `eco` profili hiç ajan açmadı ve
doğrulukta diğerlerinden ayrışmadı, 157k token harcadı. Yani "ajan açma" varsayılan değil
istisna olmalı; çerçevenin kendisi bunu belgeye yazmış.
Maliyet: sıfır — bu bir kural, kod değil. Zor kısmı "bespoke" tanımını bizim tarafta
ölçülebilir yapmak (örneğin: farklı model profili gerekiyorsa ajan aç).

## 6. Şüpheli/riskli yanlar

- **Lisans:** MIT (`gh api repos/langchain-ai/langgraph`). OSI onaylı. LangGraph ve
  LangSmith isimleri LangChain Inc. markası; kod açık ama gözlem ürünü değil.
- **Son push:** 2026-08-22. Çok canlı. Son etiketli sürüm `sdk==0.4.3`, 2026-08-19 —
  ancak bu etiket SDK'nın, çekirdeğin değil; depo tek sürüm numarası taşımıyor, bu da
  sürüm takibini zorlaştırıyor.
- **Açık issue:** 709 (2026-08-22).
- **Belge dağınıklığı:** belgeler `langchain-ai.github.io`'dan `docs.langchain.com`'a
  taşınmış. Bu taramada `docs.langchain.com/oss/python/langgraph/subagents` **404 döndü**;
  aynı içerik `deepagents/context-engineering` altında bulundu. Yol adı veren her kaynak
  hızla eskiyor.
- **Yukarıdaki sayısal eşikler LangGraph çekirdeğinin değil, üstündeki Deep Agents
  paketinin varsayılanları.** Kod tarafından bu taramada doğrulanmadı — belge metnine
  dayanıyor, `doğrulanamadı` sayılmalı.
- **Gizli kurulum maliyeti:** ölçüm için LangSmith'e bağlanmak gerekiyor. Bizim ölçümümüz
  transcript'ten okunuyor; bu tarafı almaya gerek yok, ama "ölçüm var" diye alıntılanan
  şeyin ücretli bir ürün olduğu unutulmamalı.

## Kaynaklar

- `gh api repos/langchain-ai/langgraph` — 40.234 yıldız, 709 açık issue, MIT, son push
  2026-08-22T08:44:30Z, oluşturma 2023-08-09.
- `gh api repos/langchain-ai/langgraph/releases/latest` — `sdk==0.4.3`,
  2026-08-19T18:05:32Z.
- `gh api repos/langchain-ai/langgraph/contents/libs` — paket ayrımı.
- `.../libs/langgraph/langgraph/channels` — `last_value`, `topic`, `binop`,
  `named_barrier_value`, `ephemeral_value`, `any_value`, `untracked_value`.
- https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs — handoff çifti,
  token maliyeti uyarısı, tek ajan + middleware önerisi.
- https://docs.langchain.com/oss/python/deepagents/context-engineering — %85 eşiği,
  170.000 fallback, 6 mesaj, %10 son bağlam, 20.000 token araç çıktısı taşıma, 10 satır
  önizleme.
