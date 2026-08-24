# Hata: denetim turunun durdurma kuralı yok — bir sözleşme on iki tur döndü

**Durum:** açık. Relay SKILL denetimi "her sözleşme denetlenir" diye tanımlıyor
ama **turun ne zaman biteceğini** tanımlamıyor. Sonuç: denetçi her turda yeni
bir kusur *sınıfı* icat ediyor, T0 her sınıfa yeni bir tur açıyor ve döngü
kendiliğinden durmuyor.
**Belirti:** Aynı depodaki on bir sözleşmenin onu 1-6 turda kapandı; biri
**on iki** tur döndü ve hâlâ kapanmamıştı. Her turda **on kabul kriterinin onu
geçiyordu**; düşüren şey hep "kalite" tarafıydı.
**Kaynak:** `teknesyum/skills/relay/SKILL.md` — denetim bölümü; `agents/auditor.md`
**Görüldüğü oturum:** 23-24.08.2026, VideoEdit / D1 dikey dilim, sözleşme T3
(`ve indir`)

---

## 1. Ne oldu

Sözleşme T3 on iki tur döndü, on bir bağımsız opus denetimi gördü, on biri de
KALDI verdi. Her turda:

- on kabul kriterinin **onu geçiyordu**
- bir önceki turun bulgusu **gerçekten kapanmıştı**
- denetçi **bir öncekinin taksonomisinin dışından** yeni bir şey buluyordu

Adlandırılan sınıflar, sırayla:

| # | Sınıf |
|---|---|
| 1 | aynı kural ikinci bir yerde / kardeş dalda uygulanmıyor |
| 2 | yeni koruma kendi testiyle pinlenmiyor |
| 3 | süzgecin elediği şeyin nereye gittiği izlenmiyor |
| 4 | guard'ın yalnız bir yarısı pinleniyor (`X is not None and X != Y`) |
| 5 | testler sabiti kendi modülünden türetiyor · sahte dikiş argümanları kaydediyor ama yorumlamıyor |
| 6 | ölçüm aracının kendisi (mutasyon süpürgesinin `.pyc` ve taban kusuru) · fixture'ın temsil gücü |
| 7 | birimin kendisi (sınır çıktı karesinde, kaçınılan sapma kaynak ızgarasında) |
| 8 | kodda yazılı gerekçe doğrulanmamış bir iddiadır |

**Sınıfların hiçbiri uydurma değildi.** Sekizinci sınıf, benim kendi kapı notumu
çürüttü: bir docstring "`Path.is_file` `OSError`ı yutuyor" diyordu, ben
"dürüst çözüldü" diye onaylamıştım; denetçi CPython 3.12 kaynağına bakıp
`_IGNORED_ERRNOS`'ta `EACCES` olmadığını gösterdi.

Yani denetim **iyi çalışıyordu**. Bozuk olan, ne zaman duracağının yazılı
olmamasıydı.

## 2. Maliyeti

Kabaca: on iki yapıcı turu + on bir denetim turu, hepsi opus. Aynı depodaki
`ve olc` sözleşmesi altı turda, `ve tani` beş turda, `durum.json` altı turda
kapandı. Fark, kodun karmaşıklığından çok **o sözleşmeye ayrılan sabırdan**
geliyordu — ve o sabrın sınırı hiçbir yerde yazılı değildi.

## 3. İkinci hata: danışman sorulmadı

Relay §1.5.1 dokuz tetikleyici sayıyor. İkincisi tam bu durum:

> Bir hata **üç turdur** çözülmedi ve kök neden hâlâ belirsiz.

T3 **on iki** tur döndü ve `advisor` bir kez bile açılmadı. Aynı oturumda fable
beş kez soruldu ve **beşi de kararı değiştirdi** — biri (`ve olc`nin kanıt
kanalı) dört turluk bir döngüyü tek cevapla kırdı:

> Kapı eklemek blacklist yaklaşımıdır; dört turda dört kenar çıktıysa beşinci
> gelir. Sorun desen değil **kanal**.

T3 aynı şekle sahipti. Sorulmadı çünkü **soracak an gelmedi**: her turda
önümdeki iş somut ve acildi — denetim raporu geldi, brifing yazılacak, ajan
açılacak. Bu, `HATA-ikinci-gorus-tetiklenmiyor.md`'de yazdığım kalıbın aynısı,
ikinci kez ve daha pahalıya.

Kullanıcı sorunca soruldu. Fable'ın cevabı:

> On bir turdur on kriterin onu geçiyor; denetim artık **kusur bulmuyor, kusur
> sınıfı icat ediyor**. Bulguların ciddiyeti sistematik düşüyor. Gerçek olmaları
> tur açmayı haklı çıkarmaz.
>
> **Kaçırdığın:** durdurma kuralı **denetimin tanımıdır** — "her şeyi bul"dan
> "mührü engelleyecek şeyi bul"a çevirir. Kuralı yalnız bu sözleşmeye değil
> **denetim brifinginin kendisine** yaz.

## 4. Uygulanan kural

**Tur yalnızca KRİTİK bulunursa açılır.** ÖNEMLİ ve altı, mühür notuna **kalite
borcu** olarak yazılır ve sözleşme mühürlenir.

**KRİTİK'in tanımı:**

1. Gerçekçi bir girdide **yanlış çıktı** ya da **yanlış çıkış kodu** üretiyor, ya da
2. Yazılı bir **kabul kriterini** deliyor.

Bunun dışındaki her şey — pinlenmemiş koruma, ölü savunma, yanıltıcı yorum,
envanter boşluğu, fixture'ın kapsamadığı dal — borçtur.

**Kural bu dalgadaki gerçek kusurları kaçırmazdı.** Dördü de birinci maddeye
giriyor: hattın hiç render edememesi, `final.mp4`in tümden sessiz çıkması,
`--no-part` ile resume'un kalıcı kırılması, katalogun uygulanmayan bir geçişi
"uygulandı" diye beyan etmesi.

## 5. Öneri — Base tarafı

1. **`agents/auditor.md`'ye KRİTİK tanımını yaz.** Denetçi bugün "geçti/kaldı"
   veriyor ama eşiği kendi seçiyor; her tur eşiği bir tık aşağı iniyor.
2. **SKILL'e tur tavanı koy.** `fix_ceiling` düğmesi var (premiumda 8) ama
   **denetim turu** için karşılığı yok. Üçüncü turdan sonra `advisor` zorunlu,
   beşinciden sonra durdurma kuralı yürürlükte — ikisi de otomatik.
3. **Kanca tarafı.** `relay-watch.js` sözleşme frontmatter'ını zaten okuyor.
   `round >= 4 && audit ~ failed` görüldüğünde tek satır bassın — bu,
   `HATA-ikinci-gorus-tetiklenmiyor.md`'nin önerisiyle aynı ve o hata bu
   oturumda **ikinci kez** gerçekleşti. Bir kez daha modelin dikkatine
   bırakılırsa üçüncü kez olacak.
4. **Kalite borcu için yer aç.** Mühür notu bugün serbest metin; borç maddeleri
   yapılandırılmış olsa (`borc:` listesi) bir sonraki sözleşme onları
   `depends` gibi okuyabilirdi. Bu dalgada borçlar T11'e elle taşındı.

## 6. Ölçü

Bu hatanın kapandığını gösteren şey: bir sözleşme dördüncü turuna girdiğinde
`advisor` **kullanıcı sormadan** açılmış olmalı, ve beşinci turdan sonra
denetim raporu ÖNEMLİ'yi tur gerekçesi olarak **kullanamamalı**.
