# Ölçüm Ö4 — eco ile base'siz koşu arasındaki farkın kalemlenmesi

Ölçüm tarihi: 2026-08-22 · Betik: `scripts/olcum/taban.js` · Salt ölçüm, hiçbir dosya değiştirilmedi.

**Sonuç önden: kapı geçilemedi.** Farkın kalemlenebilen kısmı **%10,9**. Eşik %80'di.
Base'in eco koşusunda bağlama soktuğu her şeyin toplamı **4.826 token** — aranan
~45.000'in onda biri. Hipotez ("fark base'in enjeksiyonlarından geliyor") **yanlış**.

---

## 1. Hangi transkriptler ölçüldü

| koşu | transkript | doğrulama |
|---|---|---|
| **eco** | `~/.claude/projects/C--Users-Administrator-Desktop-Projeler/b3e59f34-1c41-497f-bc8a-b50f2c800a9d.jsonl` | İlk kullanıcı istemi `docs/BENCH-PROMPT.md oku ve uygula. Durum: eco`; başlangıç `2026-08-22T12:58:54Z` = yerel 15:58:54, `BENCH.md`'deki 15:59:32 ile örtüşüyor; süre 29dk29sn, `BENCH.md`'deki ~27dk22sn ölçü satırıyla örtüşüyor; Stop hook'unun yazdığı satır transkriptin içinde birebir duruyor: `Tahmini Token: ~157709` |
| **normal** | `71b22475-173b-479a-8655-5e4824915497.jsonl` | `Durum: normal`, aynı dakikada başladı — kontrol grubu olarak kullanıldı |
| **premium** | `2cfc9426-784e-44b5-a1e0-230da0bd7845.jsonl` | `Durum: premium`, 13 dakikada kesildi — kullanılmadı |
| **yalin** | **bulunamadı** | `~/.claude` altında `Bench-Chess960-yalin` dizgisini içeren tek dosya yok; 16:30–17:07 yerel penceresinde hiçbir proje klasöründe transkript yok; `.claudex` bir profil klasörü, oturum tutmuyor. Koşu başka makinede yapılmış. |

**Bu yüzden karşılaştırma tek taraflı yapıldı.** `yalin` tarafının taban maliyeti
ölçülemedi; base'siz yeni bir oturum da açılmadı (görev salt ölçüm). Kalemleme yalnız
**eco tarafından** yapıldı: "base bu koşuda bağlama ne soktu" sorusu tam olarak
cevaplandı, "yalın tarafta bunların kaçı zaten vardı" sorusu cevaplanmadı. Aşağıdaki
yüzdeler bu yüzden base'in payını **olduğundan büyük** gösterir, küçük değil — kapı
kararını zayıflatmaz, güçlendirir.

---

## 2. Ölçülen fark

| büyüklük | değer | kaynak |
|---|---:|---|
| eco — Stop hook'unun yazdığı tahmin | 157.709 | transkript, planın kullandığı sayı |
| eco — harness bütçe sayacı (15.000.000 − 14.839.714) | **160.286** | transkript, doğrudan ölçüldü |
| yalin — harness bütçe sayacı | 113.257 | `BENCH.md`, **doğrulanamadı** |
| **fark (planın sayılarıyla)** | **44.452** | 157.709 − 113.257 |
| fark (ölçülen sayacla) | 47.029 | 160.286 − 113.257 |

Planın "~45.000" rakamı tutuyor. Aşağıdaki yüzdeler **44.452** üzerinden hesaplandı.

### Bir uyarı: bütçe sayacının formülü çözülemedi

eco'nun ham `usage` alanları toplamı (`input + cache_creation + output`) **190.151**,
bütçe sayacının harcadığı ise **160.286**. Sayaç ham toplamdan küçük, yani
`cache_read`'i 1× saymıyor; ama basit bir çarpanla da örtüşmüyor (aynı formül `normal`
ve `premium` koşularında farklı oranlar veriyor). Sayacın formülü **ölçemedim**.
Kalemler bu yüzden ham token biriminde verildi; eco için ham/sayaç oranı 1,19'dur, yani
kalemleri sayaç birimine çevirmek base'in payını 4.826 → ~4.060'a, %10,9 → %9,1'e düşürür.
Her iki okumada da kapı geçilmiyor.

---

## 3. Kalem kalem

| # | kalem | token | farkın %'si |
|---|---|---:|---:|
| 1 | Sistem promptu şişmesi (base payı) | 2.305 | 5,2 |
| 2 | `relay/SKILL.md` yüklemesi | **0** | 0,0 |
| 3 | Hook enjeksiyonu (tur içi, tekrar eden) | 2.429 | 5,5 |
| 4 | Ölçü satırı / tur makbuzu | 92 | 0,2 |
| 5 | Ajan açma maliyeti | **0** | 0,0 |
| | **base'e yazılabilen toplam** | **4.826** | **10,9** |
| 6 | **Geriye kalan — base'e yazılamayan** | **39.626** | **89,1** |

### Kalem 1 — sistem promptu şişmesi: 2.305 token

Base'in kalıcı olarak sistem promptunda tuttuğu her şey, tur 1'de bir kez
`cache_creation` olarak yazılıyor:

| parça | base payı | toplam blok | base oranı |
|---|---:|---:|---:|
| skill listesi (`teknesyum:*`, `tani`, `graphify`) | 19 satır · 2.551 karakter · **709 token** | 43 satır · 13.827 karakter | %18 |
| ajan listesi (`teknesyum:*`) | 7 satır · 2.261 karakter · **628 token** | 13 satır · 4.725 karakter | %48 |
| `SessionStart` systemMessage | 501 karakter · **139 token** | — | %100 |
| `UserPromptSubmit` profil bloğu | 2.984 karakter · **829 token** | — | %100 |

**Her turda cache'ten okunuyor mu, yeniden mi yazılıyor?** Yeniden yazılmıyor.
Bir kez `cache_creation` olarak ödendi, sonraki 71 turda `cache_read` olarak geldi:
2.305 × 72 = **165.960 cache_read token**, eco'nun toplam 8.713.025 cache okumasının
**%1,9'u**. Cache okumasının bütçe sayacına nasıl yansıdığı çözülemediği için bu rakam
kaleme eklenmedi; 0,1× çarpanıyla ~16.600 token-eşdeğeri eder, eklense bile toplam
%48'e çıkar, %80'e ulaşmaz.

### Kalem 2 — relay yüklemesi: 0 token

Koşuda `teknesyum:relay` **hiç çağrılmadı**. Tek `Skill` çağrısı `teknesyum:premium`.
Planın en pahalı sandığı kalem sıfır çıktı.

### Kalem 3 — hook enjeksiyonu: 2.429 token

eco koşusunda hangi hook ne yazdı:

| hook | kez | karakter | ≈token | ne yazdı |
|---|---:|---:|---:|---|
| `PreToolUse:Bash` | 23 | 8.586 | **2.385** | RTK otomatik komut yeniden yazımı — her Bash çağrısında `updatedInput` JSON'u bağlama giriyor |
| `PostToolUseFailure:Bash` | 2 | 159 | 44 | `Teknesyum ▸ Debug ▸ Bash aracı hata verdi` |
| `Stop` | 2 | 330 | 92 | ölçü satırı (kalem 4) |
| `SessionStart:startup` | 2 | 501 | 139 | profil özeti (kalem 1'de sayıldı) |
| `UserPromptSubmit` | **1** | 2.984 | 829 | profil davranış bloğu (kalem 1'de sayıldı) |

`SessionStart` **oturumda iki kez**, `UserPromptSubmit` **bir kez** çalıştı — her turda
değil. Bunlar bağlama bir kez girip orada duruyor. Tur başına tekrarlanan tek base
hook'u `PreToolUse:Bash`; 23 çağrıda 2.385 token yazdı.

**"eco enjeksiyon hatası" — doğrulandı, hem de şüphelenilenden ağır.**
eco koşusunun `SessionStart` çıktısı aynen şu:

```
Teknesyum ▸ oturum `Projeler` üst klasöründe açıldı · ... · premium mod ·
her ajan opus · 20 paralele kadar · plan konseyi fable + opus · ikinci görüş fable
```

`UserPromptSubmit` bloğu da premium metni: *"Premium mod açık (Max 20x). Sonnet ve
haiku kullanma; her ajan opus çalışır. ... yirmi paralel ajana kadar çıkabilirsin ...
Paralel açmak bu modda varsayılandır."*

Bu blok `normal` koşusundakiyle **birebir aynı uzunlukta (2.984 karakter)**, yani eco'ya
özel bir enjeksiyon hiç üretilmedi. Sebebi mekanik: `UserPromptSubmit` istem başına bir
kez çalışır, bench oturumunda tek kullanıcı istemi vardı ve o istem `/premium eco`
çalıştırılmadan **önce** gönderildi. Profil sonradan eco'ya dönse bile bağlamdaki metin
72 tur boyunca premium kaldı. Açık kayıttaki "eco enjeksiyonu 779 bayt, normal 645"
maddesi başka bir ölçümden; bu koşuda iki taraf da 2.984 bayt.

### Kalem 4 — ölçü satırı: 92 token

`Stop` hook'u iki kez, toplam 330 karakter yazdı. Şüpheli değil.

### Kalem 5 — ajan açma: 0 token — doğrulandı

eco koşusunda sıfır `Task`/`Agent` çağrısı var; transkriptin `subagents/` klasörü yok.
Karşılaştırma: `normal` aynı görevde 4 ajan açtı (2 builder, 2 auditor).

### Kalem 6 — geriye kalan: 39.626 token, farkın %89'u

Base'e yazılamıyor. eco'nun 190.151 ham tokeni tam olarak şuraya gitti:

| nereye | token | eco toplamının %'si |
|---|---:|---:|
| Kendi çıktısı (yazılan) | 67.814 | 35,7 |
| Kendi çıktısının bir sonraki tura bağlam olarak geri yazılması | ~67.814 | 35,7 |
| Tur 1 taban bağlamı (`cache_creation` payı) | 22.132 | 11,6 |
| Bağlama enjekte edilen bloklar (hook + harness ekleri) | 24.850 | 13,1 |
| Araç sonuçları (70 adet, 17.329 karakter) | 4.814 | 2,5 |
| Artık (model kapanmıyor) | 2.727 | 1,4 |

Model **%98,6 kapanıyor**: turların artan `cache_creation` toplamı 100.061, buna karşılık
"önceki çıktı + araç sonucu + enjeksiyon" toplamı 97.478.

Yani eco'nun parasının **%71'i kendi ürettiği metni yazıp geri okumaya** gitti.
72 turda 67.814 token çıktı üretildi. Araç sonuçları toplamı sadece 4.814 token — iş
girdisi değil, **konuşma uzunluğu** pahalı. `yalin` koşusunun tur ve çıktı hacmi
ölçülemedi (transkript yok), ama `BENCH.md` kaydı 13 satırlık çok daha sıkı bir döngü
gösteriyor: uzun perft koşuları arka planda beklenmiş, tur harcanmamış.

---

## 4. Enjekte edilen blokların tamamı (eco)

Base'in payı bu tablonun küçük bir dilimidir; büyük kalemler harness'ın kendisidir.

| kaynak | kez | karakter | ≈token | kimin |
|---|---:|---:|---:|---|
| `edited_text_file` | 5 | 24.775 | 6.882 | harness |
| `deferred_tools_delta` | 1 | 17.011 | 4.725 | harness |
| `skill_listing` | 1 | 14.854 | 4.126 | %18'i base |
| `PreToolUse:Bash` (RTK) | 23 | 8.586 | 2.385 | **base** |
| `total_tokens_reminder` | 71 | 6.461 | 1.795 | harness |
| `mcp_instructions_delta` | 1 | 5.336 | 1.482 | harness |
| `agent_listing_delta` | 1 | 5.106 | 1.418 | %48'i base |
| `UserPromptSubmit` | 1 | 2.984 | 829 | **base** |
| `queued_command` | 3 | 1.637 | 455 | harness |
| `diagnostics` | 3 | 1.571 | 436 | harness |
| `SessionStart:startup` | 2 | 501 | 139 | **base** |
| `Stop` | 2 | 330 | 92 | **base** |
| `PostToolUseFailure:Bash` | 2 | 159 | 44 | **base** |
| `auto_mode` | 1 | 96 | 27 | harness |
| `command_permissions` | 1 | 54 | 15 | harness |
| **toplam** | | **89.461** | **24.850** | |

Token tahmini 3,6 karakter/token oranıyla yapıldı (Türkçe-İngilizce karışık metin).
Gerçek tokenizer çıktısı ölçülemedi; ±%20 sapma payı var. Bu sapma kapı kararını
değiştirmiyor — base'in payı %20 hata payıyla bile %13'ü geçmiyor.

---

## 5. Sıfır maliyetli kaçak — eco kendi kuralını nerede çiğnedi

**1. eco hiç eco olmadı.** Bağlamdaki profil metni 72 tur boyunca premium'du (bkz.
kalem 3). "Token tasarrufu önceliği en yüksek" diyen profil, ilk isteminde
"yirmi paralel ajana kadar çıkabilirsin, paralel açmak varsayılandır" talimatını okudu.
Ajan açmaması modelin kendi kararıydı, profilin değil. **Bu koşu eco profilini ölçmedi.**

**2. Tur 1 tabanı eco ile normal arasında hiç değişmiyor.** eco 60.498, normal 60.490 —
8 token fark. Profil değiştirmek sistem promptundan **tek bayt** silmiyor. eco yalnız
model ve ajan ayarlarını değiştiriyor, bağlamı değiştirmiyor. Aşama 1'in en somut hedefi
bu: eco'da skill listesi, ajan listesi ve MCP yönergeleri kısaltılabilir mi.

**3. `edited_text_file` yankısı — 6.882 token, base'in tüm ayak izinden büyük.**
Beş dosya düzenlemesinden sonra dosya parçaları bağlama geri yazıldı. eco'nun kapatması
gereken en pahalı tek mekanizma bu; harness ayarı, base ayarı değil.

**4. RTK yeniden yazımı tasarruf değil, gider olarak göründü.** 23 Bash çağrısında
2.385 token `updatedInput` JSON'u bağlama girdi. RTK'nın komut çıktısında ne kadar
tasarruf ettiği bu koşuda ölçülemedi; net etkisi bilinmiyor, ölçülmeli.

**5. Ölçemediklerim.** `yalin` tarafı; bütçe sayacının formülü; gerçek tokenizer
sayıları; RTK'nın net etkisi.

---

## 6. Kapı

> `Ö4` farkın en az %80'ini kalemlemezse Aşama 2 ve 3 başlamaz.

**Kalemlenen: %10,9. KAPI GEÇİLMEDİ.**

Hipotez yanlış. Fark base'in enjeksiyonundan gelmiyor — base'in eco koşusundaki tüm
ayak izi 4.826 token, koşunun toplam maliyetinin %2,5'i. Farkın %89'u konuşma
hacminden geliyor: 72 tur, 67.814 token çıktı, ve bu çıktının her turda bağlama geri
yazılması.

Plan baskın kaleme yeniden hedeflenmeli. Baskın kalem **enjeksiyon değil, tur sayısı ve
çıktı uzunluğu**. Aşama 1 için üç somut hedef, pahalıdan ucuza:

1. Tur ve çıktı hacmini kısan davranış kuralları (eco'da kısa cevap, az tur).
2. `edited_text_file` yankısının eco'da kapatılması — 6.882 token.
3. eco'nun sistem promptunu gerçekten küçültmesi — bugün 8 token fark ediyor.

Ayrıca **bench yeniden koşulmalı**: bu ölçüm eco profilinin maliyetini ölçmedi, çünkü
eco profili bağlama hiç girmedi. Koşular sıralı olmalı ve `/premium <profil>` ilk
kullanıcı isteminden **önce** uygulanmalı, yoksa `UserPromptSubmit` yanlış profili yazar.

---

## Rapor

- `.claude/relay/contracts/` boş; sözleşme dosyası yok, görev doğrudan T0 istemiyle geldi. Ölçüme devam edildi, aynı satır `_sorun.log`'a yazıldı.
- `yalin` transkripti bu makinede yok; karşılaştırma tek taraflı yapıldı, yukarıda açıkça belirtildi.
- Kapsam dışı not: `normal` koşusunun Stop satırı `~313.500` token diyor, bütçe sayacı `171.114`. Base'in kendi tahmini alt ajanları sayıyor, sayaç saymıyor. İki rakam aynı isimle raporlanıyor; karışıklık kaynağı.
