# MetaGPT

## 1. Ne yapıyor, hangi problemi çözüyor

Tek satırlık bir gereksinimi alıp bir yazılım şirketi gibi işleyen ajan takımına
dağıtıyor: ürün müdürü, mimar, proje yöneticisi, mühendis. Slogan `Code = SOP(Team)` —
insan iş akışlarını (standart işletim prosedürü) prompt dizisine gömüyor.

Bizim sorunumuz açısından değeri: **ajanlar arası iletişimi mesajlaşma değil, abonelikli
yayın olarak kurmuş olması.** Blackboard desenini kullanan tek aday bu.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

`metagpt/` altında `roles/`, `actions/`, `environment/`, `team.py`, `memory/`.

Sınır şu: **rol doğrudan role konuşmuyor.** Herkes `Environment`'a yayın yapıyor,
`Environment` mesajı kimin okuyacağına kendi karar veriyor.

`environment/base_env.py` içinde:

- `member_addrs: Dict[BaseRole, Set]` — hangi rolün hangi adreslere abone olduğu.
- `publish_message(message, peekable=True)` — mesajı havuza koyar, sonra tüm üyeler için
  `is_send_to(message, addrs)` kontrolüyle kimin tamponuna düşeceğini belirler.

`roles/role.py` tarafında karşılığı:

- `_watch(actions)` → `rc.watch` kümesini kurar; rol yalnız **belirli eylem tiplerinin
  çıktısını** izler.
- `set_addresses(addresses)` — varsayılan olarak rol kendi adına etiketli mesajlara abone.
- `_observe()` — tampondan yalnız izlenen mesajları alır.
- `max_react_loop` varsayılanı **1** — rol sonsuza kadar tepki veremez.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

Abonelikli mesaj havuzu. Ajan sayısı N iken naif çözüm herkesin herkesi okuması (N² mesaj
trafiği); MetaGPT bunu **her rolün yalnız izlediği eylem tipini okuması**na indiriyor.
Mühendis, mimarın çıktısını okur; ürün müdürünün ara tartışmasını okumaz.

Bu, bizim "brifing iki yönde token yakıyor" sorununun yapısal cevabı: brifing yazmak
yerine, ajanın neyi okuyacağını **abonelik olarak** tanımlıyorsun. Yeni ajan açtığında
brifing üretilmiyor; ajan zaten paylaşılan havuzdan kendi payını çekiyor.

İkinci direk SOP: rol sırası ve her rolün üreteceği belge sabit. Ajanlar "ne yapayım"
tartışmasına girmiyor — bu tartışma bizim koşularımızda da token yakan kalemlerden biri.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`pip install --upgrade metagpt`, Python 3.9–3.11 arası (3.12 desteklenmiyor).
Ayrıca **node ve pnpm kurulu olmalı**. `metagpt --init-config` ile
`~/.metagpt/config2.yaml` üretiliyor, API anahtarı oraya yazılıyor.

Çalıştırma tek satır: `metagpt "Create a 2048 game"` → `./workspace` altında depo.
Kütüphane olarak `generate_repo()` ya da `DataInterpreter`.

Hata hâli belgede öne çıkmıyor; `max_react_loop` dışında bütçe veya durdurma mekanizması
görünmüyor.

## 5. Alınmaya değer en fazla 3 fikir

**1. Abonelik ile brifing yerine geçmek.**
Ne: ajan brifingi yazmak yerine, ajanın hangi çıktı tiplerini okuyacağını tanımla
(`_watch`). Ajan açılırken bağlam kopyalanmaz, ajan paylaşılan kayıttan kendi payını
okur.
Neden değerli: bench'te base'li koşu 226.856, base'siz 113.000 token. Aradaki 113.856
token'ın ana kalemi brifing + rapor. 4 ajanlı koşuda ajan başına ~28k düşüyor; brifing
bunun yarısıysa abonelik deseni ~56k, yani toplam maliyetin **%25'i** kadar bir kalemi
hedefliyor.
Maliyet: orta-yüksek. Bizde paylaşılan kayıt (relay sözleşmeleri, kayıt noktaları) zaten
dosyada, ama ajanlar bunu şu an okumuyor — okuma sözleşmesi ve etiketleme şeması
gerekiyor. Ayrıca abonelik yanlışsa ajan eksik bağlamla çalışır, bu da doğruluk riski.

**2. Rol sırasını sabitle, "ne yapayım" turunu kaldır.**
Ne: SOP — hangi rol hangi sırayla hangi belgeyi üretir, önceden yazılı. Rol
`max_react_loop = 1` ile tek turda işini yapar.
Neden değerli: `premium` koşusu iki kez koşuldu ve kod boyutu 2825 satıra karşı 1411
satır çıktı — aynı profil, iki kat fark. Bu varyansın kaynağı sabit olmayan planlama.
Sabit SOP varyansı düşürür; ölçüsü kod boyutu ve token'ın koşular arası standart sapması.
Maliyet: esneklik kaybı. Chess960 hamle üreteci gibi tek tip işte kazandırır, keşif
gerektiren işte zarar verir.

**3. Yayın kapsamını mesaj başına belirle.**
Ne: `publish_message` mesajı havuza koyarken `is_send_to` ile alıcı kümesini daraltıyor;
yayın "herkese" değil, "abonelere".
Neden değerli: bizde ana oturum her ajana aynı brifingi veriyor. Mesaj başına kapsam,
denetçiye giden ile işçiye giden bağlamı ayırmayı ölçülebilir kılar — denetçi kaç token
okuyor, işçi kaç token okuyor, ayrı sayılır.
Maliyet: düşük — etiketleme kuralı, kod değil.

## 6. Şüpheli/riskli yanlar

- **Lisans:** MIT (`gh api`, README rozeti). OSI onaylı. Marka için ayrı koruma metni bu
  taramada bulunmadı. Depo sahipliği `geekan/MetaGPT` → **`FoundationAgents/MetaGPT`**
  olarak değişmiş; eski yollara dayanan otomasyon yönlendirmeye takılır.
- **Son etiketli sürüm `v0.8.1`, 2024-04-22 — iki yıldan eski.** Son push 2026-01-21,
  yani 7 ay önce. Depo canlı değil; ekip ticari ürüne (`mgx.dev`) geçmiş.
- **Açık issue: 131** (2026-08-22). Yıldız sayısına (69.945) göre çok düşük — issue'ların
  aktif olarak triyaj edildiğini değil, muhtemelen ilgilenilmediğini gösteriyor.
- **README pazarlama ağırlıklı.** "#1 Product of the Week on ProductHunt" tipi ifadeler
  var; ProductHunt sıralaması yazılımın kalitesi hakkında bilgi vermez.
- **Makale iddiaları doğrulanamadı.** MetaGPT makalesi (arXiv 2308.00352) özetinde
  sayısal skor veya görev başına dolar maliyeti **yok** — özet yalnız "daha tutarlı çözüm
  üretiyor" diyor. Üçüncü taraf kaynaklarda dolaşan "görev başına ~$1 maliyet" tipi
  rakamlar bu taramada birincil kaynaktan **doğrulanamadı**; rapora alınmadı.
- **Token ölçümü yok.** Kod tarafında crew/team düzeyinde token veya maliyet toplayan bir
  yapı bu taramada bulunamadı. Yani abonelik deseninin kazandırdığı token miktarı
  projenin kendisi tarafından da ölçülmüyor — **desen mantıklı, kazancı kanıtlı değil.**
- **Gizli kurulum maliyeti:** Python 3.9–3.11 aralığı (3.12 dışarıda) + node + pnpm.
  Üç ayrı çalışma zamanı.

## Kaynaklar

- `gh api repos/geekan/MetaGPT` → `FoundationAgents/MetaGPT` — 69.945 yıldız, 131 açık
  issue, MIT, son push 2026-01-21T10:12:33Z, oluşturma 2023-06-30.
- `gh api repos/geekan/MetaGPT/releases/latest` — `v0.8.1`, 2024-04-22T10:56:23Z.
- README — `Code = SOP(Team)`, kurulum, node/pnpm şartı, sürüm aralığı, MGX duyuruları.
- `metagpt/environment/base_env.py` — `member_addrs`, `publish_message`, `is_send_to`.
- `metagpt/roles/role.py` — `_watch`, `rc.watch`, `is_watch`, `set_addresses`,
  `_observe`, `max_react_loop` (varsayılan 1).
- https://arxiv.org/abs/2308.00352 — özet metni; sayısal maliyet iddiası içermiyor.
