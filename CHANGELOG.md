# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
