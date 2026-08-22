# openai/swarm ve halefi openai-agents-python

İki depo tek dosyada: `openai/swarm` deneysel/eğitim amaçlı ve yerini bıraktı,
`openai/openai-agents-python` onun üretim hâli. Fikir aynı, olgunluk farklı.

## 1. Ne yapıyor, hangi problemi çözüyor

Swarm iki ilkel kavram tanımlıyor: `Agent` (talimat + araçlar) ve **handoff** (devir).
Ajan istediği anda konuşmayı başka bir ajana devredebiliyor. README'nin gerekçesi tam
bizim sorunumuz: *"situations dealing with a large number of independent capabilities and
instructions that are difficult to encode into a single prompt."*

Yani ajan açmanın amacı paralellik değil, **tek prompt'a sığmayan talimat kümesini
bölmek.** Bu ayrım bench sonucumuzu doğrudan ilgilendiriyor.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Swarm'da sınır sert: `client.run()` tek bir döngü — modelden yanıt al, araçları çalıştır,
gerekirse ajanı değiştir, bağlam değişkenlerini güncelle, yeni çağrı yoksa dön.
**Çağrılar arasında durum tutulmuyor**, istemci tarafında koşuyor.

Agents SDK bunu genişletmiş ama ilkeyi korumuş: `src/agents/` altında `handoffs/`,
`memory/`, `models/`, `guardrail.py`, `run.py`, `result.py`, `extensions/`.
İki farklı delege etme yolu var ve ikisi maliyet açısından farklı:

- **Handoff** — kontrol karşı tarafa geçer, konuşma devam eder.
- **Agents as tools** (`as_tool`) — alt ajan bir araç gibi çağrılır, tek sonuç döner,
  kontrol çağırana geri gelir.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Devirde yeni bağlam açılmıyor.** Swarm'da devralan ajan aynı mesaj listesini sürdürüyor;
değişen tek şey sistem talimatı ve araç kümesi. Yeni ajan = yeni sistem promptu, yeni
bağlam kopyası değil.

Bizim bench'imizin ölçtüğü şey tam olarak bunun tersi: her ajan kendi bağlamını taşıyor.

Agents SDK bunun üstüne **handoff input filter** koymuş. `extensions/handoff_filters.py`
içindeki `remove_all_tools`, devirden önce geçmişteki tüm araç öğelerini (dosya arama, web
arama, fonksiyon çağrıları ve çıktıları) siliyor. Devredilen şey konuşma; araç gürültüsü
değil.

Yanında `nest_handoff_history` ve `default_handoff_history_mapper` var — geçmişi
düzleştirmek yerine iç içe paketleme seçeneği.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Swarm: `pip install git+https://github.com/openai/swarm.git` — PyPI'da bile değil, eğitim
amaçlı olduğu buradan da belli.

Agents SDK: `pip install openai-agents` (Python 3.10+). `Runner.run_sync(agent, "...")`
ile üç satırda çalışıyor. Sağlayıcıdan bağımsız — Responses ve Chat Completions API'leri
ile 100+ model destekleniyor (README iddiası).

Bütçe tarafı zayıf: Swarm'da tek tavan `max_turns` (varsayılan sonsuz). Agents SDK'da
`Tracing` ile çalışma izlenebiliyor ve kullanım (usage) sonuçta okunabiliyor, ama
**token bütçesi aşılınca durduran bir mekanizma README'de tanıtılmıyor.** Sınırlama
`guardrails` ve `max_turns` üzerinden.

## 5. Alınmaya değer en fazla 3 fikir

**1. Devir = sistem promptu değişimi, bağlam kopyası değil.**
Ne: alt ajana iş verirken yeni bağlam kurmak yerine aynı konuşmayı sürdür; değişen yalnız
rol talimatı ve araç kümesi olsun.
Neden değerli: bench'in çekirdek bulgusu "her ajan kendi bağlamını taşıyor". `normal`
koşusu 4 ajanla 226.856 token, `yalin` 0 ajanla 113.000 token harcadı — ajan başına
~28.000 token'lık sabit maliyet. Devir modelinde bu sabit maliyet sistem promptu farkına
iner, yani birkaç bin token.
Maliyet: yüksek — bu mimari değişikliği. Bizim ajanlar ayrı süreçler ve ayrı worktree'ler;
"aynı konuşmayı sürdürme" doğrudan uygulanamaz. Ama **paralellik gerekmeyen işlerde**
ajan açmak yerine ana oturumun rolünü değiştirmek uygulanabilir ve ölçülebilir: aynı
sözleşme iki kez koşulur, token farkı okunur.

**2. Devirden önce araç gürültüsünü kırp.**
Ne: `remove_all_tools` — devredilen geçmişten tüm araç çağrıları ve çıktıları silinir.
Neden değerli: bizde ajan raporları ve brifingler ham araç çıktısı içeriyor (dosya
listeleri, test çıktıları, derleme logları). Bunlar devralan için değersiz ama en hacimli
kısım.
Maliyet: düşük — filtre saf veri işleme, model çağırmıyor. Ölçüm kolay: brifing token
sayısı filtre öncesi/sonrası.

**3. "Araç olarak ajan" ile "devir" arasında bilinçli seçim.**
Ne: Agents SDK ikisini ayrı kavram olarak sunuyor. Araç olarak ajan → tek sonuç döner,
kontrol geri gelir. Devir → kontrol gider.
Neden değerli: bench'te denetçi ajanlar "araç" davranışına uygun (tek bulgu listesi
döndürüyor, kontrol ana oturuma dönüyor), işçi ajanlar "devir" davranışına. Bu ayrım şu an
bizde yok, ikisi de aynı maliyetle açılıyor. Ayırmak, denetçiyi ucuzlatmanın kapısını
açar — denetçiye tam bağlam yerine yalnız çıktı + sözleşme verilir.
Maliyet: düşük — sözleşme şemasında tek alan (`tip: isci | denetci`), ve denetçi
brifinginin daraltılması.

## 6. Şüpheli/riskli yanlar

- **Swarm terk edilmiş ve bunu kendisi söylüyor.** README'nin başında `IMPORTANT` bloğu:
  yerini Agents SDK aldı, üretim için ona geçin. `gh api .../releases/latest` **404**
  döndü — **hiç etiketli sürüm yok.** Son push 2026-04-15, 21.913 yıldız, 33 açık issue,
  MIT. Arşivlenmemiş ama ölü. Okumaya değer, bağımlılık yapılmaz.
- **Agents SDK çok hızlı hareket ediyor.** Son sürüm `v0.22.0`, 2026-08-19; son push
  2026-08-22. Sürüm numarası hâlâ 0.x — API kararlı değil. 28.864 yıldız, 16 açık issue,
  MIT.
- **Lisans:** ikisi de MIT, OSI onaylı. OpenAI markası ayrı; kod açık, servis değil.
- **Sağlayıcı çekimi.** SDK "provider-agnostic" diyor ama varsayılan yol OpenAI
  Responses API ve Tracing OpenAI panosuna gidiyor. "100+ LLM desteği" README iddiası,
  bu taramada **doğrulanamadı**.
- **Bütçe tavanı yok.** İki depoda da token/dolar tavanı yok; SWE-agent'ın
  `per_instance_cost_limit` karşılığı bulunmuyor. Ajan açma kararı için **eşik kuralı
  yok** — karar tamamen modelin.
- **Gizli kurulum maliyeti:** SDK'nın yeni `SandboxAgent`'ı Windows'ta doğrudan
  çalışmıyor; `UnixLocalSandboxClient` yalnız macOS/Linux, Windows için Docker gerekiyor
  (README). Bizim ortamımızda ek bağımlılık.

## Kaynaklar

- `gh api repos/openai/swarm` — 21.913 yıldız, 33 açık issue, MIT, son push
  2026-04-15T17:10:28Z, oluşturma 2024-02-22.
- `gh api repos/openai/swarm/releases/latest` — HTTP 404, etiketli sürüm yok.
- `gh api repos/openai/openai-agents-python` — 28.864 yıldız, 16 açık issue, MIT, son push
  2026-08-22T13:59:20Z, oluşturma 2025-03-11.
- `gh api repos/openai/openai-agents-python/releases/latest` — `v0.22.0`,
  2026-08-19T13:44:38Z.
- Swarm README — handoff tanımı, `client.run()` döngüsü, `max_turns`, "stateless between
  calls", halef duyurusu.
- Agents SDK README — handoff / agents-as-tools ayrımı, Sessions, Tracing, sandbox
  platform notu.
- `src/agents/extensions/handoff_filters.py` — `remove_all_tools`, `nest_handoff_history`,
  `default_handoff_history_mapper`.
- `src/agents/handoffs/` — `history.py`.
