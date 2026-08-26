# Çöplük

İşi bitmiş dosyalar burada bekler. Proje ağacında ölü dosya durmaz.

**Kural:** bir dosyanın işi bittiyse (ölçüm yapıldı ve sonucu başka bir belgeye
geçti, plan uygulandı, konsey oturumu kapandı, rota tamamlandı) silinmez — buraya
taşınır. Böylece git geçmişi korunur, ağaç temiz kalır, ve silme kararı tek komutla
kullanıcının olur.

**Buraya taşınma şartı:** dosyaya `teknesyum/`, `scripts/`, `test/`, `bench/`,
`.github/` ya da `README.md` içinden atıf **yok**. Atıf varsa dosya canlıdır,
taşınmaz.

**Silmek için:**

```powershell
Remove-Item -Recurse -Force _coplik; git add -A; git commit -m "coplik bosaltildi"
```

Geri almak için: `git log --diff-filter=D -- _coplik` ile taşındığı commit bulunur.
