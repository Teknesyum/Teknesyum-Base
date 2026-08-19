// Statusline köprüsü. `settings.json` sabit bir yola işaret eder, bu dosya çalışma
// anında kurulu en yeni eklenti sürümünü bulup gerçek statusline'ı çalıştırır.
//
// Neden gerekli: eklenti önbelleği sürüm numarasıyla klasörleniyor.
// settings.json oraya işaret ederse ilk güncellemede statusline kırılır; elle kopya
// alınırsa güncellemeler kullanıcıya hiç ulaşmaz. Köprü ikisini de çözer.

const fs = require('fs');
const path = require('path');

const kok =
  process.env.CLAUDE_CONFIG_DIR ||
  path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude');

const aday = [
  path.join(kok, 'plugins', 'cache', 'teknesyum', 'teknesyum'),
  path.join(kok, 'plugins', 'teknesyum', 'teknesyum'),
];

function enYeni() {
  for (const d of aday) {
    let l = [];
    try {
      l = fs.readdirSync(d).filter((x) => /^\d+\.\d+\.\d+$/.test(x));
    } catch {
      continue;
    }
    l.sort(karsilastir);
    for (const s of l) {
      const p = path.join(d, s, 'scripts', 'statusline.js');
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function karsilastir(a, b) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
}

const hedef = enYeni();
if (!hedef) {
  process.stdout.write('teknesyum: eklenti bulunamadı — /setup çalıştır');
  process.exit(0);
}
require(hedef);
