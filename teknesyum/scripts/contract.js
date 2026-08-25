#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { roleKoku } = require('../hooks/ortak.js');
const { sozlesmeAdi } = require('../hooks/contract-schema.js');
const D = require('../hooks/denetim-kaydi.js');

const argv = process.argv.slice(2);

function arg(ad) {
  const i = argv.indexOf('--' + ad);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
}

function bas(satir, kod) {
  process.stdout.write(satir.join('\n') + '\n');
  process.exitCode = kod || 0;
}

function dur(satir) {
  return bas(satir, 2);
}

function gitCikti(kok, args) {
  const r = spawnSync('git', ['-C', kok].concat(args), {
    encoding: 'utf8',
    timeout: 30000,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  return r.error || r.status !== 0 ? null : String(r.stdout || '').trim();
}

function kokBul() {
  const r = roleKoku(arg('kok') || process.cwd());
  if (!r) return null;
  return { relay: r.relay, kok: path.dirname(path.dirname(r.relay)) };
}

function tamamla() {
  const id = arg('id');
  if (!id || !sozlesmeAdi(id + '.md'))
    return dur([
      'Sözleşme kimliği verilmedi ya da biçim dışı.',
      'Kullanım: contract.js complete --id T7',
    ]);

  const yer = kokBul();
  if (!yer) return dur(['Röle kökü bulunamadı — `.claude/relay` yok.']);
  const { relay, kok } = yer;

  const kaynak = path.join(relay, 'contracts', id + '.md');
  const hedef = path.join(relay, 'contracts', 'done', id + '.md');
  let govde;
  try {
    govde = fs.readFileSync(kaynak, 'utf8');
  } catch {
    return dur(['Sözleşme okunamadı: ' + path.relative(kok, kaynak)]);
  }
  if (fs.existsSync(hedef)) return dur([id + ' zaten done/ altında.']);

  const tur = D.alanDegeri('round', govde) || '1';
  const owns = D.ownsListesi(govde);
  if (!owns.length) return dur([id + ' sözleşmesinde owns kümesi boş — tamamlanamaz.']);

  const headSha = gitCikti(kok, ['rev-parse', 'HEAD']);
  if (!headSha) return dur(['HEAD okunamadı — bu bir git deposu değil ya da henüz commit yok.']);

  const kayitYol = D.kayitYolu(relay, id, tur);
  const kayit = D.kayitOku(kayitYol);
  if (!kayit)
    return dur([
      'Denetim kaydı yok: ' + path.relative(kok, kayitYol),
      '',
      'Denetçi turunu kapatırken bu dosyayı yazar. Alanlar:',
      '  ' + D.ALANLAR.join(', '),
    ]);

  const sebep = D.kayitDogrula(kayit, {
    id,
    headSha,
    owns,
    diffHash: D.dosyaOzeti(kok, owns),
  });
  if (sebep) return dur([id + ' tamamlanamadı — ' + sebep]);

  const denetci = D.denetciSaglam(relay, kayit.auditorRunId);
  if (denetci) return dur([id + ' tamamlanamadı — ' + denetci]);

  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.renameSync(kaynak, hedef);
  D.kayitTuket(kayitYol, headSha);
  D.defterKur(relay);
  D.defterEkle(relay, {
    id,
    round: tur,
    auditorRunId: kayit.auditorRunId,
    headSha,
    diffHash: kayit.diffHash,
    at: new Date().toISOString(),
  });

  return bas([
    id + ' tamamlandı — contracts/done/' + id + '.md',
    'Denetim kaydı tüketildi, defter satırı yazıldı (HEAD ' + headSha.slice(0, 8) + ').',
  ]);
}

function denetle() {
  const yer = kokBul();
  if (!yer) return dur(['Röle kökü bulunamadı — `.claude/relay` yok.']);
  const yetkisiz = D.doneDenetle(yer.kok, yer.relay);
  if (!yetkisiz.length) return bas(['done/ altındaki her sözleşmenin defter satırı var.']);
  return bas(
    [
      'Defterde karşılığı olmayan sözleşme: ' + yetkisiz.join(', '),
      '',
      'Bunlar `contract.js complete` dışında bir yolla done/ altına girmiş.',
    ],
    3
  );
}

function yardim() {
  return bas([
    'contract.js — sözleşme tamamlamanın tek meşru yolu',
    '',
    '  complete --id <ID>   denetim kaydını doğrular, done/ altına atomik taşır',
    '  audit                done/ içeriğini defterle karşılaştırır',
  ]);
}

function main() {
  const komut = argv[0];
  if (komut === 'complete') return tamamla();
  if (komut === 'audit') return denetle();
  return yardim();
}

if (require.main === module) main();
module.exports = { tamamla, denetle };
