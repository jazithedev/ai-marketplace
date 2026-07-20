---
name: create-pull-request
description: >-
  Create draft pull requests from the commits on the current branch — a single PR, or a stacked
  chain of PRs under a collective branch when the branch carries several reviewable commit groups
  (e.g. produced by /smart-commit:commit). Provider-agnostic: GitHub (gh) and GitLab (glab) are
  fully supported; other providers get a git-side setup plus web-creation links. Use whenever the
  user wants to create, open, raise, or publish a pull request / merge request — e.g. "open a PR
  for this", "create a merge request", "publish this branch as stacked PRs",
  "/create-pull-request". Also re-run it after a child PR of a stack merges: resume mode opens the
  collective PR and backfills links. The skill always proposes a full PR plan (shape, commit
  grouping, branch names, titles) and creates nothing before the user approves it.
argument-hint: [base-branch (default: auto-detected)]
allowed-tools: Bash(git:*), Bash(gh:*), Bash(glab:*), Grep, Glob, Read
---

# Create Pull Request

Create properly formatted **draft** pull requests from the commits on the current branch.

Two shapes, decided by the approved plan (Step 4):

- **Single** — one draft PR from the current branch targeting the base branch.
- **Stack** — a chain of draft child PRs under a *collective* branch. Used when the branch
  carries several independently reviewable commit groups. Mechanics live in
  `references/stacked-prs.md`.

Provider-specific commands are never used directly in this document. Every remote operation is
named abstractly (`check-auth`, `create-draft-pr`, `edit-pr-body`, `list-prs`, `get-default-branch`)
and resolved through the provider file selected in Step 1.

## Step 0: Resume check

Before anything else, determine whether a stack for this branch's ticket already exists
(remote branches or open PRs matching the resolved naming convention — see
`references/stacked-prs.md` → "Resume mode"). If one exists, **this run is a resume, not an
error**: jump to resume mode there. Never delete and recreate an existing stack.

## Step 1: Resolve context

Run in parallel, then resolve:

```bash
git remote get-url origin
git symbolic-ref refs/remotes/origin/HEAD   # default branch, e.g. refs/remotes/origin/main
git status
git branch --show-current
```

1. **Provider** — from the remote URL host:
   - `github.com` (or GitHub Enterprise host) → `references/providers/github.md`
   - `gitlab.` (gitlab.com or self-hosted) → `references/providers/gitlab.md`
   - anything else (Bitbucket, Gitea, …) → `references/providers/fallback.md`
2. **Base branch** — `$ARGUMENTS` if provided; otherwise the auto-detected default branch
   (fall back to the provider's `get-default-branch` operation if the symbolic-ref is unset).
   Never assume `master`.
3. **Auth** — run the provider's `check-auth` operation. If it fails, stop and tell the user
   how to authenticate (e.g. `gh auth login` / `glab auth login`).
4. **Naming convention** — resolve in this order:
   1. A convention already remembered for this repository (memory).
   2. Branch-naming / PR-title rules found in the repo's `CONTRIBUTING.md` (or similar docs).
   3. The skill default: branches `task/<TICKET>-<kebab-summary>`, titles
      `<TICKET>: <verb-led summary>` (chain variants in `references/stacked-prs.md`).

   Remember the resolved convention for this repository so later runs skip discovery.
5. **Ticket key** — extract from the branch name: Jira-style key first (`[A-Z]+-\d+`),
   then the first numeric segment. If nothing is found, ask the user for a reference or
   proceed without one — then every `<TICKET>` element (title prefix, branch segment) is
   simply omitted, never left as a placeholder.

## Step 2: Pre-flight checks

- Current branch must NOT be the base branch — abort if it is.
- Working tree should be clean — if dirty, warn the user and ask whether to proceed
  (proceeding publishes only the committed work; uncommitted changes stay local and
  untouched). Suggest committing first — ideally with `/smart-commit:commit`, whose logical
  groups map 1:1 onto this skill's PR groups.
- There must be at least one commit in `<base>..HEAD` — abort if there is nothing to merge.
  If the tree is dirty at the same time, don't just abort: point the user at
  `/smart-commit:commit` to shape the changes into commits, and offer to run it now —
  then re-run this skill (Step 3 will reuse its grouping analysis from the conversation).
- If the current branch name does not match the resolved convention, **warn and ask** — offer
  to create a compliant branch at the same tip (`git branch <name> && git switch <name>`;
  a rename, never a rewrite). Do not hard-abort over naming.

## Step 3: Analyze the changes

Run in parallel:

```bash
git diff <base>...HEAD                                  # full diff
git diff <base>...HEAD --stat                           # shape of the change
git log <base>..HEAD --format="%h %s%n%b" --reverse     # commits, oldest first
git rev-list --count HEAD..origin/<base>                # how far base has moved since branching
```

Read the diff and commits carefully. Understand what changed and why — the PR bodies are
derived from this, not from guesswork.

**Grouping proposal:** each commit is one candidate PR group (commits produced by
`/smart-commit:commit` are already decomposed into logical, dependency-ordered units — if that
skill ran earlier in this conversation, reuse its analysis). One commit → propose **single**.
Several commits → propose a **stack** with one group per commit, in original commit order.

## Step 4: Propose the PR plan — the single confirmation gate

Present the complete plan before touching the remote:

1. **Shape** — single, or stack of N (and why).
2. **Groups** — which commits form which PR; per group: branch name, draft PR title
   (≤70-char verb-led summary after any `<TICKET>:` prefix), base.
3. **Collective** (stack only) — branch name, and the note that its PR opens only after
   child 1 merges (re-run this skill to open it).
4. **Base branch and provider**, including any fallback degradation.
5. If `origin/<base>` has moved since the branch diverged, note it:
   *"base has moved N commits since you branched"* — informational, not a gate.

The user may **merge groups** ("commits 1+2 as one PR"), rename branches/titles, downgrade a
stack to a single PR, or cancel. Apply adjustments and re-show only what changed. After
approval, execute the whole plan without further per-PR confirmations.

**Never reorder commits.** Groups are created in original commit order — that order is what
guarantees conflict-free cherry-picks. An optional area label (derived from the conventional
commit scope or dominant paths, e.g. `feat(api):` → `api`) may decorate titles and branch
names (`[api][1]`), but it is never an ordering key. If the repo has a remembered label
taxonomy, use it; otherwise plain indexes are fine.

## Step 5: Execute

### Single

```bash
git push -u origin HEAD
```

Then the provider's `create-draft-pr` operation: base = the resolved base branch, head = the
current branch, title per convention, body rendered from
`references/pull-request-template.md`. The current branch **is** the PR branch — no new
branches, no cherry-picks in this mode.

### Stack

Follow `references/stacked-prs.md`. Summary of the contract: the collective branch is cut
empty from `origin/<base>`; children are cherry-picked slices chained onto it; the user's
working branch is never touched, force-pushed, or deleted.

## Step 6: Report

Return the created PR URL(s). For a stack, print the chain layout and the explicit pending
step (collective PR opens on re-run after child 1 merges) — formats are in
`references/stacked-prs.md`.

## Important notes

- ALWAYS create every PR as a **draft** (use the provider's draft semantics — never skip it).
- NEVER add AI-attribution footers to any PR body (e.g. "🤖 Generated with Claude Code",
  "Co-Authored-By: Claude") — bodies contain only the template's sections.
- NEVER force-push, amend, or reorder commits during this flow.
- NEVER skip the Step 4 confirmation gate unless the user explicitly says otherwise.
- NEVER touch the user's working branch in stack mode — it stays the local source of truth.
- Stacked mode requires a provider that auto-retargets a PR when its base branch is merged
  and deleted (GitHub and GitLab do). On fallback providers, offer single-PR mode instead —
  see `references/providers/fallback.md`.
