# Agent Output Contract

Rules every review agent follows, regardless of which dimension it reviews. Your own agent file adds
the dimension-specific checks on top of this.

---

## 1. Anchor findings to lines this PR touches

**A finding must anchor to a line the PR adds or modifies.** You are reviewing a change, not auditing
a file.

Pre-existing code is **context you read, never a target you flag**. If a file already had eight
violations of a rule and this PR adds a ninth, the finding is the ninth one — the ask is never "and
also fix the other eight". Asking for pre-existing cleanup:

- Is scope creep, which this skill flags authors for in Phase 1. Don't commit it yourself.
- Will be rejected by GitHub as an inline comment (the line isn't in the diff) and get demoted to a
  vague PR-level note.
- Reads as though you didn't check what the PR actually did.

Practically:

- Before reporting `file:line`, confirm that line appears as an added or modified line in the diff.
- Reporting the pre-existing count as *context* is fine and often useful ("38 of 48 sibling files
  already do this"). Reporting it as an *ask* is not.
- When a genuine defect sits in unchanged code but the PR makes it reachable or materially worse, say
  exactly that, and anchor to the changed line that introduces the exposure.

If your instructions ask you to check something absent from the diff (a missing test, a missing
migration), report it as a PR-level finding with no `file:line` rather than inventing an anchor.

**One agent is exempt:** `previous-comments.md`, whose job is finding prior review feedback the author
did *not* act on — there the unchanged line is precisely the point. Those findings carry
`bucket: "general"` so the orchestrator posts them in the review body instead of attempting an inline
comment GitHub would reject. If your own agent file states an exemption, follow your agent file.

## 2. Read the full files, not only the hunks

Diff hunks hide the context that separates a real finding from a misreading — the rest of the class,
the helper the new code calls, what a refactor replaced. Read the full version of any file you intend
to report on.

The working copy may not contain the PR's files at all (on a stacked PR it usually doesn't). Use the
`{source_ref}` the orchestrator passes you:

```bash
git show {source_ref}:<path>                        # full file at PR head
git grep -n <pattern> {source_ref} -- <pathspec>    # search the PR's tree
```

A `grep` of the working copy returning nothing is **not** evidence that a symbol doesn't exist — check
against `{source_ref}` before concluding anything from an empty result.

## 3. Score two axes, not one

Emit both. They are independent, and collapsing them into a single number loses information the
orchestrator needs.

| Field | Question | Range |
|-------|----------|-------|
| `certainty` | Is this observation factually true of the code as written? | 0–100 |
| `materiality` | If true, how much does it matter? | `high` / `medium` / `low` |

**`certainty`** is about facts, never importance:

- **95** — verified by reading the code or running the check.
- **80–90** — clear from the diff, no plausible alternative reading.
- **50–79** — depends on context you couldn't see (a caller's guarantees, runtime config).
- **< 40** — speculation. Prefer not to report it.

**`materiality`** maps to classification:

- **high** → MUST: wrong behaviour, data loss, security, a broken published contract, or an explicit
  project/reviewer rule whose premise holds.
- **medium** → `[Optional]`: real improvement, author's discretion.
- **low** → `[Question]`: might well be deliberate; you need the author's rationale.

Never inflate `certainty` because a finding feels serious — that's `materiality`. `certainty: 95,
materiality: low` is an ordinary, useful finding. So is `certainty: 85, materiality: high`.

If you can verify a claim, verify it and score 95. Restating a guess more forcefully is not evidence.

## 4. Verify a reviewer-memory rule's premise before demanding it

When a `{reviewer_rules}` entry justifies itself with a **checkable claim about the codebase or its
tooling** — "these paths are excluded from coverage", "the linter rejects this", "the team removes
these", "X warns because Y" — check that claim before emitting a MUST, and report what you measured:

```
premise_check: { claim: "...", verdict: "holds" | "fails" | "unverifiable", measurement: "<verbatim>" }
```

Usually one command settles it: read the config file the rule names, or grep the sibling set for the
claimed prevalence.

- **Holds** → apply the rule as written.
- **Fails** → still report the finding, but at `materiality: medium` (Optional), with the measurement
  included. Do not drop it: the preference may stand even when its stated reason doesn't, and that
  call is the reviewer's.
- **Unverifiable cheaply** → cap at `medium` and say the premise is unverified.

Rules that assert only a preference — "use named parameters for multi-arg calls", "always add AAA
comments" — have no premise to check. Apply them directly; do not invent a prevalence test for a
matter of taste.

## 5. Report obstacles

End your output with an **Obstacles Encountered** line: setup issues, commands needing special flags,
environment quirks, anything the next step would otherwise rediscover. Write "None" if there were
none. A wrong assumption you had to correct mid-review belongs here too — it tells the orchestrator
which of your conclusions were hard-won.
