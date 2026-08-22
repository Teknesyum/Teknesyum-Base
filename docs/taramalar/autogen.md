# microsoft/autogen

## 1. Ne yapıyor, hangi problemi çözüyor

Çok ajanlı uygulama çerçevesi. Ajanlar bir grup sohbetinde konuşuyor, sıra kime geleceğine
bir seçici karar veriyor. 2024'ün en çok atıf alan çok ajanlı çerçevesiydi.

**Bakım moduna alınmış.** README'nin en üstünde uyarı var: yeni özellik gelmeyecek,
topluluk yönetiyor, yeni kullanıcılar `microsoft/agent-framework`'e yönlendiriliyor.

Buna rağmen okumaya değer: bağlam maliyetini düşürmek için **üç ayrı ve birbirinden
bağımsız** mekanizma kurmuş — çerçevenin bu sorunla defalarca yüzleştiğinin kanıtı.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Python tarafı paketlere ayrılmış: `autogen-core` (aktör modeli, mesajlaşma, model
istemcisi, `model_context`), `autogen-agentchat` (ajanlar ve takımlar), `autogen-ext`
(model sağlayıcıları, MCP, araçlar), `autogenstudio` (arayüz).

Kritik sınır `autogen-core/model_context` altında: **ajanın hafızası ile modele giden
mesaj listesi ayrı nesneler.** Beş uygulama var:

- `UnboundedChatCompletionContext` — sınırsız, varsayılan.
- `BufferedChatCompletionContext` — son N mesaj.
- `TokenLimitedChatCompletionContext` — token sayarak kırpar.
- `HeadAndTailChatCompletionContext` — baş + son, ortayı atar.

`agentchat` tarafında `MessageFilterAgent` ve `SocietyOfMindAgent` var.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

`SocietyOfMindAgent`: bir **takımı tek ajan gibi paketliyor.** Dışarıdan bakınca tek
ajan; içeride bir takım koşuyor, sonra model istemcisi takımın mesajlarından tek bir yanıt
üretiyor ve takım `reset` ediliyor.

Yani iç konuşmanın tamamı dışarıya çıkmıyor. Üst seviye sohbete giren şey N ajanın N turu
değil, tek bir cevap. Bizim "ajan raporu ana oturuma tam metin dönüyor" sorunumuzun
doğrudan karşılığı.

İkinci mekanizma `MessageFilterAgent`: bir ajanı sarmalayıp ona giden mesajları kaynağa
göre süzüyor. `PerSourceFilter(source, position="first"|"last", count=N)`. Docstring'deki
örnek A → B → A → B → C döngüsü için şunu kuruyor: A yalnız kullanıcı mesajını ve B'nin
son mesajını görsün; B kullanıcıyı, A'nın son mesajını ve kendi önceki yanıtlarını
görsün; C kullanıcıyı ve B'nin son mesajını görsün.

Bu, "kim neyi görür"ü ajan başına yapılandırılabilir kılıyor — bizde şu an herkes brifingin
tamamını görüyor.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`pip install -U "autogen-agentchat" "autogen-ext[openai]"`. Python 3.10+. Beş satırda
çalışan bir ajan çıkıyor. `autogenstudio` ile kodsuz arayüz.

Çok ajanlı kurulum için README artık `AgentTool` örneğini öne çıkarıyor: uzman ajanı
`AgentTool(agent, return_value_as_last_message=True)` ile araca çeviriyorsun. Yani
"ajan = araç" kalıbı; dönen şey tek mesaj.

Hata hâli: `max_tool_iterations` gibi tavanlar var, ama **token bütçesi tavanı yok.**
Sınır aşımı bir hata değil, model istemcisinin bağlam hatası olarak geliyor.

## 5. Alınmaya değer en fazla 3 fikir

**1. İç takımı tek ajan gibi paketle (SocietyOfMind).**
Ne: alt ajan grubunun tüm iç konuşması dışarı sızmaz; üst seviyeye tek yanıt döner, sonra
iç takım sıfırlanır.
Neden değerli: bench'te `normal` koşusu 4 ajan açtı ve 226.856 token harcadı; `yalin`
0 ajanla 113.000. Fark ajan başına ~28k. Bu farkın bir kısmı brifing, bir kısmı raporun
ana bağlama yapışması. Rapor tek yanıta indirilirse, ajan sayısı arttıkça kazanç
doğrusal büyür.
Maliyet: iç takımın çıktısını özetlemek için bir ek model çağrısı. AutoGen bunu
`model_client` ile yapıyor; biz ajanın kendi raporunu sabit şablona sığdırarak ek çağrısız
da yapabiliriz.

**2. Kaynak bazlı mesaj filtresi.**
Ne: her ajan için "hangi kaynaktan kaç mesaj" kuralı tanımla; `first N` / `last N` /
hepsi.
Neden değerli: `normal` koşusunda 4 ajanın 2'si denetçiydi. Denetçinin işçi ajanların
ara turlarını görmesi gerekmiyor — son çıktı ve sözleşme yeter. Kaynak filtresi bunu
yapılandırma satırı hâline getirir, prompt talimatı olmaktan çıkarır.
Maliyet: düşük — filtre saf veri işleme, model çağırmıyor. Risk: fazla kırpınca denetçi
`@types/node` tipi bağlam hatalarını kaçırır; bench'te denetçinin bulduğu şey tam olarak
buydu.

**3. Bağlam stratejisini ajan yapılandırmasına taşı.**
Ne: `model_context` bir parametre — aynı ajan sınıfı sınırsız, tamponlu, token sınırlı
veya baş+son bağlamla koşabiliyor.
Neden değerli: bizde profil (eco/normal/premium) yalnız **model** seçiyor. Bağlam
stratejisini de profile bağlarsak eco gerçekten ucuzlar. Bench'te eco 157.709 token
harcadı — modeli değil bağlamı kısarak bunu düşürmek denenmedi.
Maliyet: düşük-orta. Baş+son stratejisi deterministik, ölçmesi kolay: aynı sözleşme iki
kez koşulur, token farkı okunur.

## 6. Şüpheli/riskli yanlar

- **Bakım modunda.** README'de `CAUTION` bloğu: yeni özellik gelmeyecek, topluluk
  yönetiyor, halefi `microsoft/agent-framework`. Bağımlılık kurulmamalı; desen alınmalı.
- **Lisans ikili ve kafa karıştırıcı.** Kök `LICENSE` dosyası **Creative Commons
  Attribution 4.0** — GitHub API da lisansı `CC-BY-4.0` diye raporluyor. Kod için ayrı
  `LICENSE-CODE` dosyası var ve o **MIT**. CC-BY-4.0 OSI onaylı bir yazılım lisansı
  değil; kütüphaneyi bağımlılık yapacaksan hangi dosyanın hangi klasörü kapsadığını
  ayrıca doğrulamak gerekir.
- **Son etiketli sürüm `python-v0.7.5`, 2025-09-30** — yaklaşık 11 ay. Son push
  2026-04-15, o da 4 ay önce.
- **Açık issue: 992** (2026-08-22). Bakım modundaki bir depo için bu sayı kapanma
  ihtimalinin düşük olduğu anlamına geliyor.
- **`TokenLimitedChatCompletionContext` "experimental"** olarak işaretli (v0.4.10'da
  eklenmiş) ve model istemcisinin `count_tokens` / `remaining_tokens` desteğine bağımlı.
  Her sağlayıcıda çalışmayabilir.
- **Ölçüm zayıf.** `RequestUsage` ile çağrı başına token okunabiliyor ama takım düzeyinde
  toplam maliyet raporlayan yerleşik bir mekanizma bu taramada bulunamadı. Ajan açma
  kararı için **hiçbir eşik kuralı yok** — `token_limit` elle veriliyor.

## Kaynaklar

- `gh api repos/microsoft/autogen` — 60.570 yıldız, 992 açık issue, lisans `CC-BY-4.0`,
  son push 2026-04-15T11:59:09Z.
- `gh api repos/microsoft/autogen/releases/latest` — `python-v0.7.5`,
  2025-09-30T06:18:26Z.
- `LICENSE` (Attribution 4.0 International) ve `LICENSE-CODE` (MIT).
- README — bakım modu uyarısı, `AgentTool` çok ajanlı örneği, kurulum.
- `python/packages/autogen-core/src/autogen_core/model_context/` — beş bağlam sınıfı.
- `.../model_context/_token_limited_chat_completion_context.py` — deneysel etiketi,
  `token_limit`, `count_tokens` bağımlılığı.
- `python/packages/autogen-agentchat/src/autogen_agentchat/agents/_message_filter_agent.py`
  — `PerSourceFilter`, A→B→A→B→C örneği.
- `.../agents/_society_of_mind_agent.py` — iç takım, tek yanıt, `Team.reset()`.
