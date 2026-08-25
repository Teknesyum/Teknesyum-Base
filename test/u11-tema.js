'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const kok = path.resolve(__dirname, '..');
const assets = path.join(kok, 'teknesyum', 'skills', 'teknesyum-ui', 'assets');
const uretici = path.join(assets, 'tema-uret.js');
const tokenDosyasi = path.join(assets, 'theme.tokens.json');
const uretilenler = ['theme.css', 'Theme.xaml', 'Theme.axaml', 'Palette.cs'];

const sorunlar = [];
const kontrol = (kosul, mesaj) => { if (!kosul) sorunlar.push(mesaj); };

const T = JSON.parse(fs.readFileSync(tokenDosyasi, 'utf8'));

kontrol(typeof T.meta === 'object' && typeof T.meta.neden === 'string' && T.meta.neden.length > 0, 'meta.neden yok');
for (const grup of ['marka', 'rol', 'turetilmis', 'sure', 'easing', 'font']) {
  kontrol(typeof T[grup] === 'object', 'grup yok: ' + grup);
  for (const [ad, t] of Object.entries(T[grup] || {})) {
    kontrol(typeof t.neden === 'string' && t.neden.length > 0, grup + '.' + ad + ' neden alani tasimiyor');
  }
}
for (const [ad, t] of Object.entries(T.marka || {})) {
  kontrol(/^#[0-9a-f]{6}$/.test(t.deger || ''), 'marka.' + ad + ' gecerli hex degil');
}
for (const [ad, t] of Object.entries(T.rol || {})) {
  const degerli = t.deger !== undefined, refli = t.ref !== undefined;
  kontrol(degerli !== refli, 'rol.' + ad + ' ya deger ya ref tasimali, ikisi birden ya da hicbiri degil');
}
for (const [ad, t] of Object.entries(T.turetilmis || {})) {
  kontrol(t.deger === undefined, 'turetilmis.' + ad + ' hesaplanmis deger tasiyor; bildirimsel olmali (ref/tabanlar + alpha)');
}

const once = uretilenler.map(d => fs.readFileSync(path.join(assets, d)));
const kos = () => cp.spawnSync(process.execPath, [uretici], { encoding: 'utf8' });

const r1 = kos();
kontrol(r1.status === 0, 'uretici birinci kosuda dustu: ' + (r1.stderr || '').slice(0, 300));
const birinci = uretilenler.map(d => fs.readFileSync(path.join(assets, d)));
uretilenler.forEach((d, i) => {
  kontrol(once[i].equals(birinci[i]), d + ' depodaki halinden farkli uretildi — elle mi duzenlendi, JSON mu kaydi?');
});

const r2 = kos();
kontrol(r2.status === 0, 'uretici ikinci kosuda dustu');
const ikinci = uretilenler.map(d => fs.readFileSync(path.join(assets, d)));
uretilenler.forEach((d, i) => {
  kontrol(birinci[i].equals(ikinci[i]), d + ' iki kosuda ayni cikmadi — betik idempotent degil');
});

try {
  const diff = cp.execSync(
    'git diff --numstat -- ' + uretilenler.map(d => '"teknesyum/skills/teknesyum-ui/assets/' + d + '"').join(' '),
    { cwd: kok, encoding: 'utf8' }
  ).trim();
  kontrol(diff === '', 'uret sonrasi git diff bos degil:\n' + diff);
} catch (e) {
  kontrol(false, 'git diff kosulamadi: ' + e.message.slice(0, 200));
}

const duz = s => s.replace(/\s+/g, ' ');
const icerikler = {};
for (const d of uretilenler) icerikler[d] = duz(fs.readFileSync(path.join(assets, d), 'utf8'));

const aranacaklar = {
  'theme.css': [
    '`--tk-info` BİLEREK YOK',
    'ROL KAZANIR',
    'Rol tokenı marka tokenının DEĞERİNİ izler',
    '`--tk-disabled` tek başına kullanılmaz',
    '6.11:1', '7.33:1', '12.58:1', '3.59:1', '1.67:1', '2.17', '1.82',
    'ΔE2000 15.2'
  ],
  'Theme.xaml': [
    '`Info` BILEREK YOK',
    'ROL KAZANIR',
    'Bu firca tek basina kullanilmaz',
    '6.11:1', '7.33:1', '12.58:1', '3.59:1', '1.67:1',
    'dE2000 15.2'
  ],
  'Theme.axaml': [
    'ANLAMSAL ROL KATMANI',
    'Bu firca tek basina kullanilmaz',
    'bilerek yok'
  ],
  'Palette.cs': [
    '`Info` BİLEREK YOK',
    'ROL KAZANIR',
    'Bu renk tek başına kullanılmaz',
    '6.11:1', '7.33:1', '12.58:1', '3.59:1', '1.67:1', '2.17', '1.82',
    'ΔE2000 15.2'
  ]
};
for (const [dosya, listeler] of Object.entries(aranacaklar)) {
  for (const parca of listeler) {
    kontrol(icerikler[dosya].includes(parca), dosya + ' gerekce yorumunu kaybetti: ' + JSON.stringify(parca));
  }
}

kontrol(icerikler['theme.css'].includes('@theme') && icerikler['theme.css'].includes(':root'), 'theme.css iki katmani da tasimiyor');
kontrol(icerikler['Palette.cs'].includes('[38;2;'), 'Palette.cs ANSI sabitlerini tasimiyor');

if (sorunlar.length) {
  console.error('KALDI');
  for (const s of sorunlar) console.error('  - ' + s);
  process.exit(1);
}
console.log('GEÇTİ');
