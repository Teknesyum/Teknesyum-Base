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

function depoSayisi(sid) {
  return { eco: 1, normal: 10, premium: 50 }[profil(sid)];
}

const KONSEY = 'fable + opus';
const GORUS = 'fable';

const S = {
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
  turOzeti: {
    tr: (sure, token) => '`Total Süre: ~' + sure + '     Tahmini Token: ~' + token + '`',
    en: (sure, token) => '`Total Time: ~' + sure + '     Estimated Tokens: ~' + token + '`',
  },
  turOzetiYonerge: {
    tr: (satir) =>
      'Turu kapatırken cevabının en altına şu satırı **ters tırnakları dahil** olduğu gibi ' +
      'yaz, tek satır olarak: ' +
      satir,
    en: (satir) =>
      'When you close the turn write this line at the very bottom of your answer, ' +
      'verbatim and on one line: ' +
      satir,
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

  kurulumEksik: {
    tr: 'kurulum eksik · /setup çalıştır, gerekeni sorarım',
    en: 'setup incomplete · run /setup, I will ask for what is missing',
  },
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
      'Güncelleme ▸ ' + yeni + ' çıktı, kurulu sürüm ' + simdi + ' — /update ile güncelle',
    en: (yeni, simdi) =>
      'Update ▸ ' + yeni + ' is out, installed version is ' + simdi + ' — update with /update',
  },

  olcu: {
    tr:
      'Teknesyum Base: iş talebiyse relay §1 ile ölç ve ilk satırı **ters tırnak içinde** ' +
      'bas — `Teknesyum ▸ Ölçüm ▸ <iş ne kadar> — <ne yaptım>`. Satırın tamamı tek kod ' +
      'parçası olacak, arkası bloklu görünsün; başlık işareti, kalın yazı ya da madde imi ' +
      'ekleme. Etiket büyük harfle başlar, ayraç ▸ işaretidir, kalan cümle sıradan tümce ' +
      'düzenindedir: ilk harf büyük, gerisi küçük. Günlük dille yaz, kısaltma yapma ve ' +
      'cümlenin içinde ok kullanma: ' +
      '`Teknesyum ▸ Ölçüm ▸ Tek dosyalık iş — ajan açmadım, kendim yaptım`. Ajan açmasan da ' +
      'yaz. Salt soru/sohbette satırı hiç yazma.',
    en:
      'Teknesyum Base: if this is a work request, size it with relay §1 and print the first ' +
      'line **inside backticks** — `Teknesyum ▸ Measure ▸ <how big> — <what I did>`. The whole ' +
      'line is one code span so it reads as a block; no heading marks, bold or bullets. ' +
      'The label is capitalised, the separator is ▸, and the rest is ordinary sentence ' +
      'case: first letter capital, the rest lower. Use plain words, no shorthand, and no ' +
      'arrows inside the sentence: ' +
      '`Teknesyum ▸ Measure ▸ One file — no agent needed, I did it myself`. Write it even when ' +
      'no agent is opened. Skip the line entirely for plain questions.',
  },
  olcuKisa: {
    tr:
      'Teknesyum Base: iş talebiyse relay §1 ile ölç ve ilk satırı tek kod parçası olarak ' +
      'bas — `Teknesyum ▸ Ölçüm ▸ <iş ne kadar> — <ne yaptım>`. Başlık işareti, kalın yazı ' +
      've madde imi yok. Salt soru/sohbette yazma.',
    en:
      'Teknesyum Base: if this is a work request, size it with relay §1 and print the first ' +
      'line as one code span — `Teknesyum ▸ Measure ▸ <how big> — <what I did>`. No heading ' +
      'marks, bold or bullets. Skip it for plain questions.',
  },
  premiumAcik: {
    tr: () =>
      'premium mod · her ajan opus · 20 paralele kadar · plan konseyi ' +
      KONSEY +
      ' · ikinci görüş ' +
      GORUS,
    en: () =>
      'premium mode · every agent on opus · up to 20 in parallel · plan council ' +
      KONSEY +
      ' · second opinion ' +
      GORUS,
  },
  premiumNotu: {
    tr:
      'Premium mod açık (Max 20x). Sonnet ve haiku kullanma; her ajan opus çalışır. ' +
      'Bağımsız sözleşmeleri sıraya dizme, aynı anda yürüt — yirmi paralel ajana kadar ' +
      'çıkabilirsin, üçü geçtiğinde worktree izolasyonuyla. Paralel açmak bu modda ' +
      'varsayılandır, tek ajanla gitmek gerekçe ister: işi bölebiliyorsan böl, beş on ' +
      'elden hallet, bitince sonraki basamağa geç. Ajan açmak için kullanıcıdan izin ' +
      'bekleme — kararı kendi ölçüne göre sen verirsin, kullanıcı istediğinde zaten ' +
      'açarsın. Tek ajan yalnız iş gerçekten küçükken doğrudur. Token tasarrufu bu ' +
      'modda gerekçe değil — dosyayı okumak grepten daha iyi cevap veriyorsa oku, ' +
      'aramayı dar tutma, denetimi her sözleşmede çalıştır. Düşünmeyi işe göre ayarla: ' +
      'mekanik ve kalıbı belli işte uzun uzun düşünme, karar taşıyan veya hata ayıklama ' +
      'işinde dibini sıyır. Deterministik araç hâlâ modelden önce gelir; o tercih ' +
      'tokenden değil doğruluktan. Plan konseyi açık: sıfırdan projede PLAN.md yazmadan ' +
      'önce aynı brifingle iki planner ajanı aç — biri fable, biri opus. İkisi de iş ' +
      'yapmaz, yalnız öneri döner; ortak çıkan kararı doğrulanmış say, ayrıştıkları yeri ' +
      'PLAN.md içinde Konsey ayrışması başlığına gerekçesiyle yaz. İkinci görüş de açık: ' +
      'doğru kararı bilmediğin düğümde advisor ajanını aç, ' +
      GORUS +
      ' üç başlıkta kısa cevap verir. Geri alınması pahalı seçim, üç turdur çözülmeyen ' +
      'hata, bozulacak kural, iki türlü okunan istek ve kullanıcının plan istediği her ' +
      'sefer için aç; mekanik işte açma ve sorabiliyorsan önce kullanıcıya sor. Plan ' +
      'teyidini konseyle karıştırma: konsey sıfırdan projede PLAN.md için iki üyeyle ' +
      'açılır, teyit kullanıcı plan oluştur dediğinde tek üyeyle alınır. Görüş ' +
      'bağlayıcı değil — katılmazsan ' +
      'gerekçeni yaz, aldığını `Teknesyum ▸ Görüş ▸ …` satırıyla bildir. Ön araştırma ' +
      'tavanı bu modda 50 depodur.',
    en:
      'Premium mode is on (Max 20x). Do not use sonnet or haiku; every agent runs opus. ' +
      'Do not queue independent contracts, run them at once — up to twenty agents in ' +
      'parallel, with worktree isolation past three. Going parallel is the default here ' +
      'and going with a single agent needs a reason: split the work when it can be ' +
      'split, get it done five or ten hands at a time, then move to the next step. Do ' +
      'not wait for the user to authorise opening an agent — the call is yours to make ' +
      'on your own measure, and when the user does ask you open one anyway. A single ' +
      'agent is right only when the job really is small. Saving tokens is not a ' +
      'reason here — read the file when reading answers better than grepping, keep the ' +
      'search wide, run the audit on every contract. Match thinking to the work: do not ' +
      'labour over mechanical, pattern-fixed tasks; go all the way down on decisions and ' +
      'debugging. A deterministic tool still comes before a model call — that choice is ' +
      'about correctness, not tokens. The plan council is on: before writing PLAN.md on a ' +
      'from-scratch project, open two planner agents with the same briefing — one fable, ' +
      'one opus. Neither does the work, they only return proposals; treat what both agree ' +
      'on as confirmed and record every disagreement under a Konsey ayrışması heading in ' +
      'PLAN.md with your reasoning. The second opinion is on as well: at a node where you ' +
      'do not know the right call, open the advisor agent and ' +
      GORUS +
      ' answers short, under three headings. Open it for a choice that is expensive to ' +
      'undo, a bug unsolved for three rounds, a rule you are about to break, a request ' +
      'that reads two ways, and every time the user asks for a plan; not for mechanical ' +
      'work, and ask the user first whenever you are allowed to ask. Do not confuse the ' +
      'plan check with the council: the council opens with two members for PLAN.md on a ' +
      'from-scratch project, the check is one member whenever the user says make a plan. ' +
      'The opinion is not binding — write your reasoning when you ' +
      'disagree, and report that you took one with a `Teknesyum ▸ Opinion ▸ …` line. ' +
      'Prior art in this mode means 50 repositories.',
  },
  ecoNotu: {
    tr:
      'Eco mod açık. Token tasarrufu en yüksek öncelik; hız ve zarafet feda edilebilir, ' +
      'doğruluk edilemez. Önce `Grep`/`Glob` ile ara; tam dosyayı yalnız grep cevap ' +
      'vermediğinde oku, hangi satır aralığının gerektiğini bilmeden açma. `Explore` ajanı ' +
      'açma — bulamazsan aramayı genişlet. Tek ajan varsayılandır, ajan açmak gerekçe ' +
      'ister. Mekanik ve kalıbı belli işte kısa düşün, karar taşıyan işte yine de düşün. ' +
      'Cevabı tek cümle yaz; tablo, madde ve ayrıntı ancak sorulunca gelir. `rg`, `sed`, ' +
      '`biome`, `--check` işi görüyorsa model çağırma.',
    en:
      'Eco mode is on. Saving tokens is the top priority; speed and polish can go, ' +
      'correctness cannot. Search with `Grep`/`Glob` first; read a whole file only when ' +
      'grep does not answer, and never open one without knowing which lines you need. Do ' +
      'not open an `Explore` agent — widen the search instead. A single agent is the ' +
      'default and opening one needs a reason. Think briefly on mechanical, pattern-fixed ' +
      'work, still think on decisions. Answer in one sentence; tables, bullets and detail ' +
      'come only when asked. When `rg`, `sed`, `biome` or `--check` does the job, do not ' +
      'call a model.',
  },
  dilTalimati: {
    tr: 'Kullanıcıya ve diğer ajanlara Türkçe yaz — sözleşmeler, paketler, raporlar dahil.',
    en: 'Write to the user and to other agents in English — contracts, packets and reports included.',
  },
  dilTalimatiKisa: {
    tr: 'Kullanıcıya ve ajanlara Türkçe yaz.',
    en: 'Write to the user and to agents in English.',
  },
  seviye2: {
    tr:
      'Yönlendirme seviyesi 2: base devreye giren her kararı kendi satırında, yine ters ' +
      'tırnak içinde yaz — `Teknesyum ▸ Fark ▸ <ne yaptım> — <base olmasaydı ne olurdu>`. ' +
      'Etiket büyük harfle başlar, ayraç ▸ işaretidir, kalan cümle sıradan tümce düzeninde ' +
      'yazılır. Cümle günlük Türkçe olsun; kısaltma, cümle içi ok ve terim yığını yok. Kural ' +
      'uygulandığında, model yerine deterministik araç seçildiğinde, harita/denetim/araştırma ' +
      'devreye girdiğinde, model yükseltilip düşürüldüğünde, kanca engellediğinde yaz. Sıradan ' +
      'araç çağrısına satır açma; base olmasaydı farklı sonuçlanacak anlara aç.',
    en:
      'Steering level 2: give every decision the base drove its own line, also inside ' +
      'backticks — `Teknesyum ▸ Diff ▸ <what I did> — <what would have happened without it>`. ' +
      'The label is capitalised, the separator is ▸, and the rest is ordinary sentence case. ' +
      'Everyday words only; no arrows inside the sentence, no shorthand, no stacked jargon. Write one when a ' +
      'rule applies, when a deterministic tool replaces a model call, when the ' +
      'map/audit/prior-art gate fires, when a model is escalated or dropped, when a hook ' +
      'blocks something. No line for ordinary tool calls — only where a plain session ' +
      'would have ended up elsewhere.',
  },
  platformNotu: {
    tr:
      'Bu projede platform notu yok. Uygun bir anda tek soru sor — "bu program hangi ' +
      'platformlar için?" — ve cevabı `.claude/teknesyum.json` içine `platformlar` + ' +
      '`platformNeden` olarak yaz. Cevap gelmeden varsayma; yeni projede varsayılan üç platformdur.',
    en:
      'This project has no platform note. At a natural moment ask one question — "which ' +
      'platforms is this program for?" — and record the answer in `.claude/teknesyum.json` ' +
      'as `platformlar` + `platformNeden`. Do not assume before the answer; a new project ' +
      'defaults to all three.',
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
      'vermeden kapanma (multi-session.md §5.1). Mesajın en altına, kopyalanabilir ' +
      'tek blok olarak en fazla 5 satır ekle: birinci satır <paket/sözleşme> + durum, ' +
      'ikinci satır "Rapor: <dosya yolu>", varsa üçüncü satır tek açık soru. Rapor ' +
      'gövdesini sohbete değil dosyaya yaz.',
    en:
      'Teknesyum: with an open packet/contract you do not get to declare the work finished ' +
      'and close without a return block (multi-session.md §5.1). Add one copyable block of ' +
      'at most 5 lines at the very bottom: first line <packet/contract> + status, second ' +
      'line "Report: <file path>", third line one open question if there is one. The report ' +
      'body goes in a file, not in the chat.',
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
    tr: (liste) => 'Bitmemiş ajan: ' + liste + '. /report ile durumlarını doğrula.',
    en: (liste) => 'Unfinished agents: ' + liste + '. Verify them with /report.',
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

  onArastirmaHatirlatma: {
    tr: () =>
      'Sıfırdan iş görünüyor. Plan yazmadan önce ön araştırma yapılır (relay §1.4): aynı ' +
      'problemi çözmüş en az ' +
      depoSayisi() +
      ' depoyu `scout` ajanlarına dağıt, `docs/taramalar/` altına ' +
      'yazsınlar. Kullanıcı "sadece fikir/plan" dese de kapı bu — plan araştırmanın ' +
      'çıktısıdır. Atlanacaksa gerekçeyi `docs/taramalar/ATLANDI.md` dosyasına tek satır yaz.' +
      (premium()
        ? ' Araştırma bitince plan konseyini aç (relay §1.5): aynı brifingle iki `planner` ' +
          'ajanı, biri `fable` biri `opus`. İkisi de iş yapmaz, öneri döner; sentezi ve ' +
          '`PLAN.md` kalemini sen tutarsın.'
        : ''),
    en: () =>
      'This looks like from-scratch work. Prior art comes before the plan (relay §1.4): split ' +
      'at least ' +
      depoSayisi() +
      ' repositories solving the same problem across `scout` agents and have them ' +
      'write into `docs/taramalar/`. This holds even when the user asks for "just an idea or ' +
      'plan" — the plan is the output of the research. To skip it, write one line of reasoning ' +
      'into `docs/taramalar/ATLANDI.md`.' +
      (premium()
        ? ' When the research is done, open the plan council (relay §1.5): two `planner` agents ' +
          'on the same briefing, one `fable` and one `opus`. Neither does the work, they return ' +
          'proposals; the synthesis and the `PLAN.md` pen stay with you.'
        : ''),
  },

  sendenEksik: {
    tr:
      'Teknesyum: kullanıcıdan bir şey bekliyorsun ama **Senden istediklerim** başlığı yok. ' +
      'Kural: kullanıcıdan aksiyon veya karar bekleniyorsa yanıtın sonunda bu başlığı aç ve ' +
      'numaralı maddelerde tam kopyalanabilir metni ver — komut, dosya yolu, yazılacak ' +
      'cümle. Gerekçe yazma; nedenini değil ne yapacağını söyle. Hiçbir şey beklemiyorsan ' +
      'başlığı hiç açma ve beklemediğini de duyurma.',
    en:
      'Teknesyum: you are waiting on the user but there is no **What I need from you** ' +
      'section. The rule: when an action or decision is expected from the user, open that ' +
      'heading at the end and give the exact text to copy in numbered items — command, file ' +
      'path, sentence to write. No rationale; say what to do, not why. If you expect ' +
      'nothing, do not open the heading and do not announce that either.',
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
    tr: (n) =>
      n + ' ajan sorunu kayıtlı · `live/_sorun.log` dosyasını aç, sebebi gör, sessiz geçme',
    en: (n) => n + ' agent problems recorded · open `live/_sorun.log`, read why, do not skip it',
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
  kapsayiciEtkin: {
    tr: (ad, yol) =>
      'Bu oturum projelerin üst klasöründe açıldı; çalışılan proje **' +
      ad +
      '** (`' +
      yol +
      '`). Proje kökü isteyen her şeyi oraya yönlendir — `/save`, `/rc`, harita, röle ' +
      've sözleşmeler `--proje` parametresini bu yolla alır, dosya yollarını da bu ' +
      'kökten kur. Kullanıcıya klasörü değiştirmesini söyleme, iş burada yürür.',
    en: (ad, yol) =>
      'This session was opened in the parent folder of the projects; the project being ' +
      'worked on is **' +
      ad +
      '** (`' +
      yol +
      '`). Point everything that needs a project root there — `/save`, `/rc`, the map, ' +
      'the relay and contracts take `--proje` with this path, and file paths start from ' +
      'this root. Do not ask the user to switch folders; the work runs here.',
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
        artan > 0 ? ['', artan + ' proje tavanın dışında kaldı · `/rcall tavan 30`'] : [],
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
        artan > 0 ? ['', artan + ' projects hit the cap · `/rcall tavan 30`'] : [],
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
  ekranAcik: {
    tr: 'Ekran kapısı şu an açık.',
    en: 'The screen gate is open right now.',
  },
  ekranKapali: {
    tr: 'Ekran kapısı kapalı. `/ekran` bir tur açar, `/ekran 10` on dakika açık tutar.',
    en: 'The screen gate is closed. `/ekran` opens one turn, `/ekran 10` keeps it ten minutes.',
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
  depoSayisi,
  oturumProfili,
  PROFILLER,
  BAYAT_MS,
  KONSEY,
};
