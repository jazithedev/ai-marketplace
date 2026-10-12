# Application Service (= the CQRS Handler)

## Contents
- In short
- Definition and mapping to CQRS
- GLASS — the shape of a Handler
- Query Handlers: G·L only
- Exceptions to Command Handler return type
- What a Handler may contain / must not contain
- Heuristics
- Self-check
- Where the books disagree, and the side taken here
- Examples (library domain)

## In short

1. **In a CQRS codebase the Application Service is the Handler** — every `*CommandHandler` and `*QueryHandler`. One handler per use case: Vernon's "one service method per flow".
2. A Handler **coordinates; it never decides.** Business rules live in the domain. A Handler holds no business `if`.
3. A Command Handler follows **GLASS** — **G**uard · **L**oad · **A**pply · **S**ave · **S**ignal — each step at most once, in that order. *A Handler is made of GLASS: you see straight through it to the domain.*
4. A Query Handler uses only **G·L**, then returns the View.
5. The Handler **owns the transaction and the security gate** for its use case; the domain owns neither.
6. A Command Handler returns `void`. The only exceptions are listed below.
7. Classes under `Application/Service/` are **not** Application Services. They are the Handler's collaborators — Application Preconditions, mappers, transformers — and follow their own rules.

## Definition and mapping to CQRS

Evans: the application layer "defines the jobs the software is supposed to do and directs the expressive domain objects to work out problems… This layer is kept thin. It does not contain business rules or knowledge, but only coordinates tasks and delegates work to collaborations of domain objects in the next layer down."

Vernon: "Application Services are the direct clients of the domain model … responsible for task coordination of use case flows, one service method per flow. When using an ACID database, the Application Services also control transactions … Security is also commonly cared for by Application Services."

**Mapping:** "one service method per flow" = one Handler per Command or Query. The Handler *is* the Application Service. A common confusion is to read "keep the application layer thin" against a folder full of `*Generator`, `*Transformer`, `*Fetcher` classes in `Application/Service/`, where it cannot apply — it applies to the handlers.

## GLASS — the shape of a Handler

| | Step | What the Handler does | Typical code |
|---|---|---|---|
| **G** | **Guard** | Run the Application Preconditions — FOE: the resource is Found and Owned, the caller is Entitled. First statement of the method. | `$this->loanAccess->ensureOwned(…)` |
| **L** | **Load** | Get what the use case needs. Command side: write-model repositories. Query side: ViewRepositories. Another module's facts: a Gateway behind an `Application\Contract` interface. | `$loan = $this->loans->require($id)` |
| **A** | **Apply** | Hand the decision to the domain — an Aggregate method, a Domain Service, a Specification. The Handler calls; it does not decide. | `$loan->extend($until)` |
| **S** | **Save** | Persist the result. The Handler owns the transaction boundary. | `$this->loans->save($loan)` |
| **S** | **Signal** | Announce what happened: record/publish domain or integration events, dispatch another module's integration command, or trigger an infrastructure port (notification). | `$this->eventBus->publish(…)` |

- **Command Handler:** G → L → A → S → S. Signal is optional. Returns `void` unless an exception below applies.
- A step may be absent; it may not repeat or run out of order. A second Load after Apply, or a Save in the middle, means the use case is really two.
- **Trap:** an `if` near the top *looks* like the Guard step, but if it tests the resource's business state ("already returned", "status may not change"), it is a domain rule in the wrong place. Guard checks the caller; the domain checks the rules.

## Query Handlers: G·L only

A Query Handler **Guards and Loads** — G·L, the read-only start of GLASS — and returns the View it loaded (throwing NotFound when the View is missing). It can't Apply, Save or Signal:

- **Apply** needs domain objects; query handlers work with Views only.
- **Save** is a state change; a query must not change state.
- **Signal** is a side effect. A read that announces something is a hidden command. If "a query was used" must be recorded: technical telemetry belongs in query-bus middleware or infrastructure; business usage (audit, analytics) belongs in the Adapter that served the request; a read that must change state is a separate Command. Queries are often reused internally (e.g. a gateway asking for a record during another use case), so the handler can't tell a customer read from an internal lookup anyway.

## Exceptions to Command Handler return type

A Command Handler returns `void`. It returns a value only for a reason listed here; anything not listed is not an exception.

| Exception | When it applies | What it returns |
|---|---|---|
| **1. Database-generated identity of a created Aggregate** | The command **creates** an Aggregate whose identity only exists after the insert — a legacy `AUTO_INCREMENT` key — and the caller needs it (e.g. to return the new resource's id). | **That identifier and nothing else**, as a plain `int`. Never the Aggregate, a View, a status flag or a result object. |

Rules for exception 1:
- The Command declares it, e.g. `@implements CommandInterface<int>`; every other Command declares `CommandInterface<void>` (or the codebase's equivalent).
- The identifier is returned at the very end, after Save and Signal — GLASS is unchanged.
- If the caller needs more than the identifier, it dispatches a Query with it.
- Updates and deletes return `void`, even on legacy tables — the caller already has the identifier.
- New tables use UUIDv7 (or similar) identities generated **before** dispatch, so their create handlers stay `void`.

Why not the workarounds? Pre-reserving ids needs sequence tables MySQL lacks; an extra UUID column needs a migration on a legacy table plus a query per create; a result holder or callback is a hidden return. For a legacy auto-increment create, an honest `return $id` is the least bad option.

Codebases often contain handlers returning richer result objects (`CreateOrderResult`, status DTOs). Those are **not** precedent: report them as deviations unless they are exception 1.

## What a Handler may contain

- Calls to Application Preconditions, Repositories, ViewRepositories, Gateways, Domain Services, Aggregates, event/integration buses, infrastructure ports declared as interfaces.
- **`if` statements on application concerns only**: idempotency ("already processed?"), which Aggregate to load, whether an optional step was requested (e.g. the command asks for a notification).
- Trivial mapping between the Command/Query and domain types.
- The transaction boundary ("Leave transaction control to the client" — Evans; "a good spot to place … transaction control and security" — Fowler).

## What a Handler must NOT contain

- **Business rules — any `if` whose condition a domain expert would state.** Evans's overbooking example is the canonical warning. Move the rule to an Aggregate method, a Specification/Policy, or a Domain Service.
- **Calculations and state transitions** done on an Entity's data from outside the Entity (setters driven by handler logic).
- **Direct calls into another module's internals** or its private commands — cross-module writes go through an integration command or event.
- **Framework or transport types** — request objects, HTTP status codes, response envelopes. Mapping a refusal to HTTP is the Adapter's job.
- **Entities crossing the boundary.** In: a Command or Query. Out: `void` (or a listed exception) for commands, a pure-data View for queries.
- **Input-shape validation.** Presence and format of request fields are checked by the Adapter before the Command is built; invariants are guarded by Value Objects and Entities.
- **A command handler reading a View/ViewRepository** — the read model may be stale; commands work from the write model.

## Heuristics

- **Look through it.** If the body reads "guard, load, tell the domain, save, announce", it is GLASS. If it reads "if the booking is older than X and the rating is below Y then…", business logic has frosted the glass.
- **Thin by construction.** A Handler longer than its five GLASS steps needs a reason.
- **Domain facade, not operation script.** Fowler/Stafford describe a thin *domain facade* and a thicker *operation script* Service Layer. Use the facade; the only workflow a Handler scripts is the single Signal step.
- **Second entry point.** If a CLI command or worker needs the same behaviour, it dispatches the same Command. If it can't without copying handler code, a rule is in the wrong place.

## Self-check — is this a well-formed Application Service?

**All must be Yes**
1. Is it a `*CommandHandler` or `*QueryHandler` for exactly one Command or Query?
2. Is the Guard step (preconditions) the first thing it does?
3. Can every line be labelled G, L, A, S or S, in that order, each at most once (queries: G then L)?
4. Does every `if` test an application concern (existence, idempotency, which object to load, an optional step)?
5. Does it return `void` (command — or a value allowed by a listed exception) or a View (query)?

**All must be No**
6. Does any condition encode a rule a domain expert would recognise (thresholds, statuses allowed to change, eligibility, limits)?
7. Does it compute or mutate an Entity's data from outside the Entity?
8. Does it reference a request/response, an HTTP status, or another module's internal class?
9. Does a command handler read a View or a ViewRepository?
10. Would a second entry point have to copy code from it to get the same behaviour?

## Where the books disagree, and the side taken here

- **Business rules in the use case?** Martin: use cases contain "application-specific business rules" (his loan example keeps a credit-score cutoff in the use case). Evans and Vernon: none. **This skill follows Evans and Vernon** — such cutoffs are business rules and go to the domain.
- **How much workflow?** Fowler/Stafford accept the operation script; Evans and Vernon want the thinnest layer. **Follow Vernon, with Evans's one allowance:** the application service may *decide to notify* ("Listens for confirmation. Decides to send notification using infrastructure service." — Evans). That is the Signal step.
- **Domain objects or DTOs across the boundary?** **Follow Martin:** Command/Query in, `void`/View out.
- **Is the layer optional?** Fowler adds a Service Layer only when needed. In a hexagonal module every use case has a Handler.

## Examples (library domain)

### ✅ GLASS command handler

```php
final readonly class ExtendLoanCommandHandler
{
    public function __construct(
        private MembershipGatewayInterface $membership,
        private LoanAccessPrecondition $loanAccess,
        private LoanRepositoryInterface $loans,
        private EventBusInterface $eventBus,
    ) {
    }

    public function __invoke(ExtendLoanCommand $command): void
    {
        // G — Guard: Entitled, then Found + Owned
        if (!$this->membership->isActiveMember($command->memberId)) {
            throw MembershipNotActiveException::create();
        }
        $this->loanAccess->ensureOwned(loanId: $command->loanId, memberId: $command->memberId);

        // L — Load
        $loan = $this->loans->require($command->loanId);

        // A — Apply: the Aggregate decides whether an extension is allowed
        $loan->extend(days: $command->days);

        // S — Save
        $this->loans->save($loan);

        // S — Signal
        $this->eventBus->publish(LoanExtended::from($loan));
    }
}
```

### ✅ GLASS query handler (G·L)

```php
public function __invoke(GetLoanQuery $query): LoanView
{
    // G
    $this->loanAccess->ensureOwned(loanId: $query->loanId, memberId: $query->memberId);

    // L → return the View
    return $this->loanViews->find($query->loanId)
        ?? throw LoanNotFoundException::withId($query->loanId);
}
```

### ❌ Business logic leaking into a Handler

```php
public function __invoke(ExtendLoanCommand $command): void
{
    $this->loanAccess->ensureOwned(loanId: $command->loanId, memberId: $command->memberId);
    $loan = $this->loans->require($command->loanId);

    // ✗ a business rule hidden as a guard clause
    if ($loan->getExtensionCount() >= 2 || $loan->isOverdue()) {
        throw new LoanCannotBeExtendedException();
    }
    $loan->setDueDate($loan->getDueDate()->modify('+14 days'));   // ✗ state change decided outside the Aggregate

    $this->loans->save($loan);
}
```

Fix: `$loan->extend(days: 14)`, with the Aggregate enforcing "at most two extensions, never when overdue" and throwing a domain exception. The handler is GLASS again — G, L, A, S.

### Return-type exception 1

```php
/** @implements CommandInterface<int> */
final readonly class RegisterMemberCommand implements CommandInterface { /* … */ }

public function __invoke(RegisterMemberCommand $command): int
{
    // G, L, A — …, $member = Member::register(…)

    $this->members->save($member);   // S — the legacy AUTO_INCREMENT id is assigned here

    return $member->getId();         // the identifier only
}
```

### From the books

| Example | Source | Why it is an Application Service |
|---|---|---|
| Funds transfer application service | Evans, ch. 5 "Services and the Isolated Domain Layer" | Digests input, sends it to the funds-transfer *domain* service, listens for confirmation, decides to notify — no banking rule inside. |
| `provisionTenant()` | Vernon, ch. 14 "Sample Application Service" | Security (`@PreAuthorize`), transaction, and delegation of the provisioning process to a Domain Service. |
| `commitBacklogItem()` | Vernon, ch. 8 "Domain Events" | Loads `BacklogItem` and `Sprint`, calls `backlogItem.commitTo(sprint)`; the Aggregate decides. |
| `RecognitionService` | Fowler/Stafford, ch. 9 "Service Layer" | Loads a `Contract`, delegates the calculation to it, notifies via gateways — the workflow part is what we confine to Signal. |
| Loan use case | Martin, ch. 20 "Use Cases" | The counter-example: Martin keeps the credit-score cutoff in the use case; this skill moves it to the domain. |
