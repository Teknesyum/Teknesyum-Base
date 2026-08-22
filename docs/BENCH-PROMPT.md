# Bench koşusu — dört durum, aynı görev

Bu dosya bir görev paketidir. Her durum için **ayrı ve temiz** bir oturumda açılır;
o oturuma yalnızca şu satır yapıştırılır:

```
docs/BENCH-PROMPT.md oku ve uygula. Durum: <yalin|eco|normal|premium>
```

Dördünü aynı oturumda peş peşe koşma — sonrakiler bağlam taşır ve avantajlı başlar,
ölçüm bozulur.

**Profiller sıralı koşulmalı, paralel değil.** İlk turda üçü paralel koşuldu ve
`/teknesyum:premium` makine geneline yazdığı için birbirlerini bozdular: eco penceresi profili
değiştirince premium koşusu onu gördü. Ölçülen koşu artık "baştan sona premium" değildi.

Paralel koşmak isteniyorsa profil ortam değişkeniyle ayrılmalı — `TEKNESYUM_PREMIUM=1|0`
tek oturumluk ezer ve makine geneline dokunmaz. Ama `eco` için ortam değişkeni yok, o
yüzden en güvenlisi sıra.

**Yalın koşu her hâlükârda tek başınadır**, ayrı pencerelerde. `yalin` koşamaz: eklentiyi
kapatmak makine geneli bir işlem, o sırada başka Teknesyum oturumu açılamaz. Sıra:
önce üç profil paralel, sonra yalın tek başına.

**Koşu 45 dakikayla sınırlıdır.** İş bitmek zorunda değil — ölçülen şey "kim bitirdi"
değil, **aynı sürede kim ne kadar ilerledi**. Süre dolunca elindekini teslim et.

**Dört durum:**

| Durum | Ne | Neden ölçülüyor |
|---|---|---|
| `yalin` | Base **hiç yok** — eklenti kapalı, düz Claude Code | Taban çizgisi. Base'in kattığı fark ancak buna karşı görülür |
| `eco` | Base açık, eco profili | Token tasarrufu önceliği |
| `normal` | Base açık, normal profil | Varsayılan |
| `premium` | Base açık, premium profil | Hız ve derinlik önceliği |

`yalin` en önemlisi: onsuz elde yalnız "base'in üç ayarı" karşılaştırması olur, "base'e
değer mi" sorusunun cevabı olmaz.

---

## Kurulum

1. `Desktop/Projeler/Bench-Chess960-<durum>` klasörünü aç, git deposu yap.

   **Aynı durum ikinci kez koşuluyorsa** klasör adına tur numarası ekle:
   `Bench-Chess960-premium-2`. Eski koşunun klasörüne dokunma — iki tur karşılaştırılacak
   ve varyansı görmenin tek yolu ikisinin de durması.

   Komutta durum adı yine sade yazılır (`Durum: premium`); tur numarasını klasöre sen
   eklersin ve `BENCH.md`'nin ilk satırına kaçıncı tur olduğunu yaz.

2. **`yalin` durumu için:** eklentiyi kapat ve doğrula.

   ```
   claude plugin disable teknesyum@teknesyum
   ```

   Sonra Claude Code'u yeniden başlat — eklenti ancak o zaman düşer. Yeni oturumda
   `/teknesyum:premium` komutu **bulunamamalı**; bulunuyorsa eklenti hâlâ yüklü demektir, dur ve
   söyle. Koşu bitince `claude plugin enable teknesyum@teknesyum` ile geri aç.

   `yalin` oturumu başka bir klasörde açılacağı için bu dosyayı göreli yolla bulamaz;
   komutta **mutlak yol** verilir. Base kapalı olduğundan profil, ölçü satırı ve tur
   özeti yoktur — model dosyadaki **Görev** ve **Ölçüm kuralları** bölümlerini okur,
   base'e özgü maddeleri kendiliğinden atlar.

   **Eklentiyi kapatmak makine geneli bir işlemdir.** Yalın koşu sürerken başka bir
   Teknesyum oturumu açma; koşu bitmeden eklentiyi geri açma.

3. **Üç profil için:** profili uygula ve doğrula — `/teknesyum:premium <durum>` ardından
   `/teknesyum:premium durum`. Yürürlükteki profil ile klasör adı tutmuyorsa **dur ve söyle**;
   yanlış profille koşulan bench ölçüm değil gürültüdür.

4. **Ana oturumun modeli ve eforu dört koşuda da aynı: `opus` + `high`.** Bunu koşuya
   başlamadan ayarla ve `BENCH.md`'ye yaz.

   Profil yalnız **ajanların** modelini değiştirir; ana oturumunkini değiştirmez. İkisi
   birden değişirse çıkan farkın base'den mi modelden mi geldiği ayrılamaz ve ölçüm
   hiçbir şey söylemez. `yalin` ile `premium` karşılaştırması ancak ana model sabitken
   base'in katkısını izole eder.

   Bilinen sınır, rapora yazılacak: eco felsefesi ana oturumun da ucuz olmasını ister,
   biz onu opus'ta koşuyoruz. Ölçülen şey "eco profilinin katkısı", "eco kullanıcısının
   gerçek deneyimi" değil.

5. `BENCH.md` dosyasına başlangıç zamanını ve (varsa) `/teknesyum:premium durum` çıktısını yaz.

## Görev

Chess960 (Fischer Random) için bir hamle üreteci. Dil TypeScript, dış bağımlılık yok.

**Süre tavanı 45 dakika.** Saati koşu başında not et. Süre dolduğunda ne durumdaysan
commit at ve teslim et — yarım iş geçerli bir sonuçtur, gecikmiş iş değildir. Sonuna
kadar çalışıp tavanı aşmak ölçümü bozar.

Sıralama senin kararın. Neyi önce yaptığın da ölçümün parçası: 45 dakikada perft(2)'ye
kadar doğru çalışan bir üreteç, perft(5) hedefleyip hiçbir şey çalıştıramamaktan iyidir.

- 960 başlangıç dizilişinin hepsi üretilebilmeli, numaralandırma standart olmalı.
- Bütün kurallar: rok (Chess960 kuralları), en passant, terfi, şah, şahmat, pat.
- `perft(fen, derinlik)` — verilen konumdan verilen derinlikte yasal hamle sayısını döner.
- CLI: `node dist/perft.js "<fen>" <derinlik>` tek sayı basar.

Şartname burada bitiyor. Belirsiz kalan her yerde kendi kararını ver ve kararı
`docs/PLAN.md`'ye yaz — bench'in ölçtüğü şeylerden biri de belirsizlikle baş etmen.

## Ölçüm kuralları

- **Kabul testlerini sen yazmıyorsun ve göremiyorsun.** Kendi testlerini yaz; asıl
  değerlendirme dışarıdan, yayınlanmış perft referanslarıyla yapılacak.
- Ön araştırma profilin gerektirdiği kadar yapılır, ama tarama için **en fazla 20 dakika**
  harca. Süre dolduysa elindekiyle devam et ve bunu `BENCH.md`'ye yaz.
- Her turun sonundaki `Total Süre` ve `Tahmini Token` satırlarını `BENCH.md`'ye biriktir.
  **`yalin` durumunda bu satırlar yok** — süreyi saatle, token'ı `/cost` ya da oturum
  sonundaki kullanım bilgisinden al ve nereden aldığını yaz.

## Bitirme

Commit at ve tek blok halinde ver:

```
Süre: <toplam, tavana ulaşıldı mı>
Ajan: <kaç tane, hangi modeller>
Taranan depo: <kaç>
Kod: <dosya sayısı> dosya, <satır sayısı> satır
Kendi testlerim: <kaç/kaç>
En derin çalışan perft: <derinlik, hangi konumda>
Bildiğim eksikler: <dürüst liste>
```

`En derin çalışan perft` bench'in ana skorudur: hangi derinliğe kadar **kendi ürettiğin
sayı doğru**. Emin değilsen o derinliği yazma — doğrulanmamış derinlik sıfır sayılır.

Eksik bırakmak serbest, eksik olduğunu gizlemek değil. Son satır boş çıkıyorsa
muhtemelen yeterince bakmamışsındır.

---

## Değerlendirme (koşulardan sonra, üçü de bitince)

Üç klasör hazır olduğunda karşılaştırma tablosu üretilir:

| Ölçüt | Nereden |
|---|---|
| İlerleme | 45 dakikada ulaşılan en derin doğru perft |
| Token | `BENCH.md` toplamı |
| Doğruluk | perft referanslarıyla karşılaştırma |
| Bug yoğunluğu | başarısız perft / bin satır |
| Verimlilik | ulaşılan derinlik ÷ token |
| Ajan maliyeti | açılan ajan sayısı ve modelleri |

Süre artık bir ölçüt değil, sabit. Değişken olan ne kadar ilerlendiği.

Asıl kıyas `yalin` sütununa karşıdır: üç profil birbirinden ne kadar ayrışırsa ayrışsın,
base'in kattığı değer ancak base'siz koşuyla karşılaştırıldığında görünür. Base bir
profili yalın koşudan kötü çıkarsa bu da bir bulgudur ve raporda öyle yazılır.

**Tek koşu kanıt değildir.** Aynı profil iki kez koşulduğunda farklı sonuç verir; üç
profili birer kez koşup çıkan tablo eğilim gösterir, kanıt olmaz. İki tur koşulursa
ölçüm ciddiye alınabilir.
