#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DURUMLAR = ['yalin', 'eco', 'normal', 'premium'];

const STANDART = [
  {
    ad: 'startpos',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    beklenen: [20, 400, 8902, 197281, 4865609],
  },
  {
    ad: 'kiwipete',
    fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    beklenen: [48, 2039, 97862, 4085603],
  },
  {
    ad: 'pos3',
    fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
    beklenen: [14, 191, 2812, 43238, 674624],
  },
  {
    ad: 'pos4',
    fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    beklenen: [6, 264, 9467, 422333],
  },
  {
    ad: 'pos5',
    fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    beklenen: [44, 1486, 62379, 2103487],
  },
  {
    ad: 'pos6',
    fen: 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
    beklenen: [46, 2079, 89890, 3894594],
  },
];

// Chess960 için yayınlanmış tek bir referans kümesi yok; üç koşu birbirine karşı
// doğrulanır. Üçü aynı sayıyı veriyorsa doğru sayılır, ayrışma bulgudur.
const C960 = [
  { ad: '960-bqnb', fen: 'bqnb1rkr/pp3ppp/3ppn2/2p5/5P2/P2P4/NPP1P1PP/BQ1BNRKR w HFhf - 2 9' },
  { ad: '960-2nnr', fen: '2nnrbkr/p1qppppp/8/1ppP4/P7/1PPB4/3NPPPP/2NRQBKR w HEhe - 1 9' },
  { ad: '960-b1q1', fen: 'b1q1rrkb/pppppppp/3nn3/8/P7/1PPP4/4PPPP/BQNNRKRB w GE - 1 9' },
  { ad: '960-qbbn', fen: 'qbbnnrkr/2pp2pp/p7/1p2pp2/8/P3PP2/1PPP1KPP/QBBNNR1R w hf - 0 9' },
];

function kok() {
  const i = process.argv.indexOf('--kok');
  return path.resolve(
    i > 0 && process.argv[i + 1] ? process.argv[i + 1] : path.join(__dirname, '..', '..')
  );
}

function klasor(durum) {
  return path.join(kok(), 'Bench-Chess960-' + durum);
}

function varMi(durum) {
  return fs.existsSync(path.join(klasor(durum), 'dist', 'perft.js'));
}

function perft(durum, fen, derinlik, saniye) {
  const t = Date.now();
  const r = spawnSync(process.execPath, ['dist/perft.js', fen, String(derinlik)], {
    cwd: klasor(durum),
    encoding: 'utf8',
    timeout: (saniye || 60) * 1000,
  });
  const ham = String(r.stdout || '').trim();
  const m = ham.match(/(\d[\d.,_]*)\s*$/);
  return {
    sayi: m ? Number(m[1].replace(/[.,_]/g, '')) : null,
    ms: Date.now() - t,
    hata: r.status !== 0 || !m ? String(r.stderr || ham).slice(0, 120) : null,
  };
}

function kodOlc(durum) {
  const dip = klasor(durum);
  let dosya = 0;
  let satir = 0;
  const gez = (d) => {
    let l = [];
    try {
      l = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of l) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) gez(p);
      else if (/\.ts$/.test(e.name)) {
        dosya++;
        try {
          satir += fs.readFileSync(p, 'utf8').split('\n').length;
        } catch {}
      }
    }
  };
  gez(dip);
  return { dosya, satir };
}

function raporOku(durum) {
  const p = path.join(klasor(durum), 'BENCH.md');
  let s = '';
  try {
    s = fs.readFileSync(p, 'utf8');
  } catch {
    return {};
  }
  const al = (re) => {
    const m = s.match(re);
    return m ? m[1].trim() : null;
  };
  return {
    sure: al(/^S(?:ü|u)re:\s*(.+)$/m),
    ajan: al(/^Ajan:\s*(.+)$/m),
    depo: al(/^Taranan depo:\s*(.+)$/m),
    test: al(/^Kendi testlerim:\s*(.+)$/m),
    derin: al(/^En derin (?:çalışan|calisan) perft:\s*(.+)$/m),
  };
}

function standartOlc(durum, tavan) {
  let enDerin = 0;
  let ilkHata = null;
  for (const k of STANDART) {
    for (let d = 1; d <= Math.min(k.beklenen.length, tavan); d++) {
      const r = perft(durum, k.fen, d, 90);
      if (r.sayi === k.beklenen[d - 1]) {
        if (k.ad === 'startpos') enDerin = Math.max(enDerin, d);
        continue;
      }
      if (!ilkHata) {
        ilkHata = k.ad + ' d' + d + ': ' + (r.hata || r.sayi + ' ≠ ' + k.beklenen[d - 1]);
      }
      break;
    }
  }
  return { enDerin, ilkHata };
}

function c960Capraz(mevcut, tavan) {
  const satir = [];
  for (const k of C960) {
    for (let d = 1; d <= tavan; d++) {
      const sonuc = {};
      for (const durum of mevcut) sonuc[durum] = perft(durum, k.fen, d, 90).sayi;
      const degerler = [...new Set(Object.values(sonuc).filter((x) => x !== null))];
      if (degerler.length > 1) {
        satir.push({ konum: k.ad, derinlik: d, sonuc });
      }
    }
  }
  return satir;
}

function main() {
  const tavan = Number(
    (process.argv.indexOf('--derinlik') > 0 && process.argv[process.argv.indexOf('--derinlik') + 1]) ||
      4
  );
  const mevcut = DURUMLAR.filter(varMi);
  const eksik = DURUMLAR.filter((d) => !varMi(d));

  const out = [];
  out.push('# Bench değerlendirmesi — Chess960 hamle üreteci');
  out.push('');
  out.push('Perft referansları standart satranç için yayınlanmış değerlerdir; Chess960');
  out.push('tarafında yayınlanmış tek bir küme olmadığı için koşular birbirine karşı');
  out.push('doğrulandı — üçü aynı sayıyı veriyorsa doğru sayıldı, ayrışma bulgu sayıldı.');
  out.push('');
  if (eksik.length) out.push('Eksik koşu: ' + eksik.join(', ') + '');
  out.push('');

  out.push('| Durum | Perft (startpos) | İlk hata | Kod | Süre | Ajan | Test |');
  out.push('|---|---:|---|---:|---|---|---|');
  for (const durum of mevcut) {
    const s = standartOlc(durum, tavan);
    const k = kodOlc(durum);
    const r = raporOku(durum);
    out.push(
      '| `' +
        durum +
        '` | d' +
        s.enDerin +
        ' | ' +
        (s.ilkHata || '—') +
        ' | ' +
        k.satir +
        ' satır / ' +
        k.dosya +
        ' dosya | ' +
        (r.sure || '?') +
        ' | ' +
        (r.ajan || '?') +
        ' | ' +
        (r.test || '?') +
        ' |'
    );
  }
  out.push('');

  const ayrisma = c960Capraz(mevcut, Math.min(tavan, 3));
  out.push('## Chess960 çapraz doğrulama');
  out.push('');
  if (!ayrisma.length) {
    out.push('Ayrışma yok — ' + mevcut.length + ' koşu bütün konumlarda aynı sayıyı verdi.');
  } else {
    out.push('| Konum | Derinlik | ' + mevcut.join(' | ') + ' |');
    out.push('|---|---:|' + mevcut.map(() => '---:').join('|') + '|');
    for (const a of ayrisma) {
      out.push(
        '| ' +
          a.konum +
          ' | ' +
          a.derinlik +
          ' | ' +
          mevcut.map((d) => (a.sonuc[d] === null ? 'hata' : a.sonuc[d])).join(' | ') +
          ' |'
      );
    }
  }

  process.stdout.write(out.join('\n') + '\n');
}

main();
