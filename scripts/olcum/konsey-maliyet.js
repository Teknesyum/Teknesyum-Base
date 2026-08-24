'use strict';

const fs = require('fs');
const path = require('path');

function projeSlug(kok) {
  return kok.split(':').join('-').split('\\').join('-').split('/').join('-');
}

function ajanKoku() {
  const sid = process.env.CLAUDE_CODE_SESSION_ID;
  const ev = process.env.USERPROFILE || process.env.HOME;
  if (!sid || !ev) return null;
  return path.join(ev, '.claude', 'projects', projeSlug(process.cwd()), sid, 'subagents');
}

function coz(arg) {
  if (fs.existsSync(arg) && fs.statSync(arg).size > 0) return arg;
  const kok = ajanKoku();
  if (!kok) return arg;
  const ad = path.basename(arg).replace(/^agent-/, '').replace(/\.(output|jsonl)$/, '');
  const aday = path.join(kok, 'agent-' + ad + '.jsonl');
  return fs.existsSync(aday) ? aday : arg;
}

function satirlar(dosya) {
  return fs.readFileSync(dosya, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(function (s) { try { return JSON.parse(s); } catch (e) { return null; } })
    .filter(Boolean);
}

function olc(dosya) {
  const kayit = satirlar(dosya);
  if (!kayit.length) return null;
  const t = { girdi: 0, onbellekYazim: 0, onbellekOkuma: 0, cikti: 0, cagri: 0 };
  let model = null;
  for (const k of kayit) {
    const u = k.message && k.message.usage;
    if (!u) continue;
    t.cagri += 1;
    t.girdi += u.input_tokens || 0;
    t.onbellekYazim += u.cache_creation_input_tokens || 0;
    t.onbellekOkuma += u.cache_read_input_tokens || 0;
    t.cikti += u.output_tokens || 0;
    if (!model && k.message.model) model = k.message.model;
  }
  const ilk = Date.parse(kayit[0].timestamp);
  const son = Date.parse(kayit[kayit.length - 1].timestamp);
  t.saniye = Number.isFinite(ilk) && Number.isFinite(son) ? Math.round((son - ilk) / 1000) : 0;
  t.model = model || '?';
  t.dosya = path.basename(dosya);
  return t;
}

function esdeger(t) {
  return Math.round(t.girdi + t.onbellekYazim * 1.25 + t.onbellekOkuma * 0.1 + t.cikti * 5);
}

function bin(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

function main() {
  const arg = process.argv.slice(2);
  const girdiler = [];
  const bayrak = {};
  for (let i = 0; i < arg.length; i += 1) {
    if (arg[i].startsWith('--')) { bayrak[arg[i].slice(2)] = arg[i + 1]; i += 1; continue; }
    girdiler.push(arg[i]);
  }
  if (!girdiler.length) {
    console.error('kullanim: node scripts/olcum/konsey-maliyet.js <ajanId|transkript...> [--konu "..."] --tur N [--yaz docs/stats/konsey.md]');
    process.exit(2);
  }

  const yol = girdiler.map(coz);
  const eksik = yol.filter(function (f) { return !fs.existsSync(f) || fs.statSync(f).size === 0; });
  if (eksik.length) {
    console.error('bulunamadi ya da bos: ' + eksik.join(', '));
    process.exit(3);
  }

  const olcum = yol.map(olc).filter(Boolean);
  const toplam = olcum.reduce(function (a, t) {
    return {
      girdi: a.girdi + t.girdi,
      onbellekYazim: a.onbellekYazim + t.onbellekYazim,
      onbellekOkuma: a.onbellekOkuma + t.onbellekOkuma,
      cikti: a.cikti + t.cikti,
      cagri: a.cagri + t.cagri,
    };
  }, { girdi: 0, onbellekYazim: 0, onbellekOkuma: 0, cikti: 0, cagri: 0 });
  const sure = olcum.reduce(function (m, t) { return Math.max(m, t.saniye); }, 0);

  for (const t of olcum) {
    console.log(t.model + ' · cagri ' + t.cagri + ' · cikti ' + bin(t.cikti)
      + ' · onbellek-okuma ' + bin(t.onbellekOkuma) + ' · ' + t.saniye + 'sn');
  }
  console.log('toplam · cikti ' + bin(toplam.cikti) + ' · esdeger ' + bin(esdeger(toplam))
    + ' · duvar suresi ' + sure + 'sn');

  if (bayrak.yaz) {
    // `Tip` sutunu dustu — "lite" ayri bir kavram degil, uzatilmamis kosunun adi.
    // Geriye ucuz kosuyu pahalidan ayiran tek boyut olarak `Tur` kaldi; bos kalirsa
    // tabloda ayrim kalmaz. O yuzden satir yazmayi reddediyoruz, '?' yazmiyoruz.
    const tur = Number(bayrak.tur);
    if (!Number.isFinite(tur) || tur < 1) {
      console.error('--tur verilmeden satir yazilmaz: tur sayisi tablonun tek ayirt edici boyutu');
      process.exit(4);
    }
    const satir = '| ' + (bayrak.konu || '?') + ' | ' + tur + ' | ' + olcum.length + ' | '
      + bin(toplam.cikti) + ' | ' + bin(esdeger(toplam)) + ' | ' + sure + ' |';
    fs.appendFileSync(path.resolve(bayrak.yaz), satir + '\n', 'utf8');
    console.log('yazildi: ' + bayrak.yaz);
  }
}

main();
