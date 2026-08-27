# Bench yöntemi — değişmeyen standart

Bu dosya **görevden bağımsızdır**. Hangi iş ölçülürse ölçülsün kurulum, izolasyon ve
ölçüm burada yazdığı gibi yapılır. Görevin kendisi ayrı bir pakettedir
(`trash/bench/BENCH-PROMPT.md` Chess960 için).

İlk turda bu standart yoktu ve dört koşunun ikisi kullanılamadı. Buradaki her madde bir
koşuyu bozan somut bir hatadan geliyor; hiçbiri temkin değil.

---

## 1. Sabitler — dört koşuda da aynı

| | Değer | Neden sabit |
|---|---|---|
| Ana oturum modeli | **opus** | Profil yalnız ajanların modelini değiştirir; ana model de değişirse farkın nereden geldiği ayrılamaz |
| Ana oturum eforu | **medium** | Aynı gerekçe |
| Süre tavanı | **45 dakika** | Ölçülen "kim bitirdi" değil, aynı sürede kim ne kadar ilerledi |
| Ön araştırma tavanı | **20 dakika** | Profilin depo sayısı değişir, süre değişmez |

Bilinen sınır, her rapora yazılır: eco felsefesi ana oturumun da ucuz olmasını ister, biz
onu opus'ta koşuyoruz. Ölçülen şey **eco profilinin katkısı**, eco kullanıcısının gerçek
deneyimi değil.

---

## 2. Durumlar

| Durum | Ne | Neden |
|---|---|---|
| `yalin` | Base **hiç yok** — eklenti kapalı, düz Claude Code | Taban çizgisi |
| `eco` | Base açık, eco profili | Token tasarrufu önceliği |
| `normal` | Base açık, normal profil | Varsayılan |
| `premium` | Base açık, premium profil | Hız ve derinlik önceliği |

`yalin` en önemlisi. Onsuz elde yalnız "base'in üç ayarı" karşılaştırması olur, "base'e
değer mi" sorusunun cevabı olmaz.

---

## 3. Klasör ve oturum — transkriptin bulunabilmesi için

```
Desktop/Projeler/Bench-<gorev>-<durum>[-<tur>]
```

**Oturum bu klasörün kendisinde açılır**, üst klasörde değil. İlk turda koşular
`Desktop/Projeler` üst klasöründe açıldı; transkriptler `Bench-*` adıyla değil üst
klasörün havuzuna düştü ve hangisinin hangi koşu olduğu elle eşlendi. Bir koşunun
transkripti kaybolursa o koşu ölçülemez.

Aynı durum ikinci kez koşuluyorsa klasör adına tur numarası eklenir
(`Bench-Chess960-premium-2`). **Eski koşunun klasörüne dokunulmaz** — varyansı görmenin
tek yolu ikisinin de durması.

Klasör git deposu yapılır. Koşu bitince transkript dosyası klasörün içine kopyalanır:

```powershell
Copy-Item "$env:USERPROFILE\.claude\projects\<klasor-adi>\*.jsonl" .\docs\transkript\
```

`yalin` koşusu için bu **zorunludur**: eklenti kapalıyken bile transkript yazılır, ama
koşu başka makinede yapılırsa kayıt oraya düşer. İlk turda `yalin` böyle kayboldu ve
karşılaştırma tek taraflı kaldı.

---

## 4. İzolasyon — koşular birbirini bozmasın

**Koşular sıralıdır. Asla paralel değil.**

`/teknesyum:premium` üç yeri birden makine geneline yazar: ajan frontmatter'ı, relay
düğmeleri, `~/.claude/teknesyum.json`. İlk turda üç profil paralel başlatıldı ve eco
penceresi profili değiştirince premium koşusu onu gördü.

Bir koşu sürerken **başka hiçbir Teknesyum oturumu açık olmaz** — bench penceresi hariç
her şey kapalı. Bu, `yalin` için de geçerli: eklentiyi kapatmak makine geneli bir işlemdir.

### Profil ilk istemden önce uygulanır

En kritik madde. `UserPromptSubmit` kancası **istem başına bir kez** çalışır ve profil
bloğunu o an bağlama yazar. Profil o istemden sonra değişirse bağlamdaki metin eski
profilde kalır.

İlk turda eco koşusu tam olarak bunu yaşadı: `/teknesyum:premium eco` görev isteminden
sonra çalıştı ve bağlam 72 tur boyunca premium metnini taşıdı — *"yirmi paralel ajana
kadar çıkabilirsin, paralel açmak bu modda varsayılandır."* **O koşu eco'yu hiç ölçmedi.**

Doğru sıra:

1. Bench penceresini aç
2. `/teknesyum:premium <durum>`
3. `/teknesyum:premium durum` — çıktı klasör adıyla tutmuyorsa **dur ve söyle**
4. Pencereyi yeniden başlat (profil bloğu temiz bağlama yazılsın)
5. Görev istemini gönder

`yalin` için 2–4 yerine: `claude plugin disable teknesyum@teknesyum`, yeniden başlat,
`/teknesyum:premium` komutunun **bulunamadığını** doğrula. Koşu bitince
`claude plugin enable teknesyum@teknesyum`.

---

## 5. Token nereden okunur

**Tur makbuzundaki `Tahmini Token` satırı ölçüm değildir.** Base'in kendi tahminidir ve
alt ajanları sayar; harness'ın bütçe sayacı saymaz. Bir koşuda ikisi 313.500'e karşı
171.114 çıktı — aynı adla iki farklı büyüklük.

Rapora giren sayı **transkriptten** okunur:

```bash
node scripts/olcum/taban.js <transkript.jsonl>
```

Dört kalem ayrı ayrı yazılır: `input_tokens`, `cache_creation_input_tokens`,
`cache_read_input_tokens`, `output_tokens`. Tek bir toplam yazmak yasak — hangi kalemin
büyüdüğü sonucun kendisidir.

`yalin` koşusunda base yok, dolayısıyla tur makbuzu da yok; sayı yine transkriptten gelir.

---

## 6. Bir koşuyu geçersiz kılan şeyler

Aşağıdakilerden biri olduysa koşu **atılır**, düzeltilmez:

- Profil ilk istemden sonra uygulandı
- Koşu sırasında başka bir Teknesyum oturumu açıktı
- `/teknesyum:premium durum` çıktısı klasör adıyla tutmuyor
- Ana oturumun modeli veya eforu öteki koşulardan farklı
- Transkript bulunamıyor
- Süre tavanı aşıldı

Geçersiz koşu rapora **geçersiz olarak** yazılır, sessizce silinmez. İlk turda bu
yapılmadığı için iki koşu üç hafta boyunca geçerli sanıldı.

---

## 7. Değerlendirme

Bütün koşular bitince tablo üretilir. Sütun başına tek kaynak:

| Ölçüt | Nereden |
|---|---|
| İlerleme | Tavana kadar ulaşılan en derin doğrulanmış sonuç |
| Token | Transkript `usage` toplamları, dört kalem ayrı |
| Doğruluk | Dış referansla karşılaştırma — koşunun kendi testiyle değil |
| Ajan maliyeti | Açılan ajan sayısı ve modelleri, transkriptten |
| Denetim bulgusu | Denetçinin bulduğu, doğruluk testinin göremediği kusurlar |

Son satır ilk turun en sağlam bulgusuydu ve iki bağımsız koşuda tekrarlandı: **denetçi
açan koşular, doğruluk testinin göremediği kusurları buldu; açmayanlar bulamadı.**
Ana skor (en derin doğru sonuç) hiçbir profili ayırt etmemişti.

**Tek koşu kanıt değildir.** Aynı profil iki kez koşulduğunda ayrışır — ilk turda premium
iki turda 2825 ve 1411 satır yazdı. Bir profil en az iki kez koşulmadan tablo eğilim
gösterir, kanıt olmaz.

---

## 8. Görevin taşıması gereken boyut

45 dakikada tek modelin bitirebildiği bir iş, çok ajanlı bir sistemi sınamaz. İlk turun
görevi 750 satırlık bir üreteçti ve yalın koşu onu 37 dakikada bitirdi; base'li koşular
sözleşme yazıp denetim turu koşarak kendi ağırlıklarını taşıdılar.

Base'in tasarlandığı yer bu değil: **bağlamın dolduğu, işin bölünmesi gereken, tek
oturumun yetmediği işler.** Bir sonraki görev bu eşiği geçmeli — yoksa ölçüm base'i değil,
base'in gereksiz olduğu bir durumu ölçer.
