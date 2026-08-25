// Beş UI suite'i vardı ve hiçbiri koşmuyordu. Ölçüldü (25.08.2026, dış denetim TB-012):
// 750 kontrol, 95 kB test kodu — ne `npm test` ne CI çağırıyordu. Yazılmış ama bağlanmamış
// test, olmayan testten daha kötüdür: yeşil rapor kapsadığını sandığı yeri kapsamaz.
const { spawnSync } = require('child_process');
const path = require('path');

const SUITE = [
  'run.js',
  'u3-forms.js',
  'u4-renk.js',
  'u5-a11y.js',
  'u7-avalonia.js',
  'u8-glow.js',
  'u9-renkkorlugu.js',
  'u11-tema.js',
];

let kalan = 0;
for (const ad of SUITE) {
  const r = spawnSync(process.execPath, [path.join(__dirname, ad)], { stdio: 'inherit' });
  if (r.error) {
    console.error('\n' + ad + ' çalıştırılamadı: ' + r.error.message);
    kalan++;
    continue;
  }
  if (r.signal) {
    console.error('\n' + ad + ' sinyalle düştü: ' + r.signal);
    kalan++;
    continue;
  }
  if (r.status !== 0) kalan++;
}

if (kalan) {
  console.error('\n⨯ ' + kalan + ' suite düştü');
  process.exit(1);
}
console.log('\n✓ ' + SUITE.length + ' suite geçti');
