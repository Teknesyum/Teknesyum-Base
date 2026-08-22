# liyucheng09/Selective_Context

**Bu, listedeki "yanlış yapılmış" örnek.** Fikir sağlam, yayın hakemli (EMNLP 2023), ama
depo bir araştırma kanıtı olarak bırakılmış ve ürüne dönüşmemiş. Terk edilme biçimi
öğretici.

## 1. Ne yapıyor, hangi problemi çözüyor

Prompt'taki "az bilgi taşıyan" sözcük/cümle/token'ları silerek bağlamı küçültüyor.
README'nin iddiası: *"compresses your prompt and context to allows LLMs (such as ChatGPT)
to process 2x more content."*

LLMLingua ile aynı problemi çözüyor ve aynı sinyali kullanıyor: **self-information**
(bir birimin ne kadar şaşırtıcı olduğu). Tarihsel olarak Selective Context önce çıktı
(ilk arXiv Nisan 2023), LLMLingua Temmuz 2023'te başladı.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök dizinde düz duran dosyalar: `selective_context.py`, `context_manager.py`,
`qa_manager.py`, `main.py`, `utils.py`, ayrıca `app/`, `data/`, `results/`, `src/`,
`htcondor/`.

Sınırlar zayıf:

- **Kütüphane ile deney kodu ayrılmamış.** `selective_context.py` (kütüphane) ile
  `qa_manager.py`, `htcondor/` (makale deneyleri, HTCondor iş kuyruğu betikleri) aynı
  depoda, aynı seviyede.
- **`results/` depoya konmuş** — çıktılar sürüm kontrolünde.
- **`app/`** Streamlit demosu, yine aynı seviyede.

Yani depo "makalenin yeniden üretilebilirlik paketi" olarak tasarlanmış, "kullanılacak
kütüphane" olarak değil. Buna rağmen PyPI'ye `selective-context` adıyla yayımlanmış.
Bu ikilik sorunun kaynağı.

Ayrıştırma birimi üç seviyede seçilebiliyor: token, cümle (phrase), cümle (sentence).
Bu seçimin kullanıcıya bırakılması iyi bir sınır — hangi granülaritede kayıp yaşanacağını
kullanıcı belirliyor.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Self-information ile birim ayrıştırmanın birleşimi.** Bir temel dil modeli (GPT-2)
her token için olasılık üretiyor; spaCy ile metin sözcük öbeklerine/cümlelere bölünüyor;
her öbeğin self-information'ı toplanıp düşük olanlar atılıyor.

Kritik nokta: **atma birimi token değil, dilbilgisel öbek.** Bu, LLMLingua'nın token
seviyesinde attığı ve okunmaz metin ürettiği duruma göre daha okunabilir çıktı veriyor.
`reduce_ratio` parametresiyle oran ayarlanabiliyor.

Yöntemin kırılganlığı da burada: spaCy dil modeline bağımlı. İngilizce için
`en_core_web_sm`, Çince için `zh_core_web_sm` gerekiyor. **Türkçe desteklenmiyor** —
README yalnızca bu iki dili sayıyor.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`pip install selective-context` + `python -m spacy download en_core_web_sm`. İki adımlı
kurulum, ikincisi unutulursa çalışma zamanında patlıyor.

Kullanım üç satır: sınıfı kur, metni ver, sıkıştırılmış bağlam ve atılan içerik geri
geliyor. Atılanın da döndürülmesi iyi bir karar — ne kaybettiğini görebiliyorsun.

Web arayüzü: `streamlit run app/app.py` ya da HuggingFace Space.

Hata hâli belgelenmemiş. `reduce_ratio` tutturulamazsa ne olduğu yazılmamış.

## 5. Alınmaya değer en fazla 3 fikir

**1 — Atılanı da döndürmek.**
Ne: sıkıştırma fonksiyonu hem kalanı hem **atılanı** döndürüyor.
Neden değerli: bizim skill kısaltmamızda "ne çıkardık" listesi tutulmazsa, bir davranış
bozulduğunda hangi satırın eksildiği bilinemez. relay/SKILL.md'de 881 satırdan ~380'ini
çıkarmayı düşünüyorsak, çıkarılanların ayrı bir dosyada durması geri alma imkânı verir.
Maliyet: sıfır — git zaten bunu yapıyor, ama çıkarılanların **tek bir dosyada toplu**
durması ayrı bir değer. Bir dosya.

**2 — Kesme birimini dilbilgisel öbek yapmak, token değil.**
Ne: yöntem token değil cümle/öbek atıyor; sonuç insan tarafından okunabilir kalıyor.
Neden değerli: bizim dosyalarımız **insan tarafından da okunuyor** — kullanıcı SKILL.md'yi
düzenliyor. Token seviyesinde sıkıştırılmış bir markdown bakımı imkânsız hâle getirir.
Kısaltma bölüm/paragraf seviyesinde olmalı.
Maliyet: sıfır. Bir kural kararı.

**3 — `reduce_ratio` gibi tek bir ayar düğmesi.**
Ne: sıkıştırmanın agresifliği tek sayıyla ayarlanıyor (0.35 varsayılan, 0.5 örnek).
Neden değerli: bizde karşılığı, `SETTINGS.md` (12.750 bayt) içinde "ayrıntı seviyesi"
düğmesi olabilir — eco/normal/premium profillerimiz zaten var, bunlara **yüklenen
belge miktarını** bağlamak mümkün.
Maliyet: skill yükleme mantığında koşullu okuma. Orta — Claude Code'un profil bilgisini
skill'e geçirip geçirmediği **doğrulanmadı**.

## 6. Şüpheli/riskli yanlar

**Lisans — en ciddi sorun.** `gh api repos/liyucheng09/Selective_Context` →
**`license: null`**. Depoda LICENSE dosyası yok (kök dizin listesi doğrulandı).
**OSI onaylı lisans yok, hiçbir lisans yok.** Varsayılan telif hakkı geçerli: kod
kullanılamaz, türetilemez, dağıtılamaz. PyPI'de yayımlanmış olması bunu değiştirmiyor.
Marka koruması sorusu anlamsız — lisans hiç yok. **Bağımlılık olarak alınamaz.**

**Terk edilmiş.** Son push **2024-02-12** — iki buçuk yıldan fazla. Son etiketli sürüm
**v0.1.0rc1, 2023-12-26** — release candidate, kararlı sürüm hiç çıkmamış. 425 yıldız,
**12 açık issue**. Arşivlenmemiş ama fiilen ölü.

**Doğrulanamayan iddialar.**
- *"allows LLMs to process 2x more content"* ve *"without compromising their performance
  on various tasks"* — README başlığı. Yazarların kendi makalesi (EMNLP 2023,
  arXiv 2310.06201). Bağımsız doğrulama bulunamadı. `doğrulanamadı`
- README "extensive evaluations on three data sources and four NLP tasks" diyor ama
  README'de **tek bir sayı yok** — ne sıkıştırma oranı ne kalite kaybı. Rakamlar
  makalede, depoda değil. Bir sıkıştırma kütüphanesinin README'sinde ölçüm bulunmaması
  başlı başına bir kusur.

**Gizli kurulum maliyeti.** GPT-2 ağırlıkları + spaCy dil modeli + transformers +
PyTorch. LLMLingua ile aynı yük, artı spaCy.

**Bu deponun asıl dersi.** Fikir doğru, yayın hakemli, LLMLingua'dan önce çıkmış — ama:
lisans konmamış, kararlı sürüm çıkarılmamış, kütüphane ile deney kodu ayrılmamış,
README'ye ölçüm yazılmamış. Microsoft aynı fikri aldı, MIT lisansıyla, sürümlü, ölçümlü,
entegrasyonlu yayınladı ve 6.593 yıldıza ulaştı (Selective Context 425). **Fark fikirde
değil, paketlemede.** Bizim skill'lerimiz için aynı risk geçerli: doğru içerik, yanlış
paket.

## Kaynaklar

- `gh api repos/liyucheng09/Selective_Context` — 2026-08-22: pushed_at 2024-02-12,
  425 yıldız, 12 açık issue, **license null**, arşivlenmemiş, oluşturma 2023-03-29.
- `gh api repos/liyucheng09/Selective_Context/releases/latest` — v0.1.0rc1, 2023-12-26.
- `gh api repos/liyucheng09/Selective_Context/contents` — kök dizin listesi, LICENSE yok.
- Depo `readme.md` (Contents API ile okundu).
- Makale (EMNLP 2023): https://arxiv.org/abs/2310.06201
- Önceki sürüm: https://arxiv.org/abs/2304.12102
- Karşılaştırma: `docs/taramalar/llmlingua.md`
