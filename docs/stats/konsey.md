# Konsey maliyet defteri

Her konsey koşusu buraya bir satır ve bir blok düşer. Amaç: konseyin uzun vadede ne kadar
ettiğini ve ne kadar işe yaradığını iddiayla değil veriyle görmek.

Satırı `scripts/olcum/konsey-maliyet.js` yazar, elle doldurulmaz:

```
node scripts/olcum/konsey-maliyet.js <ajanId...> --konu "..." --tur 4 --yaz docs/stats/konsey.md
```

`--tur` zorunludur; verilmezse script satır yazmayı **reddeder.** `Tur` sütunu ucuz koşu
ile pahalı koşuyu ayıran tek boyut — boş kalırsa tabloda ayrım kalmaz.

Yazma zamanı: **kapanışı ilan eden aynı işlemde.** Ertelenen kayıt tutulmaz. Yazan
yöneticidir.

## Sütunlar

**Eşdeğer** ham toplam değil, ağırlıklı: `girdi + 1.25×önbellek-yazım + 0.1×önbellek-okuma
+ 5×çıktı`. Önbellek okuması ucuz, çıktı pahalı; ham toplam yanıltır.

**Duvar süresi** en yavaş üyenin süresidir, üyelerin toplamı değil — bağımsız turlar
paralel açılır.

## Elle tutulan alanlar

Yöneticinin kapanışta yazdığı alanlar; koşu başına bir blok.

| Alan | Ne yazar |
|---|---|
| `kosu_id` | log ile eşleşsin diye |
| `mekanik` | bugün tek değerli, ama **bugün yazılmazsa sonra imkânsız** — mekanik yine değişirse eski koşununki başka yerden çıkarılamaz |
| `masa_kompozisyonu` | hangi model **hangi koltukta** — koltuk etkisi model etkisiyle karışmasın |
| `uzatma_karari` | `ortak-uzat` · `ortak-kapat` · `ayrisma-uzat` |
| `kapanis_nedeni` | `uzlasi` · `yakinsama` · `tavan` · `iptal` |
| `tasiyici_madde_sayisi` | geri çekme sayısının **paydası** |
| `geri_cekme_bulgu` / `geri_cekme_yakinsama` | ayrı sayılar |
| `geri_cekme_yonu` | okuma sırası dönüşümünün girdisi |
| `gozlemsiz_belirsizlik` | gözlem adlandıramayan "emin değilim" maddeleri |
| `kabul_edilen_revizyon` | fayda ölçüsü — sıfırsa konsey o işte fayda üretmemiş |
| `t0_taslak_karari_degisti_mi` | konsey açılmadan önce yazılan taslak satır ile nihai karar |
| `zorluk_tahmini` | dokunulan dosya, geri dönüş maliyeti, otomatik test var mı |
| `devredildi` | deneye devredilen maddeler ve sonucun ineceği yer |
| `yeniden_ele_alindi` | kapanışta **boş**; iş sonradan revize edilirse doldurulur |

Son alan tek gerçek yer ölçüsüdür ve geç gelir; diğerleri vekildir. Bu peşinen kabul
edilmeli, yoksa vekiller yer ölçüsü sanılır.

**Protokol konulu koşular fayda ortalamasına girmez** — o konu sınıfında
`yeniden_ele_alindi` yapısal olarak boş kalır, çünkü kimse bir protokol belgesine dönüp
"yanlışmış" demez.

## Sütun kümesi değişirse

**Düşen sütunun bilgisi ya başka sütundan türetilebilir olmalı, ya da düşmeden önce ilgili
koşu bloğuna yazılmalı.** Türetilemeyen bir sütunun düşürülme masrafı böylece görünür olur.

Aynı tabloda iki biçim yaşatılmaz. Eski satır silinmez, taşınmaz — bilgisi korunur.

## Neyin karşılaştırılabileceği

**Tek turluk koşularla uzatılmış koşuların ortalamaları yan yana konmaz.** Kolay iş tek
turda kapanır, zor iş uzar — atama rastgele değil, sonucu belirleyen değişkene göre
yapılır. Naif karşılaştırma "uzatma zararlı" diye okunur. Daha çok alan loglayarak
**düzelmez.** Stratifikasyon da çare değil: ayda birkaç koşuda katman başına 1-2 gözlem
düşer, karşılaştırma boş küme olur.

**Karar dayanağı grup-içi iki orandır:**

- **Uzatma oranı** — `uzatma_karari`ndan türetilir (`ortak-uzat` + `ayrisma-uzat`). Sıfıra
  yapışıksa erken kapatma şüphesi, bire yapışıksa lastik damga.
- **Yeniden ele alınma oranı**, her grup kendi içinde.

Ayırmak için **kasıtlı çapraz atama**: tek turda kapanacak işlerin arada biri yine de
uzatılır. Ters yön önerilmez, hata maliyeti sınırsız olan o yöndür.

Üç dedektör, üçü de bedava:

- **Çelişkiye rağmen kapatma** — iki metin taşıyıcı bir maddede ayrışırken ikinci üye
  kapattıysa.
- **Nesnesiz kapatma** — gerekçe nesne taşımıyorsa.
- **`ayrisma-uzat` hiç yok** — yöneticinin karara katılımı biçimseldir.

Ve `kapanis_nedeni = tavan` seyrek olmalı; iki koşu üst üste bağlarsa cırcır emniyeti
tetiklenir.

| Konu | Tur | Üye | Çıktı | Eşdeğer | Süre (sn) |
|---|---|---|---|---|---|
| konsey mekaniği — anonim A/B, asimetrik akış | 4 | 2 | 111.1k | 2162.7k | 2358 |
| konsey mekaniği — kimlik açık, medium efor | 4 | 2 | 37.3k | 779.9k | 1035 |

## koşu 2

```
kosu_id                    2
mekanik                    tur 1-2 simetrik, tur 3-4 asimetrik
masa_kompozisyonu          birinci koltuk fable, ikinci koltuk opus
uzatma_karari              (alan yoktu) — ikinci üye uzattı: T1 tavan, T2 madde 5 devri
kapanis_nedeni             uzlasi
tasiyici_madde_sayisi      (kayıtsız) — payda eksikliği koşu 3'te bulgu olarak tespit edildi
geri_cekme_bulgu           5
geri_cekme_yakinsama       1
kabul_edilen_revizyon      taşıyıcı maddelerin tamamı
zorluk_tahmini             geri dönüşü pahalı — protokol dosya biçimi, otomatik test yok
devredildi                 madde 5 (medium efor) → kalibrasyon çift koşusu
yeniden_ele_alindi         —
```

Biçim notu: bu satır düşen `Tip` sütununda `tam` değerini taşıyordu. Bilgi kaybolmadı —
`Tip = tam`ın karşılığı `Tur = 4`, yani `tur > 1`. Satıra dokunulmadı.

Bu koşu iki mekaniği birden içerdiği için ortalamaya girmez, **emsal** olarak durur.

## koşu 3

```
kosu_id                    3
mekanik                    asimetrik
masa_kompozisyonu          birinci koltuk opus, ikinci koltuk fable   (koşu 2'ye göre takas)
uzatma_karari              ortak-uzat
kapanis_nedeni             uzlasi
tasiyici_madde_sayisi      5 soru · 22 alt madde
geri_cekme_bulgu           3   (fable: uzatildi_mi, eski satır lafzı · opus: çözücü-gözlem şartı)
geri_cekme_yakinsama       0
geri_cekme_yonu            iki yönlü — fable 2, opus 1
gozlemsiz_belirsizlik      —
kabul_edilen_revizyon      taşıyıcı maddelerin tamamı; anonimlik kaldırıldı, uzatma kuralı yazıldı
t0_taslak_karari_degisti_mi  evet — yöneticinin soru kâğıdı bir alanın ölü gerekçesini sordu, üye düzeltti
zorluk_tahmini             geri dönüşü pahalı — protokol + stats şeması + script bayrağı
devredildi                 anonimlik etkisinin yönü · yönetici ortaklığının büyüklüğü · medium efor
yeniden_ele_alindi         —
```

Beş değişken birden oynadı (efor, anonimlik, koltuk takası, uzatma yetkisinin kişi sayısı,
sorunun kendisi). **Koşu 2 ile karşılaştırılamaz**, emsal olarak durur.

Kapanış notu — açık kalan tek yazım ayrıntısı: geç tur dedektörünün eşiğinde sıfır-payda
hali tanımlandı (tur 1-2 oranı sıfırsa taban 1/3), protokole yazıldı. Eşiğin kendisi "emin
değilim" damgalı.

**Bu koşudan sonra mekanik donduruldu.** Kalibrasyon koşusu artı gerçek işte iki koşu
loglanmadan protokolde değişiklik yapılmaz.
