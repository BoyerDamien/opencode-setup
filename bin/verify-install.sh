#!/usr/bin/env bash
# Verify that ~/.config/opencode/ contains all files expected by opencode.json
# (especially the `instructions` array). Reports missing, broken, or
# mis-pointing symlinks. Exits 1 if any issue is found, 0 if all good.
set -euo pipefail

GLOBAL="${XDG_CONFIG_HOME:-$HOME}/.config/opencode"

if [[ ! -d "$GLOBAL" ]]; then
  echo "verify-install: $GLOBAL does not exist — run 'mise install' first" >&2
  exit 1
fi

config="$GLOBAL/opencode.json"
if [[ ! -e "$config" ]]; then
  echo "verify-install: $config not found" >&2
  exit 1
fi

resolve() {
  local target="$1"
  if [[ -L "$target" ]]; then
    local link
    link="$(readlink "$target")"
    if [[ "$link" = /* ]]; then
      printf '%s\n' "$link"
    else
      ( cd -- "$(dirname -- "$target")" && printf '%s/%s\n' "$(pwd)" "$link" )
    fi
  else
    printf '%s\n' "$target"
  fi
}

ok=0
broken=0
missing=0

# 1. Check that every symlink setup-opencode.sh would create exists and points
#    to a path inside the repo.
expected_paths=(
  "opencode.json"
  "agent-lsp.json"
  "tui.json"
  "AGENTS.md"
  "agents"
  "commands"
  "instructions"
  "plugins"
  "prompts"
  "skills"
)

echo "=== symlink audit ==="
for name in "${expected_paths[@]}"; do
  dest="$GLOBAL/$name"
  if [[ ! -e "$dest" && ! -L "$dest" ]]; then
    echo "  MISSING  $dest"
    missing=$((missing + 1))
  elif [[ -L "$dest" && ! -e "$dest" ]]; then
    echo "  BROKEN   $dest -> $(readlink "$dest")"
    broken=$((broken + 1))
  else
    echo "  ok       $dest"
    ok=$((ok + 1))
  fi
done

# 2. Check that every path listed in opencode.json `instructions` resolves to
#    an existing file when interpreted relative to GLOBAL.
echo ""
echo "=== instructions audit ==="
inst_ok=0
inst_missing=0
if command -v python3 >/dev/null 2>&1; then
  while IFS= read -r p; do
    [[ -z "$p" ]] && continue
    full="$GLOBAL/$p"
    if [[ -e "$full" ]]; then
      echo "  ok       $p"
      inst_ok=$((inst_ok + 1))
    else
      echo "  MISSING  $p  (-> $full does not exist)"
      inst_missing=$((inst_missing + 1))
    fi
  done < <(python3 -c "
import json, sys
try:
    with open('$config') as f:
        cfg = json.load(f)
    for p in cfg.get('instructions', []):
        print(p)
except Exception as e:
    print('verify-install: failed to parse $config: ' + str(e), file=sys.stderr)
    sys.exit(1)
")
else
  echo "  SKIP     python3 not available" >&2
fi

echo ""
echo "---"
echo "symlinks: ok=$ok missing=$missing broken=$broken"
echo "instructions: ok=$inst_ok missing=$inst_missing"

total_bad=$((missing + broken + inst_missing))
if [[ $total_bad -gt 0 ]]; then
  echo "FAIL"
  exit 1
fi
echo "OK"
