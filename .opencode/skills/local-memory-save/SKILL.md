---
name: local-memory-save
description: 'Write a new entry to the local cross-project memory (~/.memory/entries/) — use after finishing a research task, a development branch, or a brainstorming session that produced a reusable fact or lesson. Always checks for contradictions via local-memory-learn before writing. Trigger words: "save this to memory", "capitalize this", "remember this for other projects", "add to local memory".'
---

# local-memory-save

Writes a curated entry to `~/.memory/entries/`. Every write is validated by the user before it exists on disk, and is checked for contradictions via `local-memory-learn` first.

## File format

Each entry is a Markdown file with YAML frontmatter:

```yaml
---
title: "Lesson or finding title"
tags: ["tag1", "tag2"]
type: "lesson" | "finding" | "pattern" | "gotcha"
date: "YYYY-MM-DD"
---

# Body

Markdown body. Keep it concise — 1–3 paragraphs max.
```

## Workflow

1. **Collect the lesson.** Ask the user to summarize the key takeaway in 1–2 sentences.
2. **Propose tags.** Suggest 2–3 tags based on the lesson (e.g., `["git", "workflow"]`).
3. **Propose type.** Suggest one of: `lesson`, `finding`, `pattern`, `gotcha`.
4. **Draft the entry.** Write the full Markdown with frontmatter.
5. **Show the draft to the user.** Ask for approval before writing.
6. **Check for contradictions.** Call `local-memory-learn` with the draft. If conflicts exist, present them and ask the user to resolve.
7. **Write to disk.** Once approved, write the file to `~/.memory/entries/<YYYY-MM-DD>-<slug>.md`.

## Output

```
✓ Saved to ~/.memory/entries/2025-09-15-git-worktree-isolation.md
```

## Errors

- `~/.memory/entries/` does not exist: create it.
- User rejects the draft: do not write.
- Contradictions found: present them and ask the user to resolve before writing.

## See Also

- `local-memory-retrieve` — search entries.
- `local-memory-learn` — check for contradictions.
