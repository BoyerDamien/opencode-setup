---
name: local-memory-learn
description: Internal step of local-memory-save. Checks a draft memory entry against existing ~/.memory entries for contradictions via local-memory-retrieve, presents any conflict to the user, and returns a write recommendation. Do not invoke directly — only local-memory-save calls this.
---

# local-memory-learn

Called by `local-memory-save` before writing. Never invoked directly for a fresh, uncontested save.

## Contract

**Input:** the draft entry `local-memory-save` is about to write — specifically its `tags` (array) and its summary blockquote text.

**Output:** always exactly one object:

```
{
  conflict: bool,
  existing_entries: [<file paths>],
  recommendation: "write" | "discard" | "supersede" | "merge",
  merged_content: <string, only present when recommendation is "merge">
}
```

## Algorithm

1. **Build the retrieval query.** Extract keywords from the draft's summary blockquote (the free-text words, skip stopwords) and combine with the draft's `tags`.

2. **Call `local-memory-retrieve`** with `query` = those keywords, `tags` = the draft's tags, `mode: "preview"`, `limit: 5`.

3. **No results** → return `{conflict: false, existing_entries: [], recommendation: "write"}`. Stop here.

4. **Results found** → for each candidate, call `local-memory-retrieve` again with `mode: "full"` (or read the file directly) and compare its content against the draft:
   - Same topic, no factual/decision/lesson conflict → `{conflict: false, existing_entries: [<candidate files>], recommendation: "write"}`. Stop here.
   - A genuine contradiction (an existing `[fact]`/`[decision]`/`[lesson]` line states something incompatible with the draft) → continue to step 5.

5. **Present the conflict to the user.** Show both versions side by side: the existing entry's conflicting line(s) plus its file path, and the draft's corresponding content. Ask explicitly: keep the existing entry, keep the new draft, or merge them.

6. **Translate the user's choice:**
   - Keep existing → `{conflict: true, existing_entries: [<file>], recommendation: "discard"}`.
   - Keep new → `{conflict: true, existing_entries: [<file>], recommendation: "supersede"}`.
   - Merge → ask the user to state or approve the merged text, then → `{conflict: true, existing_entries: [<file>], recommendation: "merge", merged_content: "<the merged text>"}`.

7. Return the resulting object to `save`. `learn` never writes files itself — only `save` and `dream` write to `~/.memory`.
