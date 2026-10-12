# Domain Service

## Contents
- In short
- Definition
- What a Domain Service is for
- What it may contain / must not contain
- Shape and naming
- Heuristics and smells
- Self-check
- Where the books disagree, and the side taken here
- Examples (warehouse & shipping domain)

## In short

1. A **Domain Service** is a **stateless operation that expresses a significant business process, transformation, or calculation** that does not naturally belong to any single Entity, Value Object or Aggregate.
2. It is named after a **domain activity from the Ubiquitous Language** — never after a technical role (`Checker`, `Fetcher`, `Manager`).
3. It is a **last resort, not a layer.** Behaviour belongs on Entities and Value Objects first; a Domain Service is justified only when putting the operation there would feel forced.
4. It knows **nothing of the application**: no transactions, no security, no HTTP, no buses, no Views, no infrastructure.
5. If the rule would still be true were the software never written — the business would apply it on paper — it is domain logic, and it goes into the domain (an Entity, a Value Object, a Specification/Policy, or a Domain Service).

## Definition

Evans: "A SERVICE is an operation offered as an interface that stands alone in the model, without encapsulating state, as ENTITIES and VALUE OBJECTS do."

Evans: "When a significant process or transformation in the domain is not a natural responsibility of an ENTITY or VALUE OBJECT, add an operation to the model as a standalone interface declared as a SERVICE. Define the interface in terms of the language of the model and make sure the operation name is part of the UBIQUITOUS LANGUAGE. Make the SERVICE stateless."

Vernon's operational test: "Often the best indication that you should create a Service in the domain model is when the operation you need to perform feels out of place as a method on an Aggregate or a Value Object."

## What a Domain Service is for

Use one to (Vernon):
- **perform a significant business process** that spans more than one domain object (Evans's funds transfer between two accounts);
- **transform a domain object** from one composition to another (translating a foreign concept into a local one at a context boundary);
- **calculate a value that needs input from more than one domain object** (Vernon's `BusinessPriorityCalculator`).

It fulfils Evans's three characteristics:
1. the operation relates to a domain concept that is not a natural part of an Entity or Value Object;
2. its interface is defined in terms of other elements of the domain model;
3. the operation is stateless.

## What it may contain

| Allowed | Notes |
|---|---|
| Entities, Value Objects, Aggregates of its own module | Parameters and results are domain types. |
| Domain-owned Repository **interfaces** | Vernon's calculation and authentication services load Aggregates through repositories. |
| Specifications and domain Policies | e.g. interchangeable pricing or allocation strategies. |
| Domain exceptions | Thrown from the Domain layer's exception namespace. |
| Globally accessible domain information | "The execution of a SERVICE will use information that is accessible globally, and may even change that global information … But the SERVICE does not hold state of its own that affects its own behavior." — Evans |

**Stateless** means no instance state that changes its behaviour between calls. Injected collaborators and configuration are fine; a counter, cache or "current customer" field is not. Stateless does **not** mean side-effect-free — a Domain Service may load and change Aggregates through repositories.

## What it must NOT contain

- **Transaction control or security/authorization.** Those are Application Service concerns. Ownership and access checks are Application Preconditions.
- **Infrastructure** — HTTP clients, SQL, queues, the command/query bus, another module's classes. A Domain Service that needs something external declares a domain-owned interface; Infrastructure implements it.
- **Read-side models** — Views and ViewRepositories.
- **Application workflow** — sending notifications, publishing integration events, orchestrating a use case. "Funds transfer" is domain; "digest the request, call the transfer, notify" is application.
- **Behaviour that belongs on one Entity or Value Object.** Overusing Services strips Entities and Value Objects of their behaviour and leaves an anaemic model (Evans, Vernon).

## Shape and naming

- **Location:** `<Module>\Domain\Service\…`
- **Name:** the domain activity or concept, in the Ubiquitous Language — `FreightCostCalculator`, `StockAllocator`, `FundsTransfer`. Never a generic doer (`*Manager`, `*Checker`, `*Fetcher`, `*Counter`, `*Helper`, `*Processor`); Evans warns against forcing an operation into an artificial "doer" object with no meaning in the domain.
- **Class, not interface, by default:** a concrete `final readonly` class. Extract an interface only when there are genuinely several implementations (interchangeable strategies) or a test needs a hand-written fake instead of mocking a final class (Vernon: a Separated Interface is optional).
- **Refuses with a domain exception** when a business rule is violated; it never returns `false` for the caller to interpret.

## Heuristics and smells

- **Would the business apply this rule on paper?** Martin separates Critical Business Rules — rules the business would apply even without a computer — from application rules. If yes → domain.
- **Does the operation name appear when a domain expert describes the business?** A technical verb (fetch, check, map, process) means it is not a Domain Service.
- **Does it feel forced on the Entity?** Try the Entity/Value Object first; reach for a Service only when the method needs several Aggregates or would bloat one with a rule it does not own.
- **Static method on an Aggregate doing multi-object work** → it wants to be a Domain Service (Vernon calls the static method a code smell).
- **A mandatory Service in front of every Entity** ("mini-layer") is a smell, not a pattern (Vernon).
- **Doer names, entities with only getters/setters, services that mirror entity names one-to-one** → anaemic model.

## Self-check — is this a Domain Service?

One **No** in the first block, or one **Yes** in the second, means it is not a Domain Service — say where it should go.

**All must be Yes**
1. Is the operation's name a term a domain expert would use?
2. Would the rule hold if the software did not exist?
3. Does it need more than one Entity/Aggregate, or would it bloat the one it sits on?
4. Are all parameters and results domain types (Entities, Value Objects, primitives of the domain)?
5. Could it run twice in a row with the same inputs and behave the same (no instance state)?
6. Does it live in `Domain\Service` and depend only on the domain of its own module?

**All must be No**
7. Does it open a transaction, check who the caller is, or read the current user?
8. Does it import anything from `Application`, `Infrastructure`, `Adapter`, a bus, a View, or another module?
9. Does it send, publish, notify or log as part of its job?
10. Is it named `*Checker`, `*Fetcher`, `*Manager`, `*Counter`, `*Helper` or `*Processor`?
11. Could the whole method move onto one Entity or Value Object without the result feeling forced?

## Where the books disagree, and the side taken here

- **Martin has no Domain Service.** *Clean Architecture* folds all enterprise rules into Entities. This skill follows Evans and Vernon: an operation spanning several objects is a first-class, named domain concept.
- **Interface or class?** Evans defines a Service "offered as an interface"; Vernon treats a Separated Interface as optional. Follow Vernon — a concrete class unless a second implementation or a fake exists.
- **May it use Repositories?** Evans does not forbid it and Vernon does it in his worked examples. Allow domain-owned Repository interfaces, never infrastructure directly.

## Examples (warehouse & shipping domain)

### ✅ A real Domain Service

```php
namespace App\Shipping\Domain\Service;

final readonly class FreightCostCalculator
{
    /** @param iterable<FreightTariffInterface> $tariffs */
    public function __construct(
        private iterable $tariffs,
    ) {
    }

    public function costFor(Shipment $shipment, Carrier $carrier, Destination $destination): Money
    {
        // picks the cheapest applicable tariff for the carrier and destination zone,
        // adds the oversize surcharge when any parcel exceeds the carrier's limit
    }
}
```

Why it qualifies: "freight cost" is a business term; the rule spans Shipment, Carrier and Destination and belongs to none of them; inputs and output are domain types; stateless; several real tariff implementations justify the `FreightTariffInterface`.

### ❌ A "doer" that is really application workflow

```php
namespace App\Warehouse\Domain\Service;

final class StockManager
{
    public function __construct(
        private Connection $db,
        private MailerInterface $mailer,
        private CommandBusInterface $commandBus,
    ) {
    }

    public function reserve(int $orderId): void
    {
        $this->db->beginTransaction();
        // … loads rows, decrements stock with SQL …
        if ($remaining < 10) {
            $this->mailer->send(new LowStockEmail(/* … */));
        }
        $this->db->commit();
    }
}
```

Why it fails: generic doer name (10); opens a transaction and talks to SQL, a mailer and a bus (7, 8, 9); it is an application use case — a Command Handler — wearing a domain namespace. The real domain part ("stock is allocated from the nearest warehouse with enough units; never below zero") belongs on the Stock/Warehouse Aggregate or in a `StockAllocator` Domain Service; the transaction, persistence and low-stock email belong to the handler's Save and Signal steps.

### From the books

| Example | Source | Why it is a Domain Service |
|---|---|---|
| Funds transfer — debits one account, credits another | Evans, ch. 5 "Services and the Isolated Domain Layer" | A banking term; two Accounts; neither owns it. The *application* service around it digests the request and sends the notification. |
| Routing Service — candidate Itineraries for a Cargo | Evans, ch. 7 "Using the Language: An Extended Example" | A domain process with a complex algorithm spanning many Legs. |
| `BusinessPriorityCalculator` | Vernon, ch. 7 "A Calculation Process" | A value needing many Aggregates; originally a static method on `Product` — the smell that pointed to a Service. |
| `AuthenticationService` | Vernon, ch. 7 "Modeling a Service in the Domain" | Coordinates Tenant, User and encryption in identity-domain terms; in the application service it would leak domain knowledge to the client. |
| Revenue recognition strategies | Fowler, ch. 9 "Domain Model" | Domain-side strategy objects holding pure calculation rules — the half Fowler's Service Layer delegates to. |
