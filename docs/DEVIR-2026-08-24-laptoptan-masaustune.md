# Devir notu — laptoptan masaüstüne, 24.08.2026

Bu not, makine değiştiğinde "nerede kalmıştık"ın yeniden kazılmaması için yazıldı.
Laptop oturumu burada kapandı; masaüstü oturumu buradan devam eder.

**Durum:** sürüm `2.51.0`, çalışma ağacı temiz, testler **420/420**.
`origin/main` bu notla birlikte güncellendi — masaüstünde ilk iş `git pull`.

---

## 1. Bu oturumda ne yapıldı

Kullanıcının duran talimatı: *"benim sana herhangi bir talimatımdan önce logları
istediğin sırayla bitir, ondan sonra benim talimatımı hallet."* Oturum bu kurala göre
açık hata günlüklerine ayrıldı.

**Kapatılan beş günlük** (`docs/openlogs/kapali/` altında, içerikleri duruyor):

| Günlük | Ne yapıldı |
|---|---|
| `sohbet-metni-duz-yazi-duvari` | `relay` §7.0 — düz yazı duvarı yasağı, kapsamı sohbet çıktısı |
| `surum-gomulu-yol-eski-standardi-okuyor` | `relay` §7.0.1 + `hooks/ortak.js` → `kuruluEklentiKoku()` |
| `ikinci-gorus-tetiklenmiyor` | `relay-watch` → `gorusGerekenler()` + `gorusKaydet()`, `GORUS.md` |
| `denetim-turu-durdurma-kurali-yok` | `auditor.md` KRİTİK/BORÇ, `protocol.md` §4 durdurma kuralı, `borc: []` |
| `olcum-beklemesi-kullaniciyi-bekletiyor` | `relay` §3.3 gözcü kalıbı, §6 ölçüm tekrarı kapısı |

Beşinin de ölçüsü `test/run.js` içinde kilitli — kural gevşerse test düşer, günlük
sessizce geri gelmez.

**Ortaya çıkan desen.** Beş günlüğün beşi de aynı şeyi söylüyordu: *kural vardı, onu
okuma anı yoktu.* Bu yüzden çözümlerin hepsi "kuralı daha iyi yaz" değil, **kuralı
okunan yere koy** ya da **kancaya bağla** biçiminde oldu. `gorusGerekenler()` bunun en
saf örneği: liste beş tur boyunca modelin dikkatindeydi ve hiç ateşlenmedi; şimdi
sözleşme dosyasından okunuyor.

---

## 2. Açık kalan işler — sıralı

### 2.1 Günlükler (talimat sırası: her şeyden önce)

Kalan **yedi** açık günlük. `/log` ile listelenir.

| Günlük | Durum |
|---|---|
| `lisans-adimi-yok` | Üç maddesi kapandı ve `/scan` ile ölçülüyor. **Kalan:** `DCO` + `CONTRIBUTING.md` on depoya taşınacak — dışarı dönük iş, kullanıcının sözünü bekliyor. |
| `relay-skill-md-kendi-30-kb-tavaninin-iki-kati` | Bu oturumda **açıldı**. `SKILL.md` 62 kB, kendi §6'sının tavanı ~30 kB. Ne taşınacağı standart değiştirir — kullanıcıya sorulacak. |
| `200k-baglam-penceresi-iddiasi` | Ölçü 1-2 `docs/OLCUM-BUTCE.md` tarafında. |
| `imza-teknesyum-simgesi` | VidShrink tarafı. |
| `turkce-karakter-ps1-kodlama` | Üç ölçünün ikisi VidShrink tarafında. |
| `sohbet-metni-duz-yazi-duvari` | Ölçü 1 kapandı, ölçü 2 duruyor. |
| `surum-gomulu-yol-eski-standardi-okuyor` | Ölçü 1 kapandı, ölçü 2 duruyor. |

> Son ikisi listede hem burada hem "kapatılanlar"da görünmüyor: ölçü 1'leri kapandı,
> günlükleri arşivlendi. Ölçü 2'leri yeni günlük olarak değil, ilgili iş geldiğinde
> ele alınacak.

### 2.2 Kullanıcının verdiği, sırası günlüklerden sonra gelen iş

**Otomatik rapor.** Kullanıcının 24.08.2026'daki sözü: *"artık projeler rapor vermeleri
gereken yerlerde otomatik rapor versinler, benim yazmamı beklemesinler."*

Rapor anları `relay/references/protocol.md` §8'de zaten yazılı — açılış brifingi, dalga
başlangıcı, sözleşme kapanışı, dalga sonu ara raporu, sapma anı, kapanış raporu. Eksik
olan onların kendiliğinden çıkması. Yani bu, yukarıdaki desenin bir örneği daha: kural
yazılı, tetikleyen an yok. `relay-watch` sözleşme `status` geçişlerini zaten görüyor.

Hafızada da duruyor: `otomatik-rapor-istegi`.

### 2.3 Arayüz dalgası — yarım kalan yer

Sözleşmelerin son durumu:

| Sözleşme | status | tur | denetim |
|---|---|---|---|
| T1 | sealed | 3 | passed |
| U2 · U1 · S1 · E1 | submitted | 3-4 | **denetim bekliyor** |
| U4 · U7 · U8 · U9 | submitted | 1 | denetim bekliyor |
| U3 | active | 2 | tur 2 kriterleri yazıldı, koşulmadı |
| U6 | active | 0 | konsey sentezlendi, karar uygulandı |
| S2 · U5 · U10 · U11 | open | 0 | — |

**Dikkat:** E1 (tur 4), S1, U1 ve U2 (tur 3) artık `gorusGerekenler()` kapısını açıyor.
Yani masaüstünde ilk `UserPromptSubmit`'te bunlar için `advisor` hatırlatması çıkacak —
bu bir arıza değil, bu oturumda kurulan kapının kendisi.

Sıradaki iş: U3 tur 2 → U6 yapıcı → U5 (dalga D) → U10 birleştirme → U11 → S2.

### 2.4 Bekleyen kararlar

`abiye-sorulacak-kararlar` hafızasındaki altı kalem hâlâ cevapsız. Renk körlüğü
konusu kullanıcı tarafından **park edildi**: şimdilik yalnız normal görüş için en uygun
tema, gerekirse ileride ayrı bir tema.

Yeni ürün standardı (23.08.2026): **tema renkleri locales gibi tek bir yerde tutulur**,
tema eklemek tek dosya olmalıdır. `relay/references/standartlar.md` §5.

---

## 3. Masaüstünde ilk turda bakılacaklar

1. `git pull` — bu oturumun beş commit'i geliyor.
2. `node test/run.js` → **420/420** beklenir. Düşerse önce `command -v claude` bak:
   `rc`/`rcall` testleri `claude` PATH'te değilse çıkış 3 veriyor (bkz. hafıza
   `laptop-ortami-hazir`).
3. `/log` — yedi açık günlük listelenmeli.
4. Eklenti kurulu sürümü `2.51.0`; depo da 2.51.0. Bu oturumun değişiklikleri
   `[Unreleased]` altında, henüz sürümlenmedi.

## 4. Bu makinede kalan, repoya girmeyen şeyler

`~/.claude` altındaki kişisel dosyalar özel aynayla (`teknesyum-ozel`) taşınıyor:
`CLAUDE.md`, `RULES.md`, `settings.json`, `teknesyum.json`, `teknesyum-ui.json`.

**Ayna hafızayı taşımıyor.** `~/.claude/projects/<proje>/memory/` klasörü kayıtlı
dosyalar arasında yok; yani bu oturumda yazılan `otomatik-rapor-istegi` hafızası
masaüstüne kendiliğinden gelmiyor. Bu yüzden içeriği yukarıya, §2.2'ye açıkça yazıldı.

Hafıza klasörünü aynaya eklemek mümkün ama karar gerektiriyor: `/ozel cek` diskteki
dosyanın üzerine yazıyor, yani iki makinede ayrı ayrı büyümüş hafızalardan biri
diğerini ezebilir. Kullanıcı isterse `/ozel ekle` ile tek tek eklenir.
