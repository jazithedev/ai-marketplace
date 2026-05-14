# Agent 3 — Historical Context

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
- Confidence score (0-100)

Report "Nothing notable" if no significant historical context is found.

Additionally, end your output with one final line:
- **Obstacles Encountered:** Report any obstacles encountered during the review process — setup issues, workarounds discovered, or environment quirks. Report commands that needed a special flag or configuration. Report dependencies or imports that caused problems. If none, write "None".
