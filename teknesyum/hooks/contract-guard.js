const fs = require('fs');
const path = require('path');

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let j = {};
  try {
    j = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  try {
    karar(j);
  } catch {
    process.exit(0);
  }
  process.exit(0);
});

// Yol göreli de gelebilir (`.claude/relay/contracts/done/T1.md`). Başında `/` arayan
// eski desen bu biçimi kaçırıyordu — sınır `(^|/)` ile yazılır.
const DONE = /(^|\/)\.claude\/relay\/contracts\/done\//i;
// Mühür tek satır değil: `audit: passed` yazmak ucuz, denetçi kimliği + diff + doğrulama
// kanıtı yazmak değil. Dördü birden dolu olmadan done/ kapısı açılmaz. Alan `—` ise boş sayılır.
const MUHUR = /^audit:[ \t]*(passed|gecti)[ \t]*$/im;
const alan = (ad) => new RegExp('^' + ad + ':[ \\t]*(?![—\\-]?[ \\t]*$)\\S', 'im');
const KANIT = ['auditor_id', 'diff', 'verification'].map(alan);

function muhurlu(metin) {
  const s = String(metin);
  return MUHUR.test(s) && KANIT.every((r) => r.test(s));
}
// ÖLÇÜLDÜ: `>>?` serbest duruyordu ve düzyazıdaki `<sebep>` gibi bir metni yönlendirme
// sandı — `contracts/done/` sözünü içeren masum bir belge yazımı engellendi. Yönlendirme
// işareti boşlukla başlar; kelime ortasındaki `>` yönlendirme değildir.
const YAZMA_FIILI =
  /(^|[\s;|&])((mv|move-item|cp|copy-item|rm|remove-item|del|erase|touch|tee|sed\s+-i|set-content|add-content|out-file|new-item)\b|>>?)/i;

// ÖLÇÜLDÜ: sözleşme durumu ajanın beyanıyla ilerliyordu; bir düzeltme turunda `submitted`
// olan sözleşme yeniden `open` yazılıp denetim sırası sıfırlandı. Merdiven tek yönlüdür.
// `blocked` her iki yönde serbesttir — engel gerçek bir durumdur, kurtarma da öyle.
const SIRA = { open: 0, active: 1, submitted: 2, accepted: 3, done: 3 };
const CONTRACTS = /(^|\/)\.claude\/relay\/contracts\/[^/]+\.md$/i;

function durum(metin) {
  const m = String(metin).match(/^status:[ \t]*([a-z]+)/im);
  return m ? m[1].toLowerCase() : null;
}

function gerileme(hedef, yeniMetin) {
  if (!CONTRACTS.test(norm(hedef))) return;
  const yeni = durum(yeniMetin);
  if (yeni === null || SIRA[yeni] === undefined) return;
  let eski = null;
  try {
    eski = durum(fs.readFileSync(hedef, 'utf8'));
  } catch {
    return;
  }
  if (eski === null || SIRA[eski] === undefined) return;
  if (SIRA[yeni] >= SIRA[eski]) return;
  return engelle(
    'Sözleşme durumu geriye alınamaz: ' + eski + ' -> ' + yeni + '.',
    'Merdiven tek yönlü: open -> active -> submitted -> done. Tıkandıysan status: blocked yaz,',
    'gerekçeyi sözleşmeye işle. Turu sıfırlamak denetim sırasını da sıfırlar.'
  );
}

function karar(j) {
  const arac = j.tool_name || '';
  const t = j.tool_input || {};

  if (/^(Write|Edit|NotebookEdit)$/.test(arac)) {
    const hedef = t.file_path || t.notebook_path || '';
    if (!hedef) return;
    gerileme(hedef, arac === 'Write' ? t.content || '' : t.new_string || '');
    if (!DONE.test(norm(hedef))) return;
    // Write mührü taşıyorsa denetimden geçmiş sözleşmenin yerleşmesidir; Edit hiçbir
    // koşulda meşru değil — bitmiş sözleşme değiştirilmez.
    if (arac === 'Write' && muhurlu(t.content || '')) return;
    return engelle(
      'contracts/done/ denetimden geçmiş sözleşmeler içindir, salt okunur.',
      'Mühür dört alan ister: audit: passed · auditor_id · diff · verification.',
      'Sözleşme yeniden açılacaksa T0 dosyayı contracts/ altına geri taşır ve status: open yapar.'
    );
  }

  if (arac !== 'Bash') return;
  const komut = String(t.command || '');
  if (!/contracts[\\/]done/i.test(komut)) return;
  // Yazma fiili komutun herhangi bir yerinde değil, `done/` yolunun geçtiği parçada
  // aranır. Zincirin başka bir halkasındaki `rm` bu yolla ilgisizdir.
  const parca = komut
    .split(/[\n;]|&&|\|\||\|/)
    .filter((x) => /contracts[\\/]done/i.test(x) && YAZMA_FIILI.test(x));
  if (!parca.length) return; // okuma serbest: cat, ls, grep

  // Tek meşru yazma: denetimi geçmiş bir sözleşmeyi done/ altına taşımak. Kaynak
  // dosyada mühür varsa geçir. Komuttan kaynak çıkaramıyorsak kapalı tarafa düş.
  for (const aday of yollar(parca.join(' '))) {
    if (DONE.test(norm(aday))) continue;
    try {
      if (muhurlu(fs.readFileSync(aday, 'utf8'))) return;
    } catch {}
  }
  return engelle(
    'contracts/done/ altına kabuktan yazma engellendi.',
    'Sözleşme oraya ancak denetçi GEÇTİ verdikten ve T0 dört alanlı mührü — audit: passed ·',
    'auditor_id · diff · verification — işledikten sonra taşınır. Denetim atlanamaz.'
  );
}

function yollar(komut) {
  const out = [];
  for (const m of komut.matchAll(/["']?([\w.~\-/\\:]+\.md)["']?/g)) out.push(m[1]);
  return out;
}

function norm(p) {
  return path.normalize(String(p)).replace(/\\/g, '/');
}

function engelle(...satir) {
  process.stderr.write('ENGELLENDİ: ' + satir.join('\n'));
  process.exit(2);
}
