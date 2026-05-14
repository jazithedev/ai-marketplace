# Agent 4 — Previous Review Comments

**PR mode only.** Skip this agent entirely in local mode.

Check for previous review comments on the same PR and on recent PRs touching the same files.

## Data Sources

```bash
gh pr view <PR> --json comments,reviews
gh api repos/{owner}/{repo}/pulls/<PR>/comments --paginate
gh api repos/{owner}/{repo}/pulls/<PR>/reviews --paginate
```

## What to Look For

- Unaddressed review comments on this PR (from prior review rounds)
- Patterns of repeated feedback on the same files
- Previous review suggestions that weren't implemented
- Conflicting feedback from different reviewers
- **Prior skill-authored reviews** — see "Skill-self-detection" below

## Skill-self-detection (G8)

Among the reviews you fetch, some may have been authored by **this same skill in a previous run**. Detect them by checking whether the review body starts with this exact marker line:

```
_This code review was made automatically by Krzysztof Trzos Code Review AI Skill._
```

For each skill-authored review:

1. Fetch its inline comments — comments where `pull_request_review_id` equals the review's id.
2. For each inline comment, extract the **finding signature**: the first non-empty line of the body, normalised (lowercase, badge emoji stripped). This is typically `**🔴 MUST** — <title>`, `**🟡 [Optional]** — <title>`, or `**🔵 [Question]** — <title>`.
3. Record a `prior_findings` array:
   ```
   [
     {"comment_id": 123, "path": "...", "line": 42, "signature": "must — missing #[\\override] on every interface-implementing method", "classification": "MUST"},
     ...
   ]
   ```

Report `prior_findings` as a distinct section in your output (separate from the unaddressed-comments section). The orchestrator's Section D consolidation step uses this to suppress re-emission of the same findings.

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
