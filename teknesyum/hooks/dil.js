const fs = require('fs');
const path = require('path');
const { konfigKok, oturumKimligi, oturumProfilYolu, read } = require('./ortak.js');

// Tek dil ayarı: `~/.claude/teknesyum.json` → `dil`. Geçerli değerler `en` ve `tr`,
// varsayılan `en`. Ayar hem kullanıcıya basılan bildirimleri hem ajanlara enjekte edilen
// yönergeleri belirler — ajanlar birbirleriyle de bu dilde konuşur.

let _dil = null;

function dil() {
  if (_dil) return _dil;
  const e = process.env.TEKNESYUM_DIL;
  if (e === 'tr' || e === 'en') return (_dil = e);
  const kok = konfigKok();
  try {
    const c = JSON.parse(fs.readFileSync(path.join(kok, 'teknesyum.json'), 'utf8'));
    if (c.dil === 'tr' || c.dil === 'en') return (_dil = c.dil);
  } catch {}
  return (_dil = 'en');
}

const PROFILLER = ['eco', 'normal', 'premium'];
const BAYAT_MS = 7 * 24 * 60 * 60 * 1000;

function oturumProfili(sid) {
  if (!sid) return null;
  const c = read(oturumProfilYolu(sid));
  if (!c || !PROFILLER.includes(c.profil)) return null;
  const ts = Number(c.ts);
  if (!Number.isFinite(ts) || Date.now() - ts > BAYAT_MS) return null;
  return c.profil;
}

function makineProfili() {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(konfigKok(), 'teknesyum.json'), 'utf8'));
    if (PROFILLER.includes(c.profil)) return c.profil;
    return c.premium === true ? 'premium' : 'normal';
  } catch {}
  return 'normal';
}

function profilHesapla(sid) {
  const e = process.env.TEKNESYUM_PREMIUM;
  if (e === '0' || e === 'off') return 'normal';
  if (e === '1' || e === 'on') return 'premium';
  return oturumProfili(sid) || makineProfili();
}

const _profil = new Map();

function profil(sid) {
  const kimlik = sid === undefined ? oturumKimligi() : sid || null;
  if (_profil.has(kimlik)) return _profil.get(kimlik);
  const p = profilHesapla(kimlik);
  _profil.set(kimlik, p);
  return p;
}

function premium(sid) {
  return profil(sid) === 'premium';
}

function profilKaynak(sid) {
  const e = process.env.TEKNESYUM_PREMIUM;
  if (e === '0' || e === 'off' || e === '1' || e === 'on') return 'ortam';
  const kimlik = sid === undefined ? oturumKimligi() : sid || null;
  return oturumProfili(kimlik) ? 'oturum' : 'makine';
}

function depoSayisi(sid) {
  return { eco: 1, normal: 10, premium: 50 }[profil(sid)];
}

const KONSEY = 'fable + opus';

// Dört emir kaldı. Ölçüt: emrin ihlali maliyetli mi, yani modelin varsayılanını ters
// çeviriyor mu. Çıkanlar başka kanaldan geliyordu — plan konseyi ve ikinci görüş
// `relay/SKILL.md`'de, deterministik araç kuralı üç profilde de değişmez.
const PREMIUM_NOTU =
  'Premium mode is on. Agents: opus only, no sonnet/haiku. Independent contracts run ' +
  'at once, parallel by default: 20 parallel, worktree past 3. Open agents without ' +
  'asking; tokens are not a reason. Why: relay/references/premium.md';

const ECO_NOTU =
  'Eco mode is on. Tokens come first; correctness does not bend. `Grep`/`Glob` before ' +
  'reading a whole file. Do not open agents. Keep the answer short.';

const S = {
  calisanVar: {
    tr: (n, roller) =>
      n +
      ' ajan hâlâ çalışıyor (' +
      roller +
      '). Dönüş bloğunda "ajan yok" yazma; bu satır ölçüldü, tahmin değil.',
    en: (n, roller) =>
      n +
      ' agent(s) still running (' +
      roller +
      '). Do not write "no agents" in the return block; this line is measured, not guessed.',
  },
  gorev: {
    tr: (rol, model, tanim, n) =>
      'Görev ▸ ' +
      (tanim ? tanim + ' — ' : '') +
      rol +
      ' rolünde' +
      (model ? ' ' + model + ' ile' : '') +
      ' açıldı' +
      (n > 1 ? ', ' + n + ' ajan çalışıyor' : ''),
    en: (rol, model, tanim, n) =>
      'Task ▸ ' +
      (tanim ? tanim + ' — ' : '') +
      'opened as ' +
      rol +
      (model ? ' on ' + model : '') +
      (n > 1 ? ', ' + n + ' agents running' : ''),
  },
  bitti: {
    tr: (rol, sure) => 'Görev ▸ ' + rol + ' bitti' + (sure ? ' — ' + sure : ''),
    en: (rol, sure) => 'Task ▸ ' + rol + ' finished' + (sure ? ' — ' + sure : ''),
  },
  sureBelirsiz: { tr: 'süre belirsiz', en: 'duration unknown' },
  saniye: { tr: (n) => n + ' sn', en: (n) => n + ' s' },
  dakika: { tr: (n) => n + ' dk', en: (n) => n + ' min' },

  turSuresi: {
    tr: (dk, sn) => (dk ? dk + 'dk ' + sn + 'sn' : sn + 'sn'),
    en: (dk, sn) => (dk ? dk + 'm ' + sn + 's' : sn + 's'),
  },
  // Ters tırnak yok: bu satır `systemMessage` ile basılıyor ve o kanal markdown
  // işlemiyor — tırnaklar ekranda harfiyen görünüyordu (ölçüldü 23.08.2026).
  // Makbuz artık `_makbuz.json` üzerinden statusline'a gidiyor; modele hiç yazılmıyor.
  // Modele yazan `turOzetiYonerge` girdisi bu yüzden silindi (Y3 §4, 27.08) — kaldırılma
  // gerekçesi `docs/HATA-tur-makbuzu-tekrari.md`: talimat cevabın tamamını tekrarlatıyordu.
  turOzeti: {
    tr: (sure, ana, alt) =>
      'Total Süre: ' + sure + ' <> Ana Oturum: ' + ana + ' Token <> Alt Ajanlar: ' + alt + ' Token',
    en: (sure, ana, alt) =>
      'Total Time: ' +
      sure +
      ' <> Main Session: ' +
      ana +
      ' Tokens <> Subagents: ' +
      alt +
      ' Tokens',
  },
  aciktaKuyruk: {
    tr: (n) => 'Açıkta ' + n + ' madde — listesi `/update` ile açılır.',
    en: (n) => n + ' item(s) still open — list them with `/update`.',
  },

  aciktaEngel: {
    tr: (n, madde) =>
      'Kuyrukta ' +
      n +
      ' madde var, tur bitmez. Sıradaki: ' +
      madde +
      '. Maddeyi ya yap, ' +
      'ya bir sözleşmeye işle, ya kullanıcıya neden düştüğünü söyle — sonra `acikta`' +
      "'dan çıkar.",
    en: (n, madde) =>
      'The queue still holds ' +
      n +
      ' item(s); the turn cannot end. Next: ' +
      madde +
      '. ' +
      'Do it, fold it into a contract, or tell the user why it is dropped — then remove ' +
      'it from `acikta`.',
  },

  aciktaValf: {
    tr: (tavan, madde) =>
      'Kuyruk valfi açıldı: aynı madde ' +
      tavan +
      ' kez turu engelledi, geçiriliyor — ' +
      madde +
      '. `_sorun.log`a yazıldı.',
    en: (tavan, madde) =>
      'Queue valve released: the same item blocked ' +
      tavan +
      ' turns, letting it pass — ' +
      madde +
      '. Logged to `_sorun.log`.',
  },

  yonlendirmeTavan: {
    tr: (n) =>
      'Yönlendirme ' +
      n +
      ' satır, tavan 5. Beş satıra sığmayan şey yönlendirme değildir: ' +
      'değişikliği sözleşme dosyasına yaz, ajana tek satır gönder — ' +
      '"DEĞİŞTİ — sözleşme güncellendi, ilgili bölümü yeniden oku." ' +
      'Okunma anı sözleşmedir, mesaj değil.',
    en: (n) =>
      'Steering message is ' +
      n +
      ' lines, the ceiling is 5. Anything longer is not steering: ' +
      'write the change into the contract file and send the agent one line — ' +
      '"CHANGED — the contract was updated, re-read the relevant section." ' +
      'The contract is what gets read, not the message.',
  },

  // §1.5.1 madde 2'nin kancadan görülebilen yarısı. Liste vardı, bakma anı yoktu ve
  // tetikleyici beş tur boyunca hiç ateşlenmedi.
  gorusHatirlat: {
    tr: (liste) =>
      'Şu sözleşme(ler) dördüncü tura girdi ve denetimi hâlâ geçmedi: ' +
      liste +
      '. relay `references/plan-akisi.md` §1.5.1 madde 2 tetiklendi — brifing yazmadan önce `advisor` aç. ' +
      'Açmamayı seçersen gerekçeni sözleşmeye yaz.',
    en: (liste) =>
      'These contracts entered a fourth round and still have not passed audit: ' +
      liste +
      '. relay `references/plan-akisi.md` §1.5.1 item 2 fired — open `advisor` before writing the briefing. ' +
      'If you choose not to, write the reason into the contract.',
  },

  acikGunluk: {
    tr: (n) =>
      n + ' açık hata günlüğü var — `/log` ile bak, çözüp `/log kapat` ya da `/log arsivle` de',
    en: (n) =>
      n +
      ' open bug log(s) — read them with `/log`, then close with `/log kapat` or `/log arsivle`',
  },

  puslaAkisi: {
    tr: (yol) =>
      'Kullanıcı "puşla" dedi ve bu makinede özel dosya aynası kurulu. `/pusla` akışını ' +
      'çalıştır: önce testler (kaldıysa dur, gönderme), sonra genel depoya commit ve push, ' +
      'sonra koşulsuz olarak `node "' +
      yol +
      '" pusla`. Özel adım sorulmaz ve atlanmaz; değişiklik yoksa betik zaten "ayna güncel" ' +
      'der. Raporun sonunda iki depoya ne gittiğini tek satırda söyle.',
    en: (yol) =>
      'The user said "puşla" and a private file mirror is set up on this machine. Run the ' +
      '`/pusla` flow: tests first (stop if they fail), then commit and push the public repo, ' +
      'then unconditionally `node "' +
      yol +
      '" pusla`. The private step is never skipped or asked about; with no changes the ' +
      'script just says the mirror is current. Report what went to each repo in one line.',
  },

  ajanSessiz: {
    tr: (rol, kim, dk, eylem) =>
      '`Teknesyum ▸ Sağlık ▸ ' +
      rol +
      ' ajanı ' +
      dk +
      ' dakikadır sessiz — ' +
      kim +
      ', son eylemi ' +
      eylem +
      '; ana oturum TaskStop ile durdurabilir`',
    en: (rol, kim, dk, eylem) =>
      '`Teknesyum ▸ Health ▸ the ' +
      rol +
      ' agent has been silent for ' +
      dk +
      ' minutes — ' +
      kim +
      ', last action ' +
      eylem +
      '; the main session can stop it with TaskStop`',
  },
  ajanDongu: {
    tr: (rol, kim, n, eylem) =>
      '`Teknesyum ▸ Sağlık ▸ ' +
      rol +
      ' ajanı döngüde — ' +
      kim +
      ', ' +
      eylem +
      ' eylemini ' +
      n +
      ' kez üst üste yaptı; ana oturum TaskStop ile durdurabilir`',
    en: (rol, kim, n, eylem) =>
      '`Teknesyum ▸ Health ▸ the ' +
      rol +
      ' agent is looping — ' +
      kim +
      ', it repeated ' +
      eylem +
      ' ' +
      n +
      ' times in a row; the main session can stop it with TaskStop`',
  },

  debugOlay: {
    tr: (ne, nerede) => '`Teknesyum ▸ Debug ▸ ' + ne + ' — ' + nerede + '`',
    en: (ne, nerede) => '`Teknesyum ▸ Debug ▸ ' + ne + ' — ' + nerede + '`',
  },
  debugNerede: {
    tr: (rol, kim) => (kim === 'ana oturum' ? 'ana oturum' : rol + ' ajanı · ' + kim),
    en: (rol, kim) =>
      kim === 'ana oturum' ? 'the main session' : 'the ' + rol + ' agent · ' + kim,
  },
  debugAracHatasi: {
    tr: (arac) => arac + ' aracı hata verdi',
    en: (arac) => 'the ' + arac + ' tool failed',
  },
  debugKesinti: {
    tr: (arac) => arac + ' aracı kesildi',
    en: (arac) => 'the ' + arac + ' tool was interrupted',
  },
  debugAjanDurdu: { tr: 'bir ajan durdu', en: 'an agent stopped' },

  roleSozlesmeYok: { tr: 'röle kurulu · sözleşme yok', en: 'relay ready · no contracts' },
  roleDurum: {
    tr: (biten, toplam, acik) =>
      'röle kurulu · sözleşme ' +
      biten +
      '/' +
      toplam +
      ' bitti' +
      (acik ? ' · ' + acik + ' açık · kaldığım yerden sürdürüyorum' : ''),
    en: (biten, toplam, acik) =>
      'relay ready · contracts ' +
      biten +
      '/' +
      toplam +
      ' done' +
      (acik ? ' · ' + acik + ' open · resuming where I left off' : ''),
  },
  worktreeBirikim: {
    tr: (n) => n + ' ajan worktree’si duruyor · iş bittiyse `git worktree remove` ile temizle',
    en: (n) => n + ' agent worktrees left behind · clear them with `git worktree remove`',
  },
  guncellemeVar: {
    tr: (yeni, simdi) =>
      'Güncelleme ▸ ' + yeni + ' çıktı, kurulu sürüm ' + simdi + ' — /update --guncelle',
    en: (yeni, simdi) =>
      'Update ▸ ' + yeni + ' is out, installed version is ' + simdi + ' — /update --guncelle',
  },
  depoGeride: {
    tr: () => 'depo uzaktan geride — önce `git pull`, sonra iş',
    en: () => 'repo is behind the remote — `git pull` first, then work',
  },

  premiumNotu: { tr: PREMIUM_NOTU, en: PREMIUM_NOTU },
  ecoNotu: {
    tr: ECO_NOTU,
    en: ECO_NOTU,
  },
  dugmeSapma: {
    tr: (satir) => 'Tabandan sapan düğmeler: ' + satir,
    en: (satir) => 'Buttons deviating from the baseline: ' + satir,
  },
  dilTalimati: {
    tr: 'Write to the user and to other agents in Turkish — contracts, packets and reports included.',
    en: 'Write to the user and to other agents in English — contracts, packets and reports included.',
  },
  rotaEslesme: {
    tr: (id) => 'Owns eşleşmesi · ' + id + ' sürdürülür.',
    en: (id) => 'Ownership match · continue ' + id + '.',
  },
  rotaCakisma: {
    tr: (ids) => 'Sahiplik çakışması · ' + ids + ' aynı dosyayı sahipleniyor; T0 kararı gerekir.',
    en: (ids) => 'Ownership conflict · ' + ids + ' claim the same file; T0 must decide.',
  },
  rotaYeni: {
    tr: 'Yeni iş öncelikli · ilgisiz açık sözleşme kilitlemez; yeni sözleşme veya ajan açılır.',
    en: 'New work comes first · an unrelated open contract does not block it; open a new contract or agent.',
  },

  donusEksik: {
    tr:
      'Teknesyum: açık bir paket/sözleşme varken işi bitirdiğini söyleyip dönüş bloğu ' +
      'vermeden kapanma (multi-session.md §5.1). Cevabını yeniden yazma — basılmış mesaj ' +
      'geri alınamaz, tekrarı kullanıcı görür. Yalnız dönüş bloğunu ayrı ve kısa bir mesaj ' +
      'olarak bas: kopyalanabilir tek blok, en fazla 5 satır — birinci satır ' +
      '<paket/sözleşme> + durum, ikinci satır "Rapor: <dosya yolu>", varsa üçüncü satır ' +
      'tek açık soru. Rapor gövdesini sohbete değil dosyaya yaz. Beş satır tavanı yalnız ' +
      'bloğun kendisi içindir: blok **Senden istediklerim** başlığının yerine geçmez. ' +
      'Kullanıcıdan karar ya da aksiyon bekliyorsan bloğu bas, hemen ardından başlığı aç ' +
      've numaralı maddelerde tam kopyalanabilir metni ver.',
    en:
      'Teknesyum: with an open packet/contract you do not get to declare the work finished ' +
      'and close without a return block (multi-session.md §5.1). Do not rewrite your answer ' +
      '— a printed message cannot be taken back and the user sees the duplicate. Print only ' +
      'the return block as a separate, short message: one copyable block of at most 5 lines ' +
      '— first line <packet/contract> + status, second line "Report: <file path>", third ' +
      'line one open question if there is one. The report body goes in a file, not the chat. ' +
      'The five-line ceiling covers the block alone: it does not stand in for the **What I ' +
      'need from you** heading. If you are waiting on a decision or an action, print the ' +
      'block, then open the heading and give the exact text to copy in numbered items.',
  },
  paketSohbete: {
    tr:
      'Teknesyum: görev paketini sohbete basma. Paket dosyaya yazılır, ' +
      'kullanıcıya tek satır verilir (multi-session.md §5). Paketi ' +
      '`.claude/relay/G<n>.md` altına yaz, sonra sadece şunu bas: ' +
      '"`.claude/relay/G<n>.md` oku ve içindeki görevi eksiksiz uygula." Paketi ' +
      'çalıştıracak taraf dosyayı kendi okur; kullanıcının 120 satır kopyalaması gerekmez.',
    en:
      'Teknesyum: do not print the task packet into the chat. The packet goes in a file and ' +
      'the user gets one line (multi-session.md §5). Write it to `.claude/relay/G<n>.md`, ' +
      'then print only: "Read `.claude/relay/G<n>.md` and carry out the task in full." The ' +
      'side running the packet reads the file itself; nobody copies 120 lines by hand.',
  },
  raporSohbete: {
    tr:
      'Teknesyum: raporu sohbete basma. Rapor dosyaya yazılır, kullanıcıya ' +
      'en fazla 5 satır verilir (multi-session.md §5.1). Gövdeyi paketin ' +
      '`## Rapor` bölümüne ya da `docs/` altında bir dosyaya yaz, sonra şunu bas: ' +
      '"<paket> teslim edildi. Rapor: <dosya yolu>." Karşı taraf dosyayı kendi okur.',
    en:
      'Teknesyum: do not print the report into the chat. The report goes in a file and the ' +
      'user gets at most 5 lines (multi-session.md §5.1). Put the body in the packet’s ' +
      '`## Report` section or a file under `docs/`, then print: "<packet> delivered. ' +
      'Report: <file path>." The other side reads the file itself.',
  },
  kopyaIsteme: {
    tr:
      'Teknesyum: kullanıcıdan uzun bir bloğu kopyalamasını isteme ' +
      '(multi-session.md §5). Kopyalanabilir metin birkaç satırdır; gövde dosyada ' +
      'durur ve karşı taraf dosyayı kendi okur. Bloğu bir dosyaya yaz, sohbete ' +
      'yalnızca "<dosya yolu> oku ve uygula" satırını bas.',
    en:
      'Teknesyum: do not ask the user to copy a long block (multi-session.md §5). Copyable ' +
      'text is a few lines; the body lives in a file and the other side reads it. Write the ' +
      'block to a file and print only "Read <file path> and apply it."',
  },
  sozdizimBozuk: {
    tr: (f, hata) =>
      'Az önce yazdığın dosya ayrıştırılamıyor: ' +
      f +
      '\n' +
      hata +
      '\nÖnce bunu düzelt, başka işe geçme.',
    en: (f, hata) =>
      'The file you just wrote does not parse: ' +
      f +
      '\n' +
      hata +
      '\nFix this before anything else.',
  },

  sikismaAcik: {
    tr: (liste) =>
      'Açık sözleşme: ' +
      liste +
      ' (.claude/relay/contracts/). Durumlarını dosyadan oku, hatırladığını varsayma.',
    en: (liste) =>
      'Open contracts: ' +
      liste +
      ' (.claude/relay/contracts/). Read their status from the files; do not trust memory.',
  },
  sikismaRota: {
    tr: (f, yer) => 'Rota: docs/' + f + (yer ? ' — kaldığın yer:' + yer : ''),
    en: (f, yer) => 'Route: docs/' + f + (yer ? ' — you stopped at:' + yer : ''),
  },
  sikismaAjan: {
    tr: (liste) => 'Bitmemiş ajan: ' + liste + '. /update ile durumlarını doğrula.',
    en: (liste) => 'Unfinished agents: ' + liste + '. Verify them with /update.',
  },

  gerileme: {
    tr: (eski, yeni) => [
      'Sözleşme durumu geriye alınamaz: ' + eski + ' -> ' + yeni + '.',
      'Merdiven tek yönlü: open -> active -> submitted -> done. Tıkandıysan status: blocked yaz,',
      'gerekçeyi sözleşmeye işle. Turu sıfırlamak denetim sırasını da sıfırlar.',
    ],
    en: (eski, yeni) => [
      'A contract status cannot move backwards: ' + eski + ' -> ' + yeni + '.',
      'The ladder is one-way: open -> active -> submitted -> done. If you are stuck write',
      'status: blocked and record why. Resetting the round resets the audit queue too.',
    ],
  },
  onArastirma: {
    tr: () => [
      'Sıfırdan projede ilk sözleşmeden önce ön araştırma yapılır (relay SKILL 1.4).',
      'Aynı problemi çözmüş en az ' + depoSayisi() + ' depoyu `scout` ajanlarına dağıt, her biri',
      '`docs/taramalar/<ad>.md` yazsın, sonra `docs/taramalar/RAPOR.md` ile birleştir.',
      'Araştırma istenmiyorsa gerekçesini `docs/taramalar/ATLANDI.md` dosyasına tek satır',
      'yaz — kapı o zaman açılır. Atlamak serbest, sessizce atlamak değil.',
    ],
    en: () => [
      'A from-scratch project gets prior art before its first contract (relay SKILL 1.4).',
      'Split at least ' +
        depoSayisi() +
        ' repositories solving the same problem across `scout` agents; each',
      'writes `docs/taramalar/<name>.md`, then merge them into `docs/taramalar/RAPOR.md`.',
      'If you do not want the research, write one line of reasoning in',
      '`docs/taramalar/ATLANDI.md` — that opens the gate. Skipping is fine, skipping silently is not.',
    ],
  },
  doneSaltOkunur: {
    tr: () => [
      'contracts/done/ denetimden geçmiş sözleşmeler içindir, salt okunur.',
      'Mühür dört alan ister: audit: passed · auditor_id · diff · verification.',
      'Sözleşme yeniden açılacaksa T0 dosyayı contracts/ altına geri taşır ve status: open yapar.',
    ],
    en: () => [
      'contracts/done/ holds audited contracts and is read-only.',
      'The seal needs four fields: audit: passed · auditor_id · diff · verification.',
      'To reopen a contract, T0 moves the file back under contracts/ and sets status: open.',
    ],
  },
  doneKabuk: {
    tr: () => [
      'contracts/done/ altına kabuktan yazma engellendi.',
      'Sözleşme oraya ancak denetçi GEÇTİ verdikten ve T0 dört alanlı mührü — audit: passed ·',
      'auditor_id · diff · verification — işledikten sonra taşınır. Denetim atlanamaz.',
    ],
    en: () => [
      'Writing into contracts/done/ from the shell is blocked.',
      'A contract moves there only after the auditor passes it and T0 stamps the four-field',
      'seal — audit: passed · auditor_id · diff · verification. The audit cannot be skipped.',
    ],
  },
  doneCanonical: {
    tr: () => [
      '',
      'Tamamlamanın tek meşru yolu:',
      '    node teknesyum/scripts/contract.js complete --id <ID>',
      'Komut denetim kaydını doğrular, dosyayı atomik taşır ve deftere yazar.',
    ],
    en: () => [
      '',
      'The only legitimate way to complete a contract:',
      '    node teknesyum/scripts/contract.js complete --id <ID>',
      'It verifies the audit record, moves the file atomically and writes the ledger line.',
    ],
  },
  doneDefterDisi: {
    tr: (liste) => [
      'done/ altında deftere işlenmemiş sözleşme var: ' + liste.join(', '),
      'Bunlar canonical komuttan geçmeden taşınmış. `node teknesyum/scripts/contract.js audit`',
      'ile bak; meşru değilse sözleşmeyi contracts/ altına geri al.',
    ],
    en: (liste) => [
      'Contracts under done/ with no ledger line: ' + liste.join(', '),
      'They were moved without the canonical command. Run `node teknesyum/scripts/contract.js',
      'audit`; if the move was not legitimate, put the contract back under contracts/.',
    ],
  },

  onArastirmaHatirlatma: {
    tr: () =>
      'Sıfırdan iş görünüyor. Plan yazmadan önce ön araştırma yapılır (relay `references/plan-akisi.md` §1.4): aynı ' +
      'problemi çözmüş en az ' +
      depoSayisi() +
      ' depoyu `scout` ajanlarına dağıt, `docs/taramalar/` altına ' +
      'yazsınlar. Kullanıcı "sadece fikir/plan" dese de kapı bu — plan araştırmanın ' +
      'çıktısıdır. Atlanacaksa gerekçeyi `docs/taramalar/ATLANDI.md` dosyasına tek satır yaz.' +
      (premium()
        ? ' Araştırma bitince plan konseyini aç (relay `references/plan-akisi.md` §1.5): aynı brifingle iki `planner` ' +
          'ajanı, biri `fable` biri `opus`. İkisi de iş yapmaz, öneri döner; sentezi ve ' +
          '`PLAN.md` kalemini sen tutarsın.'
        : ''),
    en: () =>
      'This looks like from-scratch work. Prior art comes before the plan (relay `references/plan-akisi.md` §1.4): split ' +
      'at least ' +
      depoSayisi() +
      ' repositories solving the same problem across `scout` agents and have them ' +
      'write into `docs/taramalar/`. This holds even when the user asks for "just an idea or ' +
      'plan" — the plan is the output of the research. To skip it, write one line of reasoning ' +
      'into `docs/taramalar/ATLANDI.md`.' +
      (premium()
        ? ' When the research is done, open the plan council (relay `references/plan-akisi.md` §1.5): two `planner` agents ' +
          'on the same briefing, one `fable` and one `opus`. Neither does the work, they return ' +
          'proposals; the synthesis and the `PLAN.md` pen stay with you.'
        : ''),
  },

  sendenEksik: {
    tr:
      'Teknesyum: kullanıcıdan bir şey bekliyorsun ama **Senden istediklerim** başlığı yok. ' +
      'Cevabını yeniden yazma — basılmış mesaj geri alınamaz, tekrarı kullanıcı görür. ' +
      'Yalnız eksik parçayı ayrı ve kısa bir mesaj olarak bas: **Senden istediklerim** ' +
      'başlığı ve numaralı maddelerde tam kopyalanabilir metin — komut, dosya yolu, ' +
      'yazılacak cümle. Gerekçe yazma; nedenini değil ne yapacağını söyle. Hiçbir şey ' +
      'beklemiyorsan başlığı hiç açma ve beklemediğini de duyurma.',
    en:
      'Teknesyum: you are waiting on the user but there is no **What I need from you** ' +
      'section. Do not rewrite your answer — a printed message cannot be taken back and the ' +
      'user sees the duplicate. Print only the missing piece as a separate, short message: ' +
      'the **What I need from you** heading and the exact text to copy in numbered items — ' +
      'command, file path, sentence to write. No rationale; say what to do, not why. If you ' +
      'expect nothing, do not open the heading and do not announce that either.',
  },

  kayitBayat: {
    tr: [
      'Düzeltme turuna girmeden önce kayıt noktasını güncelle.',
      'Kayıt noktası hâlâ "tamamlandı" diyor; oturum kesilirse kurtarma sözleşmeyi bitmiş',
      'sanar ve kalan maddeler kaybolur. Turun kaçıncı olduğunu, hangi maddelerin açık',
      'kaldığını yaz, sonra `status: active` yap.',
    ],
    en: [
      'Refresh the checkpoint before you enter a fix round.',
      'The checkpoint still says the work is finished; if the session drops, recovery will',
      'treat the contract as done and the remaining items are lost. Write which round this',
      'is and which items are still open, then set `status: active`.',
    ],
  },

  basamakAtlama: {
    tr: (yeni) => [
      'Sözleşme `open` durumundan doğrudan `' + yeni + '` yapılamaz.',
      'Önce `status: active` yaz, sonra çalış. Basamak atlanırsa sözleşme "kimse üzerinde',
      'çalışmıyor" görünür; ajan düşerse kurtarma yarım işi bulamaz.',
    ],
    en: (yeni) => [
      'A contract cannot jump from `open` straight to `' + yeni + '`.',
      'Write `status: active` first, then do the work. Skipping the step makes the contract',
      'look unclaimed; if the agent drops, recovery cannot find the half-finished work.',
    ],
  },

  yonlendiriciDosya: {
    tr: [
      'Yönlendirici dosya `AGENTS.md` adını taşır, `CLAUDE.md` değil — projeyi yalnız',
      'Claude Code okumuyor. Bilgiyi `AGENTS.md` dosyasına yaz; Claude Code için yanına',
      'tek satırlık `CLAUDE.md` koy, içinde yalnız `@AGENTS.md` olsun.',
    ],
    en: [
      'The pointer file is called `AGENTS.md`, not `CLAUDE.md` — Claude Code is not the',
      'only tool reading this project. Put the content in `AGENTS.md` and leave a one-line',
      '`CLAUDE.md` next to it containing only `@AGENTS.md`.',
    ],
  },
  sorunBirikim: {
    tr: (n, yol) =>
      n +
      ' ajan sorunu kayıtlı · `' +
      (yol || 'live/_sorun.log') +
      '` dosyasını aç, sebebi gör, sessiz geçme',
    en: (n, yol) =>
      n +
      ' agent problems recorded · open `' +
      (yol || 'live/_sorun.log') +
      '`, read why, do not skip it',
  },

  aynaBos: {
    tr: (ad) =>
      'özel ayna kurulu (`' +
      ad +
      '`) ama kayıtlı dosya yok · dokunulmaz dosyalar yedeksiz — `node teknesyum/scripts/ozel.js ekle <yol>`',
    en: (ad) =>
      'private mirror is set up (`' +
      ad +
      '`) but holds no files · untouchable files are unbacked — `node teknesyum/scripts/ozel.js ekle <path>`',
  },

  dakikaOnce: { tr: (n) => n + ' dakika önce', en: (n) => n + ' minutes ago' },
  saatOnce: { tr: (n) => n + ' saat önce', en: (n) => n + ' hours ago' },
  oncekiOturumVar: {
    tr: (ne) =>
      'önceki oturum ' +
      ne +
      ' · kaydı yoksa bile devralınır: `/load son` ile transkriptten okurum',
    en: (ne) =>
      'previous session ' +
      ne +
      ' · it is picked up even without a record: `/load son` reads it from the transcript',
  },
  kapsayiciAcilis: {
    tr: (ad) =>
      'oturum `' +
      ad +
      '` üst klasöründe açıldı · hangi projede çalıştığını izliyorum, ajan hafızası tur sonunda o projeye taşınıyor',
    en: (ad) =>
      'session opened in the `' +
      ad +
      '` parent folder · I track which project you are in and move agent memory there at the end of each turn',
  },
  rcKuruluyor: {
    tr: 'Claude terminal istemcisi kurulu değil, kuruyorum.',
    en: 'The Claude terminal client is not installed; installing it now.',
  },
  rcIstemciYok: {
    tr: (komut) => [
      'Uzak denetim terminal istemcisiyle açılıyor, o da kurulu değil.',
      '`/rc kur` dersen kurulumu ben yaparım. Kendin kurmak istersen tek satır:',
      '',
      '    ' + komut,
    ],
    en: (komut) => [
      'Remote control runs through the terminal client, which is not installed.',
      'Say `/rc kur` and I will install it. To do it yourself, one line:',
      '',
      '    ' + komut,
    ],
  },
  rcSurumEski: {
    tr: (en) =>
      'Terminal istemcisi eski · uzak denetim için en az ' +
      en +
      ' gerekiyor. `claude update` çalıştır.',
    en: (en) =>
      'The terminal client is old · remote control needs at least ' + en + '. Run `claude update`.',
  },
  rcAcildi: {
    tr: (ad, kayit) =>
      [
        'Uzak denetim açıldı · oturum adı **' + ad + '**',
        '',
        'Telefonda: Claude uygulaması → alttaki **Code** sekmesi → **' + ad + '**.',
        'Yeşil nokta bu makinenin açık olduğunu gösterir. Açılan terminal penceresinde',
        'boşluk tuşuna basarsan karekod çıkar, okutunca doğrudan o oturuma girersin.',
      ].concat(
        kayit
          ? [
              '',
              'Bu sohbet `' + kayit + '` adıyla kaydedildi. Telefondaki oturuma şunu yaz,',
              'kaldığımız yerden devam eder:',
              '',
              '    /load ' + kayit,
            ]
          : []
      ),
    en: (ad, kayit) =>
      [
        'Remote control is up · session name **' + ad + '**',
        '',
        'On your phone: Claude app → **Code** tab → **' + ad + '**.',
        'The green dot means this machine is online. Press the space bar in the terminal',
        'window that opened to show a QR code you can scan straight into the session.',
      ].concat(
        kayit
          ? [
              '',
              'This chat was saved as `' + kayit + '`. Type this in the phone session to',
              'pick up where we left off:',
              '',
              '    /load ' + kayit,
            ]
          : []
      ),
  },
  rcAdKotu: {
    tr: (ad) => [
      'Oturum adı kabul edilmedi: ' + JSON.stringify(ad),
      '',
      'Ad harf ya da rakamla başlamalı; harf, rakam, boşluk, nokta, alt çizgi ve tire ' +
        'içerebilir; en çok 64 karakter.',
      'Kabuk için özel karakterler adda geçemez — komut satırında çalışırlar.',
    ],
    en: (ad) => [
      'Session name rejected: ' + JSON.stringify(ad),
      '',
      'A name starts with a letter or digit and may contain letters, digits, spaces, ' +
        'dots, underscores and hyphens; 64 characters at most.',
      'Shell metacharacters are not allowed in a name — they execute on a command line.',
    ],
  },

  rcElle: {
    tr: (komut, ad) => [
      'Uzak denetimi açmak için bir terminal penceresinde şunu çalıştır:',
      '',
      '    ' + komut,
      '',
      'Sonra telefonda Claude uygulaması → **Code** sekmesi → **' + ad + '**.',
    ],
    en: (komut, ad) => [
      'Run this in a terminal window to bring remote control up:',
      '',
      '    ' + komut,
      '',
      'Then on your phone: Claude app → **Code** tab → **' + ad + '**.',
    ],
  },
  rcAcilamadi: {
    tr: (komut, ad) => [
      'Terminal penceresini açamadım. Şunu bir terminale yapıştır:',
      '',
      '    ' + komut,
      '',
      'Pencere açık kaldığı sürece telefondan **' + ad + '** oturumuna bağlanabilirsin.',
    ],
    en: (komut, ad) => [
      'I could not open a terminal window. Paste this into one:',
      '',
      '    ' + komut,
      '',
      'While that window stays open, the **' + ad + '** session is reachable from your phone.',
    ],
  },

  rcSorularAcik: {
    tr: [
      '',
      'Gelişmiş kip: pencere soruları geri açıldı, seçimleri orada yapacaksın.',
      'Sorusuz açılış için `/rc` yeter.',
    ],
    en: [
      '',
      'Advanced mode: the window will ask its own questions again; answer them there.',
      'Plain `/rc` opens without any.',
    ],
  },
  rcHepsiYok: {
    tr: (dip) => '`' + dip + '` altında uzak denetime açılacak proje bulamadım.',
    en: (dip) => 'No project to put on remote control under `' + dip + '`.',
  },
  rcHepsiOzet: {
    tr: (acilan, elenen, kalan, artan) =>
      (acilan.length
        ? [acilan.length + ' proje uzak denetime açıldı:', '', '    ' + acilan.join(' · ')]
        : ['Uzak denetime açılacak projeler:']
      ).concat(
        elenen.length ? ['', 'Dışarıda kalan klasörler: ' + elenen.join(' · ')] : [],
        artan > 0 ? ['', artan + ' proje tavanın dışında kaldı · `/rc --hepsi tavan 30`'] : [],
        kalan.length
          ? ['', 'Bunlar için pencere açılmadı, komutu sen çalıştıracaksın:', ''].concat(
              kalan.map((x) => '    ' + x)
            )
          : [],
        ['', 'Telefonda: Claude uygulaması → **Code** sekmesi → proje adı.']
      ),
    en: (acilan, elenen, kalan, artan) =>
      (acilan.length
        ? [acilan.length + ' projects are on remote control:', '', '    ' + acilan.join(' · ')]
        : ['Projects to put on remote control:']
      ).concat(
        elenen.length ? ['', 'Folders left out: ' + elenen.join(' · ')] : [],
        artan > 0 ? ['', artan + ' projects hit the cap · `/rc --hepsi tavan 30`'] : [],
        kalan.length
          ? ['', 'No window opened for these — run the command yourself:', ''].concat(
              kalan.map((x) => '    ' + x)
            )
          : [],
        ['', 'On your phone: Claude app → **Code** tab → project name.']
      ),
  },

  uiPalet: {
    tr: 'Rengi palet tokeniyle değiştir — ara ton yok (teknesyum-ui §2).',
    en: 'Replace the colour with a palette token — no in-between tones (teknesyum-ui §2).',
  },
  uiZemin: {
    tr: 'Zemin beyaz olamaz; bg (#000000) veya surface (#0a0a0c) ver.',
    en: 'A white ground is not allowed; use bg (#000000) or surface (#0a0a0c).',
  },
  uiBuyukHarf: {
    tr: 'Görünen metin ilki büyük gerisi küçük yazılır; UPPERCASE ve Title Case yok.',
    en: 'Visible text is sentence case; UPPERCASE and Title Case are not used.',
  },
  uiHareket: {
    tr: 'Yerleşim özelliği animasyonlanmaz; opacity veya transform kullan.',
    en: 'Layout properties are not animated; use opacity or transform.',
  },
  eforIzole: {
    tr: 'efor: taban — oturuma izole değil, ajan dosyasından gelir',
    en: 'effort: baseline — not isolated per session, it comes from the agent file',
  },
  uiPunto: {
    tr: 'Punto ölçeği 10 · 13 · 14 · 18 · 24; daha küçüğü okunmuyor demektir.',
    en: 'The type scale is 10 · 13 · 14 · 18 · 24; smaller than that is unreadable.',
  },
  ekranSurucu: {
    tr: [
      'Ekran kapısı kapalı: bu çağrı gerçek fareyi ve klavyeyi sürüyor.',
      "Windows'ta tek girdi masaüstü var; tıkladığın anda kullanıcının yazdığı",
      'cümlenin ortasında odak gider.',
      'Ne yapmak istediğini tek satırla yaz, işi bırak, sıradaki maddeye geç.',
      'İstek kuyruğa alındı; kullanıcı `/ekran` dediğinde kapı bir tur açılır.',
    ].join('\n'),
    en: [
      'The screen gate is closed: this call drives the real mouse and keyboard.',
      'Windows has a single input desktop; the moment you click, the user loses focus',
      'in the middle of the sentence they are typing.',
      'Write one line saying what you wanted to do, drop it, move to the next item.',
      'The request is queued; the gate opens for one turn when the user says `/ekran`.',
    ].join('\n'),
  },
  ekranArayuz: {
    tr: [
      'Ekran kapısı kapalı: bu komut masaüstü penceresi açıyor ve odağı çalıyor.',
      'Arayüzü görmek için program açma — sırayla şunları dene:',
      '1. Başsız koşu: projede zaten test altyapısı var, doğrulamayı oradan yap',
      '   (`dotnet test`, `npm test`, headless tarayıcı). Bu komutlar hiç engellenmez.',
      '2. Kontrolün gerçekten çalıştığını UIA/FlaUI ile sına — `Invoke`, `SetValue`,',
      '   `Toggle` imleci kıpırdatmadan sürer.',
      '3. Pencere şart ise test kipinde ekran dışında aç: `WindowStartupLocation=Manual`,',
      '   `Left=-32000`, `ShowActivated=false`. Pencere var, görünmüyor, odağı almıyor.',
      '4. Hiçbiri olmuyorsa kullanıcıdan `/ekran` iste ve bekle.',
      'Ayrıntı: `docs/masaustu-izolasyon.md` §3.1.',
    ].join('\n'),
    en: [
      'The screen gate is closed: this command opens a desktop window and steals focus.',
      'Do not launch the app to look at the UI — try these in order:',
      '1. Headless run: the project already has a test harness, verify there',
      '   (`dotnet test`, `npm test`, headless browser). Those are never blocked.',
      '2. Prove the control actually works with UIA/FlaUI — `Invoke`, `SetValue`,',
      '   `Toggle` drive it without moving the cursor.',
      '3. If a window is required, open it off-screen in test mode:',
      '   `WindowStartupLocation=Manual`, `Left=-32000`, `ShowActivated=false`.',
      '   The window exists, is invisible, and never takes focus.',
      '4. If none of that works, ask the user for `/ekran` and wait.',
      'Details: `docs/masaustu-izolasyon.md` §3.1.',
    ].join('\n'),
  },
  ekranIstek: {
    tr: (ne) => 'ekranı isteyen bir iş var (' + ne + ') — hazır olunca `/ekran`',
    en: (ne) => 'a task is asking for the screen (' + ne + ') — say `/ekran` when ready',
  },
  ekranAcikTur: {
    tr: 'Ekran kapısı bir tur açıldı; tur bitince kendiliğinden kapanır.',
    en: 'The screen gate is open for one turn; it closes by itself when the turn ends.',
  },
  ekranAcikSure: {
    tr: (n) => 'Ekran kapısı ' + n + ' dakika açık; süre dolunca kendiliğinden kapanır.',
    en: (n) => 'The screen gate is open for ' + n + ' minutes; it closes when time runs out.',
  },
  ekranDamgaYok: {
    tr: [
      'Tur damgası okunamadı, kapı bir tur için açılamaz — kapalı tarafa düşüldü.',
      'Süre vererek aç: `/ekran 10` on dakika açık tutar.',
    ].join('\n'),
    en: [
      'The turn stamp could not be read, so the gate cannot open for one turn.',
      'Open it with a duration instead: `/ekran 10` keeps it open for ten minutes.',
    ].join('\n'),
  },
  ekranBekleyen: {
    tr: (ne) => 'Kuyrukta bekleyen: ' + ne,
    en: (ne) => 'Waiting in the queue: ' + ne,
  },
};

function s(anahtar, ...arg) {
  const g = S[anahtar];
  if (!g) return anahtar;
  const m = g[dil()] !== undefined ? g[dil()] : g.en;
  return typeof m === 'function' ? m(...arg) : m;
}

module.exports = {
  dil,
  s,
  profil,
  premium,
  profilKaynak,
  depoSayisi,
  oturumProfili,
  PROFILLER,
  BAYAT_MS,
  KONSEY,
};
