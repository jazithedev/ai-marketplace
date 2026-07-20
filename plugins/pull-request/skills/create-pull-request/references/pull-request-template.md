# Pull request body template

Used for **single PRs** and **child PRs** of a stack (children are the review units, so this
is where Responsibility / Side effects matter most). The **collective PR** of a stack does
NOT use this template — its minimal bullet body is defined in `stacked-prs.md`.

The ticket key lives in the PR **title only** — never repeat it anywhere in the body.

No AI-attribution footers ("Generated with Claude Code", co-author trailers, emoji
signatures) — the body ends with the last template section.

---

## ℹ️ Responsibility

- One clear sentence explaining WHY this PR exists and what it achieves.
- It should ideally consist of just one sentence with only one element and no "and" words.

## 🛠️ Side effects

- Small, incidental changes made along the way that aren't strictly required for this PR's main goal. Kept minimal on purpose — anything larger belongs in its own PR.
- Only list changes a reviewer wouldn't expect from the PR title.
- Keep each item to one short line `<what changed> → <why it was touched>` — no paragraphs.
- If the list grows past ~5 items, that's a signal to split into a separate PR.
- Group by type if there are several (renames, moves, cleanups).
- Omit the section entirely when there are none — don't write "None".

General examples:

```
- Renamed parameter $x → $y — clearer at call site
- Moved ClassName to New\Namespace — better fit for layer
- Added missing return type to methodName() — drive-by type safety
- Removed unused use import — left over from old code
- Fixed typo in docblock / comment
- Reordered constructor arguments to match convention
- Inlined a single-use variable for readability
```

## ⚠️ Additional comments

- Decisions, trade-offs, or context for reviewers.
- Links to related tickets, pull requests, resources (if relevant).
- Screenshots if UI changes are involved.
- For a stack's child PRs: the `Part of: …` line pointing at the collective
  (see `stacked-prs.md` — a pending note during the initial run, the collective PR URL
  after resume mode backfills it).
