#!/usr/bin/env bash
# Installs a skill from this repo into ~/.copilot/skills so Copilot CLI can use it.
#
# Usage:
#   ./install.sh                  # install all skills in ./skills
#   ./install.sh <skill-name>     # install a single skill (e.g. professional-journal)
#   ./install.sh --link <name>    # symlink instead of copy (for local development)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$REPO_DIR/skills"
DEST="$HOME/.copilot/skills"

LINK=0
if [ "${1:-}" = "--link" ]; then
  LINK=1
  shift
fi

mkdir -p "$DEST"

install_one() {
  local name="$1"
  local src="$SKILLS_SRC/$name"
  if [ ! -d "$src" ]; then
    echo "Error: skill '$name' not found in $SKILLS_SRC" >&2
    exit 1
  fi
  local target="$DEST/$name"
  rm -rf "$target"
  if [ "$LINK" = "1" ]; then
    ln -s "$src" "$target"
    echo "Linked  $name -> $target"
  else
    # Copy code only; never copy a contributor's private data/config.
    # Excludes are anchored (leading slash) to the skill root so source dirs
    # such as scripts/lib/reports are preserved.
    rsync -a --exclude '/data/' --exclude '/reports/' --exclude '/config.json' \
      "$src/" "$target/"
    echo "Installed $name -> $target"
  fi
}

if [ "$#" -ge 1 ]; then
  install_one "$1"
else
  for dir in "$SKILLS_SRC"/*/; do
    install_one "$(basename "$dir")"
  done
fi

echo "Done. Restart Copilot CLI to pick up newly installed skills."
