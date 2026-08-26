# Ölçüm — kod

Salt ölçüm. Hiçbir dosya değiştirilmedi, hiçbir şey optimize edilmedi.

Ölçüm tarihi: 2026-08-22 · Windows 11 Pro 10.0.22631 · Node `process.execPath`
Yöntem: her rakam en az 10 tekrarın **medyanı**. Tekil sayılar `min` ile birlikte verilir.

Kancalar gerçek yükle, ayrı süreçte çalıştırıldı. Depo durumunu bozmamak için
`.claude/relay` klasörünün birebir kopyası geçici bir kum havuzuna alındı
(142 iz dosyası, 495.876 bayt) ve ölçümler orada yapıldı; sayılar üretimdeki
klasör büyüklüğünü yansıtır.

---

## 1. Ham sayılar

| Dosya | Satır | Bayt | readFileSync | existsSync | readdirSync | statSync | süreç açan |
|---|---:|---:|---:|---:|---:|---:|---:|
| `hooks/ortak.js` | 185 | 6.757 | 1 | 6 | 1 | 0 | 3 |
| `hooks/dil.js` | 806 | 38.032 | 2 | 0 | 0 | 0 | 0 |
| `hooks/relay-watch.js` | 1.394 | 53.311 | 5 | 4 | 5 | 10 | 2 |
| `hooks/contract-guard.js` | 356 | 14.185 | 4 | 2 | 1 | 0 | 0 |
| `hooks/kapsayici.js` | 179 | 5.155 | 4 | 5 | 3 | 0 | 0 |
| `scripts/oturum.js` | 1.149 | 36.907 | 11 | 12 | 7 | 6 | 3 |
| `scripts/premium.js` | 348 | 11.619 | 5 | 3 | 0 | 0 | 0 |
| `scripts/tarama.js` | 509 | 17.366 | 2 | 0 | 2 | 0 | 2 |
| `scripts/surum.js` | 105 | 3.639 | 1 | 1 | 0 | 0 | 2 |
| `scripts/statusline.js` | 299 | 9.510 | 3 | 2 | 2 | 0 | 2 |
| `scripts/harita.js` | 269 | 7.988 | 1 | 1 | 1 | 0 | 0 |
| `scripts/rc.js` | 325 | 10.311 | 2 | 3 | 1 | 0 | 9 |
| `scripts/uicheckup.js` | 316 | 11.148 | 3 | 2 | 2 | 3 | 0 |
| `scripts/uicheckup-apply.js` | 154 | 5.945 | 3 | 1 | 0 | 3 | 0 |
| `scripts/platform-denetim.js` | 250 | 6.957 | 3 | 1 | 2 | 0 | 0 |
| `scripts/bridge.js` | 49 | 1.477 | 0 | 1 | 1 | 0 | 0 |
| `test/run.js` | 4.712 | 178.359 | 116 | 41 | 14 | 2 | 42 |
| **Toplam** | **11.405** | **418.666** | 166 | 86 | 42 | 24 | 65 |

Kaynak kod (test hariç): 6.693 satır, 240.307 bayt, 16 dosya.
Test tek dosyada: 4.712 satır — kaynağın %70'i kadar.

---

## 2. Çalışma sıklığı — gerçek veriden

`_hook-debug.json` sayaçları (2026-08-19 19:22 → 2026-08-22 14:46, **2 oturum**, 3 gün):

| Olay | Adet | Payı |
|---|---:|---:|
| PostToolUse | 2.362 | %84,8 |
| SubagentStop | 149 | %5,3 |
| PostToolUseFailure | 108 | %3,9 |
| PreToolUse | 92 | %3,3 |
| SubagentStart | 76 | %2,7 |
| **Toplam** | **2.787** | |

Bunun 1.578'i ajanlı, PostToolUse'ların 1.246'sı ajanlı.
**Oturum başına ≈1.394 olay, ≈1.181 PostToolUse.**

`hooks.json` kaydına göre `relay-watch.js` **11 olaya** bağlı ve
PostToolUse girdisinde **`matcher` yok** — her araç çağrısında istisnasız çalışıyor.
`contract-guard.js` yalnız `Write|Edit|NotebookEdit|Bash` PreToolUse'unda çalışıyor.

`_hook-debug.log` içindeki 1.090 satırlık PostToolUse örnekleminde araç dağılımı:

| Araç | Adet | Pay |
|---|---:|---:|
| Bash | 661 | %70,0 |
| Edit | 156 | %16,5 |
| Write | 56 | %5,9 |
| Agent | 27 | %2,9 |
| PowerShell | 20 | %2,1 |
| diğer (WebFetch, Skill, Read…) | 25 | %2,6 |

Write + Edit = **%22,4**.

---

## 3. Süre — ölçülen

### 3.1 Taban: Windows'ta süreç açmak

| İşlem | Medyan | Min |
|---|---:|---:|
| boş `node -e 0` | 22,0–26,3 ms | 19,7 |
| `git rev-parse --abbrev-ref HEAD` | 13,5 ms | 11,5 |
| `git rev-parse --show-toplevel` | 12,1 ms | 11,3 |
| `node --check` (63 bayt dosya) | 30,1 ms | 27,6 |
| `node --check` (53 KB) | 30,5 ms | 28,5 |
| `node --check` (178 KB) | 32,6 ms | 32,2 |

`node --check` süresinin neredeyse tamamı süreç açma. Dosya 63 bayttan 178 KB'a
çıkınca süre yalnız 2,5 ms artıyor — **ayrıştırma değil, süreç açmak pahalı.**

### 3.2 relay-watch.js, olay başına tam süreç

| Olay | Medyan | Min | Max | Kendi işi (taban 26,3 ms düşülmüş) |
|---|---:|---:|---:|---:|
| PostToolUse · Read | 38,6 | 36,2 | 59,7 | 12,3 |
| PostToolUse · Bash | 39,3 | 35,7 | 41,2 | 13,0 |
| PostToolUse · Write `.md` | 39,5 | 37,6 | 49,6 | 13,2 |
| **PostToolUse · Write `.js`** | **74,6** | 67,6 | 87,2 | **48,3** |
| PostToolUse · Write `.json` | 44,3 | 40,7 | 51,5 | 18,0 |
| PostToolUse · ajanlı Read | 40,7 | 38,5 | 45,2 | 14,4 |
| UserPromptSubmit | 57,8 | 54,3 | 63,0 | 31,5 |
| SessionStart | 43,2 | 40,8 | 48,4 | 16,9 |
| Stop | 39,5 | 38,0 | 59,8 | 13,2 |
| SubagentStart | 41,3 | 37,5 | 44,1 | 15,0 |
| SubagentStop | 38,1 | 37,4 | 41,1 | 11,8 |
| PostToolUseFailure | 37,9 | 35,6 | 43,1 | 11,6 |
| SessionEnd | 47,3 | 45,5 | 52,7 | 21,0 |
| PostCompact | 61,2 | 55,4 | 69,1 | 34,9 |

### 3.3 contract-guard.js

| Olay | Medyan | Min |
|---|---:|---:|
| PreToolUse · Write | 33,9 | 31,8 |
| PreToolUse · Bash | 33,3 | 31,5 |
| PreToolUse · Edit | 35,2 | 33,6 |

Kendi işi ≈7–9 ms; süresinin %77'si boş süreç açma.

### 3.4 Sabit maliyet katmanları

| Katman | Medyan | Üstüne eklediği |
|---|---:|---:|
| boş node | 22,0 | — |
| `+ ortak.js` | 24,6 | +2,6 |
| `+ dil.js` (38 KB) | 27,6 | +3,0 |
| relay-watch'ın tüm require zinciri | 28,0 | +6,0 |

`require` zinciri toplamda **6 ms** ekliyor; olay başına 38,6 ms'nin %15,5'i.
Soğuk tek tek: `ortak.js` 1,87 ms · `dil.js` 1,45 ms · `kapsayici.js` 1,20 ms.

### 3.5 Oturum toplamı

Oturum başına ≈1.181 PostToolUse × 38,6 ms = **45,6 saniye** yalnız `relay-watch`
PostToolUse'ları için. Diğer olaylar (213 adet, ortalama ≈42 ms) **≈8,9 saniye**.
`contract-guard` PreToolUse'ları (92 olay × 33,9 ms) **≈3,1 saniye**.

**Kanca toplamı: oturum başına ≈57,6 saniye. Bunun ≈33,4 saniyesi (%58) boş
süreç açma tabanı — hiçbir iş yapılmadan geçen süre.**

3 günlük 2 oturumda: **≈1,9 dakika**.

---

## 4. Dosya sistemi maliyeti

Tekil işlem ölçümleri (kum havuzu, 142 dosyalı `live/`):

| İşlem | Medyan |
|---|---:|
| `existsSync` | 0,078 ms |
| `statSync` | 0,055 ms |
| `readFileSync` (600 B) | 0,057 ms |
| `readdirSync` (142 dosya) | 0,100 ms |
| `JSON.parse` (600 B) | 0,059 ms |

Tekil işlemler ucuz. Pahalı olan **toplu tarama**:

- `saglikTara()` → 142 dosyanın tamamını okur ve parse eder: **10,9 ms** (min 9,1).
  Bu, PostToolUse'un kendi işinin (12,3 ms) neredeyse tamamı.
  `SAGLIK_ARA = 60 sn` damgasıyla kısılmış: dakikada bir kez çalışır.
  Oturum başına ≈1.181 PostToolUse yaklaşık 3 saate yayılırsa ≈180 kez tetiklenir
  → **≈2,0 saniye**. Damga olmasaydı 1.181 × 10,9 ms = **12,9 saniye** olacaktı;
  **damga oturum başına ≈10,9 saniye kazandırıyor, etkili.**
- `supur()` da damgayla kısılmış (`SUPUR_ARA`), genel kökü `readdirSync` + dizin
  başına `statSync` yapıyor. Damga taze olduğu sürece maliyeti tek `statSync`
  (0,055 ms).

**Önbelleksiz tekrar:** `relay-watch` her olayda yeni süreç olduğu için hiçbir
modül içi önbellek olaylar arası yaşamıyor. Süreç içi tekrar eden okuma yok —
her fonksiyon kendi dosyasını bir kez okuyor.

### iz() / izSatiri() — debug açıkken

`_hook-debug.log` şu an **376.905 bayt, 1.090 satır**. `izKirp()` tavanı
`IZ_TAVAN = 512 KB`, aşınca son 1.000 satıra iniyor. Her yazma bir `appendFileSync`
+ bir `statSync`; kırpma yalnız tavan aşılınca. Debug **kapalıyken** `debugAcik()`
tek konfig okumasıyla çıkıyor, disk yazımı yok.

Ölçülen: debug açık ve kapalı arasındaki fark PostToolUse'da ölçüm gürültüsünün
içinde kaldı (< 1 ms). **`iz()` pahalı değil; pahalı olan ürettiği 377 KB'lık dosya.**

---

## 5. Şüpheli yerlerin doğrulaması

### 5.1 `relay-watch.js` 1.394 satır, her araç çağrısında çalışıyor — **doğrulandı**

`run()` içinde PostToolUse yolunda gerçekten çalışanlar:
`findRelay` → `kapsayici.kok` → `turDamga` → `kapsayici.izle` → `sozdizim` →
`mkdirSync` → `supur` → `saglikTara` → `debugAcik` → kimlik çözümü → tek JSON
oku/yaz.

Dosyanın 1.394 satırının büyük kısmı **PostToolUse yolunda hiç çalışmıyor**:
`acilis` (SessionStart), `hatirlat`/`turBasla` (UserPromptSubmit),
`turBitir`/`paketDenetle` (Stop), `oturumKapat` (SessionEnd),
`sikismaSonrasi` (PostCompact), `kesintiYaz` (StopFailure) — ölçüldüğü kadarıyla
bu bloklar yalnız ilgili olayda giriliyor.

Ancak **kod her olayda ayrıştırılıyor**: 53 KB kaynak, 2.787 kez.
`node --check` ölçümü 53 KB ile 63 bayt arasında yalnız 0,4 ms fark gösterdi,
yani ayrıştırma maliyeti oturum başına ≈0,5 saniyeden az. **Dosya boyutu
başlı başına ölçülebilir bir yük değil; yük, sürecin kendisi.**

### 5.2 `kapsayici.kok()` önbelleği — **etkisiz**

Ölçülenler:

- `kok()` **tüm kod tabanında tek yerden** çağrılıyor: `relay-watch.js:44`.
  Süreç başına **tam bir kez**.
- `_kokBellek` bir modül seviyesi `Map`. `relay-watch` her olayda yeni süreç
  olduğu için Map her seferinde boş doğuyor. **İsabet oranı 0.**
- Soğuk `kok()` maliyeti: kapsayıcı klasörde (16 alt dizin) **0,464 ms**,
  proje kökünde **0,101 ms**.
- Önbellekli çağrı: 0,002 ms — ama üretimde ikinci çağrı hiç olmuyor.

**Önbellek oturum başına 0 ms kazandırıyor.** `ortak.js` içindeki `_projeBellek`
için de aynısı geçerli: `kokSor()` içinde `projeMi` her seferinde farklı yolla
çağrılıyor, tek süreçte iki kez aynı anahtar sorulmuyor.

Not: Bunlar `oturum.js`/`tarama.js` gibi tek seferde çok çağrı yapan
betiklerde işe yarayabilir; kanca yolunda yaramıyor. Ölçtüğüm yol kanca yolu.

### 5.3 `sozdizim()` ayrı süreç açıyor — **doğrulandı, en büyük tek kalem**

Ölçülen: `PostToolUse · Write .js` = **74,6 ms**, `Write .md` = 39,5 ms.
**Fark = 35,1 ms** — tamamı `execFileSync(node --check)`.
`.json` yolunda süreç açılmıyor (`JSON.parse` içeride): 44,3 ms, fark 4,8 ms.

Sıklık: `live/*.json` içindeki `files[]` dizilerinden 108 benzersiz yazılan
dosya kaydı çıktı:

| Uzantı | Adet | Pay |
|---|---:|---:|
| `.md` | 54 | %50,0 |
| `.js` | 31 | %28,7 |
| `.py` | 11 | %10,2 |
| `.svg` | 9 | %8,3 |
| `.ps1` | 1 | %0,9 |
| `.sh` | 1 | %0,9 |
| `.json` | 1 | %0,9 |

`sozdizim` **%29,6**'sını denetliyor; ayrı süreç açtığı `.js/.cjs/.mjs` payı **%28,7**.

Hesap: oturum başına Write+Edit ≈ 1.181 × %22,4 = **265 olay**.
Bunun %28,7'si = **≈76 kez `node --check`**.
76 × 35,1 ms = **≈2,7 saniye/oturum**, 3 günlük iki oturumda ≈5,3 saniye.

Bu, `sozdizim`'in tek başına oturuma kattığı süre. Kancanın toplam 57,6 saniyesinin
%4,6'sı. Karşılığında bozuk JS bir sonraki araç çağrısından önce yakalanıyor.

**Uyarı:** yukarıdaki 108 kayıt *benzersiz dosya*, *yazma olayı* değil. Aynı `.js`
dosyasına tekrar tekrar yazılıyorsa gerçek sayı daha yüksek. Yazma olaylarının
uzantı dağılımını ölçemedim (§8).

### 5.4 `iz()` / `izSatiri()` — **bedelini ödüyor**

Debug kapalıyken tek konfig okuması, ölçülebilir yük yok.
Debug açıkken olay başına ek maliyet ölçüm gürültüsünün altında (< 1 ms);
`appendFileSync` 0,05 ms sınıfında. Ürettiği dosya 377 KB ve `izKirp` 512 KB
tavanıyla sınırlıyor. Bu ölçümdeki bütün frekans/dağılım rakamları bu günlükten
çıktı — **kendi maliyetinden fazlasını geri veriyor.**

### 5.5 `tarama.js` `premium.js`'i metin ayrıştırarak okuyor — **kırılgan, sayıyla**

`dugmeTablosu()` üç regex katmanı kullanıyor:

1. `/const DUGME = \{([\s\S]*?)\n\};/` — tam olarak `const DUGME = {` yazımına ve
   sütun 0'da `};` kapanışına bağlı.
2. `new RegExp('\\n  ' + p + ': \\{([\\s\\S]*?)\\n  \\}')` — profil bloğunun
   **tam iki boşluk** girintili olmasına bağlı.
3. `/^[ \t]*([a-z_]+)[ \t]*:[ \t]*'([^']*)'/gm` — değerlerin **tek tırnaklı**
   olmasına bağlı.

Kırılma noktası sayısı: **3 bağımsız biçim varsayımı**. Bunlardan herhangi biri
bozulursa `null` dönüyor ve çağıran duruyor (`tarama.js:474` "eşik tablosu
okunamadı" hatası) — sessizce yanlış değere düşmüyor.

Ölçülen davranış: `premium.js` içindeki `DUGME` tablosu 3 profil × 11 anahtar =
33 değer taşıyor ve şu an biome biçiminde; ayrıştırma çalışıyor
(`tarama.js normal --json` 68,4 ms'de tamamlanıyor, eşik hatası vermiyor).

`premium.js` kendisi de aynı biçim varsayımına dayanan bir regex ile
`SETTINGS.md` yazıyor (`premium.js:180`). Yani biçim sözleşmesi tek yerde değil,
**iki dosyada ayrı ayrı** kodlanmış.

Maliyet karşılaştırması: `require('./premium.js')` yerine metin ayrıştırma
kullanılıyor çünkü require yan etki üretiyor. Ölçüm: metin yolu okuma + 4 regex =
tek `readFileSync` (0,057 ms) + regex, toplam **1 ms'nin altında**.
**Hız açısından bedelini ödüyor; risk biçim varsayımlarında.**

### 5.6 `test/run.js` 4.712 satır tek dosya — **ölçüldü**

| Ölçüm | Değer |
|---|---:|
| Test sayısı | 271 (271 geçti, 0 kaldı) |
| Toplam süre | **25,89 s** |
| `spawnSync` çağrısı | **571** |
| Süreçlerde geçen | **24,94 s (%96)** |
| Süreç başına ortalama | 43,7 ms |
| Süreç açmayan test | 42 tane, toplam **0,07 s** |
| Süreç açan test | 229 tane, toplam **25,82 s** |

**Koşu süresinin %96'sı süreç açmak.** 42 test hiç süreç açmıyor ve hepsi
birlikte 70 milisaniye sürüyor — yani testlerin %15,5'i sürenin %0,3'ünü yiyor.

En yavaş 20 test:

| ms | süreç | Test |
|---:|---:|---|
| 786 | 21 | eski çağrılar ve eski konfig premium/normal olarak okunur |
| 729 | 20 | yazma atomik: yarım JSON okunmaz |
| 615 | 14 | damga tazeyken ikinci kontrol yapılmaz |
| 536 | 13 | damga eskiyince yeniden bakılır |
| 510 | 12 | bayraksız çalıştırmada insan okur satır çıkar |
| 496 | 14 | uzak en yüksek etiketi seçer, v önekini kırpar |
| 487 | 12 | güncelken açılış satırı çıkmaz |
| 485 | 12 | `--json` çıktısı ayrıştırılabilir |
| 478 | 12 | yeni sürüm varken açılış satırı çıkar |
| 469 | 12 | kurulu kayıt okunamayınca açılış sessiz kalır |
| 449 | 11 | uzak erişilemeyen depoda null döner, çökmez |
| 419 | 2 | rc açılış sorularını kapatır, gelişmiş kip geri açar |
| 381 | 10 | pazar deposu yokken açılış sessiz kalır ve beklemez |
| 364 | 7 | worktree cwd'sinde iki kanca aynı röle kökünü görür |
| 341 | 9 | üç profil de uygulanır, durum yürürlükteki profili söyler |
| 336 | 6 | genel kök worktree oturumunda alt klasöre kaymaz |
| 331 | 6 | argümansız yükle çağıran oturumun kaydını açar |
| 329 | 8 | paralel hook süreçleri birbirinin kaydını silmez |
| 307 | 6 | üç profil üç farklı kapsam kipi uygular |
| 273 | 5 | eco kaydı `--tam` ile açılır, ham kaybolunca anlaşılır hata verir |

Süre neredeyse tam olarak süreç sayısıyla orantılı: 571 süreç × 43,7 ms = 24,9 s.
**Yavaş test yok — pahalı olan `calistir()` yardımcısının her çağrıda
`spawnSync` açması.**

---

## 6. Fonksiyon sınıflandırması

Kapsamdaki 16 kaynak dosyada **299 fonksiyon** tanımlı.

Statik çağrı analizi (docs/ ve worktrees hariç, 19 `.js` dosyası taranarak):

| Sınıf | Adet |
|---|---:|
| Hiçbir `.js` dosyasından çağrılmayan | **0** |
| Yalnız `test/run.js` çağırıyor | **1** (`dil.js :: s`) |
| Tek çağrı noktası olan | 139 |
| İki veya daha çok çağrı noktası olan | 159 |

### Taşıyıcı

Kaldırılırsa base'in bir işlevi gider. Örnekler ve ölçülen yükleri:

| Fonksiyon | Dosya | Yük |
|---|---|---|
| `run` | relay-watch | tüm kanca akışının girişi |
| `findRelay` / `roleKoku` | relay-watch / ortak | röle kökü çözümü, olay başına 1 kez |
| `sozdizim` | relay-watch | 35,1 ms × ≈76/oturum = 2,7 s |
| `saglikTara` | relay-watch | 10,9 ms × ≈180/oturum = 2,0 s |
| `calisanEkle` / `calisanKapat` | relay-watch | ajan sayacı, `_running.json` |
| `dugmeTablosu` | tarama | profil eşiği; başarısız olursa `/scan` durur |
| `dizinBirlestir` / `tasi` | kapsayici | ajan hafızasının doğru projeye taşınması |
| `read` / `yaz` | ortak | repo genelinde 76 / 516 kullanım |
| `ceviri` (`s`) | dil | tüm kullanıcıya görünen metin |

`ortak.js` dışa açık 15 sembolünün repo genelindeki kullanım sayısı:

| Sembol | Kullanım |
|---|---:|
| `yaz` | 516 |
| `read` | 76 |
| `ev` | 31 |
| `konfigKok` | 23 |
| `norm` | 21 |
| `safe` | 15 |
| `roleKoku` | 10 |
| `projeMi` | 10 |
| `varMi` | 6 |
| `gitSor` | 5 |
| `izKoku` | 5 |
| `transkriptDizini` | 5 |
| `gitBilgisi` | 3 |
| `transkriptKok` | 2 |
| `PROJE_IZI` | 2 |

### Konfor

Kaldırılsa base çalışmaya devam eder:

| Fonksiyon | Dosya | Ölçülen yük |
|---|---|---|
| `iz` / `izSatiri` / `izKirp` | relay-watch | debug kapalıyken ~0; açıkken < 1 ms/olay |
| `debugBildir` | relay-watch | yalnız debug açıkken |
| `dongu` | relay-watch | ajan döngü uyarısı, tek karşılaştırma |
| `guncellemeBak` | relay-watch | SessionStart'ta, damgayla kısılı |
| `turOzetiBas` / `sureMetni` | relay-watch | Stop'ta tur özeti |
| `harita.js` tamamı | harita | komutla, 33,0 ms tek koşu |
| `platform-denetim.js` tamamı | platform-denetim | komutla, 27,6 ms tek koşu |
| `uicheckup.js` tamamı | uicheckup | komutla, 42,6 ms tek koşu |

### Ölü ya da bedelini ödemeyen

**Ölü fonksiyon: 0.** 299 fonksiyonun hepsinin en az bir çağrı noktası var.

Bedelini ödemeyenler — her biri rakamla:

**1. `kapsayici.js :: _kokBellek` (önbellek `Map`)**
Kanca yolunda isabet oranı **0**. `kok()` tüm kod tabanında tek yerden
(`relay-watch.js:44`), süreç başına tam bir kez çağrılıyor; `relay-watch` her
olayda yeni süreç. Kazandırdığı: **0 ms/oturum**. Getirdiği: bir `Map` ayırma,
bir `has`, bir `set` — ölçülemeyecek kadar küçük ama **kazancı da sıfır**.
Aynı gerekçe `ortak.js :: _projeBellek` için de geçerli: `kokSor()` içinde
`projeMi` her çağrıda farklı yolla sorulduğundan tek süreçte isabet yok.

**2. `ortak.js :: gitSor` — statusline yolunda**
`statusline.js` her UI yenilemesinde çalışıyor ve **65,6 ms** sürüyor
(min 61,6, max 69,8). Boş node tabanı 22,0 ms; yani **43,6 ms kendi işi**.
Bunun içinde `execSync('git rev-parse --abbrev-ref HEAD')` tek başına **13,5 ms**,
`gitSor()` (2–3 git süreci) **24,2 ms**. Statusline saniyede birkaç kez
yenileniyorsa dakikada **birkaç saniye** git sürecine gidiyor.
Statusline'ın gerçek yenilenme sıklığını ölçemedim (§8), bu yüzden toplam
rakam veremiyorum — ama **tek çağrının %57'si git süreci açmak**.

**3. `test/run.js :: calistir` — süreç başına 43,7 ms**
571 çağrı, 24,94 saniye, koşunun **%96'sı**. Testlerin kendi mantığı 0,07 s
(42 test) + geri kalan 229 testin süreç dışı payı ≈0,9 s. Yani **testlerin
gerçek iş yükü ≈1 saniye, kabuk maliyeti ≈25 saniye — 25 kat.**

**4. `relay-watch.js` PostToolUse yolunda `supur()` + `saglikTara()` damga
kontrolü**
İkisi de her PostToolUse'ta önce bir `statSync` yapıyor (0,055 ms × 2 = 0,11 ms).
Oturum başına 1.181 × 0,11 ms = **0,13 saniye**. Karşılığında `saglikTara`'nın
10,9 ms'lik tam taramasını dakikada bire indiriyor — **oturum başına ≈10,9 saniye
kazandırıyor. Fazlasıyla bedelini ödüyor** (§4).

**5. Boş süreç tabanı — en büyük tek kalem**
Kanca başına 22–26,3 ms, oturum başına 2.879 kanca çağrısı ×
ortalama 26,3 ms = **≈33,4 saniye/oturum hiçbir iş yapılmadan.**
Kanca toplamının **%58'i.** Bu tek bir fonksiyonun değil, mimarinin maliyeti:
her olay ayrı `node` süreci.

---

## 7. Tekrar eden kod

Statik olarak aynı işi yapan gövdeler:

| Kalıp | Nerede | Not |
|---|---|---|
| `dosyalar(d)` = `readdirSync` try/catch sarmalı | `relay-watch.js:1352`, `kapsayici.js` (aynı ad, aynı gövde), `platform-denetim.js`, `tarama.js:64` | 4 dosyada birbirinin aynısı; biri `withFileTypes` kullanıyor, üçü kullanmıyor |
| `durumOku` / `read` — JSON oku, hata yut | `kapsayici.js:durumOku`, `ortak.js:read` | `ortak.js` zaten `read` dışa açıyor; `kapsayici` kendi kopyasını taşıyor |
| `DUGME` biçim varsayımı | `tarama.js:dugmeTablosu`, `premium.js:180` | aynı sözleşme iki ayrı regex ile iki dosyada kodlanmış (§5.5) |
| `metin(f)` / `oku(p)` — dosya oku, boşsa `''`/`null` | `relay-watch.js:1359`, `tarama.js:~55`, `surum.js` | üç ayrı gövde, üç farklı hata dönüşü (`''`, `null`) |

Kullanılmayan sabit bulunamadı; taranan sabitlerin hepsinin en az bir kullanımı var.

---

## 8. Ölçemediklerim

1. **Statusline'ın gerçek yenilenme sıklığı.** `statusline.js` tek koşusu 65,6 ms
   olarak ölçüldü, ama Claude Code'un onu saniyede kaç kez çağırdığına dair veri
   `_hook-debug.json`'da yok — statusline bir kanca olayı üretmiyor. Oturum
   toplamı bu yüzden hesaplanamadı. **§6'daki 2. maddenin toplam etkisi bilinmiyor.**
2. **Yazma olaylarının uzantı dağılımı.** `live/*.json` içindeki `files[]` dizileri
   *benzersiz dosya* tutuyor, *yazma olayı* değil. `sozdizim`'in gerçek tetiklenme
   sayısı (§5.3'teki ≈76) bu yüzden **alt sınır**; aynı `.js` dosyasına tekrar
   yazılıyorsa gerçek sayı daha yüksek.
3. **`_hook-debug.log` tam kapsam değil.** Günlükte `Read` yalnız 2 kez görünüyor
   ama PostToolUse sayacı 2.362'de. Günlük 512 KB tavanıyla kırpıldığı için
   (`IZ_TAVAN`) 1.090 satırlık pencere son dilimi gösteriyor; araç dağılımı bu
   pencereden çıkarıldı ve tüm oturumu temsil etmeyebilir.
4. **`Stop` / `UserPromptSubmit` / `SessionStart` / `SessionEnd` / `PostCompact`
   frekansları.** `_hook-debug.json` sayacı bu beş olayı ayrı tutmuyor; §3.5'teki
   "diğer olaylar 213 adet" rakamı sayaçtaki PostToolUse dışı olayların toplamı,
   bu beşi içermiyor. Gerçek kanca toplamı ölçülenden **yüksek**.
5. **Ajanlı ve ajansız olayların süre farkı.** Ajanlı PostToolUse 40,7 ms,
   ajansız 38,6 ms ölçüldü — 2,1 ms fark ölçüm gürültüsüne yakın, ayırt edemedim.
6. **Bellek kullanımı.** Hiçbir dosya için RSS/heap ölçmedim; yalnız süre ve
   dosya sistemi çağrısı ölçtüm.
7. **Gerçek disk gecikmesi.** Ölçümler SSD üzerinde ve dosya sistemi önbelleği
   ısınmış halde yapıldı. Soğuk disk rakamları daha yüksek olur.

---

## 9. Kapsam dışı not

`.claude/relay/LOG.md` içinde çözülmemiş git çakışma işaretleri duruyor
(`<<<<<<< HEAD`, `=======`, `>>>>>>> worktree-agent-abfa76c4461ab35fa`,
2. ve 3. satırlar). Bu ölçümün konusu değil, dokunmadım.
