# Agent B — Size Analysis

**Recommended model:** Haiku (pure stat check, no reasoning required).

You are analyzing a pull request for size discipline.

## Input

You will receive: PR additions, PR deletions, PR changedFiles, PR Diff Stats, PR Diff.

## Size Thresholds

- **Target:** ≤200 lines (additions + deletions) — ideal size
- **Acceptable:** ≤400 lines — OK with justification
- **Must split:** >400 lines — split required

## Analysis Steps

1. Calculate total lines changed (additions + deletions)
2. Determine which threshold the PR falls into
3. If >400, check if changes are mechanically uniform (auto-generated, rename/replace, file moves) — these qualify for an exception
4. If mechanically uniform, check if it's clearly labeled in the PR description

## Output Format

Return a structured assessment:
- TOTAL_LINES: number
- THRESHOLD: target/acceptable/must_split
- SIZE_PASS: true/false
- MECHANICAL_EXCEPTION: true/false (if applicable)
- DETAILS: explanation

Additionally, end your output with one final line:
- **Obstacles Encountered:** Report any obstacles encountered during the review process — setup issues, workarounds discovered, or environment quirks. Report commands that needed a special flag or configuration. Report dependencies or imports that caused problems. If none, write "None".
