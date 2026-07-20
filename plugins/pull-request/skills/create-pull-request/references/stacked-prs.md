# Stacked PRs — the collective + chain shape

Read this when the approved plan (SKILL.md Step 4) is a **stack**, or when Step 0 detected an
existing stack (→ "Resume mode" below). All remote operations use the provider file resolved
in SKILL.md Step 1; `<base>` is the resolved base branch.

## Shape

```
<base>
  ← collective branch          (starts EMPTY — identical to origin/<base>; PR opens later)
      ← child 1                (group 1's commits; base: collective)
          ← child 2            (group 2's commits; base: child 1's branch)
              ← child 3        (…and so on, strictly in original commit order)
```

- **Children are the review units.** Each carries one approved commit group and merges into
  its base one by one: child 1 merges into the collective; when child 1's branch is deleted,
  the provider auto-retargets child 2 onto the collective; and so on down the chain.
- **The collective is the integration vehicle.** It accumulates the children and lands on
  `<base>` in one final merge. It starts with **zero commits of its own** and stays that way —
  never add an `--allow-empty` seed commit.
- **Consequence:** the collective's own PR *cannot* be opened during the initial run (a PR
  needs at least one commit between base and head). Opening it is owned by **resume mode**:
  after child 1 merges, re-running this skill opens it and backfills links. The final report
  states this explicitly.

## Branch naming (skill defaults — the resolved repo convention wins)

```
task/<TICKET>-collective-<kebab-summary>       # collective
task/<TICKET>-<LABEL>-<N>-<kebab-summary>      # child, when an area label is in use
task/<TICKET>-<N>-<kebab-summary>              # child, no label taxonomy
```

- `<TICKET>` — uppercase ticket key; omit the segment entirely when there is no ticket
  (e.g. `task/collective-<kebab-summary>`).
- `<LABEL>` — the optional area label from the plan (derived from commit scope/paths, or the
  repo's remembered taxonomy). Purely decorative — never reorder groups by label.
- `<N>` — 1-based index (within the label if one is used, otherwise global).
- `<kebab-summary>` — first ~5 words of the commit subject, kebab-cased, conventional-commit
  prefix stripped.

Titles follow the same logic: `<TICKET>: [<LABEL>][<N>] <verb-led summary>` for children
(≤70 chars after the prefix; drop the `[<LABEL>]` or `[<N>]` parts that don't apply) and
`<TICKET>: [Collective] <ticket summary>` for the collective.

## Initial run

### 1. Create the collective branch (empty — never seeded)

The branching idiom below never checks out `<base>` itself, so it works from any checkout —
including worktrees where `<base>` is held by the main checkout — and never disturbs the
user's local `<base>`:

```bash
git fetch origin <base>
git checkout -b <collective-branch> origin/<base>
git push -u origin <collective-branch>
```

### 2. Create the child branches and PRs, in original commit order

For each group `i` (1-indexed), oldest first:

```bash
PREV=<collective-branch for i=1, otherwise child i-1's branch>
git checkout -b <child-branch-i> "$PREV"
git cherry-pick <hash…>        # the group's commits, in their original order
git push -u origin <child-branch-i>
```

Then the provider's `create-draft-pr` operation:

- base = `$PREV`, head = `<child-branch-i>`, title per the naming rules above.
- body = `references/pull-request-template.md`, filled from the group's commits and diff,
  plus this line under **⚠️ Additional comments**:

  > Part of: `<TICKET>` collective (collective PR opens after this chain's first child
  > merges — re-run `/create-pull-request` to open it)

  Resume mode later replaces that line with the real collective PR URL.

Cherry-picking onto a chain that contains all prior groups **in original order** is what keeps
this conflict-free — that invariant is why reordering is forbidden.

Afterwards, return to the user's working branch (`git switch <working-branch>`). The working
branch itself is never pushed, rewritten, or deleted by this flow.

### 3. Verify the chain

```bash
# provider operation: list-prs for the ticket / branch prefix
```

Check: every PR is a draft; child 1's base is the collective; each later child's base is the
previous child's branch; the collective PR is **absent** (expected — it opens in resume mode).
If anything is off, surface it to the user — do not auto-rebase or re-target.

### 4. Report

```
✅ Stack created (each PR's base is the one above it):

  <base>
    ← <collective-branch>            (collective PR NOT open yet — see below)
        ← <child-1 URL>   <title>    (base: collective)
            ← <child-2 URL>   <title>    (base: child 1)
                ← …

Next step: after child 1 merges into the collective, re-run /create-pull-request —
resume mode will open the collective PR and backfill its URL into every child.
```

## Resume mode

Entered from SKILL.md Step 0 when a stack already exists for the resolved ticket/branch
prefix. Detect via the remote, not local state (a resume may happen in a fresh session):

```bash
git fetch origin
git ls-remote --heads origin "task/<TICKET>-*"     # adjust to the resolved convention
# provider operation: list-prs for the ticket
```

Then act on the state found:

1. **Collective branch has commits, but no open collective PR** → open it now:
   - `create-draft-pr`: base = `<base>`, head = the collective branch,
     title `<TICKET>: [Collective] <ticket summary>`, body exactly:

     ```
     - <one sentence: what this collective introduces / solves — do not repeat the ticket key>
     - This is a collective PR; its code changes are reviewed in the related child PRs below.
     - Related PRs:
       - <child PR URLs, in chain order — including already-merged ones>
     ```
   - Backfill: `edit-pr-body` on every still-open child, replacing the pending
     `Part of:` line with `Part of: <collective PR URL>`.
2. **Collective branch still equals `origin/<base>`** → nothing to open yet. Report the
   chain status (which children are open/merged) and remind that the collective PR opens
   once child 1 merges.
3. **Collective PR already open** → pure status report; re-check that every still-open
   child's `Part of:` line carries the URL, and backfill any that don't.
4. **New commits on the working branch that are in no child** → offer to extend the stack:
   new groups chain off the **last** child, following "Initial run" step 2. Confirmation
   gate applies to the extension plan.

Re-running is the designed happy path — never treat an existing stack as a conflict, and
never delete or recreate its branches.

## Edge cases

- **`check-auth` fails** → stop; tell the user how to authenticate for this provider.
- **`origin` missing or ambiguous** → ask the user — don't assume.
- **Cherry-pick conflict** → `git cherry-pick --abort`, stop, and report. With strict
  original-order chaining this indicates the base has moved in a conflicting way since the
  branch diverged — suggest rebasing the working branch onto `origin/<base>` first, then
  re-running.
- **Title exceeds the length rule** → shorten the summary portion; keep the prefix intact.
- **A group has no commits** (e.g. after user regrouping) → skip it; never create empty PRs.
- **Provider does not auto-retarget** (fallback providers) → the chain's merge flow breaks at
  every merge. Don't build a stack there; offer single-PR mode or manual instructions
  (`references/providers/fallback.md`).
- **User asked for a stack but only one group survived the plan** → that's a single PR;
  say so in the plan instead of building a one-child collective (pure overhead).
