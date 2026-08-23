2026-08-22 | T1 profil-eco-advisor | teknesyum-builder | submitted | eco profili + advisor ajanı + premium paralel tavanı 20 + dokuz tetikleyici | 215/215
2026-08-22 | T2 eco-davranis | teknesyum-builder | submitted | ecoNotu enjeksiyonu + eco tavani 1 + kisa olcu/dil metinleri + eco'da seviye2 yok | 229/229
2026-08-22 | T2 eco-kayit-profil | teknesyum-builder | submitted | eco: gzipli ham transkript + tek satirlik filo dokumu + 64 kB baslik tamponu; /premium uc profili esit anlatir | 230/230
2026-08-22 | T1 scan | teknesyum-builder | submitted | /scan uc profil sertifikasi + kalici kapsam kaydi + 15 test | 271/271
2026-08-22 | T1 oturum-profil-kaydi | teknesyum-builder | submitted | profil kaydi makine genelinden oturum basina indi (oturumlar/<sid>.json), 7 gun bayatlik, durum artik oturum profilini basiyor (ajan dosyalari ayri satirda) + efor izole degil satiri | 277/277
2026-08-22 | T2 dugmeler-enjeksiyona | teknesyum-builder | submitted | premium.js hicbir dosya yazmiyor; ajan model alani silindi, efor/tur normal tabaninda; dugme sapmalari enjeksiyona gecti; ayarSayi uc katman; profil degisince sayac sifirlaniyor; tur makbuzu adi ayristi | 310/310
2026-08-22 | U1 ui-dalga1 | teknesyum-ui-builder | submitted | animasyon tabani 10 olay + odak istisnasi; pink-text #ff54eb (7.72/7.33) ve purple-text #c67eff (7.83/7.43); kenarlik /50; cift katman odak halkasi dort dosyada; XAML 15 alfa fircasi + FocusVisualStyleKey; MotionConfig zorunlu; imza ust bara tasindi; kriter 8: 12 ihlal bulundu, 12 kapandi | 313/313
2026-08-22 | T2 dugmeler-enjeksiyona | teknesyum-builder | submitted (tur 2) | premium.js hicbir dosya yazmiyor; ajan model alani silindi, beklenen model profilden turetiliyor (sessiz dusus yakalaniyor); dugme sapmalari tek govdeden enjeksiyona gecti; ayarSayi uc katman; profil degisince sayac sifirlaniyor; ecoNotu 532->231, eco istek basina da normalden ucuz | 315/315
2026-08-23 | S1 scan-ui | teknesyum-builder | submitted | /scan ui dorduncu kip: ihlal + durgunluk iki kol, motion-kurulu-kullanilmamis basligi, olculer theme.css tan, --tamamla mekanik olani yazar kirli agacta durur, CodeXray 53 dosya 0.04 sn | 325/325
2026-08-23 · U2 açıldı — tipografi ve hızlı düzeltmeler dalgası (18 kriter, konsey kararı)
2026-08-23 · S2 açıldı — /scan ui standart kapısı ve iki fazlı dönüşüm
2026-08-23 · U3-U9 açıldı — konseyin yedi büyük maddesi, her biri kendi fable görüşüyle
2026-08-23 · U2 active — ui-builder dağıtıldı, tipografi dalgası başladı
2026-08-23 · U3-U9 owns daraltıldı — yedisi de SKILL.md ve test/run.js istiyordu, çakışma
             kalktı. Paylaşılan dört dosya U10 birleştirme sözleşmesine toplandı.
2026-08-23 · U10 açıldı — birleştirme, depends: U3..U9
2026-08-23 · U2 submitted → denetime verildi (tur 1)
2026-08-23 · U7 · U9 active — konseyleri açıldı; kod konsey yazılmadan başlamaz
2026-08-23 · U4 · U8 bekliyor — U2 denetimi sürerken owns dosyalarına dokunulmaz
             (U4 theme.css/Theme.xaml/Palette.cs, U8 motion.md — denetçi ikisini de okuyor)
2026-08-24 · U9 submitted (tur 1) — pembe/mor ölçüldü, sonuç kötü: protanopide ΔE2000
             5.8, metin rolünde 5.2-5.6. İki kural birden yazıldı. Viénot 1999, matris
             iki bağımsız yoldan doğrulandı; ΔE2000 Sharma 2005 Tablo I 34 çiftiyle.
             docs/olcumler/renk-korlugu.md + test/u9-renkkorlugu.js, 256 doğrulama geçti.
             SKILL §2 metni U9 Çıktı'da hazır — U10 alacak. Üç karar sorusu Çıktı'da.
2026-08-24 · U7 submitted — Theme.axaml, Signature.axaml, references/avalonia.md ve
             test/u7-avalonia.js (17/0 GEÇTİ). SKILL.md metni Çıktı bölümünde, U10 alacak.
2026-08-24 · U8 submitted — motion.md M15 (glow ve kaydırma) + test/u8-glow.js (77/0 GEÇTİ,
             sekiz mutasyonun sekizi yakalandı). Ölçüldü: 4 glow tokenı, glow taşıyan
             5 seçici, 1 backdrop-filter, tekrar eden öğeye düşen glow 0. Kare süresi
             ölçülmedi — Node'dan ölçülemez, 16 ms reçete olarak yazıldı. SKILL §2 metni
             (24px pay + inset/scrollbar sınırı) Çıktı'da, U10 alacak. U8 sözleşmesinin
             kayıp `## Kabul kriteri` bölümü HEAD~2'den geri kondu; U7'de de aynı hasar.

2026-08-24 · U4 submitted (tur 1) — anlamsal renk katmanı: danger, danger-text, warning,
             warning/50, success. --tk-info EKLENMEDİ (konsey madde 5), gerekçesi üç
             dosyada yazılı ve yokluğu testte ölçülüyor. Kontrast yeniden hesaplandı:
             amber 12.58 / 11.94, beyaz metin 1.67 (dolgu yasağının gerekçesi),
             amber/50 çerçeve 3.59 — pembe/50 2.17 ve mor/50 1.83 taşımıyordu.
             theme.css @theme + :root, Theme.xaml, Palette.cs + ANSI sabiti.
             test/u4-renk.js 101/0 GEÇTİ. SKILL §2 metni ve Theme.axaml rol listesi
             Çıktı bölümünde — U10 alacak. İki karar sorusu Çıktı §5'te.
