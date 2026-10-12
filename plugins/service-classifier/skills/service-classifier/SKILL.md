---
name: service-classifier
description: Classify a class — or a piece of logic not yet written — as an Application Service (a CQRS Command/Query Handler), an Application Precondition (a guard checking the caller may proceed), or a Domain Service, and say where misplaced code should move. Use it whenever someone asks "is this a domain service?", "is this business logic?", "where should this check / rule / calculation go?", "should this live in the handler, the aggregate or a service?", "review this handler / service class", points at a class under Application/Service, Domain/Service or a *Handler, or is about to create a new service, guard, policy, checker or handler in a CQRS + hexagonal codebase — even if they never say "classify".
---

# Service Classifier

Three kinds of class get confused all the time in CQRS + hexagonal codebases. Each answers a different question:

| Kind | The question it answers | Lives in | Knows the caller? | Mnemonic |
|---|---|---|---|---|
| **Application Service** (= a CQRS Command/Query **Handler**) | *How is this use case carried out?* — coordinates, never decides | `Application\Command\…` / `Application\Query\…` | Yes | **GLASS** — Guard · Load · Apply · Save · Signal (queries: **G·L** only) |
| **Application Precondition** | *May **this caller** run this use case on **this resource** at all?* | `Application\Service\…` | Yes | **FOE** — Found · Owned · Entitled |
| **Domain Service** | *What does the business rule say should happen?* — a stateless business operation that belongs to no single Entity | `Domain\Service\…` | No — the domain is caller-agnostic | Ubiquitous Language; "would the business do this on paper?" |

Most real problems are **misplacements**, not unknown kinds: a business rule hidden as an `if` in a handler, an ownership check sitting in `Domain\Service`, a "guard" that actually decides a business state transition. Your job is to name what a class *is*, what it *should be*, and exactly which lines would move.

**You advise; you never edit code.** Report the verdict and the concrete moves. If the user wants the refactor done, that is a separate request.

## Reference files — read the one(s) you need

- `references/application-service.md` — Handler = Application Service, the GLASS table, Query Handlers (G·L), may/must-not, **exceptions to the command return type**, self-check, examples. Read for anything that is or calls itself a handler.
- `references/application-precondition.md` — FOE, the class shape (`*Precondition`, `void ensure*()`), what is *not* a precondition, self-check, the ownership worked example. Read for guards, policies, checkers, access/ownership/existence checks.
- `references/domain-service.md` — definition, what it's for, may/must-not, naming, class vs interface, self-check, smells. Read for anything in `Domain\Service` or any business calculation/process.
- `references/decision-tree.md` — the question tree for planned logic, the four tie-breaker heuristics, the side-by-side comparison, and boundary cases. Read whenever the kind is not obvious, and always in Mode B.
- `references/sources.md` — verified book quotes (Evans, Vernon, Fowler/Stafford, Martin/Brown) with chapter and section, plus where the authors disagree and which side this skill takes. Read when you want to justify a verdict or the user challenges one.

Load only what the case needs — a clean query handler needs one file; an ambiguous eligibility rule needs the decision tree and probably two kind files.

## Mode A — the user points at an existing class

Input: a path, an FQCN, a class name, or "this file".

1. **Locate and read the class.** If only a name is given, search for it; if several match, ask which one.
2. **Read one level out** — enough to judge, not the whole module:
   - constructor dependencies (repositories, ViewRepositories, gateways, buses, other services) and what they are;
   - interfaces it implements, its namespace/layer, its return types;
   - for a handler: the Command/Query it handles (and its declared result type, e.g. `@implements CommandInterface<…>`);
   - who calls it (one search), when its role is unclear from the inside.
3. **First-pass signals** — fast hints, not verdicts:
   - `*CommandHandler` / `*QueryHandler`, `__invoke(SomeCommand)` → Application Service.
   - `void ensure*()` methods throwing NotFound / AccessDenied / NotAvailable → Application Precondition.
   - stateless, domain-typed parameters, named after a business activity, in `Domain\Service` → Domain Service.
   - Name or folder and behaviour disagree (`*Checker` in `Domain\Service` doing an ownership lookup; `*Guard` returning `bool` about a status change) → likely misplacement — say so.
4. **Run the self-check(s)** from the matching reference file(s). Run a second kind's checklist when the first one fails in a way that points elsewhere. Record line numbers as evidence — take them from a numbered view of the file (e.g. `cat -n` or the Read tool's line prefixes), never estimate them, and re-check each range before writing the report. Readers jump straight to the lines you cite; a range that is off by one sends them to a brace instead of the rule, and costs the report its credibility.
5. **Ask only what the code cannot answer** (see *Asking questions*). Typical example: whether a condition is a business rule (domain) or only about who is asking (precondition) can need domain knowledge.
6. **Report** using the template below.

## Mode B — the user describes logic that does not exist yet

Input: "I need to check/compute/enforce X — where does it go?", or "I'm about to create a `FooService`".

1. Read `references/decision-tree.md` and walk its questions. Answer every question you can from the description and from the codebase (look for the Aggregates, existing handlers and preconditions it would touch).
2. Ask the remaining questions one at a time.
3. Give the verdict, the tie-breaker that decided it, and a **skeleton in the target shape**: a GLASS command handler, a `*Precondition` class, an Aggregate method, a Specification, or a Domain Service. Use the codebase's own namespaces and naming where you can see them.
4. If the logic splits — e.g. "the attendee must own the ticket (precondition) and cannot get a refund within 7 days of the event (domain rule)" — give each part its own home and show how the handler wires them (Guard step vs Apply step).

## Asking questions

Ask only when the answer changes the verdict and cannot be read from code. Ask **one question at a time**, each with your **best guess and why**, so the user can just say "yes":

> **Q:** Would the gym still enforce "max 4 classes a week" if it ran on a paper sign-up sheet? My guess: **yes** — it reads like a membership rule, not a permission, so it belongs in the domain (the member's booking method), not in a precondition.

Stop as soon as the verdict is settled. Useful questions, in roughly this order:

1. Would a domain expert state this rule when describing the business, **regardless of who is asking**?
2. Would the business enforce it **on paper**, with no software?
3. What should the refusal be — not found / access denied / not available, or something like "not allowed in this state" / "limit exceeded"?
4. May a trusted system job (CLI, worker) skip this check without breaking the business?
5. Does the operation need several Aggregates, or does it fit on one?

## Report template

Use this structure; keep each part short.

```
## Verdict
**<ClassName>** is <kind it is now> → should be <kind it should be> (or "correctly placed").
Decided by: <the checklist item or tie-breaker that settled it>.

## Evidence
| Check | Result | Where |
|---|---|---|
| <self-check question / GLASS step / FOE letter> | ✅ / ❌ | L<n>–L<m> |

## What should move (omit if nothing)
- L<n>–L<m> (<what it does>) → <target: Aggregate method / Domain Service / *Precondition / Adapter> — <one-line why>
- Rename / reshape: <e.g. `LoanChecker::hasAccess(): bool` → `LoanAccessPrecondition::ensureOwned(): void` throwing `LoanNotFoundException` / `LoanAccessDeniedException`>

## Target shape (only when something should move, or in Mode B)
<short PHP skeleton>

## Backed by (optional)
<one or two quotes from references/sources.md that support the verdict>
```

For a class that is correctly placed, the report is short: verdict, the evidence table, done. Don't invent problems to fill the template.

## Ground rules

- **Don't invent problems.** For a correctly placed class, say so and stop. Optional "you could also…" moves of correct code (e.g. "this calculation could live on one of the entities instead") blur the verdict; mention an alternative only when a checklist item actually points to it.
- **Name the deciding reason.** "This is a domain rule because a librarian would enforce it on paper cards" is useful; "this looks like business logic" is not.
- **Mixed classes are common.** A handler with one leaked business `if` is still an Application Service — report it as a handler with a misplaced rule, with line numbers, not as "a Domain Service".
- **The codebase's conventions may differ.** If it names guards `*Policy` or `*Guard`, say what the class is and recommend the conventions in the reference files, but don't treat a naming difference alone as a misplacement.
- **No CQRS in sight?** Map "Application Service" to whatever the use-case entry point is (application service class, use-case interactor) and say you did so. GLASS and FOE still apply.
- **Book quotes are support, not authority.** Use them to explain; where the authors disagree, `references/sources.md` records which side this skill takes and why.
