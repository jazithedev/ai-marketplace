# Jazi's Code Review Patterns

Personal review checklist derived from analyzing 1,132 PR reviews by JaziTheDev (Krzysztof Trzos) on BrightLocal/Tools (May 2024 – April 2026). These patterns reflect real, recurring feedback that consistently appeared across those reviews.

## Table of Contents

- [Finding Classification System](#finding-classification-system)
- [MUST — PHP Code Quality](#must--php-code-quality)
- [MUST — Architecture & Design](#must--architecture--design)
- [MUST — Value Objects](#must--value-objects)
- [MUST — Testing](#must--testing)
- [MUST — PR Discipline (reinforced)](#must--pr-discipline-reinforced)
- [OPTIONAL — Suggestions](#optional--suggestions)
- [QUESTION — Rationale Challenges](#question--rationale-challenges)
- [Communication Tone](#communication-tone)

---

## Finding Classification System

Every finding from this checklist must be categorized. The classification drives what the PR author is expected to do:

| Category    | Meaning                                  | Output prefix   | Blocks merge? |
|-------------|------------------------------------------|-----------------|---------------|
| MUST        | Required change before merge             | *(no prefix)*   | Yes           |
| OPTIONAL    | Non-blocking suggestion, author decides  | `[Optional]`    | No            |
| QUESTION    | Needs author's rationale before deciding | `[Question]`    | Until answered|

---

## MUST — PHP Code Quality

### 1. Never use `empty()`

The single most consistently flagged pattern. `empty()` checks too many things at once (null, false, 0, `""`, `[]`), which masks the real type and hides bugs. When you know the variable's type, use the appropriate explicit check instead.

```php
// BAD
if (empty($items)) { ... }

// GOOD — when $items is an array
if ([] === $items) { ... }

// GOOD — when $value is a string
if ('' === $value) { ... }

// GOOD — when $count is an integer
if (0 === $count) { ... }

// GOOD — when $item could be null
if (null === $item) { ... }
```

### 2. Named parameters for scalar arguments

When a constructor or method call has 2+ scalar arguments (string, int, bool, float), use named parameters. Without them, the call is unreadable and prone to argument-order bugs. Especially important in test data providers.

```php
// BAD
new ReportRun('bar', true, 42, null);

// GOOD
new ReportRun(name: 'bar', isActive: true, retries: 42, fallback: null);
```

### 3. `#[Override]` on every overridden method

Every method that overrides a parent class method or implements an interface method must have the `#[Override]` attribute. This is enforced consistently — no exceptions.

### 4. `final readonly class`

Classes with no mutable state and no inheritance need should be declared `final readonly`. This applies to Commands, Queries, DTOs, Value Objects, Handlers, and most services.

### 5. Explicit conditions over loose comparisons

Use strict, explicit comparisons — not loose truthiness checks. The reader should immediately understand what is being checked.

```php
// BAD
if (!$review) { ... }

// GOOD
if (null === $review) { ... }
```

### 6. No variable mutation — immutability preferred

Avoid reassigning variables. Prefer `array_map()` over foreach-with-push, ternary over reassignment, and `array_filter()` over conditional append.

```php
// BAD
$result = [];
foreach ($items as $item) {
    $result[] = $item->transform();
}

// GOOD
$result = array_map(static fn(Item $item) => $item->transform(), $items);
```

### 7. No suppressions without justification

Challenge every `@phpstan-ignore-line`, `@phpstan-ignore-next-line`, and `@codeCoverageIgnore`. If the suppression is needed, there should be a comment explaining why. If the underlying issue can be fixed, fix it instead of suppressing.

### 8. No unnecessary PHPDoc

Code should be self-explanatory. Don't add PHPDoc that merely restates what the type system already says. PHPDoc is warranted only when it adds information the code can't express (complex array shapes, deprecation notes, domain explanations).

### 9. No exception suppression without ACL/gateway

When wrapping calls to external services, bare try/catch that swallows exceptions is not acceptable. Wrap external calls in a documented Anti-Corruption Layer or gateway class that explains why exceptions are suppressed and what the fallback behavior is.

### 10. Static methods for stateless logic

If a method has no dependencies (doesn't use `$this`), it should be `static`. This makes the lack of side effects explicit.

### 11. Use `mb_strlen()` over `strlen()`

For any string that could contain multi-byte characters (user input, review text, business names), use `mb_strlen()` for safety.

---

## MUST — Architecture & Design

### 12. Anti-boolean-flag

Boolean parameters that switch execution paths are a recurring pattern to eliminate. The two paths should be separate named methods. This is especially critical when the flag propagates through multiple layers.

```php
// BAD
$service->run($data, isFreeRun: true);

// GOOD
$service->runForFree($data);
```

### 13. Interface design purity

Interfaces must not include properties or methods that don't apply to ALL implementations. If only some implementations need extra data, use a sub-interface or composition — never pollute the contract.

### 14. Design pattern fidelity

When a design pattern is used (Decorator, Strategy, Factory, etc.), it must follow the canonical definition. A Decorator wraps the same interface without altering the decorated implementation's contract. A Factory Method uses a private constructor. Misnamed patterns mislead future developers.

### 15. Console Commands / Controllers must not contain logic

According to GRASP, controllers and console commands are orchestrators. Business logic belongs in CQRS Commands/Handlers, domain services, or entities — never in the adapter layer. This also allows the same logic to be triggered from multiple entry points (HTTP, CLI, Worker).

### 16. CQRS commands must not return values

Command Handlers should return `void`. On error, throw an exception. This follows CQS (Command-Query Separation) principles as described by Bertrand Meyer, and applied in CQRS by Oskar Dudycz and Vaughn Vernon.

### 17. Single method for aggregate mutations

Calling multiple setter-like methods on an aggregate is no different from exposing setters. Encapsulate the operation in a single domain method that enforces invariants.

```php
// BAD
$source->setUrl($url);
$source->setProfile($profile);
$source->activate();

// GOOD
$source->updateAndActivate($url, $profile);
```

### 18. No array-of-arrays returns

Don't return `array<array>` from repositories or services. Return typed objects, DTOs, or View classes instead. Untyped arrays are impossible to refactor safely and provide no IDE support.

### 19. No Stamp Coupling

Don't pass entire objects or DTOs when only specific fields are needed. Pass the specific values. This reduces coupling and makes dependencies explicit.

### 20. Event naming must describe what happened

Domain events must clearly describe the thing that occurred — not use generic names. `ReviewMarkedAsPendingForRemoval` is good. `ReviewEvent` is meaningless.

### 21. Validation belongs in domain, not controllers

Business rules and invariant checks belong in entities and value objects. Controllers/adapters handle input parsing and HTTP concerns only.

### 22. Focus on cause, not effect

When fixing issues, address the root cause, not the symptom. If bad data reaches a template, the fix belongs where the data enters the system — not in the template.

---

## MUST — Value Objects

### 23. VO constructors must validate all invariants

A Value Object instance must always be valid. All validation happens in the constructor (or factory method). If input is invalid, throw — never create a half-valid instance.

### 24. Guard clauses over silent handling

Don't silently fix bad input (e.g., calling `.trim()` on what should already be trimmed). If input is invalid, throw. If the caller sends garbage, the caller should know.

### 25. Explicit property names

Property names must communicate what the value represents, including its context. `$dateInUtc` is better than `$date` when timezone matters. `$priceInCents` is better than `$price`.

### 26. Private/non-public mutation methods

Internal mutation methods (if any) must be private. External code should only interact through the public factory/constructor and read-only accessors.

### 27. Timezone/locale/currency as part of the VO

Contextual qualifiers belong inside the value object, not as external parameters passed around separately. A `DateTime` VO should contain its timezone, not expect callers to track it.

### 28. Unit tests expected for every VO

Value objects are perfect candidates for unit testing — they're pure, deterministic, and self-contained. Every VO should have comprehensive tests.

### 29. Prefer local VOs per module; `Shared/` is for ubiquitous concepts only

In this modular monolith, the same Value Object appearing in multiple modules with near-identical shape (e.g., a `LocationId` in module A and a structurally identical `LocationId` in module B) is **not** a finding. Local copies are the **preferred** default — they keep modules independent, let each owner evolve invariants, factory naming, and validation rules without cross-module coordination, and avoid coupling everything to a central Shared kernel.

`src/Shared/` (backend) or `frontend/shared/` (frontend) is reserved for concepts that are genuinely ubiquitous — used by **most** modules, not merely two. Promoting a VO to `Shared/` is a deliberate architectural commitment that creates a coupling point; doing it speculatively (because two modules happen to share a shape today) is worse than the duplication itself.

**Reviewer guidance:**
- Do not flag a VO duplication across two (or even a few) modules as a finding. If you mention it at all, frame it as a positive observation: each module owns its own invariants.
- Only consider raising it — and even then as `[Optional]` at most — if the VO is already present in **most** modules of the monolith, in which case promotion to `Shared/` becomes worth discussing.
- Never recommend a Shared/-namespace move on the basis of a single duplication. The cost of the wrong abstraction in `Shared/` is higher than the cost of two independent copies.

---

## MUST — Testing

### 30. No deprecated base test classes

Do not use `BaseUnitSuite` or similar deprecated base classes. Use `\PHPUnit\Framework\TestCase` directly.

### 31. No Prophecy library

The Prophecy mocking library is not used. Use fakers (in-memory implementations of interfaces) or PHPUnit's native mocking/stubbing.

### 32. Use fakers over mocks

In-memory fake implementations (e.g., `FakeUserRepository`) are clearer, more maintainable, and test behavior rather than implementation. Mocks should be a last resort — use them only when you need to verify that a void method was called.

### 33. Tests mandatory for new behavior

If new behavior is added to production code, tests for that behavior are required. "It works on my machine" is not a substitute for a test.

### 34. No `expectExceptionMessage()`

Don't assert on exception messages — they're implementation details and make tests fragile. Assert on exception type only, or create dedicated exception classes.

### 35. Data providers with named keys

Data provider yields should use descriptive string keys (not comments above the array) to make test output readable.

```php
// BAD
yield [0, 'zero'];
yield [1, 'one'];

// GOOD
yield 'zero value' => [0, 'zero'];
yield 'positive value' => [1, 'one'];
```

### 36. No conditional logic in tests

Tests should not contain `if` statements or conditional branches. If a test needs different data or paths, use separate test methods or data providers.

---

## MUST — PR Discipline (reinforced)

These reinforce the rules in `pr-discipline.md` with additional checks:

### 37. PR must be split if too large

This is the most frequent reason for requesting changes. When a PR is too large, provide specific numbered steps for how to split it — don't just say "split it."

### 38. No mixing FE and BE in single PR

Frontend and backend changes belong in separate PRs. Mixed PRs mean BE developers approve FE code (and vice versa) without proper expertise.

### 39. PR title must describe what was done

The Jira ticket title alone is insufficient. The PR title must describe the actual change — e.g., "Add weekly report PDF generation" not just "RM-1234."

### 40. PR description must explain what and why

An empty or one-word description is unacceptable. The description should explain what changed, why, and any context a reviewer needs.

### 41. AI-generated code must be verified by author

If code was generated by AI, the author is responsible for verifying every line. Non-English comments or suspiciously boilerplate patterns are red flags that the code wasn't reviewed.

### 42. No force-push while reviewers are reviewing

Once reviewers are assigned and working, do not force-push. Reviewers use the commit history to see what changed since their last pass.

---

## OPTIONAL — Suggestions

These are non-blocking. The author decides whether to apply them. Always prefix with `[Optional]`.

### 43. Readability extractions

Extract complex expressions into named variables or long closures into named private methods for clarity.

### 44. Naming preferences

Prefer `arrange*` prefix for test setup helper methods. Prefer domain-specific names over generic ones (Helper, Utils, Manager).

### 45. Temporal awareness for scripts

Temporary scripts and workarounds should document: when the issue started, when to consider removal, and a link to the tracking ticket.

### 46. Idempotent commands

CQRS commands that can safely be retried without side effects are preferable. Consider making commands idempotent where it doesn't add complexity.

### 47. `array_map()` over foreach

When building a new array from an existing one, `array_map()` is more readable and avoids mutation. But it's a suggestion, not a rule.

### 48. Enum over string constants

When a fixed set of values exists, consider using a PHP enum instead of string constants. Enums provide type safety and IDE support.

---

## QUESTION — Rationale Challenges

These are genuine questions, not demands. The author may have a good reason. Always prefix with `[Question]`.

### 49. Rationale challenges

Ask WHY for any `@phpstan-ignore-line` or suppression, for unusual architectural decisions, and for added complexity that seems avoidable.

### 50. Cross-module dependency questions

When code reaches across module boundaries (especially using another module's internal classes instead of CQRS or gateways), ask why.

### 51. Performance concerns

When code patterns could generate excessive queries (N+1 problems, CQRS queries in loops, multiple repository calls where one would suffice), raise the concern.

---

## Communication Tone

The review tone should be:
- **Friendly but firm** — explain WHY for every required change
- **Concrete** — provide code alternatives (use `suggestion` blocks when possible)
- **Positive** — acknowledge good work: "Great to see it there", "Nicely structured", "Good decision about adding named parameters"
- **Transparent** — when only reviewing part of the PR, state the scope: "Checked only Deptrac files"
- **Prefix-driven** — use `[Optional]`, `[Question]`, and `[Comment]` prefixes explicitly so authors know what requires action
