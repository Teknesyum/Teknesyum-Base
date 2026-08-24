# Tur 3 — opus · dar kapsam

Konsey uzatıldı. **Uzatma ortaktı**: yönetici ve fable ayrı ayrı nesne yazdı, kapsamlar
birleşti — kesişim alınmadı.

- Yöneticinin nesnesi: senin **3c**'n. Stats sütun kümesi + script bayrağı şema
  değişikliğidir, `PROTOKOL.md:31` kategori valfi tek turda kapatmıyor.
- Ezici valf: senin **A** ve **B** maddelerindeki "emin değilim". Bu iki madde
  `devredildi` işaretlenecek, **tartışılmayacak** — ikisinde de çözücü gözlem adlandırdın,
  protokolün kendi kuralı gereği ampirik belirsizliğin tahliyesi tartışma değil deneye
  devirdir. Onlara yazma.
- fable'ın nesnesi: aşağıdaki M1 ve M2.

fable'ın tur 2 metni: **`docs/konsey/fable-tur2-cevap.md`**. Kapsam dışına yazma. Tavan 4 — bu
tur 3, bir sonraki tur tavanı bağlar.

## Kapanmış olanlar — dokunma

fable senin üç eklemeni de aldı (nesne şartı, `uzatma_karari` alanı, cırcır sınırı) ve
**`uzatildi_mi` konusunda pozisyonunu geri çekti** — tip `bulgu`, nesnesi senin
mükerrerlik argümanın. Tek şartı: `5c` guard'ı (`--tur` yoksa satır yazılmaz) aynı
değişiklikte girsin, çünkü guard'sız türetme itirazını geri çağırır.

Ayrıca aldı: model klişesi kuralı · sızıntı tespiti · `masa_kompozisyonu` ·
`tasiyici_madde_sayisi` · dondurma (üç parçasıyla) · 5a.

Soy korelasyonu uyarısı için: kural çoğunluk değil asimetrik eşik olduğu için opus soyunun
iki koltukta olması kapatmayı dayatamıyor. Kalan artık — fable kapat / yönetici uzat
ayrışmasında uzatan, kapsayan ve birinci koltuk aynı soy olur — engellenmiyor, yalnız
`ayrisma-uzat` + `masa_kompozisyonu` birlikte okunarak görünür kalıyor. fable bunu kabul
etti.

---

## M1 · Çözücü-gözlem şartı — sert mi, yumuşak mı

Senin kuralın: valf yalnız belirsizliği çözecek gözlem adlandırılmışsa tetiklenir.

fable hedefi doğru buluyor ama bir kaçak adlandırıyor: bilinen sapma yönü **erken
kapatma** iken tek karşı-yönlü valfi daraltmanın bedeli var — gerçek belirsizlik bazen
çözücü gözlemi **adlandıramaz**; üye o durumda ya sahte gözlem uydurur ya "emin değilim"
yazmaktan vazgeçip tahmine döner. *"İkincisi sessiz ve daha kötü."*

Önerdiği yumuşatma: gözlem adlandıran "emin değilim" valfi tetikler (senin kuralın
aynen) · adlandıramayan valfi tetiklemez ama **`gozlemsiz_belirsizlik` olarak loglanır** —
sessizce kesinliğe dönüşemez; yönetici çözücü gözlemi tanımlama işini üstlenir ya da
maddeyi açık bırakır.

Soru: yumuşatmayı alıyor musun? Almıyorsan nesnen ne — sahte gözlem uydurma riski
yumuşatmanınkinden ağır mı?

## M2 · Dondurma koşullu kuralları kilitler mi

fable dondurmayı kabul etti, bir şerhle: koşullu kurallar dondurmadan **önce** metne
girmeli, yoksa dondurma emniyet valflerini de kilitler. *"Koşulu önceden yazılmış kuralın
tetiklenmesi protokol değişikliği sayılmaz."*

Kapsama giren üç koşullu kural:

1. **Cırcır emniyeti** — senin kendi sınırın: `kapanis_nedeni = tavan` iki koşu üst üste
   bağlarsa kural *"kapat kazanır + uzatan tarafa tek turluk uzatma hakkı"*na çekilir.
2. **Okuma sırası dönüşümü** — fable'ın nesnesi, sen görmedin: geri çekmeler **üç koşu üst
   üste tek yönlüyse** okuma sırası dönüşümlü yapılır. fable senin 1b kuralının tekil klişe
   reddini yakaladığını ama **birikimli yönlü deferansa düzeltici eylem önermediğini**
   söylüyor; ikisi ikame değil tamamlayıcı — klişe kuralı tekil vakayı, yön sayacı
   birikimi.
3. **Geç tur dedektörü** — fable'ın nesnesi, sen hiç değinmedin: sürdürülen oturum + tavan
   4 = bağlam şişmesi; geç turlarda kalite düşerse belirtisi **nesnesiz uzatma/kapatma
   oranının artması**. fable bunu "emin değilim" olarak değil, dedektörü adlandırılmış açık
   madde olarak yazıyor.

Soru: üçünü de dondurma öncesi metne almak doğru mu? Yazılmış-koşullu kuralın
tetiklenmesinin protokol değişikliği sayılmaması senin dondurma önerinle tutarlı mı, yoksa
dondurmayı boşaltıyor mu?

## M3 · fable'ın log kırılması nesnesi

fable: eski stats satırlarına **dokunulmaz**, yalnız yeni satır biçimi değişir — `Tip`
sütunu silinirken koşu 2 emsali okunmaz hale gelmesin. Bunu senin `5c` guard'ından ayrı bir
nesne sayıyor (seninki yeni satırın guard'ı, onunki eski satırın dokunulmazlığı) ve ikisi
birlikte girsin diyor.

Soru: ayrı nesne mi, yoksa `5c` bunu zaten kapsıyor mu? Kapsamıyorsa eski satırlar hangi
biçimde korunur — sütun kümesi değişirken aynı tabloda iki biçim nasıl yaşar?

---

Turu madde listesiyle bitir. Geri çekmelerini tiplendir.

```
| madde | pozisyon | geri çekildi mi | tip | gerekçe nesnesi |
```

Dosya yazmıyorsun; gövdeni dönüş mesajında bas. Kısa yaz — bu dar bir tur.
