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

Runs the `postinstall` hook defined in `mise.toml`, which executes [`bin/setup-zshrc.sh`](bin/setup-zshrc.sh). The script ensures `OPENCODE_ENABLE_EXA=1` is exported in your shell so the OpenCode `websearch` tool works with the Ollama provider (by default OpenCode ships with `websearch` disabled — the env var unlocks the hosted Exa-backed MCP service, no API key needed).

The script is **marker-based**: it only writes if the marker `# opencode-setup:websearch` is not already in `~/.zshrc`. Re-running is safe and prints `already configured`.

After `mise install`, finish with:

```bash
source ~/.zshrc    # or open a new shell
```

## Setup details

- **Targets `~/.zshrc`** (or `$ZDOTDIR/.zshrc` if `ZDOTDIR` is set). Other shells are skipped.
- **Refuses to run as root** to avoid polluting `/root/.zshrc`.
- **Skips non-zsh shells** with a warning instead of failing.
- **Creates `~/.zshrc` if absent** (fresh-machine case).

## Uninstall

Remove the block from `~/.zshrc`:

```bash
# opencode-setup:websearch
export OPENCODE_ENABLE_EXA=1
# opencode-setup:end
```

The repo itself is just config — deleting the clone directory removes the project, nothing to "uninstall" beyond the shell snippet.

## Layout

```
opencode-setup/
├── opencode.json              # root OpenCode config (instructions, permissions)
├── tui.json                   # TUI settings
├── mise.toml                  # postinstall hook
├── bin/
│   └── setup-zshrc.sh         # idempotent zshrc patcher
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
