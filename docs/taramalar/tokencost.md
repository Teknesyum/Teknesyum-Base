# AgentOps-AI/tokencost

## 1. Ne yapıyor, hangi problemi çözüyor

Tek iş yapıyor: **API'ye gitmeden, istemci tarafında bir prompt'un kaç token olduğunu ve
kaç dolara mal olacağını söylüyor.** README'nin kendi tanımı: *"Clientside token counting +
price estimation for LLM apps and AI agents."*

Çözdüğü problem iki parçalı ve README bunu açıkça ayırıyor:

1. **Fiyat takibi** — sağlayıcılar sık sık model ekliyor ve fiyat değiştiriyor; birinin
   bunu izlemesi gerekiyor.
2. **Token sayımı** — istek göndermeden önce sayabilmek.

Bizim durumumuzda birinci ihtiyaç bu: 53 KB'lık dosyanın **kaç token** olduğunu bilmek.
Şu ana kadar bu taramada kullandığımız "4 bayt = 1 token" tahmini kaba; gerçek sayı
gerekiyor.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Küçük ve dar kapsamlı bir paket. Üç fonksiyon etrafında kurulu: prompt maliyeti, tamamlama
maliyeti, token sayısı. Fiyat verisi paketin içinde bir tabloda duruyor.

Konan sınırlar — hepsi **kapsamı dar tutma** yönünde:

- **API çağrısı yapmıyor.** Bağımlılık yüzeyi minimum; ağ erişimi gerekmiyor.
- **Sağlayıcı SDK'sı taşımıyor.** LiteLLM'in aksine sadece hesap yapıyor.
- **Ajan çerçevesi değil.** AgentOps'un (ticari ürün) yan ürünü ama ona bağımlı değil.

Bu darlık hem en büyük erdemi hem en büyük zayıflığı — 6. bölüme bakın.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Tokenizer + fiyat tablosunun eşleştirilmesi.** Token sayımı `tiktoken` üzerinden
yapılıyor (OpenAI'nin tokenizer'ı); fiyat tablosu model adına göre eşleşiyor.

Bütün proje bu eşleşmenin doğruluğuna bağlı ve **tam da burada kırılıyor**: `tiktoken`
OpenAI modellerinin tokenizer'ı. Anthropic modelleri farklı bir tokenizer kullanıyor.
README'nin kendi örneği bile `gpt-3.5-turbo` — ve *"Accurately count prompt tokens before
sending OpenAI requests"* diyor, "OpenAI" kelimesi açıkça yazılı.

Yani mekanizma dürüst: ne yaptığını ve **kim için** yaptığını söylüyor. Anthropic için
kullanılırsa sayı yaklaşık olur, tam olmaz.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`pip install tokencost`. Üç satırlık kullanım: model adı, prompt, çağrı. Çıktı doğrudan
USD.

README'nin verdiği örnek çıktı: `0.0000135 + 0.000014 = 0.0000275` — yani bir "Hello
world" alışverişi 2,75 mikro dolar. Somut ve doğrulanabilir bir örnek; iddia değil hesap.

Hata hâli: fiyat tablosunda olmayan model adı için ne olduğu README'de yazmıyor.
`doğrulanmadı`

## 5. Alınmaya değer en fazla 3 fikir

**1 — Ölçüm yapıldı, tahmin yanlış çıktı — dersi kaydetmek.**
Ne: bu raporun ilk hâli 4 bayt/token kabülüyle relay/SKILL.md'yi ~13.300 token tahmin
etti ve "Türkçe metin daha fazla token harcar, gerçek sayı daha yüksek olabilir" dedi.
Base ekibinin ölçümü **10.112 token** verdi: gerçek oran **5,26 bayt/token**, tahmin
**%31 yüksek** ve yön tahmini de yanlış.
Neden değerli: ölçüm ucuz, tahmin pahalı. Bu taramanın bütün "kaba tahmin" etiketli
sayıları aynı hatayı taşıyor olabilir. Bundan sonra token sayısı yazan hiçbir cümle
ölçülmeden yazılmamalı.
Maliyet: sıfır — ölçüm zaten yapıldı. Kalan iş, geriye kalan dosyaları da ölçmek
(teknesyum-ui/SKILL.md, SETTINGS.md, ajan tanımları).

**2 — Fiyatı ayrı bir veri dosyasında tutup koddan ayırmak.**
Ne: model → giriş/çıkış/cache fiyatı eşlemesi tek yerde.
Neden değerli: bench raporlarımızı dolar cinsinden yazabilmek için. Aynı fikir
`litellm.md`'de de çıktı; iki bağımsız projenin aynı kararı vermesi desenin sağlamlığına
işaret.
Maliyet: bizde 2-3 model var, elle tutulan küçük bir tablo yeter. Neredeyse sıfır.

**3 — Ölçümü çağrıdan önce yapmak.**
Ne: tokencost'un bütün varlık nedeni — maliyeti göndermeden bilmek.
Neden değerli: bizim bench'imiz maliyeti **sonradan** öğrendi. Skill dosyası düzenlenirken
"bu değişiklik oturum başına +X token" bilgisini o anda görmek, 53 KB'a nasıl gelindiğini
açıklıyor: kimse tek tek satır eklerken toplamı görmüyordu. Bir pre-commit kontrolü
("SKILL.md 5.000 token'ı aştı") bunu tekrarlanmaz kılar.
Maliyet: pre-commit kancası + tokenizer. Düşük-orta. Somut ve hemen uygulanabilir.

## 6. Şüpheli/riskli yanlar

**Lisans.** MIT, temiz. Rozeti README'de, `gh api` de MIT doğruluyor. Marka ayrıca
korunmuyor.

**Bakım — durmuş.** Son push **2025-09-05**, yaklaşık bir yıl önce. Son etiketli sürüm
**0.1.26, 2025-08-13**. 2.004 yıldız, **31 açık issue**. Arşivlenmemiş ama duraklamış.

**Bu, bu araç için ölümcül bir kusur.** Çünkü aracın tek işi **güncel fiyat tablosu
tutmak**. README'nin kendi gerekçesi: *"Major LLM providers frequently add new models and
update pricing. This repo helps track the latest price changes."* Bir yıldır güncellenmemiş
bir fiyat takip aracı, işlevini yerine getirmiyor. 2026 modelleri (Opus 5, Sonnet 5) ve
2026 fiyatları tabloda **olamaz**. Ayrıca `0.1.x` sürüm numarası hâlâ 1.0 öncesi.

**Tokenizer uyumsuzluğu.** `tiktoken` OpenAI içindir. Anthropic modelleri için sayım
yaklaşıktır. Bizim bütün yükümüz Claude'a gidiyor. Aracın kendisi bunu gizlemiyor —
README açıkça "OpenAI requests" diyor — ama bizim kullanımımız için **yanlış araç**.

**Doğrulanamayan iddia yok — ama ölçüm de yok.** README performans ya da tasarruf iddiası
içermiyor; sadece bir hesap örneği veriyor. Bu iyi: abartı yok. Ama "bu araç size ne
kazandırır" sorusuna da cevap vermiyor, çünkü araç kazandırmıyor, **ölçüyor**.

**Ticari bağlam.** AgentOps'un (ücretli gözlemlenebilirlik ürünü) yan ürünü; README'de
üç yerde AgentOps'a yönlendirme var. Aracın bakımının durması bu bağlamla tutarlı —
huni işlevini gördü, sürdürülmedi.

**Bizim için sonuç.** Bağımlılık olarak alınmaz: eski, yanlış tokenizer, eski fiyat.
**Alınacak olan üç fikir de araçtan bağımsız uygulanabilir** — Anthropic'in kendi token
sayma uç noktası ya da SDK'sı kullanılarak.

## Kaynaklar

- `gh api repos/AgentOps-AI/tokencost` — 2026-08-22: pushed_at 2025-09-05, 2.004 yıldız,
  31 açık issue, MIT, arşivlenmemiş, oluşturma 2023-12-03.
- `gh api repos/AgentOps-AI/tokencost/releases/latest` — 0.1.26, 2025-08-13.
- Depo README (Contents API ile okundu).
- Agent Skills şartnamesi (5.000 token tavanı): `docs/taramalar/anthropic-skills.md`.
- Yerel bayt ölçümleri: `wc -c teknesyum/skills/**`.
