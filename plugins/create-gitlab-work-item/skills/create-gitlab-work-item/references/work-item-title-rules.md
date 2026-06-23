## GitLab Work Item Title Rules

### Format by type

| Type | Pattern | Example |
|---|---|---|
| **Issue** | `[Subject/feature] [outcome]` | `User stays logged in across browser sessions` |
| **Incident** | `[Feature] [misbehaviour] when [condition]` | `Checkout throws 422 when VAT field is empty` |
| **Task** | `[Verb] [object] [qualifier]` | `Replace array cache with Redis in order repository` |
| **Test case** | `[Scenario being verified]` | `Verify password reset email is sent within 60s` |

### Rules

- **Issue / Test case** lead with the subject/scenario; **Task** leads with a verb; **Incident**
  leads with the affected feature
- Be specific enough that the work item is understood **without opening it**
- **60–80 characters** max
- **One** action or outcome per title — if you need "and", it's two work items
- No status, priority, dates, type prefixes (`[BUG]`, `[FE]`, `[P1]`), or epic prefixes — those
  belong in GitLab fields/labels
- **Sentence case, no trailing period** — and no leading reference (GitLab shows the `#iid` already)

### Technical details

A title is read by Product Managers too, so **default to plain, PM-understandable language**. Include
code-level technicals (class names, namespaces, service names, types) **only when**:

- omitting them genuinely creates ambiguity and no plain wording is as clear, **or**
- the work item is inherently very technical (e.g. a pure refactor or infrastructure change with no
  user-facing angle).

When in doubt, leave them out — the description carries the detail. Specifically:

- **Issue**: prefer the user need / outcome in plain language.
- **Incident**: describe the broken behaviour in plain terms; add a technical token only if it's the
  clearest way to name what's broken.
- **Task**: prefer the outcome in plain language; a technical identifier is acceptable when the task
  is essentially technical or the identifier is the unambiguous name for the thing.
- **Test case**: name the behaviour or scenario being verified, not the implementation.

### Anti-patterns

| Bad | Better |
|---|---|
| `Fix bug` | `Image upload fails when the filename contains spaces` |
| `Sign Up` | `Implement sign-up flow with email verification` |
| `[FE][P1] Fix login` | `Fix login button not responding on Safari 17` |
| `Research + implement + deploy cache` | Split into separate work items |

### Sanity check

Complete the sentence: *"To complete this work item, I need to \_\_\_."*
If it reads naturally, the title is correctly formed.
