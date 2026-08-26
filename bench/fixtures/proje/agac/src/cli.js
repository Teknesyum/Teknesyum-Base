const fs = require('node:fs');
const path = require('node:path');

const { ayristirCsv } = require('./ayristir.js');

const VERI = path.join(__dirname, '..', 'veri');

function main() {
  const komut = process.argv[2] || 'rapor';
  if (komut !== 'rapor') {
    process.stderr.write('bilinmeyen komut: ' + komut + '\n');
    process.exit(1);
  }
  const satislar = ayristirCsv(fs.readFileSync(path.join(VERI, 'satis.csv'), 'utf8'));
  process.stdout.write(satislar.length + ' satis kaydi\n');
}

main();
