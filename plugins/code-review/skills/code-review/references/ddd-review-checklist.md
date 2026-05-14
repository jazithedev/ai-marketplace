# DDD Review Checklist

Language-agnostic checklist for reviewing domain-driven design quality. Based on Evans (Domain-Driven Design), Fowler (Patterns of Enterprise Application Architecture), and Microsoft DDD guidance.

## Finding Classification

All findings from this checklist should be classified:
- **MUST**: Clear violations of DDD principles that will cause maintenance or correctness issues
- **OPTIONAL**: Tactical preferences where multiple valid approaches exist
- **QUESTION**: Unusual patterns that may be intentional — ask the author

The default for most items below is MUST, unless the reviewer determines the context warrants a softer classification.

---

## Tactical DDD (Agent 6)

### Anemic Domain Model
- Entities/aggregates that are pure data holders with only getters/setters
- Business logic that should live on an entity but is in an application/domain service instead
- Entities that expose all internal state without encapsulation

### Value Object Issues
- Value objects that are mutable (have setters or state-changing methods)
- Value objects missing self-validation in constructor
- Primitive obsession: using raw types (string, int) where a value object would enforce invariants
- Missing equality by value (comparing by reference instead of by properties)
- Value objects with ambiguous property names (e.g., `$date` when timezone matters — should be `$dateInUtc`)
- Guard clauses missing for invalid input — silent fix-ups (e.g., `.trim()`) instead of throwing on bad input
- Missing unit tests for value objects — VOs are ideal candidates for thorough testing

### Invariant Protection
- Business rules validated in application services, controllers, or adapters instead of the owning entity/VO
- Entities that can be constructed in an invalid state
- Public setters that allow bypassing invariant checks
- Validation logic duplicated across multiple locations instead of centralized in the domain object

### Aggregate Boundary Violations
- External code directly accessing or modifying child entities within an aggregate (bypassing the root)
- Aggregates that are too large (loading excessive data for simple operations)
- References between aggregates using object references instead of IDs
- Missing transactional consistency — operations that should be atomic spanning multiple aggregates
- Multiple setter-like mutation methods called sequentially on an aggregate — should be a single domain method encapsulating the operation

### Repository Interface Pollution
- Repository interfaces in the domain layer that reference infrastructure types (ORM query builders, database connections, HTTP clients)
- Repository methods that return infrastructure-specific types instead of domain entities/collections
- Generic CRUD methods that don't reflect domain language (e.g., `findAll()` instead of `findActiveSubscriptions()`)

### Domain Event Misuse
- Domain events carrying too much data (entire entity snapshots instead of relevant facts)
- Business logic living inside event handlers that should be in the domain model
- Events used for synchronous orchestration instead of notification
- Missing domain events for significant state transitions

### Boolean Flag Parameters & Hidden Behavior Branching
- Methods that accept a boolean flag to switch between two distinct execution paths — prefer separate named methods (e.g., `runFree()` instead of `run(bool $isFreeRun = false)`)
- Flag propagation through multiple layers (method → sub-method → constructor → job data → event payload) — when a boolean threads through 3+ layers, the behavior variant should be encapsulated as a dedicated method/class at the entry point
- Boolean parameters that informally implement a Strategy Pattern — extract the variant behavior into explicit methods or strategy classes
- Derived/inverted flags passed alongside the original (e.g., `shouldBeCharged: !$isFreeRun`) — a sign the flag is accumulating responsibilities and the two paths should be separate

### Framework Coupling in Domain
- Domain classes importing framework namespaces (controllers, HTTP, DI containers)
- ORM mapping annotations/attributes are acceptable — framework service dependencies are not
- Domain services depending on infrastructure services directly instead of through interfaces

---

## Strategic DDD (Agent 7)

### Cross-Module Domain Leaks
- Domain classes importing from another module's domain layer directly
- Shared domain types that belong to a specific bounded context but are used across modules
- Preferred alternatives: integration events, published query/command contracts, or an ACL-translated context-local VO
- **Do not** propose "use a shared enum / shared VO" (e.g., `Shared\Application\Enum\Tool`) as a fix. Cross-module reuse of a single type forces lock-step evolution and is anti-DDD. Each bounded context owns its ubiquitous language. A shared kernel is a last-resort coordination artifact requiring explicit joint ownership — never a casual cleanup recommendation.
- When two modules independently model the same concept (two `ReportStatus` enums, two `LocationId` VOs, a free-string identifier and a `Shared/*` enum with overlapping values), treat the duplication as **deliberate Customer-Supplier or Conformist coordination by default**. Flag it as a QUESTION only if the rationale is genuinely unclear — and frame the question as "is this context-local representation correct?", not "should you reuse `Shared\X`?".

### Ubiquitous Language Violations
- Class/method names using technical jargon instead of domain terminology
- Inconsistent naming: same concept called different things in different places
- Generic names (Manager, Handler, Processor, Helper, Utils) where domain-specific names exist

### Bounded Context Erosion
- A single class or module serving concerns of multiple bounded contexts
- God classes that mix vocabulary from different subdomains
- Missing context boundaries where distinct business capabilities are lumped together

### Missing Anti-Corruption Layer
- Direct use of external/third-party types in domain code without translation
- Domain model shaped by external API structures instead of domain needs
- Missing adapter/translator between bounded contexts that have different models of the same concept
- Exception suppression (try/catch) around external service calls without a documented gateway/ACL wrapper

### Module Boundary Discipline
- Direct class instantiation across module boundaries (should use commands/queries/events)
- Shared database tables between modules without explicit ownership
- Circular dependencies between modules