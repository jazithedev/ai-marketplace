# Multi-PR Mode — Reviewing PRs That Share a Ticket Together

Read this when the reviewer asks for **two or more PRs** in one request. It adds a planning phase
(Phase 0) in front of the normal flow and states, step by step, what changes inside Steps 1–8. Every
rule in `SKILL.md` that this file does not mention still applies unchanged.

## Why this mode exists

PRs that implement one ticket are one change cut into reviewable slices. Reviewing them one at a time
costs two things:

- **Duplicated work.** Each PR gets its own full agent wave, and each wave re-reads the same
  surrounding code, re-measures the same repo facts and re-derives the same conventions.
- **Blind spots at the seams.** An agent looking only at #13 cannot see that it implements #12's new
  interface incorrectly, or that #12 and #13 each add the same helper. Those are often the most
  valuable findings in the whole ticket, and they exist only when both PRs are in view.

So PRs that share a ticket are reviewed **in one agent wave**. Reviewing them together saves effort
and widens context. It changes nothing about the result's shape: **each PR still gets its own review,
with its own findings, its own discipline verdict and its own event.** The only visible trace on
GitHub is one extra line saying which PRs it was checked with.

---

## Phase 0 — Plan the review units

### Step 0a: Fetch every PR's grouping metadata

All PRs must be in the same repository. If the request spans repositories, group within each
repository separately: PRs in different repositories never share a tree, so they cannot share a wave.

For each PR, fetch the fields grouping needs. Use GraphQL for linked issues, because the
`closingIssuesReferences` JSON field of `gh pr view` does not exist in older `gh` releases and an
unknown field aborts the call:

```bash
gh api graphql -F owner={owner} -F repo={repo} -F pr={N} -f query='
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        number title body url headRefName baseRefName headRefOid
        additions deletions changedFiles author { login }
        closingIssuesReferences(first: 20) { nodes { number } }
      }
    }
  }'

gh api repos/{owner}/{repo}/pulls/{N}/commits --paginate --jq '.[].sha'   # the PR's own commits
```

The commit list is the PR's **own** commits. On a stacked PR, GitHub compares against the base branch,
so it lists only what this PR adds on top of the PR below it. Phase 0 uses it for stack detection and
Step 6 uses it for attribution. Keep it as a `sha → PR` map.

### Step 0b: Extract each PR's ticket keys

A PR's keys are the **union** of every source below. Two PRs belong together when they share **any**
key.

1. **Jira-style keys** — `\b[A-Z][A-Z0-9]{1,9}-[0-9]+\b` over the title, the body and the head branch
   name. Upper-case the branch name before matching: branches are usually lower-case
   (`task/bi-4821-pdf-export` → `BI-4821`).
2. **GitHub linked issues** — `closingIssuesReferences` from Step 0a, normalised to `#N`.
3. **Keyword references in the body** — `(close[sd]?|fix(e[sd])?|resolve[sd]?|refs?|related to)\s+#(\d+)`,
   case-insensitive, normalised to `#N`. GitHub only records closing links for PRs that target the
   default branch, so a stacked PR's `Fixes #42` never shows up in `closingIssuesReferences`. This
   pattern is what catches it.

Then discard false keys. A wrong key merges unrelated PRs, and the reviewer pays for that in
confusing cross-PR findings.

- Standards and encodings that match the Jira shape: `UTF-8`, `SHA-256`, `ISO-8601`, `RFC-…`,
  `PSR-…`, `HTTP-2`, `TLS-1`, `ES-2015`, `CVE-…`. Drop any key whose prefix is one of these.
- A `#N` that is itself a **pull request** ("depends on #12", "refs #12") points at a PR, not a
  ticket. Drop it when N is one of the requested PRs, or when
  `gh api repos/{owner}/{repo}/issues/{N} --jq '.pull_request != null'` prints `true`.
- A bare `#N` with no keyword in front is never a key. It is too often a list number or a PR mention.

### Step 0c: Form the groups

Run union-find over shared keys: any two PRs that share a key join, and joins chain transitively.
If #12 references `XX-1`, #13 references `XX-1` and `XX-2`, and #14 references `XX-2`, all three form
one group.

**Group on tickets only.** Two PRs stacked on each other but sharing no key stay in separate groups.
Stack relationships decide how a group is laid out (Step 0d). They never decide membership.

A PR with no key, or with keys no other requested PR shares, is a **solo unit**. It takes the normal
single-PR flow in `SKILL.md`, untouched.

`--no-group` anywhere in the arguments turns grouping off, and every PR becomes a solo unit.

### Step 0d: Lay out each group — stacks, loose PRs, gaps

Inside a group, find stack links. PR X sits on PR Y when `X.baseRefName == Y.headRefName`. Walk each
member's chain downward until it reaches the default branch:

```bash
gh pr list --head <baseRefName> --state all --json number,headRefName,baseRefName
```

That walk can pass through PRs that are **not** members of the group: some other ticket's PR, or a PR
the reviewer did not ask about. Those are **gap PRs**.

Split the group into **components**:

- **Stack component** — members joined through one chain, gaps included. Its **top** is the highest
  member. Its tree is the top member's head, which physically holds every PR below it.
- **Loose component** — a single member that shares no chain with another member.

A group can be all stack, all loose, or a mix of both, and the layout below handles each the same way.

**Gap PRs are context, never targets.** Their commits stay in the reviewed tree so agents read the real
code, but they are labelled context-only and nothing is posted to them from this unit. If a gap PR was
requested too, it is reviewed in its own unit (its own group or solo) and receives its feedback there,
**including** any finding this unit blames on its code (Step 6, 5b hands it over).

### Step 0e: Announce the plan, then run it

Print the plan before any agent runs. It is a statement, not a question: the reviewer asked for the
review, and anyone who disagrees with a grouping can interrupt or re-run with `--no-group`.

```
Review plan — 6 PRs → 4 units:
  Unit 1  XX-2000      #12 ← #13 ← #14   stack (top #14)
  Unit 2  XX-2010, #88 #15, #16          side by side
  Unit 3  solo         #17
  Unit 4  solo         #18
  Gap context: #13 is in XX-2000's stack but references XX-9 → context only
Running 2 units at a time.
```

### Scheduling — at most two units in flight

Run units **in pairs**. Order them so that a requested gap PR's own unit is consolidated **after** every
stack unit it sits inside (in the same pair, or a later one). Findings handed over by Step 6 then
arrive before that unit posts. Launch both units' agent waves in **one message**, up to ~18 agents, because
two independent waves wait on the same clock. Then consolidate and post them **one unit at a time**:
Steps 6–8 are the orchestrator's own reasoning, and keeping two units' findings apart in one pass is
how a finding lands on the wrong PR. Then start the next pair.

The cap is two because each unit already runs up to nine agents. A larger fan-out invites rate-limit
throttling, and an agent that dies to a 429 leaves the silent gap the launch rules in Step 5 exist to
prevent.

After the last unit, print a roll-up: one line per PR with its event, its draft or review URL, and its
unit.

---

## Inside a group unit — what changes in Steps 1–8

### Step 1 — Metadata and size, per PR

Fetch Step 1's metadata and diff for **every member** (gap PRs need no metadata). Compute
`{size_verdict}` **per PR**, from that PR's own `additions + deletions`, and pass all of them as
`{size_verdicts}`:

```
#12  180 lines (+160/-20), 4 files — TARGET
#13  350 lines (+330/-20), 7 files — ACCEPTABLE
```

**Never sum them.** A ticket split into three 150-line PRs is exactly the outcome PR discipline asks
for. A summed 450 would report the author's good behaviour as a MUST_SPLIT.

### Step 2 — One ref per PR

Fetch `refs/pull/<N>/head:refs/pr/<N>` for every member **and every gap PR**. In a stack component,
`{source_ref}` is the top member's ref. In a loose component it is that PR's ref. Tear all of them down
after Step 9.

### Step 3 — The unit workspace

```
{work_dir}/
├── unit.md              # the manifest, below
├── pr.diff              # every member's own diff, one section per PR
└── files/
    ├── 14/<path>        # stack component: changed files of all its PRs, read at the TOP ref
    ├── 15/<path>        # loose component: that PR's changed files at its own ref
    └── 16/<path>
```

- `files/<N>/` is keyed by the **component**: the top member's number for a stack, the PR's own number
  for a loose PR. A stack component holds the union of its PRs' changed files (gap PRs' included),
  each read at the top ref. One coherent tree, so agents see the code as it will actually be.
- Loose components sit **side by side** and are never merged. When two loose PRs touch the same file,
  both versions are present, each under its own directory.
- `pr.diff` concatenates each member's `gh pr diff <N>`, and each gap PR's under a `CONTEXT ONLY`
  header. On a stacked PR, `gh pr diff` already holds only that PR's own changes, so the sections never
  overlap.

  ```
  # ==== PR #12 — XX-2000 — stack 1/3 (base: main) — size TARGET ====
  …
  # ==== PR #13 — CONTEXT ONLY (gap: references XX-9, not part of this unit) ====
  …
  # ==== PR #14 — XX-2000 — stack 3/3, top (base: feature/xx-2000-step-2) ====
  ```

`unit.md` is the shared map every agent reads first:

```
UNIT 1 — ticket XX-2000 — stack
Members (bottom → top): #12, #14        Gap (context only): #13
Component 14 (stack): files/14/ = tree at refs/pr/14
  #12  base main                    own commits: a1b2c3d e4f5a6b
  #13  GAP, context only            own commits: 9c8d7e6
  #14  base feature/xx-2000-step-2  own commits: 0f1e2d3
Reporting rule: tag every finding with `prs`. See agent-output-contract.md § 7.
```

### Step 4 — Context, once per unit

- **4a / 4b:** gather once for the unit. Read rules from every directory any member touches.
- **4c, per PR:** fetch prior skill-authored reviews, inline comments and thread state for **each**
  member, and key `{prior_skill_findings}` by PR. Then apply Win 5 per PR, which yields the unit's
  `changed` set:
  - A member with a skill review at its current head SHA and unchanged memory mtime is **unchanged**.
    It stays in the unit as context, because the other members' review needs it, but nothing is
    posted to it unless Step 6 attributes it a **new cross-PR finding** (see Step 8).
  - **Every** member unchanged → skip the unit and print Win 5's skip line once per PR.
  - A member whose most recent skill review is still `PENDING` is excluded from posting. Report its
    pending-draft URL as Step 4c does, and keep it as context.
- **4d:** the layout from Step 0d replaces stacked-PR detection. Give Agent 3 the full chain,
  including gaps.
- **4e:** measure repo facts once per unit, against each component's `{source_ref}`.

### Step 5 — One wave per unit

The unit runs **one** wave with the normal roster and the normal skip rules, judged against the whole
unit's diff. Every agent additionally receives `{work_dir}/unit.md`. Two agents change their inputs:

- **Agent A** receives every member's title, description and file list, plus `{size_verdicts}`, and
  returns **one discipline verdict per member** (see `agents/scope-analysis.md` § Group units).
- **Agent 4** runs once for the unit, with each member's comments and `{prior_skill_findings}`. Skip it
  only when **no** member has any review or comment.

### Step 6 — Attribute, then split per PR

Run Step 6 as written up to and including cross-agent dedup (sub-step 5), over the whole unit's
findings. Duplicates across agents are the same observation no matter which PR it lands on. Then insert:

**5b. Attribute every finding to its PR(s) and split it.**

1. **Loose component:** the directory under `files/` and the `prs` tag already name the PR, and line
   numbers are already that PR's own. Confirm the line sits inside that PR's section of `pr.diff`.
2. **Stack component:** **blame decides, not the agent's tag.** At the top ref:

   ```bash
   git blame --porcelain -L <line>,<line> refs/pr/<top> -- <file>
   ```

   Look up the blamed commit in the `sha → PR` map from Step 0a. The PR whose commit last wrote the
   line owns it, so a line #12 added and #14 later changed belongs to #14.
   - The owner is a **member** → attribute it there. Where blame and the agent's `prs` tag disagree,
     blame wins. Note the disagreement in the local preview only.
   - The owner is a **gap PR** → remove it from this unit, because it is that PR's code. Never let it
     vanish: it was found only because the stack above gave the agents context the gap PR's own review
     lacks.
     - Gap PR **requested** → hand the finding to that PR's unit, which adds it to its own Step 6
       input before sub-step 6, anchored and validated against that PR's head like any of its findings.
       If that unit has somehow posted already, list the finding in the final roll-up as
       `late finding for #13, not posted` with its full text.
     - Gap PR **not requested** → do not post on a PR nobody asked about. List the finding in this
       unit's local preview under **Not posted: belongs to unrequested PR #13**.
   - The commit is in **no** PR's list → the line predates the stack. The output contract (§ 1)
     already forbids anchoring there, so drop the finding the way Step 6 drops any off-diff anchor.
3. **Re-anchor into the owner's own head.** The top-ref line number is not the owner's line number
   when later PRs moved code. Take the exact line text and find it in `refs/pr/<owner>:<file>`. If
   there is one match, use it. If there are several, take the one closest to blame's `orig-line`. If
   there is none, or the line falls outside the owner's valid RIGHT-side set (Step 8), the finding
   becomes that PR's **General Finding**, prefixed with the top-ref location.
4. **Cross-PR finding** (`prs` names two or more members, each with its own entry in
   `locations_by_pr` — see `agent-output-contract.md` § 7): emit **one copy per involved PR**, anchored at that PR's own line. Each body names the counterpart:
   `Related: #13 \`src/Foo/Handler.php:42\``. Classify **per copy**: a PR in `fix_lands_on`, whose code has to
   change, keeps the finding's classification; a PR involved only as the counterpart gets its copy as
   `[Optional]` pointing at where the fix lands. When either side could carry the fix (a helper
   duplicated in both), both copies keep the classification. Give every copy the same signature, so
   Section D recognises it as one rule on the next run.

A finding attributed to an **unchanged** member (Step 4c) that is not a cross-PR copy is not posted.
List it in the local preview under **Not posted: #12 unchanged since its last review**, so the
reviewer can still act on it, e.g. by re-running that PR with `--force`.

From sub-step 6 onward, run the rest of Step 6 **per PR**. Pattern consolidation (G1) merges only
within one PR, because a Locations list may name only lines that PR's author can change. Steps 8 and 9
match against **that** PR's existing comments and prior skill findings.

### Step 7 — One preview, one section per PR

Render the normal preview once per member, in stack order (bottom to top), then loose PRs by number.
Head the unit with one line, e.g. `Unit 1 — XX-2000 — #12, #14 reviewed together as a stack`, and list
the unit under **Review Scope** with its gap PRs. Each PR's section is the ordinary Step 7 preview:
its own discipline banner, summary table, findings and event. Routing (auto-post a clean `APPROVE`,
draft everything else) is decided **per PR**.

### Step 8 — One review per PR

Each member gets its own payload, its own diff-line validation against **its own** `files` hunks, and
its own event.

**The grouping line.** Directly under the marker line, as the second line of the body, add:

```markdown
_Reviewed together with #13, #14 (XX-2000) as a stack._
_Reviewed together with #16 (XX-2010) side by side._
```

Name **members only**: the other PRs of this unit that share the ticket. Gap PRs are context and are
never named. The marker line stays **byte-identical**. Win 5 and Section D parse it by its first line, and a
changed marker would break both on every grouped PR. Solo units get no second line.

**Posting targets:** members in the unit's `changed` set, plus any unchanged member that Step 6 gave a
**new** cross-PR finding. The second kind gets a review holding only those findings, routed like any
other review. A gap PR never receives anything from this unit.

### Step 9 and teardown

Memory write-back runs once for the whole request, after the last unit. Delete every `refs/pr/<N>` the
unit fetched, members and gaps alike, and its `{work_dir}`.

---

## Not affected

- **Local mode.** It reviews one working tree, so there is nothing to group.
- **Re-review mode (S6).** It triages author replies per thread. With several PRs, run it once per PR,
  ungrouped.
- **A single requested PR that happens to be stacked.** Only requested PRs are grouped. A lone stacked
  PR keeps Step 4d's stack awareness, exactly as before.
