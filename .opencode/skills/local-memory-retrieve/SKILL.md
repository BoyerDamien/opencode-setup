---
name: local-memory-retrieve
description: 'Search the local cross-project memory (~/.memory/entries/) for research findings or lessons already captured, by keyword/tags/type. Use before starting new research, before brainstorming on a topic, or as the internal search step of local-memory-learn. Trigger words: "check memory", "have we looked into this before", "search local memory", "~/.memory".'
---

# local-memory-retrieve

Searches `~/.memory/entries/` for entries matching a query. Cheap by design: lexical search (`rg`), bounded extraction per result — never a full-corpus read.

## Parameters

- `query` (string): search term(s) — passed to `rg` as-is. Supports regex.
- `limit` (int, optional): max results to extract. Default: 10.

## Workflow

1. Run `rg --max-count=<limit> <query> ~/.memory/entries/` to find matching files.
2. For each match, extract the YAML frontmatter (`---` ... `---`) and the first 200 chars of body.
3. Return results as a list: `[{file, frontmatter, preview}, ...]`.

## Output

```
[
  {
    "file": "~/.memory/entries/2025-09-15-git-worktree-isolation.md",
    "frontmatter": {
      "title": "Git worktree isolation",
      "tags": ["git", "workflow"],
      "type": "lesson"
    },
    "preview": "Git worktrees let you work on multiple branches in parallel without stashing..."
  },
  ...
]
```

## Errors

- No matches: return `[]`.
- `~/.memory/entries/` does not exist: return error message (user should run `local-memory-save` first).

## See Also

- `local-memory-save` — write entries.
- `local-memory-learn` — check for contradictions before writing.
