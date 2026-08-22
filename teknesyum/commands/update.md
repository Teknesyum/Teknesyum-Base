---
description: Yeni sürüm çıkmış mı bakar ve güncelleme komutunu verir
argument-hint: (argüman almaz)
allowed-tools: Bash
---

İstenen: $ARGUMENTS

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/surum.js" --json
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/surum.js`
altındadır. Argüman alma, her çağrıda kontrolü **hemen** yap — açılıştaki günlük damgaya
bakma, kullanıcı zaten elle sordu.

Betik tek satır JSON döner: `kurulu`, `sha`, `uzak`, `yeni`, `komut`. Kendin dosya okuma,
sürüm tahmin etme.

Çıktıya göre üç durumdan birini yaz:

**`yeni` doğruysa** — kurulu ve uzak sürümü söyle, sonra güncelleme komutunu **kendi
satırında, tek satırlık kod bloğu olarak** ver ki kullanıcı kopyalayabilsin:

```
claude plugin update teknesyum@teknesyum
```

Marketplace adı şart: `claude plugin update teknesyum` "not found" verir. Komutu kullanıcı
çalıştırır, sen çalıştırma — güncelleme çalışan oturumun eklenti dosyalarını değiştirir.

**`yeni` yanlış ve `uzak` doluysa** — güncel olduğunu ve kurulu sürümü tek satırda söyle.
Başka bir şey yazma.

**`uzak` boşsa** — uzak sürümün sorulamadığını tek satırda söyle: ağ yok, depo erişilemedi
ya da git bulunamadı. Kurulu sürümü yine yaz. Bunu bir hata gibi sunma. `kurulu` da boşsa
eklenti kaydı okunamıyor demektir, `/setup` öner.

Güncelleme yapıldıysa sonuna şu hatırlatmayı ekle: **eklenti güncellemesi ajan dosyalarını
profil varsayılanına döndürür.** Güncelledikten sonra `/premium durum` uyuşmazlığı söyler,
`/premium <profil>` geri uygular. Kullanıcı premium ya da eco kullanıyorsa bu adım
atlanırsa profili sessizce normale döner.

Açılışta da günde bir kez kendiliğinden bakılır ve yeni sürüm varsa
`Teknesyum ▸ Güncelleme ▸ …` satırı çıkar. Satır çıkmıyorsa bu "güncelsin" demek değil:
ağ yokken hiçbir şey yazılmaz.
