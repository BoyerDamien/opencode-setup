---
name: interactive-pr-review
description: Use when reviewing one or more pull requests interactively, especially when findings require evidence, discussion, inline-comment consent, stale-reference checks, or safe retry after uncertain publication.
---

# Interactive PR Review

Review facts before conclusions. Discuss one PR and one finding at a time. Draft first; publish only the exact approved comment.

## Non-negotiable boundaries

- Preserve repository state. Record existing changes; do not reset, checkout, clean, commit, push, approve, merge, or read secret values.
- Treat inaccessible data as a limitation, not evidence that it does not exist.
- Never publish from vague assent such as “looks right.” Never approve or merge a PR.
- Keep every proposed and published review comment concise and in English.
- For remote coordination, record only the minimum non-sensitive metadata needed: PR identity, refs, SHA, paths, lines, sides, timestamps, and comment identifiers. The decision register also retains non-sensitive evidence, decisions, and the exact draft; never record secret values.

## Workflow

1. **Frame the review.**
   - Identify accessible repository, requested PRs, review order, objective, dependencies, and limitations.
   - Record each PR’s base ref, HEAD ref/SHA, current diff identity, and existing discussions/comments.
   - If several PRs are requested, first provide a concise cross-PR synthesis. Cite its evidence and provenance; distinguish confirmed relationships from assumptions.
   - Do not begin detailed findings for another PR until the current PR is complete or explicitly deferred.

2. **Review one PR with a fresh advisor.**
   - Delegate each PR separately to a fresh `advisor`.
   - State that the advisor is read-only: it must not modify files, repository state, or remote review state, and must not publish.
   - Give the advisor current refs/SHA, scoped diff, review goal, available sources, and prior decisions. Do not impose a conclusion.
   - Retain advisor disagreement as evidence to investigate, not as a vote to resolve by itself.

3. **Establish facts before raising a finding.**
   - Read the current code, diff, and relevant repository references.
   - For a factual claim that depends on internal or external information outside the repository, use `search-agent`; cite the resulting source and provenance.
   - Separate every finding into:
     - **Evidence:** verifiable source, path/line or remote reference, and applicable SHA.
     - **Conditional risk:** what may happen and under which conditions.
     - **Assessment:** the reviewer’s judgment.
     - **Limitations:** missing access, uncertainty, or unverified assumptions.
   - Do not convert an assumption, inaccessible source, or stale evidence into a fact.

4. **Discuss exactly one finding.**
   - Present one finding for the current PR, then wait for a decision before presenting the next.
   - Maintain a decision register with: PR; finding; sources and SHA; evidence; risk; assessment; limitations; user decision; draft; proposed anchor; publication status; and resulting URL or failure.
   - A decision to retain, revise, or discard a finding is not permission to publish it.

5. **Draft the inline comment.**
   - Propose one concise English inline draft with its exact path, line, and side.
   - Include only the necessary evidence and conditional impact; avoid unsupported severity claims.
   - If no valid inline anchor exists, say so and offer a non-inline draft or no comment. Do not choose an arbitrary line.
   - Revise, retain, or discard the draft only according to the recorded decision.

6. **Obtain publication consent.**
   - Before any remote write, show the exact draft and target PR.
   - Require explicit approval covering both that PR and that exact text, for example: approval to post this exact draft to this identified PR.
   - Consent is invalidated by any change to the text, PR identity, HEAD SHA, diff, path, line, side, or requested anchor.

7. **Revalidate immediately before publication.**
   - Re-fetch and compare PR identity, current HEAD SHA, relevant diff, path, line, side, and existing comments.
   - If the PR identity, HEAD SHA, relevant diff, path, line, side, or draft text changed, do not publish. Update the review and draft, then request new explicit consent.
   - A new or changed existing comment alone does not invalidate consent. Assess whether it creates a duplicate or contains new information that makes the draft incorrect or requires a modification; if so, do not publish, re-review the affected finding, and request new explicit consent.
   - Check for an equivalent existing remote comment before writing.

8. **Handle timeout or partial failure idempotently.**
   - After timeout, ambiguous response, or partial completion, treat publication status as unknown.
   - Query remote comments and publication state before any retry; match PR, anchor, and exact or equivalent text.
   - If the comment exists, record its URL and do not repost. If status cannot be determined, report uncertainty and request authorization before further action.
   - Report successful publications, unpublished drafts, and failures separately. Do not claim overall success when any item remains unresolved.

## Decision table

| Situation | Required response |
| --- | --- |
| Vague agreement | Save the decision; keep the draft unpublished. |
| Conflicting advice or unavailable source | Show evidence, assumptions, and limits; investigate before concluding. |
| New HEAD, diff, anchor, or text | Re-review the affected portion and obtain new consent. |
| Existing comment or uncertain write result | Inspect remote state; never retry blindly. |
| Request to approve or merge | Decline; offer review findings or drafts only. |
| Request involving a secret | Do not read its value; use non-sensitive references or state the limitation. |

## Completion report

Report the reviewed PRs, source-backed cross-PR synthesis, recorded decisions, comment URLs actually published, drafts not published, partial failures, and remaining limitations. Request new authorization for any work beyond the consent already granted.
