# Her mesajda tüketenler — çıkarılabilirlik puanlarıyla

Ölçüm 27.08.2026. Katsayı **2,492 karakter/token**.

**Puan ne demek:** 0 = kesilemez, iş kaybı kesin. 10 = bugün silinebilir, kimse fark etmez.
Puan maliyet/fayda değil, **çıkarma riski**. Maliyet ayrı sütunda duruyor; kararı ikisi
birlikte verir.

---

## 1. Gerçekte ne kadar sık ödeniyor

Enjeksiyon **her turda değil**, ilk iki turda yazıyor; üçüncüden sonra `sayacGecti`
tavanı susturuyor. Ama iki nokta bu tabloyu bozuyor:

1. **Tavan tam sıfırlamıyor.** Tavana takılınca `kapEkle` ile dönülüyor; kapsayıcı proje
   etkinse sonraki turlarda da kısa bir satır yazılıyor (`relay-watch.js:964, :972`).
2. **Her alt ajan kendi bağlamında baştan ödüyor.** Ö1 ölçümü: 83 relay çağrısının 59'u
   alt ajan transkriptinde; tek oturumda 56 çağrının 48'i alt ajanlardan. Yirmi ajanlı bir
   turda bu kalem **yirmi kez** ödeniyor. Aşağıdaki rakamlar tek bağlam içindir.

---

## 2. Kalem kalem

| # | kalem | karakter | token | çıkarılabilirlik | gerekçe |
|---|---|---:|---:|:---:|---|
| 1 | `premiumNotu` | 2.088 | 838 | **9** | Enjeksiyonun %56'sı. Kod tarafında **hiçbir yaptırımı yok** — model/efor seçimi `premium.js` ve ajan tablosuyla belirleniyor, bu metin yalnız dilek listesi. Yaptırım `kimlikDenetle` içinde zaten var ve metni okumadan çalışıyor. |
| 2 | `olcu` | 653 | 262 | **7** | Modele "işi relay §1 ile boyutlandır ve ilk satırı bas" dedirtiyor. Ürettiği tek şey banner. Aynı bilgi statusline'a sıfır bağlam maliyetiyle yazılabilir; desen `_makbuz.json`'da kurulu. |
| 3 | `seviye2` | 581 | 233 | **10** | Yalnız yönlendirme seviyesi 2'de yazılır, varsayılan 1. Varsayılanda ödenmiyor ama kodu ve bakım yükü duruyor. Seviye 2 hiç kullanılmadı. |
| 4 | `onArastirmaHatirlatma` | 571 | 229 | **5** | "Sıfırdan iş görünüyor, plan yazmadan önce ön araştırma yap." Gerçek bir davranış üretiyor (scout 137 çağrı) ama koşullu — yalnız yeni iş sezildiğinde. Kısaltılabilir, atılamaz. |
| 5 | `kapsayiciEtkin` | 298 | 120 | **8** | Üst klasörde açılan oturum için. Çözdüğü problem kendi kuralımızın ihlali — kullanıcıya zaten "proje kökünde aç" deniyor. Kural yaptırıma bağlanırsa kalem gereksiz. |
| 6 | `ecoNotu` | 263 | 106 | **6** | Eco profili için. Ö4 ölçtü: profil değiştirmek bağlamdan bayt silmiyor, eco ile normal arası fark 8 token. Metin var, karşılığı yok. |
| 7 | `platformNotu` | 248 | 100 | **4** | "Bu projede platform notu yok, uygun bir anda sor." Tek seferlik bir soru için her oturum ödeniyor; dosyaya bir kez yazılınca susuyor. Kalıcılık zaten var, hatırlatma gereksiz uzun. |
| 8 | `gorusHatirlat` | 206 | 83 | **3** | Dördüncü tura girmiş sözleşmeyi bildiriyor. Koşullu ve nadir; gerçek bir kaçağı yakalıyor. |
| 9 | `gunlukProseduru` | 205 | 82 | **6** | `SessionStart`'ta bir kez. 27.08'de `compact`/`resume` tekrarından çıkarıldı. Kalan tek koşu savunulabilir ama metin uzun. |
| 10 | `yonlendirmeYonerge` | 154 | 62 | **8** | "Aşağıdaki satırları aynen bas" talimatı. Hem girdi hem **çıktı** token'ı ödetiyor: model satırları yeniden yazıyor. Aynı bilgi statusline'a gider. |
| 11 | `dilTalimati` | 91 | 37 | **2** | Oturumda bir kez yeterken her turda yazılıyordu. Ucuz ve gerçek davranış üretiyor. |
| 12 | `dugmeSapma` | 26 | 10 | **1** | Tabandan sapan düğme sayısı. Neredeyse bedava, gerçek durum bildiriyor. |
| | **toplam** | **5.384** | **2.160** | | |

Tek turda hepsi birden yazılmaz; koşullar farklı. Ölçülen gerçek tur 1 yükü
**3.747 karakter / 1.504 token** — ağırlığı 1, 2, 4 ve 7 taşıyor.

---

## 3. Puanı yüksek olanların toplamı

Puan ≥ 7 olan beş kalem: `premiumNotu`, `olcu`, `seviye2`, `kapsayiciEtkin`,
`yonlendirmeYonerge`.

**3.774 karakter / 1.515 token.** Enjeksiyonun **%70'i.**

Beşi de kesilirse enjeksiyon 3.747 → ~1.100 karakter, ve Y1'in kapısıyla birlikte
sözleşme açık olan oturumda bile yük **5.406 → ~3.000 token**'a iner.

---

## 4. Kesime girmeyenler

| kalem | neden |
|---|---|
| Ajan açıklamaları (963 token) | Yedisi de kullanımda; builder 211, auditor 166, scout 137 çağrı. Kısaltılır, kesilmez. |
| `contract-guard.js` | Bağlama 0 karakter yazıyor. Maliyet gerekçesiyle kesilemez. |
| `dugmeSapma`, `dilTalimati` | 47 token toplam; kesmenin kazancı ölçüm gürültüsünün altında. |

---

## 5. Sıradaki iş

`docs/PLAN-DALGA3.md` §E4'teki A2 maddesi tam olarak bu tablodur. Sıra:

1. `premiumNotu` kaldırılır, yaptırım `kimlikDenetle`'de zaten var (838 token).
2. `yonlendirmeYonerge` + `olcu` statusline'a taşınır (324 token, artı çıktı tasarrufu).
3. `seviye2` ve `kapsayiciEtkin` silinir (353 token).
4. `platformNotu`, `ecoNotu`, `gunlukProseduru` kısaltılır.

Her adımdan sonra `node scripts/olcum/istem-yuku.js --json` ile ölçülür ve
`node test/all.js` yeşil kalmalıdır.
