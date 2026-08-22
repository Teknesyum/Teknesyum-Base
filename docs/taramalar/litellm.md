# BerriAI/litellm

## 1. Ne yapıyor, hangi problemi çözüyor

100+ LLM sağlayıcısını tek bir OpenAI uyumlu arayüzün arkasına koyuyor. Ama bizim
ilgilendiğimiz kısım çeviri katmanı değil, **muhasebe katmanı**: token sayma, maliyet
hesaplama, bütçe koyma, önbellekleme ve — daha yeni — istek sıkıştırma.

Çözdüğü problem: harcamanın görünmez olması. Bir ajan sistemi çok sayıda çağrı yapıyor,
her çağrının maliyeti ayrı, toplamı kimse bilmiyor.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Paket içinde bizi ilgilendiren ayrı ayrı duran birimler:

| Birim | İşi |
|---|---|
| `budget_manager.py` | kullanıcı/proje başına bütçe tanımı ve takibi |
| `cost_calculator.py` | çağrı başına USD maliyet hesabı |
| `model_prices_and_context_window_backup.json` | model başına fiyat ve bağlam penceresi |
| `cost.json` | fiyat tablosu |
| `caching/` | yanıt ve prompt önbelleği |
| `compression/` | `compress.py`, `message_stubbing.py`, `content_detection.py` |
| `litellm_core_utils/llm_cost_calc/` | maliyet hesaplama ayrıntısı |
| `proxy/` | ayrı bir sunucu — anahtar yönetimi, kota, oran sınırı |

Konan sınırlar:

- **Fiyat verisi koddan ayrı, JSON'da.** `model_prices_and_context_window_backup.json`
  adındaki "backup" eki, canlı sürümün uzaktan çekildiğini ve JSON'un yedek olduğunu
  gösteriyor (`get_model_cost_map.py` bunu yapıyor). Fiyat değişince kod sürümü
  gerekmiyor — bu, fiyat tablosunu kod içine gömen projelerin düştüğü tuzağı atlıyor.
- **Kütüphane ile proxy ayrı.** `pip install litellm` kütüphaneyi verir; `proxy/`
  ayrı çalışan bir servistir. Bütçe zorlaması asıl proxy'de anlamlı.
- **Sıkıştırma ayrı bir modül**, çekirdek çağrı yolunun içinde değil. `message_stubbing.py`
  adı ilginç: mesajları tamamen silmek yerine **yerine taş koyma** deseni — Anthropic'in
  context editing'inin yaptığıyla aynı fikir.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Model başına fiyat ve bağlam penceresi haritasının merkezî ve güncel tutulması.**
Token saymak kolay; **hangi token'ın kaça mal olduğunu bilmek** zor, çünkü sağlayıcılar
fiyatı ve pencereyi sık değiştiriyor. LiteLLM'in bütün maliyet özellikleri (bütçe,
raporlama, kota) bu tek haritanın doğruluğuna bağlı.

Harita ayrıca **cache okuma/yazma fiyatlarını** ve **giriş/çıkış ayrımını** taşıyor —
yani prompt caching'in gerçek kazancını hesaplamak için gereken veri burada.

Bu, bizim eksiğimize doğrudan denk geliyor: bench 44.000 token farkı ölçtü ama **bu farkın
kaç dolar olduğunu** söylemedi. Token sayısı karar için yeterli değil; cache okuma 0,1x
fiyatlıysa 44.000 token'ın 40.000'i cache'ten geliyorsa fark neredeyse yok demektir.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`pip install litellm`. Kütüphane olarak: bir `completion()` çağrısı, dönen yanıttan
maliyet okunuyor. Token saymak için ayrı bir yardımcı var, çağrı yapmadan da sayabiliyor.

Proxy olarak: yapılandırma dosyası, sonra sunucu. Sanal anahtarlar, anahtar başına bütçe,
harcama günlüğü.

Hata hâli: fiyat haritasında olmayan bir model için maliyet hesaplanamıyor — sessizce
sıfır dönme riski var. Uzak fiyat haritası çekilemezse yerel yedeğe düşüyor; yedek eskiyse
maliyet yanlış çıkar ve bu **sessiz** olur.

## 5. Alınmaya değer en fazla 3 fikir

**1 — Fiyat/pencere haritasını koddan ayırıp veri olarak tutmak.**
Ne: model adı → giriş fiyatı, çıkış fiyatı, cache yazma, cache okuma, bağlam penceresi.
Tek JSON, uzaktan güncellenebilir, yerelde yedeği var.
Neden değerli: bizim bench raporumuz token cinsinden konuşuyor. Aynı raporu dolar cinsinden
yazabilmek için bu haritaya ihtiyaç var — özellikle cache okumanın **0,1x** olduğu bir
dünyada token ile maliyet artık aynı şey değil. 44.000 token'lık fark, cache oranına göre
4.400 token'lık bir maliyete karşılık gelebilir.
Maliyet: haritayı LiteLLM'den almak yerine ilgili birkaç modelin fiyatını elle tutmak
yeterli — bizde iki-üç model var. Düşük. Kütüphaneyi bağımlılık olarak almaya gerek yok.

**2 — `message_stubbing` deseni: silmek yerine yerine taş koymak.**
Ne: bir mesaj/araç sonucu bağlamdan çıkarılırken yerine "burada bir şey vardı, kaldırıldı"
işareti bırakmak. LiteLLM'in `compression/message_stubbing.py`'si ve Anthropic'in
context editing'i aynı şeyi yapıyor.
Neden değerli: modelin "bir şeyi unuttum" ile "böyle bir şey hiç olmadı" arasındaki farkı
görmesi gerekiyor. Skill'i `references/`'a bölerken de aynısı geçerli: SKILL.md'de
"ayrıntı `references/protocol.md` içinde" satırı **kalmalı**, yoksa ajan protokolün
varlığından habersiz kalır.
Maliyet: sıfır — bir yazım kuralı. Bizde zaten kısmen var, kural hâline getirilmeli.

**3 — Bütçeyi çalışma zamanında zorlayan bir eşik.**
Ne: `budget_manager.py` deseni — bir anahtar/oturum için üst sınır, aşılınca çağrı
reddediliyor.
Neden değerli: bench 44.000 token farkını **iş bittikten sonra** ölçtü. Eşik olsaydı
ölçüm sırasında bilinirdi. relay'in profil sistemine (eco/normal/premium) oturum token
tavanı bağlamak, "premium pahalı" iddiasını iddia olmaktan çıkarır.
Maliyet: Claude Code oturumunda token sayacına erişimimiz olup olmadığı **doğrulanmadı**.
Erişim yoksa bu fikir uygulanamaz. Orta-yüksek.

## 6. Şüpheli/riskli yanlar

**Lisans — dikkat.** `gh api` **`NOASSERTION`** dönüyor. LICENSE dosyasının başı şunu
söylüyor: `enterprise/` klasörü altındaki her şey `enterprise/LICENSE`'a tabi, **geri
kalanı MIT**. Yani çekirdek MIT (OSI onaylı), ama depo tek parça değil ve GitHub bunu
tanıyamıyor. Marka ayrıca korunmuyor — MIT metninde marka maddesi yok. **Kullanmadan önce
hangi dosyanın hangi lisansta olduğuna bakmak zorunlu.**

**Bakım — canlı ama gergin.** Son push 2026-08-22 (bugün), son etiketli sürüm **v1.97.0,
2026-08-16**. 57.002 yıldız. Ama **5.003 açık issue** — bu taramadaki en yüksek sayı,
farkla. Sürüm temposu çok hızlı (v1.97 seviyesinde), yani kırıcı değişiklik riski yüksek
ve issue birikimi kapasitenin aşıldığını gösteriyor.

**Doğrulanamayan iddialar.** README'de bizim konumuza dair sayısal iddia yok — sıkıştırma
ya da bütçe için ölçülmüş kazanç rakamı bulunamadı. `compression/` modülünün ne kadar
kazandırdığı depoda **ölçülmemiş**. Bu, iddia edilip doğrulanamamasından iyi ama fikri
almadan önce kendimiz ölçmemiz gerektiği anlamına geliyor.

**Fiyat haritasının doğruluğu doğrulanamaz.** Harita topluluk katkısıyla güncelleniyor;
belirli bir modelin fiyatının doğru olduğunu depo garanti etmiyor. Bizim için kritik
değil — iki-üç model için fiyatı Anthropic belgelerinden alırız.

**Gizli kurulum maliyeti — belirleyici.** LiteLLM ağır bir bağımlılık: Python, çok sayıda
sağlayıcı SDK'sı, isteğe bağlı Redis, proxy için ayrı bir servis. Depoda `rust_bridge/`
bile var. Bizim ihtiyacımız "iki modelin fiyatını bilmek"; bunun için 57 bin yıldızlı bir
proxy kurmak orantısız. **Fikir alınır, bağımlılık alınmaz.**

**Bize uymayan kısım.** LiteLLM API çağrısını kendisi yapar; bizim çağrılarımızı Claude
Code yapıyor. LiteLLM'i araya sokmanın yolu yok. Yani bütçe zorlaması ve maliyet
hesaplaması **çağrı yolunda değil, sonradan günlükten** yapılabilir ancak.

## Kaynaklar

- `gh api repos/BerriAI/litellm` — 2026-08-22: pushed_at 2026-08-22, 57.002 yıldız,
  5.003 açık issue, license **NOASSERTION**, arşivlenmemiş, oluşturma 2023-07-27.
- `gh api repos/BerriAI/litellm/releases/latest` — v1.97.0, 2026-08-16.
- `gh api repos/BerriAI/litellm/contents/LICENSE` — MIT + `enterprise/` istisnası.
- `gh api .../contents/litellm`, `.../litellm/compression`,
  `.../litellm/litellm_core_utils` — modül listesi.
- Cache fiyat çarpanları: `docs/taramalar/claude-cookbooks.md` (Anthropic belgeleri).
- Yerel: `docs/BENCH-SONUC.md`.
