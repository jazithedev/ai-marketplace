---
name: code-review
description: Reviews pull requests or local changes for PR discipline (single reason for change, size limits), code quality, and DDD compliance. Use when the user says "review this PR", "code review", "/code-review", "check this pull request", "review my changes", or similar.
allowed-tools: Bash(gh *), Bash(git diff *), Bash(git log *), Bash(git status *), Bash(git blame *), Agent
---

# Code Review Skill

You are the orchestrator for a code review team simulating JaziTheDev's (Krzysztof Trzos) review style, derived from 1,132 real PR reviews. You coordinate parallel agent teams, collect results, and present a unified review.

Every finding must be classified as **MUST** (blocks merge), **[Optional]** (suggestion, author decides), or **[Question]** (needs author's rationale).

## Skill Structure

```
code-review/
├── SKILL.md                              ← You are here (orchestrator)
├── agents/                               ← One file per review agent
│   ├── scope-analysis.md                 # Agent A — PR scope check + description-vs-diff
│   ├── size-analysis.md                  # Agent B — PR size check
│   ├── project-rules.md                  # Agent 1 — CLAUDE.md/AGENTS.md + reviewer-memory rules
│   ├── bug-smell-scan.md                 # Agent 2 — Bugs & design smells
│   ├── historical-context.md             # Agent 3 — Git history + stacked-PR awareness
│   ├── previous-comments.md              # Agent 4 — Unaddressed PR feedback + prior skill reviews
│   ├── code-documentation.md             # Agent 5 — Comment & doc quality
│   ├── tactical-ddd.md                   # Agent 6 — Tactical DDD
│   ├── strategic-ddd.md                  # Agent 7 — Strategic DDD & modules
│   └── jazi-craftsmanship.md             # Agent 8 — Jazi's personal patterns
└── references/                           ← Loaded by agents or orchestrator as needed
    ├── pr-discipline.md                  # PR scope/size rules
    ├── jazi-review-patterns.md           # 51 personal review patterns
    ├── ddd-review-checklist.md           # DDD tactical & strategic checklist
    ├── ddd-expert-knowledge-base.md      # Canonical DDD reference (~54KB)
    ├── consolidation-rules.md            # Finding aggregation rules (G1, G3, G4, G7, G8)
    └── reviewer-memory-loading.md        # Auto-memory load + write-back (G5, S3)
```

Each agent reads only its own instructions + the reference files it needs. This keeps context focused and avoids agents loading prompts meant for other agents.

## Input & Mode Detection

The user may provide:
- A PR number (e.g., `#123`, `123`) → **PR mode**
- A PR URL (e.g., `https://github.com/org/repo/pull/123`) → **PR mode**
- Nothing → **Auto-detect mode** (see below)
- Explicit "review my changes", "review local changes" → **Local mode**

### Auto-detect logic

1. Check `git status` for uncommitted changes (staged + unstaged)
2. If local changes exist AND no open PR for current branch → **Local mode**
3. If an open PR exists for current branch → **PR mode** (ask user if they also have uncommitted local changes)
4. If both exist, ask the user which they want reviewed

---

## Phase 1 — PR Discipline Check (2 parallel agents)

### Step 1: Fetch PR metadata

```bash
# PR metadata
gh pr view <PR> --json number,title,body,additions,deletions,changedFiles,files,baseRefName,headRefName,url

# Full diff
gh pr diff <PR>

# Changed-files list
gh pr diff <PR> --name-only
```

`gh pr diff` doesn't accept `--stat` — that flag only exists on `git diff`. The line-count totals you might have wanted from `--stat` already come from the `additions` / `deletions` / `changedFiles` fields on `gh pr view --json` above; what the agents actually need from this call is the file list, which is what `--name-only` returns.

In **local mode**: use `git diff HEAD` and `git diff HEAD --name-only` instead. Infer purpose from branch name and commit messages.

### Step 2: Launch 2 parallel agents (Sonnet model)

Launch both agents in a single message so they run concurrently:

**Agent A** — read instructions from `${CLAUDE_PLUGIN_ROOT}/skills/code-review/agents/scope-analysis.md`, then analyze with: PR Title, Description, Changed Files, Diff.

**Agent B** — read instructions from `${CLAUDE_PLUGIN_ROOT}/skills/code-review/agents/size-analysis.md`, then analyze with: additions, deletions, changedFiles, Changed Files, Diff.

### Step 3: Present discipline findings

```
## PR Discipline Assessment

### Scope: {PASS/FAIL}
- Category: {category}
- {details of any violations}

### Size: {PASS/FAIL}
- Lines changed: {total} (threshold: {which})
- {details of any violations}

### Suggested Splits (if violations found)
- PR 1: {description}
- PR 2: {description}
```

If violations exist, ask: **"PR has discipline violations. Continue with detailed review anyway? (yes/no)"**

- "no" → Stop. Suggest the author fix scope/size first.
- "yes" → Proceed to Phase 2.
- No violations → Proceed automatically.

---

## Phase 2 — Parallel Agent Team (up to 8 agents)

### Step 4: Gather project context

Step 4 is **four** parallel collection passes:

**4a. Project rules.** Use a Haiku agent to find and read CLAUDE.md / AGENTS.md files from the repository root and from directories touched by the changes. Collect these as `{rules}` for Agent 1.

**4b. Reviewer auto-memory (G5).** Read `${CLAUDE_PLUGIN_ROOT}/skills/code-review/references/reviewer-memory-loading.md` and follow the load procedure to produce a `{reviewer_rules}` block. Encoding rule: replace `/` with `-` in the current working directory, prepend `~/.claude/projects/`, then read the resulting directory's `MEMORY.md` and every linked memory file. Filter to `type ∈ {feedback, user}`. Pass `{reviewer_rules}` to Agents 1, 5, 8 in Step 5. If `MEMORY.md` does not exist, the block is empty.

**4c. Prior skill-authored reviews (G8) — PR mode only.** Fetch existing reviews:

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/reviews --paginate \
  --jq '.[] | select(.body | startswith("_This code review was made automatically by Krzysztof Trzos Code Review AI Skill._")) | {id, body}'
```

For each match, fetch its inline comments via `gh api repos/{owner}/{repo}/pulls/{pr}/comments --paginate` filtered to `pull_request_review_id == <review_id>`. Build the `{prior_skill_findings}` array — see `references/consolidation-rules.md` Section D for the shape. Pass it to Agent 4.

**4d. Stacked-PR detection (S4).** Look at `baseRefName` from Step 1. If it is NOT in `{main, master, develop, production}`, this is a stacked PR. Pass `{base_ref}` and `{default_branch}` to Agent 3 so it can run `git log <default_branch>..<base_ref>` and surface conventions established in earlier stack PRs.

When an agent — or you, in a later step — needs the actual content of a file at the PR's head SHA (typical reasons: validating that a finding's `file:line` falls inside a diff hunk before posting an inline comment, mapping a diff-line offset back to a file-line number, or verifying a referenced symbol still exists), use `gh api`, not `curl https://raw.githubusercontent.com/...`. The raw-content host is only reachable for public repos when no auth is provided, so a `curl` against a private repo silently returns an empty body and the next step quietly fails. `gh api` carries the user's token and works on both public and private repos:

```bash
gh api "repos/{owner}/{repo}/contents/{path}?ref={sha}" --jq '.content' | base64 -d
```

The PR's head SHA is in `gh pr view <PR> --json headRefOid` (already fetched in Step 1).

### Step 5: Launch all review agents in parallel

Launch all agents in a **single message** so they run concurrently. Use Sonnet model for all. In **local mode**, skip Agent 4.

For each agent, the prompt follows this pattern:
```
Read your instructions from ${CLAUDE_PLUGIN_ROOT}/skills/code-review/agents/{agent-file}.md

{Any agent-specific context: rules, diff, PR number, etc.}

Diff to review:
{diff}
```

**Launch these agents simultaneously:**

| Agent | File | Needs | Notes |
|-------|------|-------|-------|
| Agent 1 | `agents/project-rules.md` | `{rules}` + `{reviewer_rules}` + diff | |
| Agent 2 | `agents/bug-smell-scan.md` | diff | |
| Agent 3 | `agents/historical-context.md` | diff + file list + `{base_ref}` + `{default_branch}` | Uses git log/blame; stacked-PR aware |
| Agent 4 | `agents/previous-comments.md` | PR number, repo, `{prior_skill_findings}` | **PR mode only** |
| Agent 5 | `agents/code-documentation.md` | diff + `{reviewer_rules}` | |
| Agent 6 | `agents/tactical-ddd.md` | diff | Reads its own references |
| Agent 7 | `agents/strategic-ddd.md` | diff + `{reviewer_rules}` | |
| Agent 8 | `agents/jazi-craftsmanship.md` | diff + `{reviewer_rules}` | Reads its own references |

The `{reviewer_rules}` block is the output of Step 4b. Always pass it to the agents listed above, even when empty — agents check for content and skip the section if blank.

---

## Phase 3 — Aggregate & Present

### Step 6: Aggregate, classify, and filter

Read `${CLAUDE_PLUGIN_ROOT}/skills/code-review/references/consolidation-rules.md` and apply the run order it specifies. The high-level sequence:

1. Collect all findings from all agents.
2. **Drop low-confidence** — remove any finding with `confidence < 80`.
3. **Default missing classifications** — MUST for critical/high severity, OPTIONAL for medium, QUESTION for low. No finding leaves Step 6 unclassified.
4. **Same-agent dedup** — within one agent's output, merge findings whose `(file, line)` AND `pattern` match.
5. **Cross-agent dedup with disagreement handling (G7 + G4)** — see Section A of `consolidation-rules.md`. Two findings dedup when location matches AND descriptions share Jaccard similarity ≥ 0.5 on token bigrams AND pattern matches. On classification disagreement, pick the weakest (QUESTION beats OPTIONAL beats MUST) and annotate the finding with the disagreement (shown only in the local preview).
6. **Pattern consolidation (G1)** — see Section B of `consolidation-rules.md`. Group remaining findings by `(pattern, classification)`. For any group with size ≥ 2 whose `suggested_fix` shapes are identical modulo identifier substitution, merge into a single finding anchored at the lowest (file, line). The merged body lists every location.
7. **Prevalence calibration (G3)** — see Section C of `consolidation-rules.md`. For every finding with `pattern_kind: "convention"`, run a codebase-prevalence probe via `grep` against a structurally-similar file glob. Reclassify: ≥0.8 keep MUST, 0.5–0.8 downgrade to Optional, <0.5 drop. Skip the probe for `pattern_kind ∈ {bug, project-rule, memory}`.
8. **Match existing PR review comments** (PR mode only). Fetch existing inline comments via `gh api repos/{owner}/{repo}/pulls/{pr}/comments`. For each remaining finding, check whether an existing comment already points at the same `file:line` and makes the same essential point. When it matches, **remove the finding from the Required / Suggestions / Questions buckets** and place it instead in a new **Existing Threads** bucket, recording:
   - The original comment ID (you'll need it to react/reply)
   - Stance: `react` if your point is identical to the existing comment, `reply` if you have something to add.
   - For `reply`: the body text you'd post inside the thread — keep it short, only what's actually additive.
9. **Match prior skill-authored reviews (G8)** — see Section D of `consolidation-rules.md`. Using the `{prior_skill_findings}` collected in Step 4c, suppress re-emission: if a candidate finding signature matches a prior skill comment, demote it to the **Existing Threads** bucket as a 👍-react on that prior comment. Exception: if the new finding is stricter than the prior (e.g., escalating Optional → MUST), keep it as a fresh finding.
10. Collect positive observations from Agent 8.
11. **Collect Obstacles Encountered** from every agent's output. Deduplicate identical entries and keep them verbatim. Drop entries that say "None".
12. Group by classification (MUST → OPTIONAL → QUESTION) and within each, sort by confidence descending.

Each finding leaving Step 6 has the shape described at the bottom of `references/consolidation-rules.md`.

### Step 7: Present findings

Before rendering the local preview, run two pre-passes:

**Pre-pass 7A — Tone adjustment (S5).** Rewrite each finding `body` to:
- Drop redundant "Why:" lines when the description already explains the why.
- Compress code blocks to ≤ 10 lines (replace longer segments with `// …`).
- Strip greetings, padding, and softeners ("I think", "It seems", "perhaps").
- Target ~30% reduction in body length.

Use an inline Haiku-model sub-agent for the rewrite — one call per finding is fine. Keep the original `body` available as `body_raw` in case the reviewer asks for it during `edit`.

**Pre-pass 7B — Self-review check (S2).** If `gh api user --jq '.login'` equals the PR author's login AND the computed verdict is `APPROVE`, prepend this banner to the local preview:

```
⚠️ Self-review detected — GitHub blocks self-approval; posting will fall back to event=COMMENT.
```

Now render the local preview:

```
## Code Review Results

{self-review banner from pre-pass 7B, if any}

### Summary Table (S7)
| Severity | Count | Pattern                                                |
|----------|-------|--------------------------------------------------------|
| 🔴 MUST  | {n}   | {pattern1 (locations), pattern2 (locations), ...}      |
| 🟡 Opt.  | {n}   | {pattern1, pattern2, ...}                              |
| 🔵 Q     | {n}   | {pattern1, pattern2, ...}                              |

*(Omit rows with count 0. Omit the whole table when zero findings posted.)*

_Within **Required Changes**, **Suggestions**, and **Questions**, separate consecutive items with a blank line so the developer can scan findings one at a time before approving the post._

### PR Discipline
{Phase 1 results}

### Positive Observations
- {things done well, from Agent 8. Omit section if none}

### Required Changes ({count})
Items that must be addressed before merge.

- [{confidence}%] **{file}:{line}** — {description}
  **Why:** {explanation}
  **Suggested fix:** {concrete code alternative}
  *(Pattern: {name}, Agents: {which agents agreed}{disagreement annotation if any})*

### Suggestions ({count})
Non-blocking improvements — author's discretion.

- [{confidence}%] [Optional] **{file}:{line}** — {description}
  *(Pattern: {name})*

### Questions ({count})
Clarification needed from the author. **For each Question, the reviewer can choose:**
  - `[k]` keep — post to author as a question (default)
  - `[r]` resolve in-place with own answer — won't be posted; offered for memory write-back in Step 9
  - `[d]` drop entirely

- [{confidence}%] [Question] **{file}:{line}** — {description}
  *(Pattern: {name})*
  > [k] keep / [r] resolve / [d] drop

### Confirmations of Existing Threads ({count})
Findings that overlap with existing reviewer comments — handled as reactions or threaded replies, not new findings. Omit this section if empty.

- 👍 react on comment {comment_id} (`{file}:{line}`) — {one-line reason}
- 💬 reply to comment {comment_id} (`{file}:{line}`):
  > {planned reply body, indented as a quote so the user can read what would be posted}

### DDD Assessment
#### Tactical ({count} MUST / {count} Optional)
#### Strategic ({count} MUST / {count} Optional)

### Project Rules Compliance
- {violations or "All checks passed"}

### Historical Context
- {relevant findings or "Nothing notable"}
- {stack-context findings from S4, if any — e.g., "Convention X was established in PR 2/4 of the stack and is followed correctly here"}

### Obstacles Encountered
Issues the review agents hit while doing their work — surfaced so the next step doesn't rediscover them.

- {obstacle 1, verbatim from the agent}
- {obstacle 2, verbatim from the agent}

*(Omit this section entirely if no agent reported any obstacles.)*

### Summary
{1-2 sentences: X required changes, Y suggestions, Z questions}
```

**In PR mode**: compute the planned review event using the rule in Step 8 (`REQUEST_CHANGES` if any MUST or Question, otherwise `APPROVE`), state it explicitly, then ask **"Post this review with status `{event}`? (yes/no/edit)"**
- **yes** → Post using the split format described in Step 8.
- **no** → Stop.
- **edit** → Let the user modify the local output, then post using the split format in Step 8. The `edit` flow MUST collect, for each Question, the reviewer's `k / r / d` choice (Questions marked `r` are dropped from posting and their reasoning is held for Step 9 memory write-back). Recompute the event after edits, since adding or removing MUSTs/Questions flips the verdict.

**In Local mode**: ask **"Would you like me to help fix any of these issues?"**

### Step 8: Post the review (PR mode, on "yes" or "edit")

The single-comment-dump approach is **not** what we want. GitHub already supports inline review comments — use them. A reviewer reading the PR should see each finding next to the code it's about, not have to scroll a wall of text and resolve file:line references mentally.

#### What goes where

Split every finding into one of three buckets:

- **Inline finding** — references a specific file:line that **is in the PR diff** on the RIGHT side (added or context lines in a hunk). Posted as an inline review comment on that exact line as part of the batched review.
- **General finding** — anything else: PR-level concerns (description placeholders, scope, naming), cross-file findings where the referenced file is not in the PR, or findings whose line is outside any diff hunk. Posted in the top-level review body under a "General Findings" section.
- **Existing Threads** (from Step 6) — findings already covered by another reviewer's open inline comment. Posted as either a 👍 reaction on the original comment (pure agreement, nothing to add) or a threaded reply inside the original thread (something to add). Never goes in the top-level body and never as a new inline comment — that duplicates the conversation.

The top-level review body contains **only** the metadata sections — never inline-eligible findings, and never a "Confirming existing review threads" section. Confirmations belong inside the threads they're confirming.

#### Top-level review body — exact template

```markdown
_This code review was made automatically by Krzysztof Trzos Code Review AI Skill._

## Summary
| Severity | Count | Pattern                                                |
|----------|-------|--------------------------------------------------------|
| 🔴 MUST  | {n}   | {pattern1 (locations), pattern2 (locations), ...}      |
| 🟡 Opt.  | {n}   | {pattern1, pattern2, ...}                              |
| 🔵 Q     | {n}   | {pattern1, pattern2, ...}                              |

*(Omit rows with count 0. Omit the entire Summary section when zero findings posted.)*

## PR Discipline
{Phase 1 results — Scope and Size verdicts, plus suggested splits if any}

## Positive Observations
- {good things, from Agent 8}

*(Omit the Positive Observations heading if there are none.)*

## General Findings
{Only PR-level or out-of-diff findings. Group by MUST → [Optional] → [Question].
 Omit the General Findings heading if there are none.}

### Required Changes
- [{confidence}%] {description}
  **Why:** {explanation}
  **Suggested fix:** {concrete alternative}

### Suggestions
- [{confidence}%] [Optional] {description}

### Questions
- [{confidence}%] [Question] {description}
```

**The template above is exhaustive.** The top-level body contains exactly: the auto-generation notice, Summary table, PR Discipline, Positive Observations, and General Findings. Nothing else.

**Do NOT include in the top-level body** — these are local-preview-only sections from Step 7, and posting them on the PR is noise:
- Historical Context
- DDD Assessment
- Project Rules Compliance
- Obstacles Encountered
- Summary
- Confirmations of Existing Threads (those go inside the threads themselves; see the harness-denial fallback for the one exception)

If the General Findings section has more than ~10 entries, wrap the Suggestions and Questions subsections in `<details><summary>…</summary>…</details>` so the comment stays readable.

**Auto-generation notice scope.** The `_This code review was made automatically by Krzysztof Trzos Code Review AI Skill._` line goes in the top-level body **only**. Do not append it to inline comment bodies, threaded replies, or any other artefact — one notice on the review is enough; repeating it on every comment is noise.

#### Inline comment body — exact template

Each inline finding posts to its file:line with a body like:

```markdown
**🔴 MUST** — {short title}

{description}

**Why:** {explanation, only for MUSTs}

**Suggested fix:**
```{lang}
{concrete alternative}
```

_Confidence: {N}% · Pattern: {name} · Agents: {which agreed}_
```

Use the badge that matches the classification:
- `**🔴 MUST**` for required changes
- `**🟡 [Optional]**` for suggestions
- `**🔵 [Question]**` for questions

For Optional and Question entries the **Why** and **Suggested fix** lines are not required — keep the body short.

**Do not append the auto-generation notice to inline comment bodies.** The notice belongs on the top-level review body only.

#### Validating that a line is in the diff

GitHub's review API rejects the **entire review** if any inline comment points at a line outside the diff hunks. Pre-validate:

1. Fetch hunk data:
   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr}/files --paginate --jq '.[] | {path, patch}'
   ```
2. For each `patch`, parse `@@ -a,b +c,d @@` headers to derive the set of valid RIGHT-side line numbers — every line in the hunk that begins with `+` or ` ` (a space, i.e. a context line), counted from `c` onward.
3. For each finding with `file:line`:
   - File not in the PR's files list → demote to **General Findings**.
   - File present but line not in the valid set → demote to **General Findings** (and prefix the entry with `\`{file}:{line}\` —` so the reader still sees the location).
   - Otherwise → keep as inline comment.

Why pre-validate: a single bad line on the batched review POST kills the whole submission with HTTP 422. Demoting to general findings is preferable to losing the entire post.

#### Choosing the review event

Pick the `event` value based on what's being posted, after the inline/general bucketing in the previous steps:

- **`REQUEST_CHANGES`** — the review contains at least one **MUST** or **[Question]**, anywhere (inline comments or General Findings). Either category signals the PR isn't ready: a MUST blocks merge, and a Question means the reviewer needs an answer before they can sign off.
- **`APPROVE`** — there are zero MUSTs and zero Questions across both buckets. Optionals alone are not blocking, so an otherwise-clean review with only suggestions is an approval.
- **`COMMENT`** — only used as a manual escape hatch when the user picks `edit` and explicitly asks to leave the review unsigned. Don't pick this automatically.

Compute this **after** validation/demotion, not before, since a MUST that gets demoted to General Findings (because its line isn't in the diff) still counts toward `REQUEST_CHANGES`.

GitHub forbids self-approving your own PR. If the `gh` user is the PR author and you computed `APPROVE`, the POST will return 422; in that case, retry with `event: COMMENT` and tell the user the review was posted unsigned because GitHub blocks self-approval.

#### Submitting

Use a single batched-review POST. This creates one review with all inline comments attached as a single conversation rather than many independent comments:

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/reviews \
  --method POST \
  --input - <<'JSON'
{
  "event": "REQUEST_CHANGES",
  "body": "<top-level body markdown>",
  "comments": [
    {"path": "src/Foo.php", "line": 42, "side": "RIGHT", "body": "<inline body>"},
    {"path": "src/Bar.php", "line": 17, "side": "RIGHT", "body": "<inline body>"}
  ]
}
JSON
```

- `event` — set per the rule above (`REQUEST_CHANGES` / `APPROVE` / `COMMENT`).
- `side: "RIGHT"` is the right default since findings are about the new version of the code. Use `"LEFT"` only if a finding is genuinely about a removed line.
- For multi-line findings, use `start_line` + `start_side` alongside `line` + `side`.
- Build the JSON payload safely (write it to a temp file with `Write`, then `gh api ... --input /tmp/review.json`) — embedding markdown bodies in a heredoc inside a Bash call is fragile when the body contains backticks or `$` characters.

If the POST fails:
- **422 with a comment-position error** — your validation missed a case. Inspect the response, demote the offending finding to General Findings, and retry.
- **403 / scope error** — the user's `gh` token lacks repo write or `pull_request` scope. Tell them what's missing instead of retrying.
- **Other** — report the response verbatim and stop. Do **not** silently fall back to a single `gh pr comment` dump; that defeats the purpose of this step.

When the POST succeeds, the response includes an `html_url`. Print it so the user can jump straight to their review.

#### Posting reactions and replies (Existing Threads bucket)

These are separate API calls — not part of the batched review POST. Run them **before** the main review POST so a failure here can fall back to the body before the main submission goes out.

**Order:**
1. Reactions first (cheapest, idempotent on retry).
2. Threaded replies second (one POST each).
3. Main batched review POST last.

**Reaction:**
```bash
gh api -X POST "repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions" \
  -f content=+1
```
The `content` field accepts: `+1`, `-1`, `laugh`, `confused`, `heart`, `hooray`, `rocket`, `eyes`. Default to `+1` for confirmations; pick another only if you have a clear reason and have surfaced it in Step 7.

**Threaded reply:**
```bash
# Write the body to a temp file first — heredocs and inline -f are fragile when
# the body contains backticks, $, or newlines.
gh api -X POST "repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies" \
  --input /tmp/reply-{comment_id}.json
```
where `/tmp/reply-{comment_id}.json` is a JSON file you wrote with `Write` containing `{"body": "<markdown reply>"}`.

**Do not append the auto-generation notice to threaded replies or reactions.** The notice belongs on the top-level review body only.

**Approval gate.** Never auto-post reactions or replies. The Step 7 "Confirmations of Existing Threads" section is the user-visible preview; the same `yes` / `no` / `edit` answer that approves the main review approves the planned reactions and replies. On `edit`, let the user strike specific entries (e.g., "drop the reply on comment X, react instead", "drop the react on comment Y entirely").

**Harness denial fallback.** Some Claude Code harness configurations refuse writes related to "posting on a PR you didn't author" with the denial reason *External System Writes*. When that happens for a reaction or reply:
- Don't silently drop the confirmation.
- Move the affected entry into the top-level review body under a fallback section titled `## Confirming existing review threads`, formatted exactly as the local Step 7 preview was rendered.
- Tell the user: "harness blocked posting on threads {comment_ids}; folded into the top-level body instead."

That fallback section is the **only** legitimate reason for a "Confirming existing review threads" heading to appear in the top-level body. In normal operation it never appears.

---

### Step 9: Memory write-back (S3)

After Step 8 posts successfully, compare the **local preview findings** (from Step 7) with the **posted findings**. Anywhere the reviewer made a judgment call worth remembering, offer to save a memory entry.

Read `${CLAUDE_PLUGIN_ROOT}/skills/code-review/references/reviewer-memory-loading.md` for the write-back procedure. The signals worth surfacing:

| Signal | Memory entry shape |
|--------|--------------------|
| Reviewer dropped a finding | "Don't flag X" rule |
| Reviewer marked a Question as `r` (resolve with own answer) | "Policy on X is Y" rule |
| Reviewer downgraded MUST → Optional via `edit` | "X is mixed convention, not strict" rule |
| Reviewer reworded a body substantially | Tone or terminology preference |

For each candidate signal, ask the reviewer:

```
Save this as a feedback memory so future runs apply it automatically?
  • rule: <generated rule statement>
  • why: <derived from the correction>
(yes / no / edit)
```

Default `no`. On yes (or yes-after-edit), write the file to `~/.claude/projects/<encoded_cwd>/memory/feedback_<slug>.md` and append the index line to `MEMORY.md`. Format per `reviewer-memory-loading.md` § Write-back file template.

Memory write-back is **optional** — skipping it doesn't break anything; the reviewer just won't get auto-applied rules on future runs.

---

## Re-review mode (S6)

Triggered when the user runs `/code-review:code-review <PR> --since-last-review` or types something like "re-review thread N" or "re-review this PR's open threads".

This mode skips Phases 1 and 2 entirely. It addresses author responses on the skill's prior review.

### Algorithm

1. Find the most recent skill-authored review using the marker line (see G8 in `references/consolidation-rules.md` § Section D).
2. Fetch all reply threads on its inline comments:
   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr}/comments --paginate \
     --jq '.[] | select(.in_reply_to_id != null) | {id, in_reply_to_id, body, user: .user.login, created_at}'
   ```
3. For each thread where the most recent reply is **from the PR author** (not the skill), classify the thread state via a focused single-agent call:

   Prompt:
   ```
   The skill posted this inline comment on {file}:{line}:

   <skill comment body>

   The author replied:

   <author reply body>

   Should the skill: WITHDRAW (author justified the original concern away), ESCALATE-TO-MUST (author's reply confirms the concern is real and blocking), KEEP (concern still stands but no new info to add), or REPLY-WITH (add a short clarification — provide the text)?

   Output exactly one of those four labels and, for REPLY-WITH, the reply text.
   ```

4. Apply the chosen action via `gh api`:
   - **WITHDRAW** → resolve the thread:
     ```bash
     gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<gid>"}) { thread { isResolved } } }'
     ```
     (You'll need to fetch the thread's GraphQL node id from `repos/{owner}/{repo}/pulls/{pr}` via GraphQL — REST API doesn't expose thread ids.)
   - **ESCALATE-TO-MUST** → post a reply that says explicitly "On reflection this is a blocking issue, not a question — please address before merge", then submit a fresh `REQUEST_CHANGES` review pointing at the same thread.
   - **KEEP** → do nothing; the thread stays open.
   - **REPLY-WITH** → post the reply text as a threaded reply (see the existing "Threaded reply" section above for the API).

5. Always show the planned action to the reviewer before applying it. Single combined prompt: `Re-review found N threads with author replies. Apply the planned actions? (yes/no/edit)`

### When NOT to run

- If no prior skill-authored review exists on the PR, fall through to a regular review.
- If every thread's last reply is from the skill itself (no author response yet), report "No new author responses since last review" and stop.

---

## Important Rules

- **Never auto-post.** Always show findings locally first and get explicit approval.
- **Classify every finding.** MUST / [Optional] / [Question]. Never leave a finding unclassified.
- **Explain WHY for MUST findings.** Every required change needs a reason and a concrete code alternative.
- **Acknowledge good work.** Positive observations matter.
- **Be specific.** Every finding must reference a file and line.
- **Be honest about confidence.** Don't inflate scores. If unsure, score lower.
- **Respect the 80% threshold.** Don't include low-confidence noise.
- **Deduplicate across agents.** Same issue from multiple agents → keep the most detailed, note agreement.
- **PR discipline comes first.** Scope/size violations are the most important feedback.
- **Don't nitpick style** if the project has a formatter/linter (ECS, PHP-CS-Fixer).
- **State review scope** when not reviewing everything: "Checked only Deptrac files."
- **Surface obstacles, don't hide them.** If a subagent reported a setup issue or workaround, it goes in the "Obstacles Encountered" section so follow-up work doesn't pay the same cost twice.
- **Inline comments belong on lines.** When posting to GitHub, every finding that points at a real file:line in the diff goes as an inline review comment on that line, not in the top-level body. The top-level body is reserved for the auto-generation notice, PR Discipline, Positive Observations, and genuinely PR-level findings (Step 8). Reviewers should see each finding next to the code it's about, not as a wall of file references.
- **Confirmations belong in the thread they're confirming.** When another reviewer (Copilot, a teammate) has already raised the same point, react with 👍 on their comment if you have nothing to add, or post a threaded reply inside their thread if you do. Never re-flag it as a new inline finding, and never collect confirmations under a "Confirming existing review threads" heading in the top-level body. The single exception is the harness-denial fallback documented in Step 8 — that's a graceful degradation, not the default path.
