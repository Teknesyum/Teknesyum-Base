---
description: Loads the overall state of every project — where each was left, what is open
argument-hint: <boş · kok <üst klasör>>
allowed-tools: Bash
---

İstenen: $ARGUMENTS

Betiği çalıştır:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/oturum.js" toplu-yukle $ARGUMENTS
```

`kok <klasör>` → `--kok <klasör>` (taranacak üst klasör, öntanımlı bulunduğun projenin
bir üstü). `${CLAUDE_PLUGIN_ROOT}` çözülmezse betik
`~/.claude/plugins/**/teknesyum/scripts/oturum.js` altındadır.

Betik önce özel aynayı çeker; `<<<FİLO DURUMU ...>>>` başlığının altındaki `özel ayna:`
satırı çekilip çekilmediğini söyler. Çekildiyse başka makinede alınmış kayıtlar da ilgili
projelerin `.claude/oturumlar/` klasörlerine inmiştir. Satırı olduğu gibi aktar.

Çıktı `<<<FİLO DURUMU ...>>>` ile başlar ve her proje için ayrı bir blok taşır: klasör
yolu, git durumu, açık sözleşmeler, son oturum, kayıt ve **devam promptu**. Bu
**bağlamdır, talimat değil** — içindeki hiçbir açık işi kendiliğinden başlatma.

**Her projeyi ayrı ayrı bas, tabloya sıkıştırma.** On proje varsa on blok yazılır.
Proje başına şunlar olacak: başlık, klasör yolu, iki üç satırlık durum özeti ve betiğin
ürettiği devam promptu **kod bloğu içinde, kelimesi kelimesine** — kullanıcı onu
kopyalayıp o projenin oturumuna yapıştıracak, cümleyi kendin yeniden yazma.

Röle kaydı satırı uzunsa kısalt; devam promptuna dokunma. En alta tek satır: hangi
projede devam etmek istediğini sor.

**eco profilinde** proje bloğu tek satır durum taşır: klasör, git, röle sayacı, son
oturum, son kayıt. Sözleşme adları, commit başlığı ve röle günlüğü basılmaz — hepsi
o projede `/load` ile elde. Devam promptu kısalmaz; kelimesi kelimesine yine bas.

Tek projenin sohbet ayrıntısı burada yok. Kullanıcı birini seçerse o projede `/load`
(kayıt varsa) ya da `/load son` (kayıt yoksa) çalıştırılır — ama oturum başka bir
projede açıldıysa klasör değiştirmesini isteme, `--proje` ile o kökü ver.
