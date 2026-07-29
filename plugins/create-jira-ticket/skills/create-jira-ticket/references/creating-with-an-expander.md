# Creating a ticket with expander sections (QA Notes, Implementation Plan)

Two sections are rendered as a **visible heading followed by a collapsed expander** that holds the
body: `QA Notes` and `Implementation Plan`. The heading stays on the page so readers see the section
exists; the detail is tucked inside the expander so the ticket stays scannable. Both work the same
way — heading node, then an `expand` node immediately after it.

Markdown has no expander, so when (and only when) one of these sections exists you must send the
description as **ADF** (Atlassian Document Format) instead of markdown.

## Decision

- **Neither QA Notes nor Implementation Plan** → send the body as **markdown**
  (`contentFormat: "markdown"`). Simpler, and everything else in the template renders fine in
  markdown.
- **QA Notes and/or Implementation Plan present** → send the body as **ADF** (`contentFormat: "adf"`)
  so each `expand` node renders as a real collapsible section beneath its heading.

## How to call the tool with ADF

`createJiraIssue` takes the description as a string. With `contentFormat: "adf"`, pass the ADF
document as a **JSON-stringified** `doc` node in `description`. The `cloudId` and `projectKey` come
from the resolved site/project (see SKILL.md) — the values below are placeholders.

```
createJiraIssue(
  cloudId      = "<your-site.atlassian.net>",
  projectKey   = "<PROJECT-KEY>",
  issueTypeName= "Task",
  summary      = "…",
  contentFormat= "adf",
  description  = <the JSON string below>,
  additional_fields = { "labels": [...], "components": [{ "name": "…" }] }
)
```

## ADF building blocks

A heading:
```json
{ "type": "heading", "attrs": { "level": 1 },
  "content": [{ "type": "text", "text": "Context" }] }
```

A paragraph:
```json
{ "type": "paragraph",
  "content": [{ "type": "text", "text": "Some context here." }] }
```

A plain bullet list (use for Data, etc.):
```json
{ "type": "bulletList", "content": [
  { "type": "listItem", "content": [
    { "type": "paragraph", "content": [
      { "type": "text", "text": "Account / Customer ID: 123" }]}]}
]}
```

The **Acceptance Criteria** list — an `orderedList` so every criterion is numbered, with one
full-sentence criterion per list item:
```json
{ "type": "orderedList", "attrs": { "order": 1 }, "content": [
  { "type": "listItem", "content": [
    { "type": "paragraph", "content": [
      { "type": "text", "text": "Given an account with no saved records, when the user opens the list view, an empty-state message is shown instead of a loading spinner." }
    ]}
  ]},
  { "type": "listItem", "content": [
    { "type": "paragraph", "content": [
      { "type": "text", "text": "The empty-state message links to the \"create record\" form." }
    ]}
  ]}
]}
```

A **heading + expander** section (this is the whole point — used for both `QA Notes` and
`Implementation Plan`). Emit the heading first, then the expander immediately after it (swap the
title text for `QA Notes` when building that section):
```json
{ "type": "heading", "attrs": { "level": 1 },
  "content": [{ "type": "text", "text": "Implementation Plan" }] },
{ "type": "expand", "attrs": { "title": "Implementation Plan" }, "content": [
  { "type": "paragraph", "content": [
    { "type": "text", "text": "Step 1 — …" }]},
  { "type": "bulletList", "content": [
    { "type": "listItem", "content": [
      { "type": "paragraph", "content": [
        { "type": "text", "text": "Technical detail …" }]}]}
  ]}
]}
```

## Full ADF example (Task with a plan)

The `description` argument is the JSON below, serialized to a string. Note the Implementation Plan is
a **heading node followed by an expand node**:

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Context" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Why we are doing this." }] },

    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Expected Result" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "What success looks like." }] },

    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Acceptance Criteria" }] },
    { "type": "orderedList", "attrs": { "order": 1 }, "content": [
      { "type": "listItem", "content": [
        { "type": "paragraph", "content": [
          { "type": "text", "text": "Given an account with no saved records, when the user opens the list view, an empty-state message is shown instead of a loading spinner." }
        ] }]},
      { "type": "listItem", "content": [
        { "type": "paragraph", "content": [
          { "type": "text", "text": "The empty-state message links to the \"create record\" form." }
        ] }]}
    ]},

    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "QA Notes" }] },
    { "type": "expand", "attrs": { "title": "QA Notes" }, "content": [
      { "type": "paragraph", "content": [
        { "type": "text", "text": "Endpoint: " },
        { "type": "text", "text": "POST /api/v2/reports/{id}/refresh", "marks": [{ "type": "code" }] }
      ]}
    ]},

    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Implementation Plan" }] },
    { "type": "expand", "attrs": { "title": "Implementation Plan" }, "content": [
      { "type": "paragraph", "content": [{ "type": "text", "text": "Step 1 — …" }] }
    ]}
  ]
}
```

`QA Notes` and `Implementation Plan` are both optional — emit `QA Notes` only when there are
endpoints/commands to test through, and place it after Acceptance Criteria and before any
Implementation Plan. Omit either heading entirely when its content doesn't apply.

## Updating a description later (read this before you edit)

The description is a **single replace-only field**. There is no partial update: whatever you send
becomes the entire description, and anything you leave out is deleted with no error and a `200`
response. Two consequences, both of which cost real content if ignored:

**Re-send everything, every time.** An edit that only means "reword one criterion" still requires the
full ADF document — every heading, both `expand` nodes, and every `link` and `code` mark. Rebuild from
the version you just fetched rather than retyping from memory; a dropped `expand` silently flattens a
section, and a dropped `link` mark turns a ticket reference back into plain text.

**Fetch immediately before writing.** Never build the new document from a copy you read earlier in the
conversation. If anyone touched the ticket in between — including the user, by hand, in the UI —
writing a stale copy reverts their edit and reports success. Re-read, apply your change to *that*, then
write.

Note that the read path may return the description as **markdown even when you request ADF**, which
flattens expanders in the response. That makes the API an unreliable way to confirm your expanders
survived: it can look flattened when it is fine. Trust the structure you sent, keep sending complete
documents, and eyeball the ticket in the browser if you need certainty.

## If ADF is rejected

If the MCP tool rejects the ADF payload, fall back gracefully: create the ticket with a
**markdown** body that keeps the `# QA Notes` and `# Implementation Plan` headings with their
content beneath them (just not collapsed), then tell the user the expanders could not be applied
automatically and they can collapse each with `/expand` in the editor. Never block ticket creation
on the expanders.
