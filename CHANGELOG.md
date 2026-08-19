# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
