---
description: Adamantium Base neyi ne zaman yapar — tek ekran
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
  yerden devam edilir. "Devam" demene bile gerek yok.
- **Arayüz standardı.** Arayüz yazılan her yerde aynı palet, tipografi ve imza.

**Komutlar — hepsi isteğe bağlı**

| Komut | Ne zaman |
|---|---|
| `/report` | "Nerede kaldık?" Açık sözleşmeler, çalışan ajanlar, kalan iş |
| `/rule` | "Bunu bir daha yapma." Kalıcı kural kaydeder, doğru katmana yazar |
| `/setup` | Makineyi bağlar: statusline, dil tercihi, dil sunucusu. Kurulumda bir kez |
| `/uisetup` | Arayüz standardını değiştirir veya tamamen kapatır |
| `/help` | Bu ekran |

**Bilmek işine yarayacak iki sınır**

- Alt ajanın kaç adım ilerlediği ölçülemez — statusline kimin çalıştığını ve ne
  kadardır çalıştığını gösterir, yüzde göstermez. Uydurmaz.
- Bitmiş sözleşme kilitlenir. Mühürsüz bir dosya `done/` altına giremez; kabuktan
  taşımak da engellenir.
