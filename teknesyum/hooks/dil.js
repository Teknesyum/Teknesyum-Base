const fs = require('fs');
const path = require('path');

// Tek dil ayarı: `~/.claude/teknesyum.json` → `dil`. Geçerli değerler `en` ve `tr`,
// varsayılan `en`. Ayar hem kullanıcıya basılan bildirimleri hem ajanlara enjekte edilen
// yönergeleri belirler — ajanlar birbirleriyle de bu dilde konuşur.

let _dil = null;

function dil() {
  if (_dil) return _dil;
  const e = process.env.TEKNESYUM_DIL;
  if (e === 'tr' || e === 'en') return (_dil = e);
  const kok =
    process.env.CLAUDE_CONFIG_DIR ||
    path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude');
  try {
    const c = JSON.parse(fs.readFileSync(path.join(kok, 'teknesyum.json'), 'utf8'));
    if (c.dil === 'tr' || c.dil === 'en') return (_dil = c.dil);
  } catch {}
  return (_dil = 'en');
}

const S = {
  gorev: {
    tr: (rol, model, tanim, n) =>
      'görev veriliyor · ' +
      rol +
      (model ? ' · ' + model : '') +
      (tanim ? ' · ' + tanim : '') +
      (n > 1 ? '   [' + n + ' ajan çalışıyor]' : ''),
    en: (rol, model, tanim, n) =>
      'dispatching · ' +
      rol +
      (model ? ' · ' + model : '') +
      (tanim ? ' · ' + tanim : '') +
      (n > 1 ? '   [' + n + ' agents running]' : ''),
  },
  bitti: {
    tr: (rol, sure) => 'bitti · ' + rol + (sure ? ' · ' + sure : ''),
    en: (rol, sure) => 'done · ' + rol + (sure ? ' · ' + sure : ''),
  },
  sureBelirsiz: { tr: 'süre belirsiz', en: 'duration unknown' },
  saniye: { tr: (n) => n + ' sn', en: (n) => n + ' s' },
  dakika: { tr: (n) => n + ' dk', en: (n) => n + ' min' },

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

  olcu: {
    tr:
      'Teknesyum Base: iş talebiyse relay §1 ile ölç ve ilk satırı **ters tırnak içinde** ' +
      'bas — `Teknesyum ▸ Ölçü ▸ <iş ne kadar> — <ne yaptım>`. Satırın tamamı tek kod ' +
      'parçası olacak, arkası bloklu görünsün; başlık işareti, kalın yazı ya da madde imi ' +
      'ekleme. Etiket büyük harfle başlar, ayraç ▸ işaretidir, kalan cümle sıradan tümce ' +
      'düzenindedir: ilk harf büyük, gerisi küçük. Günlük dille yaz, kısaltma yapma ve ' +
      'cümlenin içinde ok kullanma: ' +
      '`Teknesyum ▸ Ölçü ▸ Tek dosyalık iş — ajan açmadım, kendim yaptım`. Ajan açmasan da ' +
      'yaz. Salt soru/sohbette satırı hiç yazma.',
    en:
      'Teknesyum Base: if this is a work request, size it with relay §1 and print the first ' +
      'line **inside backticks** — `Teknesyum ▸ Size ▸ <how big> — <what I did>`. The whole ' +
      'line is one code span so it reads as a block; no heading marks, bold or bullets. ' +
      'The label is capitalised, the separator is ▸, and the rest is ordinary sentence ' +
      'case: first letter capital, the rest lower. Use plain words, no shorthand, and no ' +
      'arrows inside the sentence: ' +
      '`Teknesyum ▸ Size ▸ One file — no agent needed, I did it myself`. Write it even when ' +
      'no agent is opened. Skip the line entirely for plain questions.',
  },
  premiumAcik: {
    tr: 'premium mod · her ajan opus · 6 paralele kadar',
    en: 'premium mode · every agent on opus · up to 6 in parallel',
  },
  premiumNotu: {
    tr:
      'Premium mod açık (Max 20x). Sonnet ve haiku kullanma; her ajan opus çalışır. ' +
      'Bağımsız sözleşmeleri sıraya dizme, aynı anda yürüt — altı paralel ajana kadar ' +
      'çıkabilirsin, üçü geçtiğinde worktree izolasyonuyla. Delege eşiğini aşağı çek: ' +
      'kararsız kaldığın işi kendin sürüklemek yerine ajana ver. Token tasarrufu bu ' +
      'modda gerekçe değil — dosyayı okumak grepten daha iyi cevap veriyorsa oku, ' +
      'aramayı dar tutma, denetimi her sözleşmede çalıştır. Düşünmeyi işe göre ayarla: ' +
      'mekanik ve kalıbı belli işte uzun uzun düşünme, karar taşıyan veya hata ayıklama ' +
      'işinde dibini sıyır. Deterministik araç hâlâ modelden önce gelir; o tercih ' +
      'tokenden değil doğruluktan.',
    en:
      'Premium mode is on (Max 20x). Do not use sonnet or haiku; every agent runs opus. ' +
      'Do not queue independent contracts, run them at once — up to six agents in ' +
      'parallel, with worktree isolation past three. Lower the delegation threshold: ' +
      'hand out the work you would otherwise drag along yourself. Saving tokens is not a ' +
      'reason here — read the file when reading answers better than grepping, keep the ' +
      'search wide, run the audit on every contract. Match thinking to the work: do not ' +
      'labour over mechanical, pattern-fixed tasks; go all the way down on decisions and ' +
      'debugging. A deterministic tool still comes before a model call — that choice is ' +
      'about correctness, not tokens.',
  },
  dilTalimati: {
    tr: 'Kullanıcıya ve diğer ajanlara Türkçe yaz — sözleşmeler, paketler, raporlar dahil.',
    en: 'Write to the user and to other agents in English — contracts, packets and reports included.',
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
      'Aynı problemi çözmüş en az 10 depoyu `scout` ajanlarına dağıt, her biri',
      '`docs/taramalar/<ad>.md` yazsın, sonra `docs/taramalar/RAPOR.md` ile birleştir.',
      'Araştırma istenmiyorsa gerekçesini `docs/taramalar/ATLANDI.md` dosyasına tek satır',
      'yaz — kapı o zaman açılır. Atlamak serbest, sessizce atlamak değil.',
    ],
    en: () => [
      'A from-scratch project gets prior art before its first contract (relay SKILL 1.4).',
      'Split at least 10 repositories solving the same problem across `scout` agents; each',
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
    tr:
      'Sıfırdan iş görünüyor. Plan yazmadan önce ön araştırma yapılır (relay §1.4): aynı ' +
      'problemi çözmüş en az 10 depoyu `scout` ajanlarına dağıt, `docs/taramalar/` altına ' +
      'yazsınlar. Kullanıcı "sadece fikir/plan" dese de kapı bu — plan araştırmanın ' +
      'çıktısıdır. Atlanacaksa gerekçeyi `docs/taramalar/ATLANDI.md` dosyasına tek satır yaz.',
    en:
      'This looks like from-scratch work. Prior art comes before the plan (relay §1.4): split ' +
      'at least 10 repositories solving the same problem across `scout` agents and have them ' +
      'write into `docs/taramalar/`. This holds even when the user asks for "just an idea or ' +
      'plan" — the plan is the output of the research. To skip it, write one line of reasoning ' +
      'into `docs/taramalar/ATLANDI.md`.',
  },

  sendenEksik: {
    tr:
      'Teknesyum: iş yarıda duruyor ama kullanıcıdan ne istediğin yazmıyor. Mesajın en ' +
      'altına numaralı **Senden istediklerim** bölümü ekle: her madde ne yapılacağını ve ' +
      'kopyalanacak tam metni versin (komut, dosya yolu, yazılacak cümle). Gerekçe yazma. ' +
      'Beklediğin bir şey yoksa duraklamayı da bildirme — iş sürüyor demektir.',
    en:
      'Teknesyum: the work is paused but you never say what you need from the user. Add a ' +
      'numbered **What I need from you** section at the very bottom: each item states the ' +
      'action and the exact text to copy (command, file path, sentence to write). No ' +
      'rationale. If you need nothing, do not announce a pause either.',
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
  uiPunto: {
    tr: 'Punto ölçeği 10 · 13 · 14 · 18 · 24; daha küçüğü okunmuyor demektir.',
    en: 'The type scale is 10 · 13 · 14 · 18 · 24; smaller than that is unreadable.',
  },
};

function s(anahtar, ...arg) {
  const g = S[anahtar];
  if (!g) return anahtar;
  const m = g[dil()] !== undefined ? g[dil()] : g.en;
  return typeof m === 'function' ? m(...arg) : m;
}

module.exports = { dil, s };
