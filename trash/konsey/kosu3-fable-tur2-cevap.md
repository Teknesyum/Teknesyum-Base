# fable — tur 2 (çapraz okuma ve uzatma kararı)

## Y1 · Ayrışma kuralı

opus'un üç eklemesini de alıyorum. Nesne şartı benim tur 1 metnimde zaten vardı;
opus'un netleştirdiği uç durum — **nesnesiz uzat oyu oy sayılmaz, kapatma geçerli olur** —
kuralımla uyumlu, çünkü "uzat tek imza" ancak nesneli oy için geçerliydi. `uzatma_karari`
alanını ve `ayrisma-uzat` dedektörünü alıyorum. Cırcır sınırını alıyorum, bir şerhle: bu
koşullu kural **şimdi** yazılmalı ki Y4'teki dondurmayla çelişmesin — koşulu önceden
yazılmış kuralın tetiklenmesi protokol değişikliği sayılmaz, dondurma onu kilitleyemez.

Soy korelasyonu uyarım karşılanıyor: kural çoğunluk değil asimetrik eşik olduğu için opus
soyunun iki koltukta olması kapatmayı dayatamaz — fable'ın nesneli uzat oyu tek başına
yeter. Kalan artık: fable kapat / yönetici-opus uzat ayrışmasında uzatan, kapsayan ve
birinci koltuk aynı soy olur; bu engellenmez, yalnız `ayrisma-uzat` + `masa_kompozisyonu`
birlikte okunarak görünür kalır. Kabul.

## Y2 · `uzatildi_mi` — pozisyon değişikliği

**Geri çekiyorum, tip: bulgu.** Gerekçem "uzatma oranı metriği buna bağlı" idi; opus'un
nesnesi gerekçeyi boşaltıyor: oran `tur > 1`'den ve daha iyisi `uzatma_karari`ndan
türetiliyor, üstelik 5c guard'ı türetmenin güvenilirliğini kapatıyor. `uzatildi_mi`
düşsün, `uzatma_karari` gelsin. Tek şart: 5c guard'ı aynı değişiklikte girer.

## Y3 · opus'un beş nesnesi

1. **Model klişesi kuralı — alıyorum.** En zayıf halka tespitine katılıyorum; benim "geri
   çekme yönü" sayacım bununla tamamlayıcıdır, ikame değil — klişe kuralı tekil vakayı,
   yön sayacı birikimi yakalar.
2. **Sızıntı — alıyorum.** Tur 1 pozisyonumu güçlendirir, değiştirmez.
3. **`masa_kompozisyonu` — zaten aynı pozisyondaydım.** Koltuk takası nesnesi benim
   "koltuk/model ayrımı" gerekçemin somut vakası.
4. **`tasiyici_madde_sayisi` — alıyorum.** Görmediğim gerçek bulgu; paydasız sayaç koşu
   3'ü mekanikten bağımsız "daha iyi" gösterirdi.
5. **Çözücü-gözlem şartı — kısmen alıyorum, burada ayrışıyorum.** Şartın hedefi doğru
   (bedava valf), ama bilinen sapma yönü erken kapatmayken tek karşı-yönlü valfi
   daraltmanın bir kaçağı var: gerçek belirsizlik bazen çözücü gözlemi **adlandıramaz** —
   üye o durumda ya sahte gözlem uydurur ya "emin değilim" yazmaktan vazgeçip tahmine
   döner; ikincisi sessiz ve daha kötü. Önerim: gözlem adlandıran valfi tetikler;
   adlandıramayan tetiklemez ama **`gozlemsiz_belirsizlik` olarak loglanır**.

## Y4 · Dondurma

**Katılıyorum**, üç parçasıyla. Tek ekim Y1'deki şerh: koşullu kurallar dondurmadan
**önce** metne girer; sonrası uygulamadır, değişiklik değil.

## Y5 · Benim nesnelerim

- **Okuma sırası dönüşümü — geçerli, kısmen karşılanmış.** opus'un 1b kuralı tekil klişe
  reddini yakalar ama birikimli yönlü deferansa düzeltici eylem önermez.
- **Geç tur kalitesi — geçerli, opus'ta hiç yok.** Sürdürülen oturum + tavan 4 bağlam
  şişmesi; dedektör geç turlarda nesnesiz oran artışı.
- **Log kırılması — geçerli, opus'un 5c'si komşu ama farklı.**

## Uzatma oyum

**Uzat.** Ek kapsamım: (1) çözücü-gözlem şartının yumuşatmayla mı sertiyle mi gireceği,
(2) koşullu kuralların dondurma öncesi metne girip girmeyeceği.

| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
|---|---|---|---|---|
| Y1 · ayrışma kuralı | opus'un üç eklemesi kabul | hayır | bulgu | nesnesiz uzat oyu oy sayılmaz |
| Y1b · soy korelasyonu | karşılanıyor, log ile izlenir | hayır | bulgu | asimetrik eşik çoğunluk değil |
| Y2 · `uzatildi_mi` | düşsün — pozisyon değişti | **evet** | bulgu | türetilebilir; şart: 5c guard aynı değişiklikte |
| Y3-1 · model klişesi | kural kabul | hayır | bulgu | tekil vaka / birikim ayrımı |
| Y3-4 · payda | `tasiyici_madde_sayisi` kabul | hayır | bulgu | paydasız sayaç yanlış okunur |
| Y3-5 · çözücü-gözlem şartı | kısmen — yumuşatılmış biçim | hayır | bulgu | gözlem adlandıramayan belirsizlik sessiz tahmine zorlanır |
| Y4 · dondurma | kabul, koşullu kurallar önce girer | hayır | bulgu | dondurma emniyet valflerini de kilitler |
| Y4-5a · protokol konulu koşular | fayda ortalamasına girmesin | hayır | bulgu | `yeniden_ele_alindi` bu sınıfta yapısal ölü |
| Y5-1 · okuma sırası | kural dondurma öncesi yazılsın | hayır | bulgu | üç koşu tek yönlü → sıra dönüşümü |
| Y5-2 · geç tur kalitesi | geçerli, karşılanmadı | hayır | bulgu | geç turda nesnesiz oran |
| Y5-3 · log kırılması | geçerli, 5c ile birlikte | hayır | bulgu | eski satır dokunulmaz + guard ayrı nesneler |
