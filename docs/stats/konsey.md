# Konsey maliyet defteri

Her konsey koşusu buraya bir satır düşer. Amaç: konseyin uzun vadede ne kadar ettiğini ve
ne kadar işe yaradığını iddiayla değil veriyle görmek.

Satırı `scripts/olcum/konsey-maliyet.js` yazar, elle doldurulmaz:

```
node scripts/olcum/konsey-maliyet.js <ajanId...> --tip tam --konu "..." --tur 4 --yaz docs/stats/konsey.md
```

Yazma zamanı: **kapanışı ilan eden aynı işlemde.** Ertelenen kayıt tutulmaz. Yazan
yöneticidir — iki üye aynı dosyaya yazarsa çakışır.

## Sütunlar

**Eşdeğer** ham toplam değil, ağırlıklı: `girdi + 1.25×önbellek-yazım + 0.1×önbellek-okuma
+ 5×çıktı`. Önbellek okuması ucuz, çıktı pahalı; ham toplam yanıltır.

**Duvar süresi** en yavaş üyenin süresidir, üyelerin toplamı değil — bağımsız turlar
paralel açılır.

## Elle tutulan alanlar

Bunlar ölçüm scriptinin göremediği, yöneticinin kapanışta yazdığı alanlar. Aşağıdaki
tabloda değil, koşu başına bir blok olarak tutulur.

| Alan | Ne yazar |
|---|---|
| `kosu_id` | log ile eşleşsin diye |
| `mekanik` | `simetrik` / `asimetrik` — **bugün yazılmazsa sonra imkânsız** |
| `masa_kompozisyonu` | hangi model **hangi koltukta** — koltuk etkisi model etkisiyle karışmasın |
| `uzatildi_mi` | ikinci üye uzattı mı |
| `kapanis_nedeni` | `uzlasi` · `yakinsama` · `tavan` · `iptal` |
| `geri_cekme_bulgu` / `geri_cekme_yakinsama` | ayrı sayılar |
| `kabul_edilen_revizyon` | fayda ölçüsü — sıfırsa konsey o işte fayda üretmemiş |
| `t0_taslak_karari_degisti_mi` | konsey açılmadan önce yazılan taslak satır ile nihai karar |
| `zorluk_tahmini` | yönlendirmede kullanılan tahmin — dokunulan dosya, geri dönüş maliyeti, test var mı |
| `devredildi` | deneye devredilen maddeler ve sonucun ineceği yer |
| `yeniden_ele_alindi` | kapanışta **boş**; iş sonradan revize edilirse doldurulur |

Son alan tek gerçek yer ölçüsüdür ve geç gelir; diğerleri vekildir. Bu peşinen kabul
edilmeli, yoksa vekiller yer ölçüsü sanılır.

## Neyin karşılaştırılabileceği

**Tek turluk koşularla uzatılmış koşuların ortalamaları yan yana konmaz.** Kolay iş tek
turda kapanır, zor iş uzar — atama rastgele değil, sonucu belirleyen değişkene göre
yapılır. Naif karşılaştırma "uzatma zararlı" diye okunur. Daha çok alan loglayarak
**düzelmez.**

Stratifikasyon da çare değil: ayda birkaç koşuda katman başına 1-2 gözlem düşer,
karşılaştırma boş küme olur.

**Karar dayanağı grup-içi iki orandır** — karşılaştırmaya hiç ihtiyaç duymazlar:

- **Uzatma oranı.** Sıfıra yapışıksa erken kapatma şüphesi, bire yapışıksa lastik damga.
- **Yeniden ele alınma oranı**, her grup kendi içinde.

Sıfıra yakın uzatma oranı iki şeyden biridir — uzatma kararı iyi, ya da valf fazla dar.
Ayırmak için **kasıtlı çapraz atama** gerekir: tek turlukta kapanacak işlerin arada biri
yine de uzatılır. Ters yön (uzatılması gereken işi tek turda bırakmak) önerilmez, hata
maliyeti sınırsız olan o yöndür.

İki dedektör daha, ikisi de bedava:

- **Çelişkiye rağmen kapatma** — iki metin taşıyıcı bir maddede ayrışırken ikinci üye
  kapattıysa. Doğrudan çapa dedektörü.
- **Nesnesiz kapatma** — gerekçe nesne taşımıyorsa.

Ve `kapanis_nedeni = tavan` seyrek olmalı; seyrek değilse uzatma kararı bozuktur.

| Tip | Konu | Tur | Üye | Çıktı | Eşdeğer | Süre (sn) |
|---|---|---|---|---|---|---|
| tam | konsey mekaniği — anonim A/B, asimetrik akış | 4 | 2 | 111.1k | 2162.7k | 2358 |

## koşu 2

```
kosu_id                    2
mekanik                    tur 1-2 simetrik, tur 3-4 asimetrik
masa_kompozisyonu          A = fable, B = opus
uzatildi_mi                evet — T1 tavan, T2 madde 5 devri
kapanis_nedeni             uzlasi
geri_cekme_bulgu           5
geri_cekme_yakinsama       1
kabul_edilen_revizyon      taşıyıcı maddelerin tamamı
zorluk_tahmini             geri dönüşü pahalı — protokol dosya biçimi, otomatik test yok
devredildi                 madde 5 (medium efor) → kalibrasyon çift koşusu
yeniden_ele_alindi         —
```

Not: bu koşu iki mekaniği birden içerdiği için ortalamaya girmez, **emsal** olarak durur.
