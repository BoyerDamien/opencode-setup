# opencode-setup
Personal OpenCode setup: rules, agents, commands, skills, and config — versioned and shareable.

## Quick start

```bash
git clone <repo-url> opencode-setup
cd opencode-setup
mise install
```

That's it. The `mise install` step is **idempotent** and re-runnable any time.

## What `mise install` does

Runs the `postinstall` hook chain defined in `mise.toml`, which executes two scripts in order:

### 1. `bin/setup-zshrc.sh` — shell environment

Ensures `OPENCODE_ENABLE_EXA=1` is exported so the OpenCode `websearch` tool works on top of the Ollama provider (by default OpenCode ships with `websearch` disabled — the env var unlocks the hosted Exa-backed MCP service, no API key needed).

The script is **marker-based** and writes to both files:

- `~/.zshrc` (interactive shells) or `$ZDOTDIR/.zshrc` if `ZDOTDIR` is set
- `~/.zshenv` (all zsh shells, including non-interactive and sub-processes)

Re-running is safe and prints `already configured` for each file. It refuses to run as root, skips non-zsh shells, and creates `~/.zshrc` / `~/.zshenv` if absent.

### 2. `bin/setup-opencode.sh` — global config symlinks

Symlinks the repo's OpenCode config into `~/.config/opencode/` so every OpenCode invocation in any directory picks up your shared agents, commands, plugins, skills, and config.

| Source (in the repo) | Symlink in `~/.config/opencode/` |
|---|---|
| `opencode.json` | `opencode.json` |
| `tui.json` | `tui.json` |
| `.opencode/agents` | `agents` |
| `.opencode/commands` | `commands` |
| `.opencode/instructions` | `instructions` |
| `.opencode/plugins` | `plugins` |
| `.opencode/prompts` | `prompts` |
| `.opencode/skills` | `skills` |

Behavior:

- **Idempotent** — re-running detects existing correct symlinks as no-ops.
- **Refuses to overwrite** a non-symlink target (protects your pre-existing global config). Pass `--force` to back it up to `~/.config/opencode/.bak/<name>.<timestamp>` and replace it.
- **Replaces broken symlinks** automatically.
- **Refuses to run as root**.

After `mise install`, finish with:

```bash
source ~/.zshrc    # or open a new shell
```

## Uninstall

### `setup-opencode.sh` only

```bash
bin/setup-opencode.sh --uninstall          # remove symlinks
bin/setup-opencode.sh --uninstall --purge  # also remove the .bak directory
```

The repo itself is just config — deleting the clone directory removes the project.

### `setup-zshrc.sh` only

Remove the block from `~/.zshrc` and `~/.zshenv`:

```
# opencode-setup:websearch
export OPENCODE_ENABLE_EXA=1
# opencode-setup:end
```

## Layout

```
opencode-setup/
├── opencode.json              # root OpenCode config (instructions, permissions)
├── tui.json                   # TUI settings
├── mise.toml                  # postinstall hooks
├── bin/
│   ├── setup-zshrc.sh         # idempotent zshrc + zshenv patcher
│   └── setup-opencode.sh      # idempotent symlink installer for ~/.config/opencode
├── .opencode/
│   ├── instructions/          # shared rules injected via opencode.json
│   ├── agents/                # custom agents
│   ├── commands/              # custom /commands
│   ├── skills/                # SKILL.md folders
│   ├── plugins/               # OpenCode plugins
│   └── prompts/               # long prompts referenced via {file:...}
└── AGENTS.md                  # instructions for agents editing this repo
```

See [AGENTS.md](AGENTS.md) for conventions when adding config.
