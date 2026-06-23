# GitLab Markdown and creating the work item with `glab api`

GitLab work-item descriptions are **GitLab-Flavored Markdown (GFM)** — there is no ADF and no
dual-format decision. Everything in the template renders as plain Markdown. The only special case is
the two collapsible sections (`QA Notes`, `Implementation Plan`), which use raw HTML `<details>` that
GitLab renders natively.

## Collapsible sections — `<details>` / `<summary>`

A section is rendered as a **visible heading followed by a collapsed `<details>` block** that holds
the body. The heading stays on the page so readers see the section exists; the detail is tucked inside
the collapsed block so the work item stays scannable.

```markdown
# Implementation Plan

<details>
<summary>Implementation Plan</summary>

- Step 1 — …
- Step 2 — …

</details>
```

**Critical:** there must be a **blank line after `<summary>…</summary>`** and a **blank line before
the closing `</details>`** — otherwise GitLab will not render the inner Markdown (the bullets/code
would show as raw text). The same pattern is used for `# QA Notes`:

```markdown
# QA Notes

<details>
<summary>QA Notes</summary>

- Endpoint: `POST /api/v2/reports/{id}/refresh`
- Command:

  ```
  bin/console app:report:regenerate --report-id=123 --force
  ```

</details>
```

Emit a `<details>` section **only when the section applies** — omit the whole heading + block
otherwise. `QA Notes` comes after Acceptance Criteria and before any Implementation Plan.

## Acceptance Criteria line breaks

Within a single bullet, keep `GIVEN` / `WHEN` / `THEN` bold and each on its own line using `<br>`:

```markdown
* **GIVEN** an account with no saved records<br>
  **WHEN** the user opens the list view<br>
  **THEN** an empty-state message is shown instead of a loading spinner
```

Use `<br>` rather than two trailing spaces — it survives copy/paste and round-trips through the API
reliably, and GitLab renders it inside list items.

## Inline code and fenced blocks

- Technical tokens → inline code with backticks: `` `InvoiceCalculator` ``, `` `order_items` ``.
- Multi-line snippets → a fenced code block. Inside a `<details>`, indent the fence by two spaces (as
  above) so it stays part of the list item / block.

## Creating the work item with `glab api`

Plain `glab issue create` **cannot set the work-item type**, so the skill always creates through the
raw REST endpoint via `glab api`. This is one uniform code path for all four types.

### Project path

`glab api` takes the project as its **URL-encoded full path**: slashes become `%2F`.

- `group/project` → `group%2Fproject`
- `group/subgroup/project` → `group%2Fsubgroup%2Fproject`

### `-F` vs `-f` (smart vs raw string)

`glab api` mirrors `gh api` — **and the short flags are the opposite of what you might guess:**

- **`-F, --field`** is the **smart** form: literal `true` / `false` / `null` and integers are
  converted to the matching JSON types, and a value starting with `@` is read from that **file**
  (`@-` reads **stdin**). Use it for booleans (`confidential`), numeric ids (`milestone_id`,
  `epic_id`), array fields (`assignee_ids[]`), and the description via stdin (`description=@-`).
- **`-f, --raw-field`** sends an **always-literal string** (no parsing). Use it for free text that
  must not be coerced — `title`, `issue_type`, `labels`.

> Rule of thumb: **booleans / numbers / `@file` / `@-` -> `-F` (smart); arbitrary strings -> `-f` (raw).**
> Providing any field flag makes `glab api` use `POST` automatically; the examples pass
> `--method POST` explicitly for clarity.
>
> **Snap caveat:** when `glab` is a confined snap, `-F description=@/path/to/file` fails with
> "permission denied" for files under hidden or arbitrary paths. Feed the body on **stdin** instead —
> `-F description=@-  < body.md` — so the unconfined shell opens the file.

### Pass the description from a file (via stdin)

The description is multi-line Markdown with quotes, backticks, and HTML. Don't try to inline it as a
shell argument — write it to a temp file and feed it on **stdin** with `-F description=@-` (stdin is
snap-safe; see the caveat above):

```
# write the assembled markdown to e.g. a mktemp file body.md, then:
glab api --method POST "projects/group%2Fproject/issues" \
  -f title="User stays logged in across browser sessions" \
  -F description=@- \
  -f issue_type=issue \
  < body.md
```

### Full create call (all optional fields shown)

```
glab api --method POST "projects/<url-encoded-path>/issues" \
  -f title="<title>" \
  -F description=@- \
  -f issue_type=<issue|incident|task|test_case> \
  -f labels="<existing,labels>" \
  -F confidential=true \
  -F milestone_id=<id> \
  -F epic_id=<id> \
  -F "assignee_ids[]=<id>" \
  < body.md
```

Omit any optional flag the user didn't choose. Send **only existing** labels (validated in SKILL.md
step 5). Note the flag choice: free-text strings (`title`, `issue_type`, `labels`) use `-f` (raw);
the description (fed on stdin via `@-`), booleans, and numeric ids use `-F` (smart).

### Resolving ids

- **Labels (validate exist):** `glab label list` or
  `glab api "projects/<path>/labels?per_page=100&include_ancestor_groups=true"` — confirm each
  requested label name is present before sending it.
- **Assignee username → id:** `glab api "users?username=<name>"` → take `.[0].id`. Self-assign:
  `glab api user` → `.id`.
- **Milestone title → id:** `glab api "projects/<path>/milestones?title=<title>"` → take `.[0].id`.
  If empty, tell the user no milestone matched rather than guessing.

### Reading the result

The create call returns the new work item as JSON. Surface:

- `web_url` — the clickable URL (final output of the workflow).
- `references.full` — the human reference, e.g. `group/project#42`.

## Failure handling

- **`test_case` rejected (tier):** `test_case` needs Ultimate. If the API rejects it, tell the user
  and offer to retry as `issue`.
- **`epic_id` rejected (Free tier / no access):** epics are Premium/Ultimate and group-level. Retry
  the create **without** `epic_id` and note that the epic wasn't attached. Never block creation on the
  epic.
- **Auth / not installed:** handled up front in SKILL.md step 1 — never reach this stage without a
  working, authenticated `glab`.
