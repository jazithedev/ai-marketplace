# Agent 3 — Historical Context

For files changed in the diff, use `git log` and `git blame` to understand the change history.

## What to Investigate

- Recent change patterns — is this file frequently modified?
- Whether the changes are reverting recent work
- Whether the changes touch code that was recently fixed (potential regression)
- Whether there are related changes in the git history that suggest missing context

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
