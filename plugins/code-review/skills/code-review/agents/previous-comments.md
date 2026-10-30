# Agent 4 — Previous Review Comments

**Before you start, read `${CLAUDE_PLUGIN_ROOT}/skills/code-review/references/agent-output-contract.md`.**
Sections 3 and 5 apply to you: score `certainty` and `materiality` as two separate axes, and report
obstacles at the end.

Section 1 (anchor findings to lines the PR touches) is **deliberately relaxed for this agent.** Your job
is to spot prior feedback the author did *not* act on, so the line in question is very often unchanged
and therefore outside the diff. Report it anyway — mark the finding `bucket: "general"` so the
orchestrator puts it in the review body instead of attempting an inline comment GitHub would reject,
and keep the original `file:line` in the text so the reader can still navigate to it.

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
2. For each inline comment, extract the **finding signature**. Since v1.7.0 every posted finding carries a hidden `<!-- sig: {signature} -->` marker (`references/comment-style.md` § 2, Signature marker). When the body has one, the signature is the marker's content, trimmed and lowercased; record `signature_kind: "marker"`. Comments posted before v1.7.0 have no marker and open with a subject line instead — for those, record `signature_kind: "legacy"` and take the first non-empty line of the body, normalised — lowercase, badge emoji stripped (`🔴 / 🟡 / 🔵`), leading classification token (`must / optional / question`) and surrounding punctuation stripped, **square brackets included**. Bracketing the token is a presentation change this skill made partway through its life, so `**🔴 MUST** — x` and `**🔴 [Must]** — x` must normalise to the same key; if they don't, the next review stops recognising its own prior comments and re-posts all of them. The result is a topic key like `add // arrange / // act / // assert section comments to every test method`.
3. Look up each comment's **thread id, resolved state and outdated state**. The REST endpoint exposes none of them on inline comments — use GraphQL:

   ```bash
   gh api graphql -F owner=<owner> -F repo=<repo> -F pr=<pr_number> -f query='
     query($owner: String!, $repo: String!, $pr: Int!) {
       repository(owner: $owner, name: $repo) {
         pullRequest(number: $pr) {
           reviewThreads(first: 100) {
             nodes {
               id
               isResolved
               isOutdated
               comments(first: 50) { nodes { databaseId } }
             }
           }
         }
       }
     }'
   ```

   Each thread node has its `id` (a `PRRT_…` node id), `isResolved`, `isOutdated` and a list of `comments.nodes.databaseId` values (these match the REST `comment.id`). Build a `comment_id -> {thread_id, resolved, outdated}` map; every comment in a thread inherits its state. A thread is outdated when the line it was anchored to has changed since. GitHub folds those away, so the orchestrator keeps blocking follow-ups out of them.

4. Record entries:

   ```
   {"comment_id": 3243485466,
    "thread_id": "PRRT_kwDOSt-PeM6xcpCC",
    "path": "src/.../FakeReportSummaryRepositoryTest.php",
    "line": 23,
    "signature": "add // arrange / // act / // assert section comments to every test method",
    "classification": "MUST",
    "resolved": false,
    "outdated": false,
    "suggested_fix": "<the comment's Suggested fix block, verbatim, or null>",
    "author_followed_suggestion": false}
   ```

   Set `author_followed_suggestion` to `true` when the code at the PR head now matches that `suggested_fix` — the author did what the comment asked. Compare by meaning, not bytes: same structure and same identifiers, whatever the formatting. Leave it `false` when there was no fix to follow or you can't tell. The orchestrator uses it to stop a later run from arguing with our own advice (`consolidation-rules.md` Section D).

### General Findings (review body)

Each skill-authored review's body has a top-level `## General Findings` section, with `### Required Changes`, `### Suggestions`, and `### Questions` subsections. Parse each bullet under those subsections:

- When the bullet contains a `<!-- sig: {signature} -->` marker, its content is the **signature** (`signature_kind: "marker"`).
- Otherwise the bullet predates v1.7.0: its first bolded title line is the signature (`signature_kind: "legacy"`, same normalisation as inline comments). A bullet whose only bold text is the badge (`**[Must]**`) and that has no marker has no signature.
- Bullets without a signature can be skipped.

Record entries:

```
{"review_id": 4292478648,
 "signature": "description-vs-diff-mismatch",
 "signature_kind": "marker",
 "classification": "OPTIONAL"}
```

### Fix status — delta re-review only

When your prompt carries a `{prior_review_brief}` (`references/delta-re-review.md`), also report a **fix status** for every prior finding, inline and general, and for every point a human reviewer raised in the previous round:

| Status | Meaning |
|--------|---------|
| `FIXED` | The head no longer has the problem. Cite the line that shows it. |
| `PARTLY_FIXED` | Part of it changed and part did not. Say which part is left, with the line. |
| `OPEN` | Nothing changed. |
| `ANSWERED` | No code change, but the author replied with a reason. Quote the reply. |
| `UNCLEAR_TO_AUTHOR` | The author replied that they don't understand the comment. Quote the reply. |

Judge `FIXED` by reading the head, never by the author's reply alone: "fixed" in a thread is a claim to check. For each `ANSWERED`, say whether the reply settles the point or leaves a part of it unanswered, and which part.

### Output

Report `prior_findings = {"inline": [...], "general": [...]}` as a distinct section in your output, and in a delta re-review the fix-status table next to it. The orchestrator's `references/consolidation-rules.md` Section D consumes this for **G8b** rule-based suppression: it matches new candidates by signature alone (not by file:line) and picks one of four actions — react, threaded-reply rollup, fresh inline, or drop — depending on overlap type and resolved state.

## Classification Rules

- **MUST**: Unaddressed review comments from prior rounds — the author was asked to change something and didn't
- **OPTIONAL**: Repeated patterns worth noting — the same feedback keeps appearing on this file
- **QUESTION**: Conflicting feedback from different reviewers that needs resolution

## Output Format

For each finding:
- Classification: MUST / OPTIONAL / QUESTION
- File and line reference (if applicable)
- Description of the unaddressed/repeated feedback
- `certainty` (0-100) — is the observation factually true? Not how much it matters.
- `materiality` — `high` (MUST) / `medium` (Optional) / `low` (Question). See the output contract.
- `evidence` — the read-only command that settles the finding's factual core plus its verbatim output, or `interpretive` when the finding is a judgement. See the output contract § 5. A judgement is a first-class finding; never drop or soften one for lacking a command.

Additionally, end your output with one final line:
- **Obstacles Encountered:** Report any obstacles encountered during the review process — setup issues, workarounds discovered, or environment quirks. Report commands that needed a special flag or configuration. Report dependencies or imports that caused problems. If none, write "None".
