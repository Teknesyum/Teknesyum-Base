# Tur raporu · 23.08.2026 — özel ayna, puşla tetikleyicisi, bitiş sesi

**Sözleşmesiz tur.** Bu turdaki iş doğrudan yapıldı, açık sözleşmelerin hiçbirine
dokunulmadı. Aşağıdaki dört sözleşme önceki oturumlardan `submitted` hâlinde duruyor ve
bu turda ilerletilmedi.

## Bu turda ne yapıldı

| İş | Nerede | Durum |
|---|---|---|
| Bitiş sesi `Stop` kancasından alınıp tur makbuzuna bağlandı | `hooks/relay-watch.js` → `turBitir`, `hooks/hooks.json` | bitti |
| `/ozel` — kişisel dosyalar için kısmi private ayna | `scripts/ozel.js`, `commands/ozel.md` | bitti |
| `/pusla` — iki depolu gönderim akışı | `commands/pusla.md` | bitti |
| "puşla" sözünün kancadan tetiklenmesi | `hooks/relay-watch.js` → `puslaHatirlat`, `hooks/dil.js` → `puslaAkisi` | bitti |
| `autoCompactWindow` çıktısına yeniden başlatma + tavan notu | `scripts/premium.js` | bitti |
| `baglamEkle` — aynı turda ikinci bağlam yazımı birinciyi siliyordu | `hooks/relay-watch.js` | düzeltildi |
| `realpath` normalizasyonu (Windows 8.3 kısa yol) | `scripts/ozel.js` | düzeltildi |
| `sparse-checkout reapply` ölçülü ikinci geçiş | `scripts/ozel.js` | düzeltildi |
| `.github/FUNDING.yml` | depo kökü | eklendi |

Sürüm `2.45.1`, gönderildi, eklenti önbelleği güncellendi. 382/382 test geçiyor.
Ayrıntı: `CHANGELOG.md` → `[2.45.1]`.

## Dış kaynak değerlendirmeleri

- **GitHub Sponsors iframe'leri:** imza bloğuna alınmadı. Temalanamıyor, WPF'te iframe
  yok, her açılışta ağ isteği doğuruyor, Electron CSP'si keser, 600px kart hiçbir yüzeye
  sığmıyor. Depo sayfası için doğru karşılığı `.github/FUNDING.yml`; o eklendi.
- **github.com/Leonxlnx/unlazy:** alınmaya değer tek fikir koşulabilir kabul kriteri.
  Aşağıdaki açık soru bu.

## Açık sözleşmeler — bu turda dokunulmadı

| Sözleşme | Durum | Ne bekliyor |
|---|---|---|
| `E1` ekran kapısı | submitted, tur 2 | denetim / mühür |
| `S1` `/scan ui` | submitted | denetim / mühür |
| `T2` düğmeler enjeksiyona | submitted, tur 2 | denetim / mühür |
| `U1` UI dalga 1 | submitted, tur 1 | denetim / mühür |

`T1` mühürlü.

## Açık soru

Koşulabilir kabul kriteri eklensin mi? Fable'ın sadeleştirdiği hâliyle:

- Kriterin yanına isteğe bağlı `CHECK:` satırı (hangi komut kanıt sayılıyor)
- Komutu **T0 koşar**, çıkış kodunu ve çıktısını sözleşmeye yapıştırır
- Auditor'a `Bash` **verilmez** — "hiçbir şey çalıştıramaz" garantisi korunur
- Zorunluluk denetim eşiğine bağlı: `high` ve üstünde `CHECK`siz kriter sözleşmeye
  giremez, altında serbest
- Asıl şart çıkış kodu `0`; `EXPECT` metin eşleşmesi kırılgan olduğu için isteğe bağlı
