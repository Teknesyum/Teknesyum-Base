# Hata: pano depo geride mi sorusunu yanlis soruyor, 107 commit geride 'guncel' dedi

**Durum:** açık.
**Belirti:** /update calisti ve 'Depo · main, uzakla esit' bastı; ayni anda git status -sb 'behind 107' diyordu
**Kaynak:** teknesyum/scripts/depo-surum.js:64
**Görüldüğü proje:** Vidshrink

---

## 1. Ne oldu

Kullanıcı `/update` çalıştırdı. Pano şunu döndü:

```json
"depo":{"depo":"...Vidshrink","dal":"main","geride":false}
```

Komut buna dayanarak `Depo · main, uzakla eşit` bastı ve ardından
`Hazır — kod yazmaya geçebiliriz.` dedi.

Aynı anda gerçek durum şuydu:

```
git status -sb  →  ## main...origin/main [behind 107]
git rev-parse HEAD        →  5c3f6aee15a3c1bdaf3d56386b7e2cf698fcaad7
git rev-parse origin/main →  754939c932bf2ab90135366bf4fa7a0c78830f58
git rev-list --count 5c3f6ae..754939c  →  107
```

Yani depo **107 commit** gerideydi ve pano "güncel" dedi.

### Kök neden

`depo-surum.js` içinde:

```js
function yereldeVar(depo, sha) {
  return git(depo, ['cat-file', '-e', sha + '^{commit}']) !== null;
}

function geride(depo) {
  ...
  const u = uzakSha(depo, d);            // ls-remote ile uzak ucu doğru okuyor
  if (!u) return null;
  if (u === y) return { depo, dal: d, geride: false };
  return { depo, dal: d, geride: !yereldeVar(depo, u) };   // ← satır 64
}
```

`uzakSha` doğru çalışıyor — `ls-remote` ile uzağın gerçek ucunu alıyor. Kusur bir sonraki
adımda: `yereldeVar` **yanlış soruyu** soruyor.

`git cat-file -e <sha>^{commit}` şunu sorar: *"bu nesne benim nesne deposumda var mı?"*

Sorulması gereken şu: *"benim dalım bu commit'i içeriyor mu?"*

İkisi aynı şey değil. Bir commit nesnesi yerele **herhangi bir yoldan** düşer ve orada
kalır: başka bir oturumun `fetch`'i, bir worktree'nin nesne deposunu paylaşması, yarım
kalmış bir `pull`, `git log origin/main` çağrısı. Nesne bir kez düştükten sonra
`cat-file -e` sonsuza dek başarılı olur ve `geride` **hep `false`** döner — dal ne kadar
geride olursa olsun.

Bu depoda tam olarak bu oldu: uzak commit'lerin nesneleri yereldeydi (bir worktree ve
önceki oturumlar yüzünden), dal ise 107 commit gerideydi.

### Tekrar üretme

Nesne varlığı ile dal ilerlemesinin ayrı şeyler olduğu bu depoda doğrudan gösterilebilir:

```
git cat-file -e 9a861b0^{commit}                 → başarılı (nesne var)
git merge-base --is-ancestor 9a861b0 HEAD        → başarısız (HEAD'in atası değil)
```

Yani `yereldeVar` bu commit için `true` der, oysa dal onu içermiyor.

### Önerilen düzeltme

Soru varlık değil **soy** olmalı. İki doğru yoldan biri:

```js
// commit dalın atası mı?
function iceriyor(depo, sha) {
  return git(depo, ['merge-base', '--is-ancestor', sha, 'HEAD']) !== null;
}
return { depo, dal: d, geride: !iceriyor(depo, u) };
```

ya da doğrudan sayarak:

```js
// kaç commit geride
const c = git(depo, ['rev-list', '--count', y + '..' + u]);
return { depo, dal: d, geride: Number(c) > 0, gerideSayi: Number(c) };
```

İkisi de uzak commit nesnesinin yerelde olmasını gerektirir; nesne yoksa `fetch`
gerekir. Bu yüzden `geride` hesabından önce sessiz bir `git fetch --quiet origin <dal>`
koymak (mevcut 3 sn zaman aşımıyla) hem nesneyi getirir hem ölçümü doğrular. Ağ yoksa
`fetch` başarısız olur ve o durumda `null` dönüp "bakılamadı" demek, "güncel" demekten
doğrudur.

`gerideSayi` alanı eklenirse `/update` "Depo · main, **107 commit geride** · `git pull`"
yazabilir; bugün yalnız ikili bir bayrak var.

### Neden önemli

`/update` komutunun sözleşmesi kullanıcının kendi cümlesiyle şu: *"hem base güncel hem
proje güncel emin olmalıydı."* Bugün komut bunu garanti etmiyor ve **sessizce yanlış**
cevap veriyor — hata vermek yerine "Hazır, kod yazmaya geçebiliriz" diyor. Kullanıcı buna
güvenip 107 commit geriden iş açarsa çakışma kaçınılmaz.

## 2. Ölçü

Bu hatanın kapandığını gösteren tek şey:

**Dalı bilerek geride bırakıp `pano --json` çağrıldığında `depo.geride` `true` dönmeli —
üstelik uzak commit nesneleri yerelde varken.**

Somut sınama:

```
git fetch origin main                        # nesneler yerele insin
git reset --hard HEAD~5                      # dal 5 commit geri
node scripts/oturum.js pano --json           # depo.geride === true olmalı
git reset --hard origin/main                 # geri al
node scripts/oturum.js pano --json           # depo.geride === false olmalı
```

Birinci çağrı bugün `false` dönüyor; `true` döndüğünde kusur kapanmıştır.
