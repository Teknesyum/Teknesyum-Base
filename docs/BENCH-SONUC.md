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

Geçerli koşu sayısı: **71** · elenen: **6** · görevler: ozellik, hata, rapor, teksatir · koşullar: premium, normal, eco, native.

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
| **ozellik** | **1**<br>in 10 · cc 12.788<br>out 1.851<br>44 sn · 5 tur · 1 ajan | **1**<br>in 6 · cc 12.148<br>out 1.412<br>34 sn · 3 tur · 1 ajan | **1**<br>in 8 · cc 12.253<br>out 1.412<br>35 sn · 4 tur · 1 ajan | **1**<br>in 6 · cc 10.236<br>out 1.083<br>27 sn · 3 tur · 1 ajan |
| **hata** | **1**<br>in 8 · cc 11.410<br>out 619<br>28 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 11.392<br>out 608<br>29 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 11.448<br>out 673<br>28 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 10.538<br>out 680<br>28 sn · 4 tur · 1 ajan |
| **rapor** | **1**<br>in 8 · cc 14.801<br>out 3.606<br>72 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 14.152<br>out 3.190<br>57 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 13.825<br>out 2.716<br>52 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 12.903<br>out 2.993<br>64 sn · 4 tur · 1 ajan |
| **teksatir** | **1**<br>in 6 · cc 10.681<br>out 558<br>23 sn · 3 tur · 1 ajan | **1**<br>in 6 · cc 10.708<br>out 249<br>20 sn · 3 tur · 1 ajan | **1**<br>in 6 · cc 10.710<br>out 237<br>18 sn · 3 tur · 1 ajan | **1**<br>in 6 · cc 9.364<br>out 238<br>18 sn · 3 tur · 1 ajan |

## 2. Koşu dökümü

| koşu | başarı | input | cache-create | output | süre | tur | ajan | kusur | model | harness sapma |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| hata__eco | 1 | 8 | 11.448 | 673 | 28 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__eco | 1 | 8 | 11.761 | 598 | 28 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__eco | 1 | 8 | 11.241 | 673 | 28 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__eco | 1 | 8 | 11.445 | 640 | 27 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__native | 1 | 8 | 10.538 | 680 | 28 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__native | 1 | 8 | 10.097 | 638 | 27 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__native | 1 | 8 | 10.417 | 595 | 26 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__native | 1 | 8 | 10.535 | 695 | 28 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__normal | 1 | 8 | 11.392 | 608 | 29 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__normal | 1 | 8 | 11.288 | 688 | 28 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__normal | 1 | 8 | 11.247 | 647 | 27 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__normal | 1 | 8 | 11.514 | 824 | 30 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__premium | 1 | 8 | 11.410 | 619 | 28 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__premium | 1 | 8 | 11.299 | 690 | 28 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__premium | 1 | 8 | 11.494 | 714 | 28 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__premium | 1 | 8 | 11.355 | 778 | 29 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__eco | 1 | 8 | 12.253 | 1.412 | 35 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__eco | 1 | 8 | 12.131 | 1.443 | 37 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__eco | 1 | 6 | 11.794 | 1.121 | 27 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__eco | 1 | 6 | 11.883 | 1.171 | 29 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__native | 1 | 6 | 10.236 | 1.083 | 27 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__native | 1 | 8 | 10.847 | 1.355 | 34 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__native | 1 | 6 | 10.853 | 1.352 | 31 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__native | 1 | 8 | 10.826 | 1.352 | 34 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__normal | 1 | 6 | 12.148 | 1.412 | 34 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__normal | 1 | 10 | 12.527 | 1.598 | 41 sn | 5 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__normal | 1 | 10 | 12.744 | 1.754 | 43 sn | 5 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__normal | 1 | 8 | 11.795 | 1.255 | 33 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__premium | 1 | 10 | 12.788 | 1.851 | 44 sn | 5 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__premium | 1 | 8 | 12.346 | 1.445 | 34 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__premium | 1 | 8 | 12.391 | 1.467 | 35 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__premium | 1 | 8 | 12.245 | 1.422 | 35 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| proje__eco | 1 | 72 | 75.073 | 34.425 | 453 sn | 36 | 1 | 0 | claude-opus-5 | %0 |
| proje__eco | 1 | 48 | 73.889 | 42.670 | 507 sn | 24 | 1 | 0 | claude-opus-5 | %0 |
| proje__native | 1 | 40 | 76.082 | 47.718 | 547 sn | 20 | 1 | 0 | claude-opus-5 | %0 |
| proje__native | 1 | 38 | 74.431 | 44.684 | 509 sn | 19 | 1 | 0 | claude-opus-5 | %0 |
| proje__native | 1 | 32 | 68.419 | 40.317 | 469 sn | 16 | 1 | 0 | claude-opus-5 | %0 |
| proje__normal | 1 | 38 | 82.577 | 50.907 | 591 sn | 19 | 1 | 0 | claude-opus-5 | %0 |
| proje__premium | 1 | 38 | 75.915 | 43.674 | 524 sn | 19 | 1 | 0 | claude-opus-5 | %0 |
| rapor__eco | 1 | 8 | 13.825 | 2.716 | 52 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__eco | 1 | 8 | 14.144 | 2.912 | 61 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__eco | 1 | 8 | 14.064 | 2.932 | 53 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__eco | 1 | 8 | 13.538 | 2.485 | 48 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__native | 1 | 8 | 12.903 | 2.993 | 64 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__native | 1 | 8 | 12.986 | 3.087 | 71 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__native | 1 | 8 | 12.793 | 2.880 | 66 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__native | 1 | 8 | 12.895 | 3.010 | 59 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__normal | 1 | 8 | 14.152 | 3.190 | 57 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__normal | 1 | 8 | 14.538 | 3.265 | 68 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__normal | 1 | 8 | 13.834 | 2.799 | 51 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__normal | 1 | 8 | 13.997 | 2.786 | 50 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__premium | 1 | 8 | 14.801 | 3.606 | 72 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__premium | 1 | 8 | 14.038 | 2.902 | 55 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__premium | 1 | 8 | 13.982 | 3.153 | 57 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__premium | 1 | 8 | 14.460 | 3.423 | 60 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__eco | 1 | 6 | 10.710 | 237 | 18 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__eco | 1 | 6 | 10.742 | 455 | 22 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__eco | 1 | 6 | 10.729 | 236 | 20 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__eco | 1 | 6 | 10.729 | 238 | 19 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__native | 1 | 6 | 9.364 | 238 | 18 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__native | 1 | 6 | 9.389 | 229 | 18 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__native | 1 | 6 | 9.445 | 290 | 19 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__native | 1 | 6 | 9.395 | 226 | 18 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__normal | 1 | 6 | 10.708 | 249 | 20 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__normal | 1 | 6 | 10.568 | 241 | 19 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__normal | 1 | 6 | 10.817 | 313 | 19 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__normal | 1 | 6 | 10.788 | 300 | 21 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__premium | 1 | 6 | 10.681 | 558 | 23 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__premium | 1 | 6 | 10.728 | 238 | 20 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__premium | 1 | 6 | 10.614 | 289 | 21 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__premium | 1 | 6 | 10.812 | 484 | 23 sn | 3 | 1 | 0 | claude-opus-5 | %0 |

Alt ajan transkriptleri de gezildi (`konfig/projects` altındaki tüm `.jsonl`): hiçbir koşuda alt ajan açılmadı, ajan sayısı her hücrede 1.

## 3. Toplayıcı doğrulaması — harness sayacı

Harness'ın `total_tokens` sayacı bağlam işgalini ölçer: son hatırlatıcı anındaki bağlam (input + cache-create + cache-read) artı o turun çıktısı. Aynı büyüklük transkriptten okunan tur dizisinden yeniden kuruldu; iki sayının farkı toplayıcının doğruluk ölçüsü.

| koşu | harness sayacı | transkriptten yeniden | sapma |
|---|---:|---:|---:|
| hata__eco | 39.172 | 39.172 | %0 |
| hata__eco | 39.474 | 39.474 | %0 |
| hata__eco | 38.962 | 38.962 | %0 |
| hata__eco | 39.166 | 39.166 | %0 |
| hata__native | 38.257 | 38.257 | %0 |
| hata__native | 37.819 | 37.819 | %0 |
| hata__native | 38.131 | 38.131 | %0 |
| hata__native | 38.249 | 38.249 | %0 |
| hata__normal | 39.110 | 39.110 | %0 |
| hata__normal | 39.009 | 39.009 | %0 |
| hata__normal | 38.968 | 38.968 | %0 |
| hata__normal | 39.227 | 39.227 | %0 |
| hata__premium | 39.134 | 39.134 | %0 |
| hata__premium | 39.020 | 39.020 | %0 |
| hata__premium | 39.215 | 39.215 | %0 |
| hata__premium | 39.068 | 39.068 | %0 |
| ozellik__eco | 39.901 | 39.901 | %0 |
| ozellik__eco | 39.752 | 39.752 | %0 |
| ozellik__eco | 39.499 | 39.499 | %0 |
| ozellik__eco | 39.502 | 39.502 | %0 |
| ozellik__native | 37.949 | 37.949 | %0 |
| ozellik__native | 38.517 | 38.517 | %0 |
| ozellik__native | 38.403 | 38.403 | %0 |
| ozellik__native | 38.500 | 38.500 | %0 |
| ozellik__normal | 39.720 | 39.720 | %0 |
| ozellik__normal | 40.169 | 40.169 | %0 |
| ozellik__normal | 40.363 | 40.363 | %0 |
| ozellik__normal | 39.485 | 39.485 | %0 |
| ozellik__premium | 40.368 | 40.368 | %0 |
| ozellik__premium | 39.997 | 39.997 | %0 |
| ozellik__premium | 40.004 | 40.004 | %0 |
| ozellik__premium | 39.892 | 39.892 | %0 |
| proje__eco | 94.842 | 94.842 | %0 |
| proje__eco | 93.734 | 93.734 | %0 |
| proje__native | 95.863 | 95.863 | %0 |
| proje__native | 94.386 | 94.386 | %0 |
| proje__native | 88.315 | 88.315 | %0 |
| proje__normal | 102.390 | 102.390 | %0 |
| proje__premium | 95.674 | 95.674 | %0 |
| rapor__eco | 41.582 | 41.582 | %0 |
| rapor__eco | 41.927 | 41.927 | %0 |
| rapor__eco | 41.818 | 41.818 | %0 |
| rapor__eco | 41.326 | 41.326 | %0 |
| rapor__native | 40.658 | 40.658 | %0 |
| rapor__native | 40.742 | 40.742 | %0 |
| rapor__native | 40.577 | 40.577 | %0 |
| rapor__native | 40.684 | 40.684 | %0 |
| rapor__normal | 41.943 | 41.943 | %0 |
| rapor__normal | 42.326 | 42.326 | %0 |
| rapor__normal | 41.588 | 41.588 | %0 |
| rapor__normal | 41.752 | 41.752 | %0 |
| rapor__premium | 42.589 | 42.589 | %0 |
| rapor__premium | 41.792 | 41.792 | %0 |
| rapor__premium | 41.770 | 41.770 | %0 |
| rapor__premium | 42.209 | 42.209 | %0 |
| teksatir__eco | 38.266 | 38.266 | %0 |
| teksatir__eco | 38.493 | 38.493 | %0 |
| teksatir__eco | 38.279 | 38.279 | %0 |
| teksatir__eco | 38.279 | 38.279 | %0 |
| teksatir__native | 36.922 | 36.922 | %0 |
| teksatir__native | 36.941 | 36.941 | %0 |
| teksatir__native | 36.997 | 36.997 | %0 |
| teksatir__native | 36.947 | 36.947 | %0 |
| teksatir__normal | 38.264 | 38.264 | %0 |
| teksatir__normal | 38.118 | 38.118 | %0 |
| teksatir__normal | 38.367 | 38.367 | %0 |
| teksatir__normal | 38.338 | 38.338 | %0 |
| teksatir__premium | 38.435 | 38.435 | %0 |
| teksatir__premium | 38.278 | 38.278 | %0 |
| teksatir__premium | 38.164 | 38.164 | %0 |
| teksatir__premium | 38.362 | 38.362 | %0 |

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
| premium | 16/16 (%100) | 1.63 | 8 / 12.215 / 1.477 | 0 | 590 sn | $3.635 |
| normal | 16/16 (%100) | 1.68 | 8 / 12.129 / 1.371 | 0 | 572 sn | $3.5787 |
| eco | 16/16 (%100) | 1.81 | 7 / 12.027 / 1.246 | 0 | 530 sn | $3.4542 |
| native | 16/16 (%100) | 1.69 | 7 / 10.845 / 1.294 | 0 | 567 sn | $3.2752 |

Bug oranı `dogrula.js`in bulduğu kusur sayısından gelir: geçen koşu 0 kusur, kalan koşuda `KIRMIZI ·` satırındaki `|` ile ayrılmış madde sayısı.

## 5. n=1 şerhi

Her hücre tek koşudur. Aynı istem iki kez koşulduğunda model farklı sayıda araç çağırabilir, dolayısıyla küçük aralıklar gürültüdür. Burada bir aralık ancak **%20**'yi aşarsa "fark" diye yazılır. Aralık **yalnız aynı görev sınıfı içinde** okunur; karışık havuzdan "fark var" hükmü üretilmez.

- proje görevi — Taze token (input+cc+out), görev başına: en az **eco** 113.089, en çok **normal** 133.522 — aralık %18.1. Ayırt edilemedi.
- mikro görev — Taze token (input+cc+out), görev başına: en az **native** 12.146, en çok **premium** 13.700 — aralık %12.8. Ayırt edilemedi.
- Başarı: dört koşulun tamamı dört görevi de geçti — bu görev seti koşulları başarı ekseninde ayırmıyor, ayrım yalnız token ve sürede.

## 6. Türev metrikler

Her metriğin tur sayısıyla Pearson korelasyonu hesaplandı; değerler görev sınıfı içinde merkezlendi, yoksa korelasyon yalnızca "proje görevi tekşatırdan büyük"ü ölçerdi. |r| > 0.9 olan metrik bağımsız bilgi taşımaz — tur sayısını başka birimle tekrar yazar — ve **türev** damgası alır. Türev metrikler birincil tablolarda kullanılmaz, hüküm dayanağı olamaz.

| metrik | r(tur) | damga |
|---|---:|---|
| taze token (in+cc+out) | -0.3483 | birincil |
| cache-read | 0.9908 | **türev** |
| süre (sn) | -0.437 | birincil |
| kusur | - | birincil |
| ajan sayısı | - | birincil |

- proje görevi — Cache-read, görev başına: en az **native** 1.236.278, en çok **eco** 2.077.104 — aralık %68. **Fark var.**
- mikro görev — Cache-read, görev başına: en az **native** 125.521, en çok **normal** 136.157 — aralık %8.5. Ayırt edilemedi.

Yukarıdaki aralıklar türev bir metriğe aittir, koşullar arası hüküm için kullanılamaz.

| koşu | cache-read | tur |
|---|---:|---:|
| hata__eco | 143.158 | 4 |
| hata__eco__r1 | 143.599 | 4 |
| hata__eco__r2 | 142.723 | 4 |
| hata__eco__r3 | 143.180 | 4 |
| hata__native | 139.638 | 4 |
| hata__native__r1 | 139.147 | 4 |
| hata__native__r2 | 139.579 | 4 |
| hata__native__r3 | 139.651 | 4 |
| hata__normal | 142.831 | 4 |
| hata__normal__r1 | 142.653 | 4 |
| hata__normal__r2 | 142.632 | 4 |
| hata__normal__r3 | 143.190 | 4 |
| hata__premium | 143.110 | 4 |
| hata__premium__r1 | 142.640 | 4 |
| hata__premium__r2 | 143.192 | 4 |
| hata__premium__r3 | 142.652 | 4 |
| ozellik__eco | 143.692 | 4 |
| ozellik__eco__r1 | 143.231 | 4 |
| ozellik__eco__r2 | 104.670 | 3 |
| ozellik__eco__r3 | 104.670 | 3 |
| ozellik__native | 101.962 | 3 |
| ozellik__native__r1 | 139.735 | 4 |
| ozellik__native__r2 | 102.324 | 3 |
| ozellik__native__r3 | 139.723 | 4 |
| ozellik__normal | 104.622 | 3 |
| ozellik__normal__r1 | 183.551 | 5 |
| ozellik__normal__r2 | 183.764 | 5 |
| ozellik__normal__r3 | 143.179 | 4 |
| ozellik__premium | 183.549 | 5 |
| ozellik__premium__r1 | 143.772 | 4 |
| ozellik__premium__r2 | 143.759 | 4 |
| ozellik__premium__r3 | 143.740 | 4 |
| proje__eco__r2 | 2.485.911 | 36 |
| proje__eco__r3 | 1.668.296 | 24 |
| proje__native | 1.434.027 | 20 |
| proje__native__r2 | 1.251.170 | 19 |
| proje__native__r3 | 1.023.638 | 16 |
| proje__normal__r2 | 1.382.081 | 19 |
| proje__premium__r2 | 1.302.674 | 19 |
| rapor__eco | 143.833 | 4 |
| rapor__eco__r1 | 144.397 | 4 |
| rapor__eco__r2 | 144.393 | 4 |
| rapor__eco__r3 | 143.839 | 4 |
| rapor__native | 140.308 | 4 |
| rapor__native__r1 | 140.333 | 4 |
| rapor__native__r2 | 140.365 | 4 |
| rapor__native__r3 | 140.372 | 4 |
| rapor__normal | 143.821 | 4 |
| rapor__normal__r1 | 144.397 | 4 |
| rapor__normal__r2 | 143.899 | 4 |
| rapor__normal__r3 | 144.296 | 4 |
| rapor__premium | 144.385 | 4 |
| rapor__premium__r1 | 144.276 | 4 |
| rapor__premium__r2 | 143.610 | 4 |
| rapor__premium__r3 | 143.910 | 4 |
| teksatir__eco | 103.962 | 3 |
| teksatir__eco__r1 | 104.142 | 3 |
| teksatir__eco__r2 | 103.987 | 3 |
| teksatir__eco__r3 | 103.987 | 3 |
| teksatir__native | 101.277 | 3 |
| teksatir__native__r1 | 101.306 | 3 |
| teksatir__native__r2 | 101.306 | 3 |
| teksatir__native__r3 | 101.316 | 3 |
| teksatir__normal | 103.958 | 3 |
| teksatir__normal__r1 | 103.654 | 3 |
| teksatir__normal__r2 | 104.073 | 3 |
| teksatir__normal__r3 | 103.985 | 3 |
| teksatir__premium | 103.905 | 3 |
| teksatir__premium__r1 | 103.985 | 3 |
| teksatir__premium__r2 | 103.641 | 3 |
| teksatir__premium__r3 | 103.895 | 3 |

---

Bu dosya üretilir; elle düzenlenmez. Bir önceki (geçersiz sayılan Chess960) tur raporu git geçmişinde durur.
