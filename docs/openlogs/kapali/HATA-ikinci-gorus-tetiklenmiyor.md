# Hata: ikinci görüş tetikleyicileri ateşlenmiyor — T0 kendi kuralını okumuyor

**Durum:** çözüldü 24.08.2026 — üç ölçü de kuruldu, `test/run.js` kilitliyor.
**Önceki durum:** açık. Tetikleyici listesi `skills/relay/SKILL.md` §1.5.1'de yazılı, premium
profilde `second_opinion: on`, `advisor` ajanı tanımlı ve çalışıyor — ama **kural
model tarafından uygulanmıyor.**
**Belirti:** Bir sözleşme beş bağımsız denetimde arka arkaya KALDI aldı ve altıncı tura
girdi. §1.5.1'in ikinci tetikleyicisi ("bir hata üç turdur çözülmedi ve kök neden hâlâ
belirsiz") dördüncü turda ateşlenmesi gerekirken hiç ateşlenmedi. Kullanıcı sormasa
altıncı tur da aynı yöntemle koşacaktı.
**Kaynak:** `teknesyum/skills/relay/SKILL.md` §1.5.1 — tetikleyici listesi
**Görüldüğü oturum:** 23.08.2026, VideoEdit / D1 dikey dilim, sözleşme T3 (`ve indir`)

---

## 1. Ne oldu

VideoEdit'te on bir sözleşmelik bir dalga koştu. Onu bir ya da iki turda geçti.
T3 tek başına ayrıştı:

| Tur | Denetim | Bulgu |
|---|---|---|
| 1 | sonnet | geçti (sonradan premium yeniden denetimiyle bozuldu) |
| 2 | opus | `video.*` glob'u uzantı süzmüyor |
| 3 | opus | `ERROR:`/`WARNING:` süzgeci eklendi, sınıflandırma hâlâ yanlış |
| 4 | opus | *"her tur süzgecin ne elediğini düzeltiyor, elenenin nereye gittiğini izlemiyor"* |
| 5 | opus | özet kapısı temizlikten önce çıkıyor → iki kanonik aday, alfabetik sıra kararı |
| 6 | — | açık |

Beş turun ortak deseni tek cümle: **kural bir dalda var, kardeş dalında yok.**

T0 (ana oturum) her turda ayrıntılı brifing yazdı, mutasyon testi istedi, opus yapıcı ve
opus denetçi açtı. Yöntemi hiç sorgulamadı. Kullanıcı *"fable olaya dahil oldu mu"* diye
sorana kadar `advisor` bir kez bile açılmadı.

Aynı oturumda `advisor` **bir kez** çalışmıştı (13:10, T8'in plan teyidi) — yani ajan
tanımı, model geçişi ve çağrı yolu sağlam. Bozuk olan mekanizma değil, **tetikleme.**

## 2. Sorulduğunda ne oldu

Kullanıcının sorusu üzerine `advisor` (fable, low) açıldı ve 25 saniyede şunu döndürdü:

> Beş turluk desen kriter listesinin yapısal zaafını gösteriyor: her kriter tek bir yolu
> düzeltiyor, kardeş yol denetim dışı kalıyor — değişmezler yol sayısından bağımsız
> olduğu için bu sınıfı kapatan tek seçenek o.
>
> **Kaçırdığın şey:** değişmezleri yalnız test listesine değil, koda **tek çıkış noktası**
> olarak koydur. `indir` hangi dalda biterse bitsin (başarı, sınıflandırılmış hata, yarım
> indirme) tek bir `_kaynak_dogrula()` içinden geçsin. Testler dal kaçırır, son-kapı
> fonksiyonu kaçırmaz. Beş turun hiçbiri **başarısız yolun bıraktığı durumu**
> denetlememiş görünüyor.

Bu, T0'ın beş turda göremediği şeydi ve maliyeti ~10 bin token oldu. Beş turun maliyeti
ise altı yapıcı + beş denetçi koşusu.

## 3. Mekanizma — neden ateşlenmiyor

§1.5.1 dokuz tetikleyici sayıyor ve girişinde şunu yazıyor:

> Her madde ölçülebilir bir eksik ya da çelişki gösterir; "kararsız kaldığında" gibi bir
> cümle ya hiç tetiklenir ya her zaman tetiklenir, o yüzden yok.

Madde gerçekten ölçülebilir yazılmış:

> 2. Bir hata üç turdur çözülmedi ve kök neden hâlâ belirsiz.

Ama **kimse ölçmüyor.** Tetikleyici bir kancanın değil, modelin dikkatinin üstünde
duruyor. Model tur sayısını biliyor (sözleşme frontmatter'ında `round: 5` yazıyor), kuralı
da context'inde taşıyor, yine de bağlantıyı kurmuyor — çünkü her turda önündeki iş
somut ve acil: denetim raporu geldi, brifing yazılacak, ajan açılacak. Kuralı hatırlamak
için bir **duraklama** gerekiyor ve tur akışında duraklama yok.

Bu, `HATA-tur-makbuzu-tekrari.md`'deki hatanın kardeşi: talimat kendi içinde tutarlı ama
onu uygulayacak an gelmiyor.

## 4. Ölçülebilir olan ne var

Dokuz maddenin en az üçü **kancadan görülebilir** — model dikkatine bırakılması
gerekmiyor:

| Madde | Görünen sinyal | Nerede |
|---|---|---|
| 2 · üç turdur çözülmedi | `round:` ≥ 4 ve `audit: failed` | sözleşme frontmatter'ı |
| 5 · "plan oluştur" dendi | kullanıcı isteminde dizgi | `UserPromptSubmit` |
| 8 · ölçüsü olmayan kriter | sözleşmede `## Doğrulama` bloğu boş | sözleşme gövdesi |

`relay-watch.js` zaten sözleşme dosyalarını okuyor (mühür kapısı, `status` geçişleri,
`owns` denetimi). `round` ve `audit` alanlarını okuyup üçüncü turdan sonra
`additionalContext` ile tek satır basmak yeni bir mekanizma gerektirmiyor.

Kalan altı madde (geri alınması pahalı seçim, iki okunuşlu istek, kural bozma, bulgunun
yeniden üretilememesi, iki ajanın çelişen raporu, yayın adımı) gerçekten yargı istiyor ve
modelde kalmalı. Ama **hepsini** modele bırakmak, ölçülebilir olanı da kaybettiriyor.

## 5. Öneri

1. **Kanca tarafı.** `relay-watch.js` sözleşme okurken `round >= 4 && audit ~ failed`
   gördüğünde `Stop`/`PostToolUse` kanalından tek satır bassın:
   *"T3 dördüncü turda ve denetim hâlâ kaldı — §1.5.1 madde 2 tetiklendi, `advisor` aç."*
   Uyarı bloklamasın; `_sorun.log`'a da yazılsın ki ekrandan kayması iz bırakmasın.
2. **SKILL tarafı.** §1.5.1'e "tetikleyici ateşlendiğinde ne yapılacağı" değil,
   **ne zaman bakılacağı** yazılsın: *"her denetim raporu geldiğinde, brifing yazmadan
   önce dokuz maddeye bak."* Bugün liste var, bakma anı yok.
3. **Kayıt.** `advisor` her açıldığında `MODEL.md`'ye satır düşsün — bugün yalnız model
   seçimleri kaydediliyor, görüş çağrıları kaydedilmiyor. Kayıt olmadan "kaç kez
   ateşlendi" sorusu ölçülemez ve bu hata bir daha görünmez.

## 6. Ölçü

Bu hatanın kapandığını gösteren tek şey: bir sözleşme dördüncü tura girdiğinde
`advisor` **kullanıcı sormadan** açılmış olmalı ve `MODEL.md` bunu göstermeli.

---

## 7. Ne yapıldı — 24.08.2026

Kök neden §3'te doğru teşhis edilmişti: tetikleyici bir kancanın değil **modelin
dikkatinin** üstünde duruyordu. Üç ölçü de o dikkati mekanizmaya çevirmek için yazıldı,
üçü de yapıldı.

**Ölçü 1 — kanca tarafı.** `hooks/relay-watch.js` → `gorusGerekenler(root)`. Sözleşme
frontmatter'ındaki `status`, `round` ve `audit` alanlarını okur; `round >= 3` ve
`audit` hâlâ `passed` değilse sözleşmeyi listeye alır. Liste boş değilse `hatirlat()`
`UserPromptSubmit` bağlamına tek cümle ekler (`dil.js` → `gorusHatirlat`, iki dilde).
**Bloklamaz** — dikkat çeker, kararı modele bırakır. Açmamayı seçen gerekçesini
sözleşmeye yazar.

Öneride `audit ~ failed` yazıyordu; kod `audit !== passed` diye kuruldu. Depodaki
sözleşmelerin çoğu denetim beklerken alanı `—` tutuyor, `failed` yazmıyor — `failed`
aransaydı kapı hiç açılmazdı. Ölçüldü: bugünkü depoda kapı E1 (tur 4), S1, U1 ve U2
(tur 3) için açılıyor.

**Ölçü 2 — SKILL tarafı.** §1.5.1'e *bakma anı* yazıldı: her denetim raporu geldiğinde
brifing yazmadan önce · bir sözleşme ikinci düzeltme turuna girerken · plan kullanıcıya
verilmeden önce · geri alınması pahalı bir adımdan önce. Aynı turda §1.5.1'in tamamı
"izin listesi"nden "hatırlatma listesi"ne çevrildi: **varsayılan açmaktır**, açmamanın
üç gerekçesi vardır, dördüncüsü yoktur.

**Ölçü 3 — kayıt.** `MODEL.md` diye bir dosya bu depoda hiç yoktu; öneri var olmayan
bir dosyaya yazıyordu. Kayıt `.claude/relay/GORUS.md` olarak kuruldu ve satırı model
değil kanca yazıyor (`gorusKaydet`, `PreToolUse:Agent` üzerinde, `rol === advisor`):

```
2026-08-24 00:29 | advisor | U3 kriter yapısı | bekleyen: E1,S1,U1,U2
```

`bekleyen` alanı ölçünün asıl taşıyıcısı: görüş açıldığı anda dördüncü turda bekleyen
sözleşme **var mıydı**. Tur tur birikince "kullanıcı sorunca mı açılıyor" sorusu
dosyadan cevaplanır — bugüne kadar cevaplanamıyordu.

**Kilit.** `test/run.js` → `ikinci gorus tetikleyicisi kancada olculuyor`. Üç ölçüyü de
kontrol eder ve `gorusGerekenler`'i dört sahte sözleşmeyle gerçekten koşturur (tur 4
denetimsiz → seçilir; tur 2 → seçilmez; tur 5 ama `passed` → seçilmez; `done` →
seçilmez). 417/417.

**Açık kalan tek şey ölçüm değil gözlem:** ilk gerçek ateşlemenin `GORUS.md`'de
görünmesi. Mekanizma artık modele bağlı olmadığı için bu bir zaman meselesi, kural
meselesi değil.
