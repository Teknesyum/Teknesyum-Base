---
description: Teknesyum Base neyi ne zaman yapar — tek ekran
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
| `/report` | "Nerede kaldık?" Açık sözleşmeler, çalışan ajanlar, kalan iş |
| `/rule` | "Bunu bir daha yapma." Kalıcı kural kaydeder, doğru katmana yazar |
| `/setup` | Makineyi bağlar: statusline, dil tercihi, dil sunucusu. Kurulumda bir kez |
| `/uisetup` | Arayüz standardını değiştirir veya tamamen kapatır |
| `/premium` | Max 20x profili: opus, xhigh efor, altı paralel ajan, plan konseyi. `durum` ile bak |
| `/beep` | Sesli bildirim: izin beklerken, tur biterken, tur hata verirken kısa ses çalar |
| `/ekran` | Ekran kapısını bir tur açar: ajan masaüstüne dokunabilir, sonraki turda kapanır |
| `/log` | Açık hata günlüklerini listeler, okur ve çözüldükçe kapatır |
| `/ozel` | Kişisel dosyaları tek private depoda tutar; depo parça parça çekilir, tamamı inmez |
| `/pusla` | "Puşla." Testler, genel depo, sonra özel ayna — iki depo tek akışta |
| `/scan` | "Bu proje premium standardını karşılıyor mu?" Eksikleri madde madde sayar |
| `/save` | Bu oturumu diske yazar: konuşma, bağlam, git durumu, gönderilmemiş metin |
| `/load` | Kayıtlı oturumu geri okur, kaldığın yerden devam eder |
| `/saveall` | Bütün projelerin son oturumunu kendi klasörlerine kaydeder |
| `/loadall` | Bütün projelerin genel durumunu tek ekranda yükler |
| `/rc` | Bu projeyi telefondan sürülebilir yapar: uzak denetim oturumu açar |
| `/rcall` | Aynısını üst klasördeki bütün projeler için yapar |
| `/rcadvanced` | Uzak denetimi seçenekleriyle açar: kip, izin, kapasite |
| `/update` | Yeni sürüm çıkmış mı bakar, güncelleme komutunu kopyalanabilir verir |
| `/help` | Bu ekran |

**Bilmek işine yarayacak iki sınır**

- Alt ajanın kaç adım ilerlediği ölçülemez — statusline kimin çalıştığını ve ne
  kadardır çalıştığını gösterir, yüzde göstermez. Uydurmaz.
- Bitmiş sözleşme kilitlenir. Mühürsüz bir dosya `done/` altına giremez; kabuktan
  taşımak da engellenir.
