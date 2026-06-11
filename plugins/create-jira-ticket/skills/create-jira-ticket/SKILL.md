---
name: create-jira-ticket
description: >-
  Create a well-structured Jira ticket from a short brief, following a standard ticket template
  (Context, Expected Result, Acceptance Criteria in GIVEN/WHEN/THEN, and an optional collapsed
  Implementation Plan; plus Data / Steps to Reproduce / Actual Result for bugs). Use whenever the
  user wants to create, raise, open, file, or log a Jira ticket / issue / task / bug / story — e.g.
  "create a Jira ticket for…", "raise a ticket about…", "make a bug for…", "log a story for…",
  "/create-jira-ticket". Also offer to use it proactively when the user describes a bug, task, or
  piece of work that clearly belongs in a ticket, even if they don't explicitly say "Jira". The
  skill remembers which Jira site and board/project the user usually files to and reuses them,
  drafts the ticket content for the user to approve, and always previews the full ticket before
  creating it. Because these tickets are read by Product Managers, it keeps code-level technicals
  (class names, namespaces, types) out of the Context and Expected Result sections as far as
  possible — favouring the Implementation Plan for technical detail — and formats any technical
  tokens as inline code.
---

# Create a Jira ticket

Turn a short brief into a properly structured Jira ticket, using the standard template in
`references/ticket-template.md`. You draft the content; the user approves; you create it. The goal is
that the user types a sentence or two and gets back a clean, reviewable ticket without having to
remember the template structure or which project to file to.

The skill is **project- and site-agnostic** — the Jira site, project, and board all come from the
user's saved preferences or from a quick discovery step, never from anything hard-coded.

## When to use it

Trigger on any explicit request to create/raise/open/file/log a Jira ticket, issue, task, bug, or
story. Also offer it proactively: if the user describes a bug or a unit of work that clearly wants
to be a ticket (e.g. "the export silently drops rows when the file is huge — someone should fix
that"), ask "Want me to raise a Jira ticket for this?" rather than waiting to be told. Don't force
it — a single offer is enough; if they decline, drop it.

## Workflow

Follow these steps in order. Each exists for a reason — the preview step in particular is what makes
it safe to let the skill draft content, because the user sees exactly what will be created before
anything hits Jira.

### 1. Resolve the Jira site and target project

A "board" in this workflow just resolves to a **project**; the ticket is created in that project's
**backlog** (no sprint assignment). Resolve the site and project like this:

1. **Recall** the saved preferences from memory (see "Remembering site and board" below): the Jira
   **site** (used as `cloudId`) and the default **board/project**.
2. If no site is remembered, **discover** it with `getAccessibleAtlassianResources`, which lists the
   Atlassian sites the user can access (each with a `url` and `cloudId`). If there's exactly one,
   use it; if there are several, ask which one. Remember the choice.
3. For the project: if a default exists, use it but tell the user which one you're using so they can
   override ("Filing to **`<PROJECT-KEY>`** — say the word if you want a different board."). If the
   user named a board/project in their request, use that instead and treat it as the new
   most-recent choice.
4. If **nothing** is saved and none was named, ask the user to type the board name or project key.
   Don't try to enumerate every board on the site — just ask.
5. Once resolved, confirm the project key is valid if unsure (a quick `getVisibleJiraProjects`
   search by key), then remember it (see below).

### 2. Gather the brief and issue type

Ask the user (or infer from what they already said):

- **Issue type** — `Task`, `Bug`, or `Story`. This decides whether the bug-only subsections appear.
- **The brief** — a sentence or two on what the ticket is about. You'll expand this into the
  template; ask only the follow-up questions you genuinely need (for a bug: the relevant IDs and
  reproduction steps; for a task: the desired outcome).

Keep questioning light. The user chose this skill so they don't have to write the whole thing — pull
what you need, infer the rest, and let the preview catch anything you got wrong.

### 3. Draft the description from the template

Read `references/ticket-template.md` and assemble the **Description** body:

- `# Context` — always.
- `## Data`, `## Steps to Reproduce`, `## Actual Result` — **only for Bugs**. Drop any Data line that
  doesn't apply rather than leaving `<…>` placeholders.
- `# Expected Result` — always.
- `# Acceptance Criteria` — always; draft GIVEN/WHEN/THEN criteria inferred from the brief. The user
  will refine them in the preview, so propose concrete criteria rather than vague ones. Format each
  criterion as a single bullet with **bold** `GIVEN` / `WHEN` / `THEN`, each on its own line within
  that bullet (line breaks inside the item, not three separate bullets) — see the template and
  `references/creating-with-an-expander.md` for the exact markdown and ADF.
  - **Sentry follow-up:** if the ticket references any Sentry issue(s) (e.g. a link in the Data
    section or mentioned in the brief), add a criterion that the linked Sentry issue is **Resolved**
    once the work is done — e.g. *GIVEN the linked Sentry issue / WHEN this ticket is delivered /
    THEN the Sentry issue is marked Resolved and stops recurring.* Reference the specific issue
    (ID/link) when one is known. Skip this criterion when no Sentry issue is involved.
- `# QA Notes` — **only if the ticket involves specific API endpoints or console/CLI commands.**
  Goes directly after Acceptance Criteria. List the concrete things that make a QA's testing easier:
  endpoint URLs/paths (with method), and console command names **with their parameters/flags spelled
  out** where you can. Format endpoints and commands as inline code (or a fenced block for a full
  command line). Like the Implementation Plan, render it as a visible `# QA Notes` **heading
  followed by a collapsed expander** that holds the notes (not an expander on its own). If the ticket
  has no such endpoints or commands, **omit this section entirely** — don't add an empty or
  speculative QA Notes.
- `# Implementation Plan` — **only if the user provided or approved real implementation detail.** If
  there's no plan, omit the section entirely. When present, render it as a visible
  `# Implementation Plan` **heading followed by a collapsed expander** that holds the plan body (not
  an expander on its own) — see step 5 and `references/creating-with-an-expander.md`.

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

Also draft the **Summary** (title) following `references/ticket-title-rules.md` — pick the pattern
for the chosen issue type, keep it to one outcome, and make it understandable without opening the
ticket. Keep the title **PM-understandable**: default to plain language and include code-level
technicals only when omitting them creates real ambiguity, or when the ticket is inherently very
technical (e.g. a pure refactor/infra change). When in doubt, leave them out — the body carries the
detail.

### 4. Ask about parent, labels and components, then preview

- Ask whether the ticket has a **Parent** — usually an Epic in the same project (optional; skip if
  none). Accept an issue key (e.g. `ABC-123`). If the user doesn't know the key, offer to list the
  project's open epics with a quick JQL search
  (`project = <KEY> AND issuetype = Epic AND statusCategory != Done ORDER BY updated DESC`) and let
  them pick. The parent must belong to the **same project** as the ticket.
- Ask whether to add any **labels** or **components** (both optional — skip if the user has none).
  **Only ever apply labels that already exist** — Jira creates a brand-new label silently if you pass
  an unknown string, which pollutes the shared label set. So: never invent a label, and never add one
  the user didn't explicitly ask for. Before applying a requested label, confirm it exists (e.g. a
  quick `searchJiraIssuesUsingJql` with `labels = "<label>"` — if it returns at least one issue, the
  label is in use). If a requested label doesn't exist, don't create it: tell the user it isn't an
  existing label and ask them to pick an existing one or drop it. Components are defined per project,
  so an unknown component name simply fails rather than being created — still, only use real ones.
- Then show the user the **full assembled ticket** for approval: project + issue type, summary,
  parent (if any), every description section rendered, and any labels/components. Before showing it,
  sanity-check the summary against `references/ticket-title-rules.md` (verb/subject-led, one outcome,
  understandable without opening, within length). Wait for an explicit "yes / go /
  looks good" before creating anything. This is non-negotiable — creating a ticket is a real action
  in a shared tracker. If they want changes, revise and re-show.

### 5. Create the ticket

Use `createJiraIssue` with:

- `cloudId` = the resolved Jira site (hostname or UUID from step 1), plus `projectKey`,
  `issueTypeName`, `summary`, `description`.
- `parent = "<EPIC-KEY>"` when the user chose a parent (the `parent` param accepts an Epic key for
  standard issue types, not just subtasks). Omit it otherwise.
- `additional_fields` for labels/components when given, e.g.
  `{ "labels": ["data-export"], "components": [{ "name": "Backend" }] }`. Pass **only existing**
  labels here (validated in step 4) — never a new one.
- **No** priority, Definition of Done, or assignee — leave them at project defaults (unassigned,
  backlog).

Body format:
- **Neither QA Notes nor Implementation Plan** → `contentFormat: "markdown"`, description as markdown.
- **QA Notes and/or Implementation Plan present** → `contentFormat: "adf"` so their expanders render.
  Both are "heading + collapsed expander". Follow `references/creating-with-an-expander.md` for the
  ADF structure and the markdown fallback if ADF is rejected.

### 6. Report back and update memory

- As the **very last thing** in the creation process, always display the specific, clickable URL of
  the created ticket — `https://<jira-site>/browse/<KEY>` (build it from the resolved site) —
  alongside its key. Do this automatically every time; never ask the user whether they want the
  link. It is the final output of the workflow.
- Update the remembered preferences: keep the resolved site, set the default board (if it changed),
  and push this board to the top of the recents list.

## Remembering site and board

Persist the user's filing preferences using your memory system so they survive across sessions.
Store:

- the Jira **site** (hostname / `cloudId`),
- a **default** board/project (project key + friendly name), and
- a short **recents** list of boards (most-recent first, ~5 entries).

Use a stable, greppable memory slug such as `jira-ticket-board-preference`. On each run, recall it;
reuse the default silently but always announce it so the user can override; after a successful
create, update site + default + recents.

**Caveat to be honest about:** Claude's auto-memory is scoped per project/repo, so preferences saved
while working in one repo may not be visible from another. If you can't find saved preferences, just
discover the site (step 1.2) and ask the user for the board key (step 1.4), then save them there —
worst case is a question or two the first time you're used in a new project. Don't pretend a
preference exists when you can't find one.

## Notes

- This is the **only** thing this skill does — create a ticket. It does not transition, comment on,
  link, or edit existing tickets. If the user asks for those, do them directly with the Jira tools;
  don't shoehorn them in here.
- If the Atlassian MCP tools aren't connected, say so plainly and stop — don't fabricate a ticket
  key or URL.
