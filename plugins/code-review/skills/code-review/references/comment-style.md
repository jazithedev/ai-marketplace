# Comment Style

How to write the body of a review comment. Read this in Step 7 (building the preview) and Step 8
(posting), before you write a single comment body.

Everything here applies to **inline comments** and to entries under **General Findings** in the
review body — those are the same findings, they only failed the diff-line check. It does not apply
to the Summary table, PR Discipline or Positive Observations, which are not findings; those still
follow the plain-English rules in Section 3.

---

## 1. Why this file exists

A review of a real PR can carry thirty comments. If each one is four hundred words of dense prose,
the author reads none of them properly and the review has failed, however correct it was.

The findings are rarely the problem. The packaging is. An author needs three things fast: **what is
wrong**, **what to do about it**, and a way to reach the evidence *if they doubt it*. Most of the
time they do not doubt it, so the evidence must not be in their way.

So: lead with the verdict and the fix, and put the argument behind a fold. Nothing is deleted. The
reader chooses when to pay for it.

The second reader to design for is a developer whose first language is not English. Reviews get read
quickly, often on a phone, often by someone translating as they go. A sentence that needs re-reading
is a sentence that gets skipped.

---

## 2. The skeleton

````markdown
**{badge}** {problem: 1–3 sentences, the first one states the finding}

**Suggested fix:**
```{lang}
{code}
```

<details>
<summary>Why</summary>

{the full argument, in plain sentences}

</details>

_Certainty: {N}% · Pattern: {name} · Agents: {which agreed}_
<!-- sig: {signature} -->
````

Badges: `**🔴 [Must]**`, `**🟡 [Optional]**`, `**🔵 [Question]**`. Always in square
brackets, always a single leading capital. Three badges that look alike are three badges the eye can
sort without reading them.

**There is no subject line.** The badge and the first sentence of the problem share a line, joined by
a single space — no em dash. Every line an author reads costs them time, and a one-line subject
followed by a problem that opens with the same point makes them read the verdict twice. The finding's
`description` still exists as a short title, but it is internal: it labels the finding in the Step 7
preview and guides the Step 7A rewrite. It is never posted.

**Every badge uses this same skeleton.** A section with nothing to put in it is dropped, not padded.
In practice:

| Section | [Must] | [Optional] | [Question] |
|---|---|---|---|
| Problem | always | always | always — the question, then what is unclear |
| Suggested fix | nearly always | usually | rarely — there is nothing to fix yet |
| Why | often | sometimes | seldom |
| Footer | always | always | always |
| Signature marker | always | always | always |

A General Finding is the one exception: its templates carry the certainty inline, as the leading
`[{certainty}%]`, instead of a separate footer line, and its badge has no emoji:
`- [{certainty}%] **[Must]** {problem} <!-- sig: {signature} -->`. The bold badge marks where each
item starts, and a blank line separates consecutive items.

### Problem — one to three sentences

What is wrong, and what happens because of it. Under sixty words.

**The first sentence states the finding.** It sits on the badge line, and a reader scanning thirty
comments decides from that sentence alone which ones to read further, so it has to carry the verdict
on its own. State the finding, not the topic:

- `The rollback leaves the customer charged a report usage.`, not `Rollback handling is wrong here.`
- `The budget is charged before the send job is queued.`, not `There is an ordering issue in CampaignCreator.`

Sentences two and three give the consequence. Never open with background and build up to the
verdict.

**A `[Question]` opens with the question itself**, ending in `?`. At most two sentences of context
follow. The author sees what they are asked to answer before anything else.

This is the only part many readers will read. It must stand on its own: someone who never opens the
Why still knows what is broken and roughly why it matters.

What belongs here: the defect, and its visible consequence.
What does not: the call chain, the prior review round, prevalence counts, config file excerpts,
alternatives you rejected, or caveats about what you did not verify. All of that is evidence — it
goes in the Why.

### Suggested fix — a code block, or at most two sentences

Prefer code. A diff-shaped snippet the author can copy is worth three paragraphs of description.

When the fix is structural and code would be misleading, describe it in **at most two sentences**
(about forty words). If you genuinely cannot say what to do, drop the section rather than filling it
with hedging — but ask yourself first whether the finding is really a `[Question]`.

**When the snippet itself contains a fenced block, open the outer fence with four backticks.** A
three-backtick outer fence is closed by the first bare three-backtick line inside it. Everything after
that point — the rest of the fix, the whole `Why` fold, the footer — is swallowed into a code block.
The comment still posts and nothing reports an error, so the first sign of trouble is a comment that
renders as a wall of literal text with no fold. This is measured, not theoretical: it happened to a
real `[Must]` comment whose fix demonstrated a markdown template.

Outer four, inner three:

`````text
````markdown
**Suggested fix:**
```php
$x = 1;
```
````
`````

The same applies to this file. The rule holds wherever a fenced block nests, which is why every
example in § 4 opens with four backticks.

If consolidation gave the finding a **Locations to fix** list, render it from the finding's
`consolidated_locations` array directly under the fix, still outside the Why. It is an instruction,
not an argument:

```markdown
**Locations:**
- `{file}:{line}` — `{identifier}`
```

### Why — optional, and genuinely optional

`<details><summary>Why</summary>` holding the complete argument: the call chain, the measurement, the
config value, the earlier review round, the alternative you rejected and why, the part you could not
verify.

Keep every piece of evidence you have. Do not throw findings away to hit a word count — the author
who pushes back deserves the whole case. Rewrite it plainly instead, using Section 3. The length
that remains is fine, because it is folded away.

**Omit the section entirely when you have no new evidence.** The test: can you write two sentences
that say something the problem and fix have not already said? If not, the expander is an
empty box the reader opens for nothing, which is worse than no expander. Most `[Optional]` findings
and nearly all `[Question]` findings fail this test.

Never move the problem statement into the Why to make the top look shorter. That defeats the whole
arrangement.

Two mechanical notes:
- Leave a blank line after `<summary>` and before `</details>`, or GitHub will not render the
  Markdown inside.
- The summary text is exactly `Why`. Not `Why?`, not `Why this matters`, not `Details`. A review is
  easier to scan when every fold looks the same.

### Footer

`_Certainty: {N}% · Pattern: {name} · Agents: {which agreed}_`, on its own line, last, outside the
fold. Disagreement annotations belong here too.

It sits outside the fold because it qualifies the whole finding rather than the argument for it. A
reader who never opens the `Why` still needs to know how sure the reviewer is.

### Signature marker

`<!-- sig: {signature} -->`, the very last line, after the footer. GitHub does not render HTML
comments, so the author never sees it. The next review run reads it to recognise its own earlier
comments (`agents/previous-comments.md` step 2), so it must be present on every posted finding.

`{signature}` is `{pattern}:{identifier}`, lowercased: the finding's `pattern` and the main code
identifier it is about, copied verbatim from the code — `positional-args:sendquotaresult::denied`.
Both parts come from the code and the pattern name, not from prose, so a later run that raises the
same problem on the same symbol produces the same signature even when it words the problem
differently. When the finding names no code identifier (a PR-level finding such as a description
mismatch), the signature is the pattern alone.

---

## 3. Plain-English rules

These are checkable. Run down them once per comment before you post it.

They govern **comment bodies**, not this file. Explanatory prose earns connectives that a review
comment does not, so the guide reads more loosely than the comments it specifies. The worked examples
in § 4 are the exception: those are comment bodies, so they meet every rule below.

1. **One idea per sentence.** If a sentence joins two thoughts with an em dash, a semicolon, or
   `, which`, split it into two sentences.
2. **Active voice, and name who acts.** `The branch writes 0` beats `0 is written`.
3. **No metaphors or figures of speech.** Not `the same species as`, `travels verbatim`, `a fair
   trade`, `vestigial`, `the shape points at`, `lands as dead code`, `paid for`. Say the literal
   thing.
4. **No rhetorical moves.** No irony, no understatement, no `this is not hypothetical`, no
   `both halves are false`, no building to a reveal. State the finding first and support it after.
5. **Common words.** get, not obtain. show, not surface. check, not consult. unused, not vestigial.
   remove, not collapse. missing, not absent.
6. **Code stays verbatim.** Identifiers, file paths, method signatures, numbers and quoted UI copy
   are reproduced exactly. Never paraphrase an identifier into prose, and never translate a technical
   term the codebase uses — `value object`, `N+1`, `fixed window` and `bounded context` are precise
   and the audience knows them. Plain English is about sentences, not vocabulary.
7. **Stop when you are done.** No closing sentence that restates the paragraph above it.
8. **Present tense for behaviour.** `This branch never asks the limiter` — not `this branch would
   never have asked`.
9. **Numbers, not vague quantifiers.** `38 of 48 sibling files` beats `most sibling files`.
10. **One hedge maximum.** `I did not check whether the schema cascades` is useful once. Stacked
    hedging (`would appear to possibly`) reads as though you are unsure of the finding itself — and
    if you are, the footer's `Certainty` is where that belongs.

---

## 4. Worked examples

**Example A — a `[Must]` carrying a long chain of evidence.**

The finding as an agent hands it over (excerpt):

> This branch never consults the limiter, yet hard-codes `remaining: 0`. That value travels verbatim:
> `SendQuotaExceededException::$remaining` -> `HandlesSendQuotaRefusal` -> `data.remaining` ->
> `dailySendLimitMessage()`. In `send_quota_message.js`, `remaining <= 0` selects
> `DAILY_SEND_LIMIT_MESSAGE` … For a customer whose budget is completely untouched, **both halves are
> false** — and the actual remedy … is never surfaced. This is not hypothetical. …

The comment:

````markdown
**🔴 [Must]** The oversized-campaign branch reports `remaining: 0`, so the UI tells the customer
something false. This branch never asks the limiter how much budget is left. The UI then tells a
customer who has sent nothing that they used their whole allowance today.

**Suggested fix:**
```php
return $this->deny($customerId, $tier, $recipients, $limit, $this->counter->remaining($customerId, $tier));
```

<details>
<summary>Why</summary>

`deny()` passes the `0` on unchanged. It travels into `SendQuotaExceededException::$remaining`,
then through `HandlesSendQuotaRefusal` into `data.remaining`, and finally into
`dailySendLimitMessage()`.

In `send_quota_message.js`, `remaining <= 0` selects `DAILY_SEND_LIMIT_MESSAGE`:

> "You've reached today's limit and can't send any more review requests right now. Your limit resets
> within 24 hours."

Both sentences are wrong for a customer with a full budget. The real answer is to split the list,
because it is bigger than the whole daily cap, and the message never says so.

This happens in production. `config/parameters.ini` gives customers `125087` and `88` a 500-contact
upload allowance. On the unpaid tier the limit is 100, so every upload by those two customers takes
this branch. The PR description says a single CSV cannot exceed either budget. That holds for the
paid budget only.

`dailySendLimitMessage()` already has a shortfall branch with the useful wording. It is never
reached from here.

</details>

_Certainty: 95% · Pattern: fabricated-remaining-budget · Agents: bug-smell-scan_
<!-- sig: fabricated-remaining-budget:deny -->
````

**Example B — an `[Optional]` with no Why worth opening.**

````markdown
**🟡 [Optional]** The refusal builders went back to positional arguments. `denied()` takes three
`int`s in a row: `(tier, limit, remaining, paidDailyLimit)`. Swapping `limit` and
`remaining` still compiles, type-checks and passes the tests.

**Suggested fix:**
```php
SendQuotaResult::denied(tier: SendTier::Unpaid, limit: 100, remaining: 0, paidDailyLimit: 500),
```

Same in `CreateTest.php:47` and `SendQuotaExceededExceptionTest.php:20` and `:37`.

_Certainty: 90% · Pattern: positional-args · Agents: jazi-craftsmanship_
<!-- sig: positional-args:sendquotaresult::denied -->
````

There is no Why, because everything the argument needs is already in three sentences. The point
that the previous round added named arguments is dropped from the problem: it is history, and it
would only belong in a Why. Adding a fold
here would cost the reader a click and give them nothing.

**Example C — a `[Question]`, no fix, no Why.**

````markdown
**🔵 [Question]** Is the paid tier meant to keep its budget after a downgrade? Each tier has its own
limiter, so a customer who spends the paid budget and then downgrades gets a fresh unpaid budget the
same day.

_Certainty: 85% · Pattern: tier-change-budget-reset · Agents: bug-smell-scan_
<!-- sig: tier-change-budget-reset -->
````

---

## 5. Check before you post

For each comment:

- [ ] No subject line: the badge is followed directly by the problem, with no em dash.
- [ ] The problem's first sentence states the finding (a `[Question]`: asks the question).
- [ ] Problem is three sentences or fewer, and makes sense on its own.
- [ ] Suggested fix is a code block, or two sentences at most, or deliberately left out.
- [ ] The Why either carries evidence the top does not, or is not there.
- [ ] `<summary>Why</summary>`, with blank lines inside the `<details>`.
- [ ] Section 3 run down: no metaphors, no stacked clauses, identifiers verbatim.
- [ ] Footer present, on its own line, outside the fold.
- [ ] `<!-- sig: … -->` present as the last line (a General Finding: at the end of its first line).

If a comment still feels long after this, the usual cause is that it is two findings wearing one
badge. Split it.
