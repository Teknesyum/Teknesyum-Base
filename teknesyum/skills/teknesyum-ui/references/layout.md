# teknesyum-ui — yerleşim, piksel disiplini, geri bildirim

`SKILL.md` §5 buradan devam eder. Panel, pencere veya sayfa yerleşimi kurarken okunur.

## 5.1 Piksel disiplini — kapanan çerçeveler, simetri

Neon tema anahat üstüne kuruludur; anahat yarım kalırsa tema yarım kalır. Aşağıdakiler
göz kararı değil hesap işidir.

**Kapalı kontur kendi çizim sınırından en az 1 DIP içeri alınır.** Kontrolün tam kenarına
çizilen çerçeve, DPI yuvarlamasında kenarın dışına taşar ve bir ya da iki kenarı kaybolur —
klasik "üç kenarı var, sağı yok" hatası. `Rectangle`/`Border` geometrisi sınırdan içeride
kurulur ve **dört kenarı da çalışan uygulamada** doğrulanır. Sağ ve alt kenar özellikle
kontrol edilir; kırpılma en çok orada olur.

**Hücre, içindeki nesnenin nominal ölçüsüne eşitlenmez.** Stroke kalınlığı, DPI yuvarlaması
ve her iki yanda en az 2 DIP güvenlik payı hesaba katılır: **20×20 çizilen bir onay
kutusunun hücresi 24×24**'tür. Nominal ölçüye eşitlenen hücre, %125 ölçeklemede kenarını yer.

**Simetri şart.** Yan yana duran kontrollerin köşe yarıçapı, yüksekliği, dikey merkezi ve
panellerin alt kenarı **piksel düzeyinde** eşleşir. Bir piksellik fark, yarım çizgi veya
kapanmayan anahat kabul edilmez — "neredeyse hizalı" hizasızdır.

**Yan yana kontroller birleşmez.** Aralarında açık boşluk bulunur; iki çerçeve birbirine
değip tek kalın çizgi görüntüsü vermez (§8 örtüşme kuralının kardeşi).

**Piksel yuvarlaması açık bırakılır.** WPF'te `UseLayoutRounding` ve `SnapsToDevicePixels`
kapatılmaz; kapatılırsa 1 DIP'lik çizgiler yarım piksele düşer ve gri görünür.

**Toplam yüksekliğe bağlanan döngüsel yerleşim kurma.** Bir sütunun yüksekliği içindeki
panellerin toplamına, panellerin yüksekliği de sütuna bağlanırsa ölçüm turlara girer ve
sonuç pencere boyutuna göre değişir. Panele **`MinHeight`** verilir (örn. kompakt çıktı
paneli 254 DIP), sütun ona uyar. **`Height` yazma** — sabit yükseklik, yazı tipi/DPI/dil
değişince içeriği keser; kesilen ilk şey panelin en alt satırı olur.

**Yarıçap tektir.** Genel `CornerRadius` **6 DIP** *(varsayılan, ölçülmedi)*. Daire yalnızca
işlevsel istisnadır: `?` rozeti, slider thumb, durum noktası. Kart/panel/düğme için farklı
yarıçap üretme; daha yumuşak bir köşe gerekiyorsa çözüm ara bir değer değil dairedir.

`SKILL.md` §5 bir dönem 16/12/8/6 merdiveni veriyordu ve bu satırla çelişiyordu. Çelişki
23.08.2026'da **bu dosya lehine** kapatıldı: yuvarlatılmış dikdörtgen daha küçük köşe alır.
Merdiven kaldırıldı, token `--tk-r: 6px` tek kaynak oldu. Bu bir öncelik kuralı değildir —
depoda "çelişkide şu dosya kazanır" diye genel bir kural **bilerek yoktur**; her çelişki tek
tek tespit edilir ve kullanıcıya sorulur.

## 5.2 Gradientler — bantlaşma hatadır

Koyu temada iki durak arasındaki geçiş, 8-bit çıktıda görünür şeritler üretir. Kural:

- **En az 11 birbirine çok yakın durak** kullan; iki duraklı gradient bantlaşır.
- **Uç renklerin toplam kontrastı düşük** tutulur — gradient bir doku, bir geçiş değildir.
- Renk enterpolasyonu **`ScRgbLinearInterpolation`** ile yapılır (WPF:
  `ColorInterpolationMode="ScRgbLinearInterpolation"`).
- **Görünür bantlaşma ve ani ton/parlaklık sıçraması hatadır**, üslup tercihi değil.
- Bitişik alanlar **tek kesintisiz gradient** paylaşır. Üst şeride bir, içeriğe başka bir
  gradient verip aralarında dikiş bırakma; ayrı bant üretme.

## 5.7 Yerleşim ve geri bildirim kalıpları

Hazır tema kütüphaneleri (Fluent, Metro, Material) **kimlikleriyle** alınmaz — renk,
yuvarlaklık ve gölgeleri bizim değil. Ama **hangi işin hangi yüzeye ait olduğu**
konusunda yılların birikimi var; o kısım alınır.

**Gezinme.** Beş üstü hedef varsa sol dikey kenar çubuğu; beş ve altındaysa üst yatay
sekme. İkisi aynı anda kullanılmaz. Kenar çubuğu **240 DIP açık, 48 DIP kapalı**
*(varsayılan, ölçülmedi)* — iki sayı da yaygın masaüstü kabuklarından alınmış bir başlangıç
değeri, bu depoda ölçülmedi. Ölçüt sayı değil: açık hâlde en uzun gezinme etiketi
kırpılmadan sığmalı, kapalı hâlde 24×24 ikon hücresi iki yanında pay bırakmalı. Daraldığında
metin gizlenir, ikon kalır.

**Dar pencere.** Sıra şudur: **yeniden konumlandır → yeniden boyutlandır → yeniden ak →
göster/gizle.** Önce yerleşim taşınır, son çare içerik gizlenir. Gizlenen şeyin nereye
gittiği görünür olmalı (taşma menüsü).

**Geri bildirim yüzeyi işe göre seçilir:**

| Durum | Yüzey | Kural |
|-------|-------|-------|
| Devam etmeyi engelleyen karar | Kip pencere | Yalnızca kayıp riski varsa. En çok 2 eylem. |
| Bağlama bağlı eylem | Açılır pano | Tıklanan öğenin yanında açılır, dışa tıklayınca kapanır. |
| Satır içi durum, uyarı | Şerit | İçeriğin üstünde kalır, kendi kendine kapanmaz. |
| Geçici sonuç bildirimi | Yığın bildirim | 4-6 sn, geri al düğmesi varsa 10 sn. |
| İlk kullanım ipucu | İşaretli balon | Oturumda bir kez, kapatılınca bir daha çıkmaz. |
| Uygulama kapalıyken | Sistem bildirimi | Yalnızca kullanıcının beklediği iş bitince. |

**Kip pencere son çaredir.** "Emin misin?" sorusu, geri alınabilir bir işlemde sorulmaz —
işlem yapılır, geri al düğmesi gösterilir.

**Boş durum yalnız bırakılmaz.** Boş liste, tablo veya panel üç şey gösterir: ne olduğu,
neden boş olduğu, ilk adımı başlatan tek düğme.

**Yükleme sırasında dönen çember yerine iskelet.** İskelet, gelecek içeriğin ölçüsünü
tutar; çember tutmaz ve içerik gelince her şey zıplar.

