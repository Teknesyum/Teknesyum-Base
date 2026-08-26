const { spawnSync } = require('child_process');
const path = require('path');

const BETIK = path.join(__dirname, '..', 'scripts', 'olcum', 'istem-yuku.js');

const r = spawnSync(process.execPath, [BETIK, '--dogrula'], { encoding: 'utf8' });

if (r.error) {
  console.error('ölçüm doğrulaması çalıştırılamadı: ' + r.error.message);
  process.exit(1);
}

process.stdout.write(r.stdout || '');
if (r.stderr) process.stderr.write(r.stderr);

if (r.status !== 0) {
  console.error('\nÖlçüm doğrulaması — KALDI (çıkış ' + r.status + ')');
  process.exit(1);
}

console.log('Ölçüm doğrulaması — GEÇTİ');
