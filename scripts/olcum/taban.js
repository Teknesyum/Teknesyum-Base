const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const PROJELER = path.join(process.env.USERPROFILE, '.claude', 'projects');

const BASE_ONEK = /^-\s+(teknesyum[:\-]|tani\b|graphify\b)/;
const BASE_AJAN = /^-\s+teknesyum:/;

function tokenTahmini(karakter) {
  return Math.round(karakter / 3.6);
}

async function satirlar(dosya) {
  const rl = readline.createInterface({
    input: fs.createReadStream(dosya),
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  const cikti = [];
  for await (const satir of rl) {
    if (!satir.trim()) continue;
    try {
      cikti.push(JSON.parse(satir));
    } catch {}
  }
  return cikti;
}

function bosOzet() {
  return {
    tur: 0,
    input: 0,
    cc: 0,
    cr: 0,
    out: 0,
    butceIlk: null,
    butceSon: null,
    ilkTs: null,
    sonTs: null,
    cwd: null,
    ilkIstem: null,
    modeller: new Map(),
    ajanCagrisi: [],
    skillCagrisi: [],
    aracSayaci: new Map(),
    ekler: new Map(),
    ekOrnek: new Map(),
    olcuSatiri: [],
    turSirasi: [],
    aracSonucuKar: 0,
    aracSonucuAdet: 0,
    aracSonucuBuyuk: [],
    oturumMesajlari: [],
  };
}

async function ozetle(dosya) {
  const o = bosOzet();
  const gorulen = new Set();
  for (const k of await satirlar(dosya)) {
    if (k.timestamp) {
      if (!o.ilkTs) o.ilkTs = k.timestamp;
      o.sonTs = k.timestamp;
    }
    if (!o.cwd && k.cwd) o.cwd = k.cwd;

    if (k.type === 'attachment' && k.attachment) {
      const e = k.attachment;
      const ad = e.hookName ? `hook ${e.hookEvent}:${e.hookName}` : `ek ${e.type}`;
      const govde = e.hookName ? (e.stdout || '') + (e.content || '') : JSON.stringify(e);
      const cur = o.ekler.get(ad) || { n: 0, kar: 0 };
      cur.n++;
      cur.kar += govde.length;
      o.ekler.set(ad, cur);
      if (!o.ekOrnek.has(ad)) o.ekOrnek.set(ad, govde);
      if (e.hookEvent === 'SessionStart') o.oturumMesajlari.push(govde);
      if (e.type === 'total_tokens_reminder') {
        const m = /<total_tokens>([\d,]+) tokens left/.exec(e.text || '');
        if (m) {
          const v = Number(m[1].replace(/,/g, ''));
          if (o.butceIlk === null) o.butceIlk = v;
          o.butceSon = v;
        }
      }
      const stop = /Total Süre:.*?Tahmini Token:\s*~?([\d.]+)/.exec(govde);
      if (stop) o.olcuSatiri.push(stop[0]);
    }

    if (k.type === 'user' && k.message) {
      const c = k.message.content;
      if (Array.isArray(c))
        for (const blok of c) {
          if (blok.type !== 'tool_result') continue;
          const g =
            typeof blok.content === 'string' ? blok.content : JSON.stringify(blok.content || '');
          o.aracSonucuAdet++;
          o.aracSonucuKar += g.length;
          o.aracSonucuBuyuk.push(g.length);
        }
    }

    if (k.type === 'user' && k.message && !o.ilkIstem) {
      const c = k.message.content;
      const t = typeof c === 'string' ? c : (c || []).map((x) => x.text || '').join(' ');
      if (t && !t.startsWith('<')) o.ilkIstem = t.slice(0, 200).replace(/\s+/g, ' ');
    }

    if (k.type === 'assistant' && k.message) {
      if (k.message.model)
        o.modeller.set(k.message.model, (o.modeller.get(k.message.model) || 0) + 1);
      for (const blok of k.message.content || []) {
        if (blok.type !== 'tool_use') continue;
        o.aracSayaci.set(blok.name, (o.aracSayaci.get(blok.name) || 0) + 1);
        if (blok.name === 'Task' || blok.name === 'Agent')
          o.ajanCagrisi.push(
            `${blok.input?.subagent_type || '?'} · ${blok.input?.description || ''}`
          );
        if (blok.name === 'Skill') o.skillCagrisi.push(String(blok.input?.skill || '?'));
      }
      if (k.message.usage && !gorulen.has(k.requestId)) {
        gorulen.add(k.requestId);
        const u = k.message.usage;
        o.tur++;
        o.input += u.input_tokens || 0;
        o.cc += u.cache_creation_input_tokens || 0;
        o.cr += u.cache_read_input_tokens || 0;
        o.out += u.output_tokens || 0;
        o.turSirasi.push({
          ts: k.timestamp,
          input: u.input_tokens || 0,
          cc: u.cache_creation_input_tokens || 0,
          cr: u.cache_read_input_tokens || 0,
          out: u.output_tokens || 0,
        });
      }
    }
  }
  return o;
}

function listeAyristir(govde, ajanMi) {
  const desen = ajanMi ? BASE_AJAN : BASE_ONEK;
  let icerik = govde;
  try {
    const j = JSON.parse(govde);
    if (j.content) icerik = j.content;
    else if (Array.isArray(j.addedLines)) icerik = j.addedLines.join('\n');
  } catch {}
  let baseKar = 0;
  let toplamKar = 0;
  let baseSatir = 0;
  let toplamSatir = 0;
  let aktif = false;
  for (const s of icerik.split('\n')) {
    toplamKar += s.length + 1;
    if (/^-\s/.test(s)) {
      toplamSatir++;
      aktif = desen.test(s);
      if (aktif) baseSatir++;
    }
    if (aktif) baseKar += s.length + 1;
  }
  return { baseKar, toplamKar, baseSatir, toplamSatir };
}

function bicim(n) {
  return n.toLocaleString('tr-TR');
}

function rapor(etiket, o) {
  const L = [];
  L.push(`## ${etiket}`);
  L.push('');
  L.push(`- Aralık: ${o.ilkTs} → ${o.sonTs}`);
  L.push(`- cwd: \`${o.cwd}\``);
  L.push(`- İlk istem: ${o.ilkIstem}`);
  L.push(`- Tur (benzersiz istek): **${o.tur}**`);
  L.push(`- Model: ${[...o.modeller].map(([m, n]) => `${m} ×${n}`).join(', ')}`);
  L.push('');
  L.push('| usage alanı | toplam |');
  L.push('|---|---:|');
  L.push(`| input_tokens | ${bicim(o.input)} |`);
  L.push(`| cache_creation_input_tokens | ${bicim(o.cc)} |`);
  L.push(`| cache_read_input_tokens | ${bicim(o.cr)} |`);
  L.push(`| output_tokens | ${bicim(o.out)} |`);
  L.push(`| **taze giriş + çıkış** (input+cc+out) | **${bicim(o.input + o.cc + o.out)}** |`);
  L.push('');
  L.push(
    `- Harness bütçe sayacı: ${bicim(o.butceIlk ?? 0)} → ${bicim(o.butceSon ?? 0)} · **harcanan ${bicim((o.butceIlk ?? 0) - (o.butceSon ?? 0))}**`
  );
  L.push(`- Ajan çağrısı: ${o.ajanCagrisi.length ? o.ajanCagrisi.join('; ') : '**yok**'}`);
  L.push(`- Skill çağrısı: ${o.skillCagrisi.length ? o.skillCagrisi.join(', ') : '**yok**'}`);
  L.push(`- Ölçü satırı (Stop hook): ${o.olcuSatiri.length ? o.olcuSatiri.join(' / ') : 'yok'}`);
  L.push('');
  L.push('### Bağlama enjekte edilen bloklar');
  L.push('');
  L.push('| kaynak | kez | karakter | ≈token |');
  L.push('|---|---:|---:|---:|');
  let topKar = 0;
  for (const [ad, v] of [...o.ekler].sort((a, b) => b[1].kar - a[1].kar)) {
    topKar += v.kar;
    L.push(`| ${ad} | ${v.n} | ${bicim(v.kar)} | ${bicim(tokenTahmini(v.kar))} |`);
  }
  L.push(`| **toplam** | | **${bicim(topKar)}** | **${bicim(tokenTahmini(topKar))}** |`);
  L.push('');
  o.aracSonucuBuyuk.sort((a, b) => b - a);
  L.push(
    `- Araç sonucu: ${o.aracSonucuAdet} adet · ${bicim(o.aracSonucuKar)} karakter · ≈${bicim(tokenTahmini(o.aracSonucuKar))} token · en büyük beş: ${o.aracSonucuBuyuk.slice(0, 5).map(bicim).join(', ')}`
  );
  L.push('');
  L.push("### SessionStart hook'unun yazdığı");
  L.push('');
  for (const m of o.oturumMesajlari) L.push(`\`\`\`\n${m.slice(0, 700)}\n\`\`\``);
  L.push('');
  if (o.turSirasi.length) {
    const t1 = o.turSirasi[0];
    L.push(
      `- Tur 1 bağlamı: input ${bicim(t1.input)} + cc ${bicim(t1.cc)} + cr ${bicim(t1.cr)} = **${bicim(t1.input + t1.cc + t1.cr)}** (iş başlamadan önceki taban)`
    );
    L.push('');
  }
  return L.join('\n');
}

function baseDilimi(o) {
  const L = [];
  L.push('| liste | base satırı / toplam | base karakteri / toplam | ≈base token |');
  L.push('|---|---:|---:|---:|');
  let baseTop = 0;
  for (const [ad, ajanMi] of [
    ['ek skill_listing', false],
    ['ek agent_listing_delta', true],
  ]) {
    const g = o.ekOrnek.get(ad);
    if (!g) continue;
    const r = listeAyristir(g, ajanMi);
    baseTop += r.baseKar;
    L.push(
      `| ${ad} | ${r.baseSatir}/${r.toplamSatir} | ${bicim(r.baseKar)}/${bicim(r.toplamKar)} | ${bicim(tokenTahmini(r.baseKar))} |`
    );
  }
  for (const ad of [...o.ekler.keys()].filter((x) => x.startsWith('hook '))) {
    const v = o.ekler.get(ad);
    baseTop += v.kar;
    L.push(`| ${ad} (hepsi base) | ${v.n} kez | ${bicim(v.kar)} | ${bicim(tokenTahmini(v.kar))} |`);
  }
  L.push(
    `| **base payı toplamı** | | **${bicim(baseTop)}** | **${bicim(tokenTahmini(baseTop))}** |`
  );
  return { metin: L.join('\n'), baseKar: baseTop, baseTok: tokenTahmini(baseTop) };
}

(async () => {
  const hedefler = process.argv.slice(2);
  const parcalar = [];
  for (const h of hedefler) {
    const [etiket, dosya] = h.split('=');
    const tam = path.isAbsolute(dosya) ? dosya : path.join(PROJELER, dosya);
    if (!fs.existsSync(tam)) {
      parcalar.push(`## ${etiket}\n\n**Transkript bulunamadı:** \`${tam}\``);
      continue;
    }
    const o = await ozetle(tam);
    const b = baseDilimi(o);
    parcalar.push(
      `${rapor(etiket, o)}\n### Base'in sistem promptundaki payı\n\n${b.metin}\n\n- Base payı her turda cache'ten yeniden okunuyor: ${bicim(b.baseTok)} × ${o.tur} tur = **${bicim(b.baseTok * o.tur)}** cache_read token\n`
    );
  }
  console.log(parcalar.join('\n---\n\n'));
})();
