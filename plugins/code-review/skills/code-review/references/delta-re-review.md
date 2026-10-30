# Delta Re-Review

Read this when Step 4c finds a prior skill-authored review whose marker SHA is **not** the current PR head, and the reviewer did not pass `--force`. The author pushed after our review, almost always to answer it.

A plain full review in that situation does three things badly:

- It re-raises findings that are already on the PR, and G8b then has to suppress them one by one.
- It never says which earlier findings were fixed, so the reviewer has to check each thread by hand.
- It leaves the author's replies unanswered. "Fixed" needs checking, and "I don't understand this question" needs a clearer answer.

This file changes the agent inputs and adds one output per prior finding. Phases 1–3 otherwise run as written in `SKILL.md`.

---

## 1. Build the delta

`{prior_sha}` is the SHA in the most recent skill-authored review's marker line.

```bash
git rev-parse --verify -q "${prior_sha}^{commit}" >/dev/null \
  || git fetch -q origin "$prior_sha" 2>/dev/null
git diff "$prior_sha" "{source_ref}" > "{work_dir}/delta.diff"
```

If the commit can't be fetched (a force-push removed it from the remote), write no `delta.diff`. Run the review on the full diff with the same brief, and add an Obstacles entry saying the delta could not be built.

Size stays a property of the whole PR. `{size_verdict}` still comes from Step 1. When it has not changed since the prior review, PR Discipline says so in one line rather than repeating the split.

## 2. Write `{prior_review_brief}`

One block, passed to **every** agent in place of the `{prior_review_brief}` slot in the Step 5 prompt. It holds:

1. The two SHAs and the delta path: `Prior review at {prior_sha}. Head is {head_sha}. New work: {work_dir}/delta.diff.`
2. Each prior finding, one line each: badge, `file:line`, signature, a one-sentence summary, thread state (`resolved` / `outdated`), and the author's reply quoted verbatim, or "no reply".
3. Points that human reviewers raised in the previous round, one line each, with the reviewer's login (no `@`).
4. This instruction, verbatim:

```
This is a re-review. Do NOT re-raise any finding listed above unless the new commits failed to
fix it or the fix itself introduced a new defect. Focus on: (a) whether each fix is correct and
complete, (b) new defects in the delta, (c) anything in the full diff the earlier review missed.
Every new factual claim the delta adds — a status code, an error code, a "every field does X" —
must be checked against the code or spec it describes, not taken from the prose.
If the author changed code because one of the findings above asked for it, do not ask for that
change to be undone or reshaped unless the result is wrong.
```

Write the brief to `{work_dir}/prior-review.md` when it runs past a screen, and pass the path instead.

**Agent 4 always runs in this mode**, even on a PR with no other comments: the fix-status table below is its job (`agents/previous-comments.md` § Fix status).

## 3. Turn each fix status into an action

Agent 4 reports one status per prior finding. Check each `FIXED` claim before acting on it: read the cited line at the head. A status that turns out wrong is corrected before anything is posted.

| Status | Action on the thread | Counts toward the event? |
|--------|----------------------|--------------------------|
| `FIXED` | No comment. Add the thread to `{threads_to_resolve}`. | No |
| `PARTLY_FIXED` | One to three sentences on what is left, as a reply in that thread. If the rest is blocking and the thread is outdated, post it fresh on the current line instead (Section D, *Outdated threads*). | Yes, at the remaining part's classification |
| `OPEN` | No comment. The thread already says it. | Yes, at its original classification |
| `ANSWERED`, settled | One sentence accepting the reason, then add the thread to `{threads_to_resolve}`. | No |
| `ANSWERED`, part left | One `[Question]` sentence asking for the missing part, with the same outdated-thread rule as `PARTLY_FIXED`. | Yes |
| `UNCLEAR_TO_AUTHOR` | Restate the point in two or three plain sentences. If restating it shows the point no longer matters, say so and add the thread to `{threads_to_resolve}`. | Only if it still stands |

New findings from the agents then go through Step 6 as usual. Section D sees the prior findings too, so a new candidate that repeats one is still matched by signature.

The event follows Step 8's rule over **new findings plus every prior `[Must]` or `[Question]` that is still `OPEN`, `PARTLY_FIXED` or not settled**. A review that only confirms fixes approves.

## 4. Resolving

Resolving a thread is public the moment it happens, so it follows the review's route:

- **Auto-approved review** → resolve every thread in `{threads_to_resolve}` right after the review POST succeeds.
- **Pending draft** → resolve nothing yet. Keep `{threads_to_resolve}` with the draft record. `submitting-a-draft.md` resolves them when the reviewer submits through the skill. Otherwise, list them in the hand-back message so the reviewer can resolve them.

Never resolve a thread that still holds a reply of ours raising a point the author has not answered.

## 5. What the reviewer sees

In the Step 7 preview, add a **Prior findings** table above Required Changes. It has one row per prior finding: status, `file:line`, the evidence line, and the planned action. Positive Observations name the fixes that landed. That is the part of a re-review the author most wants to hear, and the reviewer uses it to decide quickly.
