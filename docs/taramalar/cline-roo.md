# Cline ve Roo Code Taraması

Teknesyum Base ile karşılaştırma amaçlı. Kaynak: resmi depo/dokümantasyon, WebSearch/WebFetch. Tarih: 2026-08-19.

## 1. Ne yapıyor, hangi problemi çözüyor?

Cline: VS Code eklentisi / SDK / CLI olarak çalışan otonom kodlama ajanı; okuma-yaz-komut çalıştır döngüsüyle
kod tabanında görev yürütür. Roo Code: Cline'ın 2024 başında çatallanmış (fork) hâli, çoklu-mod (Code/Architect/
Ask/Debug) ve alt-görev orkestrasyonu ekleyerek farklılaştı. İkisi de "sohbet + araç çağrısı" tek-ajanlı
modeli üstüne inşa edilmiş, bizdeki gibi çok-ajanlı sözleşme/denetçi ayrımı yok.

Kaynak: [Cline GitHub](https://github.com/cline/cline), [Cline vs Roo Code (RockB)](https://baeseokjae.github.io/posts/cline-vs-roo-code-2026/)

## 2. İş devri nasıl oluyor? Memory Bank

**Cline Memory Bank** — kullanıcının projesine kurduğu bir `.clinerules`/custom-instructions kalıbı (resmi
best-practice, çekirdek özellik değil). Altı dosya:

1. `projectbrief.md` — kaynak gerçek, temel
2. `productContext.md` — proje neden var, UX hedefleri
3. `systemPatterns.md` — mimari/desenler
4. `techContext.md` — teknoloji yığını
5. `activeContext.md` — güncel odak (**en sık güncellenen**)
6. `progress.md` — durum/kilometre taşları

Okuma sırası hiyerarşik: projectbrief → (productContext, systemPatterns, techContext) → activeContext, progress.
Cline'ın hafızası oturumlar arası tamamen sıfırlanır — bu yüzden **her görev başında ALL dosyalar** okunur.
Güncelleme: önemli değişiklik sonrası, yeni desen keşfedildiğinde, kullanıcı "update memory bank" dediğinde
(tüm dosyalar taranır) veya oturum sonunda activeContext.md düzenlenir.

Kaynak: [Cline Memory Bank](https://docs.cline.bot/best-practices/memory-bank), [cline-memory-bank.mdx](https://github.com/cline/cline/blob/main/docs/prompting/cline-memory-bank.mdx)

**Roo Code Memory Bank** — Roo Code'un **kendi özelliği değil**, topluluk projesi
(`GreatScottyMac/roo-code-memory-bank`, Apache 2.0, 1.7k yıldız). `project-root/memory-bank/` klasöründe:
`activeContext.md`, `decisionLog.md`, `productContext.md`, `progress.md`, `projectBrief.md` (opsiyonel),
`systemPatterns.md` (opsiyonel). Okuma sırası dokümante edilmemiş. Güncelleme "gerçek zamanlı senkronizasyon"
iddiası var ama mekanizma net değil; manuel "UMB" (update memory bank) komutu fallback.

Kaynak: [GreatScottyMac/roo-code-memory-bank](https://github.com/GreatScottyMac/roo-code-memory-bank)

**Bizimkinden fark**: İkisi de tek-ajanlı bağlamda "oturumlar arası hafıza dosyası" — patron/işçi/denetçi
ayrımı yok, `[[bağ]]` ile çapraz referans yok, `MEMORY.md` gibi merkezi indeks dosyası yok (Cline'da
hiyerarşi var ama tek giriş noktası projectbrief.md, indeks değil, içerik). Roo Code varyantı proje kökünde
ayrı klasör, bizim gibi kullanıcı-global + proje-özel ayrımı doğrulanamadı.

## 3. Bağlam/token disiplini

Her ikisinde de **otomatik bağlam sıkıştırma** var, ama ikisi de "gerektiğinde model'e özetlet" mantığında —
bizim "önce deterministik araç, model gerekmiyorsa kullanma" ilkemizle aynı değil.

- **Cline Auto-Compact**: bağlam limiti yaklaşınca konuşmayı LLM ile özetler, teknik detay/kod
  değişikliği/kararları korumaya çalışır, geçmişi özetle değiştirip kaldığı yerden devam eder. Formül:
  `maxAllowedSize = max(contextWindow - 40000, contextWindow * 0.8)`. "Basic" (deterministik kırpma) veya
  "Agentic" (LLM güdümlü) strateji seçilebilir.
  Kaynak: [Cline Auto Compact](https://docs.cline.bot/features/auto-compact)

- **Roo Code Intelligent Context Condensing**: eşik yüzdesi ayarlanabilir (örn. %80), otomatik veya manuel
  ("Condense Context" butonu) tetiklenir, ayrı bir model ile özetleme yapılır, prompt özelleştirilebilir.
  Kaynak: [Intelligent Context Condensing](https://docs.roocode.com/features/intelligent-context-condensing)

Deterministik/regex tabanlı token tasarrufu (bizim rtk/grep-önce ilkesi gibi) belgelerde görülmedi —
doğrulanamadı.

## 4. Kurallar model disiplinine mi bırakılıyor, mekanik mi?

**Kısmen mekanik, kısmen model disiplini — karışık:**

- **Cline Hooks** (v3.36+, sadece macOS/Linux): `PreToolUse`, `PostToolUse`, `TaskStart` gibi olaylarda
  tetiklenen çalıştırılabilir betikler; stdin'den JSON alır, `cancel` alanıyla eylemi **gerçekten
  bloklayabilir**, `contextModification` ile prompt'a metin enjekte edebilir. Bu bizim hook-mekanizmamıza en
  yakın parça — ama Windows desteklenmiyor.
  Kaynak: [Cline v3.36 Hooks](https://cline.bot/blog/cline-v3-36-hooks)
- **Cline Rules (`.clinerules`)**: düz metin, sistem promptuna eklenir — **mekanik uygulama yok**, modelin
  okuyup uyması bekleniyor.
- **Plan/Act ayrımı — kısmen mekanik**: Plan modunda dosya değiştirme ve komut çalıştırma araçları
  gerçekten kapatılıyor ("cannot modify any files or execute commands") — araç seviyesinde kısıtlama.
  Act'e geçince konuşma geçmişi taşınıyor, tam sandbox değil ama gerçek bir teknik kapı var.
  Kaynak: [Plan & Act Mode](https://docs.cline.bot/core-workflows/plan-and-act)
- **Roo Code custom modes (`groups`, `fileRegex`)**: YAML/JSON ile mod tanımlanır
  (`groups: [read, [edit, {fileRegex: '\.py$'}], command]`). Kısıtlama sistem seviyesinde bir
  "FileRestrictionError" ile bloklanıyor — yani **mekanik**, salt sistem promptu değil. Ama nihai kaynak
  resmi olarak arşivlendiği için doğrulama sınırlı.
  Kaynak: [Roo Code Custom Modes](https://roocodeinc.github.io/Roo-Code/features/custom-modes)

Özet: Cline'da Plan/Act ve Hooks mekanik; genel `.clinerules` disiplin işi modele bırakılmış. Roo Code'da
mod-bazlı araç kısıtlaması mekanik. Bizim hook-tabanlı "kural her zaman mekanik uygulanır" ilkemiz kadar
kapsayıcı/tutarlı değil — ikisi de mekanik kısıtlamayı sadece belirli yerlerde (mod geçişi, dosya regex'i)
kullanıyor, kural bütünü için değil.

## 5. Alınmaya değer en fazla 3 fikir

1. **Plan/Act'teki araç-seviyesi salt-okunur kilit** — Plan modunda dosya yazma/komut çalıştırma araçları
   fiilen kapatılıyor, sadece "yapma" talimatı değil. *Neden değerli*: relay'de patron/planlama aşamasında
   işçi ajanın yanlışlıkla kod yazmasını modelin kendi disiplinine değil araç erişimine bağlamak, sözleşme
   yazımı sırasında istenmeyen değişikliği kökten engeller. *Maliyet*: relay betiğine "plan modu" bayrağı
   ekleyip o fazda Edit/Write/Bash araçlarını agent tanımından çıkarmak — küçük konfigürasyon işi.
   *Bizimkinden fark*: bizde ayrım rol bazlı (builder/auditor farklı ajan), zaman/faz bazlı bir salt-okunur
   kilit yok; bir builder aynı oturumda plansız direkt yazabiliyor.

2. **Cline Hooks'un `cancel` + `contextModification` çifti** — bir aracı hem engelleme hem de gerekçeyle
   birlikte modele geri bildirim verme. *Neden değerli*: bizim hook'larımız kuralı mekanik uygularken,
   engellenen eyleme dair açıklamayı modele otomatik enjekte etmek varsa tekrar deneme kalitesini artırır.
   *Maliyet*: mevcut hook script'lerine stdout/stderr yerine yapılandırılmış JSON dönüşü + prompt-injection
   alanı eklemek — orta, hook altyapısını değiştirir. *Bizimkinden fark*: bizim hook'lar muhtemelen sadece
   izin ver/reddet ikili sonucu veriyor, gerekçeyi konuşmaya geri yazan bir kanal doğrulanamadı.

3. **Memory Bank'in "her görev başında ALL dosya okunur" katı kuralı** — Cline'da bu opsiyonel değil, zorunlu
   ilk adım. *Neden değerli*: bizim `MEMORY.md` indeksi zaten var ama "her oturum başı hepsini oku" zorunluluğu
   yerine seçici okuma (indeksten ilgili linke gitme) tercih ediliyor — token tasarrufu lehine doğru bir
   fark, yani bu fikir bizde **zaten daha iyi** çözülmüş; almaya değer olan sadece "activeContext.md" tipi
   tek bir "şu an ne yapıyordum" dosyasının en sık güncellenen, ayrı bir dosya olarak öne çıkarılması.
   *Maliyet*: neredeyse sıfır — MEMORY.md indeksine "güncel odak" alanı zaten yakın bir işlev görüyorsa
   sadece isimlendirme/konvansiyon netleştirmesi. *Bizimkinden fark*: bizde `[[bağ]]` ile çapraz bağlantılı
   çok dosya var, Cline'da tek yönlü hiyerarşi (projebrief → diğerleri) — bizim yapı daha esnek, kayda değer
   olan yalnızca "en sık güncellenen dosyayı ayrı tut" alışkanlığı.

## 6. Şüpheli/riskli yanlar

- **Roo Code tamamen kapandı**: VS Code eklentisi, Cloud ve Router servisleri **15 Mayıs 2026'da kapatılıp
  depo arşivlendi** (salt okunur). Duyuru 21 Nisan 2026'da yapıldı; ekip "IDE artık kodlamanın geleceği
  değil" diyerek bulut-tabanlı "roomote" ajanına yöneldi. Bu taramadaki Roo Code custom-modes ve Boomerang
  Tasks bilgileri artık **tarihi/donmuş** durumda — yeni geliştirme yok, güvenlik yaması gelmeyecek.
  README kullanıcıları Cline ve Kilo Code'a yönlendiriyor.
  Kaynak: [Roo Code pivots to cloud agent (The New Stack)](https://thenewstack.io/roo-code-cloud-ides-ai-coding/),
  [Roo Code Shutting Down May 15, 2026](https://nerova.ai/news/roo-code-shutting-down-may-15-2026-what-users-should-do-next)
- **Roo Code Memory Bank de risk altında**: Roo Code'un kendisi arşivlendiği için üstüne kurulu topluluk
  eklentisi (`GreatScottyMac/roo-code-memory-bank`) fiilen öksüz kaldı — bağımlı olduğu platform yok artık.
- **Cline Hooks Windows'ta çalışmıyor** — "sadece macOS/Linux" notu var; bizim ortamımız Windows/PowerShell
  olduğu için bu özelliği doğrudan örnek almak mümkün değil, taklit edilecekse platformdan bağımsız
  yeniden yazmak gerekir.
  Kaynak: [Cline v3.36 Hooks](https://cline.bot/blog/cline-v3-36-hooks)
- **Memory Bank "gerçek zamanlı senkronizasyon" iddiası doğrulanamadı** — Roo Code Memory Bank sayfasında
  geçiyor ama mekanizma (dosya izleyici mi, her adımda mı) belgelerde açıklanmamış.
- **Lisans tarafında risk yok**: her ikisi de Apache 2.0, çatallama/community-devam serbest.
  Kaynak: [Cline LICENSE](https://github.com/cline/cline/blob/main/LICENSE)

## Kaynaklar

- [Cline Memory Bank](https://docs.cline.bot/best-practices/memory-bank)
- [cline-memory-bank.mdx (GitHub)](https://github.com/cline/cline/blob/main/docs/prompting/cline-memory-bank.mdx)
- [Cline Plan & Act Mode](https://docs.cline.bot/core-workflows/plan-and-act)
- [Cline Auto Compact](https://docs.cline.bot/features/auto-compact)
- [Cline v3.36: Hooks](https://cline.bot/blog/cline-v3-36-hooks)
- [Cline GitHub repo](https://github.com/cline/cline)
- [Cline LICENSE](https://github.com/cline/cline/blob/main/LICENSE)
- [Roo Code Custom Modes](https://roocodeinc.github.io/Roo-Code/features/custom-modes)
- [Roo Code Intelligent Context Condensing](https://docs.roocode.com/features/intelligent-context-condensing)
- [Roo Code Boomerang Tasks](https://docs.roocode.com/features/boomerang-tasks)
- [GreatScottyMac/roo-code-memory-bank](https://github.com/GreatScottyMac/roo-code-memory-bank)
- [RooCodeInc/Roo-Code GitHub repo (arşivlendi)](https://github.com/RooCodeInc/Roo-Code)
- [Roo Code pivots to cloud agent — The New Stack](https://thenewstack.io/roo-code-cloud-ides-ai-coding/)
- [Roo Code Shutting Down May 15, 2026 — Nerova](https://nerova.ai/news/roo-code-shutting-down-may-15-2026-what-users-should-do-next)
- [Cline vs Roo Code 2026 — RockB](https://baeseokjae.github.io/posts/cline-vs-roo-code-2026/)
