# Bench sonucu — dört görev × dört koşul

Üretim: `node scripts/bench/topla.js` — ham koşu dosyaları `bench/sonuc/*.json`, bu dosya ve `bench/sonuc/toplam.json` o komutla yeniden yazılır.

> **GEÇERSİZLİK UYARISI (26.08.2026)**
>
> Bu raporun 26.08.2026 öncesi sürümleri geçerli koşu kapısı olmadan üretildi: oturum
> kotasına çarpıp ortasından kesilen koşular (`You've hit your session limit`) geçerli
> sonuç sayıldı, çünkü `kos.js` çıkış kodunu başarı kararına katmıyordu. Bu sürüm o
> koşuları eler; hangilerinin elendiği §0 bölümünde nedenleriyle yazılıdır.
>
> Geri çekilen hükümler:
>
> - ~~"premium 27 kusurla yarım teslim etti"~~ — 27 kusur kota kesintisinin artefaktıdır;
>   model `rapor.js`i yazmış, `cli.js`e sıra gelmeden kesilmiş. Kesilen koşular
>   elendiğinde eklentili koşullarda hiç kusur kalmıyor.
> - ~~"eco en çok bağlam okudu"~~ — sıralama tur sayısı sıralamasının aynısıdır
>   (r(tur, cacheRead) = 0,992). Cache-read birincil metrik olmaktan çıkarıldı, §6.
> - ~~"randomize blok"~~ — eski düzenekte hiçbir rastgeleleştirme yoktu, koşul sırası
>   her blokta sabitti. Tohumlu permütasyon sonradan eklendi.
>
> **Eşzamanlılık şerhi.** Mikro bench'in 16 koşusu tek hesapta eşzamanlı koştu; kota ve
> kuyruk çekişmesi denetlenmedi. Koşullar arası süre farkları bu çekişmeyi de içerebilir,
> yalnız eklenti yükünü değil. Ayrıca 26.08'de ana `.credentials.json` dosyasının
> boşaldığı görüldü (token alanları uzunluk 0, `expiresAt` 0): o günkü bazı "oturum
> limiti" olaylarının gerçek nedeni kota değil kimlik bozulması olabilir. `kos.js` artık
> `session limit` ile `OAuth session expired` imzalarını ayrı raporluyor.
>
>
> **Dengesiz karışım.** İlk sürümde §4 verim tablosu proje koşularıyla mikro koşuları tek
> ortalamada topluyordu. Geçerlilik kapısı proje koşularını koşullara eşitsiz dağıttığı
> (premium 1, normal 1, eco 2, native 3 proje koşusu; mikro her koşulda 4) ve proje koşusu
> mikro koşudan ~8 kat büyük olduğu için ham ortalama fiilen "hangi koşulda kaç proje
> koşusu hayatta kaldı"yı ölçtü ve **ters işaretli** bir hüküm üretti: "native premium'dan
> %53,8 fazla taze token tüketti". Sınıf içi tablo bunun tersini gösteriyor. Verim tablosu,
> iş/dakika, toplam süre ve fark hükmü artık görev sınıfı içinde hesaplanıyor; bir sınıfın
> geçerli koşusu olmayan hücre "veri yok" basar, karşılaştırmaya girmez.
>
> Kaynak: `docs/BRIFING-ONARIM.md` §2. Bu blok `scripts/bench/topla.js` içinde yaşar;
> bu dosyaya elle yazılan not bir sonraki üretimde silinir.

Geçerli koşu sayısı: **23** · elenen: **6** · görevler: ozellik, hata, rapor, teksatir · koşullar: premium, normal, eco, native.

## 0. Elenen koşular

Bu koşular çıkış kodu, tavan, `is_error` ya da oturum limiti imzası nedeniyle geçersiz damgalandı. Aşağıdaki hiçbir tabloya, ortalamaya ve hükme girmezler; `kusur` alanları 0 değil **bilinmiyor**dur.

| koşu | neden |
|---|---|
| proje__eco r1 | cikis kodu 1 · oturum limiti imzasi |
| proje__native r1 | cikis kodu 1 · oturum limiti imzasi |
| proje__normal r1 | cikis kodu 1 · oturum limiti imzasi |
| proje__normal r3 | cikis kodu 1 · oturum limiti imzasi |
| proje__premium r1 | cikis kodu 1 · oturum limiti imzasi |
| proje__premium r3 | cikis kodu 1 · oturum limiti imzasi |

## 1. Tablo — satır görev, sütun koşul

Hücre: başarı (1/0) · birincil token kalemleri (input / cache-create / output) · duvar saati · tur · ajan sayısı. Tek toplam token yazılmaz (BENCH-YONTEM.md §5). Cache-read birincil değildir, §6 türev metrikler bölümünde.

| görev | premium | normal | eco | native |
|---|---|---|---|---|
| **ozellik** | **1**<br>in 8 · cc 15.137<br>out 1.555<br>39 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 13.994<br>out 1.360<br>36 sn · 4 tur · 1 ajan | **1**<br>in 6 · cc 13.841<br>out 1.154<br>31 sn · 3 tur · 1 ajan | **1**<br>in 8 · cc 11.499<br>out 1.300<br>32 sn · 4 tur · 1 ajan |
| **hata** | **1**<br>in 8 · cc 14.358<br>out 926<br>33 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 13.641<br>out 730<br>32 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 13.812<br>out 645<br>30 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 10.782<br>out 643<br>29 sn · 4 tur · 1 ajan |
| **rapor** | **1**<br>in 8 · cc 17.362<br>out 3.610<br>63 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 15.820<br>out 2.656<br>67 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 16.115<br>out 2.684<br>65 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 13.204<br>out 2.584<br>57 sn · 4 tur · 1 ajan |
| **teksatir** | **1**<br>in 6 · cc 13.791<br>out 402<br>24 sn · 3 tur · 1 ajan | **1**<br>in 6 · cc 12.742<br>out 312<br>22 sn · 3 tur · 1 ajan | **1**<br>in 6 · cc 12.922<br>out 277<br>21 sn · 3 tur · 1 ajan | **1**<br>in 6 · cc 10.142<br>out 297<br>20 sn · 3 tur · 1 ajan |

## 2. Koşu dökümü

| koşu | başarı | input | cache-create | output | süre | tur | ajan | kusur | model | harness sapma |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| hata__eco | 1 | 8 | 13.812 | 645 | 30 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__native | 1 | 8 | 10.782 | 643 | 29 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__normal | 1 | 8 | 13.641 | 730 | 32 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__premium | 1 | 8 | 14.358 | 926 | 33 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__eco | 1 | 6 | 13.841 | 1.154 | 31 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__native | 1 | 8 | 11.499 | 1.300 | 32 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__normal | 1 | 8 | 13.994 | 1.360 | 36 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__premium | 1 | 8 | 15.137 | 1.555 | 39 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| proje__eco | 1 | 72 | 75.073 | 34.425 | 453 sn | 36 | 1 | 0 | claude-opus-5 | %0 |
| proje__eco | 1 | 48 | 73.889 | 42.670 | 507 sn | 24 | 1 | 0 | claude-opus-5 | %0 |
| proje__native | 1 | 40 | 76.082 | 47.718 | 547 sn | 20 | 1 | 0 | claude-opus-5 | %0 |
| proje__native | 1 | 38 | 74.431 | 44.684 | 509 sn | 19 | 1 | 0 | claude-opus-5 | %0 |
| proje__native | 1 | 32 | 68.419 | 40.317 | 469 sn | 16 | 1 | 0 | claude-opus-5 | %0 |
| proje__normal | 1 | 38 | 82.577 | 50.907 | 591 sn | 19 | 1 | 0 | claude-opus-5 | %0 |
| proje__premium | 1 | 38 | 75.915 | 43.674 | 524 sn | 19 | 1 | 0 | claude-opus-5 | %0 |
| rapor__eco | 1 | 8 | 16.115 | 2.684 | 65 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__native | 1 | 8 | 13.204 | 2.584 | 57 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__normal | 1 | 8 | 15.820 | 2.656 | 67 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__premium | 1 | 8 | 17.362 | 3.610 | 63 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__eco | 1 | 6 | 12.922 | 277 | 21 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__native | 1 | 6 | 10.142 | 297 | 20 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__normal | 1 | 6 | 12.742 | 312 | 22 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__premium | 1 | 6 | 13.791 | 402 | 24 sn | 3 | 1 | 0 | claude-opus-5 | %0 |

Alt ajan transkriptleri de gezildi (`konfig/projects` altındaki tüm `.jsonl`): hiçbir koşuda alt ajan açılmadı, ajan sayısı her hücrede 1.

## 3. Toplayıcı doğrulaması — harness sayacı

Harness'ın `total_tokens` sayacı bağlam işgalini ölçer: son hatırlatıcı anındaki bağlam (input + cache-create + cache-read) artı o turun çıktısı. Aynı büyüklük transkriptten okunan tur dizisinden yeniden kuruldu; iki sayının farkı toplayıcının doğruluk ölçüsü.

| koşu | harness sayacı | transkriptten yeniden | sapma |
|---|---:|---:|---:|
| hata__eco | 33.646 | 33.646 | %0 |
| hata__native | 30.609 | 30.609 | %0 |
| hata__normal | 33.459 | 33.459 | %0 |
| hata__premium | 34.176 | 34.176 | %0 |
| ozellik__eco | 33.670 | 33.670 | %0 |
| ozellik__native | 31.283 | 31.283 | %0 |
| ozellik__normal | 33.783 | 33.783 | %0 |
| ozellik__premium | 34.886 | 34.886 | %0 |
| proje__eco | 94.842 | 94.842 | %0 |
| proje__eco | 93.734 | 93.734 | %0 |
| proje__native | 95.863 | 95.863 | %0 |
| proje__native | 94.386 | 94.386 | %0 |
| proje__native | 88.315 | 88.315 | %0 |
| proje__normal | 102.390 | 102.390 | %0 |
| proje__premium | 95.674 | 95.674 | %0 |
| rapor__eco | 35.972 | 35.972 | %0 |
| rapor__native | 33.103 | 33.103 | %0 |
| rapor__normal | 35.713 | 35.713 | %0 |
| rapor__premium | 37.255 | 37.255 | %0 |
| teksatir__eco | 32.580 | 32.580 | %0 |
| teksatir__native | 29.802 | 29.802 | %0 |
| teksatir__normal | 32.400 | 32.400 | %0 |
| teksatir__premium | 33.449 | 33.449 | %0 |

En büyük sapma **%0** — kabul eşiği %5.

## 4. Verim

Her sütun **görev sınıfı içinde** hesaplanır. Proje koşusu mikro koşudan ~8 kat büyüktür ve geçerlilik kapısı proje koşularını koşullara eşitsiz dağıttı; sınıfları tek ortalamada toplamak "hangi koşulda kaç proje koşusu hayatta kaldı"yı ölçer, verimi değil. Bir koşulda bir sınıfın geçerli koşusu yoksa hücre **veri yok**tur — sıfır değil, atlanmış da değil.

### 4.1 proje görevi

| koşul | başarı | iş/dakika | görev başına in / cc / out | kusur/görev | toplam süre | bildirilen maliyet |
|---|---:|---:|---:|---:|---:|---:|
| premium | 1/1 (%100) | 0.11 | 38 / 75.915 / 43.674 | 0 | 524 sn | $2.5025 |
| normal | 1/1 (%100) | 0.1 | 38 / 82.577 / 50.907 | 0 | 591 sn | $2.7897 |
| eco | 2/2 (%100) | 0.13 | 60 / 74.481 / 38.548 | 0 | 959 sn | $5.4947 |
| native | 3/3 (%100) | 0.12 | 37 / 72.977 / 44.240 | 0 | 1525 sn | $7.3901 |

### 4.2 mikro görev

| koşul | başarı | iş/dakika | görev başına in / cc / out | kusur/görev | toplam süre | bildirilen maliyet |
|---|---:|---:|---:|---:|---:|---:|
| premium | 4/4 (%100) | 1.5 | 8 / 15.162 / 1.623 | 0 | 160 sn | $0.9929 |
| normal | 4/4 (%100) | 1.52 | 8 / 14.049 / 1.265 | 0 | 157 sn | $0.9082 |
| eco | 4/4 (%100) | 1.63 | 7 / 14.173 / 1.190 | 0 | 147 sn | $0.8898 |
| native | 4/4 (%100) | 1.73 | 8 / 11.407 / 1.206 | 0 | 138 sn | $0.7849 |

Bug oranı `dogrula.js`in bulduğu kusur sayısından gelir: geçen koşu 0 kusur, kalan koşuda `KIRMIZI ·` satırındaki `|` ile ayrılmış madde sayısı.

## 5. n=1 şerhi

Her hücre tek koşudur. Aynı istem iki kez koşulduğunda model farklı sayıda araç çağırabilir, dolayısıyla küçük aralıklar gürültüdür. Burada bir aralık ancak **%20**'yi aşarsa "fark" diye yazılır. Aralık **yalnız aynı görev sınıfı içinde** okunur; karışık havuzdan "fark var" hükmü üretilmez.

- proje görevi — Taze token (input+cc+out), görev başına: en az **eco** 113.089, en çok **normal** 133.522 — aralık %18.1. Ayırt edilemedi.
- mikro görev — Taze token (input+cc+out), görev başına: en az **native** 12.621, en çok **premium** 16.793 — aralık %33.1. **Fark var.**
- Başarı: dört koşulun tamamı dört görevi de geçti — bu görev seti koşulları başarı ekseninde ayırmıyor, ayrım yalnız token ve sürede.

## 6. Türev metrikler

Her metriğin tur sayısıyla Pearson korelasyonu hesaplandı; değerler görev sınıfı içinde merkezlendi, yoksa korelasyon yalnızca "proje görevi tekşatırdan büyük"ü ölçerdi. |r| > 0.9 olan metrik bağımsız bilgi taşımaz — tur sayısını başka birimle tekrar yazar — ve **türev** damgası alır. Türev metrikler birincil tablolarda kullanılmaz, hüküm dayanağı olamaz.

| metrik | r(tur) | damga |
|---|---:|---|
| taze token (in+cc+out) | -0.3698 | birincil |
| cache-read | 0.9929 | **türev** |
| süre (sn) | -0.4863 | birincil |
| kusur | - | birincil |
| ajan sayısı | - | birincil |

- proje görevi — Cache-read, görev başına: en az **native** 1.236.278, en çok **eco** 2.077.104 — aralık %68. **Fark var.**
- mikro görev — Cache-read, görev başına: en az **native** 101.690, en çok **premium** 111.986 — aralık %10.1. Ayırt edilemedi.

Yukarıdaki aralıklar türev bir metriğe aittir, koşullar arası hüküm için kullanılamaz.

| koşu | cache-read | tur |
|---|---:|---:|
| hata__eco | 118.094 | 4 |
| hata__native | 108.901 | 4 |
| hata__normal | 118.095 | 4 |
| hata__premium | 119.985 | 4 |
| ozellik__eco | 85.332 | 3 |
| ozellik__native | 109.460 | 4 |
| ozellik__normal | 118.025 | 4 |
| ozellik__premium | 120.609 | 4 |
| proje__eco__r2 | 2.485.911 | 36 |
| proje__eco__r3 | 1.668.296 | 24 |
| proje__native | 1.434.027 | 20 |
| proje__native__r2 | 1.251.170 | 19 |
| proje__native__r3 | 1.023.638 | 16 |
| proje__normal__r2 | 1.382.081 | 19 |
| proje__premium__r2 | 1.302.674 | 19 |
| rapor__eco | 119.368 | 4 |
| rapor__native | 110.074 | 4 |
| rapor__normal | 118.780 | 4 |
| rapor__premium | 121.103 | 4 |
| teksatir__eco | 84.658 | 3 |
| teksatir__native | 78.323 | 3 |
| teksatir__normal | 84.298 | 3 |
| teksatir__premium | 86.246 | 3 |

---

Bu dosya üretilir; elle düzenlenmez. Bir önceki (geçersiz sayılan Chess960) tur raporu git geçmişinde durur.
