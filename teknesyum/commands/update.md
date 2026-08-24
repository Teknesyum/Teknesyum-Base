---
description: Oturum durum panosu — eklenti, depo, profil, açık iş, son kayıt
argument-hint: [--guncelle]
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
