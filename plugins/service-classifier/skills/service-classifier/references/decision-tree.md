# Decision tree — where does this logic belong?

## Contents
- Step 0: split the logic into parts
- The question tree
- The four tie-breakers
- Side-by-side comparison
- Boundary cases
- Target skeletons

## Step 0: split the logic into parts

Most requests mix several kinds of logic. "An attendee can request a refund for their own ticket, but not within 7 days of the event, and we notify the organiser" is three things: an ownership check, a business rule, and a notification. Split first, then place each part. Each part lands in exactly one home; the Handler wires them together (Guard → Apply → Signal).

## The question tree

Walk this for each part. Answer from the code or the description when you can; ask the user only the questions you cannot answer.

1. **Is it about who the caller *is*, or about the shape of the input** (required fields, formats, types)?
   → **Adapter** (controller/action, console command). Authentication and input-shape validation happen before the Command or Query is built.

2. **Is it only about whether *this caller* may touch *this resource* at all?** Can you name it as one FOE letter?
   - **F** — the resource is **Found** (exists; not soft-deleted, not inactive-for-this-caller, not out of scope)
   - **O** — it is **Owned** by the caller
   - **E** — the caller is **Entitled** (role, permission, purchased product/feature)
   → **Application Precondition**, the Guard step. Refusals: NotFound / AccessDenied / NotAvailable.

3. **Would a domain expert state it when describing the business, regardless of who is asking — would the business enforce it on paper?**
   → **Domain.** Then pick the home:
   - **3a. It is about one Aggregate's own state or invariants** ("an invoice is paid only once", "a loan can be extended at most twice") → a method on that **Aggregate/Entity** that throws a domain exception.
   - **3b. It is a reusable yes/no question about a candidate** (selection, validation, "is this invoice delinquent?") → a **Specification** (or a domain Policy when the rule is a swappable strategy).
   - **3c. It spans several Aggregates, is a significant business process, transforms one domain concept into another, or computes a value from several objects** → a **Domain Service**, named in the Ubiquitous Language.

4. **Is it coordination** — loading, persisting, transactions, publishing events, notifying, calling another module?
   → the **Handler** (Application Service) — the L, S or S step of GLASS.

5. **Is it read-only shaping of data for display** (joins, projections, formatting for a screen)?
   → the **query side**: the ViewRepository / View. Not handler logic, not domain logic.

If a part answers "yes" to both 2 and 3, it is a domain rule (3) — see the tie-breakers.

## The four tie-breakers

Use these when a check sits between "precondition" and "domain rule":

| Test | Precondition if… | Domain if… |
|---|---|---|
| **Regardless of who asks** | It only exists because a specific caller is asking. | A domain expert would state it when describing the business. |
| **On paper** | It exists because the system has users and tenants. | The business would enforce it with no software at all. |
| **Refusal** | The natural refusal is NotFound / AccessDenied / NotAvailable. | The natural refusal is "not allowed in this state", "limit exceeded", "too late". |
| **Second entry point** | A trusted system job (CLI, worker) may legitimately skip it. | Every entry point — including system jobs — must obey it. |

Three or four tests agreeing is a verdict. A 2–2 split usually means the logic is two parts — go back to Step 0.

## Side-by-side comparison

| | Adapter | Application Precondition | Application Service (Handler) | Aggregate / Entity | Domain Service |
|---|---|---|---|---|---|
| Question | Who is calling, is the input well-formed? | May this caller touch this resource? | How is this use case carried out? | What are my own rules? | What does the business rule say, across objects? |
| Knows the caller | Yes | Yes | Yes | No | No |
| Decides business rules | No | No | No | Yes | Yes |
| Changes state | No | No | Coordinates it (Save) | Yes (its own) | Through Aggregates |
| Typical refusal | 400 / 401 | NotFound / AccessDenied / NotAvailable | — (passes refusals through) | Domain exception | Domain exception |
| GLASS step | before G | G | the whole G-L-A-S-S | A | A |

## Boundary cases

**State that looks like a gate.** `if (!$x->isActive())`:
- means "this record does not exist *for you*" and refuses with NotFound → **precondition** (logical existence, F).
- means "an inactive tenant cannot sign in" — a rule of the business → **domain** (Vernon keeps this inside a Domain Service).
Same method; the question it answers decides the layer.

**Ownership fact vs ownership check.** The Entity *knowing* its owner (`$invoice->customerId`, `isOwnedBy()`) is domain data. *Comparing* it with the caller and refusing is a precondition (O). *Rules about how ownership changes* (transfer, reassignment) are domain.

**Entitlement vs business limit.** "Only gold members may …" is ambiguous until you ask what the tier gates:
- access to a **capability the system sells or grants** ("gold members can book personal-trainer sessions at all") → **Entitled (E)**, precondition. Without the plan the use case is simply unavailable.
- a **quantity or condition of the business itself** ("gold members may book 12 classes a week, standard members 4") → **domain rule**: the tier is an input to an Aggregate rule (the member's booking method checks its own weekly limit), because the gym would enforce it with a paper sign-up sheet and it applies to every entry point. The refusal is "limit exceeded", not "not available".
Ask: *without the right plan, is the use case unavailable, or is it available with a different business limit?*

**Eligibility cutoffs** ("no loan estimate unless the credit score ≥ 500"). Some authors (Martin) put these in the use case. This skill treats them as **domain rules** — a Specification or Aggregate method — because a business would apply them on paper and they must hold for every entry point.

**A guard that returns `bool`.** Whatever it checks, a `bool`-returning guard pushes the decision back onto its caller. If the check is FOE, reshape it into `void ensure*()` throwing dedicated exceptions. If it decides business state, move it into the domain.

**Recording that a query was used.** Not a Query Handler's job (queries are G·L). Technical telemetry → query-bus middleware/infrastructure; business usage (audit, analytics) → the Adapter; a read that must change state → a separate Command.

**Returning the new id from a create.** Allowed only for a database-generated (legacy auto-increment) identity of the created Aggregate, returned as a bare `int`. Anything richer — the entity, a result DTO, a status — is not allowed; see `application-service.md`.

## Target skeletons

**Application Precondition**
```php
final readonly class TicketAccessPrecondition
{
    /**
     * @throws TicketNotFoundException
     * @throws TicketAccessDeniedException
     */
    public function ensureOwned(int $ticketId, int $attendeeId): void { /* F + O */ }
}
```

**Aggregate method (domain rule on one Aggregate)**
```php
final class Ticket
{
    public function refund(\DateTimeImmutable $now): void
    {
        if ($this->eventStartsAt->modify('-7 days') < $now) {
            throw TicketRefundWindowClosedException::forTicket($this->id);
        }
        $this->status = TicketStatus::Refunded;
        $this->recordThat(new TicketRefunded($this->id));
    }
}
```

**Specification**
```php
final readonly class DelinquentInvoiceSpecification
{
    public function isSatisfiedBy(Invoice $invoice, \DateTimeImmutable $today): bool { /* … */ }
}
```

**Domain Service**
```php
final readonly class StockAllocator
{
    public function allocate(Order $order, WarehouseCollection $warehouses): Allocation { /* across Aggregates */ }
}
```

**Command Handler (GLASS)**
```php
public function __invoke(RefundTicketCommand $command): void
{
    $this->ticketAccess->ensureOwned(ticketId: $command->ticketId, attendeeId: $command->attendeeId);   // G
    $ticket = $this->tickets->require($command->ticketId);                                              // L
    $ticket->refund($this->clock->now());                                                               // A
    $this->tickets->save($ticket);                                                                      // S
    $this->eventBus->publish(TicketRefundedIntegrationEvent::from($ticket));                            // S
}
```
