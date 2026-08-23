# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Lisans, yeni depo adiminda kararlasan bir alan oldu.** `relay` §2 madde 6 simdiye
  kadar yalnizca depo adinin buyuk-kucuk harf duzenini baglıyordu; lisans hic
  sorulmuyordu. Sonucu on genel deponun altisinin refleksle MIT, dordunun ise tamamen
  lisanssiz kalmasiydi — ve lisanssiz depo "herkese acik" degil "tum haklari sakli"
  demek oldugu icin o dort depoyu kimse yasal olarak kullanamiyordu. Madde artik tek bir
  soru soruyor (*bu kodu alip kapatan birine ne olsun?*), dort cevabi dort lisansa
  esliyor ve karar verilmeden `LICENSE` yazilmasini yasakliyor. Teknesyum depolarinin
  cevabi `AGPL-3.0-or-later` olarak sabitlendi. Ayni commit'te hizalanacak yuzeyler
  (manifest, rozet, README, paketleme dosyasi, uygulama ici metin) ve katki alinan
  depolarda `DCO` + `CONTRIBUTING.md` zorunlulugu da maddeye baglandi.

### Changed

- Depo lisansi MIT'ten **AGPL-3.0-or-later**'a gecti. Rozet, destek gorseli ve eklenti
  manifestosu hizalandi; `DCO` 1.1 ve `CONTRIBUTING.md` eklendi.

## [2.51.0] - 2026-08-23

### Changed

- **The turn receipt moved out of the transcript and into the statusline.** Two channels
  were tried and both are closed. The model channel makes the model regenerate its whole
  answer — `Stop` runs after the answer is written, so the only way it can add a line is
  to write a new message. The user channel is rendered as
  `[hookName, " says: ", content]` with the hook name coming from the event rather than
  from any setting, so the `Stop says:` prefix cannot be removed by configuration; the
  user does not want that text on screen. The statusline is our own script and adds no
  prefix. The split is strict: the hook computes and writes a finished line, the
  statusline only displays it. Two calculators would print two different numbers.
- **Neither the receipt nor the finish sound fires while background agents are still
  running.** `Stop` marks the end of the main turn, not the end of the work — the dot is
  still blinking and the screen says "N running tasks". `_running.json` already answered
  this question: `SubagentStart` adds a record, `SubagentStop` removes it, and the
  statusline has always read it. While it is non-empty the measurement is deferred and
  the stamp is kept. The stamp is deleted only on the branch that actually prints —
  deleting it while deferring is what broke the previous deferral mechanism and lost the
  accumulated time. A record older than two hours counts as dead, so a crashed agent
  cannot silence the receipt forever. Background shells remain invisible to hooks; that
  gap is documented rather than guessed at.
- The window-button contradiction is closed at **42×30 DIP** by the user. `desktop.md`
  said 52×36px and `SKILL.md` said 42×30, neither had ever been measured, and the agent
  refused to pick — which was the right call.

## [2.50.0] - 2026-08-23

### Changed

- **The measured window is now user-input to user-input.** The receipt prints whenever the
  keyboard goes back to the user: work blocked, work half-finished, work stopped, or the
  answer ending in a "Senden istediklerim" block. What it cost up to that moment must be
  visible at that moment; folding it into the next turn detaches the number the user sees
  from the moment they see it. A subagent finishing is explicitly not a stop — the user
  does not start typing there, the main session carries on. The old behaviour deferred
  blocked closures through a `bekleyen` stamp and accumulated them; that is gone, and so
  is the chain logic in `turBasla`.
- Full sentences are no longer exempt from Title Case. Tooltips, error messages, empty
  states and confirmation text all follow the same capitalisation rule as labels. The
  exemption had been added unilaterally and was never asked for.
- `autocompact` stays out of the model's context. It is a global that changes once per
  profile switch, and a model reasoning about whether the work will fit is producing a
  guess — a good guesser is still guessing, and the cost is extra thinking on every
  single request.

### Added

- `docs/KARARLAR-ui-2026-08-23.md` — the decision record for the UI council: all 23
  findings and six open questions, what was decided, and whose view won. It includes the
  two points where the manager was overruled and the one where it was upheld.
- Nine contracts opened. `U2` carries the typography wave and the sixteen cheap fixes in
  one piece, because several of them touch the same three files and separate contracts
  would collide on `owns`. `S2` rebuilds `/scan ui`: a gate that refuses to run when the
  UI standard is not installed, a profile mode that reports UI status without failing on
  it, and a two-phase `--tamamla` where the theoretical pass must finish before the app
  is ever opened for end-to-end checks. `U3`–`U9` are the seven items that earn their own
  contract, and each opens its own `fable` council before any code is written.

## [2.49.0] - 2026-08-23

### Fixed

- The signature block's WPF hover animation never worked. `ScaleTransform` was given as a
  Style Setter value, which fails twice over: a Setter value is a single object, so both
  chips shared one instance and hovering "Destek" scaled "Teknesyum" too; and a Freezable
  Setter value is frozen when the style is sealed, so the animation was writing to a
  frozen object. The correct pattern already existed in `Theme.xaml`. The transform now
  lives on each Border and the animation path is fully qualified.
- `.tk-btn-ghost` used a `purple-text/50` border measuring 2.55:1 — the same 1.4.11
  violation fixed elsewhere in the previous round. The fix had been applied only to the
  three lines the auditor named, and the fourth instance of the class was missed.
- Under reduced motion `transform: none` was scoped to `.tk-btn`, so the signature's
  `scale(1.02)` escaped it. The rule is now universal.
- The removal recipe in `docs/masaustu-izolasyon.md` omitted two edits it requires on the
  test side and quoted a stale 282/282 figure. Measured: on a clean checkout, deleting the
  hook and its one `hooks.json` block leaves 373 of 390 tests passing, and all 17 failures
  are the feature's own tests.
- `biome check --write` was run across the repository — 22 files checked, 19 fixed, zero
  errors remaining, all tests still passing.

## [2.48.0] - 2026-08-23

### Fixed

- **The signature block failed its own contrast rule in the state users actually see.**
  A resting `opacity: 0.8` was applied to the whole element, text included: `#ff54eb`
  at 80% opacity reads **5.10:1** on black and **4.95:1** on the title bar's real
  surface `#08090a`, under the 7:1 rule. Purple text was replaced by pink precisely
  because purple measured 4.57 — the opacity multiplier handed that gain straight back,
  and it applied to the resting state, which is what a user looks at essentially all
  the time. The resting state is now fully opaque and the hover signal moved from
  opacity to `scale(1.02)`, which is §5's own button value rather than a new number.
- The signature chip border was below the 3:1 threshold of WCAG 1.4.11:
  `pink-text/50` measures **2.51:1** on black and **~1.9:1** once the 0.8 opacity is
  applied. The `/50` step of the border ladder had only ever been measured for
  `neon-blue` (4.07); pink and purple do not carry it. Both chips now use the full
  token.
- `theme.css` animated `box-shadow` on the scrollbar thumb, which §5.4 forbids by name
  with no exception. The glow is now static and only the fill colour transitions.
- Four scanner behaviours had no test touching them — the Tailwind `hover:` branch,
  `gecissizBilesen`, `animasyonsuzListe`, and a hardcoded duration below the ceiling.
  The fixtures contained no `hover:` utility, no component-shaped filename, no `.map(`,
  and no sub-ceiling duration, so the report counted those branches as working without
  ever running them. Three tests now cover all four.
- `/ekran` was missing from the `/help` table.

### Changed

- Contracts `E1`, `S1`, `T2`, `U1` went through independent audit. `T2` passed and is
  sealed under `contracts/done/`. The other three recorded their round-2 results and
  the fixes above; the audit evidence, including the removability run that proves
  deleting `ekran-kapisi.js` plus one `hooks.json` block breaks only that feature's own
  17 tests and nothing else, is written into each contract.

## [2.47.0] - 2026-08-23

### Changed

- **Second opinion is now the default, and skipping it needs a reason.** The nine
  triggers in relay §1.5.1 used to read as a permission list: `advisor` opened only when
  one of them fired. It became a reminder list instead — if a trigger fits, opening is
  mandatory; if none fits and you are not sure the decision is right, you open it anyway.
  There are exactly three reasons not to: the work is mechanical, the question can be put
  to the user (then ask — an opinion does not replace asking), or the same node already
  got an opinion this round. The cost was weighed: `advisor` runs `fable` at `low` effort,
  about 25 seconds and ~10k tokens, against the six-builder-five-auditor cost of the bug
  that ran five rounds unsolved. If we are going to err, we err toward asking too often.
- **When to look is now a rule too, not just what to do.** The list existed but the moment
  to consult it did not, and the trigger failed to fire for five consecutive rounds
  (`docs/openlogs/HATA-ikinci-gorus-tetiklenmiyor.md`). Four moments are now named: when
  an audit report arrives and before the briefing is written, when a contract enters its
  second fix round, before a plan goes to the user, and before an expensive-to-undo step.

### Added

- `docs/KONSEY-ui-analizi-2026-08-23.md` — a full council review of the UI standard by two
  independent `fable` members plus the manager, item by item, with what exists / what
  `fable` says / what the manager says in three columns, the three points where they
  disagree, and 23 findings split into "do now", "deserves its own contract", and "your
  taste, two options". Nothing was changed; the report is for the decision, not the fix.

### Fixed

- A regression test now pins that a subagent finishing makes no sound. `bitisSesi` is
  called from exactly one place and `turBitir` from exactly one place, and no hook other
  than `Notification`/`StopFailure` carries `beep.js`. The test runs the hook rather than
  reading the source, because "which event plays a sound" is the kind of claim that
  should be measured.

## [2.46.1] - 2026-08-23

### Added

- `/log` — open bug logs. When a Teknesyum feature misbehaves, the session that sees it
  is usually not the session that can fix it: the user asked for something else, and
  derailing the chat costs more than the bug. `/log yaz` drops a log from any project
  into a machine-wide spool (`~/.claude/teknesyum/openlogs/`), and the next session
  opened on Teknesyum Base reads and solves it. The spool is machine-wide on purpose —
  requiring other projects to know where Base sits on disk would mean no log gets
  written at all on the day the path cannot be resolved. `/log al` moves a log into
  `docs/openlogs/` and version control; closing is two-way and the choice is the
  user's: `kapat` deletes when the problem is entirely gone, `arsivle` moves it under
  `docs/openlogs/kapali/` when a measurement or decision is worth keeping. Session
  start announces open logs and writes the reporting procedure into every project's
  context once per session.
- **Runnable acceptance criteria.** A criterion can now carry a `CHECK:` line naming the
  command that makes it pass or fail, and an optional `EXPECT:` string. No authority
  moves: the manager still runs the command and pastes the result, and the auditor
  still has no `Bash` — taking that away was deliberate and it stays away. What changes
  is that *which command counts as evidence* is written in the contract instead of
  living in the manager's memory at that moment. Exit code zero is the real condition;
  a non-zero exit never passes just because the error text contains the expected
  string. `EXPECT` is optional because string matching is brittle — output language
  changes, colour codes intrude — and making a brittle condition mandatory produces
  false failures. `CHECK` is required only at audit threshold `high` and above; below
  that it is free, because forcing a command onto every criterion of a small,
  cheap-to-undo job is ceremony, and ceremony gets skipped.

### Changed

- The `puşla` trigger also matches `pushla`. Three spellings, one word; a keyboard
  without the Turkish layout produces two of them and the user does not care which.

### Fixed

- Turkish dotted capital `İ` broke slug generation in `/log` and `/ozel`.
  `'İkinci'.toLowerCase()` yields `i` plus a combining dot (U+0307), not a bare `i`, so
  the name came out as `i-kinci` and `/log kapat ikinci` matched nothing. Both slug
  functions now decompose to NFD and drop combining marks.
- The open-log count read `process.cwd()`, which is where the hook happens to run and
  need not be the project — it would have counted another project's logs.

## [2.45.1] - 2026-08-23

### Added

- `/ozel` mirrors personal files — machine settings, rule book, local config, anything
  that cannot go in a public repo — into a single **private** repo, split per project.
  The whole repo is never downloaded: the clone is opened with `--filter=blob:none` so
  blobs stay on the server, and the working tree is laid out with `sparse-checkout` so
  only the current project's folder reaches disk. Ten projects can share the repo and
  this machine still only carries one folder; `/ozel projeler` lists the others by
  reading the tree, without fetching their contents, and `/ozel ac <ad>` adds one.
  Stored paths are portable by design — `~/…` for home, `./…` for the project root —
  because an absolute path works on the machine that wrote it and silently points at
  the wrong place everywhere else. The file list lives in the repo itself
  (`<proje>/ozel.json`), so a new machine restores it with `kur` + `cek` instead of
  being rebuilt by hand. `cek` never overwrites a differing local file without
  `--zorla`, and a deleted source file is skipped rather than dropping the backup.
  With no mirror configured every subcommand prints setup instructions and exits `0` —
  whoever installs the plugin gets their own repo, not mine.
- `/pusla` runs the whole push: tests, then the public repo, then `/ozel pusla`. The
  private step is unconditional and unprompted; with no mirror set up it prints one
  line and moves on. No command needs typing either — `relay-watch.js` sees the word
  `puşla`/`pusla` in a prompt and injects the flow, because leaving the second repo to
  the model's memory means it eventually gets skipped on the one turn nobody notices.
  The reminder only exists once a mirror is configured on the machine.
- `.github/FUNDING.yml` turns on GitHub's native Sponsor button on the repo page.

### Changed

- The `bitti` sound no longer hangs off the `Stop` hook. `Stop` fires several times in
  one turn — when the model asks a question and stops, when a contract closes blocked,
  at any intermediate pause — and a sound at those points stops meaning "finished". It
  now fires from the single place the `Total Süre` receipt is printed
  (`relay-watch.js` → `turBitir`), which already declines to print at intermediate
  stops. One decision now feeds both. Steering level `0` hides the receipt but keeps
  the sound: a sound is not a steering line.
- Writing `autoCompactWindow` now says that the new window is not live until Claude
  Code restarts, and that a value above 200000 is a ceiling rather than a guarantee —
  the effective window is whatever the model's context allows. Without those two lines
  `/premium premium` reports success while the number on screen stays put, and the
  command looks broken when it is not.

### Fixed

- `UserPromptSubmit` context is now appended rather than overwritten. Two hook paths
  writing in the same turn used `Object.assign` on `hookSpecificOutput`, so the second
  silently erased the first one's text.
- `/ozel` project keys are normalised through `realpath`. On Windows `os.tmpdir()`
  hands back an 8.3 short path while `git rev-parse` returns the long one, and
  `path.resolve` does not reconcile them; the project name would quietly fall back to
  the folder name.
- `git sparse-checkout set` writes the right patterns but does not lay a
  previously-excluded folder back on disk — the index calls the file present (`H`)
  while the working tree does not have it. `reapply` fixes it, but run in the same
  second as `set` it takes two passes. The result is now measured instead of guessed:
  a second `reapply` runs only when a folder that exists in `HEAD` is missing on disk.

## [2.44.0] - 2026-08-23

### Added

- `/beep` plays a short sound when a turn needs you (`Notification`), finishes (`Stop`),
  or fails (`StopFailure`). The sound goes straight to the audio device and never touches
  the OS notification system, so a focus mode that swallows the toast does not swallow
  this. The default route is `Media.SoundPlayer` plus a short wav, not `[console]::beep`:
  on a machine with no system-speaker driver `Beep()` returns exit code 0 and makes no
  sound at all, and a notification mechanism that fails silently is the worst kind.
  Defaults are `Windows Startup.wav` (0.22 s), `ding.wav` (0.40 s) and
  `Windows Default.wav` (0.41 s) — all under half a second, all on by default, no
  settings file required. `/beep dinle` plays all three so the install can be verified by
  ear; `/beep bitti off` is the one-line fix for someone sitting at the screen. Settings
  live in `~/.claude/teknesyum-beep.json`, with `<project>/.claude/teknesyum-beep.json`
  above it. The hook is registered from the plugin's own `hooks.json` with `async: true`,
  in a group of its own so it never sits behind the blocking relay hook, and it never
  returns non-zero and never prints.
- On first run `/beep` removes hand-added PowerShell sound hooks from
  `~/.claude/settings.json` under `Notification`, `Stop` and `StopFailure`, and says in
  one line what it removed. Left in place they would double every sound now that the
  plugin ships its own hook. Unrelated hooks in the same event are untouched.

### Changed

- **The scope contract of settings commands is inverted.** A bare command now writes the
  machine default; a trailing `this` writes only the current chat. `/premium` used to do
  the opposite — it wrote the session record whenever a session id was present, which is
  almost always, so the profile silently reverted in the next chat and the user only
  found out by noticing. What is rare is now what gets typed; what is common is not.
  Read order is unchanged and the session record still shadows the machine default:
  `TEKNESYUM_PREMIUM` → session → `teknesyum.json` → `normal`.
- Because the session record stays on top, a bare command run inside a chat that has a
  `this` setting changes the machine default and nothing visible happens here. Both
  `/premium` and `/beep` now print three lines in exactly that case: what the machine
  default became, what is still in force in this chat, and how to clear it. A new
  `this sil` subcommand does the clearing — it removes only that command's key and keeps
  everything else in the session record.
- **The auditor now runs against a rollback-cost threshold instead of a fixed rule.**
  The `audit` knob takes `off`, `very-critical`, `critical`, `high` or `every-contract`,
  and the profiles set it to `very-critical` (eco), `critical` (normal) and `high`
  (premium). Even on premium not every contract is audited unconditionally: simple work
  that is cheap to undo does not earn a review pass, and the auditor's care is spent
  where undoing the work is expensive. A contract's risk is read from a `risk:` line if
  it declares one, otherwise inferred from how many files it owns.
- The "write no code comments" rule is gone from the builder and ui-builder agents. It
  existed to save tokens while generating code, it was relative rather than absolute, and
  in practice it only caused confusion.
- **A fresh install no longer inherits anyone else's rules or taste.** The installer used
  to seed `~/.claude/RULES.md` with five personal rules, which then governed every project
  on that machine; it now creates the rulebook empty and the first rule arrives via
  `/rule`. The habits of whoever wrote the plugin are not binding on whoever installs it.
- **The neon UI standard is opt-in.** With no `teknesyum-ui.json` — the state of every
  fresh clone — the `teknesyum-ui` skill imposes nothing: no palette, no type scale, no
  signature. It was previously active by default, with `"kapali": true` as the way out;
  now the file's existence is the switch. The standard is offered instead: `/uisetup
  sablon` takes the neon template as it stands, `/uisetup kendim` builds your own from
  four questions, and `/uisetup kapat` declines for good. `ui-builder` checks the same
  gate before applying any token, and `/scan ui` says up front when it is measuring
  distance from a template rather than compliance with a standard. Anyone already running
  on the defaults keeps them by writing `{"kapali": false}` once.

### Fixed

- The turn receipt was printing the whole answer a second time. `Stop` runs after the
  answer is written, and anything returned through `additionalContext` reaches the model
  as new input, so the model re-emitted its answer with the receipt attached. The receipt
  now goes out over `systemMessage`, which prints directly and cannot cause a second
  pass. The cost is the unremovable `Stop says:` prefix, which `BILDIRIM_BICIMI = 'blok'`
  keeps on a line of its own. Both channels still work in code; only the default moved.
- The two blocking `Stop` warnings that ask for a missing heading now say explicitly not
  to rewrite the answer. A printed message cannot be taken back in Claude Code, so a
  correction that regenerates the answer leaves the first copy on screen; the model is
  told to print only the missing piece, short and separate.
- The scanner's CSS selector parser did not blank comments before extracting selectors,
  so a base rule declared under a comment was invisible to the lookup and its `:hover`
  variant was reported as missing a transition. Comments are now blanked in a
  newline-preserving way before the selector scan.
- The scrollbar thumb had a `box-shadow` and a background colour with no transition.

## [2.43.0] - 2026-08-22

### Added

- The active profile is now recorded per session instead of machine-wide. Two chats on
  the same machine can run different profiles: one `eco`, one `premium`, neither
  overwriting the other. The record lives in `<config>/teknesyum/oturumlar/<id>.json`,
  keyed by the session id the harness exports to the shell. With no session id the old
  behaviour is preserved exactly — the machine-wide config is written as the default.
- `/premium durum` now reports where the profile came from (`oturum` or `makine`) and
  flags any mismatch between the session profile, the agent files and the relay buttons,
  naming which numbers are the profile's and which are on disk.

### Fixed


- `/scan` measured the umbrella folder as if it were one project. Run from
  `Desktop/Projeler`, it reported 755 unreviewed files and 50 missing repo surveys —
  the sum of fifteen unrelated projects, an unclosable gap. The scan now stops before
  measuring, prints the sub-project list and exits 2, so the caller asks which project
  to certify instead of fanning out agents at the wrong root. `--kapsayici` overrides
  the gate for the rare case where the umbrella itself is the target.
- Umbrella detection was defeated by its own side effect: a session opened in the
  parent folder leaves a `.claude/relay` directory there, and that counted as a project
  marker, so `kapsayici.kok` returned null for exactly the folder it exists to catch.
  Added `kapsayici.kesin`, which asks for a *strong* marker (`.git`, `package.json`,
  `pyproject.toml`, `Cargo.toml`, `go.mod`, `.claude-plugin`, or a solution/project
  file) and requires at least two sub-projects. `kok` is unchanged; only the scan uses
  the strict measure for now.

### Known limits

- Reasoning effort cannot be isolated per session. The agent-spawn schema carries `model`
  but not `effort`, so effort is read only from the agent definition file, which is
  machine-wide. `/premium durum` states this on every run rather than implying full
  isolation. Model selection *is* isolated — a call-time model overrides the file.
- The agent files and `SETTINGS.md` are still written machine-wide. Until that changes,
  `durum` reports the mismatch instead of hiding it.

## [2.42.1] - 2026-08-22

### Fixed

- The debug line said `ajan ajanı, ana oturum` when the main session hit a tool error.
  `agent_type` is absent outside a subagent, so the role fell back to its default and got
  printed next to the word it was already standing in for. The main session has a name,
  not a role.

## [2.42.0] - 2026-08-22

### Added

- **`/scan` — a certificate against a profile.** `/scan <eco|normal|premium>` audits the
  project as it stands against one of the three profiles and reports what falls short:
  how many repositories of prior art were studied against the threshold of 1, 10 or 50;
  which source files have never been reviewed or were reviewed below the profile's model
  and effort; whether the finished contracts carry their seal; whether the required
  documents exist and agree with the version. The scan is read-only — no file is written,
  no agent is opened. It refuses to run without a profile, because a premium scan means
  fifty repositories and that should never start by accident. `--tamamla` does not change
  what the script does; it appends the list of work needed to close the gaps, and the work
  is the model's.
- **A durable coverage record, `.claude/relay/kapsam.json`.** Which file was last touched
  by which model at which effort, when, and by which agent. It is written when an agent
  finishes, from the file list already kept in its trace, and on every edit the main
  session makes — a file the main session opened and corrected has been reviewed just as
  surely as one an agent was given. The `live/` traces are swept after a day; this record
  is not, because a certificate has to answer for work done weeks ago. It is capped at
  4000 entries and drops the oldest, which is far above the source-file count of any one
  project.

### Changed

- The scan's thresholds are read from the same `DUGME` table that `/premium` writes the
  relay knobs from, rather than copied. A profile cannot mean one thing to the switch and
  another to the certificate.
- `oturumCalistir` in the test harness was reading the machine's real `~/.claude`
  configuration, so a session-save test passed or failed depending on which profile
  happened to be live. It now runs against the empty config directory the rest of the
  harness already uses.

## [2.41.0] - 2026-08-22

### Added

- **A third profile, `eco`.** There were two; there are now three — `premium`, `normal`,
  `eco` — and `/premium` moves between them. Eco is for the case where tokens genuinely are
  the constraint: every role on haiku, one agent at a time, the audit back to `critical`,
  prior art down to one repository, council and second opinion off. Effort stays at
  `medium` for the three roles that produce or verify code and drops to `low` everywhere
  else, because haiku already cuts the cost by an order of magnitude and taking the coding
  roles below that buys work which fails its acceptance criteria — the extra rounds cost
  more than the tokens saved. Model escalation stays on for the same reason.
- **An `advisor` agent.** The second opinion used to be a mode of `planner`, selected by a
  `GÖRÜŞ:` prefix on the briefing. It is its own agent now. The reason is a measured
  constraint: the `Agent` tool's schema carries `model` but not `effort`, so effort can only
  come from the agent definition's frontmatter — two modes in one file meant one effort for
  both. `advisor` runs at **low effort even on premium**, holds no write tool and declares
  no `memory`, and `planner` is left with the council alone.
- **The base tells you when a new version is out.** Until now it never did: the only way to
  find out was to go and look. At session start, once a day, the installed version is read
  from `installed_plugins.json` and compared against the highest tag on the remote, and a
  differing pair produces one line — which version is out and what to do about it. The
  comparison is numeric per component, so `2.10.0` sits above `2.9.0`; comparing the strings
  puts it below. The marketplace copy is already a git clone, so the question costs one
  `git ls-remote --tags origin` against it rather than a refresh of the clone — reading only
  the cached copy would be wrong, since it goes stale until `claude plugin marketplace
  update` runs.
- **`/update` asks on demand.** It skips the daily stamp, reports both versions, and when
  they differ hands over `claude plugin update teknesyum@teknesyum` as one copyable line.
  The marketplace name is not optional — `claude plugin update teknesyum` reports "not
  found". It also repeats the thing that is easy to lose: an update resets agent files to
  the profile defaults, so `premium` and `eco` users need `/premium <profile>` afterwards.
- **Silence when the check cannot be made.** The call is capped at two seconds and every
  failure — no network, no git, no repository, unreachable remote — returns empty and prints
  nothing. Saying "could not check" at every session start is noise, and a user on a plane
  should not be handed an error; the absence of the line is therefore not a claim that you
  are up to date. A stamp file under the machine-level trace folder keeps the check to once
  a day, and a fresh stamp means no network call at all. The stamp is written *before* the
  call rather than after, so an offline machine pays the timeout once a day instead of once
  per session start.

### Changed

- **Prior art drops to one repository on eco**, from five. Prior art is one of the most
  expensive items in a session — every repository is a `scout` agent's worth of budget, and
  agent count is the one thing eco actually constrains. A single repository still answers
  *how has somebody else solved this*; five contradicts the profile it sits in.
- **The prior-art gate warns instead of blocking on eco.** `contract-guard.js` now reads
  `profil()` and, on eco only, lets the first contract through with a one-line warning and
  appends the skip to `.claude/relay/live/_sorun.log`. Normal and premium still block. The
  rule did not bend, its carrier moved: a warning scrolls out of view and is not a record,
  the log line is, and the manager reads that file every round. The hook records *what* was
  skipped; the `docs/taramalar/ATLANDI.md` line is still owed because only the manager can
  record *why*.
- **The relay skill describes eco.** It described premium and left eco as a table of values.
  Added: which profile to pick and when, how the manager behaves on eco (grep before read,
  no `Explore`, one agent by default, short answers, deterministic tools before the model),
  and what does **not** change — the audit (`critical` is a floor, not a target), the seal
  gate, `owns` discipline and acceptance criteria. §0's ordering of principles is now
  stated as inverting on eco: tokens come first there, where elsewhere they are a budget.
  Eco users were reading two instructions that contradicted each other.
- **Contract and plan templates shorten on eco.** Not by splitting the template in two — one
  template stays and the manager drops sections while filling it. `## Amaç` goes when the
  title and acceptance criteria already say it, `## Arayüzler` only when `depends` is empty,
  along with an empty `side_effects` and the trailing explanatory comment; the plan loses its
  ASCII task graph, whose information the `Bağımlı` column already carries. `id`, `status`,
  `owns`, the seal fields, `## Kabul kriteri`, `## Kayıt noktası` and `## Çıktı` never drop —
  correctness and interrupted-session recovery come from those.
- **`standart` is now `normal`.** Same values, new name. Old calls keep working: `/premium
  kapat` and `off` land on `normal`, `ac`/`aç`/`on` on `premium`, and `standart` is still
  accepted.
- **The parallel ceiling on premium is 20, not 6.** The cap is not there for tokens: with
  `worktree_isolation` on, every agent is a repo copy and a process, and if the manager
  enters a bad loop the cap is the safety net. Twenty covers "as many as it takes" in
  practice. How many to open is the manager's call and **the measure is wall-clock time, not
  tokens** — leaving splittable work unsplit is what now needs a reason. Eco caps at 1,
  normal stays at 2.
- **The second opinion has nine triggers, not five.** Added: a finding that cannot be shown
  to be a bug because no reproduction step, failing test or log line can be written for it;
  two agent reports that disagree about the same file or measurement with no run that
  settles it; an acceptance criterion with no command that makes it pass or fail; and any
  expensive-to-undo release step. Every trigger names a missing or conflicting artifact on
  purpose — one phrased as "when you are unsure" either never fires or always fires. More
  triggers is why the consultation had to get cheaper, not a coincidence beside it.
- **`~/.claude/teknesyum.json` carries a `profil` field** holding `eco`, `normal` or
  `premium`. Installs that predate it carry a boolean `premium`; that is read as `premium`
  when true and `normal` otherwise. Both fields are written from then on, so a hook reading
  the old flag keeps working and `true` still means premium.

## [2.39.0] - 2026-08-22

### Added

- **Agent health.** Six agents run in parallel and one of them can spin without anyone
  noticing. The watcher now reads what it was already recording: an agent whose `last_seen`
  is older than `agent_stall` minutes with no `SubagentStop` is **stuck**, and one whose
  `last_action` repeats `agent_loop` times while its transcript keeps growing is **looping**.
  Both reach the main session on one line and land in `live/_sorun.log`. A hook cannot stop
  a subagent — the report says so, and the decision to stop belongs to the main session with
  `TaskStop`.
- **A debug channel.** With `debug` on, an agent that fails or stops unexpectedly says so on
  a `Teknesyum ▸ Debug ▸ …` line. It is the same detection that feeds the health check
  rather than a second path beside it, and it is silent when `debug` is off — the health
  check is not.
- **A turn summary.** Every turn closes with `Total Süre: 3dk 35sn // Tahmini Token: ~5000`.
  The time is stamped by the hook between `UserPromptSubmit` and `Stop`. The token figure
  comes from how much the transcript files grew, main session and subagents together,
  divided by four — the line already says `~`, so the estimate is the contract and there is
  no parsing. The health scan stats the same files.
- `agent_stall` and `agent_loop` knobs, identical on both profiles: ten minutes of silence,
  five repeats of the same action.

### Changed

- **Opening an agent is a call to make, not permission to wait for.** The skill read as
  though agents were something the user authorises. On the premium profile going parallel is
  now the default and going with a single agent needs a reason. The sizing table is
  unchanged — what changed is the hesitation above the threshold.
- **Agents are named `<Model>-<Job>`** — `Opus-Ajan Sağlığı ve Tur Özeti`. Each word is
  capitalised and short conjunctions stay lower. This does not collide with the sentence-case
  rule for headings and filenames; both are written down now so the next session does not
  fold one into the other. The dispatch line keeps printing the `model` parameter separately:
  the name is free text, the parameter is what actually got dispatched, and a divergence
  between them is worth seeing.
- **Asking for a plan is the fifth trigger for the second opinion.** The skill now says
  plainly where the council ends and the check begins: the council opens two members for
  `PLAN.md` on a from-scratch project, the check is one member on `fable` whenever the user
  asks for a plan.

### Fixed

- Everything writing to stdout collects into one body that `ciktiBas()` writes once. A `Stop`
  that both blocks and summarises used to produce two JSON documents that corrupted each
  other.


### Added

- **Agent names carry the model.** An agent is now called `<Model>-<Job Name>` —
  `Fable-Kanca Sızıntıları`, `Opus-Ajan Sağlığı ve Tur Özeti`. The model is capitalised,
  every word of the job name is capitalised, and short conjunctions stay lowercase. A list
  of running agents now says which weight is on which job before any record is opened. The
  rule is written down as a *label* rule so the next session does not try to reconcile it
  with the sentence-case rule that governs document titles and filenames; they govern
  different things. The dispatch line keeps printing the `model` parameter beside the name,
  because the name is free text and the parameter is what actually ran — printing both
  turns a repeat into a check.
- **A plan gets a second opinion.** Producing a plan is the fifth trigger for
  `second_opinion`: when the user asks for a plan on premium, `fable` returns a short check
  before the plan is handed over. It is not the plan council — the council opens once on a
  from-scratch project with two members and a full proposal each, while this is one member
  and at most twenty lines, every time a plan is asked for. Where a from-scratch `PLAN.md`
  goes through the council, no separate check is taken.

### Changed

- **Opening an agent is a judgement call, not a permission request.** Nothing ever held
  agents back until the user asked for one, but the wording left room to read it that way.
  The threshold section now says it outright: the manager decides on the size of the job,
  and an explicit request from the user is simply honoured. The sizing table is unchanged —
  a small job stays a small job; what changed is not hesitating above the line.
- **On premium, parallel is the default and running alone needs a reason.** The behaviour
  note used to say "lower the delegation threshold", which is true but too soft for a
  profile whose binding constraint is wall-clock time rather than tokens. It now says to
  split the work and run five or ten agents at once, and reserves the single agent for jobs
  that really are small.

## [2.38.0] - 2026-08-22

### Added

- **Second opinion.** With `second_opinion` on — the premium default — the manager no longer
  guesses alone at a node where it does not know the right call. It opens the `planner`
  agent in **opinion mode** with a briefing that starts with `GÖRÜŞ:`, and `fable` answers
  under three headings in at most twenty lines: the call it would make, at most three
  reasons, and what the asker missed. The third heading is the point of the feature; the
  first two often only confirm what the manager already thought. One member and one
  question, where the plan council is two members and a whole plan.
  It fires on four occasions and no others: a choice that is expensive to undo, a bug
  unsolved for three rounds with the root cause still unclear, a rule about to be broken,
  and a request that reads two ways. Asking the user comes first — the opinion replaces a
  guess, never a question, and only applies where `ask_threshold` does not allow asking.
  It binds nothing: a manager that disagrees writes down why, and the user is told an
  opinion was taken with a `Teknesyum ▸ Görüş ▸ …` line.
- `second_opinion` knob in `skills/relay/SETTINGS.md` — `off` on the standard profile, `on`
  for premium — written by `/premium` together with `plan_council` and `research_repos`.

### Changed

- The `planner` agent has two modes instead of one, chosen by the briefing: `GÖRÜŞ:` selects
  opinion mode, anything else stays council mode. It still holds no write tool in either.
- The premium behaviour note and the session-start line mention the second opinion; the
  `/premium` output and `durum` report the new knob next to the council.


- **One relay root, one git probe, one config root.** Finding the relay root existed three
  times under three names, and `gitSor` differed between the two hooks: one trimmed a
  trailing `.git` conditionally, the other always went up a directory. Outside the standard
  `<root>/.git` layout those land in different places, so the guard could protect contracts
  the watcher never looked at. The conditional trim wins — failing to find a root is
  recoverable, guarding a stranger's directory is not. The shared helpers live in
  `hooks/ortak.js`.
- **Transcript paths honour `CLAUDE_CONFIG_DIR`.** `/save`, `/load`, `/saveall`, `/loadall`
  and the "previous session" notice went through `os.homedir()`, so they were broken for
  anyone who had moved their config directory. The tests overrode `USERPROFILE` and never
  saw it.
- The declared model and effort are compared against what actually ran, closing a promise
  the comment above `kimlikOku` had been making since it was written; a mismatch reaches
  `_sorun.log`. A model named at call time counts as the declaration, since `Agent`'s
  `model` field overrides the definition.
- `kok()` and `projeMi()` cache per process the way `gitBilgisi` already did — the container
  check ran a `readdirSync` plus three `existsSync` per subdirectory on every single tool
  call.
- Prior-art scans live under `docs/taramalar/`, where the skill says scan output belongs.
- `uicheckup.js` and `uicheckup-apply.js` use Turkish identifiers like every other script in
  the repo, and the install scripts speak English to the user like every other outward-facing
  surface. Flags, JSON field names and output strings are untouched — both `--help` outputs
  are byte-identical.

### Fixed

- **The auditor's "cannot write" guarantee was documentation, not enforcement.**
  `agents/auditor.md` asks for `Read, Grep, Glob, LSP`, but the harness was measured
  opening that agent with `Write` and `Edit` added; the same drift hit `planner` (+Write,
  +Edit) and `scout` (+Edit). The one thing the three shared was a `memory: project` field —
  a declared tool list is a floor for the harness, not a ceiling. The old test only read the
  `tools:` line out of the file, so it stayed green while the guarantee was gone.
  `memory: project` is now removed from `auditor` and `planner` (agents that legitimately
  write keep theirs), and the `README` and `SKILL.md` sentences that sold the tool list as a
  harness guarantee now say what actually holds.
- **The `done/` seal was checked for shape, not for truth.** `contract-guard.js` only asked
  whether `audit`, `auditor_id`, `diff` and `verification` were non-empty, so an agent could
  invent four lines and move its own contract into `done/`. The gate now verifies them
  against the `live/` records the hooks already write: `auditor_id` must resolve to an
  existing record whose `agent_type` is `auditor` and whose `files` list is **empty** — an
  auditor that wrote a single file voids its own audit regardless of the tools it was given —
  and `diff` must carry a file list that intersects the contract's `owns`. When `live/`
  cannot be read or the record is missing, the gate falls open to the old format check so
  contracts moved by hand outside the relay are not locked out, and writes what it could not
  verify to `live/_sorun.log`.


- **`/load` handed back the wrong chat's session.** `SON.json` has kept a per-session
  pointer since 2.30.0 and nothing ever read it, so `kayitSec` returned whichever record
  was newest. With two chats open in one project, the record you got was as likely to be
  the other one's. It now resolves `CLAUDE_CODE_SESSION_ID` against the pointer table and
  falls back to the newest record when there is none. The test asserted that two keys
  existed in the file rather than which record came back.
- **The container tests littered the repository.** `konfig()` returns an env object and two
  tests wrapped it a second time, so the hook received the string `[object Object]` as its
  config directory, resolved it relative to the repo root and created a directory there —
  which had been committed and churned on every run. Those tests were also not exercising
  the config they claimed to. CI now fails when a test run leaves anything behind.
- **The debug log grew forever in exactly the projects that use the plugin.** `supur()` only
  ran when no relay was installed. It now runs everywhere behind an hourly stamp, leaves the
  project's own `live/` alone and spares `kullanim.json` — sweeping a cumulative counter
  erases what it measures. The log is capped and trimmed to its last thousand lines.
- `genelKok()` resolved through `izYolu`, which appends the worktree segment, so a session
  opened in a worktree started its reminder counter from zero and split the usage stats.
- The `CLAUDE.md` router rule only ran on `Write`; a body could be edited into an existing
  file without the gate seeing it.
- Agent memory moves appended a fixed `-2` suffix, so a third file with the same name
  silently overwrote the second.
- `.claude/agent-memory/` was outside `.gitignore`; every agent runs with `memory: project`,
  so the first write dropped an untracked directory into the tree.
- Steering-line examples in `skills/relay/SKILL.md` and `SETTINGS.md` still taught the format
  `613d59b` replaced, so the skill and the hook were teaching the model two different shapes.
  One example also contradicted the premium profile by escalating haiku to sonnet.
- A closed route kept re-entering context after every compaction. Routes carry a `Durum`
  field now and `sikismaSonrasi` skips the closed ones.

### Removed

- Dead `canonicalDone()` and `CONTRACT_DIZIN` in `contract-guard.js`.

## [2.37.0] - 2026-08-22

### Added

- **Plan council.** With `plan_council` on — the premium default — the plan stops being one
  model's work. Once the prior-art research is in, the manager opens two `planner` agents
  on the same briefing, one `fable` and one `opus`. Neither builds anything: the new
  `planner` agent holds `Read`, `Grep`, `Glob`, `LSP`, `WebSearch` and `WebFetch` and no
  write tool at all, so the side that designs the work cannot start it. Each returns a
  proposal under five headings; the manager synthesises, records every divergence in
  `PLAN.md` under a `Konsey ayrışması` heading with the reason for the choice, and keeps
  the pen. What is delegated is the generation of options, never the decision — the rule
  that planning is never delegated still stands.
- `plan_council` and `research_repos` knobs in `skills/relay/SETTINGS.md`, both written by
  `/premium` together with the agent frontmatter and the machine-level flag.

### Changed

- **Prior art scales with the profile.** The research gate asked for at least 10
  repositories regardless of budget. It now reads `research_repos`: 10 on the standard
  profile, 50 on premium. Depth is unchanged — every scan file carries the same six
  headings — but fifty repositories are read in waves, and each wave prunes the next
  wave's candidate list with the reason written into `RAPOR.md`.
- The premium behaviour note injected into the first prompts now also opens the council and
  states the 50-repository ceiling; the session-start line reports the council members.
- `/premium durum` reads the two new knobs out of `SETTINGS.md` rather than inferring them,
  so a half-applied profile shows up as what it is.
- `premium()` had been implemented twice, in `relay-watch.js` and inside the premium
  script's own view of the world; it now lives in `hooks/dil.js` and both hooks read it
  from there.

### Fixed

- Two container tests wrapped `konfig()` — which already returns an env object — in a
  second `{ CLAUDE_CONFIG_DIR: ... }`, so the hook received the literal string
  `[object Object]` as its config directory. The hook then resolved a relative path and
  wrote `[object Object]/teknesyum/live/` into the repository root, where it had been
  committed and kept churning on every run. The tests were also not exercising the config
  they claimed to. Both call sites now pass the object through, and the stray directory is
  gone from the tree.

## [2.36.1] - 2026-08-22

### Fixed

- A session that opened and was never used leaves a 0-byte transcript behind, and being
  the newest file it won it: `/saveall` wrote an empty record and `/load son` would have
  handed back nothing. Transcripts with no body are skipped.

## [2.36.0] - 2026-08-22

### Changed

- `/loadall` now prints a block per project instead of a compressed table: the folder
  path, the state, and a **continuation prompt** in a copyable code block, generated from
  what the project says on disk — which record to open, which contracts wait, whether the
  working tree is dirty. Ten projects means ten blocks, each pasteable straight into that
  project's session.

## [2.35.0] - 2026-08-22

### Added

- `/saveall` saves every project's last session into that project's own
  `.claude/oturumlar/`, using the same folder exclusion rule as `/rcall`. The records
  folder now gitignores itself, so a multi-megabyte transcript never reaches a repository
  — this applies to plain `/save` as well.
- `/loadall` puts the whole fleet on one screen: per project the git state, the open
  contracts with their status, when the last session ran, whether it has a record, and the
  last relay log line. It is a state overview, not a context dump — the conversation of a
  single project is still `/load` or `/load son` inside it.

## [2.34.0] - 2026-08-20

### Added

- `/load son` picks the project's previous session up straight from its transcript, with
  no record involved. A remote-control window that closes, a crash, or a forgotten `/save`
  used to end the thread there; the transcript was on disk the whole time. A bare `/load`
  falls through to the same path when the project has no records at all.
- The start-up line now says when there is a recent session to pick up: with open
  contracts and a transcript from another session in the last week, it reports how long ago
  it ran and that `/load son` will read it.

## [2.33.0] - 2026-08-20

### Added

- The base now covers sessions opened one folder too high. When the session root is a
  container — not a project itself, but holding projects — `kapsayici.js` follows which
  project the touched files belong to, and at the end of every turn moves the agent memory
  that piled up in `<parent>/.claude/agent-memory` into that project, merging the
  `MEMORY.md` index rather than overwriting it. The active project is injected into the
  model context as well, so `/save`, `/rc`, the map and the relay take the project root
  instead of the folder above it. Sessions opened on a project are untouched.

## [2.32.0] - 2026-08-20

### Added

- `/rcall` puts every project in the parent folder on remote control, one window each.
  Folders whose name starts with `!`, `.` or `_` — archived and finished work — are left
  out, as is anything listed under `rcAtla` in `~/.claude/teknesyum.json`. Twelve windows
  by default, `/rcall tavan 30` for more.
- `/rcadvanced` opens remote control with the choices left to the user: spawn mode,
  permission mode, capacity, session name, and the `metin` / `kaydetme` options that used
  to sit on `/rc`.

### Changed

- `/rc` no longer produces any questions. The client asked two on start-up — whether to
  enable remote control and which spawn mode to use; the command now answers both before
  opening the window (`remoteDialogSeen` and the project's `remoteControlSpawnMode` in
  `~/.claude.json`, plus an explicit `--spawn same-dir`).
- The `/rc` surface is down to the errand itself: `/rc` and `/rc kur`. `metin` and
  `kaydetme` moved to `/rcadvanced`; the copy-pasteable fallback line still prints on its
  own whenever a window cannot be opened.

### Fixed

- The License badge box was twice as wide as its text and the Support hearts were hollow
  outlines. Both badges now hug their text, the hearts are filled, and Support sits left
  of License at the top of the README as it already did at the bottom.

## [2.31.1] - 2026-08-20

### Fixed

- `/save` (and the save `/rc` runs first) failed with `oturum bulunamadı` when the session
  was opened in a parent folder and the work happens in a subproject: the transcript lives
  under the folder the session started in, not under the project being saved. With the
  session id in hand, the record now finds it wherever it is.

## [2.31.0] - 2026-08-20

### Added

- `/rc`: opens a Remote Control session for the current project so it can be driven from a
  phone. The desktop app has no control for this yet, so the command runs the whole errand
  — it locates the terminal client (`/rc kur` installs it when missing), refuses versions
  older than 2.1.196, saves the current chat, opens a terminal window in the project root
  and starts `claude remote-control` named after the folder. What is left for the user is
  one tap in the Claude app's Code tab, and `/load <record>` to continue the same
  conversation rather than starting a new one. When no window can be opened, the command
  prints a single copy-pasteable line instead of a set of instructions.
  The command is deliberately temporary: it is removed once the desktop app gains its own
  remote-control control.

## [2.30.0] - 2026-08-20

### Fixed

- Several chats can now work in one project without their records colliding. Which
  transcript belongs to the running chat is read from the environment instead of guessed
  from the newest file on disk — with two chats open, the newest file was as likely to be
  the other one's. An unnamed record carries the session id next to the date, and writing
  over a record another chat owns is refused unless `--ustune` says so.
- The pointer file keeps one entry per session instead of a single "latest", so one chat
  saving no longer erases another's trail.

### Changed

- `/load` always prints an index of every record first — name, time, session id, turns —
  with the opened one marked, so a load cannot silently hide that another chat has a
  record waiting. `/load hepsi` opens all of them.

## [2.29.0] - 2026-08-20

### Added

- `/premium`: a profile for the Max 20x plan, switched in one move rather than knob by
  knob. Agent frontmatter, the relay knobs in `SETTINGS.md` and the `premium` flag in
  `~/.claude/teknesyum.json` are written together — a profile that only half applies is
  worse than either half, and `/premium durum` reports the mismatch when a plugin update
  reverts the agent files.
- The premium profile drops sonnet and haiku entirely: every role runs opus and the
  difference between roles moves to the effort — `xhigh` for code and audit, `high` for
  research, `low` for mechanical bulk work. Parallel width goes from 2 to 6, worktree
  isolation comes on, model escalation goes off because there is nothing left to escalate
  to.
- While the profile is on, the session start prints `Teknesyum ▸ premium mod` and the
  first two prompts carry a behaviour note: open the parallelism, do not fall back to
  sonnet, do not treat token thrift as a reason. `TEKNESYUM_PREMIUM=1|0` overrides for one
  session without touching disk.

## [2.28.0] - 2026-08-20

### Changed

- The steering lines now read as a labelled block: `Teknesyum ▸ Size ▸ …` and
  `Teknesyum ▸ Diff ▸ …`. The label is capitalised, `▸` separates it from the sentence
  instead of a middle dot, and the sentence itself is ordinary case rather than all
  lowercase.

### Added

- `/save` and `/load`: the conversation itself can now be carried into a new session, not
  only the contracts relay already resumes. A record is four files under
  `<project>/.claude/oturumlar/<name>/` — `ham.jsonl` (the transcript, byte for byte),
  `ozet.md` (the digest `/load` reads back: every turn, tool calls as name plus target,
  last ten turns long and older ones trimmed), `durum.json` (session id, model, context
  usage, git HEAD and dirty files, open contracts, message queue, unsent text) and
  `calisma.diff` (the dirty working tree at save time, untracked files included).
- The text typed into the input box but never submitted is part of the record. Claude Code
  keeps a 200-character preview of it, so the record holds that much and says so; messages
  queued while Claude was working are kept in full.
- `/load` reads the record against the repo as it stands and warns when `git HEAD` has
  moved, when the record came from another project root, or when a patch is stored. The
  patch is never applied on its own.

## [2.27.0] - 2026-08-20

### Added

- `AGENTS.md` is now enforced, not just recommended: writing a `CLAUDE.md` with a body is
  blocked, and the hook explains that the pointer file is `AGENTS.md` with a one-line
  `CLAUDE.md` (`@AGENTS.md`) beside it. Claude Code is not the only tool reading a project.

### Changed

- `Teknesyum ▸` lines are printed inside backticks so they render as a block instead of
  disappearing into the surrounding prose, and their wording moved to everyday language:
  what was done first, then what a plain session would have done, separated by a dash.
  No arrows, no shorthand, no stacked jargon.

## [2.26.0] - 2026-08-20

### Added

- Language setting: `dil` in `~/.claude/teknesyum.json` is `en` (default) or `tr`, asked by
  `/setup`, overridable per session with `TEKNESYUM_DIL`. One field governs both the
  notifications you see and the language agents write to each other in — contracts,
  reports, checkpoints and block messages.
- `live/_sorun.log`: every failed tool call is recorded by the hook, and agents append a
  line whenever they hit a missing file, an unreadable path or an ambiguous instruction.
  The log is kept even with debug off, its size is announced at session start, and the
  manager reads it each round. Falling back to a default is allowed; falling back silently
  is not.
- A `Senden istediklerim` floor: if an answer reports that work is paused (usage limit,
  a pending decision) without a numbered list of what the user should do, the `Stop` hook
  blocks it.
- Prior-art gate widened: it now also guards the first `PLAN.md` write, and a from-scratch
  request triggers a prompt-time reminder. Two projects started as “just make a plan” and
  the 10+ repository scan never ran, because the gate only watched the first contract.
- A plain-language communication section in all five agents: write flat sentences, and
  never pass over an unexpected situation in silence.

### Changed

- `uicheckup` scan rules: the uppercase rule now only looks at visible text (JSX text
  nodes and labelled attributes) instead of every capital letter run, the colour rule
  measures palette conformance instead of three hardcoded greys, a type-scale rule was
  added, findings are capped at 200 with the remainder counted in `truncated`, and only
  the catalog rules actually referenced are printed.
- Neon support blocks in the README: GitHub strips inline styles, so the plain HTML boxes
  were replaced with palette-token SVGs (`assets/badge-license.svg`,
  `assets/badge-sponsor.svg`, `assets/support.svg`).

### Fixed

- `submitted → active` was blocked as a regression although `protocol.md` §2 documents it
  as the fix-round transition; the transition is now allowed, on the condition that the
  checkpoint no longer claims the contract is finished.
- `open → submitted` is blocked: skipping `active` makes a contract look like nobody is
  working on it, and recovery cannot find the half-done work.
- `platform-denetim.js` reported “0 files · 0 findings” for a path that does not exist,
  which looked identical to a clean project; it now fails with `yol yok` and exit code 2.
- Two `ÖLÇÜLDÜ` notes in `relay-watch.js` claimed sub-agent tool events do not reach the
  hook. Measured: 207 of 472 `PostToolUse` events carry `agent_id`. Both were rewritten.

## [2.25.0] - 2026-08-20

### Added

- Product standards (`skills/relay/references/standartlar.md`, summarised in relay SKILL
  1.5): a new project targets Windows, macOS and Linux by default; an existing project is
  asked once before anything is migrated, and a `no` is recorded in that project's
  `.claude/teknesyum.json` as `platformlar` + `platformNeden`. Programs check for updates
  once a day off the startup path, notify by default, and install silently only against a
  verified SHA-256 — never when installed through a package manager, which owns updates.
- `scripts/platform-denetim.js`: deterministic portability audit — embedded drive letters
  and home directories, shell invocations, Windows-only target frameworks, case-colliding
  filenames, missing CI matrix legs. `--kati` exits non-zero on findings and runs in CI.
- `/uicheckup` performs a deterministic, write-free UI scan and hands an explicitly approved
  plan to `ui-builder`/`relay` as a verified manifest. Tests cover scan digests, the
  approval gate, stale plans, manifest validation and path traversal.
- CI matrix gained `macos-latest`.

### Fixed

- New-work routing no longer carries one session's contract ids. The hook shipped with `T9`
  and `T5` and the word "support" written into it, so every other project was advised about
  contracts it never had. Routing now matches file ownership only — a contract with a
  similar-sounding title does not claim unrelated work.
- The return-block floor counts `active` and `submitted` contracts again. An `open` contract
  has not been dispatched yet, and was forcing a return block at every session end.
- `git rev-parse` results are cached per hook process. Two processes were spawned on every
  tool call in projects whose relay root is resolved through git.
- UI checkup plans can no longer be applied after their files or digests change.
- `package.json` and the plugin manifest are asserted to carry the same version; they had
  drifted apart.

## [2.23.0] - 2026-08-19

### Added

- Three-level steering, read from `steering` in `~/.claude/teknesyum.json`. `0` prints no
  `Teknesyum ▸` line at all, `1` keeps the basic ones (default), `2` adds a
  `Teknesyum ▸ fark · …` line wherever the base changed the outcome — work split across
  agents, a deterministic tool chosen over a model call, an auditor rejection, a hook gate
  firing. `TEKNESYUM_STEERING` overrides for one session; `TEKNESYUM_SESSIZ=1` still equals
  level `0`.
- `/setup` now asks for the steering level (default `1`) and for the UI standard — keep the
  defaults, customize it, or switch it off entirely.
- Logo, banner and relay-flow diagram under `assets/`, drawn with the UI standard palette
  only, and placed in the README.

### Changed

- `relay` SKILL 7.2 documents the difference lines and, more importantly, when not to write
  one. Test count 82 → 86.

## [2.22.0] - 2026-08-19

### Added

- Prior-art research is now a required phase before the first contract of a
  from-scratch project (relay `SKILL.md` 1.4). At least ten comparable repos are split
  across parallel `scout` agents, each writing one `docs/taramalar/<name>.md` under six
  fixed headings; the boss merges them into `docs/taramalar/RAPOR.md` as adopted,
  deliberately rejected, and suspicious. Nothing is copied — patterns, boundaries and
  mistakes are, source lines are not. Whole-project adoption is only ever a library
  decision, and that goes to the user.
- New `scout` agent: web + `gh api` research, no Edit tool, writes only under
  `docs/taramalar/`. Unverifiable numbers must be tagged as such; archived repos stay in
  scope, since "abandoned" warns against depending on a project, not against reading it.
- The gate is mechanical: writing the first contract of a project that has never
  finished any work and holds fewer than ten source files is blocked until the research
  exists. Skipping is allowed with a one-line reason in `docs/taramalar/ATLANDI.md` —
  skipping silently is not.


## [2.21.0] - 2026-08-19

### Added

- The handoff rule had a ceiling but no floor: an oversized copyable block was blocked,
  yet a worker that finished its job could close without handing back anything at all.
  While a packet or contract is open, a message that announces completion no longer
  closes without a return block — the `Stop` hook sends it back with the required shape.
- The return block moved into `SKILL.md` (7.1), which is always loaded. It previously
  lived only in `references/multi-session.md`, a file read only in multi-session mode,
  so a plain worker session never saw the rule.


## [2.20.0] - 2026-08-19

### Added

- `scripts/harita.js` — deterministic dependency map. Reads import/require/using lines
  straight from source and emits `.claude/harita.md` + `harita.json`: hubs, cycles,
  orphans, file-to-file edges. No model call, no parser install; a 123-file project
  takes seconds and produces ~9 kB. C# `using` resolves to a namespace node rather than
  a single file, because binding a namespace to one file produced fake edges.
- Rule: at ~30+ source files, or when a job touches 3+ modules, build the map before
  opening files. `graphify` keeps its place for understanding a foreign codebase; the
  map answers "what breaks if I touch this" inside your own.
- Rule: every contract starts on a fresh agent; the one exception is two consecutive
  contracts over the same files, which continue the same agent. The auditor is never
  continued.
- `docs/kararlar/yerel-llm.md` — analysis of running a local model for grunt work.

### Changed

- Folder signposts are now `AGENTS.md`, with a one-line `CLAUDE.md` next to them holding
  `@AGENTS.md`. The content lives in the file every tool reads; the second file is one
  line. Template renamed to `folder-agents.template.md`.


## [2.19.0] - 2026-08-19

### Added

- Post-write syntax check. After a `.js`/`.json` write the hook parses the file and
  feeds the parse error straight back, instead of letting a broken file sit until the
  auditor's turn. ESM sources and comment-bearing `tsconfig`/`.vscode` JSON are exempt.
- Contract status ladder is now mechanically one-way: `open -> active -> submitted ->
  done`. Writing a lower status over a higher one is blocked, so a correction round can
  no longer reset the audit queue. `blocked` stays reachable from and to any state.


## [2.18.0] - 2026-08-19

### Added

- Handoff protocol is now two-directional. The worker's return line is capped the same
  way the outbound packet is: report bodies go to a file, only a pointer crosses the chat
  (`relay/references/multi-session.md` 5.1, 5.2).
- Four more hook events wired, eleven in total: `PostCompact`, `SessionEnd`,
  `StopFailure`, `PostToolUseFailure`.
- `PostCompact` feeds open contracts, the route position and unfinished agents back into
  the freshly compacted context, so a compaction no longer costs the session its place.
- `SessionEnd` seals every unfinished agent record instead of leaving it to look alive.
- `StopFailure` records the interruption (rate limit, overload, auth) in
  `live/_kesinti.json`; `/report` prints it.
- `PostToolUseFailure` writes the failing tool and error type to the agent record and
  does not count the attempt as a step, so progress bars stop overstating.
- The agent's real model and effort are captured at `SubagentStop` from the payload and
  the transcript. `/report` flags a divergence between the declared `model:`/`effort:`
  and what actually ran.
- Lightweight usage counter (`kullanim.json`) for commands, skills and agents.
- `CHANGELOG.md`, `biome.json`, and a lint job in CI.

### Changed

- CI runs on Windows as well as Ubuntu.
- Statusline shows effort next to the model, and per-agent model/effort.
- Plugin and package descriptions were mojibake; re-encoded.

### Fixed

- `contract-guard` treated a `>` inside prose as a shell redirect and blocked innocent
  writes; the redirect is now anchored and the write verb is scoped to the pipeline
  segment that actually mentions `contracts/done/`.
- `git rev-parse` in the statusline had no timeout and could hang the whole line.

### Removed

- Legacy `teknesyum-debug` telemetry hooks (seven events) from user settings.


## [2.17.0] - 2026-08-19

### Added
- Handoff guard now covers the return direction: printing a report body in chat is
  blocked, and the worker hands back at most five lines pointing at the report file
  (`multi-session.md` §5.1).
- Handoff guard rejects the "written to be copied" anti-pattern — a copy instruction
  followed by a block of 25 lines or more.
- Agent traces record the model and effort level each agent actually ran at, read from
  the agent transcript and from the `effort` field carried by every hook payload.
- Status line shows the session effort level next to the model, and each agent's model
  and effort next to its name.
- CI runs on `windows-latest` in addition to `ubuntu-latest`.
- This changelog.

### Fixed
- Plugin and package descriptions were double-encoded UTF-8 and rendered as mojibake in
  the plugin list.
- `git rev-parse` in the status line had no timeout; a locked or network-backed
  repository could hang the whole line. Capped at 400 ms.

## [2.16.1] - 2026-08-18

### Fixed
- Test runner read the user's real `~/.claude` directory, so a local `debug: true`
  setting could pass or fail tests depending on the machine. Runs are now isolated.

## [2.16.0] - 2026-08-18

### Added
- Debug mode, switchable from `~/.claude/teknesyum.json` (`"debug": true`) as well as
  the `TEKNESYUM_DEBUG` environment variable, writing a hook event log.
- Status line marks an agent as lost when it has been silent for ten minutes without
  reporting a stop reason.

### Fixed
- Merging a transcript-keyed trace into an agent-keyed one copied the previous agent's
  lifecycle fields, which made `ended` appear before `started`.
- A record that had been marked finished is reopened when a further event arrives.
