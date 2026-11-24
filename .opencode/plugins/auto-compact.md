# Automatic compaction on OpenCode 2.4.1

OpenCode now decides when to compact. `compaction.buffer: "20%"` leaves 20% of
the model's usable window free, so compaction starts at roughly 80% estimated
occupancy. If the model has a separate input limit, the usable window is the
smaller of that limit and the context limit. OpenCode estimates occupancy from
the latest relevant assistant usage and subsequent context, not from a sum of
historical requests. `background: false` avoids generating speculative summaries.

`keep.tokens: 4000` sets a target budget for recent history. OpenCode selects
whole messages based on their estimated token counts; the budget is neither an
exact retention count nor a limit on the summary length.
The new percentage buffer replaces `reserved`; OpenCode 2.4.1 has no equivalent
`prune` setting. The plugin adds Preserve/Discard guidance to the compaction
system prompt without scheduling compaction or replacing existing instructions.
The same session can compact again after new exchanges fill its context.

`OPENCODE_COMPACT_RATIO` is no longer read; change `compaction.buffer` instead.
`OPENCODE_AUTO_COMPACT_DISABLE` no longer disables the trigger or the prompt
hook. To disable automatic compaction, set `compaction.auto: false` in your
OpenCode configuration. Manual compaction remains available.

Inside this repository, the local policy excludes the global plugin alias
under `*/opencode/plugins/auto-compact.js`. Other projects keep using the global
plugin. A nonstandard global config directory not ending in `/opencode` may
need a matching source-path policy.

See [OpenCode's compaction settings](https://opencode.ai/docs/compaction#settings).
