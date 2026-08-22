# letta-ai/letta (+ letta-ai/letta-code) — MemGPT soyu

**Uyarı, taramanın ilk bulgusu:** `letta-ai/letta` artık **kod deposu değil**. README'nin
kendi ifadesi: *"This repository now serves as a landing page for the Letta project."*
Kök dizinde yalnızca belge dosyaları var (README, LICENSE, AGENTS.md, PRIVACY.md,
SECURITY.md, TERMS.md, CITATION.cff) — hiç kaynak klasörü yok. Kod
`letta-ai/letta-code`'a taşınmış; eski V1 sunucusu `archive` dalında donduruldu.

Bu rapor ikisini birlikte ele alıyor.

## 1. Ne yapıyor, hangi problemi çözüyor

MemGPT makalesinin (arXiv 2310.08560) tanımı: *"we propose virtual context management, a
technique drawing inspiration from hierarchical memory systems in traditional operating
systems that provide the appearance of large memory resources through data movement
between fast and slow memory."*

Yani: **bağlam penceresini RAM gibi, dış depolamayı disk gibi görmek.** Ajan kendi
belleğini sayfalıyor — bağlamda tutulacakları seçiyor, gerisini dışarı yazıyor,
gerektiğinde geri çağırıyor.

Letta Code bunu bir kodlama ajanı kabuğuna taşıdı: *"Agents programmatically rewrite their
context to improve and adapt over time."*

Bizim problemimizle bağı: bizde de sabit bir yük var (120 KB) ve hepsi her zaman gerekli
değil. MemGPT'nin cevabı "hepsini yükleme, sayfala".

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Letta Code'un belgelediği ayrımlar, bizim durumumuza birebir çevrilebilir olduğu için
önemli:

**Skill kapsamı üç seviyeye bölünmüş:**
- global: `~/.letta`
- proje kapsamlı: `.agents/skills`
- ajan kapsamlı: MemFS içinde saklanıyor

**MemFS** — README: *"All context (including memory blocks) is tracked via git. Sync
context to a custom GitHub repository."* Yani bağlamın kendisi versiyonlu bir dosya
sistemi. Bağlam artık uçucu bir şey değil, denetlenebilir bir eser.

**Memory blocks** — sistem promptunun parçalanmış hâli. Ajan bunları kendisi yeniden
yazıyor ("system prompt learning").

**Alt ajanlar tür tür ayrılmış:** general-purpose, forked, recall, history-analyzer.
`recall` ve `history-analyzer` özellikle bağlam yönetimi için var — geçmişi ana bağlama
geri yüklemek yerine bir alt ajana inceletip **özet** almak.

**Sırlar bağlamdan gizleniyor** — README: secrets *"while obfuscating their values from
context"*. Bağlama girmemesi gereken şey için ayrı bir mekanizma.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Bağlamı ajanın kendisinin yönetmesi, üstelik denetlenebilir biçimde.** MemGPT'nin özgün
katkısı, sayfalama kararını dışarıdan bir kurala değil **modelin kendi araç çağrılarına**
bırakmaktı.

Letta Code bunun üstüne iki denetim aracı koymuş — asıl alınacak olan bunlar:

- **`/palace`** — belleği görüntüle. Bağlamda ne olduğunu **görebiliyorsun**.
- **`/doctor`** — bellek kalitesini denetle. Bağlamın çürüyüp çürümediğini ölçen bir komut.
- **`/sleeptime`** — düzenli aralıklarla belleği yeniden düzenleme ("dreaming").

Yani mekanizma "otomatik sayfalama" değil; **otomatik sayfalama + insanın bakabileceği bir
pencere + bir sağlık kontrolü**. Otomatik bağlam yönetiminin kör noktası (ajan yanlış şeyi
attı ve kimse fark etmedi) bu iki komutla kapatılmaya çalışılmış.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`npm install -g @letta-ai/letta-code`, sonra proje dizininde `letta`. `/connect` ile API
anahtarı, `/model` ile model değişimi. Öğretici ajan: `letta --new-agent --personality
tutorial`.

Dikkat çeken tasarım kararı, README'nin ipucu kutusundan: *"Letta Code agents are designed
to be self-configuring. If you want to configure something (e.g. skills, behavior, hooks,
permissions), try asking your agent to do it for you."* Yapılandırma dosyası yazmak yerine
ajana söylüyorsun.

Bazı özellikler (uzak ortamlar, sırlar) **Letta hesabıyla giriş gerektiriyor** — README
bunu açıkça işaretliyor.

Hata hâli: `/doctor` bellek kalitesi denetimi için var, ama neyi ölçtüğü README'de
yazmıyor. `doğrulanamadı`

## 5. Alınmaya değer en fazla 3 fikir

**1 — Bağlamı üç kapsama bölmek: global / proje / ajan.**
Ne: Letta'nın `~/.letta` (global), `.agents/skills` (proje), MemFS (ajan) ayrımı.
Neden değerli: bizde 120 KB'lık yükün **tamamı her oturuma** giriyor: 53 KB skill,
12 KB ayar, 32 KB referans, 23 KB ajan tanımı. Bu dördü aynı kapsamda değil — ajan
tanımları yalnızca ajan açıldığında, referanslar yalnızca ilgili adımda gerekli.
Kapsam ayrımı, bench'in ölçtüğü 44.000 token'ın büyük kısmının koşullu hâle
getirilebileceği anlamına geliyor.
Maliyet: Claude Code'un skill/ajan yükleme mekanizmasının hangi kapsamları desteklediğine
bağlı. Agent Skills şartnamesi `references/` üzerinden koşullu yüklemeyi zaten tanımlıyor
(bkz. `anthropic-skills.md`), yani en azından bir kısmı bugün mümkün. Orta.

**2 — `/palace` ve `/doctor`: bağlamı görünür ve denetlenebilir kılmak.**
Ne: "şu anda bağlamda ne var" sorusuna cevap veren bir komut, ve bağlamın sağlığını
raporlayan ikinci bir komut.
Neden değerli: bizde `/report` var ama ilerlemeyi raporluyor, bağlam yükünü değil.
53 KB'a nasıl gelindiği sorusunun cevabı basit: kimse toplamı görmüyordu. Görünürlük
olmadan hiçbir kısaltma kalıcı olmaz — dosya yine büyür.
Maliyet: bir slash komutu + dosya boyutu/token sayımı. Düşük. **Bu taramadaki en ucuz
uygulanabilir fikir.**

**3 — Geçmişi ana bağlama geri yüklemek yerine alt ajana inceletmek (`recall`,
`history-analyzer` deseni).**
Ne: uzun geçmişe ihtiyaç olduğunda geçmişi bağlama koymak yerine, ayrı bir alt ajana
okutup **özetini** almak.
Neden değerli: bizde relay zaten alt ajan açıyor; deseni tersine çevirmek gerekiyor —
alt ajan **iş yapmak** için değil, **bağlam tasarrufu** için de açılabilir. Kesilen oturum
sürdürme senaryosunda (relay'in çekirdek işlevi) geçmiş sözleşmeleri ana bağlama yüklemek
yerine bir okuyucu ajana özetletmek.
Maliyet: alt ajan çağrısının kendi maliyeti var — kazanç ancak geçmiş yeterince uzunsa
oluşuyor. Ölçüm gerekiyor. Orta.

## 6. Şüpheli/riskli yanlar

**Depo taşınması — en ciddi pratik risk.** `letta-ai/letta` 24.341 yıldızlı, ama kod orada
değil. Yıldız sayısına bakıp bağımlılık kuran biri boş bir depoya bağlanır. Gerçek depo
`letta-ai/letta-code` ve **3.083 yıldız** — sekizde bir. Yıldız sayısı taşınmalarda
yanıltıcı bir sinyal.

**Lisans.** Her ikisi de **Apache-2.0** — OSI onaylı, patent maddesi içeriyor. `letta`
deposunda ayrıca `TERMS.md` ve `PRIVACY.md` var; bunlar **hizmet** (Letta Cloud) için,
kod için değil. Marka: "Letta" ve "MemGPT" adları şirkete ait; Apache-2.0'ın 6. maddesi
marka hakkı vermiyor — yani kod alınabilir, ad kullanılamaz. Doğru ayrım.

**Bakım.** `letta`: son push 2026-08-16, son etiketli sürüm **0.16.8, 2026-05-14**,
42 açık issue. `letta-code`: son push 2026-08-22 (bugün), 3.083 yıldız, **237 açık issue**,
oluşturma 2025-10-25 — **on aylık bir proje**. Genç, hızlı değişen, henüz 1.0 değil.

**Arşiv dalı uyarısı.** README: eski V1 kaynağı *"is unsupported, receives no fixes or
security updates, and should not be used in production."* Yani MemGPT'nin özgün
uygulamasını referans olarak okumak serbest, kullanmak değil.

**Doğrulanamayan iddialar.**
- MemGPT makalesinin **özetinde hiçbir sayısal sonuç yok** — yalnızca nitel yetenek
  ifadeleri ("analyze large documents that far exceed the context window"). Sayılar
  makalenin gövdesinde; bu tarama kapsamında doğrulanmadı. `doğrulanamadı`
- Letta Code README'sinde **tek bir performans ya da tasarruf rakamı yok**. "Self-improving",
  "learn and evolve over long horizons" gibi ifadeler ölçüsüz. Bir bağlam yönetimi
  sisteminin ne kadar bağlam kazandırdığını söylememesi ciddi bir boşluk. `doğrulanamadı`
- *"more like people than tools"* — pazarlama dili, ölçülemez.

**Kavramsal risk — bizim için asıl mesele.** MemGPT'nin cevabı **dinamik**: ajan çalışma
zamanında belleğini yönetiyor. Bizim yükümüz **statik markdown**. Dinamik yönetim,
statik bir dosya için gereksiz karmaşıklık: her oturumda ajanın "hangi skill parçasını
yükleyeyim" diye düşünmesi, o düşünmenin kendisi token harcar. Ayrıca yanlış karar verme
riski var — `/doctor` komutunun varlığı bu riskin gerçek olduğunun kanıtı.

**Bizim için doğru okuma:** MemGPT'den alınacak olan sayfalama motoru değil, **kapsam
ayrımı ve görünürlük**. Dosyaları doğru kapsamlara koyup boyutu görünür kılmak, çalışma
zamanı zekâsı gerektirmiyor ve geri tepmiyor.

**Gizli kurulum maliyeti.** Node.js + npm global kurulum + isteğe bağlı Letta hesabı +
bulut bağımlılığı. Bazı özellikler hesap olmadan çalışmıyor. Bizim için bağımlılık olarak
alınabilir bir şey yok; alınacak olan desen.

## Kaynaklar

- `gh api repos/letta-ai/letta` — 2026-08-22: pushed_at 2026-08-16, 24.341 yıldız,
  42 açık issue, Apache-2.0, arşivlenmemiş, oluşturma 2023-10-11.
- `gh api repos/letta-ai/letta/releases/latest` — 0.16.8, 2026-05-14.
- `gh api repos/letta-ai/letta/contents` — kök dizinde kaynak klasörü yok.
- `gh api repos/letta-ai/letta-code` — 2026-08-22: pushed_at 2026-08-22, 3.083 yıldız,
  237 açık issue, Apache-2.0, oluşturma 2025-10-25.
- Her iki depo README (Contents API ile okundu).
- MemGPT makalesi: https://arxiv.org/abs/2310.08560 (özet 2026-08-22 okundu).
- Agent Skills şartnamesi karşılaştırması: `docs/taramalar/anthropic-skills.md`.
