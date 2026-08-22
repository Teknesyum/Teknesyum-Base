# <Proje> — Plan

## Hedef
<2-3 cümle: ne inşa ediyoruz, biten hali neye benziyor>

## Kısıtlar
- Stack: <>
- <kritik teknik kısıt>

## Görev grafiği
```
T1 ──► T2 ──┐
            ├─► T4
T3 ─────────┘
```

| ID | Görev | Model | Bağımlı | Sahiplendiği dosyalar |
|----|-------|-------|---------|----------------------|
| T1 |       |       | —       |                      |
| T2 |       |       | T1      |                      |
| T3 |       |       | —       |                      |
| T4 |       |       | T2,T3   |                      |

## Bitti tanımı
- [ ] <proje seviyesi kabul kriteri>
- [ ] İmza/sponsor bloğu ayarlar bölümünde
- [ ] Kök + alt klasör AGENTS.md dosyaları güncel

<!--
eco profilinde `## Görev grafiği` altındaki ASCII şema düşer; `Bağımlı` sütunu aynı
bilgiyi zaten taşır. Tablo, `## Hedef`, `## Kısıtlar` ve `## Bitti tanımı` düşmez.
-->

