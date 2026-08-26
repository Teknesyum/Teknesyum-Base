# Onarım planı — ölçüm, ürün, düzenek

Kaynak: kullanıcının 26.08.2026 tarihli talebi ("bunlar düzelecek, çok ciddiyim; olabilecek
her şeyi düşüneceğiz; bu proje benim kodlama sistemimin temeli olacak, kusurlu olamaz").
Teşhis: `docs/BRIFING-ONARIM.md`. Plan konseyi: Fable-Onarım planı + Opus-Onarım planı,
başkan T0 (opus). Fable'ın stratejik ikinci görüşü brifing §3'te.

## 0. Teşhisin özeti — neyi onarıyoruz

İki ayrı hastalık var, ikisi de gerçek:

1. **Ölçüm kırık.** 12 koşunun 6'sı paylaşılan hesabın kotasına çarpıp kesildi ama geçerli
   sayıldı; cache-read metriği tur sayısının türevi (r=0,992); tasarımın gücü sıfır (n=3,
   gereken ~12); "randomize blok" denmiş, hiçbir rastgeleleştirme yok.
2. **Ürün vaadini yaptırıma bağlamıyor.** Profiller diskte yalnız profil adını ve
   `autoCompactWindow`'u değiştiriyor; model tabloları `premium.js` içinde var ama ajan
   frontmatter'ına ya da Task çağrısına hiç yazılmıyor; paralellik bir prompt cümlesi;
   sapma denetimi bloklamıyor, log'a yazıp geçiyor. Sonuç: 12/12 koşuda sıfır ajan, sıfır
   skill çağrısı — ~4k token'lık bağlam yükünün karşılığı bir banner satırı.

Düzeltilen teşhis (Opus üyesi): relay "setup incomplete" ile devre dışı kalmadı;
`kurulumEksik()` yalnız statusline varlığına bakıp banner'a uyarı ekliyor. Relay **hiç
çağrılmadı** — sorun bozuk kurulum değil, tetikleyici yokluğu.

## 1. Sıralama kararı ve gerekçesi

Konseyin ortak hükmü: **hijyen (ucuz, her şeyin önkoşulu) → ürün → yeni düzenek.**

Gerekçe: ürün değişmeden ölçüm düzeneğini kusursuzlaştırmak, aynı sıfır farkı daha pahalıya
ölçmektir. Önce ölçülecek bir fark üretilir, sonra onu görecek düzenek kurulur. Hijyen bunun
istisnası: geçerli koşu kapısı ve yanlış hükümlerin geri çekilmesi hem ucuz hem itibar borcu,
ürünü beklemez.

## 2. Dalga 1 — Hijyen ve geri çekme (paralel, hemen)

| İş | Sahip | Dosyalar | Kabul |
|---|---|---|---|
| **O1** Geçerli koşu kapısı ve metrik seti | builder | `scripts/bench/kos.js`, `topla.js`, `istatistik.js` | Çıkış kodu ≠0, `tavanAsildi`, transkriptte `session limit`/`is_error` olan koşu `gecerli:false` damgalanır, toplamaya girmez, `kusurSayisi` null olur. Mevcut 12 sonuç yeniden toplandığında **tam 6 koşu** elenir. `cacheRead` birincil metrikten çıkar; her metrik yanında tur korelasyonu basılır, r>0,9 olan "türev" etiketi alır. |
| **O2** Gerçek rastgeleleştirme ve kota dayanıklılığı | builder | `scripts/bench/kos.js` | Blok içi koşul sırası tohumlu permütasyon, tohum sonuç JSON'una yazılır; iki farklı tohum kuru koşuda farklı sıra üretir. Kota duvarına çarpan blok geçersiz sayılıp kuyruğa geri alınır (duraklat-devam et). |
| **O3** Raporların geri çekilmesi | scribe | `docs/BENCH-PROJE.md`, `docs/BENCH-SONUC.md` | "premium 27 kusurla yarım teslim etti", "eco en çok bağlam okudu", "randomize blok" hükümleri **silinmez, üstü çizilip düzeltme notu eklenir**; belge başına geçersiz-koşu uyarısı. Kalan hiçbir sayısal hüküm elenen 6 koşuya dayanmıyor. |
| **O4** Spike: headless'ta orkestrasyon mümkün mü | builder | `scripts/bench/spike.js` | `claude -p` altında (a) Task/Agent aracı fiilen açılabiliyor mu, (b) `--resume` ile zincirlenen oturum önceki bağlamı görüyor mu — ikisi de evet/hayır olarak kanıtlanır. **Dalga 3'ün tasarımı bu cevaba bağlı**, o yüzden Dalga 1'de koşar. |

## 3. Dalga 2 — Ürün onarımı (O1-O4'ten bağımsız, paralel)

| İş | Sahip | Dosyalar | Kabul |
|---|---|---|---|
| **O5** Model tablosunun yaptırıma bağlanması | builder | `teknesyum/agents/*.md`, `teknesyum/scripts/premium.js` | `premium.js`'teki profil×rol tablosu ajan frontmatter'ına (`model:`, `maxTurns`) yazılır ya da Task çağrısına parametre olarak geçer. Profil değişince tanımlar güncellenir. `/premium premium` sonrası `agents/builder.md` frontmatter'ında `model: opus`. Karar notu: frontmatter makine geneli mi değiştiriyor, önce `docs/ROTA-*` içinde bilinçli tasarım kararı aranır. |
| **O6** Sapma denetimi bloklayıcı olur | builder | `teknesyum/hooks/` (`kimlikDenetle` sahibi) | Beyan/gerçek model-efor sapmasında `decision: block` + gerekçe döner; tek açık kaçış ayarı bulunur. Kasıtlı yanlış beyanla açılan ajan bloklanır; defterdeki 63 kayıtlık sapma borcu artmaz. |
| **O7** Relay tetikleyicisi ve paralelliğin koda taşınması | builder | `teknesyum/hooks/relay-watch.js`, `premium.js` | Relay'in neden hiç çağrılmadığı kök nedeni bulunur ve giderilir. Profil, prompt cümlesi yerine ölçülebilir tavan üretir (eşzamanlı açık sözleşme sayısı, worktree kararı). Ölçü: premium'da bir işte fiilen ≥2 eşzamanlı alt ajan transkripti, eco'da 1. |
| **O8** Bağlam yükünün küçültülmesi | scribe | skill ve ajan tanımları | 21 skill her oturumda yüklenmez, yalnız tetikleyicisi eşleşen yüklenir. Hedef: premium sistem promptu +4,6k → **≤+2k**. Aynı boş fixture'da `claude -p` başlangıç token'ı önce/sonra ölçülür. Risk kapısı: bilinen 5 senaryoda skill çağrısı sayısı düşmemeli. |

## 4. Dalga 3 — Doğru ekseni ölçen düzenek (Dalga 2 mühürlendikten sonra)

| İş | Sahip | Kabul |
|---|---|---|
| **O9** Yeni görev sınıfları | builder + scribe | **(K) kesinti:** koşu ortasından öldürülür, yeni oturum devam eder; ölçü kurtarılan gereksinim yüzdesi. **(Ç) çok-sözleşmeli:** tek atışta bitmeyen, ≥4 bağımsız modüllü iş; ölçü insan mesajı sayısı (script enjeksiyonu vekil metrik). Native koşul her iki sınıfta fiilen zorlanır (kesintide sıfırdan başlar). |
| **O10** Hibrit koşucu | builder | Headless `claude -p` D1 metrikleri için kalır; K ve Ç sınıfları için `--resume` ile zincirlenen, senaryo betiğiyle sürülen koşucu. Bir koşu birden çok `claude` çağrısından oluşabilir, oturum kimliği zincirlenir. **O4 spike'ı hayır derse bu madde interaktif taklide (stdin sürücülü) kayar.** |
| **O11** Güç planı ve koşul sayısı | builder | Koşu öncesi güç hesabı zorunlu: hedef etki ve ss girdisiyle gereken blok sayısı basılır; plandan az blokla koşulursa rapora "yetersiz güç" damgası düşer (mevcut veriyle "yetersiz" demeli). Koşul sayısı **4×3 yerine 2 koşul (native vs premium) × 8-12 blok**; eco/normal ancak premium-native farkı kanıtlandıktan sonra ölçülür. |
| **O12** Geçerlilik önkoşulu | builder | Relay'li koşuda transkriptte **en az bir Agent çağrısı** yoksa koşu geçersiz sayılır. Bench artık eklentinin çalıştığını önkoşul yapar — bizi yakan hata bir daha mümkün olmaz. |

## 5. Konsey ayrışması

- **Sıra: ölçüm mü ürün mü önce.** Fable "1→2→3" (hüküm düzeltme, ürün, düzenek); Opus
  "D2 ürün önce, D1 hijyen paralel". İkisi de büyük yeni bench'i sona koydu ve hijyeni ayrı
  tuttu. **Karar (T0):** hijyen ve ürün paralel yürür, yeni düzenek sona kalır — iki üyenin
  kesişimi. Ayrışma pratikte yok, yalnız isimlendirme farkı.
- **Koşul sayısı.** Opus 2×10 istedi (güç bütçesi dar), Fable blok ≥8 dedi ama 4 koşulu
  korudu. **Karar (T0):** Opus'un önerisi alınır — önce native↔premium ekseninde fark
  kanıtlanır, ara profiller sonra. Karşı görüş kayda geçer: profil ekseni ürünün kendi
  iddiası, ikisini birden ölçmemek onu ölçmemektir; bu yüzden ara profiller iptal değil
  ertelenmiştir.
- **Cache-read.** Fable atmayı, Opus "türev damgası" ile göstermeyi seçti. **Karar (T0):**
  Opus'unki alınır — metrik birincil olmaktan çıkar ama türev etiketiyle raporda kalır;
  atmak neden atıldığını kaybettirir.
- **Yanlış raporlar silinsin mi düzeltilsin mi.** İkisi de düzeltme notunu seçti.
  **Karar:** üstü çizilir, düzeltme notu eklenir.
- **`kimlikDenetle` bloklasın mı.** Opus bloklasın dedi, kaçış kapısı şartıyla; Fable "en
  azından bloklayıcı olsun" dedi. **Karar:** bloklar, tek açık kaçış ayarıyla.
- **Kesinti metriği taklit mi gerçek mi.** Fable taklidi seçti (tekrarlanabilirlik), Opus
  en az bir koşunun gerçek compaction'a kadar uzatılmasını istedi. **Karar:** taklit taban,
  bir doğrulama koşusu gerçek compaction'la yapılır.

## 6. Riskler ve nasıl anlarız

| Risk | Nerede görünür | Ne yaparız |
|---|---|---|
| Kota tek hesapta, yeni koşular yine kesilir | O1 kapısı geçersiz damgası basar | O2'nin duraklat-devam et'i pazarlık dışı; koşular güne yayılır. **İkinci hesap alınabiliyorsa Dalga 3'ten önce alınmalı — kullanıcıya sorulacak.** |
| Headless'ta Task hiç açılamıyor olabilir | O4 spike | Doğruysa O10 interaktif taklide kayar; spike bitmeden Dalga 3'e yatırım yok |
| Ürün onarımından sonra da fark çıkmaz | O11 sonucunda güven aralığı sıfırı kapsar | "Zarar yok, fayda ölçülemedi" sonucu **yayımlanır**, saklanmaz; ürün iddiası buna göre yeniden yazılır |
| Model ataması ters teper (eco'da haiku beceremez) | Dalga 1 fixture'ında eco kusur sayısı sıfırdan çıkar | Eco sonnet'e çekilir; profil ekseninin kalite eksenine kayması bilinçli karar olur |
| Skill tembel yükleme davranışı bozar | O8 risk kapısı: 5 senaryoda skill çağrısı sayısı düşer | Tetikleyici eşiği gevşetilir |
| Frontmatter yazımı makine genelini değiştirir | O5 başında `docs/ROTA-*` gerekçe araması | Gerekçe sağlamsa frontmatter yerine Task çağrısına parametre enjeksiyonu |

## 7. Reddedilenler (iki üyenin ortak kararı)

- Bench'i sıfırdan yazmak — `kos.js`'in fixture/doğrula/transkript altyapısı sağlam, sorun
  karar mantığında; yeniden yazmak aynı hatayı yeni kodla üretme riski.
- Fixture'ı 63'ten 120 gereksinime çıkarmak — tavan etkisini kaldırırdı ama süreyi ve kota
  riskini ikiye katlar; asıl sorun kalite ekseni değil eksen seçimi.
- Profilleri tümden kaldırmak — kod olarak bugün hiçbir şey yapmıyorlar ama kullanıcının
  ürün iddiasının merkezinde; kaldırmak onarım değil kapsam daraltması.
- Gücü yalnız blok sayısını 12'ye çıkararak çözmek — maliyet 4×; önce doğru eksende etki
  büyüklüğü ölçülsün.
- Gerçek kullanıcı işinde A/B — en geçerli ölçüm olurdu ama tek kullanıcı, kör değil,
  tekrarlanamaz; ancak Dalga 3 sonrası destekleyici kanıt olarak.
