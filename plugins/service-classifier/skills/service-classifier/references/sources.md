# Sources — verified quotes and where the authors disagree

Use these to justify a verdict or answer "says who?". Every passage below is verbatim and was checked word for word against the source text. Cite chapter and section, not page numbers — editions paginate differently. Do not invent or paraphrase-as-quote anything not on this list; paraphrase freely, but without quotation marks.

## Contents
- Books
- Quotes — Domain Service
- Quotes — Application Service
- Quotes — Application Precondition (underlying ideas)
- Where the authors disagree, and the side this skill takes
- What the books do not say

## Books

- Evans, Eric. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley, 2004.
- Vernon, Vaughn. *Implementing Domain-Driven Design*. Addison-Wesley, 2013.
- Fowler, Martin. *Patterns of Enterprise Application Architecture*. Addison-Wesley, 2002. (The "Service Layer" pattern in ch. 9 is written by Randy Stafford.)
- Martin, Robert C. *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017. (Ch. 34 "The Missing Chapter" is written by Simon Brown.)

## Quotes — Domain Service

**What it is**
> "A SERVICE is an operation offered as an interface that stands alone in the model, without encapsulating state, as ENTITIES and VALUE OBJECTS do."
> — Evans, ch. 5 "A Model Expressed in Software", section "Services"

**When to create one**
> "When a significant process or transformation in the domain is not a natural responsibility of an ENTITY or VALUE OBJECT, add an operation to the model as a standalone interface declared as a SERVICE. Define the interface in terms of the language of the model and make sure the operation name is part of the UBIQUITOUS LANGUAGE. Make the SERVICE stateless."
> — Evans, ch. 5, section "Services"

**What "stateless" means**
> "The execution of a SERVICE will use information that is accessible globally, and may even change that global information (that is, it may have side effects). But the SERVICE does not hold state of its own that affects its own behavior, as most domain objects do."
> — Evans, ch. 5, section "Services"

**The practical trigger**
> "Often the best indication that you should create a Service in the domain model is when the operation you need to perform feels out of place as a method on an Aggregate or a Value Object."
> — Vernon, ch. 7 "Services"

**The static-method smell**
> "To alleviate that uncomfortable feeling, our natural tendency might be to create a static method on the class of an Aggregate Root. However, when using DDD, that tactic is a code smell that likely indicates you need a Service instead."
> — Vernon, ch. 7 "Services"

**The three jobs**
> "Under what conditions would an operation not belong on an existing Entity or Value Object? It is difficult to give an exhaustive list of reasons, but I've listed a few here. You can use a Domain Service to: Perform a significant business process; Transform a domain object from one composition to another; Calculate a Value requiring input from more than one domain object."
> — Vernon, ch. 7, section "What a Domain Service Is (but First, What It Is Not)"

**Keeping domain knowledge out of the application service**
> "This pushes all details of authentication out of the Application Service client and into the Domain Service … The Ubiquitous Language in the Context is satisfied because the proper terms are expressed by the software that models the identity management domain, rather than partly by the model and partly by the client."
> — Vernon, ch. 7, section "Make Sure You Need a Service"

## Quotes — Application Service

**The application layer**
> "Defines the jobs the software is supposed to do and directs the expressive domain objects to work out problems. The tasks this layer is responsible for are meaningful to the business or necessary for interaction with the application layers of other systems. This layer is kept thin. It does not contain business rules or knowledge, but only coordinates tasks and delegates work to collaborations of domain objects in the next layer down."
> — Evans, ch. 4 "Isolating the Domain", section "Layered Architecture"

**Responsibilities — "one service method per flow"**
> "Application Services are the direct clients of the domain model … These are responsible for task coordination of use case flows, one service method per flow. When using an ACID database, the Application Services also control transactions, ensuring that model state transitions are atomically persisted. Security is also commonly cared for by Application Services."
> — Vernon, ch. 14 "Application", section "Application Services"

**The whole GLASS shape in one sentence**
> "Using the Domain Service, we place this 'significant process . . . in the domain' [Evans]. We also properly follow the definition of Application Service by managing the transaction, security, and the task of delegating this significant tenant provisioning process to the model."
> — Vernon, ch. 14, section "Sample Application Service"

**The business rule hidden in application code**
> "Now an important business rule is hidden as a guard clause in an application method. Later, in Chapter 4, we'll look at the principle of LAYERED ARCHITECTURE, which would guide us to move the over-booking rule into a domain object, but for now let's concentrate on how we could make this knowledge more explicit and accessible to everyone on the project."
> — Evans, ch. 1 "Crunching Knowledge", section "Explicit Model"

**Who owns the transaction**
> "Leave transaction control to the client. Although the REPOSITORY will insert into and delete from the database, it will ordinarily not commit anything. It is tempting to commit after saving, for example, but the client presumably has the context to correctly initiate and commit units of work."
> — Evans, ch. 6 "The Life Cycle of a Domain Object", section "Repositories"

**Transactions and security in the Service Layer**
> "As well as providing a clear API, the Service Layer (133) is also a good spot to place such things as transaction control and security."
> — Fowler, ch. 2 "Organizing Domain Logic", section "Service Layer"

**Why a handler may Signal**
> "Validation aside, the creation, update, or deletion of a domain object in an application increasingly requires notification of other people and other integrated applications. These responses must be coordinated, and transacted atomically, by Service Layer operations."
> — Randy Stafford, in Fowler, ch. 9 "Domain Logic Patterns", section "Service Layer"

**Evans's funds-transfer partitioning (application row)**
> "Listens for confirmation. Decides to send notification using infrastructure service."
> — Evans, ch. 5, section "Services and the Isolated Domain Layer"

## Quotes — Application Precondition (underlying ideas)

"Application Precondition" is a team term; these quotes support the ideas, never the term.

**Found — existence is checked by the application service**
> "The helper exists to guard against nonexistent Tenant instances and is used by all service methods that need to get an existing Tenant."
> — Vernon, ch. 14, section "Sample Application Service"

**Entitled — security is an application concern**
> "Security is also commonly cared for by Application Services."
> — Vernon, ch. 14, section "Application Services"

**Owned — record-level authorization must not be bypassed**
> "In many other cases, bypassing the business logic layer is undesirable, especially if that business logic is responsible for ensuring authorized access to individual records, for example."
> — Simon Brown, in Martin, ch. 34 "The Missing Chapter", section "Relaxed Layered Architecture"

**Input validation sits in front of the application service**
> "The first task is to do validation on the parameters coming into the page."
> — Fowler, ch. 14 "Web Presentation Patterns", section "Page Controller"

**A state check that is domain logic**
> "To authenticate we begin by attempting to retrieve the Tenant from its Repository using its identity. If the Tenant both exists and is active, we next encrypt the clear-text password."
> — Vernon, ch. 7, section "Modeling a Service in the Domain"

**Where this skill departs — an eligibility gate kept in the use case**
> "For this reason, the bank may specify that the system will not proceed to the payment estimation screen until the contact information screen has been filled out and verified, and the credit score has been confirmed to be greater than the cutoff."
> — Martin, ch. 20 "Business Rules", section "Use Cases"

## Where the authors disagree, and the side this skill takes

| Question | Positions | This skill |
|---|---|---|
| Does the application service hold business rules? | Martin: use cases hold "application-specific business rules" (ch. 20). Evans, Vernon: none. | **Evans/Vernon.** Eligibility cutoffs are domain rules. |
| How much workflow may it hold? | Fowler/Stafford: thin *domain facade* or thicker *operation script* (ch. 9). Evans, Vernon: thinnest possible. | **Vernon, plus Evans's "decides to send notification"** — the Signal step. |
| Domain objects or DTOs across the boundary? | Fowler/Stafford: start with domain objects. Vernon: weighs both. Martin: simple request/response models only. | **Martin:** Command/Query in, `void`/View out. |
| Is the service layer optional? | Fowler: add it only when needed (ch. 2). Vernon, Martin: a fundamental boundary. | Always present in a hexagonal module. |
| Is there a Domain Service at all? | Martin: no — enterprise rules live in Entities. Evans, Vernon: yes. | **Evans/Vernon.** |
| Interface or class? | Evans: "offered as an interface". Vernon: Separated Interface is optional (ch. 7, "Is Separated Interface a Necessity?"). | **Vernon:** a class unless several implementations or a test fake. |
| Where does input validation go? | Fowler: Page Controller. Martin: input-field validation is an application-tied rule (ch. 16). Vernon: UI/application for input; design-by-contract guards in entities for invariants (ch. 5). | Shape in the Adapter; invariants in Value Objects/Entities. |

## What the books do not say

- **Only one passage across the four books speaks directly to record-level ownership** — Simon Brown's (above). Vernon and Fowler place *security* in the application layer in general terms. **No author states that an ownership check is not a domain rule**; that line is this skill's conclusion, drawn from the heuristics (regardless-of-who-asks, on paper, refusal, second entry point) and from the contrast between application-side checks (Vernon's existence helper, `@PreAuthorize`) and domain-side checks (Evans's overbooking policy, Vernon's active-tenant check).
- **GLASS, FOE and "Application Precondition" are this skill's names**, not the authors'. Present them as such.
