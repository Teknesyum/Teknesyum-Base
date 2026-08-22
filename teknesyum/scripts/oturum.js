#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const KLASOR = 'oturumlar';
const YAKIN_TUR = 10;
const CAP = { yakinKullanici: 4000, yakinClaude: 2500, eskiKullanici: 400, eskiClaude: 300 };

function arg(ad, varsayilan) {
  const i = process.argv.indexOf('--' + ad);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : varsayilan;
}
function bayrak(ad) {
  return process.argv.includes('--' + ad);
}
function dur(mesaj) {
  process.stderr.write(mesaj + '\n');
  process.exit(1);
}

const TR = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};
function slug(s) {
  return String(s)
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => TR[c])
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 60);
}
function damga(d) {
  const p = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    p(d.getMonth() + 1) +
    '-' +
    p(d.getDate()) +
    '-' +
    p(d.getHours()) +
    p(d.getMinutes())
  );
}
function saat(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    p(d.getMonth() + 1) +
    '-' +
    p(d.getDate()) +
    ' ' +
    p(d.getHours()) +
    ':' +
    p(d.getMinutes())
  );
}

function projeKok() {
  return path.resolve(arg('proje', process.cwd()));
}
function kayitKok(kok) {
  return path.join(kok, '.claude', KLASOR);
}

function transkriptDizini(kok) {
  return path.join(os.homedir(), '.claude', 'projects', kok.replace(/[^a-zA-Z0-9]/g, '-'));
}

// ÖLÇÜLDÜ: oturum `Projeler` üst klasöründe açılıp iş alt projede yapılınca kayıt
// "oturum bulunamadı" diyordu — transkript oturumun açıldığı klasörün altında duruyor,
// kaydedilen proje başka. Kimlik elimizdeyken doğru dosyayı bulmak bir taramalık iş.
function transkriptAra(oturum) {
  if (!oturum) return null;
  const dip = path.join(os.homedir(), '.claude', 'projects');
  let dizinler = [];
  try {
    dizinler = fs.readdirSync(dip);
  } catch {
    return null;
  }
  for (const d of dizinler) {
    const aday = path.join(dip, d, oturum + '.jsonl');
    if (fs.existsSync(aday)) return aday;
  }
  return null;
}

function transkriptBul(kok) {
  const acik = arg('transkript', null);
  if (acik) {
    if (!fs.existsSync(acik)) dur('transkript yok: ' + acik);
    return acik;
  }
  // Aynı projede iki sohbet açıkken en yeni dosya öteki sohbetin olabilir. Claude Code
  // kendi oturum kimliğini ortama koyar; tahmin etmek yerine onu sor.
  const oturum = arg('oturum', process.env.CLAUDE_CODE_SESSION_ID || null);
  const dizin = transkriptDizini(kok);
  if (!fs.existsSync(dizin)) {
    const baska = transkriptAra(oturum);
    if (baska) return baska;
    dur('bu proje için transkript klasörü yok: ' + dizin);
  }
  const dosyalar = fs
    .readdirSync(dizin)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => {
      const yol = path.join(dizin, f);
      return { yol, ad: f.replace(/\.jsonl$/, ''), zaman: fs.statSync(yol).mtimeMs };
    })
    .sort((a, b) => b.zaman - a.zaman);
  if (!dosyalar.length) dur('transkript bulunamadı: ' + dizin);
  if (oturum) {
    const bul = dosyalar.find((x) => x.ad === oturum);
    if (bul) return bul.yol;
    const baska = transkriptAra(oturum);
    if (baska) return baska;
    dur('oturum bulunamadı: ' + oturum);
  }
  return dosyalar[0].yol;
}

function temizle(metin) {
  return String(metin || '')
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function aracOzeti(blok) {
  const g = blok.input || {};
  const hedef =
    g.file_path ||
    g.path ||
    g.notebook_path ||
    g.command ||
    g.pattern ||
    g.url ||
    g.prompt ||
    g.skill ||
    g.query ||
    '';
  const kisa = temizle(hedef).split('\n')[0].slice(0, 80);
  return blok.name + (kisa ? ' ' + kisa : '');
}

function ayikla(yol) {
  const satirlar = fs.readFileSync(yol, 'utf8').split('\n');
  const turlar = [];
  const kuyruk = [];
  const dokunulan = new Set();
  let taslak = null;
  let kullanim = null;
  let model = null;
  let oturumId = null;
  let dal = null;
  let cwd = null;
  let surum = null;
  let baslik = null;
  let sonZaman = null;
  let altAjan = 0;
  let aracSayisi = 0;

  for (const satir of satirlar) {
    if (!satir.trim()) continue;
    let j;
    try {
      j = JSON.parse(satir);
    } catch (e) {
      continue;
    }
    if (j.sessionId) oturumId = j.sessionId;
    if (j.gitBranch) dal = j.gitBranch;
    if (j.cwd) cwd = j.cwd;
    if (j.version) surum = j.version;
    if (j.timestamp) sonZaman = j.timestamp;

    if (j.type === 'last-prompt' && j.lastPrompt) taslak = j.lastPrompt;
    if (j.type === 'ai-title' && j.aiTitle) baslik = j.aiTitle;
    if (j.type === 'queue-operation') {
      if (j.operation === 'enqueue' && j.content) kuyruk.push(j.content);
      else if (j.operation === 'dequeue') kuyruk.shift();
      continue;
    }
    if (j.isSidechain) {
      if (j.type === 'assistant') altAjan++;
      continue;
    }

    if (j.type === 'user' && j.message) {
      if (j.toolUseResult) continue;
      const icerik = j.message.content;
      let metin = '';
      if (typeof icerik === 'string') metin = icerik;
      else if (Array.isArray(icerik)) {
        if (icerik.some((b) => b && b.type === 'tool_result')) continue;
        metin = icerik
          .filter((b) => b && b.type === 'text')
          .map((b) => b.text)
          .join('\n');
      }
      metin = temizle(metin);
      if (!metin) continue;
      turlar.push({
        no: turlar.length + 1,
        zaman: j.timestamp,
        kullanici: metin,
        claude: [],
        araclar: [],
      });
      continue;
    }

    if (j.type === 'assistant' && j.message) {
      if (j.message.usage) kullanim = j.message.usage;
      if (j.message.model) model = j.message.model;
      if (!turlar.length) {
        turlar.push({
          no: 1,
          zaman: j.timestamp,
          kullanici: '(oturum başı)',
          claude: [],
          araclar: [],
        });
      }
      const tur = turlar[turlar.length - 1];
      for (const blok of j.message.content || []) {
        if (!blok) continue;
        if (blok.type === 'text' && temizle(blok.text)) tur.claude.push(temizle(blok.text));
        if (blok.type === 'tool_use') {
          aracSayisi++;
          tur.araclar.push(aracOzeti(blok));
          const g = blok.input || {};
          const dosya = g.file_path || g.notebook_path;
          if (dosya && /^(Edit|Write|NotebookEdit)$/.test(blok.name)) dokunulan.add(dosya);
        }
      }
    }
  }

  return {
    turlar,
    kuyruk,
    taslak,
    kullanim,
    model,
    oturumId,
    dal,
    cwd,
    surum,
    baslik,
    sonZaman,
    altAjan,
    aracSayisi,
    dokunulan: [...dokunulan],
  };
}

function kirp(metin, sinir) {
  if (!sinir || metin.length <= sinir) return metin;
  return metin.slice(0, sinir) + '\n… (' + (metin.length - sinir) + ' karakter kırpıldı)';
}

function gitHam(kok, parca) {
  return spawnSync('git', parca, { cwd: kok, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}
function git(kok, ...parca) {
  const r = gitHam(kok, parca);
  if (r.status !== 0) return null;
  return (r.stdout || '').trim();
}

function gitDurum(kok) {
  const sha = git(kok, 'rev-parse', 'HEAD');
  if (sha === null) return null;
  return {
    sha,
    dal: git(kok, 'rev-parse', '--abbrev-ref', 'HEAD'),
    baslik: git(kok, 'log', '-1', '--pretty=%s'),
    kirli: (git(kok, 'status', '--porcelain', '-uall') || '')
      .split('\n')
      .filter(Boolean)
      .filter(
        (l) =>
          l
            .slice(3)
            .replace(/^"|"$/g, '')
            .indexOf('.claude/' + KLASOR + '/') !== 0
      ),
  };
}

const YAMA_SINIR = 256 * 1024;

function yamaUret(kok, g) {
  const parcalar = [];
  const izlenen = git(kok, 'diff', 'HEAD');
  if (izlenen) parcalar.push(izlenen);
  for (const satir of g.kirli) {
    if (!satir.startsWith('?? ')) continue;
    const bagil = satir.slice(3).replace(/^"|"$/g, '');
    if (bagil.startsWith('.claude/' + KLASOR + '/') || bagil.endsWith('/')) continue;
    const tam = path.join(kok, bagil);
    let st;
    try {
      st = fs.statSync(tam);
    } catch (e) {
      continue;
    }
    if (!st.isFile() || st.size > YAMA_SINIR) continue;
    if (fs.readFileSync(tam).includes(0)) continue;
    const r = gitHam(kok, ['diff', '--no-index', '--', '/dev/null', bagil]);
    const cikti = (r.stdout || '').trim();
    if (cikti) parcalar.push(cikti);
  }
  return parcalar.join('\n');
}

function relayDurum(kok) {
  const dip = path.join(kok, '.claude', 'relay');
  if (!fs.existsSync(dip)) return null;
  const oku = (alt) => {
    const d = path.join(dip, alt);
    return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.md')) : [];
  };
  return {
    acik: oku('contracts'),
    biten: oku(path.join('contracts', 'done')),
    plan: fs.existsSync(path.join(dip, 'PLAN.md')),
  };
}

function baglamSatiri(kullanim) {
  if (!kullanim) return 'bilinmiyor';
  const girdi =
    (kullanim.input_tokens || 0) +
    (kullanim.cache_read_input_tokens || 0) +
    (kullanim.cache_creation_input_tokens || 0);
  const yuzde = Math.round((girdi / 200000) * 100);
  return (
    girdi +
    ' token girdi (~%' +
    yuzde +
    ', 200k varsayımı) · çıktı ' +
    (kullanim.output_tokens || 0)
  );
}

function ozetUret(veri, ek, tam) {
  const s = [];
  s.push('# Oturum kaydı — ' + ek.ad);
  s.push('');
  s.push('Kaynak oturum: `' + (veri.oturumId || '?') + '`');
  s.push('Kaydedildi: ' + saat(ek.kaydedildi) + ' · son hareket: ' + saat(veri.sonZaman));
  s.push(
    'Tur: ' +
      veri.turlar.length +
      ' · araç çağrısı: ' +
      veri.aracSayisi +
      ' · alt ajan mesajı: ' +
      veri.altAjan
  );
  s.push('Model: ' + (veri.model || '?') + ' · Claude Code ' + (veri.surum || '?'));
  s.push('Bağlam: ' + baglamSatiri(veri.kullanim));
  if (veri.baslik) s.push('Başlık: ' + veri.baslik);
  s.push('');

  s.push('## Proje durumu');
  s.push('');
  s.push('- Kök: `' + ek.kok + '`');
  if (ek.git) {
    s.push('- Git: `' + ek.git.sha.slice(0, 8) + '` (' + ek.git.dal + ') · ' + ek.git.baslik);
    s.push(
      '- Çalışma alanı: ' +
        (ek.git.kirli.length
          ? ek.git.kirli.length + ' dosya kirli' + (ek.diff ? ' · yaması `calisma.diff`' : '')
          : 'temiz')
    );
    for (const l of ek.git.kirli.slice(0, 30)) s.push('  - `' + l + '`');
  } else {
    s.push('- Git: depo değil');
  }
  if (veri.dokunulan.length) {
    s.push('- Bu oturumda düzenlenen dosyalar:');
    for (const d of veri.dokunulan) {
      const bagil = path.relative(ek.kok, d);
      s.push(
        '  - `' + (bagil && !bagil.startsWith('..') ? bagil.split(path.sep).join('/') : d) + '`'
      );
    }
  }
  if (ek.relay) {
    s.push(
      '- Relay: ' +
        ek.relay.acik.length +
        ' açık sözleşme, ' +
        ek.relay.biten.length +
        ' biten' +
        (ek.relay.plan ? ' · PLAN.md var' : '')
    );
    for (const c of ek.relay.acik) s.push('  - açık: `' + c + '`');
  }
  s.push('');

  s.push('## Gönderilmemiş metin');
  s.push('');
  if (veri.taslak) {
    s.push(
      'Kutuda duran, gönderilmemiş yazı (Claude Code bunu 200 karakterlik önizleme olarak tutar):'
    );
    s.push('');
    s.push('```');
    s.push(veri.taslak);
    s.push('```');
  } else {
    s.push('Yok.');
  }
  s.push('');

  s.push('## Kuyrukta bekleyen mesajlar');
  s.push('');
  if (veri.kuyruk.length) {
    veri.kuyruk.forEach((k, i) => {
      s.push(i + 1 + '. ' + temizle(k).replace(/\n/g, ' ').slice(0, 500));
    });
  } else {
    s.push('Yok.');
  }
  s.push('');

  s.push('## Konuşma');
  s.push('');
  const esik = tam ? 0 : Math.max(0, veri.turlar.length - YAKIN_TUR);
  for (const tur of veri.turlar) {
    const yakin = tam || tur.no > esik;
    s.push('### Tur ' + tur.no + ' · ' + (saat(tur.zaman) || 'zamansız'));
    s.push('');
    s.push('**Kullanıcı:**');
    s.push('');
    s.push(kirp(tur.kullanici, yakin ? (tam ? 0 : CAP.yakinKullanici) : CAP.eskiKullanici));
    s.push('');
    if (tur.claude.length) {
      s.push('**Claude:**');
      s.push('');
      s.push(kirp(tur.claude.join('\n\n'), yakin ? (tam ? 0 : CAP.yakinClaude) : CAP.eskiClaude));
      s.push('');
    }
    if (tur.araclar.length) {
      s.push(
        yakin
          ? '**Araçlar:** ' +
              tur.araclar
                .slice(0, 40)
                .map((a) => '`' + a + '`')
                .join(' · ')
          : '**Araçlar:** ' + tur.araclar.length + ' çağrı'
      );
      s.push('');
    }
  }
  return s.join('\n') + '\n';
}

function kaydet() {
  const kok = projeKok();
  const yol = transkriptBul(kok);
  const veri = ayikla(yol);
  const pozisyonel = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
  // Aynı projede birden fazla sohbet var: adsız kayıt oturum kimliğini de taşır, yoksa
  // aynı dakikada kaydeden iki sohbet aynı klasöre yazar ve biri ötekini siler.
  // Kimlik transkriptin gövdesinden gelir; bazı dosyalarda `sessionId` alanı hiç yok —
  // o zaman dosya adı kimliktir, ad sonu boş tire ile bitmesin.
  const kimlik = veri.oturumId || path.basename(yol, '.jsonl');
  const ad = slug(pozisyonel || '') || damga(new Date()) + '-' + kimlik.slice(0, 8);
  const dip = kayitKok(kok);
  const hedef = path.join(dip, ad);
  if (path.dirname(hedef) !== dip) dur('geçersiz kayıt adı: ' + ad);

  // Ad elle verildiyse başka bir sohbetin kaydının üstüne yazma riski var. Aynı oturum
  // kendi kaydını tazeleyebilir; başkasınınkine dokunmak açık izin ister.
  const eskiDurum = path.join(hedef, 'durum.json');
  if (fs.existsSync(eskiDurum) && !bayrak('ustune')) {
    let sahip = null;
    try {
      sahip = JSON.parse(fs.readFileSync(eskiDurum, 'utf8')).oturumId;
    } catch {}
    if (sahip && veri.oturumId && sahip !== veri.oturumId) {
      dur(
        '`' +
          ad +
          '` başka bir sohbetin kaydı (oturum ' +
          String(sahip).slice(0, 8) +
          '). ' +
          'Başka bir ad ver ya da üstüne yazmak için --ustune ekle.'
      );
    }
  }
  fs.mkdirSync(hedef, { recursive: true });
  // Kayıt depoya girmez: ham transkript megabaytlarca olabiliyor ve konuşmanın kendisi.
  // Kendi kendini yok sayan bir .gitignore, projenin .gitignore'una dokunmadan yeter.
  try {
    const kapi = path.join(dip, '.gitignore');
    if (!fs.existsSync(kapi)) fs.writeFileSync(kapi, '*\n', 'utf8');
  } catch {}

  fs.copyFileSync(yol, path.join(hedef, 'ham.jsonl'));

  const g = gitDurum(kok);
  let diffYazildi = false;
  if (g && g.kirli.length) {
    const d = yamaUret(kok, g);
    if (d) {
      fs.writeFileSync(path.join(hedef, 'calisma.diff'), d + '\n', 'utf8');
      diffYazildi = true;
    }
  }

  const ek = {
    ad,
    kok,
    kaydedildi: new Date().toISOString(),
    git: g,
    diff: diffYazildi,
    relay: relayDurum(kok),
  };

  fs.writeFileSync(path.join(hedef, 'ozet.md'), ozetUret(veri, ek, bayrak('tam')), 'utf8');
  fs.writeFileSync(
    path.join(hedef, 'durum.json'),
    JSON.stringify(
      {
        ad,
        kaydedildi: ek.kaydedildi,
        kok,
        oturumId: veri.oturumId,
        transkript: yol,
        model: veri.model,
        claudeCode: veri.surum,
        baslik: veri.baslik,
        tur: veri.turlar.length,
        aracSayisi: veri.aracSayisi,
        altAjanMesaji: veri.altAjan,
        kullanim: veri.kullanim,
        dal: veri.dal || (g && g.dal) || null,
        git: g,
        diff: diffYazildi ? 'calisma.diff' : null,
        relay: ek.relay,
        taslak: veri.taslak,
        kuyruk: veri.kuyruk,
        dokunulan: veri.dokunulan,
      },
      null,
      2
    ),
    'utf8'
  );
  sonYaz(dip, { ad, kaydedildi: ek.kaydedildi, oturumId: veri.oturumId });

  const bagil = path.relative(kok, hedef).split(path.sep).join('/');
  process.stdout.write(
    [
      'kayıt: ' + ad,
      'yer: ' + bagil,
      'tur: ' +
        veri.turlar.length +
        ' · araç: ' +
        veri.aracSayisi +
        ' · alt ajan mesajı: ' +
        veri.altAjan,
      'bağlam: ' + baglamSatiri(veri.kullanim),
      'gönderilmemiş metin: ' + (veri.taslak ? 'var (200 karakter önizleme)' : 'yok'),
      'kuyruk: ' + veri.kuyruk.length,
      'çalışma yaması: ' + (diffYazildi ? 'calisma.diff' : 'yok'),
      'oturum kimliği: ' + (veri.oturumId || '?'),
    ].join('\n') + '\n'
  );
}

// SON.json tek işaretçi değil, oturum başına işaretçi tutar: iki sohbet aynı projede
// kaydettiğinde biri ötekinin izini silmesin. Yazma önce geçici dosyaya, sonra rename.
function sonOku(dip) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(dip, 'SON.json'), 'utf8'));
    return c && c.oturumlar ? c : { son: null, oturumlar: {} };
  } catch {
    return { son: null, oturumlar: {} };
  }
}

function sonYaz(dip, kayit) {
  const c = sonOku(dip);
  c.son = { ad: kayit.ad, kaydedildi: kayit.kaydedildi };
  if (kayit.oturumId) c.oturumlar[kayit.oturumId] = { ad: kayit.ad, kaydedildi: kayit.kaydedildi };
  const gecici = path.join(dip, 'SON.json.' + process.pid);
  fs.writeFileSync(gecici, JSON.stringify(c, null, 2) + '\n', 'utf8');
  fs.renameSync(gecici, path.join(dip, 'SON.json'));
}

function kayitlar(kok) {
  const dip = kayitKok(kok);
  if (!fs.existsSync(dip)) return [];
  return fs
    .readdirSync(dip)
    .filter((f) => {
      try {
        return fs.statSync(path.join(dip, f)).isDirectory();
      } catch {
        return false;
      }
    })
    .map((f) => {
      const yol = path.join(dip, f);
      let d = {};
      try {
        d = JSON.parse(fs.readFileSync(path.join(yol, 'durum.json'), 'utf8'));
      } catch {}
      return { ad: f, yol, durum: d, zaman: d.kaydedildi || '' };
    })
    .sort((a, b) => (a.zaman < b.zaman ? 1 : -1));
}

function dizinSatiri(k, isaret) {
  const d = k.durum;
  return (
    (isaret ? '▸ ' : '  ') +
    k.ad +
    '  ·  ' +
    (saat(d.kaydedildi) || 'zamansız') +
    '  ·  oturum ' +
    String(d.oturumId || '?').slice(0, 8) +
    '  ·  ' +
    (d.tur || '?') +
    ' tur' +
    (d.baslik ? '  ·  ' + d.baslik : '')
  );
}

function kayitSec(kok) {
  const hepsi = kayitlar(kok);
  if (!hepsi.length) dur('kayıt yok — önce /save çalıştır');
  const pozisyonel = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
  const istenen = arg('ad', pozisyonel);
  if (istenen) {
    const s = slug(istenen);
    const bul = hepsi.find((x) => x.ad === s) || hepsi.find((x) => x.ad.indexOf(s) >= 0);
    if (!bul)
      dur('kayıt bulunamadı: ' + istenen + ' — mevcut: ' + hepsi.map((x) => x.ad).join(', '));
    return bul;
  }
  return hepsi[0];
}

function ozetOku(kok, kayit) {
  const d = kayit.durum;
  if (!Object.keys(d).length) dur('bozuk kayıt: durum.json yok — ' + kayit.yol);
  let ozet;
  if (bayrak('tam')) {
    const ham = path.join(kayit.yol, 'ham.jsonl');
    if (!fs.existsSync(ham)) dur('ham.jsonl yok, --tam kullanılamaz');
    ozet = ozetUret(
      ayikla(ham),
      {
        ad: d.ad,
        kok: d.kok,
        kaydedildi: d.kaydedildi,
        git: d.git,
        diff: !!d.diff,
        relay: d.relay,
      },
      true
    );
  } else {
    ozet = fs.readFileSync(path.join(kayit.yol, 'ozet.md'), 'utf8');
  }

  const uyari = [];
  const simdi = gitDurum(kok);
  if (d.git && simdi && d.git.sha !== simdi.sha) {
    uyari.push(
      'git HEAD değişmiş: kayıtta ' + d.git.sha.slice(0, 8) + ', şimdi ' + simdi.sha.slice(0, 8)
    );
  }
  if (d.kok && path.resolve(d.kok) !== kok) uyari.push('kayıt başka kökten alınmış: ' + d.kok);
  if (d.diff) {
    uyari.push(
      'kayıtta çalışma yaması var: ' +
        path.relative(kok, kayit.yol).split(path.sep).join('/') +
        '/calisma.diff'
    );
  }

  const bas = ['<<<KAYIT ' + (d.ad || kayit.ad) + '>>>'];
  if (uyari.length) bas.push('UYARI: ' + uyari.join(' · '));
  return [...bas, '', ozet, '<<<KAYIT SONU>>>'].join('\n');
}

// Uzak denetim penceresi kapandığında ya da oturum çökünce `/save` çalışmaz; kayıt
// yoktur ama transkript diskte durur. Devralmak için kaydın olması şart değil: aynı
// projenin en yeni transkripti, bu oturum hariç, doğrudan özetlenir.
function sonTranskript(kok) {
  const dizin = transkriptDizini(kok);
  const simdi = process.env.CLAUDE_CODE_SESSION_ID || null;
  let l = [];
  try {
    l = fs.readdirSync(dizin);
  } catch {
    return null;
  }
  const aday = l
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ yol: path.join(dizin, f), ad: f.replace(/\.jsonl$/, '') }))
    .filter((x) => x.ad !== simdi)
    .map((x) => {
      const st = fs.statSync(x.yol);
      return { ...x, zaman: st.mtimeMs, boyut: st.size };
    })
    // ÖLÇÜLDÜ: açılıp hiç kullanılmamış oturumlar 0 baytlık transkript bırakıyor ve en
    // yeni dosya oluyorlar; toplu kayıt boş bir kayıt yazdı. Gövdesi olmayan devralınmaz.
    .filter((x) => x.boyut > 512)
    .sort((a, b) => b.zaman - a.zaman);
  return aday[0] || null;
}

function son() {
  const kok = projeKok();
  const t = sonTranskript(kok);
  if (!t) dur('bu projede devralınacak önceki oturum yok');
  const veri = ayikla(t.yol);
  const ozet = ozetUret(
    veri,
    {
      ad: 'önceki oturum · ' + t.ad.slice(0, 8),
      kok,
      kaydedildi: new Date(t.zaman).toISOString(),
      git: gitDurum(kok),
      diff: false,
      relay: relayDurum(kok),
    },
    bayrak('tam')
  );
  process.stdout.write(
    [
      '<<<ÖNCEKİ OTURUM · kayıt yok, transkriptten devralındı>>>',
      '',
      ozet,
      '<<<KAYIT SONU>>>',
    ].join('\n') + '\n'
  );
}

function yukle() {
  const kok = projeKok();
  const hepsi = kayitlar(kok);
  const istek = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
  if (istek === 'son' || istek === 'onceki' || istek === 'önceki') return son();
  // Kayıt yoksa iş de yok demek değil: transkript duruyorsa oradan devral, kullanıcıyı
  // "önce /save çalıştır" diye geçmişe göndermenin anlamı yok.
  if (!hepsi.length && sonTranskript(kok)) return son();
  if (!hepsi.length) dur('kayıt yok — önce /save çalıştır');
  const pozisyonel = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
  const tumu = pozisyonel === 'hepsi' || bayrak('hepsi');

  // Aynı projede birden çok sohbet kaydediyor: hangi kaydın açıldığı kadar hangilerinin
  // durduğu da bilgidir. Dizin her zaman basılır, gövde seçime göre.
  const acilan = tumu ? hepsi : [kayitSec(kok)];
  const dizin = [
    '<<<KAYIT DİZİNİ · ' + hepsi.length + ' kayıt>>>',
    ...hepsi.map((k) =>
      dizinSatiri(
        k,
        acilan.some((a) => a.ad === k.ad)
      )
    ),
    '<<<DİZİN SONU>>>',
  ].join('\n');

  const govde = acilan
    .slice()
    .reverse()
    .map((k) => ozetOku(kok, k))
    .join('\n\n');
  process.stdout.write(dizin + '\n\n' + govde + '\n');
}

function liste() {
  const hepsi = kayitlar(projeKok());
  if (!hepsi.length) {
    process.stdout.write('kayıt yok\n');
    return;
  }
  process.stdout.write(hepsi.map((k) => dizinSatiri(k, false).slice(2)).join('\n') + '\n');
}

// Tek projeyi kaydetmek yetmiyor: iş birden çok projeye dağıldığında hangisinde nerede
// kalındığı da bilgidir. Filo işlemleri projeleri üst klasörden tarar; eleme kuralı
// `/rcall` ile aynı yerden gelir, iki dosyada iki kural olmasın.
const { projeler: filoTara } = require('./rc.js');

function filoKok() {
  return path.resolve(arg('kok', path.dirname(projeKok())));
}

function sozlesmeler(kok) {
  const dip = path.join(kok, '.claude', 'relay', 'contracts');
  const grup = {};
  let biten = 0;
  try {
    for (const f of fs.readdirSync(path.join(dip, 'done'))) if (f.endsWith('.md')) biten++;
  } catch {}
  let dosya = [];
  try {
    dosya = fs.readdirSync(dip).filter((f) => f.endsWith('.md'));
  } catch {
    return null;
  }
  for (const f of dosya) {
    let d = 'open';
    try {
      const m = fs
        .readFileSync(path.join(dip, f), 'utf8')
        .slice(0, 1200)
        .match(/^status:\s*(\S+)/m);
      if (m) d = m[1];
    } catch {}
    (grup[d] = grup[d] || []).push(f.replace(/\.md$/, ''));
  }
  return { grup, acik: dosya.length, biten };
}

// Başlık transkriptin başlarında `ai-title` olayıyla geçiyor; koca dosyayı okumak yerine
// baştan yarım megabayt yeter, bulunamazsa başlıksız gösteririz.
function hafifBaslik(yol) {
  try {
    const fd = fs.openSync(yol, 'r');
    const buf = Buffer.alloc(512 * 1024);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const m = buf.toString('utf8', 0, n).match(/"aiTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    return m ? JSON.parse('"' + m[1] + '"') : null;
  } catch {
    return null;
  }
}

function gecenSure(zaman) {
  const dk = Math.round((Date.now() - zaman) / 60000);
  if (dk < 90) return dk + ' dakika önce';
  const sa = Math.round(dk / 60);
  return sa < 48 ? sa + ' saat önce' : Math.round(sa / 24) + ' gün önce';
}

// Devam promptu kullanıcının kopyalayıp o projenin oturumuna yapıştıracağı metindir:
// nereden devam edileceğini, kaydın nasıl açılacağını ve açık işleri kendisi taşır.
// Model tarafından üretilmez — proje diskte ne diyorsa o yazılır.
function devamPromptu(p, g, c, k, t) {
  const s = [p.ad + ' projesinde kaldığımız yerden devam ediyoruz.'];
  if (k) s.push('Önce kaydı aç: /load ' + k.ad);
  else if (t) s.push('Kayıt yok, önceki oturumu transkriptten devral: /load son');
  if (c && c.acik) {
    const oncelik = ['submitted', 'active', 'blocked', 'open'];
    const sira = Object.keys(c.grup).sort((a, b) => {
      const i = oncelik.indexOf(a);
      const j = oncelik.indexOf(b);
      return (i < 0 ? 9 : i) - (j < 0 ? 9 : j);
    });
    s.push(
      'Açık sözleşmeler: ' + sira.map((d) => c.grup[d].join(', ') + ' ' + d).join(' · ') + '.'
    );
    if (c.grup.submitted) s.push('Denetim bekleyenden başla.');
  }
  if (g && g.kirli.length) {
    s.push('Çalışma alanında ' + g.kirli.length + ' dosya kirli, işe başlamadan önce bak.');
  }
  if (s.length === 1) s.push('Bu projede kayıtlı iş yok, sıfırdan başlıyoruz.');
  return s;
}

function filoSatirlari(p) {
  const s = ['## ' + p.ad, '', '- Klasör: `' + p.yol + '`'];
  const g = gitDurum(p.yol);
  if (g) {
    s.push(
      '- Git: `' +
        g.sha.slice(0, 8) +
        '` (' +
        g.dal +
        ') · ' +
        (g.kirli.length ? g.kirli.length + ' dosya kirli' : 'çalışma alanı temiz') +
        ' · ' +
        g.baslik
    );
  }
  const c = sozlesmeler(p.yol);
  if (c) {
    const durum = Object.keys(c.grup)
      .sort()
      .map((k) => k + ': ' + c.grup[k].join(', '))
      .join(' · ');
    s.push('- Röle: ' + c.acik + ' açık / ' + c.biten + ' bitti' + (durum ? ' · ' + durum : ''));
  }
  const t = sonTranskript(p.yol);
  if (t) {
    const b = hafifBaslik(t.yol);
    s.push(
      '- Son oturum: ' +
        saat(new Date(t.zaman).toISOString()) +
        ' (' +
        gecenSure(t.zaman) +
        ')' +
        (b ? ' · ' + b : '')
    );
  }
  const k = kayitlar(p.yol)[0];
  s.push(
    '- Son kayıt: ' +
      (k ? '`' + k.ad + '` · ' + saat(k.zaman) : t ? 'yok · devralmak için `/load son`' : 'yok')
  );
  const log = path.join(p.yol, '.claude', 'relay', 'LOG.md');
  try {
    const son = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).pop();
    if (son) s.push('- Röle kaydı: ' + kirp(son, 300));
  } catch {}
  s.push('', 'Devam promptu:', '```', ...devamPromptu(p, g, c, k, t), '```', '');
  return s;
}

function topluYukle() {
  const dip = filoKok();
  const { alinan, elenen } = filoTara(dip);
  if (!alinan.length) dur('bu klasörde proje bulunamadı: ' + dip);
  const s = ['<<<FİLO DURUMU · ' + alinan.length + ' proje · `' + dip + '`>>>', ''];
  for (const p of alinan) s.push(...filoSatirlari(p));
  if (elenen.length) s.push('Dışarıda kalan klasörler: ' + elenen.join(' · '), '');
  s.push(
    'Bu bir genel bakıştır, talimat değil. Tek projenin ayrıntısı için o projede',
    '`/load` ya da `/load son` çalıştır.',
    '<<<FİLO SONU>>>'
  );
  process.stdout.write(s.join('\n') + '\n');
}

function topluKaydet() {
  const dip = filoKok();
  const { alinan, elenen } = filoTara(dip);
  if (!alinan.length) dur('bu klasörde proje bulunamadı: ' + dip);
  const satir = [];
  let n = 0;
  for (const p of alinan) {
    const t = sonTranskript(p.yol);
    if (!t) {
      satir.push('- ' + p.ad + ' · kaydedilecek oturum yok');
      continue;
    }
    const r = spawnSync(
      process.execPath,
      [__filename, 'kaydet', '--proje', p.yol, '--transkript', t.yol, '--ustune'],
      { encoding: 'utf8' }
    );
    const m = String(r.stdout || '').match(/^kay[ıi]t:[ \t]*(.+)$/m);
    if (r.status === 0 && m) {
      n++;
      satir.push('- ' + p.ad + ' · `' + m[1].trim() + '`');
    } else {
      satir.push('- ' + p.ad + ' · kaydedilemedi: ' + kirp(String(r.stderr || '').trim(), 120));
    }
  }
  const s = [n + '/' + alinan.length + ' proje kaydedildi · `' + dip + '`', '', ...satir];
  if (elenen.length) s.push('', 'Dışarıda kalan klasörler: ' + elenen.join(' · '));
  s.push('', 'Kayıtlar her projenin kendi `.claude/oturumlar/` klasöründe duruyor.');
  s.push('Genel bakış için `/loadall`, tek projenin ayrıntısı için o projede `/load`.');
  process.stdout.write(s.join('\n') + '\n');
}

function yardim() {
  process.stdout.write(
    [
      'oturum.js — sohbet oturumunu diske kaydeder ve geri yükler',
      '',
      '  node oturum.js kaydet [ad] [--proje <yol>] [--oturum <id>] [--transkript <yol>]',
      '                            [--tam] [--ustune]',
      '  node oturum.js yukle  [ad|son|hepsi] [--proje <yol>] [--tam]',
      '                            son: kayıt yoksa önceki oturumun transkriptinden devral',
      '  node oturum.js liste       [--proje <yol>]',
      '  node oturum.js toplu-kaydet [--kok <üst klasör>]   bütün projeleri kaydeder',
      '  node oturum.js toplu-yukle  [--kok <üst klasör>]   bütün projelerin durumu',
      '',
      'Kayıt yeri: <proje>/.claude/oturumlar/<ad>/',
      '  ham.jsonl     transkriptin bire bir kopyası',
      '  ozet.md       yeniden yüklenebilir özet',
      '  durum.json    git, relay, bağlam, taslak, kuyruk',
      '  calisma.diff  kaydetme anındaki kirli çalışma alanı',
    ].join('\n') + '\n'
  );
}

const komut = process.argv[2];
if (!komut || komut === '--help' || komut === '-h' || komut === 'yardim') yardim();
else if (komut === 'kaydet' || komut === 'save') kaydet();
else if (komut === 'yukle' || komut === 'load') yukle();
else if (komut === 'liste' || komut === 'list') liste();
else if (komut === 'toplu-kaydet' || komut === 'saveall') topluKaydet();
else if (komut === 'toplu-yukle' || komut === 'loadall') topluYukle();
else dur('bilinmeyen komut: ' + komut);
