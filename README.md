# opencode-setup
Personal OpenCode setup: rules, agents, commands, skills, and config — versioned and shareable.

## Quick start

```bash
git clone <repo-url> opencode-setup
cd opencode-setup
mise install
```

`mise install` is idempotent: it appends `OPENCODE_ENABLE_EXA=1` to `~/.zshrc` so the OpenCode `websearch` tool works with the Ollama provider. Re-run safely any time. Then `source ~/.zshrc` or open a new shell.
