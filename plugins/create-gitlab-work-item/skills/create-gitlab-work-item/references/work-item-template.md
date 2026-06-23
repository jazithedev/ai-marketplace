# GitLab work item description template

This is the canonical GitLab work-item template. Use it to assemble the **description** field as
GitLab-Flavored Markdown. Every heading below is a real `#`/`##` heading in the body. Fill each
section from the user's brief; never leave a placeholder like `<ID>` or "Describe…" in a real work
item — either populate it or omit the line.

## Section reference

### `# Context`
Always present. The whole context of the work item: what we want to achieve and why. One or two short
paragraphs is usually enough. **Read primarily by Product Managers** — keep it in plain,
outcome-focused language and minimise code-level technicals (class names, namespaces, types, table
names). Put technical detail in the Implementation Plan instead. If a technical reference is truly
necessary here, format it as inline code (see "Formatting technicals" below).

### Incident-only subsections (include **only** when the work-item type is `Incident`)
These live under `# Context`, before `# Expected Result`. Omit all three for Issue / Task / Test case.

```
## Data

A list of initial data to ease the engineer's work. Include only the lines that apply — use whatever
identifiers are meaningful in the relevant domain. Generic examples:

* Account / Customer ID: <ID>
* Affected entity ID: <ID>      (e.g. the record, order, or item involved)
* Reference ID: <ID>            (if applicable)
* Reference URL: <URL>          (if applicable)

## Steps to Reproduce

A simple numbered list of steps that reproduce the problem.

## Actual Result

What actually happens — the behaviour considered a bug or otherwise invalid.
```

### `# Expected Result`
Always present. The result we want to achieve in this work item. For Incidents, this is the correct
behaviour that should replace the actual result. Like Context, this is **PM-facing** — describe the
observable outcome in plain language and keep technicals to a minimum; format any that remain as
inline code.

### `# Acceptance Criteria`
Always present. A list of criteria in **GIVEN… WHEN… THEN…** format. Draft these from the brief, then
let the user refine them in the preview. Prefer several small, independently checkable criteria over
one big one.

**Formatting:** within each bullet, put `GIVEN`, `WHEN`, and `THEN` in **bold** and each on its own
line (a line break inside the same list item via `<br>`, not three separate bullets). This gives
every criterion a consistent, scannable shape. Example:

```
* **GIVEN** an account with no saved records<br>
  **WHEN** the user opens the list view<br>
  **THEN** an empty-state message is shown instead of a loading spinner
```

See `gitlab-markdown.md` for why `<br>` is used (GitLab renders it reliably inside a list item).

**Sentry follow-up criterion (conditional):** if the work item references any Sentry issue(s) — a
link in the Incident `## Data` section, or mentioned in the brief — add a criterion that the issue
must be **Resolved** once the work is done. Name the specific issue when known. Example:

```
* **GIVEN** the linked Sentry issue (`PROJECT-BACKEND-1A2B`)<br>
  **WHEN** this work item is delivered<br>
  **THEN** the Sentry issue is marked Resolved and stops recurring
```

Omit this when no Sentry issue is connected to the work item.

### `# QA Notes`  (**only when relevant** — directly after Acceptance Criteria)
Include this section **only** when the work item involves specific **API endpoints** or **console/CLI
commands**. Its job is to make a QA's testing easier by handing them the concrete entry points:

* API endpoints — method + path/URL, e.g. `` `POST /api/v2/reports/{id}/refresh` ``. Add a link if
  there's a relevant API doc or environment URL.
* Console / CLI commands — the command name **with its parameters/flags**, e.g.
  `` `bin/console app:report:regenerate --report-id=123 --force` ``. Use a fenced code block for a
  full command line.

Keep it concrete and copy-pasteable. Keep the visible `# QA Notes` **heading** and place the notes
inside a **collapsed `<details>` block** directly beneath it (see `gitlab-markdown.md`). If the work
item has no endpoints or commands to test through, **omit the section entirely** — never add an empty
or guessed QA Notes.

### `# Implementation Plan`  (heading + `<details>` — **only when a plan exists**)
Include this section **only** when the user provides or approves real implementation detail. If there
is no plan, omit the section entirely (do not emit an empty heading or block).

When present, keep the visible `# Implementation Plan` **heading**, then place the plan body inside a
**collapsed `<details>` block** directly beneath it — so the section is always visible but the detail
stays folded and the work item stays readable. See `gitlab-markdown.md` for the exact markup.

## Formatting technicals

Whenever a code-level token appears in **any** section, wrap it so it reads unambiguously:

- Class names, namespaces, types, method names, field/column names, config keys → **inline code**
  with backticks (illustrative names only): `` `InvoiceCalculator` ``, `` `Billing\Tax\VatResolver` ``,
  `` `int` ``, `` `order_items` ``.
- Multi-line snippets (method signatures, SQL, config, JSON) → a fenced code block.

This matters most in Context / Expected Result (where a stray bare class name confuses a PM), but
apply it everywhere for consistency — including inside the Implementation Plan block.

## Fields beyond the body

| Field | How the skill sets it |
|---|---|
| Project | Resolved repo-first, then remembered, then asked (see SKILL.md). Referenced by URL-encoded full path. |
| Type | Asked each time: `Issue`, `Incident`, `Task`, or `Test case` → `issue_type`. `Test case` needs Ultimate tier. |
| Epic | Optional. Group-level, Premium/Ultimate only; sent via `epic_id`. Created without it (with a note) if rejected. |
| Title | A concise, verb/subject-led title derived from the brief; confirmed in preview. |
| Labels | Asked (optional). Sent via `labels` as a comma-separated string. **Only existing labels** — never invent one (GitLab silently creates unknown labels) and never add one the user didn't ask for; validate before applying. |
| Assignee | Optional. Resolve username → numeric id (`users?username=…`); sent via `assignee_ids[]`. Default unassigned. |
| Confidential | Optional, **default off**. Sent via `confidential=true` when chosen. |
| Milestone | **Not set** by default (backlog). Optional; resolve title → numeric `milestone_id`. |
| Weight / Due date / Priority | **Not set** by the skill — left at project defaults. |

## Full skeleton (Issue / Task / Test case)

```
# Context

<context>

# Expected Result

<expected result>

# Acceptance Criteria

* **GIVEN** …<br>
  **WHEN** …<br>
  **THEN** …
* **GIVEN** …<br>
  **WHEN** …<br>
  **THEN** …

# QA Notes                    ← only if there are API endpoints / console commands; keep this heading…
<endpoints (method + path) and/or command names with params, inside a collapsed <details> beneath the heading>

# Implementation Plan        ← only if a plan exists; keep this heading…
<plan body inside a collapsed <details> directly beneath the heading>
```

## Full skeleton (Incident)

```
# Context

<context>

## Data

* Account / Customer ID: …
* Affected entity ID: …

## Steps to Reproduce

1. …
2. …

## Actual Result

<what happens>

# Expected Result

<what should happen>

# Acceptance Criteria

* **GIVEN** …<br>
  **WHEN** …<br>
  **THEN** …

# QA Notes                    ← only if there are API endpoints / console commands; keep this heading…
<endpoints (method + path) and/or command names with params, inside a collapsed <details> beneath the heading>

# Implementation Plan        ← only if a plan exists; keep this heading…
<plan body inside a collapsed <details> directly beneath the heading>
```
