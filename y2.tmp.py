import io
B=chr(92)
p='teknesyum/hooks/contract-guard.js'
s=io.open(p,encoding='utf-8').read()
a='function karar(j) {'
yeni2 = ur"""// ÖLÇÜLDÜ: yönlendirici dosya "AGENTS.md" diye kararlaştırıldı ama oturumlar klasör
// başına dolu dolu `CLAUDE.md` yazmaya devam etti — kullanıcı Claude dışında araç da
// kullanıyor ve o araçlar bu dosyayı okumuyor. Tek satırlık işaretçi (`@AGENTS.md`)
// serbest; gövdeli olanı engellenir. Ev dizinindeki `~/.claude/CLAUDE.md` kural dışı.
function yonlendirici(hedef, icerik) {
  const yol = norm(path.resolve(hedef));
  if (!/(^|\/)CLAUDE\.md$/i.test(yol)) return;
  if (/(^|\/)\.claude\/CLAUDE\.md$/i.test(yol)) return;
  const satir = String(icerik)
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !x.startsWith('<!--'));
  if (satir.length <= 2 && satir.every((x) => /^@\S+\.md$/.test(x))) return;
  return engelle(...ceviri('yonlendiriciDosya'));
}

"""
s=s.replace(a, yeni2+a, 1)
a2="    if (arac === 'Write') onArastirma(hedef);"
assert a2 in s
s=s.replace(a2, a2+"\n    if (arac === 'Write') yonlendirici(hedef, t.content || '');",1)
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
