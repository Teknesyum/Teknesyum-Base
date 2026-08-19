#!/usr/bin/env bash
# Teknesyum Base
# Kurulum:  curl -fsSL https://raw.githubusercontent.com/Teknesyum/teknesyum-base/main/install.sh | bash
set -e

REPO="Teknesyum/teknesyum-base"
RAW="https://raw.githubusercontent.com/$REPO/main"

printf '\n  Teknesyum Base\n\n'

if ! command -v claude >/dev/null 2>&1; then
  printf '  Claude Code bulunamadi. Once kur: curl -fsSL https://claude.ai/install.sh | bash\n'
  exit 1
fi

printf '  [1/3] Marketplace ekleniyor...\n'
claude plugin marketplace add "$REPO"

printf '  [2/3] Plugin kuruluyor...\n'
claude plugin install teknesyum@teknesyum

printf '  [3/3] Statusline ve huy dosyasi baglaniyor...\n'
if command -v node >/dev/null 2>&1; then
  TMP="$(mktemp)"
  curl -fsSL "$RAW/scripts/post-install.js" -o "$TMP"
  node "$TMP"
  rm -f "$TMP"
else
  printf '  Node.js yok - statusline atlandi. Claude Code icinde /teknesyum:setup calistir.\n'
fi
