---
description: Scans the interface standard read-only and hands the approved plan over as a verified manifest
argument-hint: <hedef-kökü>
allowed-tools: Bash, Read
---

İlk çağrı yalnızca tarama yapar; hedef dosyalarına yazmaz ve JSON planı stdout'a üretir.

```powershell
node "<proje>/teknesyum/scripts/uicheckup.js" "$ARGUMENTS" > ui-plan.json
```

Planı uygulamaya almadan önce plan digest'ini ve hedef kökünü doğrulayın. `--approve`, plan digest'i, hedef kökü ve taramadaki her dosyanın digest'i eşleşmeden manifest üretilmez; plan veya dosya değiştiyse stale plan reddedilir.

```powershell
node "<proje>/teknesyum/scripts/uicheckup-apply.js" --approve --plan ui-plan.json --plan-digest <plan.digest> --target "$ARGUMENTS"
```

Apply hedef dosyalarını değiştirmez, sessiz model patch'i yapmaz. Çıktı, `ui-builder/relay` aktarımı için doğrulanmış manifesttir. Plan girdisi JSON stdin veya argv ile de verilebilir; `--help` kullanım bilgisini gösterir.
