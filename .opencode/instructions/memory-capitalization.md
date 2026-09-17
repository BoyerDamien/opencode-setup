# Memory capitalization

This repo maintains a cross-project memory at `~/.memory/entries/` (research findings and lessons learned, curated and separate from any single project). Two habits to keep:

## Before researching or brainstorming

Before dispatching `search-agent` on a new topic, or before starting a brainstorming session on something that might already have been explored, invoke `local-memory-retrieve` on the topic's keywords. If a relevant entry exists, use it instead of (or alongside) a fresh search.

## After finishing something reusable

After `search-agent` completes a research task, after `finishing-a-development-branch`, or after a brainstorming session that produced a fact, decision, or lesson likely to matter in another project, invoke `local-memory-save`. Do not save routine, project-specific implementation detail — only what's worth capitalizing across projects.

## Never automatic

Both of the above are reminders to act on, not automatic behaviors — `local-memory-save` always shows its draft to the user before writing.
