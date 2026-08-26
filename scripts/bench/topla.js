#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const KOK = path.resolve(__dirname, '..', '..');
const SONUC_KOK = path.join(KOK, 'bench', 'sonuc');
const TABAN_JS = path.join(KOK, 'scripts', 'olcum', 'taban.js');
const RAPOR_MD = path.join(KOK, 'docs', 'BENCH-SONUC.md');
const TOPLAM_JSON = path.join(SONUC_KOK, 'toplam.json');

const GOREVLER = ['ozellik', 'hata', 'rapor', 'teksatir'];
const DURUMLAR = ['premium', 'normal', 'eco', 'native'];

const FARK_ESIGI = 20;

let tabanOnbellek = null;

function taban() {
  if (tabanOnbellek) return tabanOnbellek;
  const kaynak = fs.readFileSync(TABAN_JS, 'utf8');
  const modul = { exports: {} };
  const sahteProcess = new Proxy(process, {
    get: (h, k) => (k === 'argv' ? [process.argv[0], TABAN_JS] : Reflect.get(h, k)),
  });
  const fn = new Function(
    'require',
    'module',
    'exports',
    '__filename',
    '__dirname',
    'process',
    'console',
    `${kaynak}\nmodule.exports = { ozetle, tokenTahmini };`
  );
  fn(
    require,
    modul,
    modul.exports,
    TABAN_JS,
    path.dirname(TABAN_JS),
    sahteProcess,
    { log() {}, error() {} }
  );
  tabanOnbellek = modul.exports;
  return tabanOnbellek;
}

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
      if (giris.isDirectory()) yigin.push(tam);
      else if (giris.name.endsWith('.jsonl')) cikti.push(tam);
    }
  }
  return cikti.sort();
}

function bicim(n) {
  return n === null || n === undefined ? '-' : n.toLocaleString('tr-TR');
}

function kusurSayisi(dogrulama) {
  if (!dogrulama) return null;
  if (dogrulama.gecti) return 0;
  const g = String(dogrulama.cikti || '').replace(/^KIRMIZI\s*·\s*/, '');
  if (!g.trim()) return 1;
  return g.split('|').filter((x) => x.trim()).length;
}

function harnessKarsilastir(o) {
  const harness = (o.butceIlk ?? 0) - (o.butceSon ?? 0);
  const n = o.turSirasi.length;
  if (harness <= 0 || n < 2) return { harness: harness || null, yeniden: null, sapmaYuzde: null };
  const t = o.turSirasi[n - 2];
  const yeniden = t.input + t.cc + t.cr + t.out;
  return {
    harness,
    yeniden,
    sapmaYuzde: Number((((yeniden - harness) / harness) * 100).toFixed(2)),
  };
}

async function kosuOzeti(dosya) {
  const s = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  const k = {
    anahtar: s.anahtar,
    gorev: s.gorev,
    durum: s.durum,
    basari: s.dogrulama ? (s.dogrulama.gecti ? 1 : 0) : null,
    kusur: kusurSayisi(s.dogrulama),
    sureMs: s.sureMs,
    tavanAsildi: !!s.tavanAsildi,
    hata: s.hata,
    modelId: s.modelId,
    bildirilenTur: s.bildirilenTur ?? null,
    maliyetUsd: s.maliyetUsd ?? null,
    transkriptVar: false,
    serh: null,
    tur: null,
    ana: null,
    alt: null,
    toplamKalem: null,
    ajanSayisi: null,
    harness: null,
  };

  if (!s.transkript || !fs.existsSync(s.transkript)) {
    k.serh = 'transkript yok — sonuç JSON alanlarıyla yetinildi';
    k.tur = s.bildirilenTur ?? null;
    k.ajanSayisi = null;
    return k;
  }

  const { ozetle } = taban();
  const o = await ozetle(s.transkript);
  k.transkriptVar = true;
  k.tur = o.tur;
  k.ana = { input: o.input, cc: o.cc, cr: o.cr, out: o.out };
  k.modelId = k.modelId || [...o.modeller.keys()][0] || null;
  k.harness = harnessKarsilastir(o);

  const alt = { input: 0, cc: 0, cr: 0, out: 0, tur: 0, dosya: 0 };
  const projeKoku = path.join(s.konfig, 'projects');
  for (const t of transkriptleriTopla(projeKoku)) {
    if (path.resolve(t) === path.resolve(s.transkript)) continue;
    const a = await ozetle(t);
    alt.input += a.input;
    alt.cc += a.cc;
    alt.cr += a.cr;
    alt.out += a.out;
    alt.tur += a.tur;
    alt.dosya += 1;
  }
  k.alt = alt;
  k.ajanSayisi = 1 + alt.dosya;
  k.toplamKalem = {
    input: k.ana.input + alt.input,
    cc: k.ana.cc + alt.cc,
    cr: k.ana.cr + alt.cr,
    out: k.ana.out + alt.out,
  };
  return k;
}

async function topla() {
  if (!fs.existsSync(SONUC_KOK)) throw new Error(`sonuc koku yok: ${SONUC_KOK}`);
  const dosyalar = fs
    .readdirSync(SONUC_KOK)
    .filter((f) => f.endsWith('.json') && f !== path.basename(TOPLAM_JSON))
    .map((f) => path.join(SONUC_KOK, f))
    .sort();
  const kosular = [];
  for (const d of dosyalar) kosular.push(await kosuOzeti(d));
  return kosular;
}

function durumVerimi(kosular, durum) {
  const liste = kosular.filter((k) => k.durum === durum);
  const n = liste.length;
  const basarili = liste.filter((k) => k.basari === 1).length;
  const sureMs = liste.reduce((t, k) => t + (k.sureMs || 0), 0);
  const dk = sureMs / 60000;
  const kalem = { input: 0, cc: 0, cr: 0, out: 0 };
  let kalemliK = 0;
  for (const k of liste) {
    if (!k.toplamKalem) continue;
    kalemliK++;
    for (const a of ['input', 'cc', 'cr', 'out']) kalem[a] += k.toplamKalem[a];
  }
  const kusur = liste.reduce((t, k) => t + (k.kusur || 0), 0);
  return {
    durum,
    gorevSayisi: n,
    basarili,
    basariYuzde: n ? Math.round((basarili / n) * 100) : 0,
    toplamSureSn: Math.round(sureMs / 1000),
    isPerDakika: dk > 0 ? Number((basarili / dk).toFixed(2)) : null,
    gorevBasinaKalem: kalemliK
      ? {
          input: Math.round(kalem.input / kalemliK),
          cc: Math.round(kalem.cc / kalemliK),
          cr: Math.round(kalem.cr / kalemliK),
          out: Math.round(kalem.out / kalemliK),
        }
      : null,
    kusur,
    kusurPerGorev: n ? Number((kusur / n).toFixed(2)) : null,
    maliyetUsd: Number(liste.reduce((t, k) => t + (k.maliyetUsd || 0), 0).toFixed(4)),
  };
}

function verimSatirlari(kosular) {
  const L = [];
  L.push(
    `${'kosul'.padEnd(9)}${'basari'.padEnd(9)}${'is/dk'.padEnd(8)}${'gorev basina in/cc/cr/out'.padEnd(34)}${'kusur/gorev'.padEnd(12)}sure`
  );
  for (const d of DURUMLAR) {
    const v = durumVerimi(kosular, d);
    const kb = v.gorevBasinaKalem;
    L.push(
      d.padEnd(9) +
        `${v.basarili}/${v.gorevSayisi} %${v.basariYuzde}`.padEnd(9) +
        String(v.isPerDakika ?? '-').padEnd(8) +
        (kb
          ? `${bicim(kb.input)}/${bicim(kb.cc)}/${bicim(kb.cr)}/${bicim(kb.out)}`
          : '-'
        ).padEnd(34) +
        String(v.kusurPerGorev ?? '-').padEnd(12) +
        `${v.toplamSureSn} sn`
    );
  }
  return L;
}

function hucre(k) {
  if (!k) return '—';
  const parcalar = [];
  parcalar.push(
    `**${k.basari === null ? '?' : k.basari}**${k.tavanAsildi ? ' TAVAN' : ''}${k.hata ? ' HATA' : ''}`
  );
  if (k.toplamKalem) {
    parcalar.push(
      `in ${bicim(k.toplamKalem.input)} · cc ${bicim(k.toplamKalem.cc)}`,
      `cr ${bicim(k.toplamKalem.cr)} · out ${bicim(k.toplamKalem.out)}`
    );
  } else {
    parcalar.push('token: transkript yok');
  }
  parcalar.push(
    `${k.sureMs ? Math.round(k.sureMs / 1000) : '-'} sn · ${k.tur ?? '-'} tur · ${k.ajanSayisi ?? '?'} ajan`
  );
  return parcalar.join('<br>');
}

function farkYorumu(kosular, alan) {
  const deger = {};
  for (const d of DURUMLAR) {
    const v = durumVerimi(kosular, d);
    if (!v.gorevBasinaKalem) return null;
    deger[d] = alan === 'taze' ? v.gorevBasinaKalem.input + v.gorevBasinaKalem.cc + v.gorevBasinaKalem.out : v.gorevBasinaKalem.cr;
  }
  const sirali = Object.entries(deger).sort((a, b) => a[1] - b[1]);
  const [enAz, enCok] = [sirali[0], sirali[sirali.length - 1]];
  const yuzde = enAz[1] ? ((enCok[1] - enAz[1]) / enAz[1]) * 100 : 0;
  return { deger, enAz, enCok, yuzde: Number(yuzde.toFixed(1)) };
}

function rapor(kosular) {
  const bul = (g, d) => kosular.find((k) => k.gorev === g && k.durum === d);
  const L = [];
  const tarihler = kosular.map((k) => k.anahtar);
  L.push('# Bench sonucu — dört görev × dört koşul');
  L.push('');
  L.push(
    `Üretim: \`node scripts/bench/topla.js\` — ham koşu dosyaları \`bench/sonuc/*.json\`, bu dosya ve \`bench/sonuc/toplam.json\` o komutla yeniden yazılır.`
  );
  L.push('');
  L.push(
    `Koşu sayısı: **${kosular.length}** · görevler: ${GOREVLER.join(', ')} · koşullar: ${DURUMLAR.join(', ')}.`
  );
  L.push('');
  L.push('## 1. Tablo — satır görev, sütun koşul');
  L.push('');
  L.push(
    'Hücre: başarı (1/0) · dört token kalemi (input / cache-create / cache-read / output) · duvar saati · tur · ajan sayısı. Tek toplam token yazılmaz (BENCH-YONTEM.md §5).'
  );
  L.push('');
  L.push(`| görev | ${DURUMLAR.join(' | ')} |`);
  L.push(`|---|${DURUMLAR.map(() => '---').join('|')}|`);
  for (const g of GOREVLER) {
    L.push(`| **${g}** | ${DURUMLAR.map((d) => hucre(bul(g, d))).join(' | ')} |`);
  }
  L.push('');
  L.push('## 2. Koşu dökümü');
  L.push('');
  L.push('| koşu | başarı | input | cache-create | cache-read | output | süre | tur | ajan | kusur | model | harness sapma |');
  L.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|');
  for (const k of kosular) {
    const t = k.toplamKalem;
    L.push(
      `| ${k.anahtar} | ${k.basari ?? '?'} | ${t ? bicim(t.input) : '-'} | ${t ? bicim(t.cc) : '-'} | ${t ? bicim(t.cr) : '-'} | ${t ? bicim(t.out) : '-'} | ${k.sureMs ? `${Math.round(k.sureMs / 1000)} sn` : '-'} | ${k.tur ?? '-'} | ${k.ajanSayisi ?? '?'} | ${k.kusur ?? '?'} | ${k.modelId || '-'} | ${k.harness && k.harness.sapmaYuzde !== null ? `%${k.harness.sapmaYuzde}` : '-'} |`
    );
  }
  L.push('');
  const serhli = kosular.filter((k) => k.serh);
  if (serhli.length) {
    L.push(`> Şerh: ${serhli.length} koşuda transkript bulunamadı (${serhli.map((k) => k.anahtar).join(', ')}); o satırların token kalemleri boş, kalan alanlar sonuç JSON'undan okundu.`);
    L.push('');
  }
  const altVar = kosular.filter((k) => k.alt && k.alt.dosya > 0);
  L.push(
    `Alt ajan transkriptleri de gezildi (\`konfig/projects\` altındaki tüm \`.jsonl\`): ${altVar.length ? `${altVar.length} koşuda alt ajan bulundu, tokenları yukarıdaki kalemlere dahil` : 'hiçbir koşuda alt ajan açılmadı, ajan sayısı her hücrede 1'}.`
  );
  L.push('');

  L.push('## 3. Toplayıcı doğrulaması — harness sayacı');
  L.push('');
  L.push(
    "Harness'ın `total_tokens` sayacı bağlam işgalini ölçer: son hatırlatıcı anındaki bağlam (input + cache-create + cache-read) artı o turun çıktısı. Aynı büyüklük transkriptten okunan tur dizisinden yeniden kuruldu; iki sayının farkı toplayıcının doğruluk ölçüsü."
  );
  L.push('');
  L.push('| koşu | harness sayacı | transkriptten yeniden | sapma |');
  L.push('|---|---:|---:|---:|');
  for (const k of kosular) {
    if (!k.harness) continue;
    L.push(
      `| ${k.anahtar} | ${bicim(k.harness.harness)} | ${bicim(k.harness.yeniden)} | %${k.harness.sapmaYuzde ?? '-'} |`
    );
  }
  const sapmalar = kosular.filter((k) => k.harness && k.harness.sapmaYuzde !== null).map((k) => Math.abs(k.harness.sapmaYuzde));
  L.push('');
  L.push(
    `En büyük sapma **%${sapmalar.length ? Math.max(...sapmalar) : '-'}** — kabul eşiği %5.`
  );
  L.push('');

  L.push('## 4. Verim');
  L.push('');
  L.push('| koşul | başarı | iş/dakika | görev başına in / cc / cr / out | kusur/görev | toplam süre | bildirilen maliyet |');
  L.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const d of DURUMLAR) {
    const v = durumVerimi(kosular, d);
    const kb = v.gorevBasinaKalem;
    L.push(
      `| ${d} | ${v.basarili}/${v.gorevSayisi} (%${v.basariYuzde}) | ${v.isPerDakika ?? '-'} | ${kb ? `${bicim(kb.input)} / ${bicim(kb.cc)} / ${bicim(kb.cr)} / ${bicim(kb.out)}` : '-'} | ${v.kusurPerGorev ?? '-'} | ${v.toplamSureSn} sn | $${v.maliyetUsd} |`
    );
  }
  L.push('');
  L.push(
    'Bug oranı `dogrula.js`in bulduğu kusur sayısından gelir: geçen koşu 0 kusur, kalan koşuda `KIRMIZI ·` satırındaki `|` ile ayrılmış madde sayısı.'
  );
  L.push('');

  L.push('## 5. n=1 şerhi');
  L.push('');
  const taze = farkYorumu(kosular, 'taze');
  const cr = farkYorumu(kosular, 'cr');
  L.push(
    `Her hücre tek koşudur. Aynı istem iki kez koşulduğunda model farklı sayıda araç çağırabilir, dolayısıyla küçük aralıklar gürültüdür. Burada bir aralık ancak **%${FARK_ESIGI}**'yi aşarsa "fark" diye yazılır.`
  );
  L.push('');
  if (taze) {
    L.push(
      `- Taze token (input+cc+out), görev başına: en az **${taze.enAz[0]}** ${bicim(taze.enAz[1])}, en çok **${taze.enCok[0]}** ${bicim(taze.enCok[1])} — aralık %${taze.yuzde}. ${taze.yuzde >= FARK_ESIGI ? '**Fark var.**' : 'Ayırt edilemedi.'}`
    );
  }
  if (cr) {
    L.push(
      `- Cache-read, görev başına: en az **${cr.enAz[0]}** ${bicim(cr.enAz[1])}, en çok **${cr.enCok[0]}** ${bicim(cr.enCok[1])} — aralık %${cr.yuzde}. ${cr.yuzde >= FARK_ESIGI ? '**Fark var.**' : 'Ayırt edilemedi.'}`
    );
  }
  const basariHepsi = kosular.every((k) => k.basari === 1);
  L.push(
    `- Başarı: ${basariHepsi ? 'dört koşulun tamamı dört görevi de geçti — bu görev seti koşulları başarı ekseninde ayırmıyor, ayrım yalnız token ve sürede.' : 'koşullar arasında başarı farkı var, ayrıntı §4.'}`
  );
  L.push('');
  L.push('---');
  L.push('');
  L.push(
    'Bu dosya üretilir; elle düzenlenmez. Bir önceki (geçersiz sayılan Chess960) tur raporu git geçmişinde durur.'
  );
  L.push('');
  return L.join('\n');
}

async function main() {
  const kosular = await topla();
  if (!kosular.length) {
    process.stderr.write(`sonuc dosyasi yok: ${SONUC_KOK}\n`);
    process.exit(1);
  }
  const verim = {};
  for (const d of DURUMLAR) verim[d] = durumVerimi(kosular, d);
  fs.writeFileSync(
    TOPLAM_JSON,
    `${JSON.stringify({ uretim: new Date().toISOString(), kosular, verim }, null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(RAPOR_MD, rapor(kosular), 'utf8');
  for (const s of verimSatirlari(kosular)) process.stdout.write(`${s}\n`);
  process.stdout.write(`\nrapor: ${RAPOR_MD}\nham toplam: ${TOPLAM_JSON}\n`);
  const sapmalar = kosular
    .filter((k) => k.harness && k.harness.sapmaYuzde !== null)
    .map((k) => Math.abs(k.harness.sapmaYuzde));
  if (sapmalar.length) {
    const en = Math.max(...sapmalar);
    process.stdout.write(`harness karsilastirmasi: en buyuk sapma %${en} (esik %5)\n`);
    if (en > 5) process.exitCode = 1;
  }
}

module.exports = { topla, kosuOzeti, durumVerimi, verimSatirlari, GOREVLER, DURUMLAR };

if (require.main === module) main();
