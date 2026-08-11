# Pull request body template

Used for **single PRs** and **child PRs** of a stack (children are the review units, so this
is where Responsibility / Side effects matter most). The **collective PR** of a stack does
NOT use this template — its minimal bullet body is defined in `stacked-prs.md`.

**A repo-defined template wins over this one.** Before using this file, look for a PR template
the repository already mandates — `.github/pull_request_template.md`, or a "PR Body Template"
section in `CONTRIBUTING.md`. If one exists, its sections, headings and filling rules are
authoritative and this file is only the fallback; where they disagree, follow the repo. Check
two or three recent merged PRs to see which convention the team actually practises, since a
repo's written template and its habits sometimes drift (e.g. plain headings documented, emoji
headings used).

The ticket key lives in the PR **title only** — never repeat it anywhere in the body — *unless*
the repo's own template asks for a ticket reference in the body, which several do. Then include
it as a link, in the section that template names.

No AI-attribution footers ("Generated with Claude Code", co-author trailers, emoji
signatures) — the body ends with the last template section.

**The body carries only what a reader cannot get from the diff.** Two things are therefore
never included, in any section:

- **Check results.** No test / static-analysis / linter / build outcomes, and no list of
  commands run ("PHPUnit 16/16", "PHPStan level 8 clean", "all checks pass"). The pipeline
  reports those, and a body claiming green rots the moment a commit lands.
- **Restatements of the diff — including absences.** No inventory of what changed, and no
  "no DI change", "no new dependencies", "no migration needed". A reviewer reads the code for
  what; the body exists for why, trade-offs, and consequences that are invisible in the code.
  Exception: a repo-defined template may explicitly ask a section to enumerate the technical
  changes (this file's own **Side effects** does not — it wants only the incidental ones). Where
  it does, fill that section as the repo asks and keep the *why* content out of it.

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
- One short line per item — the "no paragraphs" rule above applies here too. This section
  attracts sprawl: if a bullet needs several sentences, the explanation probably belongs in
  the codebase's own docs, and the bullet should point at it instead.
- Nothing that duplicates the diff or a check run (see the rules at the top).
- For a stack's child PRs: the `Part of: …` line pointing at the collective
  (see `stacked-prs.md` — a pending note during the initial run, the collective PR URL
  after resume mode backfills it).
