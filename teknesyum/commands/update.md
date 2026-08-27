---
description: Session status board — plugin, repo, profile, open work, last save
argument-hint: [--guncelle] [ayrinti]
allowed-tools: Bash
---

İstenen: $ARGUMENTS

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/oturum.js" pano --json
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/oturum.js`
altındadır. Her çağrıda **hemen** çalıştır — açılıştaki günlük damgaya bakma, kullanıcı
zaten elle sordu.

**Pano salt okurdur.** `$ARGUMENTS` içinde `--guncelle` **yoksa** hiçbir şey kurma, hiçbir
şey güncelleme, `claude plugin update`'i çalıştırma — yalnız oku ve bas.

Betik tek satır JSON döner. **Kendin dosya okuma, sürüm tahmin etme, git çalıştırma** —
beş satırın hepsi bu JSON'un içinde. Sürüm karşılaştırmasını betik `scripts/surum.js` ve
`scripts/depo-surum.js` üzerinden yapar; ikinci bir kontrol yazma.

| Alan | Ne demek |
|---|---|
| `eklenti` | `kurulu`, `uzak`, `yeni`, `komut` — `null` ise uzak sorulamadı |
| `eklenti.etiket` | `surum`, `etiket`, `etiketsiz` — `null` ise depo ya da `package.json` yok |
| `depo` | `dal`, `geride` — `null` ise depo değil ya da uzak sorulamadı |
| `profil` | `mod` (eco/normal/premium) ve `kaynak` (oturum/makine/ortam) |
| `is` | `sozlesme` açık relay sözleşmesi, `gunluk` açık günlük, `biten` |
| `kayit` | son kaydın `ad`, `kaydedildi` ve `ayna` durumu |

Beş satırı da bas, sırayı bozma, tabloya sıkıştırma:

```
Eklenti  · <güncel mi, kurulu sürüm>
Depo     · <dal, uzakla ilişki>
Profil   · <mod> · kaynak <oturum|makine|ortam>
Açık iş  · <n> sözleşme · <n> günlük
Son kayıt · <ad> · <tarih> · <aynaya gönderildi | yalnız yerelde>
```

Sonra tek satır: hazırsa **"Hazır — kod yazmaya geçebiliriz."**, değilse eksik olan ne ve
hangi komutla kapanır.

`eklenti.etiket.etiketsiz` doğruysa beş satırın altına **tek satır** uyarı ekle: depo
sürümü `etiket.surum`, uzaktaki en yeni etiket `etiket.etiket`, yani sürüm etiketlenmemiş
ve güncelleme oraya ulaşmaz — çözüm `git tag v<sürüm>` ve `git push --tags`. `etiketsiz`
yanlışsa ya da `etiket` `null` ise bu satırı **hiç yazma**; her koşuda çıkan uyarı bilgi
değil gürültü olur. Bu, `depo` satırındaki uzak commit farkından ayrı bir sorudur.

`eklenti.yeni` doğruysa güncelleme komutunu **kendi satırında, tek satırlık kod bloğu
olarak** ver ki kullanıcı kopyalayabilsin:

```
claude plugin update teknesyum@teknesyum
```

Marketplace adı şart: `claude plugin update teknesyum` "not found" verir.

## Röle durumu

`is.sozlesme` sıfırdan büyükse beş satırın altına röle bölümünü de bas. Kaynak
`.claude/relay/`; yoksa bölümü hiç açma. Sadece şunları oku: `live/*.json`,
`contracts/*.md` frontmatter'ları, `contracts/done/` dosya listesi, `LOG.md` son 10
satır, varsa `live/_kesinti.json` ve `live/_acik.json`. Sözleşme gövdelerini açma —
`active` olanın Kayıt noktası hariç.

Bağımlılıkları çöz: `done/`'a bakarak hangi `open` sözleşmelerin başlayabileceğini
hesapla, HAZIR işaretle.

Ajan barı: `steps / tur_tavani` oranı. Tavanlar — builder 60, ui-builder 60, auditor 30,
scribe 40. `stop_reason` `null` ise çalışıyor, `end_turn` ise bitti, başka değer ise ÖLÜ.
`stop_reason: other` veya neden alanının eksikliği kesin kök neden kanıtı değildir; kök
neden bilinmiyorsa bilinmiyor de. Dosya çakışması kanıtı yoksa çakışma deme.
`stop_reason` `null` ama `ended` yok ve `last_seen` 10 dakikadan eskiyse **KAYIP** —
arka planda düşmüş, yoklama yapma.

Şu formatta bas, başka hiçbir şey yazma:

```
PROJE  ████████████░░░░░░░░  7/12

  ✓ T1  Solver çekirdeği          builder/opus
  ✓ T2  Vektör matrisi            builder/sonnet
  ▸ T3  Makro motoru              builder/opus       tur 2
  ● T4  Ayarlar paneli            ui-builder     HAZIR (T3 bitti)
  ⏸ T5  Paketleme                 scribe         bekliyor: T4
  ⨯ T6  İkon üretimi              scribe         engelli: kaynak görsel yok

AJANLAR
  ⚙ T3  builder          ███████░░░░░  34/60   Edit macro.cjs            2 dk önce
  ⨯ T4  ui-builder   ██░░░░░░░░░░   9/60   ÖLDÜ: max_tokens          8 dk önce
        son: "Tema tokenları yazıldı, panel entegrasyonu kaldı"
        dokundu: src/theme/tokens.ts, src/App.tsx

AÇIKTA  2 madde
  1. ikon setini de tema tokenlarına bağla
  2. README'ye kurulum adımı

SON     T3 failed · round 1, kabul 2
KALAN   5 sözleşme · 2 paralel yürüyebilir
RİSK    T6 engelli — kaynak görsel yok, senden gelmesi lazım
```

`AÇIKTA` bölümü `live/_acik.json` → `acikta[]` dizisinden gelir: cevaplanmamış
kesintilerin kuyruğu. Dizi boşsa bölümü hiç basma. Dosyadaki `simdi` ve `sirada`
alanları tek satırdır; `simdi` boş değilse `SON` satırının üstüne
`ŞİMDİ    <simdi>`, `sirada` boş değilse `KALAN`ın altına `SIRADA   <sirada>` yaz.

**Aşama sonu ve kapanış raporu `acikta` boşalmadan kapanmaz.** Açık madde varken
"bitti" deme: her maddeyi ya cevapla, ya bir sözleşmeye işle, ya kullanıcıya neden
düştüğünü söyle — sonra `acikta`'dan çıkar.

Ajan satırında `model` alanı varsa rolün yanına yaz — ajan tanımındaki `model:`/`effort:`
ile uyuşmuyorsa **beyan ile gerçek ayrışmış** demektir, RİSK satırına al. `last_error`
alanı varsa son araç hatasını da göster.

`live/_kesinti.json` doluysa KALAN'ın altına tek satır: `KESİNTİ  <sebep> · <zaman>`.
`rate_limit` görürsen "limite çarpıldı, kayıt noktası mühürlü" de — kullanıcı yeni
oturumda kaldığı yerden devam edebilir.

`KALAN` her zaman basılır. `RİSK` sadece gerçekten engel, ölü ajan, tavana yaklaşan
düzeltme turu veya sahipsiz dosya varsa basılır — uydurma, yoksa satırı yazma.

`ayrinti` argümanı verildiyse `active` ve `blocked` sözleşmelerin **Kabul kriteri**
bölümlerini de aç, her biri için karşılanan/kalan maddeleri işaretle. Bayraksız
çağrıda gövdeleri açma.

Sözleşme simgeleri: ✓ done · ▸ active · ● hazır · ⏸ waiting · ⨯ blocked
Ajan simgeleri: ⚙ çalışıyor · ✓ bitti · ⨯ ölü

Ölü ajan varsa listenin altına tek satır ekle: `→ /update ayrinti ile kurtarılabilir`.
Ajan yoksa AJANLAR bölümünü hiç basma.

## `--guncelle` verildiyse

`$ARGUMENTS` içinde `--guncelle` **varsa** panoyu bastıktan sonra güncellemeyi sen
çalıştır:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/surum.js" guncelle
```

Betik komutu çalıştırır, sonra kurulu sürümü hedefle karşılaştırır ve tuttu mu söyler.
Çıktısını olduğu gibi bas. Üç durumu da hata gibi sunma, olduğu gibi aktar:

- **güncellendi** — kullanıcıya kalan tek iş Claude Code'u yeniden başlatmak, bunu söyle.
- **güncelleme tutmadı** — komut çalıştı ama kurulu sürüm hedefe ulaşmadı. Sebebi genellikle
  depo sürümünün etiketlenmemiş olmasıdır; `etiket` satırını burada tekrar hatırlat.
- **güncelleme çalışmadı** — sebebi tek satırda bas, elle çalıştırılacak komutu ver.
  **Panonun geri kalanını yine bas**, güncelleme başarısızlığı panoyu iptal etmez.

`eklenti.yeni` yanlışken `--guncelle` gelirse zaten güncel olduğunu söyle ve betiği yine de
çalıştır — kullanıcı açıkça istedi.

**Ağ yoksa `eklenti` ve `depo` `null` gelir.** O iki satıra "bakılamadı" yaz, gerisini
yine bas; bunu hata gibi sunma. Betik ağ yoklamasını 3 saniyeyle sınırlar, ikisini paralel
sorar — pano her hâlükârda döner. `eklenti.kurulu` da boşsa eklenti kaydı okunamıyor
demektir, `/setup` öner.

`kayit` boşsa kayıt hiç alınmamıştır: tek satırda `/save` öner. `kayit.ayna` `yok` ya da
`hata` ise kayıt **yalnız bu makinede** duruyor demektir — başka makinede `/load` onu
bulamaz; bunu açıkça söyle.

Güncelleme yapıldıysa (kullanıcı elle çalıştırmış olsun, sen `--guncelle` ile çalıştırmış
ol) sonuna şu hatırlatmayı ekle: **eklenti güncellemesi ajan dosyalarını
profil varsayılanına döndürür.** Güncelledikten sonra `/premium durum` uyuşmazlığı söyler,
`/premium <profil>` geri uygular. Kullanıcı premium ya da eco kullanıyorsa bu adım
atlanırsa profili sessizce normale döner.

Açılışta da günde bir kez kendiliğinden sürüme bakılır ve yeni sürüm varsa
`Teknesyum ▸ Güncelleme ▸ …` satırı çıkar. Satır çıkmıyorsa bu "güncelsin" demek değil:
ağ yokken hiçbir şey yazılmaz.
