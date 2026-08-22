# guidance-ai/guidance

## 1. Ne yapıyor, hangi problemi çözüyor

Prompt yazmak yerine **üretimi kısıtlayarak** modeli yönlendiriyor. Kullanıcı bir dilbilgisi
(regex, CFG, JSON şeması) veriyor; model yalnızca o dilbilgisine uyan çıktı üretebiliyor.

README'nin iddiası: *"you can control how output is structured and get high-quality output
for your use case—while reducing latency and cost vs. conventional prompting or
fine-tuning."*

Bizim konumuz açısından ilginç olan tarafı: **format kurallarını prompt'a yazmak yerine
üretim katmanına gömmek.** Yani "çıktıyı şu formatta ver, sakın şunu yapma, örnek şudur"
diye 40 satır yazmak yerine, formatı zorlamak.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Python kütüphanesi. Model nesneleri **değişmez (immutable)**: `lm += "metin"` yeni bir
model nesnesi döndürüyor, mevcut olanı değiştirmiyor. README bunu açıkça belirtiyor
(*"Model objects are immutable, so this is a copy"*).

Bağlam yöneticileriyle rol ayrımı: `system()`, `user()`, `assistant()`. Prompt'un hangi
parçasının hangi role ait olduğu **kod yapısıyla** belirleniyor, metin işaretleriyle değil.

Arka uç katmanı ayrı: Transformers, llama.cpp, OpenAI ve diğerleri. Ama kritik sınır şu:
**kısıtlı üretim yalnızca logit'lere erişilen arka uçlarda tam çalışıyor.** Uzak API'ler
(OpenAI, Anthropic) token seviyesinde kısıtlamaya izin vermiyor.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Token fast-forwarding.** README'nin kendi anlatımıyla: dilbilgisi kısıtı bazı token'ları
önceden belirli kılıyor; Guidance bunları modele ürettirmiyor, doğrudan yerleştiriyor.

README'nin verdiği somut örnek: HTML üretiminde son açılan etiket biliniyorsa, model `</`
üretir üretmez Guidance `h1>` kısmını **model ileri geçişi yapmadan** dolduruyor.
*"This saves forward passes through the model, and hence reduces GPU usage."*

JSON için: *"a substantial number of tokens can often be fast-forwarded, due to the
structural constraints imposed by the schema."*

Yani mekanizma şu: **yapının zaten belirlediği hiçbir şey için model çalıştırma.**

Bu fikrin bizim problemimize çevirisi ilginç ama dolaylı: bizim sabit yükümüzün bir kısmı
"çıktıyı şöyle biçimlendir" talimatı. Format şema olarak zorlanabiliyorsa o talimat
metninin prompt'ta durmasına gerek kalmıyor.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`pip install guidance` + bir arka uç. README'nin ilk örneği `microsoft/Phi-4-mini-instruct`
modelini Transformers üzerinden yüklüyor — **yerel model indirmek gerekiyor**.

Jupyter'de bir widget veriyor; fast-forward edilen token'lar farklı renkle
vurgulanıyor. Yani mekanizmanın ne kadar iş yaptığı **görsel olarak** izlenebiliyor.
Bu iyi bir tasarım kararı: soyut kazancı gözle görülür kılmak.

Yakalama (`gen(name="lm_response")`) ile üretilen parçalar isimle geri alınıyor —
regex ile çıktı ayrıştırmaya gerek kalmıyor.

Hata hâli: dilbilgisi sağlanamazsa üretim kilitlenebilir; README bunu ele almıyor.

## 5. Alınmaya değer en fazla 3 fikir

**1 — Format talimatını metinden çıkarıp yapıya taşımak.**
Ne: "çıktı şu başlıkları içermeli, şu sırayla, şu formatta" gibi talimatları prompt
metninden çıkarıp bir şablona/şemaya bağlamak.
Neden değerli: relay/SKILL.md 53.147 bayt / 881 satır ve içinde sözleşme, rapor, kayıt
noktası formatları anlatılıyor. Bunların bir kısmı `assets/` altındaki şablonlarla
karşılanabilir — `contract.template.md` (1.761 bayt) ve `PLAN.template.md` (988 bayt)
zaten var. Format şablonda duruyorsa aynı formatı SKILL.md'de ikinci kez anlatmak
mükerrer token demek.
Maliyet: SKILL.md ile şablonlar arasındaki tekrarı bulup silmek. Düşük — ama **tekrarın
gerçekten var olduğu doğrulanmadı**, önce iki dosyanın karşılaştırılması gerekiyor.

**2 — Kazancı gözle görülür kılmak (fast-forward vurgusu deseni).**
Ne: Guidance, modelin ürettiği ile bedava doldurulanı farklı renkte gösteriyor.
Neden değerli: bizim 44.000 token farkımız bir tabloda sayı olarak duruyor; hangi dosyadan
geldiği görünmüyor. Dosya başına token payını gösteren bir çıktı, kısaltma kararını
tartışma olmaktan çıkarır.
Maliyet: token sayacı + basit bir rapor. Düşük-orta. Bkz. `tokencost.md` §5.

**3 — Rolü metinle değil yapıyla belirtmek.**
Ne: `system()` / `user()` / `assistant()` bağlam yöneticileri; prompt'un hangi parçasının
ne olduğu koddan belli.
Neden değerli: prompt caching hiyerarşisi (`tools` → `system` → `messages`) tam da bu
ayrımı gerektiriyor — sabit olan `system`'de, değişken olan `messages`'ta olmalı. Bizim
enjekte edilen 800-2500 karakterlik yönergemizin hangi role gittiği **bilinmiyor**;
`system`'e gidiyorsa **her istekte bütün cache'i bozuyor** demektir.
Maliyet: önce ölçüm — kod değişikliği gerekip gerekmediği ölçümden sonra belli olur.
Bu, bu taramadaki en yüksek getirili tek soru olabilir.

## 6. Şüpheli/riskli yanlar

**Lisans.** MIT, temiz. Marka ayrıca korunmuyor. Microsoft kökenli (iletişim adresi
`guidanceai@microsoft.com`) ama depo `guidance-ai` organizasyonunda.

**Bakım — yavaşlamış.** Son push **2026-05-21**, üç ay önce. Son etiketli sürüm
**0.3.2, 2026-03-18**, beş ay önce. 21.713 yıldız, **319 açık issue**. Arşivlenmemiş ve
ölü değil, ama tempo düşük. Sürüm hâlâ 1.0 öncesi (0.3.x) — API kararlılığı taahhüt
edilmemiş.

Not: README'de *"Hours: 10am-2pm Pacific"* yazan bir rozet var — bakım ekibinin
erişilebilirliği kısıtlı, açıkça beyan edilmiş. Dürüst ama kaynak darlığının işareti.

**Doğrulanamayan iddialar.**
- *"reducing latency and cost vs. conventional prompting or fine-tuning"* — README'nin
  ana iddiası. **README'de bu iddiayı destekleyen tek bir sayı yok.** Ne yüzde, ne
  benchmark, ne karşılaştırma tablosu. `doğrulanamadı`
- *"a substantial number of tokens can often be fast-forwarded"* — "substantial" ve
  "often" nitelemeleri var, rakam yok. `doğrulanamadı`
- Fast-forwarding'in **mekanizması** doğrulanabilir ve mantıklı (dilbilgisi belirliyse
  ileri geçiş gereksiz), ama **kazanç büyüklüğü ölçülmemiş**. Mekanizmaya inanmak ile
  kazanca inanmak ayrı şeyler.

**Bize uymayan kısım — belirleyici.** Fast-forwarding **logit erişimi** gerektiriyor.
Bu, yerel modellerde (Transformers, llama.cpp) mümkün; Anthropic API'sinde değil. Bizim
bütün yükümüz Claude Code üzerinden Claude API'sine gidiyor. **Aracın çekirdek mekanizması
bizim ortamımızda çalışmaz.** Ayrıca kazanç **çıktı** token'larında; bizim problemimiz
**girdi** token'ları. İki farklı problem.

**Gizli kurulum maliyeti.** Python + Transformers + PyTorch + yerel model ağırlıkları.
Kazanç girdi tarafında olmadığı için bu maliyetin karşılığı yok.

## Kaynaklar

- `gh api repos/guidance-ai/guidance` — 2026-08-22: pushed_at 2026-05-21, 21.713 yıldız,
  319 açık issue, MIT, arşivlenmemiş, oluşturma 2022-11-10.
- `gh api repos/guidance-ai/guidance/releases/latest` — 0.3.2, 2026-03-18.
- Depo README (Contents API ile okundu; fast-forwarding ve JSON bölümleri).
- Prompt caching hiyerarşisi: `docs/taramalar/claude-cookbooks.md`.
- Yerel: `wc -c teknesyum/skills/relay/**`.
