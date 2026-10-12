# service-classifier

Tell **Application Services**, **Application Preconditions** and **Domain Services** apart in a CQRS + hexagonal PHP codebase — and say where misplaced code should move.

| Kind | Answers | Mnemonic |
|---|---|---|
| Application Service (a CQRS Command/Query Handler) | *How is this use case carried out?* — coordinates, never decides | **GLASS** — Guard · Load · Apply · Save · Signal (queries: **G·L**) |
| Application Precondition | *May this caller run this use case on this resource?* | **FOE** — Found · Owned · Entitled |
| Domain Service | *What does the business rule say should happen?* | Ubiquitous Language; "would the business do this on paper?" |

## Two modes

- **Point it at a class** — `/service-classifier:service-classifier src/Billing/Domain/Service/InvoiceChecker.php`. It reads the class and its collaborators, runs the checklists, asks only what the code cannot answer, and reports the verdict, the evidence with line numbers, and what should move.
- **Describe logic you are about to write** — "Only gold members may book more than 4 classes a week — where does this go?". It walks a short question tree and returns the verdict plus a skeleton in the target shape.

It only advises; it never edits code.

## What's inside

- `SKILL.md` — the workflow, triage table and report template.
- `references/application-service.md` — GLASS, Query Handlers (G·L), return-type exceptions, self-check.
- `references/application-precondition.md` — FOE, the `*Precondition` / `void ensure*()` shape, self-check, the ownership worked example.
- `references/domain-service.md` — definition, may/must-not, naming, self-check, smells.
- `references/decision-tree.md` — the question tree, the four tie-breakers, boundary cases, target skeletons.
- `references/sources.md` — verified quotes from Evans, Vernon, Fowler/Stafford and Martin/Brown, and where they disagree.

## Installation

```
/plugin install service-classifier@ai-marketplace
```
