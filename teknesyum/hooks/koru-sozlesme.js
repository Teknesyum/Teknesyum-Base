const fs = require('fs');
const path = require('path');

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let j = {};
  try { j = JSON.parse(raw); } catch { process.exit(0); }
  try { karar(j); } catch { process.exit(0); }
  process.exit(0);
});

// Yol göreli de gelebilir (`.claude/relay/contracts/done/T1.md`). Başında `/` arayan
// eski desen bu biçimi kaçırıyordu — sınır `(^|/)` ile yazılır.
const DONE = /(^|\/)\.claude\/relay\/contracts\/done\//i;
const MUHUR = /denetim:\s*gecti/i;
const YAZMA_FIILI = /(^|[\s;|&])(mv|move-item|cp|copy-item|rm|remove-item|del|erase|touch|tee|sed\s+-i|set-content|add-content|out-file|new-item)\b|>>?/i;

function karar(j) {
  const arac = j.tool_name || '';
  const t = j.tool_input || {};

  if (/^(Write|Edit|NotebookEdit)$/.test(arac)) {
    const hedef = t.file_path || t.notebook_path || '';
    if (!hedef || !DONE.test(norm(hedef))) return;
    // Write mührü taşıyorsa denetimden geçmiş sözleşmenin yerleşmesidir; Edit hiçbir
    // koşulda meşru değil — bitmiş sözleşme değiştirilmez.
    if (arac === 'Write' && MUHUR.test(String(t.content || ''))) return;
    return engelle(
      'contracts/done/ denetimden geçmiş sözleşmeler içindir, salt okunur.',
      'Sözleşme yeniden açılacaksa T0 dosyayı contracts/ altına geri taşır ve status: open yapar.'
    );
  }

  if (arac !== 'Bash') return;
  const komut = String(t.command || '');
  if (!/contracts[\\/]done/i.test(komut)) return;
  if (!YAZMA_FIILI.test(komut)) return;  // okuma serbest: cat, ls, grep

  // Tek meşru yazma: denetimi geçmiş bir sözleşmeyi done/ altına taşımak. Kaynak
  // dosyada mühür varsa geçir. Komuttan kaynak çıkaramıyorsak kapalı tarafa düş.
  for (const aday of yollar(komut)) {
    if (DONE.test(norm(aday))) continue;
    try { if (MUHUR.test(fs.readFileSync(aday, 'utf8'))) return; } catch {}
  }
  return engelle(
    'contracts/done/ altına kabuktan yazma engellendi.',
    'Sözleşme oraya ancak denetçi GEÇTİ verdikten ve T0 sözleşmeye `denetim: gecti` mührünü',
    'işledikten sonra taşınır. Denetim atlanamaz.'
  );
}

function yollar(komut) {
  const out = [];
  for (const m of komut.matchAll(/["']?([\w.~\-/\\:]+\.md)["']?/g)) out.push(m[1]);
  return out;
}

function norm(p) { return path.normalize(String(p)).replace(/\\/g, '/'); }

function engelle(...satir) {
  process.stderr.write('ENGELLENDİ: ' + satir.join('\n'));
  process.exit(2);
}
