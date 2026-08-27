---
description: Opens the screen gate for one turn
argument-hint: [dakika]
allowed-tools: Bash
---

İstenen: $ARGUMENTS

Ekran kapısı ajanın masaüstünü **habersiz** almasını engeller: gerçek fareyi ve klavyeyi
süren araç çağrıları ile pencere açan komutlar (`dotnet run`, electron başlatma, `.exe`
çalıştırma) kapı kapalıyken durdurulur. `dotnet test`, `dotnet build` ve başsız koşular
hiç engellenmez.

```
node "${CLAUDE_PLUGIN_ROOT}/hooks/ekran-kapisi.js" --ac $ARGUMENTS
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/hooks/ekran-kapisi.js`
altındadır. Çıktıyı **olduğu gibi bas**, özetleme.

Argüman yoksa kapı **bir tur** açılır ve tur bitince kendiliğinden kapanır. Sayı verilirse
o kadar dakika açık kalır: `/ekran 10` on dakika. Tavan 240 dakikadır.

Kuyrukta bekleyen istek varsa betik onu da basar — hangi araç kaç kez engellendi.

Kapıyı tümden kapatmak için `~/.claude/teknesyum.json` içine `"ekran_kapisi": false`
yaz; kanca hiçbir şey yapmadan çıkar.
