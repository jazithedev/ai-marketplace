## Jira Ticket Title Rules

### Format by type

| Type | Pattern | Example |
|---|---|---|
| **Story** | `[User type] [verb] [object]` | `User stays logged in across browser sessions` |
| **Task** | `[Verb] [object] [qualifier]` | `Replace array cache with Redis in OrderRepository` |
| **Bug** | `[Feature] [misbehaviour] when [condition]` | `Checkout throws 422 when VAT field is empty` |
| **Subtask** | `[Verb] [specific thing]` — tightly scoped to parent | `Add Redis connection config to ServiceContainer` |

### Rules

- Start with a **verb** (Task/Subtask) or **subject** (Bug/Story)
- Be specific enough that the ticket is understood **without opening it**
- **60–80 characters** max
- **One** action or outcome per title — if you need "and", it's two tickets
- No status, priority, dates, type prefixes (`[BUG]`, `[FE]`, `[P1]`), or Epic prefixes — those belong in Jira fields
- **Sentence case, no trailing period** — and no leading ticket key (Jira shows the key already)

### Technical details

A title is read by Product Managers too, so **default to plain, PM-understandable language**. Include
code-level technicals (class names, namespaces, service names, types) **only when**:

- omitting them genuinely creates ambiguity and no plain wording is as clear, **or**
- the ticket is inherently very technical (e.g. a pure refactor or infrastructure change with no
  user-facing angle).

When in doubt, leave them out — the description carries the detail. Specifically:

- **Story**: omit — stories describe a user need, not implementation.
- **Bug**: describe the broken behaviour in plain terms; add a technical token only if it's the
  clearest way to name what's broken.
- **Task / Subtask**: prefer the outcome in plain language; a technical identifier is acceptable when
  the task is essentially technical or the identifier is the unambiguous name for the thing.

### Anti-patterns

| Bad | Better |
|---|---|
| `Fix bug` | `Image upload fails when the filename contains spaces` |
| `Sign Up` | `Implement sign-up flow with email verification` |
| `[FE][P1] Fix login` | `Fix login button not responding on Safari 17` |
| `Research + implement + deploy cache` | Split into separate tickets |

### Don't promise more than the ticket delivers

A title must describe what *this* ticket completes, not the eventual benefit it contributes to. If the
value only lands once another team consumes the work, a user-facing title is a lie the board repeats at
every stand-up — and it makes the ticket impossible to call done.

| Over-promising | Honest |
|---|---|
| `Customer sees the report status change without refreshing` — but the frontend hasn't subscribed yet | `Announce report status changes over WebSockets` |
| `Users can export to CSV` — but this ticket only adds the endpoint | `Add the CSV export endpoint` |

This usually travels with the issue-type choice: if the title has to drop its user-facing framing to
stay honest, that's a strong hint the ticket is a task rather than a story.

### Sanity check

Complete the sentence: *"To complete this ticket, I need to \_\_\_."*
If it reads naturally, the title is correctly formed.

Then check the converse: *"When this ticket is done, \_\_\_ is true."* If the only way to finish that
sentence involves work in someone else's ticket, the title is over-promising.