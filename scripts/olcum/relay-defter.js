const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

const KOK = path.join(os.homedir(), '.claude', 'projects');
const HEDEF_SKILL = /relay/i;

function transkriptleriTopla(kok) {
  const cikti = [];
  const yigin = [kok];
  while (yigin.length > 0) {
    const dizin = yigin.pop();
    let girisler;
    try {
      girisler = fs.readdirSync(dizin, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const giris of girisler) {
      const tam = path.join(dizin, giris.name);
      if (giris.isDirectory()) {
        yigin.push(tam);
      } else if (giris.name.endsWith('.jsonl')) {
        cikti.push(tam);
      }
    }
  }
  return cikti.sort();
}

function oturumKimligi(dosya) {
  const parcalar = dosya.split(path.sep);
  const proje = parcalar[parcalar.indexOf('projects') + 1] || '?';
  const ad = path.basename(dosya, '.jsonl');
  const altAjan = dosya.includes(`${path.sep}subagents${path.sep}`);
  let ana = ad;
  if (altAjan) {
    const i = parcalar.indexOf('subagents');
    ana = parcalar[i - 1];
  }
  return { proje, ad, ana, altAjan, grup: `${proje}/${ana}` };
}

function toplamGirdi(usage) {
  if (!usage) {
    return null;
  }
  return (
    (usage.input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) +
    (usage.cache_read_input_tokens || 0)
  );
}

const IZLER = [
  {
    ad: '§1.4 ön araştırma — scout ajanı',
    esles: (b) => b.name === 'Agent' && /scout/i.test(String(b.input?.subagent_type || '')),
  },
  {
    ad: '§1.4 ön araştırma — docs/taramalar/ yazımı',
    esles: (b) => (b.name === 'Write' || b.name === 'Edit') && /taramalar[/\\]/i.test(yol(b)),
  },
  {
    ad: '§1.5 plan konseyi — planner ajanı',
    esles: (b) =>
      b.name === 'Agent' && /planner|usta(?!-)/i.test(String(b.input?.subagent_type || '')),
  },
  {
    ad: '§1.5.1 ikinci görüş — advisor ajanı',
    esles: (b) => b.name === 'Agent' && /advisor/i.test(String(b.input?.subagent_type || '')),
  },
  {
    ad: '§3.1 görev paketi — sözleşme dosyası yazımı',
    esles: (b) =>
      (b.name === 'Write' || b.name === 'Edit') &&
      /relay[/\\](contracts|sozlesme|sözleşme)/i.test(yol(b)),
  },
  {
    ad: '§3.2 rota — docs/ROTA-*.md yazımı',
    esles: (b) => (b.name === 'Write' || b.name === 'Edit') && /ROTA-[^/\\]*\.md$/i.test(yol(b)),
  },
  {
    ad: '§1.6 ürün standardı — references/standartlar.md okuması',
    esles: (b) => b.name === 'Read' && /standartlar\.md$/i.test(yol(b)),
  },
  {
    ad: 'Genel — herhangi bir references/*.md okuması',
    esles: (b) => b.name === 'Read' && /references[/\\][^/\\]+\.md$/i.test(yol(b)),
  },
];

function yol(blok) {
  const p = blok.input?.file_path || blok.input?.path || '';
  return String(p).replace(/\\/g, '/');
}

function medyan(dizi) {
  if (dizi.length === 0) {
    return null;
  }
  const s = [...dizi].sort((a, b) => a - b);
  const o = Math.floor(s.length / 2);
  return s.length % 2 ? s[o] : Math.round((s[o - 1] + s[o]) / 2);
}

async function dosyaOku(dosya, durum) {
  const kimlik = oturumKimligi(dosya);
  const akis = readline.createInterface({
    input: fs.createReadStream(dosya, { encoding: 'utf8' }),
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  const bekleyen = [];
  let sira = 0;
  let bozukSatir = 0;

  for await (const satir of akis) {
    if (satir.trim() === '') {
      continue;
    }
    let kayit;
    try {
      kayit = JSON.parse(satir);
    } catch {
      bozukSatir += 1;
      continue;
    }
    if (kayit.type !== 'assistant') {
      continue;
    }
    const mesaj = kayit.message;
    const icerik = mesaj && Array.isArray(mesaj.content) ? mesaj.content : [];
    const usage = mesaj && mesaj.usage;
    const toplam = toplamGirdi(usage);

    while (bekleyen.length > 0) {
      const b = bekleyen.shift();
      b.sonrasi = {
        toplam,
        input_tokens: usage?.input_tokens || 0,
        cache_creation_input_tokens: usage?.cache_creation_input_tokens || 0,
        cache_read_input_tokens: usage?.cache_read_input_tokens || 0,
      };
      b.delta = toplam === null || b.oncesi === null ? null : toplam - b.oncesi;
      durum.cagrilar.push(b);
    }

    for (const blok of icerik) {
      if (blok.type !== 'tool_use') {
        continue;
      }
      for (const iz of IZLER) {
        if (iz.esles(blok)) {
          durum.izler[iz.ad] ||= { grup: new Set(), sayi: 0 };
          durum.izler[iz.ad].grup.add(kimlik.grup);
          durum.izler[iz.ad].sayi += 1;
        }
      }
      if (blok.name !== 'Skill') {
        continue;
      }
      const skill = String(blok.input?.skill || blok.input?.name || '');
      durum.tumSkill[skill] = (durum.tumSkill[skill] || 0) + 1;
      if (!HEDEF_SKILL.test(skill)) {
        continue;
      }
      sira += 1;
      bekleyen.push({
        proje: kimlik.proje,
        oturum: kimlik.ad,
        grup: kimlik.grup,
        altAjan: kimlik.altAjan,
        skill,
        sira,
        zaman: kayit.timestamp || null,
        oncesi: toplam,
        oncesiDetay: {
          input_tokens: usage?.input_tokens || 0,
          cache_creation_input_tokens: usage?.cache_creation_input_tokens || 0,
          cache_read_input_tokens: usage?.cache_read_input_tokens || 0,
        },
        sonrasi: null,
        delta: null,
      });
    }
  }

  for (const b of bekleyen) {
    durum.cagrilar.push(b);
  }
  if (bozukSatir > 0) {
    durum.bozuk.push({ dosya, bozukSatir });
  }
  durum.dosyaSayisi += 1;
  durum.gruplar.add(kimlik.grup);
}

async function main() {
  if (!fs.existsSync(KOK)) {
    process.stderr.write(`Transkript kökü yok: ${KOK}\n`);
    process.exit(1);
  }
  const dosyalar = transkriptleriTopla(KOK);
  const durum = {
    dosyaSayisi: 0,
    gruplar: new Set(),
    cagrilar: [],
    izler: {},
    tumSkill: {},
    bozuk: [],
  };
  for (const dosya of dosyalar) {
    await dosyaOku(dosya, durum);
  }

  const perOturum = {};
  for (const c of durum.cagrilar) {
    perOturum[c.oturum] = (perOturum[c.oturum] || 0) + 1;
  }
  const perGrup = {};
  for (const c of durum.cagrilar) {
    perGrup[c.grup] = (perGrup[c.grup] || 0) + 1;
  }

  const siraGruplari = {};
  for (const c of durum.cagrilar) {
    if (c.delta === null) {
      continue;
    }
    const k = c.sira >= 4 ? '4+' : String(c.sira);
    siraGruplari[k] ||= [];
    siraGruplari[k].push(c);
  }

  const ozet = {
    transkriptDosyasi: durum.dosyaSayisi,
    oturumGrubu: durum.gruplar.size,
    relayCagrisi: durum.cagrilar.length,
    deltasiOlcelenen: durum.cagrilar.filter((c) => c.delta !== null).length,
    relayCagiranOturum: Object.keys(perOturum).length,
    relayCagiranOturumGrubu: Object.keys(perGrup).length,
    altAjanTranskriptindekiCagri: durum.cagrilar.filter((c) => c.altAjan).length,
    deltaMedyanTum: medyan(durum.cagrilar.filter((c) => c.delta !== null).map((c) => c.delta)),
    oturumBasinaMedyan: medyan(Object.values(perOturum)),
    oturumBasinaMax: Math.max(0, ...Object.values(perOturum)),
    grupBasinaMedyan: medyan(Object.values(perGrup)),
    grupBasinaMax: Math.max(0, ...Object.values(perGrup)),
    tumSkillCagrilari: durum.tumSkill,
    bozukSatirliDosya: durum.bozuk,
  };

  const siraOzeti = {};
  for (const [k, liste] of Object.entries(siraGruplari)) {
    siraOzeti[k] = {
      n: liste.length,
      deltaMedyan: medyan(liste.map((c) => c.delta)),
      deltaMin: Math.min(...liste.map((c) => c.delta)),
      deltaMax: Math.max(...liste.map((c) => c.delta)),
      cacheCreationMedyan: medyan(liste.map((c) => c.sonrasi.cache_creation_input_tokens)),
      cacheReadMedyan: medyan(liste.map((c) => c.sonrasi.cache_read_input_tokens)),
      inputMedyan: medyan(liste.map((c) => c.sonrasi.input_tokens)),
    };
  }

  const relayliGruplar = new Set(Object.keys(perGrup));
  const izOzeti = {};
  for (const iz of IZLER) {
    const v = durum.izler[iz.ad] || { grup: new Set(), sayi: 0 };
    const kesisim = [...v.grup].filter((g) => relayliGruplar.has(g));
    izOzeti[iz.ad] = {
      tumOturumGrubu: v.grup.size,
      relayliOturumGrubu: kesisim.length,
      relayliOran: relayliGruplar.size ? `${kesisim.length}/${relayliGruplar.size}` : '0/0',
      cagri: v.sayi,
    };
  }

  const cikti = {
    ozet,
    siraGoreDelta: siraOzeti,
    oturumBasinaDagilim: perOturum,
    grupBasinaDagilim: perGrup,
    bolumIzleri: izOzeti,
    cagrilar: durum.cagrilar,
  };

  process.stdout.write(`${JSON.stringify(cikti, null, 2)}\n`);
}

main();
