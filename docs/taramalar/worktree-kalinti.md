# Worktree kalıntıları — 2026-08-20 temizliği

31 ajan worktree'si kaldırıldı. Commit edilmemiş içerik burada; çoğu main'e zaten
başka bir commit'le girmiş sürümlerin ara hâlidir. Kaybolan bir şey yoksa bu dosya silinebilir.

## agent-a0a7a6282bd8af047

```diff
diff --git a/teknesyum/commands/setup.md b/teknesyum/commands/setup.md
index dfc79fe..5c293ca 100644
--- a/teknesyum/commands/setup.md
+++ b/teknesyum/commands/setup.md
@@ -17,7 +17,7 @@ gerektireni sor — hepsini tek mesajda, numaralı.
 | Statusline köprüsü | `~/.claude/teknesyum-statusline.js` var mı | kur |
 | settings.json bağı | `statusLine.command` köprüyü gösteriyor mu | bağla |
 | Bayat kopya | `~/.claude/statusline.js` var mı | sil |
-| Çıktı dili | `~/.claude/teknesyum.json` → `dil` | sor, yaz |
+| Output language | `~/.claude/teknesyum.json` → `dil` | ask once, write |
 | Yönlendirme seviyesi | `~/.claude/teknesyum.json` → `steering` | sor, yaz |
 | Arayüz standardı | `~/.claude/teknesyum-ui.json` var mı, `kapali` ne | sor |
 | Debug izi | `~/.claude/teknesyum.json` → `debug` | sorma, kapalı bırak |
diff --git a/teknesyum/hooks/relay-watch.js b/teknesyum/hooks/relay-watch.js
index 7da1d30..c57b761 100644
--- a/teknesyum/hooks/relay-watch.js
+++ b/teknesyum/hooks/relay-watch.js
@@ -75,11 +75,14 @@ function run(j) {
       const rol = String(t.subagent_type || '?').replace(/^teknesyum:/, '');
       const tanim = String(t.description || '').slice(0, 60);
       duyur(
-        'görev veriliyor · ' +
+        tmetin(
+          'görev veriliyor · ',
+          'dispatching task · '
+        ) +
           rol +
           (t.model ? ' · ' + t.model : '') +
           (tanim ? ' · ' + tanim : '') +
-          (n > 1 ? '   [' + n + ' ajan çalışıyor]' : '')
+          (n > 1 ? tmetin('   [' + n + ' ajan çalışıyor]', '   [' + n + ' agents running]') : '')
       );
     }
     return;
@@ -145,7 +148,11 @@ function run(j) {
     case 'SubagentStop': {
       const c = calisanKapat(live, j.agent_type);
       const rol = String((c && c.type) || j.agent_type || 'ajan').replace(/^teknesyum:/, '');
-      duyur('bitti · ' + rol + (c ? ' · ' + (c.ambiguous ? 'süre belirsiz' : gecen(c.start)) : ''));
+      duyur(
+        tmetin('bitti · ', 'finished · ') +
+          rol +
+          (c ? ' · ' + (c.ambiguous ? tmetin('süre belirsiz', 'duration unknown') : gecen(c.start)) : '')
+      );
       // Ölçüldü: bu olayın payload'ında `stop_reason` alanı YOK. Eksikliği ölüm sanma —
       // aksi halde normal biten her ajan statusline'da ⨯ görünür.
       s.stop_reason = j.stop_reason || 'end_turn';
@@ -210,11 +217,12 @@ function sozdizim(j) {
 function bozukMesaj(f, hata) {
   const ilk = hata.split('\n').filter(Boolean).slice(0, 5).join('\n');
   return (
-    'Az önce yazdığın dosya ayrıştırılamıyor: ' +
+    tmetin('Az önce yazdığın dosya ayrıştırılamıyor: ', 'The file you just wrote cannot be parsed: ') +
     f +
     '\n' +
     ilk +
-    '\nÖnce bunu düzelt, başka işe geçme.'
+    '\n' +
+    tmetin('Önce bunu düzelt, başka işe geçme.', 'Fix this before doing anything else.')
   );
 }
 
@@ -300,6 +308,75 @@ function calisanKapat(live, type) {
 // 0 hiç yazma · 1 temel yönlenmeler (varsayılan) · 2 her dokunuş.
 // TEKNESYUM_SESSIZ=1 eski davranış için 0'a eşdeğerdir.
 let _seviye = null;
+let _dil = null;
+
+function dil() {
+  if (_dil !== null) return _dil;
+  const kok =
+    process.env.CLAUDE_CONFIG_DIR ||
+    path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude');
+  const c = read(path.join(kok, 'teknesyum.json'));
+  return (_dil = c && (c.dil === 'tr' || c.dil === 'en') ? c.dil : 'en');
+}
+
+const DIL = [
+  ['Teknesyum Base', 'Teknesyum Base'],
+  ['iş talebiyse', 'for work requests'],
+  ['relay §1 ile ölç', 'measure with relay §1'],
+  ['ilk satır', 'start with'],
+  ['Ajan açmasan da yaz', 'write it even when no agent is needed'],
+  ['Salt soru/sohbette satırı yazma', 'do not write the line for questions or conversation'],
+  ['tek dosya → ajan gerekmedi', 'one file → no agent needed'],
+  ['Yönlendirme seviyesi 2', 'Steering level 2'],
+  ['base devreye giren her kararı ayrı satırda yaz', 'write a separate line for every decision made by the base'],
+  ['Kural uygulandığında', 'when a rule applies'],
+  ['model yerine', 'instead of a model'],
+  ['deterministik araç seçildiğinde', 'when a deterministic tool is selected'],
+  ['harita/denetim/araştırma devreye girdiğinde', 'when mapping, auditing, or research is activated'],
+  ['model yükseltilip düşürüldüğünde', 'when the model is escalated or downgraded'],
+  ['kanca engellediğinde', 'when a hook blocks an action'],
+  ['Sıradan araç çağrısına satır açma', 'do not add a line for ordinary tool calls'],
+  ['base olmasaydı farklı sonuçlanacak anlara aç', 'add one only where the outcome would differ without the base'],
+  ['görev veriliyor', 'dispatching task'],
+  ['ajan çalışıyor', 'agents running'],
+  ['bitti', 'finished'],
+  ['süre belirsiz', 'duration unknown'],
+  ['kurulum eksik · /setup çalıştır, gerekeni sorarım', 'setup incomplete · run /setup and I will ask what is needed'],
+  ['röle kurulu · sözleşme yok', 'relay installed · no contracts'],
+  ['röle kurulu · sözleşme', 'relay installed · contract'],
+  ['açık · kaldığım yerden sürdürüyorum', 'open · resuming where I left off'],
+  ['Açık sözleşme:', 'Open contract:'],
+  ['Durumlarını dosyadan oku, hatırladığını varsayma.', 'Read their status from the files; do not rely on memory.'],
+  ['Rota:', 'Route:'],
+  ['kaldığın yer:', 'current position:'],
+  ['Bitmemiş ajan:', 'Unfinished agent:'],
+  ['/report ile durumlarını doğrula.', 'verify their status with /report.'],
+  ['oturum kapandı:', 'session ended:'],
+  ['bilinmiyor', 'unknown'],
+  ['Az önce yazdığın dosya ayrıştırılamıyor:', 'The file you just wrote cannot be parsed:'],
+  ['Önce bunu düzelt, başka işe geçme.', 'Fix this before doing anything else.'],
+  ['açık bir paket/sözleşme varken işi bitirdiğini söyleyip dönüş bloğu vermeden kapanma', 'do not announce completion while a packet/contract is open without a return block'],
+  ['Mesajın en altına, kopyalanabilir tek blok olarak en fazla 5 satır ekle:', 'Add a single copyable block of at most 5 lines at the end of your message:'],
+  ['birinci satır', 'first line'],
+  ['ikinci satır', 'second line'],
+  ['varsa üçüncü satır tek açık soru.', 'if present, the third line is one open question.'],
+  ['Rapor gövdesini sohbete değil dosyaya yaz.', 'Write the report body to a file, not to chat.'],
+  ['görev paketini sohbete basma.', 'do not paste the task packet into chat.'],
+  ['Paket dosyaya yazılır, kullanıcıya tek satır verilir', 'Write the packet to a file and give the user one line'],
+  ['kullanıcıdan uzun bir bloğu kopyalamasını isteme', 'do not ask the user to copy a long block'],
+  ['raporu sohbete basma.', 'do not paste the report into chat.'],
+  ['Rapor dosyaya yazılır, kullanıcıya en fazla 5 satır verilir', 'Write the report to a file and give the user at most 5 lines'],
+  ['ENGELLENDİ', 'BLOCKED'],
+];
+
+function tmetin(tr, en) {
+  return dil() === 'tr' ? tr : en;
+}
+
+function cevir(metin) {
+  if (dil() === 'tr') return metin;
+  return DIL.reduce((s, [tr, en]) => s.replaceAll(tr, en), String(metin));
+}
 
 function seviye() {
   if (_seviye !== null) return _seviye;
@@ -320,7 +397,7 @@ function seviye() {
 function duyur(mesaj, min) {
   if (seviye() < (min || 1)) return;
   try {
-    process.stdout.write(JSON.stringify({ systemMessage: 'Teknesyum ▸ ' + mesaj }));
+    process.stdout.write(JSON.stringify({ systemMessage: 'Teknesyum ▸ ' + cevir(mesaj) }));
   } catch {}
 }
 
@@ -387,7 +464,7 @@ function paketDenetle(j, root) {
   const govde = sonMesaj(j.transcript_path);
   if (!govde) return;
   const engel = devirIhlali(govde) || donusEksik(root, govde);
-  if (engel) process.stdout.write(JSON.stringify({ decision: 'block', reason: engel }));
+  if (engel) process.stdout.write(JSON.stringify({ decision: 'block', reason: cevir(engel) }));
 }
 
 // ÖLÇÜLDÜ: tavan vardı, taban yoktu. Uzun bloğu engelliyorduk ama işini bitiren işçi
diff --git a/test/run.js b/test/run.js
index 26c22b2..3eb026b 100644
--- a/test/run.js
+++ b/test/run.js
@@ -34,6 +34,8 @@ function icerir(s, p, not) {
 // Testler kullanıcının gerçek `~/.claude` klasörünü okumamalı. Okurlarsa makinedeki
 // bir ayar (örn. `debug: true`) testi geçirir ya da düşürür; sonuç makineye bağlı olur.
 const BOS_CFG = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-cfg-'));
+fs.writeFileSync(path.join(BOS_CFG, 'teknesyum.json'), JSON.stringify({ dil: 'tr' }));
+fs.writeFileSync(path.join(BOS_CFG, 'teknesyum.json'), JSON.stringify({ dil: 'tr' }));
 
 function calistir(script, yuk, ek) {
   const r = spawnSync(process.execPath, [script], {
```

## agent-a192aa20113b21516

```diff
diff --git a/teknesyum/hooks/relay-watch.js b/teknesyum/hooks/relay-watch.js
index 7da1d30..d2bec7e 100644
--- a/teknesyum/hooks/relay-watch.js
+++ b/teknesyum/hooks/relay-watch.js
@@ -75,11 +75,12 @@ function run(j) {
       const rol = String(t.subagent_type || '?').replace(/^teknesyum:/, '');
       const tanim = String(t.description || '').slice(0, 60);
       duyur(
-        'görev veriliyor · ' +
+        dilMetni('dispatch') +
+          ' · ' +
           rol +
           (t.model ? ' · ' + t.model : '') +
           (tanim ? ' · ' + tanim : '') +
-          (n > 1 ? '   [' + n + ' ajan çalışıyor]' : '')
+          (n > 1 ? '   [' + n + ' ' + dilMetni('agentsRunning') + ']' : '')
       );
     }
     return;
@@ -145,7 +146,7 @@ function run(j) {
     case 'SubagentStop': {
       const c = calisanKapat(live, j.agent_type);
       const rol = String((c && c.type) || j.agent_type || 'ajan').replace(/^teknesyum:/, '');
-      duyur('bitti · ' + rol + (c ? ' · ' + (c.ambiguous ? 'süre belirsiz' : gecen(c.start)) : ''));
+      duyur(dilMetni('finished') + ' · ' + rol + (c ? ' · ' + (c.ambiguous ? dilMetni('durationUnknown') : gecen(c.start)) : ''));
       // Ölçüldü: bu olayın payload'ında `stop_reason` alanı YOK. Eksikliği ölüm sanma —
       // aksi halde normal biten her ajan statusline'da ⨯ görünür.
       s.stop_reason = j.stop_reason || 'end_turn';
@@ -209,13 +210,7 @@ function sozdizim(j) {
 
 function bozukMesaj(f, hata) {
   const ilk = hata.split('\n').filter(Boolean).slice(0, 5).join('\n');
-  return (
-    'Az önce yazdığın dosya ayrıştırılamıyor: ' +
-    f +
-    '\n' +
-    ilk +
-    '\nÖnce bunu düzelt, başka işe geçme.'
-  );
+  return dilMetni('syntax') + f + '\n' + ilk + '\n' + dilMetni('fixFirst');
 }
 
 function kimlikOku(j) {
@@ -296,11 +291,79 @@ function calisanKapat(live, type) {
 
 // Kullanıcı ajanların içini göremez. Base'in devreye girdiği her anı tek satır
 // bildiririz: görev verildi, ajan bitti, oturum açıldı.
-// Seviye `~/.claude/teknesyum.json` içindeki `steering` alanından okunur:
-// 0 hiç yazma · 1 temel yönlenmeler (varsayılan) · 2 her dokunuş.
-// TEKNESYUM_SESSIZ=1 eski davranış için 0'a eşdeğerdir.
+let _dil = null;
 let _seviye = null;
 
+function ayarKoku() {
+  return (
+    process.env.CLAUDE_CONFIG_DIR ||
+    path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude')
+  );
+}
+
+function dil() {
+  if (_dil !== null) return _dil;
+  const c = read(path.join(ayarKoku(), 'teknesyum.json'));
+  return (_dil = c && c.dil === 'tr' ? 'tr' : 'en');
+}
+
+const DIL = {
+  en: {
+    dispatch: 'dispatching task',
+    agentsRunning: 'agents running',
+    finished: 'finished',
+    durationUnknown: 'duration unknown',
+    setupMissing: 'setup incomplete · run /setup and I will ask what is needed',
+    relayReady: 'relay ready · no contracts',
+    relayProgress: 'relay ready · contracts',
+    resuming: 'open · resuming where I left off',
+    measure: 'Teknesyum Base: for work requests, measure with relay §1 and begin with `Teknesyum ▸ measure: <size> → <decision>`. Write it even without an agent (for example, `one file → no agent needed`). Do not write it for questions or chat.',
+    difference: 'Steering level 2: write a separate line for every decision where the base changed the outcome — `Teknesyum ▸ difference · <what> · <why/benefit>`. Mention rules, deterministic tools, maps, audits, research, model changes and hook blocks; not ordinary tool calls.',
+    compactContract: 'Open contract: ',
+    compactRead: ' (.claude/relay/contracts/). Read its status from the file; do not rely on memory.',
+    compactAgent: 'Unfinished agent: ',
+    compactReport: '. Verify its status with /report.',
+    syntax: 'The file you just wrote cannot be parsed: ',
+    fixFirst: 'Fix this before continuing.',
+    returnBlock: 'Teknesyum: an open packet or contract requires a return block before closing (multi-session.md §5.1). Add at most 5 lines at the end: first line <packet/contract> + status, second line `Report: <file path>`, and optionally one open question. Put the report body in a file, not in chat.',
+    packetBlock: 'Teknesyum: do not paste a task packet into chat. Write it to a file and give the user one line: read `.claude/relay/G<n>.md` and apply the task. The other side can read the file; the user need not copy 120 lines.',
+    reportBlock: 'Teknesyum: do not paste the report body into chat. Write it to a file and return at most 5 lines with `Report: <file path>`.',
+    copyBlock: 'Teknesyum: do not ask the user to copy a long block. Keep the body in a file and give only the file path to read and apply.',
+    irreversible: 'Contract status cannot move backward: ',
+    blocked: 'blocked',
+    agents: 'agents',
+  },
+  tr: {
+    dispatch: 'görev veriliyor',
+    agentsRunning: 'ajan çalışıyor',
+    finished: 'bitti',
+    durationUnknown: 'süre belirsiz',
+    setupMissing: 'kurulum eksik · /setup çalıştır, gerekeni sorarım',
+    relayReady: 'röle kurulu · sözleşme yok',
+    relayProgress: 'röle kurulu · sözleşme',
+    resuming: 'açık · kaldığım yerden sürdürüyorum',
+    measure: 'Teknesyum Base: iş talebiyse relay §1 ile ölç, ilk satır `Teknesyum ▸ ölçü: <büyüklük> → <karar>`. Ajan açmasan da yaz (örn. `tek dosya → ajan gerekmedi`). Salt soru/sohbette satırı yazma.',
+    difference: 'Yönlendirme seviyesi 2: base devreye giren her kararı ayrı satırda yaz — `Teknesyum ▸ fark · <ne> · <neden/kazanç>`. Kural, deterministik araç, harita, denetim, araştırma, model değişimi ve kanca engelini belirt; sıradan araç çağrısını değil.',
+    compactContract: 'Açık sözleşme: ',
+    compactRead: ' (.claude/relay/contracts/). Durumlarını dosyadan oku, hatırladığını varsayma.',
+    compactAgent: 'Bitmemiş ajan: ',
+    compactReport: '. /report ile durumlarını doğrula.',
+    syntax: 'Az önce yazdığın dosya ayrıştırılamıyor: ',
+    fixFirst: 'Önce bunu düzelt, başka işe geçme.',
+    returnBlock: 'Teknesyum: açık bir paket/sözleşme varken dönüş bloğu vermeden kapanma (multi-session.md §5.1). Mesajın altına en fazla 5 satır ekle: birinci satır <paket/sözleşme> + durum, ikinci satır `Rapor: <dosya yolu>`, varsa üçüncü satır tek açık soru. Rapor gövdesini sohbete değil dosyaya yaz.',
+    packetBlock: 'Teknesyum: görev paketini sohbete basma. Dosyaya yaz ve kullanıcıya tek satır ver: `.claude/relay/G<n>.md` oku ve içindeki görevi uygula. Kullanıcı 120 satırı kopyalamak zorunda değil.',
+    reportBlock: 'Teknesyum: rapor gövdesini sohbete basma. Dosyaya yaz ve `Rapor: <dosya yolu>` içeren en fazla 5 satırla dön.',
+    copyBlock: 'Teknesyum: kullanıcıdan uzun bir bloğu kopyalamasını isteme. Gövde dosyada dursun; yalnızca dosya yolunu ver.',
+    irreversible: 'Sözleşme durumu geriye alınamaz: ',
+    blocked: 'engellendi',
+    agents: 'ajan',
+  },
+};
+
+function dilMetni(k) {
+  return DIL[dil()][k] || DIL.en[k] || k;
+}
+
 function seviye() {
   if (_seviye !== null) return _seviye;
   if (process.env.TEKNESYUM_SESSIZ) return (_seviye = 0);
@@ -332,20 +395,10 @@ function hatirlat(j) {
   // oturumda 5000+ token, hepsi aynı cümlenin kopyası. Kural bir kez okunduğunda
   // geçmişte duruyor; ikinci kopyası bilgi taşımıyor. İlk iki istekte yazılır.
   if (sayacGecti(j)) return;
-  let metin =
-    'Teknesyum Base: iş talebiyse relay §1 ile ölç, ilk satır ' +
-    '`Teknesyum ▸ ölçü: <büyüklük> → <karar>`. Ajan açmasan da yaz (örn. ' +
-    '`tek dosya → ajan gerekmedi`). Salt soru/sohbette satırı yazma.';
+  let metin = dilMetni('measure');
   // Seviye 2'de kullanıcı her dokunuşu görmek istiyor: base olmasaydı olmayacak her
   // kararın kendi satırı olur. Biçim relay SKILL 7.2'de.
-  if (seviye() === 2) {
-    metin +=
-      ' Yönlendirme seviyesi 2: base devreye giren her kararı ayrı satırda yaz — ' +
-      '`Teknesyum ▸ fark · <ne> · <neden/kazanç>`. Kural uygulandığında, model yerine ' +
-      'deterministik araç seçildiğinde, harita/denetim/araştırma devreye girdiğinde, ' +
-      'model yükseltilip düşürüldüğünde, kanca engellediğinde yaz. Sıradan araç ' +
-      'çağrısına satır açma; base olmasaydı farklı sonuçlanacak anlara aç.';
-  }
+  if (seviye() === 2) metin += ' ' + dilMetni('difference');
   try {
     process.stdout.write(
       JSON.stringify({
@@ -518,19 +571,21 @@ function gecen(start) {
 // stdout tek JSON taşır — açılışta söylenecek her şey tek satırda birleşir.
 function acilis(root) {
   const parca = [];
-  if (kurulumEksik()) parca.push('kurulum eksik · /setup çalıştır, gerekeni sorarım');
+  if (kurulumEksik()) parca.push(dilMetni('setupMissing'));
   if (root) {
     const acik = say(path.join(root, 'contracts'));
     const biten = say(path.join(root, 'contracts', 'done'));
-    if (!acik && !biten) parca.push('röle kurulu · sözleşme yok');
+    if (!acik && !biten) parca.push(dilMetni('relayReady'));
     else
       parca.push(
-        'röle kurulu · sözleşme ' +
+        dilMetni('relayProgress') +
+          ' ' +
           biten +
           '/' +
           (acik + biten) +
-          ' bitti' +
-          (acik ? ' · ' + acik + ' açık · kaldığım yerden sürdürüyorum' : '')
+          ' ' +
+          dilMetni('finished') +
+          (acik ? ' · ' + acik + ' ' + dilMetni('resuming') : '')
       );
   }
   if (parca.length) duyur(parca.join('   ·   '));
```

## agent-a1f40c44c10d68e17

```diff
diff --git a/README.md b/README.md
index e7ffb38..571e735 100644
--- a/README.md
+++ b/README.md
@@ -1,6 +1,6 @@
 <div align="center">
 
-<img src="assets/banner.svg" alt="Teknesyum Base — agent orchestration with Relay, Contracts, Hooks, Audit, and Prior Art" width="820">
+<img src="assets/banner.svg" alt="Teknesyum Base — agent orchestration with Relay, Contracts, Hooks, Audit, and Prior Art" width="820" style="display:block;width:100%;max-width:1200px;height:auto;margin:0 auto 24px">
 
 **Say what you want. The system organizes the rest.**
 
@@ -8,8 +8,7 @@ A base layer for Claude Code: a multi-agent work relay, an independent auditor,
 neon UI standard. How big a job is, how many pieces it splits into, which agent runs on
 which model, and how the result is verified — the system decides, not you.
 
-[![Sponsor](https://img.shields.io/badge/Sponsor-Teknesyum-b026ff?style=flat-square&logo=githubsponsors)](https://github.com/sponsors/Teknesyum)
-[![License](https://img.shields.io/badge/License-MIT-00f3ff?style=flat-square)](LICENSE)
+[License](LICENSE) · [Support Teknesyum](https://github.com/sponsors/Teknesyum)
 
 </div>
 
@@ -107,7 +106,7 @@ with the theme standard preloaded, and missing `AGENTS.md` signposts get written
 job closes.
 
 <div align="center">
-<img src="assets/flow.svg" alt="Request, Measure, Prior Art, Builder · Scribe · UI-Builder, Auditor, Return Block, Contracts/Done, Hooks · 11 Events, Syntax Check, Status Ladder, Prior-Art Gate, Return-Block Floor, Teknesyum ▸ Steering" width="900">
+<img src="assets/flow.svg" alt="Request, Measure, Prior Art, Builder · Scribe · UI-Builder, Auditor, Return Block, Contracts/Done, Hooks · 11 Events, Syntax Check, Status Ladder, Prior-Art Gate, Return-Block Floor, Teknesyum ▸ Steering" width="900" style="display:block;width:100%;max-width:1200px;height:auto;margin:0 auto">
 </div>
 
 ### Prior art comes before the first contract
@@ -580,11 +579,11 @@ working — a project that already has one is still written to, so no trace is l
 
 ## Support
 
-<div style="background:#0a0a0c;border:1px solid #00f3ff;border-radius:16px;padding:24px;box-shadow:inset 0 0 8px #00f3ff">
+<div style="background:#0a0a0c;border:1px solid #b026ff;border-radius:16px;padding:24px;box-shadow:inset 0 0 8px #b026ff;max-width:720px;margin:24px auto;text-align:center">
 
 Built in spare time, free.
 
-<a href="https://github.com/sponsors/Teknesyum"><img src="https://img.shields.io/badge/Buy_me_a_coffee-b026ff?style=for-the-badge&logo=githubsponsors&logoColor=b026ff&labelColor=0d0d0f" alt="Sponsor" /></a>
+<a href="https://github.com/sponsors/Teknesyum" style="display:inline-block;border:1px solid #b026ff;border-radius:12px;padding:12px 24px;color:#b026ff;text-decoration:none;font-weight:700">Support Teknesyum</a>
 
 **[github.com/Teknesyum](https://github.com/Teknesyum)** · MIT
 
diff --git a/assets/banner.svg b/assets/banner.svg
index a161b2b..ee187e9 100644
--- a/assets/banner.svg
+++ b/assets/banner.svg
@@ -1,4 +1,4 @@
-<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" width="1200" height="300" role="img" aria-label="Teknesyum Base — agent orchestration with Relay, Contracts, Hooks, Audit, and Prior Art">
+<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320" width="1200" height="320" role="img" aria-label="Teknesyum Base — agent orchestration with Relay, Contracts, Hooks, Audit, and Prior Art">
   <defs>
     <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0%" stop-color="#00f3ff"/>
@@ -15,11 +15,11 @@
     </filter>
   </defs>
 
-  <rect x="0" y="0" width="1200" height="300" rx="28" fill="#000000"/>
-  <rect x="1" y="1" width="1198" height="298" rx="28" fill="none" stroke="url(#neon)" stroke-width="2" opacity="0.55"/>
-  <rect x="32" y="286" width="1136" height="4" rx="2" fill="url(#edge)"/>
+  <rect x="0" y="0" width="1200" height="320" rx="28" fill="#000000"/>
+  <rect x="1" y="1" width="1198" height="318" rx="28" fill="none" stroke="url(#neon)" stroke-width="2" opacity="0.55"/>
+  <rect x="32" y="306" width="1136" height="4" rx="2" fill="url(#edge)"/>
 
-  <g transform="translate(72 54) scale(0.75)">
+  <g transform="translate(72 64) scale(0.75)">
     <g filter="url(#glow)" fill="none" stroke="url(#neon)" stroke-width="6" stroke-linecap="round">
       <path d="M128 96 C 128 140, 84 142, 72 166"/>
       <path d="M128 96 L 128 168"/>
@@ -34,18 +34,18 @@
   </g>
 
   <g font-family="Segoe UI, system-ui, sans-serif">
-    <text x="320" y="132" font-size="66" font-weight="600" fill="#ffffff" letter-spacing="1">Teknesyum Base</text>
-    <text x="322" y="180" font-size="26" fill="#00f3ff" letter-spacing="3">AGENT ORCHESTRATION FOR CLAUDE CODE</text>
-    <g font-family="Consolas, monospace" font-size="20" fill="#ffffff" opacity="0.72">
-      <text x="322" y="232">Relay</text>
-      <text x="404" y="232" fill="#b026ff">·</text>
-      <text x="424" y="232">Contracts</text>
-      <text x="550" y="232" fill="#b026ff">·</text>
-      <text x="570" y="232">Hooks</text>
-      <text x="652" y="232" fill="#b026ff">·</text>
-      <text x="672" y="232">Audit</text>
-      <text x="744" y="232" fill="#b026ff">·</text>
-      <text x="764" y="232">Prior Art</text>
+    <text x="320" y="132" font-size="60" font-weight="700" fill="#ffffff" letter-spacing="1">Teknesyum Base</text>
+    <text x="322" y="184" font-size="24" fill="#00f3ff" letter-spacing="2">Agent orchestration for Claude Code</text>
+    <g font-family="Consolas, monospace" font-size="20" fill="#ffffff">
+      <text x="322" y="240">Relay</text>
+      <text x="404" y="240" fill="#b026ff">·</text>
+      <text x="424" y="240">Contracts</text>
+      <text x="550" y="240" fill="#b026ff">·</text>
+      <text x="570" y="240">Hooks</text>
+      <text x="652" y="240" fill="#b026ff">·</text>
+      <text x="672" y="240">Audit</text>
+      <text x="744" y="240" fill="#b026ff">·</text>
+      <text x="764" y="240">Prior Art</text>
     </g>
   </g>
 </svg>
diff --git a/assets/flow.svg b/assets/flow.svg
index db59d9a..80ef300 100644
--- a/assets/flow.svg
+++ b/assets/flow.svg
@@ -1,4 +1,4 @@
-<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 380" width="1200" height="380" role="img" aria-label="Teknesyum Base flow from Request through Measure, Prior Art, contracts, agents, Auditor, Return Block, and Contracts/Done">
+<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420" width="1200" height="420" role="img" aria-label="Teknesyum Base flow from Request through Measure, Prior Art, Builder, Auditor, Return Block, and Contracts Done">
   <defs>
     <linearGradient id="neon" x1="0" y1="0" x2="1" y2="0">
       <stop offset="0%" stop-color="#00f3ff"/>
@@ -13,62 +13,63 @@
     </marker>
   </defs>
 
-  <rect x="0" y="0" width="1200" height="380" rx="20" fill="#000000"/>
-  <rect x="1" y="1" width="1198" height="378" rx="20" fill="none" stroke="url(#neon)" stroke-width="2" opacity="0.45"/>
+  <rect x="0" y="0" width="1200" height="420" rx="20" fill="#000000"/>
+  <rect x="1" y="1" width="1198" height="418" rx="20" fill="none" stroke="url(#neon)" stroke-width="2" opacity="0.45"/>
 
   <g font-family="Segoe UI, system-ui, sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">
-    <g stroke="#00f3ff" stroke-width="2" fill="#000000">
-      <rect x="40" y="60" width="200" height="60" rx="12"/>
-      <rect x="270" y="60" width="200" height="60" rx="12"/>
-      <rect x="500" y="60" width="200" height="60" rx="12"/>
-      <rect x="730" y="60" width="200" height="60" rx="12"/>
-      <rect x="960" y="60" width="200" height="60" rx="12"/>
+    <g stroke="#00f3ff" stroke-width="2" fill="#0a0a0c">
+      <rect x="40" y="54" width="200" height="68" rx="12"/>
+      <rect x="270" y="54" width="200" height="68" rx="12"/>
+      <rect x="500" y="54" width="200" height="68" rx="12"/>
+      <rect x="730" y="54" width="200" height="68" rx="12"/>
+      <rect x="960" y="54" width="200" height="68" rx="12"/>
     </g>
-    <text x="140" y="97">Request</text>
-    <text x="370" y="97">Measure</text>
-    <text x="600" y="97">Prior Art</text>
-    <text x="830" y="97">Builder · Scribe · UI-Builder</text>
-    <text x="1060" y="97">Contracts/Done</text>
+    <text x="140" y="96">Request</text>
+    <text x="370" y="96">Measure</text>
+    <text x="600" y="96">Prior art</text>
+    <text x="830" y="88">Builder · Scribe</text>
+    <text x="830" y="112">UI-builder</text>
+    <text x="1060" y="96">Contracts / done</text>
 
     <g stroke="#00f3ff" stroke-width="2" marker-end="url(#ar)" fill="none">
-      <path d="M240 90 L262 90"/>
-      <path d="M470 90 L492 90"/>
-      <path d="M700 90 L722 90"/>
-      <path d="M930 90 L952 90"/>
+      <path d="M240 88 L262 88"/>
+      <path d="M470 88 L492 88"/>
+      <path d="M700 88 L722 88"/>
+      <path d="M930 88 L952 88"/>
     </g>
 
-    <path d="M1060 120 L1060 158 L140 158 L140 196" stroke="#b026ff" stroke-width="2" fill="none" marker-end="url(#arm)"/>
+    <path d="M1060 122 L1060 164 L140 164 L140 202" stroke="#b026ff" stroke-width="2" fill="none" marker-end="url(#arm)"/>
 
-    <g stroke-width="2" fill="#000000">
-      <rect x="40" y="204" width="260" height="60" rx="12" stroke="#b026ff"/>
-      <rect x="340" y="204" width="260" height="60" rx="12" stroke="#ff00ea"/>
-      <rect x="640" y="204" width="260" height="60" rx="12" stroke="#00f3ff"/>
-      <rect x="940" y="204" width="220" height="60" rx="12" stroke="#34d399"/>
+    <g stroke-width="2" fill="#0a0a0c">
+      <rect x="40" y="210" width="260" height="68" rx="12" stroke="#b026ff"/>
+      <rect x="340" y="210" width="260" height="68" rx="12" stroke="#ff00ea"/>
+      <rect x="640" y="210" width="260" height="68" rx="12" stroke="#00f3ff"/>
+      <rect x="940" y="210" width="220" height="68" rx="12" stroke="#34d399"/>
     </g>
-    <g font-size="19">
-      <text x="170" y="240" font-size="17">Builder · Scribe · UI-Builder</text>
-      <text x="470" y="240">Auditor</text>
-      <text x="770" y="240">Return Block</text>
-      <text x="1050" y="240" fill="#34d399">Contracts/Done</text>
+    <g font-size="20">
+      <text x="170" y="251">Builder · Scribe · UI-builder</text>
+      <text x="470" y="251">Auditor</text>
+      <text x="770" y="251">Return block</text>
+      <text x="1050" y="251" fill="#34d399">Contracts / done</text>
     </g>
 
     <g stroke="#00f3ff" stroke-width="2" marker-end="url(#ar)" fill="none">
-      <path d="M300 234 L332 234"/>
-      <path d="M600 234 L632 234"/>
-      <path d="M900 234 L932 234"/>
+      <path d="M300 244 L332 244"/>
+      <path d="M600 244 L632 244"/>
+      <path d="M900 244 L932 244"/>
     </g>
   </g>
 
-  <g font-family="Consolas, monospace" font-size="17" fill="#ffffff">
-    <text x="40" y="330" fill="#00f3ff">Hooks · 11 Events</text>
-    <text x="230" y="330" opacity="0.75">Syntax Check</text>
-    <text x="380" y="330" fill="#b026ff">·</text>
-    <text x="400" y="330" opacity="0.75">Status Ladder</text>
-    <text x="552" y="330" fill="#b026ff">·</text>
-    <text x="572" y="330" opacity="0.75">Prior-Art Gate</text>
-    <text x="726" y="330" fill="#b026ff">·</text>
-    <text x="746" y="330" opacity="0.75">Return-Block Floor</text>
-    <text x="944" y="330" fill="#b026ff">·</text>
-    <text x="964" y="330" opacity="0.75">Teknesyum ▸ Steering</text>
+  <g font-family="Consolas, 'Cascadia Mono', ui-monospace, monospace" font-size="17" fill="#ffffff">
+    <text x="40" y="344" fill="#00f3ff">Hooks · 11 events</text>
+    <text x="230" y="344">Syntax check</text>
+    <text x="380" y="344" fill="#b026ff">·</text>
+    <text x="400" y="344">Status ladder</text>
+    <text x="552" y="344" fill="#b026ff">·</text>
+    <text x="572" y="344">Prior-art gate</text>
+    <text x="726" y="344" fill="#b026ff">·</text>
+    <text x="746" y="344">Return-block floor</text>
+    <text x="944" y="344" fill="#b026ff">·</text>
+    <text x="964" y="344">Teknesyum ▸ steering</text>
   </g>
 </svg>
```

## agent-a3cc4a4afba9906e0

İzlenmeyen: ?? teknesyum/commands/uicheckup.md ?? teknesyum/scripts/uicheckup-apply.js 

## agent-a85d09fb94c631d53

```diff
diff --git a/teknesyum/hooks/relay-watch.js b/teknesyum/hooks/relay-watch.js
index 7da1d30..fb7dde4 100644
--- a/teknesyum/hooks/relay-watch.js
+++ b/teknesyum/hooks/relay-watch.js
@@ -75,11 +75,11 @@ function run(j) {
       const rol = String(t.subagent_type || '?').replace(/^teknesyum:/, '');
       const tanim = String(t.description || '').slice(0, 60);
       duyur(
-        'görev veriliyor · ' +
+        ceviri('assigning · ', 'görev veriliyor · ') +
           rol +
           (t.model ? ' · ' + t.model : '') +
           (tanim ? ' · ' + tanim : '') +
-          (n > 1 ? '   [' + n + ' ajan çalışıyor]' : '')
+          (n > 1 ? '   [' + n + ' ' + ceviri('agents working', 'ajan çalışıyor') + ']' : '')
       );
     }
     return;
```

## agent-a99a8486dbfe6c8bd

```diff
diff --git a/teknesyum/hooks/relay-watch.js b/teknesyum/hooks/relay-watch.js
index a71cd93..5eafd2a 100644
--- a/teknesyum/hooks/relay-watch.js
+++ b/teknesyum/hooks/relay-watch.js
@@ -75,11 +75,12 @@ function run(j) {
       const rol = String(t.subagent_type || '?').replace(/^teknesyum:/, '');
       const tanim = String(t.description || '').slice(0, 60);
       duyur(
-        'görev veriliyor · ' +
+        mesaj('dispatch') +
+          ' · ' +
           rol +
           (t.model ? ' · ' + t.model : '') +
           (tanim ? ' · ' + tanim : '') +
-          (n > 1 ? '   [' + n + ' ajan çalışıyor]' : '')
+          (n > 1 ? '   [' + n + ' ' + (dil() === 'tr' ? 'ajan çalışıyor' : 'agents running') + ']' : '')
       );
     }
     return;
@@ -210,11 +211,7 @@ function sozdizim(j) {
 function bozukMesaj(f, hata) {
   const ilk = hata.split('\n').filter(Boolean).slice(0, 5).join('\n');
   return (
-    'Az önce yazdığın dosya ayrıştırılamıyor: ' +
-    f +
-    '\n' +
-    ilk +
-    '\nÖnce bunu düzelt, başka işe geçme.'
+    mesaj('syntax', { f, hata: ilk })
   );
 }
 
@@ -300,6 +297,58 @@ function calisanKapat(live, type) {
 // 0 hiç yazma · 1 temel yönlenmeler (varsayılan) · 2 her dokunuş.
 // TEKNESYUM_SESSIZ=1 eski davranış için 0'a eşdeğerdir.
 let _seviye = null;
+let _dil = null;
+
+function dil() {
+  if (_dil !== null) return _dil;
+  const kok =
+    process.env.CLAUDE_CONFIG_DIR ||
+    path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude');
+  const c = read(path.join(kok, 'teknesyum.json'));
+  return (_dil = c && c.dil === 'tr' ? 'tr' : 'en');
+}
+
+function mesaj(anahtar, degerler) {
+  const tr = dil() === 'tr';
+  const metinler = {
+    syntax: tr
+      ? 'Az önce yazdığın dosya ayrıştırılamıyor: {f}\n{hata}\nÖnce bunu düzelt, başka işe geçme.'
+      : 'The file you just wrote cannot be parsed: {f}\n{hata}\nFix this before doing anything else.',
+    dispatch: tr ? 'görev veriliyor' : 'dispatching task',
+    running: tr ? 'ajan çalışıyor' : 'agent running',
+    finished: tr ? 'bitti' : 'finished',
+    ambiguous: tr ? 'süre belirsiz' : 'duration unknown',
+    sizing: tr
+      ? 'Teknesyum Base: iş talebiyse relay §1 ile ölç, ilk satır `Teknesyum ▸ ölçü: <büyüklük> → <karar>`. Ajan açmasan da yaz (örn. `tek dosya → ajan gerekmedi`). Salt soru/sohbette satırı yazma.'
+      : 'Teknesyum Base: for a work request, size it with relay §1 and write the first line `Teknesyum ▸ sizing: <size> → <decision>`. Write it even when no agent is needed (for example, `single file → no agent needed`). Do not write the line for questions or chat.',
+    steering: tr
+      ? 'Yönlendirme seviyesi 2: base devreye giren her kararı ayrı satırda yaz — `Teknesyum ▸ fark · <ne> · <neden/kazanç>`. Kural uygulandığında, model yerine deterministik araç seçildiğinde, harita/denetim/araştırma devreye girdiğinde, model yükseltilip düşürüldüğünde, kanca engellediğinde yaz. Sıradan araç çağrısına satır açma; base olmasaydı farklı sonuçlanacak anlara aç.'
+      : 'Steering level 2: write a separate line for every decision where the base intervenes — `Teknesyum ▸ difference · <what> · <reason/benefit>`. Write one when applying a rule, choosing a deterministic tool over a model, invoking mapping/audit/research, changing models, or blocking at a hook. Do not write one for ordinary tool calls; write it only when the outcome would differ without the base.',
+    returnBlock: tr
+      ? 'Teknesyum: açık bir paket/sözleşme varken işi bitirdiğini söyleyip dönüş bloğu vermeden kapanma (multi-session.md §5.1). Mesajın en altına, kopyalanabilir tek blok olarak en fazla 5 satır ekle: birinci satır <paket/sözleşme> + durum, ikinci satır "Rapor: <dosya yolu>", varsa üçüncü satır tek açık soru. Rapor gövdesini sohbete değil dosyaya yaz.'
+      : 'Teknesyum: do not close after announcing completion while a packet/contract is open without a return block (multi-session.md §5.1). Add one copyable block of at most 5 lines at the bottom: first line <packet/contract> + status, second line "Report: <file path>", and an optional third line with one open question. Write the report body to a file, not chat.',
+    packet: tr
+      ? 'Teknesyum: görev paketini sohbete basma. Paket dosyaya yazılır, kullanıcıya tek satır verilir (multi-session.md §5). Paketi `.claude/relay/G<n>.md` altına yaz, sonra sadece şunu bas: "`.claude/relay/G<n>.md` oku ve içindeki görevi eksiksiz uygula." Paketi çalıştıracak taraf dosyayı kendi okur; kullanıcının 120 satır kopyalaması gerekmez.'
+      : 'Teknesyum: do not paste a task packet into chat. Write the packet to a file and give the user one line (multi-session.md §5). Write it under `.claude/relay/G<n>.md`, then say only: "Read `.claude/relay/G<n>.md` and carry out the task in it completely." The receiving tool reads the file itself; the user need not copy 120 lines.',
+    report: tr
+      ? 'Teknesyum: raporu sohbete basma. Rapor dosyaya yazılır, kullanıcıya en fazla 5 satır verilir (multi-session.md §5.1). Gövdeyi paketin `## Rapor` bölümüne ya da `docs/` altında bir dosyaya yaz, sonra şunu bas: "<paket> teslim edildi. Rapor: <dosya yolu>." Karşı taraf dosyayı kendi okur.'
+      : 'Teknesyum: do not paste the report body into chat. Write the report to a file and give the user at most 5 lines (multi-session.md §5.1). Write the body under the packet `## Report` section or in `docs/`, then say: "<packet> delivered. Report: <file path>." The receiving party reads the file itself.',
+    copy: tr
+      ? 'Teknesyum: kullanıcıdan uzun bir bloğu kopyalamasını isteme (multi-session.md §5). Kopyalanabilir metin birkaç satırdır; gövde dosyada durur ve karşı taraf dosyayı kendi okur. Bloğu bir dosyaya yaz, sohbete yalnızca "<dosya yolu> oku ve uygula" satırını bas.'
+      : 'Teknesyum: do not ask the user to copy a long block (multi-session.md §5). Copyable text should be a few lines; keep the body in a file for the receiving party to read. Write the block to a file and print only "Read and apply <file path>."',
+    setup: tr ? 'kurulum eksik · /setup çalıştır, gerekeni sorarım' : 'setup incomplete · run /setup and I will ask what is needed',
+    relayNone: tr ? 'röle kurulu · sözleşme yok' : 'relay ready · no contracts',
+    openContract: tr ? 'Açık sözleşme: ' : 'Open contract: ',
+    readContract: tr ? ' (.claude/relay/contracts/). Durumlarını dosyadan oku, hatırladığını varsayma.' : ' (.claude/relay/contracts/). Read their status from the files; do not rely on memory.',
+    route: tr ? 'Rota: ' : 'Route: ',
+    position: tr ? ' — kaldığın yer:' : ' — current position:',
+    unfinished: tr ? 'Bitmemiş ajan: ' : 'Unfinished agent: ',
+    verify: tr ? '. /report ile durumlarını doğrula.' : '. Verify their status with /report.',
+  };
+  let out = metinler[anahtar] || anahtar;
+  for (const [k, v] of Object.entries(degerler || {})) out = out.replaceAll('{' + k + '}', String(v));
+  return out;
+}
 
 function seviye() {
   if (_seviye !== null) return _seviye;
```

## agent-ab4b6ab4a8da5ab8d

```diff
diff --git a/assets/banner.svg b/assets/banner.svg
index a161b2b..c4f8aa7 100644
--- a/assets/banner.svg
+++ b/assets/banner.svg
@@ -10,7 +10,7 @@
       <stop offset="100%" stop-color="#ff00ea" stop-opacity="0.15"/>
     </linearGradient>
     <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
-      <feGaussianBlur stdDeviation="4" result="b"/>
+      <feGaussianBlur stdDeviation="2" result="b"/>
       <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
     </filter>
   </defs>
diff --git a/assets/logo.svg b/assets/logo.svg
index a3c28fb..83703dd 100644
--- a/assets/logo.svg
+++ b/assets/logo.svg
@@ -6,7 +6,7 @@
       <stop offset="100%" stop-color="#ff00ea"/>
     </linearGradient>
     <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
-      <feGaussianBlur stdDeviation="4" result="b"/>
+      <feGaussianBlur stdDeviation="2" result="b"/>
       <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
     </filter>
   </defs>
```


## main'e girmemiş commit taşıyan dallar

Worktree'ler silindi, **dallar duruyor** — ref birkaç bayt, içerik kaybolmasın.
İncelenip gereksiz çıkarsa `git branch -D <dal>` ile silinir.

- `worktree-agent-a0d87fa9c82f067e3`
  - eee778c fix: resolve relay state across worktrees
- `worktree-agent-a117f4051df71536f`
  - 1b07ab8 chore: stage relay language contract
  - cd87781 fix: resolve relay state across worktrees
- `worktree-agent-a3fbf63be48584006`
  - fb02c39 T1: add deterministic UI checkup CLI
- `worktree-agent-a4779ddce0d882ec5`
  - 66b504f chore: widen relay language contract scope
- `worktree-agent-a4ff9051cd6838654`
  - 248ee2a fix: make installers cross-platform
- `worktree-agent-a592e55339dd3df63`
  - 299c768 test: cover UI checkup workflow
  - 8e6cd47 docs: refine neon relay visuals
  - bb4aad7 fix: make installers cross-platform
  - 9fe1cae T2: add verified UI checkup apply manifest
  - b8f3ca4 T1: add deterministic UI checkup CLI
- `worktree-agent-a7df7558d4618e96f`
  - ac800d4 T2: add verified UI checkup apply manifest
  - b7ba47d T1: add deterministic UI checkup CLI
- `worktree-agent-a80223cd9871de7ee`
  - 50dac0d docs: clarify relay response and stop reporting rules
- `worktree-agent-a90b0359db468b250`
  - 1107879 docs: refine neon relay visuals
- `worktree-agent-a956e4e4f53c5d3c3`
  - 7b666bb docs: refresh neon README visuals
- `worktree-agent-aa8976090e32e8923`
  - 0e699ae fix: route new work around unrelated contracts
