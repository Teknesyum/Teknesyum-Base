# Hata: relay `SKILL.md` kendi 30 kB tavanının iki katı

**Durum:** açık.
**Belirti:** `teknesyum/skills/relay/SKILL.md` **62 629 bayt.** Aynı dosyanın §6'sı
şunu yazıyor: *"Skill dosyası şişmez. Bir `SKILL.md` her etkinleşmede tamamen bağlama
girer; yan dosyalar yalnızca okunduğunda girer. Tavan **~30 kB**; aşan bölüm
`references/` altına taşınır."* Kural kendi taşıyıcısında tutmuyor.
**Kaynak:** `teknesyum/skills/relay/SKILL.md` §6 — token disiplini
**Görüldüğü oturum:** 24.08.2026, Teknesyum Base, açık günlükler kapatılırken

---

## 1. Ne oldu

Açık hata günlükleri kapatılırken çözümlerin çoğu relay skill'ine kural olarak yazıldı:
§1.5.1 (ikinci görüş), §3 (denetim durdurma kuralı), §3.3 (gözcü kalıbı), §6 (ölçüm
tekrarı kapısı), §7.0 ve §7.0.1 (düz yazı duvarı, sürüm gömülü yol), §2 madde 6
(lisans), §1.7 (lisans ölçütü). Her biri tek başına doğru ve ölçülebilir. Toplamda dosya
**tavanın iki katına** çıktı.

Ölçü:

| Dosya | Boyut |
|---|---|
| `skills/relay/SKILL.md` | 62 629 B |
| `skills/relay/references/protocol.md` | 21 509 B |
| `agents/auditor.md` | 6 384 B |

`SKILL.md` her etkinleşmede tamamen bağlama giriyor. `references/` altındakiler yalnız
okunduğunda giriyor — yani bugün her relay oturumu, o oturumda hiç gerekmeyecek
kuralların tamamını da taşıyor.

## 2. Neden kendi kendine düzelmiyor

Her ekleme **tek tek haklı.** Bir hata günlüğü kapanırken kuralın "her işte okunan yere"
yazılması doğru karardı; günlüklerin ortak teşhisi zaten *"kural vardı, okunma anı
yoktu"* idi. Yani bu şişme, doğru bir düsturun biriken maliyeti — yanlış bir kararın
sonucu değil.

Bu yüzden de kendiliğinden durmuyor: bir sonraki günlük de aynı gerekçeyle aynı dosyaya
yazacak.

## 3. Karar gerektiren yer

Taşıma **standart değiştiren** bir iş, tek başıma yapılmaz:

1. **Ne taşınacak?** §6 ölçütü "önemli mi" değil **"her işte gerekli mi"** diyor. Bu
   ölçüte göre taşınabilecek görünen bölümler: §1.4 ön araştırma, §1.5 plan konseyi,
   §1.5.1 ikinci görüş, §1.6 ürün standardı, §1.7 sertifika, §3.1 görev paketi,
   §3.2 rota, §3.3 uzun dış koşu. Her biri gerçek bir işte gerekli ama **her** işte
   değil.
2. **İşaretçi ne kadar yer tutacak?** Taşınan her bölüm `SKILL.md`'de tek satır bırakır;
   sekiz bölüm sekiz satır. Kazanç gerçek, ama işaretçi görülmezse kural da görülmez —
   `HATA-ikinci-gorus-tetiklenmiyor` tam olarak bu şekilde oldu.
3. **Kaç dosya?** Tek bir `references/karar.md` mi, yoksa konu başına ayrı dosya mı.

## 4. Ölçü

Bu günlük şu ikisi birden sağlandığında kapanır:

1. `skills/relay/SKILL.md` **≤ 30 kB**.
2. Taşınan hiçbir kural kaybolmadı: her taşınan bölüm için `SKILL.md`'de onu adıyla anan
   bir işaretçi var ve `test/run.js` bunu kontrol ediyor.

İkincisi olmadan birincisi hatanın kendisini üretir — kural dosyayı küçültmek değil,
her işte gerekmeyeni bağlamdan çıkarmak.
