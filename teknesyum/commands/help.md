---
description: What Teknesyum Base does and when — one screen
---

Kullanıcı ne olduğunu soruyor. **Dosya okuma, tarama yapma, ajan açma.** Aşağıdakini
`~/.claude/teknesyum.json` içindeki `dil` alanının dilinde yaz (yoksa Türkçe), sonuna
tek satır ekle: bu makinede kurulum eksikse ne eksik.

Bu paket kendiliğinden çalışır. Aşağıdaki komutların hiçbirini ezberlemen gerekmez —
sadece ne istediğini söyle.

**Kendiliğinden olanlar**

- **İş dağıtımı.** Bir şey istediğinde işin büyüklüğü ölçülür; küçükse doğrudan yapılır,
  büyükse sözleşmelere bölünüp ajanlara verilir. Sen sormazsın, sana sorulmaz.
- **Güvenlik noktası.** Dosya değişecekse önce git commit'i atılır.
- **Denetim.** Kodu yazan ajan kendi işini onaylayamaz; ayrı bir denetçi bakar.
  Denetçi hiçbir şey yazamaz ve komut çalıştıramaz.
- **Sürdürme.** Oturum kapanır, bağlam dolar, ajan ölürse — yeni oturumda kaldığın
  yerden devam edilir. "Devam" demene bile gerek yok. Sürdürülen şey sözleşmelerdir;
  konuşmanın kendisini taşımak istersen `/save` ile mühürler, `/load` ile açarsın.
- **Arayüz standardı.** Arayüz yazılan her yerde aynı palet, tipografi ve imza.
- **Sürüm haberi.** Yeni sürüm çıktığında açılışta günde bir kez söylenir. Ağ yoksa
  hiçbir şey yazılmaz — satırın çıkmaması "güncelsin" demek değildir, `/update` sorar.

**Komutlar — hepsi isteğe bağlı**

| Komut | Ne zaman |
|---|---|
| `/rule` | "Bunu bir daha yapma." Kalıcı kural kaydeder, doğru katmana yazar |
| `/setup` | Makineyi bağlar: statusline, dil tercihi, dil sunucusu. Kurulumda bir kez |
| `/uisetup` | Arayüz standardını değiştirir veya tamamen kapatır |
| `/premium` | Max 20x profili: opus, xhigh efor, altı paralel ajan, plan konseyi. `durum` ile bak |
| `/log` | Açık hata günlüklerini listeler, okur ve çözüldükçe kapatır |
| `/pusla` | "Puşla." Testler, genel depo, sonra özel ayna — iki depo tek akışta |
| `/scan` | "Bu proje premium standardını karşılıyor mu?" Eksikleri madde madde sayar |
| `/save` | Bu oturumu diske yazar: konuşma, bağlam, git durumu, gönderilmemiş metin |
| `/load` | Kayıtlı oturumu geri okur, kaldığın yerden devam eder |
| `/saveall` | Bütün projelerin son oturumunu kendi klasörlerine kaydeder |
| `/loadall` | Bütün projelerin genel durumunu tek ekranda yükler |
| `/rc` | Bu projeyi telefondan sürülebilir yapar: uzak denetim oturumu açar |
| `/update` | Sürüm, depo, profil, açık iş, son kayıt — ve röle durumu |
| `/ekran` | Ekran kapısını bir tur açar — ajan masaüstüne dokunabilir |
| `/help` | Bu ekran |

**Komut değil ama duruyor**

Altı iş slash komutu olarak yüklenmiyor; hepsi çalışıyor, çağırma yolu şu.
`<eklenti>` = `${CLAUDE_PLUGIN_ROOT}`, çözülmezse `~/.claude/plugins/**/teknesyum`.

| İş | Çağrı |
|---|---|
| `/beep` sesli bildirim | `node <eklenti>/scripts/beep.js` — argümanlar eski komutla aynı |
| `/ozel` kişisel depo | `node <eklenti>/scripts/ozel.js` — `kur`, `ekle`, `cek`, `projeler` |
| `/autocompact` sıkıştırma penceresi | `node <eklenti>/scripts/premium.js autocompact` |
| `/report` röle ilerlemesi | `/update` panosunun röle bölümü · statusline |
| `/rcadvanced` seçenekli uzak denetim | `/rc --gelismis` |
| `/rcall` bütün projeler | `/rc --hepsi` |

**Bilmek işine yarayacak iki sınır**

- Alt ajanın kaç adım ilerlediği ölçülemez — statusline kimin çalıştığını ve ne
  kadardır çalıştığını gösterir, yüzde göstermez. Uydurmaz.
- Bitmiş sözleşme kilitlenir. `done/` altına yalnız canonical tamamlama komutu girer;
  kabuktan taşımak da engellenir.
