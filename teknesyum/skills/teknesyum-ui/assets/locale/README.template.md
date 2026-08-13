# Translations

This folder holds every user-visible string in the application. You do not need to read
or build the source code to translate it.

## How to add a language

1. Copy `tr.json` (the source language) to `<code>.json`, using the ISO 639-1 code —
   `de.json` for German, `fr.json` for French.
2. Translate the **values only**. Never change, translate, or reorder the keys on the left.
3. Keep the placeholders exactly as they appear: `{count}`, `{path}`, `{name}`.
   You may move a placeholder inside the sentence, but do not rename or remove it.
4. Keep every key. A missing key falls back to the source language.
5. Open a pull request. That is all — no code change is required.

## Rules that matter

- **Meaning must not drift.** Security and confirmation messages state what the application
  will do. If the source says "will be changed", the translation must not say "may be changed".
- **Length.** Most languages run longer than the source. If a translated label no longer fits
  its button or column, say so in the pull request instead of shortening it into something
  inaccurate.
- **No sentence splicing.** Strings are whole sentences on purpose; do not break them apart.

## Files

| File | Language | Status |
|---|---|---|
| `tr.json` | Türkçe | source |
| `en.json` | English | complete |
