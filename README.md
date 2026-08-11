# Teknesyum Çalışma Düzeni

Claude Code için tek paket: neon arayüz standardı + çok ajanlı iş rölesi.

Talebini söylersin. İşin büyüklüğünü, kaç parçaya bölüneceğini, hangi ajanın hangi modelle
çalışacağını, denetimin nasıl yapılacağını sistem kurar. Sen süreci yönetmezsin.

## Kurulum

```
/plugin marketplace add Teknesyum/teknesyum-claude
```

```
/plugin install teknesyum@teknesyum
```

Sonra Claude Code'u yeniden başlat ve bir kez çalıştır:

```
/kurulum
```

Bu komut plugin'in taşıyamadığı iki şeyi bağlar: statusline ve huy dosyası.

## İçindekiler

**Skill'ler**
- `relay` — giriş kapısı. Her talepte iş büyüklüğünü ölçer, hazırlığı yapar, dağıtır.
- `teknesyum-ui` — neon palet, tipografi ölçeği, bileşen kalıpları, imza bloğu.
  Web, React, Electron, WPF, WinForms.

**Ajanlar**
- `usta` — kod yazar · `usta-arayuz` — arayüz yazar, tema önyüklü
- `denetci` — doğrular, **kod yazamaz** (araç listesinde Write/Edit yok)
- `kayitci` — mekanik toplu iş, haiku

**Komutlar**
- `/durum` — sözleşme ve ajan ilerlemesi · `/devam` — kesilen oturumu sürdürür
- `/iskele` — röleyi açıkça kurar · `/huy` — kalıcı kural ekler · `/kurulum`

**Hook'lar**
- `koru-sozlesme.js` — tamamlanmış sözleşmelere yazmayı engeller
- `relay-izle.js` — her ajanın izini diske yazar; ajan ölse bile kaldığı yer bilinir

**Statusline** — context %, plan limiti (5 saat / 7 gün), sözleşme ilerlemesi,
ajan başına tur bütçesi barı.

## Ayarlar

Davranış düğmeleri `skills/relay/AYAR.md` içinde: soru sıklığı, onay kapısı, denetim
kapsamı, düzeltme tavanı, model tırmanışı, paralel genişlik, worktree izolasyonu.

Proje bazında ezmek için o projede `.claude/relay/AYAR.md` oluştur.

## Neye dayanıyor

Gerçek bir projede ölçüldü: 8 sözleşme, 16 ajan, 4 gerçek hata yakalandı — ikisi ajanın
"yaptım" deyip aslında yazmadığı işlerdi, hiçbiri build veya lint ile yakalanmazdı.
Oturum limiti üç ajanı düşürdü, üçü de bağlamıyla diriltildi.

## Lisans

MIT
