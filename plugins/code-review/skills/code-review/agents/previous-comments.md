# Agent 4 — Previous Review Comments

**PR mode only.** Skip this agent entirely in local mode.

Check for previous review comments on the same PR and on recent PRs touching the same files.

## Data Sources

```bash
gh pr view <PR> --json comments,reviews
gh api repos/{owner}/{repo}/pulls/<PR>/comments
```

## What to Look For

- Unaddressed review comments on this PR (from prior review rounds)
- Patterns of repeated feedback on the same files
- Previous review suggestions that weren't implemented
- Conflicting feedback from different reviewers

## Classification Rules

- **MUST**: Unaddressed review comments from prior rounds — the author was asked to change something and didn't
- **OPTIONAL**: Repeated patterns worth noting — the same feedback keeps appearing on this file
- **QUESTION**: Conflicting feedback from different reviewers that needs resolution

## Output Format

For each finding:
- Classification: MUST / OPTIONAL / QUESTION
- File and line reference (if applicable)
- Description of the unaddressed/repeated feedback
- Confidence score (0-100)

Additionally, end your output with one final line:
- **Obstacles Encountered:** Report any obstacles encountered during the review process — setup issues, workarounds discovered, or environment quirks. Report commands that needed a special flag or configuration. Report dependencies or imports that caused problems. If none, write "None".
