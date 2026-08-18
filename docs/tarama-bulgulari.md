# Tarama bulguları

Rota: `ROTA-kutuphane-taramasi.md`. Her kayıt üç alan taşır: lisans, alınacak kural,
alınmayacak kısım.

---

## D1 — Animasyon ve etkileşim

### motion (eski Framer Motion) — **alındı, varsayılan**

MIT. `npm install motion`, import `motion/react`. Tree-shakeable; tam paket ~85 KB,
mini kullanım ~5 KB seviyesine iniyor. Aylık 16M+ indirme, ekosistemin fiilî standardı.

Alınacak: React/Electron tarafında varsayılan animasyon katmanı. `useReducedMotion`
hazır geliyor, §5.4'ün zorunlu kıldığı davranışı elle yazmaya gerek kalmıyor.

Alınmayacak: `layout` animasyonlarının serbestçe kullanılması. Yerleşim animasyonu
§5.4'e göre yalnızca kullanıcı eylemiyle başlar; `layout` prop'u her veri değişiminde
kutuları oynatır.

### @formkit/auto-animate — **alındı, ikinci katman**

MIT. ~3.3 KB. Tek satır: `const [parent] = useAutoAnimate()`. Yalnızca üç olayı
canlandırır — çocuk eklendi, silindi, yer değiştirdi.

**`prefers-reduced-motion` açıkken kendini otomatik kapatıyor.** Bu, standardımızın
zorunlu kıldığı davranışın kütüphane tarafından garanti edilmesi demek.

Alınacak: liste, tablo satırı, bildirim yığını, akordeon gibi yerlerde varsayılan.
`motion` ile birlikte kullanılır; çakışmaz, çünkü farklı işi yapar.

Alınmayacak: sayfa geçişi ve karmaşık koreografide kullanılması — orası `motion`'ın işi.

### GSAP — **alınmadı**

v3.13'ten (Nisan 2025) beri eklentileri dahil tamamen ücretsiz ve ticari kullanıma açık.
Güçlü, ama ağırlık merkezi "hareketin ürünün kimliği olduğu" siteler: kaydırma tabanlı
editoryal sayfalar, ödül avcısı portfolyolar.

Bizim ürünlerimiz her gün açılan masaüstü araçları. §5.4'ün 360 ms tavanı ve
"söyleyeceği bir şey yoksa animasyon yok" düsturu GSAP'ın getirdiği gücü zaten
kullanılamaz kılıyor.

Alınacak: yok. Tanıtım sayfası istisnasında (§5.5) kullanılabilir, standarda girmiyor.

### Karar

React/Electron yığınında iki kütüphane varsayılan sayılır ve `teknesyum-ui` §1 kurulum
tablosuna girer: `motion` + `@formkit/auto-animate`. İkisi de MIT, ikisi de
`prefers-reduced-motion` farkında.
