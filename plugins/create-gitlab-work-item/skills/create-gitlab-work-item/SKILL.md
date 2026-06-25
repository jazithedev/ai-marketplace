---
name: create-gitlab-work-item
description: >-
  Create a well-structured GitLab work item from a short brief, following a standard template
  (Context, Expected Result, Acceptance Criteria in GIVEN/WHEN/THEN, and optional collapsed QA
  Notes / Implementation Plan; plus Data / Steps to Reproduce / Actual Result for Incidents). Use
  whenever the user wants to create, raise, open, file, or log a GitLab work item / issue / ticket /
  incident / task / test case / bug / story — e.g. "create a GitLab issue for…", "raise a ticket
  about…", "open an incident for…", "log a task for…", "/create-gitlab-work-item". Also offer to use
  it proactively when the user describes a bug, task, or piece of work that clearly belongs in a
  work item, even if they don't explicitly say "GitLab". The skill creates the work item through the
  `glab` CLI (using `glab api` so it can set the native work-item type), defaults to the current
  repo's GitLab project, remembers a fallback project, drafts the content for the user to approve,
  and always previews the full work item before creating it. Because these are read by Product
  Managers, it keeps code-level technicals (class names, namespaces, types) out of the Context and
  Expected Result sections as far as possible — favouring the Implementation Plan for technical
  detail — and formats any technical tokens as inline code.
---

# Create a GitLab work item

Turn a short brief into a properly structured GitLab work item, using the standard template in
`references/work-item-template.md`. You draft the content; the user approves; you create it. The goal
is that the user types a sentence or two and gets back a clean, reviewable work item without having
to remember the template structure or which project to file to.

The skill creates work items through the **`glab` CLI** — specifically `glab api`, so it can set the
native GitLab **work-item type** (`issue`, `incident`, `task`, `test_case`), which plain
`glab issue create` cannot do. It defaults to the **current repo's GitLab project** and falls back to
a remembered project or a quick question — never to anything hard-coded.

## When to use it

Trigger on any explicit request to create/raise/open/file/log a GitLab work item, issue, ticket,
incident, task, or test case. Also offer it proactively: if the user describes a bug or a unit of
work that clearly wants to be a work item (e.g. "the export silently drops rows when the file is huge
— someone should fix that"), ask "Want me to raise a GitLab issue for this?" rather than waiting to
be told. Don't force it — a single offer is enough; if they decline, drop it.

## Workflow

Follow these steps in order. Each exists for a reason — the preview step in particular is what makes
it safe to let the skill draft content, because the user sees exactly what will be created before
anything hits GitLab.

### 1. Preflight checks

Run these three checks **up front, in this order**, before drafting anything. They mirror the Jira
skill's "if the tools aren't connected, stop" stance — never fabricate a work-item reference or URL.

1. **`glab` installed?** If `glab` is not on `PATH`, say so plainly, point the user to
   `https://gitlab.com/gitlab-org/cli` (or their package manager) to install it, and stop.
2. **`glab` authenticated?** Run `glab auth status`. If it fails, tell the user to authenticate —
   suggest they type `! glab auth login` in the prompt so it runs in this session — and stop.
3. **Target project resolvable?** Resolve the project (next step). This is a *fallback ask*, not a
   hard stop: if the project can't be auto-resolved, ask the user for it.

### 2. Resolve the target project

GitLab work items live in a project. Resolve it **repo-first**:

1. **Current repo wins.** If the working directory is a GitLab repository, use its project. Get the
   full path (`group/subgroup/project`) with `glab repo view` (e.g. `glab repo view -F json` and read
   `path_with_namespace`, falling back to parsing the GitLab remote). Announce it so the user can
   override — e.g. "Filing to **`group/project`** — say the word if you want a different project."
2. **Remembered fallback.** If the cwd is *not* a GitLab repo (e.g. it's a GitHub repo or no repo),
   recall the saved default project from memory (see "Remembering the project" below) and announce it.
3. **Ask.** If neither applies, ask the user for the `group/project` path. Don't try to enumerate
   projects — just ask.
4. If the user named a project in their request, use that and treat it as the new most-recent choice.

Throughout, the project is referenced by its **URL-encoded full path** in `glab api` calls — slashes
become `%2F`, e.g. `group%2Fsubgroup%2Fproject`. See `references/gitlab-markdown.md`.

### 3. Gather the brief and the work-item type

Ask the user (or infer from what they already said):

- **Work-item type** — one of `Issue`, `Incident`, `Task`, or `Test case`. This is a real GitLab
  field (`issue_type`) and it decides whether the Incident-only subsections appear:
  - `Issue` → plain issue (GitLab's default), for stories / features / general work.
  - `Incident` → GitLab's bug/outage object; **carries the bug subsections** (Data / Steps to
    Reproduce / Actual Result). It shows in the project's Incidents list but won't page anyone unless
    escalation policies are configured.
  - `Task` → GitLab work-item "task".
  - `Test case` → maps to `test_case`, which **requires the Ultimate tier**. If creation is later
    rejected for tier reasons, say so plainly and offer to fall back to `Issue`.
- **The brief** — a sentence or two on what the work item is about. You'll expand this into the
  template; ask only the follow-up questions you genuinely need (for an Incident: the relevant IDs
  and reproduction steps; for the others: the desired outcome).

Keep questioning light. The user chose this skill so they don't have to write the whole thing — pull
what you need, infer the rest, and let the preview catch anything you got wrong.

### 4. Draft the description from the template

Read `references/work-item-template.md` and assemble the **description** body as GitLab-Flavored
Markdown (see `references/gitlab-markdown.md` for the exact GFM, including `<details>` expanders):

- `# Context` — always.
- `## Data`, `## Steps to Reproduce`, `## Actual Result` — **only for Incidents**. Drop any Data line
  that doesn't apply rather than leaving `<…>` placeholders.
- `# Expected Result` — always.
- `# Acceptance Criteria` — always; draft GIVEN/WHEN/THEN criteria inferred from the brief. The user
  will refine them in the preview, so propose concrete criteria rather than vague ones. Format each
  criterion as a single bullet with **bold** `GIVEN` / `WHEN` / `THEN`, each on its own line within
  that bullet (line breaks inside the item via `<br>`, not three separate bullets) — see the template
  and `references/gitlab-markdown.md` for the exact markdown.
  - **Sentry follow-up:** if the work item references any Sentry issue(s) (e.g. a link in the Data
    section or mentioned in the brief), add a criterion that the linked Sentry issue is **Resolved**
    once the work is done — e.g. *GIVEN the linked Sentry issue / WHEN this work item is delivered /
    THEN the Sentry issue is marked Resolved and stops recurring.* Reference the specific issue
    (ID/link) when one is known. Skip this criterion when no Sentry issue is involved.
- `# QA Notes` — **only if the work item involves specific API endpoints or console/CLI commands.**
  Goes directly after Acceptance Criteria. List the concrete things that make a QA's testing easier:
  endpoint URLs/paths (with method), and console command names **with their parameters/flags spelled
  out** where you can. Format endpoints and commands as inline code (or a fenced block for a full
  command line). Render it as a visible `# QA Notes` **heading followed by a collapsed
  `<details>` block** that holds the notes. If the work item has no such endpoints or commands,
  **omit this section entirely** — don't add an empty or speculative QA Notes.
- `# Implementation Plan` — **only if the user provided or approved real implementation detail.** If
  there's no plan, omit the section entirely. When present, render it as a visible
  `# Implementation Plan` **heading followed by a collapsed `<details>` block** that holds the plan
  body — see `references/gitlab-markdown.md`.

**Audience-aware language.** `# Context` and `# Expected Result` are read primarily by Product
Managers, who won't recognise code-level technicals (class names, namespaces, types, method
signatures, table names). Keep those two sections in plain, outcome-focused language and minimise
technicals as far as you can — describe *what* and *why*, not *how*. The natural home for technical
detail is the `# Implementation Plan`. This is a strong preference, not an absolute rule: if a
specific technical reference genuinely belongs in Context or Expected Result to make it
unambiguous, keep it — but make it the exception.

Whenever a technical token *does* appear anywhere in the body (any section), format it as **inline
code** with backticks — e.g. `InvoiceCalculator`, `Billing\Tax\VatResolver`, `int`, `order_items` —
so it's visually distinct and unambiguous. Use a fenced code block for multi-line snippets
(signatures, config, SQL). (These are illustrative names only — use the real identifiers from
whatever codebase you're working in.)

When the body references a specific commit, merge request, or issue, **link it directly** rather than
leaving a bare identifier as plain text — the reader should be able to click through. Use a Markdown
link to the full URL, showing the short SHA as the link text — e.g.
`` [`f5a760db`](https://gitlab.com/<group>/<project>/-/commit/<full-40-char-sha>) `` for a commit — or
GitLab's native references that auto-link in-project: `!42` (merge request), `#7` (issue),
`` project@<sha> `` (cross-project commit). Never paste a raw SHA as plain text.

Also draft the **title** following `references/work-item-title-rules.md` — pick the pattern for the
chosen type, keep it to one outcome, and make it understandable without opening the work item. Keep
the title **PM-understandable**: default to plain language and include code-level technicals only when
omitting them creates real ambiguity, or when the work item is inherently very technical (e.g. a pure
refactor/infra change). When in doubt, leave them out — the body carries the detail.

### 5. Ask about epic, labels, assignee, confidentiality, then preview

- **Epic** (optional). GitLab epics live at the **group** level and require the **Premium/Ultimate**
  tier — they don't exist on Free. If the user provides an epic id/iid, attach it via `epic_id`. If
  the instance is Free tier or the attach fails, say so plainly and create the work item without it —
  never block creation. Don't enumerate epics proactively.
- **Labels** (optional — skip if the user has none). **Only ever apply labels that already exist** —
  GitLab silently creates a brand-new label if you pass an unknown name, which pollutes the shared
  label set. So: never invent a label, and never add one the user didn't explicitly ask for. Before
  applying a requested label, confirm it exists with `glab label list` (or
  `glab api "projects/<path>/labels?per_page=100&include_ancestor_groups=true"`). If a requested
  label doesn't exist, don't create it: tell the user it isn't an existing label and ask them to pick
  an existing one or drop it.
- **Assignee** (optional). The REST API wants numeric `assignee_ids`, not usernames. Resolve a
  username to an id with `glab api "users?username=<name>"` (take `id`); for self-assign, use
  `glab api user`. Default to **unassigned** if the user doesn't ask.
- **Confidential** (**default on**). Work items are created **confidential by default** — always send
  `confidential=true` unless the user explicitly asks for a public/non-confidential work item. State
  in the preview that it will be confidential so the user can opt out; only when they do, drop the flag
  (send `confidential=false` or omit it).
- **Milestone** is **not set by default** (the work item lands in the backlog). Only set one if the
  user explicitly asks — then resolve the title to a numeric `milestone_id` via
  `glab api "projects/<path>/milestones?title=<title>"` and, if none matches, say so rather than
  guessing.

Then show the user the **full assembled work item** for approval: project + type, title, epic (if
any), every description section rendered, and any labels / assignee / confidential flag. Before
showing it, sanity-check the title against `references/work-item-title-rules.md` (verb/subject-led,
one outcome, understandable without opening, within length). Wait for an explicit "yes / go / looks
good" before creating anything. This is non-negotiable — creating a work item is a real action in a
shared tracker. If they want changes, revise and re-show.

### 6. Create the work item

Create it with **`glab api`** (uniform path for all types). Write the markdown description to a temp
file and feed it on **stdin** with `-F description=@-` so newlines and special characters survive
intact — and so it works even when `glab` is installed as a confined **snap** that cannot read files
under hidden or arbitrary paths (a plain `-F description=@/path/to/file` fails there with "permission
denied"; stdin is opened by the unconfined shell). See `references/gitlab-markdown.md` for the full
field mapping and the `-F` (smart: `@file`/`@-`/booleans/numbers) vs `-f` (raw string) distinction —
note the short flags are the opposite of what you might guess. The shape is:

```
glab api --method POST "projects/<url-encoded-path>/issues" \
  -f title="<title>" \
  -F description=@- \
  -f issue_type=<issue|incident|task|test_case> \
  -F confidential=true \
  [-f labels="<existing,labels>"] \
  [-F milestone_id=<id>] \
  [-F epic_id=<id>] \
  [-F "assignee_ids[]=<id>"] \
  < body.md
```

- Pass **only existing** labels (validated in step 5) — never a new one.
- **Always pass `confidential=true`** — work items default to confidential. Drop the flag (or send
  `confidential=false`) **only** when the user explicitly asked for a public/non-confidential one.
- Omit any other optional flag the user didn't choose.
- **No** weight, due date, priority, or default assignee — leave the work item unassigned and in the
  backlog unless the user asked otherwise.
- If `test_case` creation is rejected for tier reasons, tell the user and offer to retry as `Issue`.
- If GitLab rejects `epic_id` (Free tier / no access), retry without it and note the epic wasn't
  attached.

### 7. Report back and update memory

- As the **very last thing** in the creation process, always display the created work item's
  **`web_url`** (returned in the `glab api` JSON response) alongside its reference (e.g.
  `group/project#42`, from `references.full`). Do this automatically every time; never ask the user
  whether they want the link. It is the final output of the workflow.
- Update the remembered preferences: set the default project (if it changed) and push this project to
  the top of the recents list.

## Remembering the project

Persist the user's filing preferences using your memory system so they survive across sessions.
Store:

- a **default** project (`group/path` + friendly name), and
- a short **recents** list of projects (most-recent first, ~5 entries).

Do **not** store host/auth — `glab` owns that. Use a stable, greppable memory slug such as
`gitlab-work-item-project-preference`. On each run, the current GitLab repo takes precedence (step 2);
memory is the fallback used when you're not in a GitLab repo. After a successful create, update the
default + recents.

**Caveat to be honest about:** Claude's auto-memory is scoped per project/repo, so preferences saved
while working in one repo may not be visible from another. If you can't find saved preferences, just
resolve the project from the current repo (step 2.1) or ask the user (step 2.3), then save them there
— worst case is a question or two the first time you're used in a new place. Don't pretend a
preference exists when you can't find one.

## Notes

- This is the **only** thing this skill does — create a work item. It does not transition, comment
  on, link, or edit existing ones. If the user asks for those, do them directly with the `glab` tools
  (`glab issue note`, `glab issue update`, etc.); don't shoehorn them in here.
- If `glab` isn't installed or authenticated, say so plainly and stop (step 1) — don't fabricate a
  reference or URL.
