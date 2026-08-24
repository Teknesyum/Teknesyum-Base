const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const PROJELER = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'projects');

const CARPAN = {
  input: 1,
  cc: 1.25,
  cr: 0.1,
  out: 5,
};

const ESIKLER = [200000, 500000, 1000000];

function bic(n) {
  return Math.round(n).toLocaleString('tr-TR');
}

function ortanca(dizi) {
  if (!dizi.length) return null;
  const s = [...dizi].sort((a, b) => a - b);
  const o = Math.floor(s.length / 2);
  return s.length % 2 ? s[o] : (s[o - 1] + s[o]) / 2;
}

function esdeger(k) {
  return k.input * CARPAN.input + k.cc * CARPAN.cc + k.cr * CARPAN.cr + k.out * CARPAN.out;
}

function bosKalem() {
  return { input: 0, cc: 0, cr: 0, out: 0 };
}

function ekle(hedef, k) {
  hedef.input += k.input;
  hedef.cc += k.cc;
  hedef.cr += k.cr;
  hedef.out += k.out;
}

async function tara(dosya) {
  const altAjanDosyasi = dosya.replace(/\\/g, '/').includes('/subagents/');
  const rl = readline.createInterface({
    input: fs.createReadStream(dosya, { encoding: 'utf8' }),
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  const turlar = [];
  const sinirlar = [];
  const gorulen = new Set();
  let satirSayisi = 0;
  let bozuk = 0;

  for await (const satir of rl) {
    if (!satir) continue;
    satirSayisi++;
    if (satir.indexOf('"usage"') < 0 && satir.indexOf('compact_boundary') < 0) continue;
    let k;
    try {
      k = JSON.parse(satir);
    } catch {
      bozuk++;
      continue;
    }

    if (k.type === 'system' && k.subtype === 'compact_boundary') {
      const m = k.compactMetadata || {};
      sinirlar.push({
        turIndeksi: turlar.length,
        tetik: m.trigger || 'bilinmiyor',
        onTokenler: m.preTokens || null,
        ts: k.timestamp || null,
      });
      continue;
    }

    if (k.type !== 'assistant') continue;
    const msg = k.message;
    if (!msg || !msg.usage) continue;
    const anahtar = msg.id || k.uuid;
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);

    const u = msg.usage;
    const kalem = {
      input: u.input_tokens || 0,
      cc: u.cache_creation_input_tokens || 0,
      cr: u.cache_read_input_tokens || 0,
      out: u.output_tokens || 0,
    };
    turlar.push({
      ...kalem,
      baglam: kalem.input + kalem.cc + kalem.cr,
      yan: k.isSidechain === true || altAjanDosyasi,
      model: msg.model || null,
      ts: k.timestamp || null,
      ozet: k.isCompactSummary === true,
    });
  }

  return { dosya, turlar, sinirlar, satirSayisi, bozuk };
}

function anaZincir(tarama) {
  const harita = [];
  const cikti = [];
  for (let i = 0; i < tarama.turlar.length; i++) {
    if (tarama.turlar[i].yan) continue;
    harita.push(i);
    cikti.push(tarama.turlar[i]);
  }
  const sinirSeti = new Map();
  for (const s of tarama.sinirlar) {
    let yeni = cikti.length;
    for (let j = 0; j < harita.length; j++) {
      if (harita[j] >= s.turIndeksi) {
        yeni = j;
        break;
      }
    }
    sinirSeti.set(yeni, s);
  }
  return { turlar: cikti, sinirlar: sinirSeti };
}

function sikistirmaOlcumu(taramalar) {
  const onTokenler = [];
  const oranlar = [];
  const sonrakiCc = [];
  const oncekiCc = [];
  const tetikler = new Map();
  let olay = 0;

  for (const t of taramalar) {
    const { turlar, sinirlar } = anaZincir(t);
    for (const [idx, s] of sinirlar) {
      olay++;
      tetikler.set(s.tetik, (tetikler.get(s.tetik) || 0) + 1);
      if (s.onTokenler) onTokenler.push(s.onTokenler);
      const sonra = turlar[idx];
      if (!sonra) continue;
      if (s.onTokenler && sonra.baglam > 0) oranlar.push(sonra.baglam / s.onTokenler);
      sonrakiCc.push(sonra.cc);
      const pencere = [];
      for (let j = idx - 6; j < idx; j++) {
        if (j >= 0 && !sinirlar.has(j)) pencere.push(turlar[j].cc);
      }
      if (pencere.length) oncekiCc.push(pencere.reduce((a, b) => a + b, 0) / pencere.length);
    }
  }

  return {
    olay,
    tetikler,
    onTokenOrtanca: ortanca(onTokenler),
    onTokenEnAz: onTokenler.length ? Math.min(...onTokenler) : null,
    onTokenEnCok: onTokenler.length ? Math.max(...onTokenler) : null,
    oranOrtanca: ortanca(oranlar),
    sonrakiCcOrtanca: ortanca(sonrakiCc),
    oncekiCcOrtanca: ortanca(oncekiCc),
    ornek: oranlar.length,
  };
}

function soguklukOlcumu(taramalar) {
  let aday = 0;
  let soguk = 0;
  for (const t of taramalar) {
    const { turlar, sinirlar } = anaZincir(t);
    for (let i = 1; i < turlar.length; i++) {
      if (sinirlar.has(i)) continue;
      const x = turlar[i];
      if (x.baglam < 20000) continue;
      aday++;
      if (x.cc >= x.baglam * 0.5) soguk++;
    }
  }
  return { aday, soguk, oran: aday ? soguk / aday : null };
}

function deltaAkisi(tarama) {
  const { turlar, sinirlar } = anaZincir(tarama);
  const akis = [];
  let onceki = 0;
  for (let i = 0; i < turlar.length; i++) {
    const t = turlar[i];
    if (i === 0 || sinirlar.has(i)) {
      akis.push({ delta: i === 0 ? t.baglam : 0, out: t.out, sifirla: i !== 0 });
      onceki = t.baglam;
      continue;
    }
    let d = t.baglam - onceki;
    if (d < 0) d = 0;
    onceki = t.baglam;
    akis.push({ delta: d, out: t.out, sifirla: false });
  }
  return akis;
}

function benzet(akislar, esik, model) {
  const toplam = bosKalem();
  let sikistirma = 0;
  const tasinan = [];

  const araliksiz = model.soguklukOrani > 0 ? Math.max(1, Math.round(1 / model.soguklukOrani)) : 0;
  let sayac = 0;

  for (const akis of akislar) {
    let s = 0;
    let soguk = true;
    for (const adim of akis) {
      s += adim.delta;
      if (s > esik && s > 0) {
        sikistirma++;
        toplam.cr += s;
        toplam.out += Math.round(s * model.oran);
        s = Math.round(s * model.oran);
        soguk = true;
      }
      sayac++;
      if (araliksiz && sayac % araliksiz === 0) soguk = true;
      if (soguk) {
        toplam.cc += s;
        soguk = false;
      } else {
        toplam.cc += adim.delta;
        toplam.cr += Math.max(0, s - adim.delta);
      }
      toplam.out += adim.out;
      tasinan.push(s);
    }
  }

  return {
    esik,
    sikistirma,
    tur: tasinan.length,
    baglamOrtanca: ortanca(tasinan),
    toplam,
    esdeger: esdeger(toplam),
  };
}

function gercekToplam(taramalar) {
  const t = bosKalem();
  let tur = 0;
  for (const tr of taramalar) {
    for (const x of tr.turlar) {
      if (x.yan) continue;
      ekle(t, x);
      tur++;
    }
  }
  return { toplam: t, tur, esdeger: esdeger(t) };
}

function yanAjanOlcumu(taramalar) {
  const kayit = [];
  for (const t of taramalar) {
    const yan = t.turlar.filter((x) => x.yan);
    if (!yan.length) continue;
    const baslangic = yan[0].baglam;
    const enBuyuk = Math.max(...yan.map((x) => x.baglam));
    const uretilen = yan.reduce((a, b) => a + b.out, 0);
    kayit.push({ dosya: path.basename(t.dosya), tur: yan.length, baslangic, enBuyuk, uretilen });
  }
  const paylar = kayit.filter((k) => k.enBuyuk > 0).map((k) => k.baslangic / k.enBuyuk);
  const zirveler = kayit.map((k) => k.enBuyuk);
  return {
    oturum: kayit.length,
    zirveOrtanca: ortanca(zirveler),
    zirveEnCok: zirveler.length ? Math.max(...zirveler) : null,
    asan200k: zirveler.filter((z) => z > 200000).length,
    asan500k: zirveler.filter((z) => z > 500000).length,
    turOrtanca: ortanca(kayit.map((k) => k.tur)),
    baslangicOrtanca: ortanca(kayit.map((k) => k.baslangic)),
    buyumeOrtanca: ortanca(kayit.map((k) => k.enBuyuk - k.baslangic)),
    payOrtanca: ortanca(paylar),
  };
}

function dosyaBul(enAz, kip) {
  const cikti = [];
  let kokler;
  try {
    kokler = fs.readdirSync(PROJELER);
  } catch {
    return cikti;
  }
  for (const kok of kokler) {
    const dizin = path.join(PROJELER, kok);
    let st;
    try {
      st = fs.statSync(dizin);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    if (kip !== 'yan') {
      for (const ad of fs.readdirSync(dizin)) {
        if (!ad.endsWith('.jsonl')) continue;
        const tam = path.join(dizin, ad);
        const bilgi = fs.statSync(tam);
        if (bilgi.size < enAz) continue;
        cikti.push({ yol: tam, boyut: bilgi.size });
      }
    }
    if (kip === 'ana') continue;
    for (const ad of fs.readdirSync(dizin)) {
      const alt = path.join(dizin, ad, 'subagents');
      if (!fs.existsSync(alt)) continue;
      for (const a of fs.readdirSync(alt)) {
        if (!a.endsWith('.jsonl')) continue;
        const tam = path.join(alt, a);
        const bilgi = fs.statSync(tam);
        if (bilgi.size < enAz) continue;
        cikti.push({ yol: tam, boyut: bilgi.size, yan: true });
      }
    }
  }
  cikti.sort((a, b) => b.boyut - a.boyut);
  return cikti;
}

function argAl(ad, varsayilan) {
  const i = process.argv.indexOf(ad);
  if (i < 0 || i + 1 >= process.argv.length) return varsayilan;
  return process.argv[i + 1];
}

async function main() {
  const enAz = Number(argAl('--enaz', '1000000'));
  const sinir = Number(argAl('--adet', '12'));
  const jsonMu = process.argv.includes('--json');

  const kip = process.argv.includes('--yan') ? 'yan' : 'ana';
  const secilen = argAl('--dosya', null);
  const adaylar = secilen
    ? [{ yol: secilen, boyut: fs.statSync(secilen).size }]
    : dosyaBul(enAz, kip).slice(0, sinir);

  if (!adaylar.length) {
    console.error('Transkript bulunamadi.');
    process.exit(1);
  }

  const taramalar = [];
  for (const a of adaylar) {
    taramalar.push(await tara(a.yol));
  }

  const olcum = sikistirmaOlcumu(taramalar);
  const gercek = gercekToplam(taramalar);
  const yan = yanAjanOlcumu(taramalar);

  const sogukluk = soguklukOlcumu(taramalar);
  const oran = olcum.oranOrtanca;
  const model = { oran: oran || null, soguklukOrani: sogukluk.oran || 0 };
  const olcusuz = oran === null;
  if (olcusuz) model.oran = 0.35;

  const akislar = taramalar.map(deltaAkisi);
  const sonuclar = ESIKLER.map((e) => benzet(akislar, e, model));

  const dogrulama = olcum.onTokenOrtanca
    ? benzet(akislar, olcum.onTokenOrtanca, model)
    : null;

  if (jsonMu) {
    console.log(
      JSON.stringify(
        {
          dosyalar: adaylar.map((a) => ({ yol: a.yol, boyut: a.boyut })),
          carpan: CARPAN,
          olcum,
          sogukluk,
          gercek,
          yan,
          model,
          olcusuz,
          sonuclar,
          dogrulama,
        },
        (_k, v) => (v instanceof Map ? Object.fromEntries(v) : v),
        2,
      ),
    );
    return;
  }

  console.log('# Pencere simulasyonu — transkript replay\n');
  console.log(`Dosya: ${adaylar.length}`);
  let bayt = 0;
  for (const a of adaylar) bayt += a.boyut;
  console.log(`Toplam boyut: ${bic(bayt / 1048576)} MB`);
  console.log(`Ana zincir turu: ${bic(gercek.tur)}\n`);

  console.log('## Carpanlar (varsayim — belgeye dayali, bu makinede olculmedi)');
  console.log(`input ${CARPAN.input}x · cache_creation ${CARPAN.cc}x · cache_read ${CARPAN.cr}x · output ${CARPAN.out}x\n`);

  console.log('## Gercek sikistirma olcumu');
  console.log(`Olay: ${olcum.olay} (${[...olcum.tetikler].map(([k, v]) => `${k}:${v}`).join(' ')})`);
  console.log(`preTokens ortanca: ${olcum.onTokenOrtanca ? bic(olcum.onTokenOrtanca) : 'yok'} (${olcum.onTokenEnAz ? bic(olcum.onTokenEnAz) : '-'} … ${olcum.onTokenEnCok ? bic(olcum.onTokenEnCok) : '-'})`);
  console.log(`Sonra/once baglam orani: ${oran ? oran.toFixed(3) : 'olculmedi'} (n=${olcum.ornek})`);
  console.log(`Sikistirma sonrasi ilk tur cache_creation ortanca: ${olcum.sonrakiCcOrtanca !== null ? bic(olcum.sonrakiCcOrtanca) : 'yok'}`);
  console.log(`Sikistirma oncesi normal tur cache_creation ortanca: ${olcum.oncekiCcOrtanca !== null ? bic(olcum.oncekiCcOrtanca) : 'yok'}\n`);

  console.log('## Cache bayatlamasi (olculdu)');
  console.log(`Soguk tur: ${sogukluk.soguk}/${sogukluk.aday} — oran %${sogukluk.oran !== null ? (sogukluk.oran * 100).toFixed(1) : '-'}`);
  console.log(`Benzetimde her ${model.soguklukOrani ? Math.max(1, Math.round(1 / model.soguklukOrani)) : '-'}. tur soguk sayildi\n`);

  console.log('## Gercek toplam (transkriptte olculen)');
  const g = gercek.toplam;
  console.log(`input ${bic(g.input)} · cc ${bic(g.cc)} · cr ${bic(g.cr)} · out ${bic(g.out)}`);
  console.log(`Girdi esdegeri: ${bic(gercek.esdeger)}`);
  console.log(`cache_read payi: %${((g.cr / (g.input + g.cc + g.cr)) * 100).toFixed(1)}\n`);

  if (dogrulama) {
    console.log('## Model dogrulamasi (esik = olculen preTokens ortancasi)');
    console.log(`Benzetim esdegeri: ${bic(dogrulama.esdeger)} · gercek: ${bic(gercek.esdeger)}`);
    console.log(`Sapma: %${(((dogrulama.esdeger - gercek.esdeger) / gercek.esdeger) * 100).toFixed(1)}`);
    console.log(`Benzetim sikistirma: ${dogrulama.sikistirma} · gercek: ${olcum.olay}\n`);
  }

  console.log('## Esik karsilastirmasi');
  console.log('| Esik | Sikistirma | Ort. tasinan baglam | input | cache_creation | cache_read | output | Girdi esdegeri |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const s of sonuclar) {
    const t = s.toplam;
    console.log(
      `| ${bic(s.esik)} | ${s.sikistirma} | ${bic(s.baglamOrtanca)} | ${bic(t.input)} | ${bic(t.cc)} | ${bic(t.cr)} | ${bic(t.out)} | ${bic(s.esdeger)} |`,
    );
  }
  const enUcuz = sonuclar.reduce((a, b) => (b.esdeger < a.esdeger ? b : a));
  console.log(`\nEn ucuz esik: ${bic(enUcuz.esik)} (girdi esdegeri ${bic(enUcuz.esdeger)})`);
  const taban = sonuclar[sonuclar.length - 1];
  for (const s of sonuclar) {
    console.log(`  ${bic(s.esik)} → 1M'e gore %${(((s.esdeger - taban.esdeger) / taban.esdeger) * 100).toFixed(1)}`);
  }

  console.log('\n## Alt ajan');
  console.log(`Oturum: ${yan.oturum} · tur ortanca: ${yan.turOrtanca} · baslangic baglami ortanca: ${yan.baslangicOrtanca !== null ? bic(yan.baslangicOrtanca) : '-'}`);
  console.log(`Buyume ortanca: ${yan.buyumeOrtanca !== null ? bic(yan.buyumeOrtanca) : '-'} · baslangic/en buyuk pay ortanca: ${yan.payOrtanca !== null ? yan.payOrtanca.toFixed(3) : '-'}`);
  console.log(`Zirve baglam ortanca: ${yan.zirveOrtanca !== null ? bic(yan.zirveOrtanca) : '-'} · en cok: ${yan.zirveEnCok !== null ? bic(yan.zirveEnCok) : '-'}`);
  console.log(`200k asan: ${yan.asan200k}/${yan.oturum} · 500k asan: ${yan.asan500k}/${yan.oturum}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
