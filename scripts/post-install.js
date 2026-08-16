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

const HOME = process.env.CLAUDE_HOME || path.join(os.homedir(), '.claude');
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

const HUYLAR = `# Huylar

Tekrar eden takıntılar ve daha önce canımı yakmış şeyler. **30 satır tavanı** —
dolduğunda yeni satır ekleme, en zayıfını sil veya birleştir. \`/rule\` ile eklenir.

- Kodda yorum istemiyorum; açıkça istemediysem yazma.
- Rutin onay sorma. Geri dönüşü zor olmayan her şeyi yap, sonucunu bildir.
- Uzun özet çıkarma. Ne değişti, nerede — o kadar.
- Renk/ölçü uydurma. \`teknesyum-ui\` tokenları dışına çıkma.
- İşi yarıda bırakma; kapsamı kendi kendine daraltma.
`;

(async () => {
  fs.mkdirSync(HOME, { recursive: true });

  // 1. statusline betiği
  const yerel = path.join(__dirname, '..', 'teknesyum', 'scripts', 'statusline.js');
  if (fs.existsSync(yerel)) {
    fs.copyFileSync(yerel, SL);
    yapilan.push('statusline betiği kopyalandı');
  } else {
    try {
      await indir(RAW + '/teknesyum/scripts/statusline.js', SL);
      yapilan.push('statusline betiği indirildi');
    } catch (e) {
      atlanan.push('statusline betiği alınamadı: ' + e.message);
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
      s.statusLine = { type: 'command', command: 'node "' + SL.replace(/\\/g, '/') + '"' };
      sDegisti = true;
      yapilan.push('statusLine settings.json\'a yazıldı');
    }
  }

  // Otomatik sıkıştırma penceresi. Varsayılan eşik uzun oturumlarda erken devreye girip
  // bağlamı kesiyor. TEKNESYUM_AUTOCOMPACT ile değiştirilir, 'kapali' ile hiç dokunulmaz.
  // Kullanıcının kendi değeri varsa üzerine YAZILMAZ — bu bir tercih, bir eksiklik değil.
  const acIstek = (process.env.TEKNESYUM_AUTOCOMPACT || '250000').toLowerCase();
  if (acIstek === 'kapali' || acIstek === 'off') {
    atlanan.push('autoCompactWindow atlandı (TEKNESYUM_AUTOCOMPACT=kapali)');
  } else if (typeof s.autoCompactWindow === 'number') {
    atlanan.push('autoCompactWindow zaten ' + s.autoCompactWindow + ', dokunulmadı');
  } else if (!/^\d+$/.test(acIstek)) {
    atlanan.push('TEKNESYUM_AUTOCOMPACT sayı değil (' + acIstek + '), autoCompactWindow atlandı');
  } else {
    s.autoCompactWindow = Number(acIstek);
    sDegisti = true;
    yapilan.push('autoCompactWindow = ' + acIstek + ' yazıldı (/autocompact <sayi> ile değişir)');
  }

  if (sDegisti) fs.writeFileSync(sp, JSON.stringify(s, null, 2));

  // 3. HUYLAR.md
  const hp = path.join(HOME, 'HUYLAR.md');
  if (!fs.existsSync(hp)) {
    fs.writeFileSync(hp, HUYLAR);
    yapilan.push('HUYLAR.md oluşturuldu');
  } else {
    atlanan.push('HUYLAR.md zaten var, korundu');
  }

  const cp = path.join(HOME, 'CLAUDE.md');
  let c = fs.existsSync(cp) ? fs.readFileSync(cp, 'utf8') : '';
  if (!/@HUYLAR\.md/.test(c)) {
    fs.writeFileSync(cp, '@HUYLAR.md\n' + c);
    yapilan.push('CLAUDE.md\'ye @HUYLAR.md eklendi');
  }

  // 4. opsiyonel bağımlılıklar
  const { execSync } = require('child_process');
  const varMi = (k) => { try { execSync(k, { stdio: 'ignore' }); return true; } catch { return false; } };
  const eksik = [];
  if (!varMi('typescript-language-server --version')) eksik.push('typescript-language-server  (npm i -g typescript typescript-language-server)  → TS tip zekâsı');
  if (!varMi('graphify --version')) eksik.push('graphify  (uv tool install graphifyy)  → büyük kod tabanı indeksleme');

  console.log('\n  Teknesyum — Claude Code Teknesyum Base\n');
  for (const y of yapilan) console.log('  ✓ ' + y);
  for (const a of atlanan) console.log('  · ' + a);
  if (eksik.length) {
    console.log('\n  Opsiyonel, kurulmadı:');
    for (const e of eksik) console.log('    - ' + e);
  }
  console.log('\n  Claude Code\'u yeniden başlat.\n');
})();
