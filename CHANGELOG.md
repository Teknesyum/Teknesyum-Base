# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.28.0] - 2026-08-20

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
