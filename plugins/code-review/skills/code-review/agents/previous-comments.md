# Agent 4 — Previous Review Comments

**Recommended model:** Haiku (structured parsing of GitHub API + GraphQL output; no judgement required).

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

## Skill-self-detection (G8b)

Among the reviews you fetch, some may have been authored by **this same skill in a previous run**. Detect them by **prefix-matching** the review body's first line against:

```
_This code review was made automatically by Krzysztof Trzos Code Review AI Skill
```

(The prefix is open-ended. v1.0.3 and earlier emit `… AI Skill._`. v1.0.4+ append ` at <SHA> (memory <MTIME>)._` for the Win 5 short-circuit. Use a prefix match, not an exact-line match.)

For each skill-authored review, build two collections: `prior_findings.inline` (one entry per inline comment) and `prior_findings.general` (one entry per General Finding in the body).

### Inline comments

1. Fetch comments where `pull_request_review_id` equals the review's id.
2. For each inline comment, extract the **finding signature**: the first non-empty line of the body, normalised — lowercase, badge emoji stripped (`🔴 / 🟡 / 🔵`), leading classification token (`must / optional / question`) and surrounding punctuation stripped. The result is a topic key like `add // arrange / // act / // assert section comments to every test method`.
3. Look up each comment's **resolved state**. The REST endpoint doesn't expose `isResolved` on inline comments — use GraphQL:

   ```bash
   gh api graphql -F owner=<owner> -F repo=<repo> -F pr=<pr_number> -f query='
     query($owner: String!, $repo: String!, $pr: Int!) {
       repository(owner: $owner, name: $repo) {
         pullRequest(number: $pr) {
           reviewThreads(first: 100) {
             nodes {
               isResolved
               comments(first: 50) { nodes { databaseId } }
             }
           }
         }
       }
     }'
   ```

   Each thread node has `isResolved` and a list of `comments.nodes.databaseId` values (these match the REST `comment.id`). Build a `comment_id -> resolved` map. A thread is resolved iff `isResolved == true`; every comment in that thread inherits the state.

4. Record entries:

   ```
   {"comment_id": 3243485466,
    "path": "src/.../FakeReportSummaryRepositoryTest.php",
    "line": 23,
    "signature": "add // arrange / // act / // assert section comments to every test method",
    "classification": "MUST",
    "resolved": false}
   ```

### General Findings (review body)

Each skill-authored review's body has a top-level `## General Findings` section, with `### Required Changes`, `### Suggestions`, and `### Questions` subsections. Parse each bullet under those subsections:

- Each finding's first bolded title line is the **signature** (apply the same normalisation as inline comments).
- Bullets without a clear signature line can be skipped.

Record entries:

```
{"review_id": 4292478648,
 "signature": "pr description mismatch",
 "classification": "OPTIONAL"}
```

### Output

Report `prior_findings = {"inline": [...], "general": [...]}` as a distinct section in your output. The orchestrator's `references/consolidation-rules.md` Section D consumes this for **G8b** rule-based suppression: it matches new candidates by signature alone (not by file:line) and picks one of four actions — react, threaded-reply rollup, fresh inline, or drop — depending on overlap type and resolved state.

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
