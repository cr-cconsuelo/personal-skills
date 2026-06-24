#!/usr/bin/env bash
# Thin wrapper around the Node journal CLI so the skill can be invoked with a
# single stable entrypoint regardless of where it's installed.
#
# Usage: bash <skill-dir>/scripts/journal.sh <command> [options]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required but not installed." >&2
  exit 1
fi

exec node "$SCRIPT_DIR/journal.js" "$@"
