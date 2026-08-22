# SWE-agent

## 1. Ne yapıyor, hangi problemi çözüyor

LLM'e bir GitHub issue'su ve bir depo veriyor, ajanın kabuk üzerinden dosya açıp
düzenleyip test koşarak yama üretmesini sağlıyor. Asıl iddiası ajan-bilgisayar arayüzü
(ACI): modelin gördüğü araç yüzeyini insan terminaliyle aynı değil, model için tasarlanmış
tutmak.

Bizim için önemli olan yanı ajan mimarisi değil: **maliyeti para birimiyle sınırlayan ve
raporlayan tek depo bu.**

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

`sweagent/agent/` altında altı dosya, sınırlar net:

- `agents.py` — `DefaultAgent` (tek ajan döngüsü) ve `RetryAgent` (aynı işi birden çok kez
  deneyen üst sarmalayıcı). İkisi de `AbstractAgent`'tan türüyor.
- `models.py` — model istemcisi **ve** maliyet muhasebesi. `InstanceStats` ve
  `GLOBAL_STATS` burada.
- `history_processors.py` — geçmişi modele göndermeden önce kırpan/etiketleyen filtreler.
- `reviewer.py` — denetçi ve yeniden deneme döngüsü.
- `problem_statement.py`, `action_sampler.py`, `hooks/`.

Sınır şu: **ajan geçmişi ile modele giden mesaj listesi aynı şey değil.** Ajan tam
geçmişi tutar, `history_processors` her sorgudan önce onu daraltır. Kayıt kaybolmuyor,
sadece taşınmıyor.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

Maliyetin sert tavanı ve onun istisna olarak fırlatılması.

`GenericAPIModelConfig` içinde `per_instance_cost_limit` varsayılanı **3.0** (dolar).
Yanında `total_cost_limit` ve `per_instance_call_limit` var. Sınır aşılınca
`InstanceCostLimitExceededError` / `TotalCostLimitExceededError` fırlatılıyor — yani
maliyet bir log satırı değil, **akışı durduran bir hata.**

`reviewer.py` bunun üstüne kuruyor: `ScoreRetryLoopConfig` ve `ChooserRetryLoopConfig`
"yeni bir denemeye başlamak için elde kalması gereken en az dolar" alanını taşıyor
(dosyadaki tanım: *"Minimal $ that need to be left in order for us to start a new
attempt"*), ve `cost_limit` alanı **denetim maliyetini kapsamdan ayrı tutuyor** —
*"maximum cost to spend on all attempts and reviews except the last review"*.

Yani denetçi bedava sayılmıyor; bütçeye ayrı kalem olarak yazılıyor.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Python paketi + YAML yapılandırma. Ajanın davranışı `config/` altındaki YAML'larla
belirleniyor; `history_processors` listesi de orada tanımlanıyor.

Hata hâli açık: bütçe biterse çalışma durur ve durum "exit_cost" olarak kaydedilir.
`reviewer.py` bunu ayrıca cezalandırıyor — `failure_score_penalty`, maliyet yüzünden
kendiliğinden teslim eden çözümün puanını düşürüyor.

## 5. Alınmaya değer en fazla 3 fikir

**1. Sözleşme başına token tavanı, aşılınca durdurma.**
Ne: her sözleşmeye `per_instance_cost_limit` benzeri bir token tavanı yaz; ajan tavanı
aşarsa iş uyarıyla değil hatayla biter.
Neden değerli: bench'te base'li koşu 227k, base'siz 113k token harcadı — 114k'lık fark
kimsenin bütçesinde görünmedi. Ajan başına örneğin 25k token tavanı koyulsaydı, 4 ajanlı
`normal` koşusunun ajan payı 100k ile sınırlanırdı.
Maliyet: ajan brifingine tek satır alan; ölçüm için transcript'ten token okuma zaten var.

**2. Denetim bütçesini ayrı kalemde tutma.**
Ne: `cost_limit` "son denetim hariç tüm denemeler ve denetimler" diye tanımlı — denetçi
bütçesi işçi bütçesinden ayrı sayılıyor.
Neden değerli: bench'te denetçi gerçek bir hata buldu (`@types/node` depoda yok, temiz
klonda `tsc` çökerdi). Denetimi kesmek istemiyoruz; ama `normal` koşusunda 4 ajanın 2'si
denetçiydi, yani ajan bütçesinin yarısı denetime gitti ve bu hiçbir yerde yazılı değildi.
Ayrı kalem, "denetim işin %50'sine mal oldu" cümlesini ölçülebilir yapar.
Maliyet: ölçü satırına tek alan (`denetim_token`); ayrı bir mekanizma gerekmiyor.

**3. Son N gözlem dışındakini kırp — ama sayaçlı.**
Ne: `LastNObservations`, orijinal makalede n=5 ile kullanılmış; eski gözlemler
*"Old environment output: (n lines omitted)"* ile değiştiriliyor. Yanında `polling`
parametresi var: her adımda değil, `polling` adımda bir kırpma yaparak prompt cache'in
her turda çökmesini engelliyor (varsayılan 1, yani n ile n+polling arası gözlem tutulur).
Neden değerli: bizde ajan raporu ana oturuma tam metin dönüyor. Cache farkındalığı olan
kırpma, kırpmanın kendi maliyetini de hesaba katıyor.
Maliyet: orta — kırpma kolay, cache uyumunu ölçmek zor. Dosyanın kendisi uyarıyor:
kırpma prompt cache'i bozar, ve *"most SotA models can now fit a lot of context, so
generally this history processor is not always needed anymore."*

## 6. Şüpheli/riskli yanlar

- **Lisans:** MIT (`gh api repos/SWE-agent/SWE-agent`). OSI onaylı. Marka için ayrı bir
  koruma metni bu taramada incelenmedi.
- **Sürüm yaşı:** son etiketli sürüm `v1.1.0`, 2025-05-22. Son push 2026-08-17. Yani kod
  hareketli ama **15 aydır etiketli sürüm çıkmamış** — sürüm bağımlılığı kurmak isteyen
  için sorun.
- **Açık issue:** 82 (2026-08-22). Depo boyutuna göre düşük.
- **`per_instance_cost_limit` varsayılanı $3.00**, ama bunun hangi model ve hangi görev
  dağılımı için kalibre edildiği kodda yazmıyor. Bizim token bütçemize doğrudan
  çevrilemez; kendi eşiğimizi kendimiz ölçmemiz gerekir.
- **Gizli kurulum maliyeti:** çalışma ortamı Docker konteyneri bekliyor. Bizim Windows +
  worktree kurulumumuza doğrudan taşınmaz; alınan şey desen, altyapı değil.
- SWE-bench skorları depoda ve makalede geçiyor ama bu taramada **birincil kaynaktan
  doğrulanmadı** — rapora rakam olarak yazılmadı.

## Kaynaklar

- `gh api repos/SWE-agent/SWE-agent` — 20.107 yıldız, 82 açık issue, MIT, son push
  2026-08-17T22:33:19Z, oluşturma 2024-04-02.
- `gh api repos/SWE-agent/SWE-agent/releases/latest` — `v1.1.0`, 2025-05-22T16:11:39Z.
- `sweagent/agent/models.py` — `per_instance_cost_limit` (varsayılan 3.0),
  `total_cost_limit`, `per_instance_call_limit`, `InstanceStats`, `GLOBAL_STATS`,
  `InstanceCostLimitExceededError`.
- `sweagent/agent/history_processors.py` — `LastNObservations` (n, polling, tag'ler),
  `CacheControlHistoryProcessor` (`last_n_messages` varsayılan 2),
  `ClosedWindowHistoryProcessor`, `RemoveRegex`.
- `sweagent/agent/reviewer.py` — `ReviewerConfig`, `ScoreRetryLoopConfig`,
  `ChooserRetryLoopConfig`, `failure_score_penalty`.
- `sweagent/agent/agents.py` — `DefaultAgent`, `RetryAgent`, `max_requeries` (3).
