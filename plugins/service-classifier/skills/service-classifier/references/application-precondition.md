# Application Precondition

"Application Precondition" is a **team term**, not a book term. None of the source books uses it; they describe the ideas it is built from (existence guards, security in the application layer, record-level authorization). Never attribute the term to an author.

## Contents
- In short
- Definition
- FOE — what it checks
- What it does not check
- Shape
- Heuristics
- Self-check
- Application Precondition vs Domain Service
- Worked example — "Is invoice 42 owned by customer 1234?"
- Examples (invoicing domain)
- Naming note: why not `*Policy`

## In short

1. An Application Precondition decides **whether this caller may run this use case on this resource at all** — nothing more. It is the **Guard** step of a Handler's GLASS shape.
2. It checks exactly three things — **FOE**: the resource is **Found** (exists, including *logically*), it is **Owned** by the caller, and the caller is **Entitled** (role, permission, product). *The Guard step keeps out a FOE.*
3. It **refuses by throwing** one dedicated exception per failure type, through a `void ensure*()` method. It never returns a decision for the caller to interpret.
4. It holds **no business rules.** A check on a resource's *business state* — "already paid", "status may not change", "limit reached" — is a domain rule and belongs in the domain, however much it looks like a gate.
5. Classes are named **`*Precondition`**. The `*Policy` suffix is kept for **domain** policies.

## Definition

> An **Application Precondition** is an Application-layer component that decides whether a use case may proceed **for this caller** — checking that the resource is **Found** and **Owned** and that the caller is **Entitled** (FOE) — refuses with a dedicated exception, and contains no business rules of its own.

## FOE — what it checks

**Found · Owned · Entitled.** If a check is not one of these three letters, it is not an Application Precondition. FOE names *what* is checked, not the order — handlers commonly check entitlement first.

| | It checks | Refusal | Grounding |
|---|---|---|---|
| **F** | **Found** — the resource the use case targets exists | `*NotFoundException` | Vernon's application-service helper that "exists to guard against nonexistent Tenant instances" |
| **F** | **Found, logically** — not soft-deleted, not inactive, not outside the caller's scope | `*NotFoundException` (the caller cannot tell it apart from absence) | Extension of the above: "this record does not exist *for you*" |
| **O** | **Owned** — the resource belongs to this caller | `*AccessDeniedException` (or `*NotFoundException` where existence must not leak) | Simon Brown on authorized access to individual records |
| **E** | **Entitled** — the caller has the role, permission or product | `*NotAvailableException` / `*AccessDeniedException` | Vernon and Fowler: security belongs to the application layer |

## What it does not check

**Goes to the domain (Aggregate method, Specification/Policy, Domain Service):**
- **Business state or eligibility** — "an invoice can be paid only once", "a closed project cannot change status", "a booking cannot exceed capacity by more than 10%". Evans flags exactly this as a business rule hidden as a guard clause and makes it an explicit `OverbookingPolicy`. Vernon keeps "the tenant is active" inside a Domain Service (`AuthenticationService`).
- **Invariants of an Entity or Value Object** — guarded inside the object (design-by-contract guards).
- **Rules about how ownership itself works** — transferring, assigning, re-assigning an owner.

Mind the word: Evans's "guard clause" and GLASS's **Guard** step are not the same thing. The Guard step checks *the caller*; a guard clause testing *business state* is exactly what Evans tells us to move into the domain.

**Belongs to the Adapter (controller/action, console command):**
- **Authentication** (who the caller is: session, JWT, API key) and **input shape** (presence and format of fields). Fowler puts parameter validation in the Page Controller; Stafford sets validation apart from the Service Layer's job.

## Shape

```php
namespace App\Billing\Application\Service\Invoice\Command;   // or …\Query

final readonly class InvoiceAccessPrecondition
{
    public function __construct(
        private InvoiceRepositoryInterface $invoices,   // command side: write model
    ) {                                                 // query side: an ownership View / ViewRepository
    }

    /**
     * @throws InvoiceNotFoundException
     * @throws InvoiceAccessDeniedException
     */
    public function ensureOwned(int $invoiceId, int $customerId): void
    {
        // Found + Owned; throws, never returns a decision
    }
}
```

- **Suffix** `*Precondition`; **methods** `ensure<Condition>()`, returning `void`.
- **One dedicated exception per failure type** — no umbrella exception with an error code. Exceptions live with the Application layer's exceptions; the Adapter maps them to HTTP.
- **Never returns what it checked.** The Handler loads what it needs afterwards (Load step).
- **One class per CQRS side** when both need it (`…\Command\` and `…\Query\`). The command-side one reads the **write model** only — a command never reads a View.
- **Cross-module facts** (entitlement, another module's ownership) come through a Gateway behind an `Application\Contract` interface — never the query bus from inside the precondition.
- **Inline until reused.** A check used by exactly one Handler may stay inline as its Guard step; extract a `*Precondition` when a second Handler needs it.

## Heuristics

- **The FOE test.** Can you name the check as Found, Owned or Entitled? If not, it is not a precondition.
- **The "regardless of who asks" test.** *Would a domain expert state this rule when describing the business, regardless of who is asking?* → domain. *Is it only about whether this caller may touch this resource at all?* → precondition.
- **The on-paper test.** If the business would still enforce the rule with no software, it is a domain rule (Martin's Critical Business Rules).
- **The refusal test.** A precondition's refusals are *NotFound*, *AccessDenied*, *NotAvailable*. About to invent *NotAllowedInCurrentState* or *LimitExceeded*? You are writing a domain rule.
- **The second-entry-point test.** A CLI command or worker running the same use case for a system actor may legitimately skip ownership — but must still hit every business rule. If skipping your check would let the system break a business rule, it was never a precondition.

## Self-check — is this an Application Precondition?

**All must be Yes**
1. Does it answer only "may **this caller** run this use case on **this resource**"?
2. Is every check one of FOE — Found (incl. logical existence), Owned, Entitled?
3. Is it `final readonly`, named `*Precondition`, with only `void ensure*()` public methods?
4. Does each failure throw its own dedicated exception?
5. Is it the first thing the Handler calls?
6. On the command side, does it read only the write model?

**All must be No**
7. Does any check depend on the resource's business state (status, counts, dates, thresholds) rather than on whether the caller may reach it?
8. Does it return `bool`, a result object, or the thing it loaded?
9. Does it modify anything?
10. Does it live in `Domain\`, or depend on HTTP / request objects?
11. Would a system actor (CLI, worker) bypassing it be able to break a business rule?

## Application Precondition vs Domain Service

Both can stop a use case with an exception, which is why they get confused. They answer different questions.

| | Application Precondition | Domain Service |
|---|---|---|
| Question it answers | *May this caller run this use case on this resource?* | *What does the business rule say should happen?* |
| Layer | `Application\Service\…` | `Domain\Service\…` |
| Knows the caller? | Yes — customer id, entitlement, ownership | No — the domain is caller-agnostic |
| Rule true on paper, without software? | No — it exists because the system has users and tenants | Yes |
| Language | FOE: Found, Owned, Entitled | Ubiquitous Language: transfer, allocate, discount |
| Output | `void`; throws NotFound / AccessDenied / NotAvailable | A domain result, or a domain exception |
| Dependencies | Repositories / Views of its side, Gateways for other modules | Domain types and domain-owned Repository interfaces only |
| Bypassed by a system actor? | May be (a trusted worker has no customer) | Never — every entry point obeys it |
| GLASS step | **G** — Guard | **A** — Apply |

**Boundary case — state that looks like a gate.** An `isActive()` check that means "this record is not Found *for you*" and refuses with NotFound is a precondition (logical existence). Vernon's `tenant.isActive()` inside `AuthenticationService` is domain logic, because "an inactive tenant cannot authenticate" is a rule of the identity business. Same method name; the question each answers decides the layer.

## Worked example — "Is invoice 42 owned by customer 1234?"

**Answer: an Application Precondition** — the **O** of FOE.

| Test | Answer | Points to |
|---|---|---|
| Regardless of who asks — would a domain expert state it as a business rule? | No — it only exists because someone specific is asking | Precondition |
| On paper — would the business enforce it without software? | No — it exists because the system serves many tenants from one store | Precondition |
| Refusal — what does it throw? | Invoice not found / access denied | Precondition |
| Second entry point — may a trusted worker skip it? | Yes — a nightly dunning job processing every invoice has no customer, yet still obeys every business rule | Precondition |

**Separate the fact from the check.**
- **The fact is domain data.** An Invoice knows its customer; the Entity may expose `$invoice->customerId` or `$invoice->isOwnedBy(int $customerId): bool`. A plain query on its own state — not a rule, not a refusal.
- **The check is the precondition.** It compares that fact with *the caller* and refuses:

```php
final readonly class InvoiceAccessPrecondition
{
    /**
     * @throws InvoiceNotFoundException
     * @throws InvoiceAccessDeniedException
     */
    public function ensureOwned(int $invoiceId, int $customerId): void
    {
        $ownership = $this->ownershipViews->findOwnership($invoiceId)
            ?? throw InvoiceNotFoundException::withId($invoiceId);                       // F — Found

        if ($ownership->customerId !== $customerId) {
            throw InvoiceAccessDeniedException::forCustomer(invoiceId: $invoiceId, customerId: $customerId);   // O — Owned
        }
    }
}
```

**When the resource lives in another module**, the fact crosses the boundary through a Contract (port) + Gateway (adapter), never through the query bus inside the precondition:

```php
// Billing\Application\Contract — the port the precondition depends on
interface ProjectAccessGatewayInterface
{
    /**
     * @throws ProjectNotFoundException
     * @throws ProjectAccessDeniedException
     */
    public function ensureOwned(int $projectId, int $customerId): void;
}
// Billing\Infrastructure\Gateway\ProjectAccessGateway resolves the other module's fact
```

**When ownership does become a domain rule** — the moment it is about *how ownership works*, not *who is asking*:
- "An invoice can be reassigned only to a customer in the same group."
- "An account must always have exactly one owning customer."
- "Ownership moves when the contract is transferred."

These are invariants and processes — true whoever calls — so they go on the Aggregate (`$invoice->reassignTo($customer)`) or, across several Aggregates, into a Domain Service.

> **In one line:** *"Is it yours?"* is an Application Precondition. *"How does ownership work?"* is the domain.

## Examples (invoicing domain)

### ✅ Right shape

```php
final readonly class InvoiceAccessPrecondition
{
    /**
     * @throws InvoiceNotFoundException
     * @throws InvoiceAccessDeniedException
     */
    public function ensureOwned(int $invoiceId, int $customerId): void
    {
        $invoice = $this->invoices->find($invoiceId);

        // F — Found, including logically: a voided invoice does not exist for the customer
        if ($invoice === null || $invoice->isVoided()) {
            throw InvoiceNotFoundException::withId($invoiceId);
        }
        // O — Owned
        if ($invoice->getCustomerId() !== $customerId) {
            throw InvoiceAccessDeniedException::forCustomer(invoiceId: $invoiceId, customerId: $customerId);
        }
    }
}
```

### ✅ Entitlement inline as the Guard step

```php
if (!$this->subscriptions->hasBillingModule($command->customerId)) {   // E — Entitled, via a Gateway
    throw BillingModuleNotAvailableException::create();
}
```

When a second Handler repeats it verbatim, extract it into a `*Precondition`.

### ❌ Business rule dressed as a guard

```php
final readonly class InvoiceStatusGuard
{
    public function isAllowed(Invoice $invoice, string $targetStatus): bool
    {
        return $this->queryBus->ask(new IsStatusTransitionAllowedQuery($invoice->getStatus(), $targetStatus));
    }
}
```

"May an invoice move to this status?" is none of F, O or E — it is a **business state-transition rule** (self-check 7), it returns `bool` (8), and it reaches the rule through the query bus. It belongs on the Aggregate — `$invoice->transitionTo($status)` throwing a domain exception.

### ❌ Ownership check in the wrong layer

```php
namespace App\Billing\Domain\Service;

final class InvoiceChecker
{
    public function hasAccess(int $customerId, int $invoiceId): bool { /* … */ }
}
```

The reverse mistake: a genuine **O** check placed in `Domain\Service` (self-check 10), returning `bool` (8), under a generic name. It should be `InvoiceAccessPrecondition::ensureOwned(): void` in `Application\Service`.

## Naming note: why not `*Policy`

Evans's canonical *Policy* (`OverbookingPolicy`) is the textbook example of a business rule moved **out of** application code **into** the domain. Naming application guards `*Policy` makes the same suffix mean opposite things in two layers and blurs exactly the line this distinction draws. Keep `*Policy` for domain policies. If a codebase already names its guards `*Policy`/`*Guard`, report the class by what it does and recommend `*Precondition` as a rename to make when the file is next touched — not as a bug.
