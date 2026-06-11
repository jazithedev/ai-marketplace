# Jira ticket description template

This is the canonical Jira ticket template. Use it to assemble the **Description** field. Every heading below is a real `#`/`##` heading
in the ticket body. Fill each section from the user's brief; never leave a placeholder like
`<ID>` or "Describe…" in a real ticket — either populate it or omit the line.

## Section reference

### `# Context`
Always present. The whole context of the ticket: what we want to achieve and why. One or two
short paragraphs is usually enough. **Read primarily by Product Managers** — keep it in plain,
outcome-focused language and minimise code-level technicals (class names, namespaces, types, table
names). Put technical detail in the Implementation Plan instead. If a technical reference is truly
necessary here, format it as inline code (see "Formatting technicals" below).

### Bug-only subsections (include **only** when issue type is `Bug`)
These live under `# Context`, before `# Expected Result`. Omit all three for Task/Story.

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
Always present. The result we want to achieve in this ticket. For bugs, this is the correct
behaviour that should replace the actual result. Like Context, this is **PM-facing** — describe the
observable outcome in plain language and keep technicals to a minimum; format any that remain as
inline code.

### `# Acceptance Criteria`
Always present. A list of criteria in **GIVEN… WHEN… THEN…** format. Draft these from the brief,
then let the user refine them in the preview. Prefer several small, independently checkable
criteria over one big one.

**Formatting:** within each bullet, put `GIVEN`, `WHEN`, and `THEN` in **bold** and each on its own
line (a line break inside the same list item, not three separate bullets). This gives every
criterion a consistent, scannable shape. Example:

```
* **GIVEN** an account with no saved records
  **WHEN** the user opens the list view
  **THEN** an empty-state message is shown instead of a loading spinner
```

In markdown, end the GIVEN and WHEN lines with two trailing spaces to force the line break within
the bullet. In ADF, use `hardBreak` nodes between the lines and a `strong` mark on each keyword —
see `creating-with-an-expander.md`.

**Sentry follow-up criterion (conditional):** if the ticket references any Sentry issue(s) — a link
in the bug `## Data` section, or mentioned in the brief — add a criterion that the issue must be
**Resolved** once the work is done. Name the specific issue when known. Example:

```
* **GIVEN** the linked Sentry issue (`PROJECT-BACKEND-1A2B`)
  **WHEN** this ticket is delivered
  **THEN** the Sentry issue is marked Resolved and stops recurring
```

Omit this when no Sentry issue is connected to the ticket.

### `# QA Notes`  (**only when relevant** — directly after Acceptance Criteria)
Include this section **only** when the ticket involves specific **API endpoints** or **console/CLI
commands**. Its job is to make a QA's testing easier by handing them the concrete entry points:

* API endpoints — method + path/URL, e.g. `` `POST /api/v2/reports/{id}/refresh` ``. Add a link if
  there's a relevant API doc or environment URL.
* Console / CLI commands — the command name **with its parameters/flags**, e.g.
  `` `bin/console app:report:regenerate --report-id=123 --force` ``. Use a fenced code block for a
  full command line.

Keep it concrete and copy-pasteable. Like the Implementation Plan, keep the visible `# QA Notes`
**heading** and place the notes inside a **collapsed expander** directly beneath it. If the ticket
has no endpoints or commands to test through, **omit the section entirely** — never add an empty or
guessed QA Notes.

### `# Implementation Plan`  (heading + expander — **only when a plan exists**)
Include this section **only** when the user provides or approves real implementation detail.
If there is no plan, omit the section entirely (do not emit an empty heading or expander).

When present, keep the visible `# Implementation Plan` **heading**, then place the plan body inside a
**collapsed expander** directly beneath it — so the section is always visible but the detail stays
folded and the ticket stays readable. In the Jira editor the expander is the `/expand` slash
command; programmatically it is an ADF `expand` node following the heading node. See
`creating-with-an-expander.md` for the exact ADF and how to send it.

## Formatting technicals

Whenever a code-level token appears in **any** section, wrap it so it reads unambiguously:

- Class names, namespaces, types, method names, field/column names, config keys → **inline code**
  with backticks (illustrative names only): `` `InvoiceCalculator` ``, `` `Billing\Tax\VatResolver` ``,
  `` `int` ``, `` `order_items` ``.
- Multi-line snippets (method signatures, SQL, config, JSON) → a fenced code block.

This matters most in Context / Expected Result (where a stray bare class name confuses a PM), but
apply it everywhere for consistency — including inside the Implementation Plan expander.

## Fields beyond the body

| Field | How the skill sets it |
|---|---|
| Project | Resolved from the remembered board/project (see SKILL.md). |
| Issue type | Asked each time: `Task`, `Bug`, or `Story`. |
| Parent | Optional. Usually an Epic in the same project; sent via the `parent` param as an issue key. Skip if none. |
| Summary | A concise, verb-led title derived from the brief; confirmed in preview. |
| Labels | Asked (optional). Sent via `additional_fields.labels` as a string array. **Only existing labels** — never invent one (Jira silently creates unknown labels) and never add one the user didn't ask for; validate before applying. |
| Components | Asked (optional). Sent via `additional_fields.components` as `[{"name": "…"}]`. |
| Priority | **Not set** by the skill — Jira applies the project default. |
| Definition of Done | **Not set** by the skill — left at the project default. |
| Assignee | **Not set** — ticket is created unassigned and lands in the backlog. |

## Full skeleton (Task / Story)

```
# Context

<context>

# Expected Result

<expected result>

# Acceptance Criteria

* **GIVEN** …
  **WHEN** …
  **THEN** …
* **GIVEN** …
  **WHEN** …
  **THEN** …

# QA Notes                    ← only if there are API endpoints / console commands; keep this heading…
<endpoints (method + path) and/or command names with params, inside a collapsed /expand expander beneath the heading>

# Implementation Plan        ← only if a plan exists; keep this heading…
<plan body inside a collapsed /expand expander directly beneath the heading>
```

## Full skeleton (Bug)

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

* **GIVEN** …
  **WHEN** …
  **THEN** …

# QA Notes                    ← only if there are API endpoints / console commands; keep this heading…
<endpoints (method + path) and/or command names with params, inside a collapsed /expand expander beneath the heading>

# Implementation Plan        ← only if a plan exists; keep this heading…
<plan body inside a collapsed /expand expander directly beneath the heading>
```
