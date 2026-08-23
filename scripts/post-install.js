#!/usr/bin/env node
/**
 * Plugin'in taşıyamadığı iki şeyi bağlar: statusline ve huy dosyası.
 * install.ps1 / install.sh tarafından çağrılır, elle de çalıştırılabilir:
 *   node post-install.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const HOME = process.env.CLAUDE_CONFIG_DIR || process.env.CLAUDE_HOME || path.join(os.homedir(), '.claude');
const RAW = 'https://raw.githubusercontent.com/Teknesyum/teknesyum-base/main';
const SL = path.join(HOME, 'teknesyum-statusline.js');
const yapilan = [];
const atlanan = [];

function indir(url, hedef) {
  return new Promise((ok, hata) => {
    https.get(url, (r) => {
      if (r.statusCode === 302 || r.statusCode === 301) return indir(r.headers.location, hedef).then(ok, hata);
      if (r.statusCode !== 200) return hata(new Error('HTTP ' + r.statusCode));
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => { fs.writeFileSync(hedef, Buffer.concat(chunks)); ok(); });
    }).on('error', hata);
  });
}

// Kurulum kural yazmaz, kural defteri açar. Buraya konan her satır kurulumu yapan kişinin
// bütün projelerinde yürürlüğe girer; eklentiyi yazanın alışkanlıkları eklentiyi kuranı
// bağlamaz. İlk kural `/rule` ile gelir.
const RULES = `# Rules

Recurring preferences and things that have burned me before. **30-line ceiling** — when it
is full, don't append; delete the weakest line or merge two. Added with \`/rule\`.

<!-- empty on purpose — add your first rule with /rule -->
`;

(async () => {
  fs.mkdirSync(HOME, { recursive: true });

  // 1. statusline köprüsü. Buraya statusline.js'in kopyası YAZILMAZ: kopya donar, eklenti
  // güncellendiğinde eski sürüm çalışmaya devam eder. bridge.js sürüm taşımaz, çalışma
  // anında en yeni plugin cache klasörünü bulur.
  const yerel = path.join(__dirname, '..', 'teknesyum', 'scripts', 'bridge.js');
  if (fs.existsSync(yerel)) {
    fs.copyFileSync(yerel, SL);
    yapilan.push('statusline köprüsü kuruldu');
  } else {
    try {
      await indir(RAW + '/teknesyum/scripts/bridge.js', SL);
      yapilan.push('statusline köprüsü indirildi');
    } catch (e) {
      atlanan.push('statusline köprüsü alınamadı: ' + e.message);
    }
  }

  // 2. settings.json
  const sp = path.join(HOME, 'settings.json');
  let s = {};
  if (fs.existsSync(sp)) {
    try { s = JSON.parse(fs.readFileSync(sp, 'utf8')); }
    catch { atlanan.push('settings.json okunamadı (bozuk JSON) — statusline elle eklenmeli'); }
  }
  let sDegisti = false;
  if (fs.existsSync(SL)) {
    if (s.statusLine && s.statusLine.command && !/teknesyum-statusline/.test(s.statusLine.command)) {
      atlanan.push('statusLine zaten tanımlı, dokunulmadı — değiştirmek istersen: ' + SL);
    } else {
      const node = process.execPath.replace(/\\/g, '/');
      s.statusLine = { type: 'command', command: '"' + node + '" "' + SL.replace(/\\/g, '/') + '"' };
      sDegisti = true;
      yapilan.push('statusLine settings.json\'a yazıldı');
    }
  }

  const AUTOCOMPACT = { eco: 100000, normal: 'auto', premium: 1000000 };
  let profil = '';
  try {
    const tk = JSON.parse(fs.readFileSync(path.join(HOME, 'teknesyum.json'), 'utf8'));
    if (AUTOCOMPACT[tk.profil]) profil = tk.profil;
  } catch {}
  const acIstek = (process.env.TEKNESYUM_AUTOCOMPACT || '').toLowerCase();
  if (acIstek === 'kapali' || acIstek === 'off') {
    atlanan.push('autoCompactWindow atlandı (TEKNESYUM_AUTOCOMPACT=kapali)');
  } else if (typeof s.autoCompactWindow === 'number') {
    atlanan.push('autoCompactWindow zaten ' + s.autoCompactWindow + ', dokunulmadı');
  } else if (acIstek && (!/^\d+$/.test(acIstek) || Number(acIstek) < 100000 || Number(acIstek) > 1000000)) {
    atlanan.push('TEKNESYUM_AUTOCOMPACT 100000–1000000 aralığında değil (' + acIstek + '), atlandı');
  } else if (acIstek) {
    s.autoCompactWindow = Number(acIstek);
    sDegisti = true;
    yapilan.push('autoCompactWindow = ' + acIstek + ' yazıldı (TEKNESYUM_AUTOCOMPACT)');
  } else if (profil && AUTOCOMPACT[profil] === 'auto') {
    atlanan.push('autoCompactWindow yazılmadı — ' + profil + ' profili Claude Code varsayılanını (auto) kullanır');
  } else if (profil) {
    s.autoCompactWindow = AUTOCOMPACT[profil];
    sDegisti = true;
    yapilan.push(
      'autoCompactWindow = ' + AUTOCOMPACT[profil] + ' yazıldı (' + profil + ' profilinden)'
    );
  } else {
    atlanan.push('autoCompactWindow bekliyor — /teknesyum:setup global profili sorup türetecek');
  }

  if (sDegisti) fs.writeFileSync(sp, JSON.stringify(s, null, 2));

  // 3. RULES.md
  const hp = path.join(HOME, 'RULES.md');
  if (!fs.existsSync(hp)) {
    fs.writeFileSync(hp, RULES);
    yapilan.push('RULES.md oluşturuldu');
  } else {
    atlanan.push('RULES.md zaten var, korundu');
  }

  const cp = path.join(HOME, 'CLAUDE.md');
  let c = fs.existsSync(cp) ? fs.readFileSync(cp, 'utf8') : '';
  if (!/@RULES\.md/.test(c)) {
    fs.writeFileSync(cp, '@RULES.md\n' + c);
    yapilan.push('CLAUDE.md\'ye @RULES.md eklendi');
  }

  // 4. opsiyonel bağımlılıklar
  const { spawnSync } = require('child_process');
  const varMi = (komut) => {
    const r =
      process.platform === 'win32'
        ? spawnSync(komut + ' --version', { stdio: 'ignore', shell: true })
        : spawnSync(komut, ['--version'], { stdio: 'ignore' });
    return !r.error && r.status === 0;
  };
  const eksik = [];
  if (!varMi('typescript-language-server')) eksik.push('typescript-language-server  (npm i -g typescript typescript-language-server)  → TS tip zekâsı');
  if (!varMi('graphify')) eksik.push('graphify  (uv tool install graphifyy)  → büyük kod tabanı indeksleme');

  console.log('\n  Teknesyum Base\n');
  for (const y of yapilan) console.log('  ✓ ' + y);
  for (const a of atlanan) console.log('  · ' + a);
  if (eksik.length) {
    console.log('\n  Opsiyonel, kurulmadı:');
    for (const e of eksik) console.log('    - ' + e);
  }
  console.log('\n  Claude Code\'u yeniden başlat.\n');
})();
