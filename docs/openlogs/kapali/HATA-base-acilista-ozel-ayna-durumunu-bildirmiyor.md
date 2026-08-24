# Hata: base açılışta özel ayna durumunu bildirmiyor

- Kaynak: `teknesyum/scripts/ozel.js` + açılış bildirimi (`relay-watch.js` / SessionStart)
- Açan: CodeXray oturumu, 2026-08-24
- Belirti: ayna kurulu ve projeye bağlı ama kayıtlı dosya yokken açılış satırı bundan hiç
  söz etmiyor; oturum dokunulmaz dosyaları yedeksiz sanıyor.

## 1. Ne oldu

CodeXray projesinde Titan devir protokolü kuruldu. Protokolün "kimse dokunmaz" listesinde
git'te izlenmeyen üç dosya vardı:

- `docs/TITAN_MODE_YOL_HARITASI.md` (32K, projenin ana yol haritası)
- `CodeXray-readme-neon.svg`
- `.agents/AGENTS.md`

Oturum bu dosyaları "izlenmiyor, yedeği yok — diski kaybedersen gider" diye kullanıcıya
rapor etti ve git'e commit'lemeyi önerdi.

Kullanıcı düzeltti: bu dosyalar için zaten ayrı bir özel depo açılmıştı ve **base bunu
bilmeliydi.**

`node scripts/ozel.js durum` çalıştırıldığında görüldü ki mekanizma tamamen kurulu:

```
Özel ayna · codexray
depo: https://github.com/Teknesyum/teknesyum-ozel.git
klon: C:\Users\Administrator\.claude\teknesyum-ozel  (kısmi)
inen klasörler: Teknesyum-Base

Kayıtlı dosya yok.  /ozel ekle <yol>
```

Yani: ayna kurulu, bu projeye bağlı, adı `codexray` olarak kayıtlı — ama **kayıtlı dosya
sayısı sıfır** ve inen tek klasör `Teknesyum-Base`.

Açılış bildirimi bu oturumda şunları saydı: premium mod, röle durumu, açık ajan sorunları,
açık hata günlükleri. Özel aynadan **tek kelime etmedi.** Oturum boyunca üç ayrı noktada
yedekleme konusu geçti ve üçünde de yanlış varsayımla ilerlendi.

Sonuç: kullanıcı araya girmeseydi ya dosyalar yedeksiz kalacaktı ya da özel kalması gereken
dosyalar genel depoya commit'lenecekti. İkisi de zarar.

## 2. Ölçü

Bu hatanın kapandığını gösteren tek şey:

**Özel ayna bu projeye bağlıyken açılış bildiriminde bir satır doğar ve kayıtlı dosya
sayısını söyler.** Sıfırsa bunu ayrıca belirtir.

Beklenen biçim:

```
Teknesyum ▸ özel ayna · codexray · 6 dosya kayıtlı · son gönderim bugün
```

Kayıtlı dosya yokken:

```
Teknesyum ▸ özel ayna · codexray · bağlı ama kayıtlı dosya yok — /ozel ekle <yol>
```

Ayna bu makinede hiç kurulu değilse satır **doğmaz** — kurmamış birinin açılışı
kirletilmemeli (`pusla.md` bu ilkeyi zaten koyuyor: "Hatırlatma yalnız bu makinede özel
ayna kuruluysa doğar").

Test: `ozel.js durum` çıktısı "Kayıtlı dosya yok" derken yeni bir oturum açılır ve açılış
satırında ayna geçiyorsa hata kapanmıştır.

## 3. Neden önemli

Bu, sessiz bir yanlış varsayım üretiyor — en pahalı hata türü. Ajan "yedek yok" sanıp ya
kullanıcıya yanlış rapor veriyor ya da dosyayı yanlış yere (genel depoya) koyuyor. Her
ikisi de fark edilmesi geç olan hatalar: biri disk kaybında, öteki depo herkese açıldığında
anlaşılır.

Açılışta röle durumu ve ajan sorunları sayılırken aynanın sayılmaması bir tutarsızlık;
ikisi de "bu projede arka planda duran durum" bilgisi.

## 4. İlgili

Aynı oturumda ikinci bir eksik bulundu, ayrı günlükte:
`HATA-ozel-ekle-klasor-kabul-ediyor-pusla-atliyor`
