# Hata: Sürümü yola gömerek okunan standart, eklenti güncellense de eski kalıyor

**Durum:** açık.
**Belirti:** Oturum, `teknesyum-ui` §3'ün güncellenmiş halini değil bir önceki sürümdeki halini uyguluyor; uygulama kapatılıp açılması bunu düzeltmiyor.
**Kaynak:** `~/.claude/plugins/cache/teknesyum/teknesyum/<sürüm>/` — sürümü yola gömerek okuma
**Görüldüğü proje:** VidShrink

---

## 1. Ne oldu

Kullanıcı "her kelime büyük harfle başlamalı kuralını tüm programa uygula" dedi. Ben
bunu standarda aykırı sandım ve çakışma olarak bildirmeye hazırlandım.

Aykırı değildi. Kural bugün **tersine dönmüştü** ve ben eski halini hatırlıyordum.

### Ölçüm

Diskteki iki sürümün aynı bölümü:

| Sürüm | §3 ne diyor |
|---|---|
| 2.46.0 | **Tam cümleler bu kuralın dışındadır.** Tooltip, hata mesajı, boş durum açıklaması ve onay metni cümledir: yalnız ilk harfi büyük yazılır. |
| 2.50.1 | **Tam cümleler de bu kurala uyar.** … o muafiyeti kullanıcı istemedi, tek taraflı eklenmişti ve 23.08.2026'da kaldırıldı. |

Madde tam anlamıyla ters çevrilmiş. Eklenti `installed_plugins.json` kaydına göre bugün
**18:16**'da 2.50.1'e güncellenmiş; benim §3 ve §4 okumalarım ondan önceydi.

### Kök neden — sürümü yola gömmek

Okurken kullandığım yol şuydu:

```
~/.claude/plugins/cache/teknesyum/teknesyum/2.46.0/skills/teknesyum-ui/SKILL.md
```

Önbellek eski sürümleri **silmiyor**. Bugün diskte on sürüm birden duruyor: 2.43.0,
2.45.0, 2.45.1, 2.46.0, 2.46.1, 2.47.0, 2.48.0, 2.49.0, 2.50.0, 2.50.1.

Yani o yolu bugün tekrar okusam yine 2.46.0'ın metnini alırdım. Dosya var, okunuyor, hata
yok — yalnızca **yanlış**. Sessizce eski cevap veren bir kaynak, hiç cevap vermeyenden
tehlikelidir.

### Kullanıcının sorusu: oturumun yeniden açılması mı gerekiyor

Hayır, ve bu ayrım önemli. İki ayrı şey var:

**Uygulamayı kapatıp açmak yetmedi** çünkü konuşma kaydı sürdü. Daha önce okuduğum metin
kayıtta duruyor; yeniden başlatmak onu silmiyor.

**Ama yepyeni bir oturum da güvence değil.** Arıza yalnızca "hafızam bayat" değil; elimde
**sürüme çivilenmiş bir yol** vardı. Temiz bir oturum o yolu bir nottan veya hafızadan
kopyalasa yine 2.46.0'ı okurdu. Sorun oturumun ömründe değil, adresin kendisinde.

Bunu yakalamamın tek sebebi, bu sefer yolu elle yazmak yerine `ls | sort -V | tail -1`
ile en yüksek sürümü bulmam oldu. O da bir tahmindi — doğru cevabı verdi ama vermeyebilirdi.

## 2. Ölçü

Bu hata şu ikisi sağlandığında kapanır:

1. Standart dosyaları artık sürümü gömülü bir yoldan okunmuyor; kurulu sürüm okuma
   anında `installed_plugins.json` kaydından çözülüyor.
2. Aynı ölçüm tekrarlandığında, eklenti güncellendikten sonra yapılan ilk okuma yeni
   metni veriyor — eski sürüm klasörü diskte dursa bile.

---

## 3. Öneri

**Yolu sürüme çivileme.** Kurulu sürümün tek doğru kaynağı
`~/.claude/plugins/installed_plugins.json` içindeki `installPath` alanı. `ls | tail -1`
de kullanılmamalı: en yüksek numaralı klasör kurulu olan olmak zorunda değil, kullanıcı
bir sürüm geri almış olabilir.

**Kural taşıyan kararda standardı o anda oku.** Bir kuralı "hatırlayarak" karar vermek,
kuralın değişmediğini varsaymaktır. Bu oturumda kural gün içinde değişti — üstelik
kullanıcının kendi isteğiyle. Oturumun başında okunmuş bir §3, oturumun sonunda kanıt
değildir.

**Önbellek eski sürümleri tutuyorsa bu bilinsin.** On sürümün yan yana durduğu bir
klasörde "dosyayı okudum" cümlesi hangi dosyayı okuduğunu söylemiyor. Alıntı yapılırken
sürüm numarasıyla birlikte yazılmalı ki sonradan denetlenebilsin.

### Bu hatanın bu oturumdaki bedeli

İki yanlış çıktı üretti:

1. `docs/openlogs/HATA-imza-teknesyum-simgesi.md` içinde `Buy Me a Coffee` etiketinin
   Title Case olduğu için §3'ü ihlal ettiğini yazdım. 2.50.1'e göre **Title Case doğru
   olan**; o tespit geçersiz. Aynı raporun asıl bulgusu (`<>` simgesinin §4'e aykırı
   olması) etkilenmiyor, o hâlâ geçerli.
2. Kullanıcının açık isteğini bir an "standarda aykırı" diye işaretlemeye hazırlandım.
   Bildirmeden önce dosyayı yeniden okuduğum için yayına çıkmadı, ama çıkabilirdi.

Ayrıca 2.50.1'in kendi içinde bir çelişki var ve bu ayrı bir iş: §3 tam cümlelerin de
kurala uyduğunu söylerken, aynı dosyanın **684. satırındaki denetim listesi** hâlâ
`Etiketi UPPERCASE veya Title Case yazmak → ilki büyük gerisi küçük (§3)` diyor. Denetim
listesi §3 güncellenirken güncellenmemiş.
