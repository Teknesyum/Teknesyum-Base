---
description: Sesli bildirimi yönetir — hangi olayda hangi ses çalsın, açık mı, hangi kapsamda
argument-hint: [on | off | dinle | <olay> on|off | <olay> <dosya> | <olay> bip <hz> <ms>] [this | this sil]
allowed-tools: Bash
---

İstenen: $ARGUMENTS

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/beep.js" $ARGUMENTS
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/beep.js`
altındadır. **Argüman boşsa durum tablosunu bas ve dur** — kendiliğinden ayar değiştirme.
Betiğin çıktısını olduğu gibi göster; tabloyu yeniden biçimlendirme, satır ekleme.

## Ne işe yarar

Windows bildirimleri kapalıyken ya da odaklanma modu açıkken Claude Code'un masaüstü
toast'ı sessizce yutulur: izin istendiğinde, soru sorulduğunda ya da uzun bir iş bittiğinde
hiçbir sinyal gitmez. Ses bildirim sistemine uğramaz, doğrudan ses aygıtına gider —
odaklanma modu toast'ı yutar, sesi yutmaz.

Varsayılan yol `Media.SoundPlayer` + kısa wav'dır, `[console]::beep` değil. Sistem
hoparlörü sürücüsü olmayan makinede `Beep()` çağrısı çıkış kodu `0` döndürüp hiçbir ses
çıkarmaz; sessizce başarısız olan bildirim mekanizması en kötü hâldir.

## Üç olay

| Olay | Kanca | Ne demek | Varsayılan ses | Süre |
|---|---|---|---|---|
| `bekleme` | `Notification` | izin ya da soru bekleniyor | `Windows Startup.wav` | 0,22 s |
| `bitti` | `Stop` | tur tamamlandı | `ding.wav` | 0,40 s |
| `hata` | `StopFailure` | tur hatayla kapandı | `Windows Default.wav` | 0,41 s |

Üçü de açık gelir ve üçü de yarım saniyenin altındadır. Uzun ses iki gün içinde kapatılır;
kapatılan bildirim bildirim değildir. Ekran başında oturan biri genelde `bitti` sesini
kapatıp ötekileri açık bırakır: `/beep bitti off`.

`PostToolUseFailure` bilerek dışarıdadır — tek bir araç çağrısının başarısızlığı normal
akışın parçasıdır, turda onlarca kez olur, sesi anlamsızlaştırır.

## Kullanım

```
/beep                       durum tablosu — hangi olay, hangi ses, açık mı, kaynağı ne
/beep on | off              hepsini aç veya kapat (tek tek yapılmış ayarlar korunur)
/beep <olay> on | off       tek olayı aç veya kapat
/beep dinle                 üç sesi de çal, kullanıcı duyduğunu doğrulasın (takma ad: test)
/beep <olay> <dosya>        o olayın sesini değiştir
/beep <olay> bip <hz> <ms>  o olayı sistem hoparlörü bipine çevir (yalnız Windows)
/beep … this                yukarıdakilerin hepsi — yalnız bu sohbet için
/beep this sil              bu sohbete özel ayarı sil, geneline dön
```

`dinle` yalnız bir kolaylık değil, kurulumun doğrulama adımıdır. Ses çalıp çalmadığı ancak
duyulunca bilinir. Kullanıcı ilk kez kurduysa `/beep dinle` çalıştırmasını öner ve duyup
duymadığını sor; duymadıysa sorun eklentinin dışındadır — çıkış aygıtı, sanal ses kartının
kanal karıştırıcısı (`SteelSeries Sonar` gibi) ya da uygulama ses seviyesi.

`<dosya>` çıplak ad ise `C:\Windows\Media\` altında aranır, mutlak yol ise doğrudan
kullanılır. Dosya yoksa sessizce varsayılana düşülür.

## Kapsam: çıplak makinedir, `this` bu sohbettir

Tek cümle: **çıplak komut makine varsayılanını değiştirir, sonuna `this` eklenirse yalnız
içinde bulunulan sohbeti değiştirir.** `this` her zaman en sondadır ve her ayar komutunda
aynı anlama gelir.

```
/beep off             makine geneli — her sohbette sessiz
/beep off this        yalnız bu sohbet sessiz, makine varsayılanı elleşmez
/beep bitti off this  yalnız bu sohbette bitiş sesi kapalı
/beep this sil        bu sohbete özel ses ayarını siler, geneline döner
```

**Okuma sırası:** `<proje>/.claude/teknesyum-beep.json` → oturum kaydı →
`~/.claude/teknesyum-beep.json` → varsayılan. Oturum kaydı makine varsayılanının üstünde
kalır. Bunun tek gerçek bedeli sessiz gölgelemedir: bu sohbette `this` ile ayar
yapıldıysa çıplak komut geneli değiştirir ama burada hiçbir şey değişmez. Betik o durumda
üç satır basar. **O üç satırı kısaltma, olduğu gibi bas.**

Durum tablosu her satırın sonunda değerin kaynağını söyler: `proje`, `oturum`, `makine`
ya da `varsayılan`. Kaynağı göstermeyen durum çıktısı karışıklığı çözmek yerine gizler.

## Ayar dosyası

`~/.claude/teknesyum-beep.json` makine tabanıdır, `<proje>/.claude/teknesyum-beep.json`
varsa üstündür. Sohbete özel ayar ayrı dosyaya değil, profilin zaten kullandığı
`~/.claude/teknesyum/oturumlar/<oturum>.json` kaydına `beep` anahtarı altına yazılır.

```json
{
  "surum": "1.0.0",
  "kapali": false,
  "olaylar": {
    "bekleme": { "kapali": false, "dosya": "Windows Startup.wav" },
    "bitti":   { "kapali": false, "dosya": "ding.wav" },
    "hata":    { "kapali": false, "dosya": "Windows Default.wav" }
  }
}
```

**Ses için dosya oluşturmak gerekmez** — eklentiyi kuran herkes ilk turdan itibaren ses
duyar, hiçbir şey ayarlamadan. Dosya bozuk JSON içeriyorsa tur normal biter, ses
varsayılanla çalar, ekrana hata düşmez.

## İki not

Kanca `hooks/hooks.json` içinden gelir ve `async: true` çalışır; kullanıcının
`settings.json` dosyası kirletilmez, eklenti kaldırılınca ses de kalkar. Betik ilk
çalıştığında `settings.json` içindeki elle eklenmiş PowerShell ses kancalarını siler —
silinmezse her olayda çift ses duyulur — ve ne sildiğini tek satırla söyler.

Uzaktan sürerken (`/rc`) makinede çalan ses telefona ulaşmaz. İki mekanizma birbirinin
yerine geçmez: uzak oturumda `PushNotification` yolu ayrıdır. Durum tablosu bunu hatırlatır.
