# Çok oturumlu röle — hatlar

Tek oturum içinde alt ajan çalıştırmanın tavanı var: her ajan ana oturumun bağlamından
pay yer, üç dörtten fazlası paralel yürümez ve oturum kapanınca hepsi birden düşer.
Büyük iş bu yüzden **oturumlara** bölünür.

Düzen: **bir yönetim oturumu (T0, opus) + 3-5 hat oturumu (sonnet/haiku).** T0 planlar,
sözleşme yazar, denetler, birleştirir — **üretim kodu yazmaz.** Hatlar kod yazar,
plan yapmaz.

## 1. Ne zaman

| Durum | Yol |
|---|---|
| Tek tutarlı yetenek, ≤8 sözleşme, tek oturumda biter | Oturum içi röle (`protokol.md`) |
| Sıfırdan yeni proje | **Çok oturumlu** |
| ≥3 birbirinden bağımsız yetenek alanı (çekirdek / arayüz / paketleme / dokümantasyon) | **Çok oturumlu** |
| Bağlamın tek oturumda dolacağı belli | **Çok oturumlu** |

Kararı **ilk mesajda** ver. İş yarıda çok oturumluya çevrilebilir ama plan yeniden yazılır.

İkisi iç içe çalışır: bir hat oturumu kendi içinde alt ajan da açabilir. Hat = oturum,
sözleşme = görev.

## 2. Dizin

```
.claude/relay/
├── PLAN.md              hat grafiği + bağımlılıklar
├── hatlar/
│   ├── H1.md            hat brifingi
│   └── H2.md
├── contracts/           sözleşmeler (hatlara dağılmış), done/ altında bitmişler
├── rapor/
│   └── H1-kapanis.md    hat bitince yazar, T0 buradan okur
└── LOG.md               tüm hatların ortak olay kaydı
```

## 3. Hat brifingi

```markdown
---
id: H2
baslik: Arayüz katmanı
model: sonnet
alan: [src/components/, src/theme/]
sozlesmeler: [T4, T5, T6]
depends: [H1]
status: bekliyor | acik | kapandi
---
## Amaç          hattın tamamı, tek paragraf
## Sınır         NEYE DOKUNMAZ — diğer hatların alanı, isim isim
## Arayüzler     bağımlı olduğu hattın ürettiği imzalar (H1 kapandıktan sonra doldurulur)
## Çıkış koşulu  hat ne zaman kapanmış sayılır
```

**`alan` kümeleri kesişemez.** Oturum içi röledeki `owns` kuralının hat seviyesindeki
karşılığıdır ve daha katıdır: ayrı oturumlar birbirini göremez, çakışmayı kimse fark etmez.
Kesişme kaçınılmazsa o dosyayı tek hatta ver, diğeri `Arayüzler` üzerinden tüketsin.

## 4. Dağıtım

T0 her açılabilir hat için **kopyalanabilir tek satırlık** başlatma komutu basar:

```
/teknesyum:hat H2
```

Kullanıcı yeni bir oturum açar, proje klasörünü ekler, satırı yapıştırır. Başka hiçbir
bilgi vermesi gerekmez — bağlamın tamamı `hatlar/H2.md` ve sözleşmelerdedir.

Prompt'a konuşma geçmişi, özet veya gerekçe **koyma**. Diske yazılmamış hiçbir şeye
dayanma; hat oturumu T0'ın konuşmasını göremez.

Aynı anda yalnızca **bağımlılığı karşılanmış** hatlar dağıtılır. `depends` açıkken hattı
başlatma — sözleşme kilitlenir.

## 5. Model dağılımı

| Katman | Model | Neden |
|---|---|---|
| T0 yönetim | opus | Plan, hat sınırı, denetim kararı — hatanın maliyeti en yüksek burada |
| Hat oturumu | sonnet | Bilinen kalıpla üretim, varsayılan |
| Hat oturumu | haiku | Kalıbı birebir belli mekanik hat (locale, isimlendirme, doküman) |
| Hat oturumu | opus | Yalnız algoritmik/mimari yük taşıyan hat |

T0 hangi modelin kullanılacağını hat brifingine yazar; hat oturumu ilk iş olarak modeli
ona ayarlar. **Varsayılan opus değildir** — gerekmedikçe düşür.

## 6. Toplama

Hat kapanınca `rapor/H<n>-kapanis.md` yazar ve kullanıcıya "T0 oturumuna dön, `/topla`
yaz" der. T0 `/topla` ile:

1. `rapor/` ve `contracts/done/` içindekileri okur
2. `git status --porcelain` ile alan ihlali arar — hat kendi `alan`ı dışına yazmışsa
   LOG'a `sahipsiz`, düzeltmeyi kimin yapacağına karar verir
3. `denetim` ayarına göre `denetci` çalıştırır (T0 oturumunda, hat oturumunda değil)
4. Kalan hatların `Arayüzler` bölümünü kapanan hattın ürettiği imzalarla doldurur
5. Kullanıcıya dalga raporu verir (§8) ve açılabilir hale gelen hatların başlatma
   satırlarını basar

**Denetim T0'da yapılır.** Hat kendi işini onaylayamaz.

## 7. Kesinti

Hat oturumu düşerse kaybedilen tek şey o hattır; diğerleri etkilenmez. Kullanıcı yeni bir
oturum açıp aynı satırı (`/teknesyum:hat H2`) yapıştırır — hat sözleşmelerin
`Kayıt noktası` bölümünden devam eder.

T0 oturumu düşerse yeni oturumda `/devam`: `hatlar/*.md` durumları + `LOG.md` +
`rapor/` okunur, yönetim kaldığı yerden sürer.
