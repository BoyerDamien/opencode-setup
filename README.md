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
| `AGENTS.md` | `AGENTS.md` |
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

### Web research (centralized via `search-agent`)

`opencode.json` registers two keyless hosted MCP servers — **Context7**
(`mcp.context7.com`) and **Exa** (`mcp.exa.ai`) — for retrieving current
library documentation and web results. Both are anonymous rate-limited, so no
API key or secrets are required.

All web research is centralized through the `search-agent` subagent, the only
agent with access to these MCP tools. It consults Context7 first for
library/framework/SDK/API lookups (`resolve-library-id` + `query-docs`), then
Exa for factual web research (`web_search_exa` + `web_fetch_exa`), with
`websearch`/`webfetch` as a fallback. Every other agent (`controller`, `main`,
`fast`, `builder`, `advisor`) is denied direct web and MCP access and must
dispatch `@search-agent` instead.

`search-agent` also has **read-only** access to the Notion, Linear, and Slack
MCP servers, so it can search the user's own docs, issues, and messages and
cite them in its reports. Write access to these servers is denied — the agent
can only search and read, never create or modify.

### Terraform navigation (LSP)

Terraform navigation (`lsp_*`) requires a `terraform` or `tofu` binary on
the PATH and a `terraform init` in the target workspace. These prerequisites
are the responsibility of the target repo, not of `opencode-setup`.

> **Portability**: the `mcp.lsp` server in `opencode.json` points to absolute
> paths (`/home/dboyer/.local/share/mise/shims/agent-lsp` and
> `/home/dboyer/.config/opencode/agent-lsp.json`). If the repo is cloned into a
> different `$HOME`, update both of these paths in `opencode.json`.

### Verify the install

If you want to confirm that `~/.config/opencode/` is set up correctly (all
expected symlinks in place, every `instructions` path in `opencode.json`
resolves to an existing file):

```bash
bin/verify-install.sh
```

Exits `0` and prints `OK` on success, `1` and prints `FAIL` if any symlink
is missing or broken, or any instruction path is unresolvable. Safe to run
any time, read-only.

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
│   ├── setup-opencode.sh      # idempotent symlink installer for ~/.config/opencode
│   └── verify-install.sh      # post-install audit (symlinks + instructions paths)
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
