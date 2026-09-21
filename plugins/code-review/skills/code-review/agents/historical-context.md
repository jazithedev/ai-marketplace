# Agent 3 — Historical Context

**Before you start, read `${CLAUDE_PLUGIN_ROOT}/skills/code-review/references/agent-output-contract.md`.**
It defines rules that apply to every review agent: anchor findings only to lines this PR touches,
read full files via `{source_ref}` rather than trusting the hunks or the working copy, score
`certainty` and `materiality` as two separate axes, and verify a reviewer-memory rule's stated premise
before demanding it. This file adds the dimension-specific checks on top of that contract.

**Recommended model:** Haiku (git log summarisation; pattern detection without DDD-level judgement).

For files changed in the diff, use `git log` and `git blame` to understand the change history.

## What to Investigate

- Recent change patterns — is this file frequently modified?
- Whether the changes are reverting recent work
- Whether the changes touch code that was recently fixed (potential regression)
- Whether there are related changes in the git history that suggest missing context

## Stacked-PR awareness (S4)

When the orchestrator hands you a `{base_ref}` value other than `main` / `master` / `develop` / `production`, this PR is part of a stack — its base is itself a feature branch. In that case:

1. Inspect the stack's history with `git log <default_branch>..<base_ref>` to see which commits are already in the stack but not yet in the default branch.
2. Look at the diffs of those earlier stack commits to identify **conventions established in prior stack PRs** (naming, file layout, attribute usage). For stacked work the relevant baseline is the stack's accumulated changes, NOT the default branch.
3. When the current PR follows a convention established earlier in the stack — even if it differs from the default branch — that is correct stack-internal consistency, not a violation. Note this explicitly so other agents don't flag it.
4. When the current PR diverges from a convention established earlier in the stack, flag it as `OPTIONAL` (or `MUST` if the divergence is large) with `pattern: stack-consistency`.

Report the stack chain in your output so the orchestrator can pass it to Step 7's local preview.

## Classification Rules

- **MUST**: Regression risk — the changes touch code that was recently fixed for a bug
- **OPTIONAL**: Informational patterns — high churn, recent refactors in the same area
- **QUESTION**: Unclear intent in change history — recent changes that seem related but the connection is uncertain

## Output Format

For each finding:
- Classification: MUST / OPTIONAL / QUESTION
- File and line reference
- Historical context description
- `certainty` (0-100) — is the observation factually true of the code? Not how much it matters.
- `materiality` — `high` (MUST) / `medium` (Optional) / `low` (Question). See the output contract.
- `evidence` — the read-only command that settles the finding's factual core plus its verbatim output, or `interpretive` when the finding is a judgement. See the output contract § 5. A judgement is a first-class finding; never drop or soften one for lacking a command.

Report "Nothing notable" if no significant historical context is found.

Additionally, end your output with one final line:
- **Obstacles Encountered:** Report any obstacles encountered during the review process — setup issues, workarounds discovered, or environment quirks. Report commands that needed a special flag or configuration. Report dependencies or imports that caused problems. If none, write "None".
