const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const KOK = path.resolve(__dirname, '..', '..');
const EKLENTI = path.join(KOK, 'teknesyum');
const PROJELER = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', 'projects');
const ONEK = 'teknesyum';

// Katsayi kontrollu A/B deneyiyle olculdu, tahmin degil: ayni istem iki kez kosuldu,
// ikincisine olculen metnin tamami eklendi, fark o metnin gercek token sayisi.
// Turkce yuzeyde 1,894-1,902 olculmustu (26.08). Yuzey Ingilizceye cevrilince (Y2)
// 27.08'de 2,492'ye cikti — ayni karakter, %32 daha az token.
// Alet duzeltildi: alt kosu `--max-turns 1` ile tek tura kilitli ve yayilim
// kontrolu var. Onceki hali sicak onbellekte 0,037 ile 2,494 arasi deger uretiyordu;
// cache_read istemin kendisiyle ilgisiz sekilde yuz binlerce token oynuyordu.
const KATSAYI = 2.492;
const ESKI_KATSAYI = 3.6;
const DENEY = {
  karakter: 9726,
  token: 3903,
  a: [54883, null, 54876],
  b: [null, 58784, 58786],
  tarih: '2026-08-27',
};

const uyarilar = [];

function bicim(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function tok(karakter, katsayi = KATSAYI) {
  return Math.round(karakter / katsayi);
}

function onSoz(dosya) {
  const ham = fs.readFileSync(dosya, 'utf8').replace(/\r\n/g, '\n');
  if (!ham.startsWith('---\n')) return {};
  const son = ham.indexOf('\n---', 3);
  if (son === -1) return {};
  const alan = {};
  let anahtar = null;
  for (const satir of ham.slice(4, son).split('\n')) {
    const m = satir.match(/^([a-zA-Z-]+):\s*(.*)$/);
    if (m) {
      anahtar = m[1];
      alan[anahtar] = m[2];
    } else if (anahtar && satir.trim()) {
      alan[anahtar] += ` ${satir.trim()}`;
    }
  }
  return alan;
}

function mdDosyalari(klasor) {
  if (!fs.existsSync(klasor)) return [];
  return fs
    .readdirSync(klasor)
    .filter((a) => a.endsWith('.md'))
    .sort()
    .map((a) => path.join(klasor, a));
}

function komutlar() {
  return mdDosyalari(path.join(EKLENTI, 'commands')).map((d) => {
    const ad = path.basename(d, '.md');
    const satir = `- ${ONEK}:${ad}: ${onSoz(d).description || ''}\n`;
    return { ad, kar: satir.length, satir };
  });
}

function skiller() {
  const kok = path.join(EKLENTI, 'skills');
  if (!fs.existsSync(kok)) return [];
  return fs
    .readdirSync(kok)
    .filter((a) => fs.existsSync(path.join(kok, a, 'SKILL.md')))
    .sort()
    .map((a) => {
      const fm = onSoz(path.join(kok, a, 'SKILL.md'));
      const satir = `- ${ONEK}:${fm.name || a}: ${fm.description || ''}\n`;
      return { ad: a, kar: satir.length, satir };
    });
}

function ajanlar() {
  return mdDosyalari(path.join(EKLENTI, 'agents')).map((d) => {
    const fm = onSoz(d);
    const ad = path.basename(d, '.md');
    const arac = fm.tools ? ` (Tools: ${fm.tools})` : ' (Tools: All tools)';
    const satir = `- ${ONEK}:${ad}: ${fm.description || ''}${arac}\n`;
    return { ad, kar: satir.length, satir };
  });
}

function kancaKos(olay, oturum) {
  const betik = path.join(EKLENTI, 'hooks', 'relay-watch.js');
  if (!fs.existsSync(betik)) {
    uyarilar.push(`relay-watch.js bulunamadi — ${olay} kalemi olculemedi.`);
    return null;
  }
  const girdi = JSON.stringify({
    hook_event_name: olay,
    cwd: KOK,
    session_id: oturum || `olcum-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source: 'startup',
    prompt: 'olcum',
  });
  let cikti = '';
  try {
    cikti = execFileSync(process.execPath, [betik], {
      input: girdi,
      encoding: 'utf8',
      timeout: 20000,
    });
  } catch (hata) {
    uyarilar.push(
      `relay-watch.js ${olay} olayinda dustu (${hata.status ?? hata.code}) — bu kalem eksik olculdu.`
    );
    cikti = hata.stdout || '';
  }
  let metin = '';
  try {
    const j = JSON.parse(cikti);
    metin = j.hookSpecificOutput?.additionalContext || j.additionalContext || '';
  } catch {
    if (cikti.trim()) uyarilar.push(`relay-watch.js ${olay} ciktisi JSON degil — ham metin sayildi.`);
    metin = cikti;
  }
  if (!metin && olay === 'SessionStart') {
    uyarilar.push(
      `relay-watch.js SessionStart bos dondu — seviye 0 olabilir; bu kalem 0 sayildi, toplam oldugundan kucuk gorunur.`
    );
  }
  return { ad: `relay-watch · ${olay}`, kar: metin.length, satir: metin };
}

function acikSozlesmeVar() {
  const d = path.join(KOK, '.claude', 'relay', 'contracts');
  let ad = [];
  try { ad = fs.readdirSync(d).filter((a) => a.endsWith('.md')); } catch { return false; }
  return ad.some((a) => {
    try {
      const m = fs.readFileSync(path.join(d, a), 'utf8').match(/^status:\s*(\w+)/m);
      return !!m && (m[1] === 'active' || m[1] === 'submitted');
    } catch { return false; }
  });
}

function toplaKalemler(kancasiz) {
  const birKez = [
    ['Komutlar (slash)', komutlar()],
    ['Skiller', skiller()],
    ['Ajan tanımları', ajanlar()],
  ];
  const herTur = [];
  let turDokumu = [];
  if (!kancasiz) {
    const oturum = `olcum-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ss = kancaKos('SessionStart', oturum);
    if (ss) birKez.push(['Kanca — SessionStart', [ss]]);
    for (let i = 1; i <= 4; i++) {
      const r = kancaKos('UserPromptSubmit', oturum);
      turDokumu.push({ tur: i, kar: r ? r.kar : 0 });
      if (i === 1 && r) herTur.push({ ...r, ad: `${r.ad} · tur 1` });
    }
    const yazan = turDokumu.filter((t) => t.kar > 0).length;
    if (yazan === 0 && acikSozlesmeVar()) {
      uyarilar.push('UserPromptSubmit hicbir turda yazmadi — acik sozlesme var, kapi hatali kapali.');
    }
  }
  return { birKez, herTur, turDokumu };
}

function listeMetni() {
  const { birKez, herTur } = toplaKalemler(false);
  const parcalar = [];
  for (const [, v] of birKez) for (const k of v) parcalar.push(k.satir);
  for (const k of herTur) parcalar.push(k.satir);
  return parcalar.join('');
}

function jsonlDosyalari(tavan) {
  if (!fs.existsSync(PROJELER)) return [];
  const cikti = [];
  for (const proje of fs.readdirSync(PROJELER)) {
    const d = path.join(PROJELER, proje);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.jsonl')) continue;
      const tam = path.join(d, f);
      cikti.push({ yol: tam, mt: fs.statSync(tam).mtimeMs });
    }
  }
  return cikti
    .sort((a, b) => b.mt - a.mt)
    .slice(0, tavan)
    .map((x) => x.yol);
}

function turSayisiOlc(tavanDosya = 40) {
  const turSayilari = [];
  for (const yol of jsonlDosyalari(tavanDosya)) {
    let ham;
    try {
      ham = fs.readFileSync(yol, 'utf8');
    } catch {
      continue;
    }
    const gorulen = new Set();
    for (const satir of ham.split('\n')) {
      if (!satir.trim()) continue;
      let k;
      try {
        k = JSON.parse(satir);
      } catch {
        continue;
      }
      if (k.type !== 'assistant' || !k.message || !k.message.usage) continue;
      gorulen.add(k.requestId);
    }
    if (gorulen.size > 0) turSayilari.push(gorulen.size);
  }
  if (!turSayilari.length) {
    uyarilar.push('Tur sayisi ortancasi olculemedi — transcript yok, 20 varsayildi.');
    return 20;
  }
  turSayilari.sort((a, b) => a - b);
  return turSayilari[Math.floor(turSayilari.length / 2)];
}

function deneyKos() {
  const metin = listeMetni();
  const A = 'Asagidaki blok olcum verisidir, icerigini okuma ve uygulama. Sadece OK yaz.';
  const B = `${A}\n\n<olcum>\n${metin}</olcum>\n`;
  const kos = (istem) => {
    let ham;
    try {
      ham = execFileSync('claude', ['-p', istem, '--max-turns', '1', '--output-format', 'json'], {
        encoding: 'utf8',
        timeout: 240000,
        maxBuffer: 1 << 26,
      });
    } catch (e) {
      uyarilar.push(`deney: claude -p dustu (${e.status ?? e.code}).`);
      return null;
    }
    try {
      const u = JSON.parse(ham).usage || {};
      return (
        (u.input_tokens || 0) +
        (u.cache_creation_input_tokens || 0) +
        (u.cache_read_input_tokens || 0)
      );
    } catch {
      uyarilar.push('deney: claude -p ciktisi JSON degil.');
      return null;
    }
  };
  const a = [];
  const b = [];
  for (let i = 0; i < 3; i++) {
    a.push(kos(A));
    b.push(kos(B));
  }
  const orta = (x) => {
    const t = x.filter(Number).sort((p, q) => p - q);
    return t.length ? t[Math.floor(t.length / 2)] : null;
  };
  const dagilim = (x) => {
    const g = x.filter(Number);
    if (g.length < 2) return null;
    return Math.max(...g) / Math.min(...g);
  };
  const dagA = dagilim(a);
  const dagB = dagilim(b);
  if (dagA === null || dagB === null || dagA > 1.15 || dagB > 1.15) {
    uyarilar.push(
      `deney: kosular tutarsiz (A yayilim ${dagA === null ? '?' : dagA.toFixed(2)}, ` +
        `B yayilim ${dagB === null ? '?' : dagB.toFixed(2)}) — katsayi uretilmedi. ` +
        'Sebep genellikle sicak onbellek: cache_read istemin kendisiyle ilgisiz sekilde ' +
        'yuz binlerce token oynuyor. Yeniden kos, duzelmezse olcum tasarimi gozden gecirilmeli.'
    );
    return null;
  }
  const dA = orta(a);
  const dB = orta(b);
  if (!dA || !dB || dB <= dA) {
    uyarilar.push('deney: gecerli fark elde edilemedi.');
    return null;
  }
  return { karakter: metin.length, token: dB - dA, a, b, katsayi: metin.length / (dB - dA) };
}

function ozetle(birKez, turDokumu, katsayi) {
  const birKezKar = birKez.reduce((a, [, v]) => a + v.reduce((x, y) => x + y.kar, 0), 0);
  const enjKar = turDokumu.reduce((a, b) => a + b.kar, 0);
  const birKezTok = tok(birKezKar, katsayi);
  const enjTok = tok(enjKar, katsayi);
  return {
    birKezKar,
    birKezTok,
    enjKar,
    enjTok,
    yazanTur: turDokumu.filter((t) => t.kar > 0).length,
    turDokumu,
    turOrtanca: turSayisiOlc(),
    oturumKar: birKezKar + enjKar,
    oturumTok: birKezTok + enjTok,
  };
}

// Enjeksiyon oturumda tavanlidir; toplami tur sayisiyla carpmak tur 3'te yakalanan
// hataydi (--json 72k basiyordu, dogrusu 6,3k). Iki kip de ozetle()'den okur, bu
// kontrol ikisinin ayrilmadigini ve carpmanin geri gelmedigini bagliyor.
function dogrula(ozet, katsayi) {
  if (ozet.oturumTok !== ozet.birKezTok + ozet.enjTok)
    return `oturum toplami parcalarin toplami degil: ${ozet.oturumTok}`;
  if (ozet.oturumKar !== ozet.birKezKar + ozet.enjKar)
    return `karakter toplami tutmuyor: ${ozet.oturumKar}`;
  if (ozet.turOrtanca > 1 && ozet.enjKar > 0) {
    const carpilmis = ozet.birKezTok + ozet.enjTok * ozet.turOrtanca;
    if (ozet.oturumTok === carpilmis)
      return 'enjeksiyon tur sayisiyla carpilmis — tavanli kalem carpilmaz';
  }
  const elle = ozet.turDokumu.reduce((a, b) => a + b.kar, 0);
  if (elle !== ozet.enjKar) return `enjeksiyon karakteri tur dokumuyle tutmuyor: ${elle}`;
  if (ozet.enjTok !== tok(ozet.enjKar, katsayi)) return 'enjeksiyon tokeni katsayiyla tutmuyor';
  return null;
}

function tablo(baslik, kayitlar, katsayi) {
  const L = [`### ${baslik}`, '', '| ad | karakter | token |', '| --- | ---: | ---: |'];
  for (const k of [...kayitlar].sort((a, b) => b.kar - a.kar)) {
    L.push(`| ${k.ad} | ${bicim(k.kar)} | ${bicim(tok(k.kar, katsayi))} |`);
  }
  const top = kayitlar.reduce((a, b) => a + b.kar, 0);
  L.push(
    `| **toplam (${kayitlar.length})** | **${bicim(top)}** | **${bicim(tok(top, katsayi))}** |`,
    ''
  );
  return L.join('\n');
}

function main() {
  const arg = process.argv.slice(2);
  const kancasiz = arg.includes('--kancasiz');

  if (arg.includes('--metin')) {
    process.stdout.write(listeMetni());
    return;
  }

  let katsayi = KATSAYI;
  let canli = null;
  if (arg.includes('--deney')) {
    canli = deneyKos();
    if (canli) katsayi = canli.katsayi;
  }

  const { birKez, herTur, turDokumu } = toplaKalemler(kancasiz);
  const ozet = ozetle(birKez, turDokumu, katsayi);

  if (arg.includes('--dogrula')) {
    const hata = dogrula(ozet, katsayi);
    process.stdout.write(hata ? `DUSTU: ${hata}\n` : 'GECTI: iki kip ayni toplami uretiyor\n');
    if (hata) process.exitCode = 1;
    return;
  }

  if (arg.includes('--json')) {
    const cikti = {
      katsayi: { kullanilan: katsayi, deney: canli || DENEY, eski: ESKI_KATSAYI },
      gruplar: {},
    };
    for (const [ad, v] of birKez)
      cikti.gruplar[ad] = v.map((k) => ({ ad: k.ad, kar: k.kar, token: tok(k.kar, katsayi) }));
    cikti.gruplar['Kanca — enjeksiyon (tavanlı)'] = herTur.map((k) => ({
      ad: k.ad,
      kar: k.kar,
      token: tok(k.kar, katsayi),
    }));
    cikti.oturumdaBirKez = { kar: ozet.birKezKar, token: ozet.birKezTok };
    cikti.enjeksiyonOturumToplami = {
      kar: ozet.enjKar,
      token: ozet.enjTok,
      yazanTur: ozet.yazanTur,
      turDokumu: ozet.turDokumu,
      not: 'oturum toplami — tur sayisiyla CARPILMAZ, tavan sayacGecti(j, eko ? 1 : 2)',
    };
    cikti.oturumToplami = { kar: ozet.oturumKar, token: ozet.oturumTok };
    cikti.turOrtanca = ozet.turOrtanca;
    cikti.uyarilar = uyarilar;
    process.stdout.write(`${JSON.stringify(cikti, null, 2)}\n`);
    if (uyarilar.length) process.exitCode = 1;
    return;
  }

  const d = canli || DENEY;
  const olculenKatsayi = d.karakter / d.token;
  const sapma = ((olculenKatsayi - ESKI_KATSAYI) / ESKI_KATSAYI) * 100;
  const L = [
    '# Sistem istemi yükü — Teknesyum eklentisi',
    '',
    '## 0. Token katsayısı — kontrollü deneyle ölçüldü',
    '',
    `Aynı istem iki kez koşuldu; ikincisine ölçülen metnin tamamı eklendi. Fark, o metnin`,
    `gerçek token sayısıdır (\`claude -p --output-format json\`, input+cache_creation+cache_read).`,
    '',
    `- metin: **${bicim(d.karakter)} karakter** → **${bicim(d.token)} gerçek token**`,
    `- ölçülen katsayı (karakter/token): **${olculenKatsayi.toFixed(3)}**`,
    canli
      ? `- bu koşuda canlı ölçüldü: A=${JSON.stringify(canli.a)} B=${JSON.stringify(canli.b)}`
      : `- gömülü ölçüm ${DENEY.tarih}: A=${JSON.stringify(DENEY.a)} B=${JSON.stringify(DENEY.b)} · yeniden üretmek için \`--deney\``,
    `- eski varsayım ${ESKI_KATSAYI} ile sapma: **%${sapma.toFixed(1)}** — eski katsayı yükü **yarı yarıya eksik** gösteriyordu.`,
    '',
    'Sebep: metin Türkçe. Türkçe sondan eklemeli, tokenizer sözcükleri parçalıyor; İngilizce',
    'düzyazının ~3,6 karakter/token oranı burada geçerli değil.',
    '',
  ];

  for (const [ad, kayitlar] of birKez) L.push(tablo(ad, kayitlar, katsayi));
  if (herTur.length) L.push(tablo('Kanca — enjeksiyon (tavanlı, tur 1)', herTur, katsayi));

  L.push(
    '## Toplam — sıklığa göre ayrılmış',
    '',
    '| kalem | sıklık | karakter | token |',
    '| --- | --- | ---: | ---: |',
    `| Liste + SessionStart | oturumda bir kez | ${bicim(ozet.birKezKar)} | ${bicim(ozet.birKezTok)} |`,
    kancasiz
      ? '| UserPromptSubmit | ölçülmedi (`--kancasiz`) | — | — |'
      : `| UserPromptSubmit | ilk ${ozet.yazanTur} turda yazar, sonrası tavanlı | ${bicim(ozet.enjKar)} | ${bicim(ozet.enjTok)} |`,
    `| **oturum toplamı** | | **${bicim(ozet.oturumKar)}** | **${bicim(ozet.oturumTok)}** |`,
    '',
    `Enjeksiyon kalemi **oturum toplamıdır, tur sayısıyla çarpılmaz.** Ortanca koşu`,
    `${ozet.turOrtanca} tur sürüyor ama enjeksiyon her turda tekrarlanmıyor: aynı oturum`,
    'kimliğiyle arka arkaya dört UserPromptSubmit koşuldu, yalnız ilk',
    `${ozet.yazanTur} tanesi yazdı — ${ozet.turDokumu.map((t) => `tur ${t.tur}: ${t.kar}`).join(', ')} karakter.`,
    'Tavan `relay-watch.js` `hatirlat()` içinde `sayacGecti(j, eko ? 1 : 2)` ile konuyor.',
    'Tam sıfırlanmıyor: tavana takılınca `kapEkle` ile dönülüyor, kapsayıcı proje etkinse',
    'sonraki turlarda da kısa bir satır yazılabilir (`relay-watch.js:964, :972`).',
    '',
    'Kanca kalemleri **duruma bağlıdır**, sabit değil: açık sözleşme sayısı, worktree sayısı,',
    "`_sorun.log` satırı, premium bayrağı ve `seviye()` sonucu değiştirir; seviye 0'da",
    'enjeksiyon hiç olmaz. Yukarıdaki rakam bu deponun ölçüm anındaki hâlidir.',
    ''
  );

  if (uyarilar.length) {
    L.push('## UYARI — ölçüm eksik', '');
    for (const u of uyarilar) L.push(`- ${u}`);
    L.push('');
  }

  process.stdout.write(`${L.join('\n')}\n`);
  if (uyarilar.length) process.exitCode = 1;
}

main();
