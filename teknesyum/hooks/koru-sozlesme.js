const path = require('path');

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let j = {};
  try { j = JSON.parse(raw); } catch { process.exit(0); }

  const t = j.tool_input || {};
  const target = t.file_path || t.notebook_path || '';
  if (!target) process.exit(0);

  const norm = path.normalize(target).replace(/\\/g, '/');
  if (/\/\.claude\/relay\/contracts\/done\//i.test(norm)) {
    process.stderr.write(
      'ENGELLENDİ: contracts/done/ tamamlanmış sözleşmeler içindir, salt okunur.\n' +
      'Sözleşme yeniden açılacaksa T0 dosyayı contracts/ altına geri taşır ve status: open yapar.\n' +
      'Yeni bulgu varsa LOG.md\'ye satır ekle.'
    );
    process.exit(2);
  }
  process.exit(0);
});
