# Bench sonucu — dört görev × dört koşul

Üretim: `node scripts/bench/topla.js` — ham koşu dosyaları `bench/sonuc/*.json`, bu dosya ve `bench/sonuc/toplam.json` o komutla yeniden yazılır.

Koşu sayısı: **16** · görevler: ozellik, hata, rapor, teksatir · koşullar: premium, normal, eco, native.

## 1. Tablo — satır görev, sütun koşul

Hücre: başarı (1/0) · dört token kalemi (input / cache-create / cache-read / output) · duvar saati · tur · ajan sayısı. Tek toplam token yazılmaz (BENCH-YONTEM.md §5).

| görev | premium | normal | eco | native |
|---|---|---|---|---|
| **ozellik** | **1**<br>in 8 · cc 15.137<br>cr 120.609 · out 1.555<br>39 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 13.994<br>cr 118.025 · out 1.360<br>36 sn · 4 tur · 1 ajan | **1**<br>in 6 · cc 13.841<br>cr 85.332 · out 1.154<br>31 sn · 3 tur · 1 ajan | **1**<br>in 8 · cc 11.499<br>cr 109.460 · out 1.300<br>32 sn · 4 tur · 1 ajan |
| **hata** | **1**<br>in 8 · cc 14.358<br>cr 119.985 · out 926<br>33 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 13.641<br>cr 118.095 · out 730<br>32 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 13.812<br>cr 118.094 · out 645<br>30 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 10.782<br>cr 108.901 · out 643<br>29 sn · 4 tur · 1 ajan |
| **rapor** | **1**<br>in 8 · cc 17.362<br>cr 121.103 · out 3.610<br>63 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 15.820<br>cr 118.780 · out 2.656<br>67 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 16.115<br>cr 119.368 · out 2.684<br>65 sn · 4 tur · 1 ajan | **1**<br>in 8 · cc 13.204<br>cr 110.074 · out 2.584<br>57 sn · 4 tur · 1 ajan |
| **teksatir** | **1**<br>in 6 · cc 13.791<br>cr 86.246 · out 402<br>24 sn · 3 tur · 1 ajan | **1**<br>in 6 · cc 12.742<br>cr 84.298 · out 312<br>22 sn · 3 tur · 1 ajan | **1**<br>in 6 · cc 12.922<br>cr 84.658 · out 277<br>21 sn · 3 tur · 1 ajan | **1**<br>in 6 · cc 10.142<br>cr 78.323 · out 297<br>20 sn · 3 tur · 1 ajan |

## 2. Koşu dökümü

| koşu | başarı | input | cache-create | cache-read | output | süre | tur | ajan | kusur | model | harness sapma |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| hata__eco | 1 | 8 | 13.812 | 118.094 | 645 | 30 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__native | 1 | 8 | 10.782 | 108.901 | 643 | 29 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__normal | 1 | 8 | 13.641 | 118.095 | 730 | 32 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| hata__premium | 1 | 8 | 14.358 | 119.985 | 926 | 33 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__eco | 1 | 6 | 13.841 | 85.332 | 1.154 | 31 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__native | 1 | 8 | 11.499 | 109.460 | 1.300 | 32 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__normal | 1 | 8 | 13.994 | 118.025 | 1.360 | 36 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| ozellik__premium | 1 | 8 | 15.137 | 120.609 | 1.555 | 39 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__eco | 1 | 8 | 16.115 | 119.368 | 2.684 | 65 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__native | 1 | 8 | 13.204 | 110.074 | 2.584 | 57 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__normal | 1 | 8 | 15.820 | 118.780 | 2.656 | 67 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| rapor__premium | 1 | 8 | 17.362 | 121.103 | 3.610 | 63 sn | 4 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__eco | 1 | 6 | 12.922 | 84.658 | 277 | 21 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__native | 1 | 6 | 10.142 | 78.323 | 297 | 20 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__normal | 1 | 6 | 12.742 | 84.298 | 312 | 22 sn | 3 | 1 | 0 | claude-opus-5 | %0 |
| teksatir__premium | 1 | 6 | 13.791 | 86.246 | 402 | 24 sn | 3 | 1 | 0 | claude-opus-5 | %0 |

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

| koşul | başarı | iş/dakika | görev başına in / cc / cr / out | kusur/görev | toplam süre | bildirilen maliyet |
|---|---:|---:|---:|---:|---:|---:|
| premium | 4/4 (%100) | 1.5 | 8 / 15.162 / 111.986 / 1.623 | 0 | 160 sn | $0.9929 |
| normal | 4/4 (%100) | 1.52 | 8 / 14.049 / 109.800 / 1.265 | 0 | 157 sn | $0.9082 |
| eco | 4/4 (%100) | 1.63 | 7 / 14.173 / 101.863 / 1.190 | 0 | 147 sn | $0.8898 |
| native | 4/4 (%100) | 1.73 | 8 / 11.407 / 101.690 / 1.206 | 0 | 138 sn | $0.7849 |

Bug oranı `dogrula.js`in bulduğu kusur sayısından gelir: geçen koşu 0 kusur, kalan koşuda `KIRMIZI ·` satırındaki `|` ile ayrılmış madde sayısı.

## 5. n=1 şerhi

Her hücre tek koşudur. Aynı istem iki kez koşulduğunda model farklı sayıda araç çağırabilir, dolayısıyla küçük aralıklar gürültüdür. Burada bir aralık ancak **%20**'yi aşarsa "fark" diye yazılır.

- Taze token (input+cc+out), görev başına: en az **native** 12.621, en çok **premium** 16.793 — aralık %33.1. **Fark var.**
- Cache-read, görev başına: en az **native** 101.690, en çok **premium** 111.986 — aralık %10.1. Ayırt edilemedi.
- Başarı: dört koşulun tamamı dört görevi de geçti — bu görev seti koşulları başarı ekseninde ayırmıyor, ayrım yalnız token ve sürede.

---

Bu dosya üretilir; elle düzenlenmez. Bir önceki (geçersiz sayılan Chess960) tur raporu git geçmişinde durur.
