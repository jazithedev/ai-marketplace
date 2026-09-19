# Finding Consolidation Rules

This file specifies how the orchestrator transforms the **raw findings list** emitted by Phase 2 agents into the **clean findings list** that goes into Step 7's local preview and Step 8's GitHub post.

The orchestrator runs these rules in order, on the in-memory findings list. There is no separate file or process — these are decision rules applied in Step 6 of `SKILL.md`.

---

## Run order (Step 6 sub-steps)

1. **Gate on certainty (two-stage)** — drop every finding with `certainty < 40`; hold `40 ≤ certainty < 80` in a **pending set** to be re-tested after dedup, since independent agreement can lift a finding over the bar (see [Section A](#convergence--independent-agreement-raises-certainty)). Findings at `≥ 80` pass straight through. See [Section E](#section-e--certainty-vs-materiality) for what `certainty` means and why it is not the same axis as severity.
2. **Default missing classifications** — derive from `materiality`: MUST for high, OPTIONAL for medium, QUESTION for low. No finding leaves Step 6 unclassified.
3. **Same-agent dedup** — within one agent's output, merge findings whose `(file, line)` AND `pattern_essence` match. Keep the more detailed body.
4. **Cross-agent dedup with disagreement handling** — see [Section A](#section-a--cross-agent-dedup-g7--g4) below. Runs over `survivors ∪ pending`; afterwards, any pending finding whose post-convergence `certainty` reached 80 rejoins the working set and the rest are dropped.
5. **Pattern consolidation** — see [Section B](#section-b--pattern-consolidation-g1) below.
6. **Prevalence calibration** — see [Section C](#section-c--prevalence-calibration-g3) below.
7. **Memory-premise verification** — see [Section C-bis](#section-c-bis--memory-premise-verification-g9) below.
8. **Match existing PR threads** — pre-existing logic in `SKILL.md` Step 6 sub-step 8. Unchanged.
9. **Match prior skill-authored reviews** — see [Section D](#section-d--prior-skill-review-suppression-g8b) below.
10. **Collect positive observations + obstacles** — pre-existing logic. Unchanged.

---

## Section A — Cross-agent dedup (G7 + G4)

Two findings from different agents are considered the same finding when **all three** hold:

1. **Location match.** Either:
   - Same `file` AND `|line_a - line_b| ≤ 3`, OR
   - Same `file` AND both findings reference the same identifier (class, method, or attribute name extractable from the description).
2. **Topic match.** The descriptions normalised (lowercased, code-fence content stripped, punctuation removed) share a Jaccard similarity ≥ 0.5 on token bigrams. This is intentionally loose so that "X is missing #[Override]" and "method X has no #[Override] attribute" merge.
3. **Pattern match.** Both findings carry the same `pattern` field, OR neither has one (legacy).

When merged:

- Keep the longest `description` (most information).
- `certainty` = per the convergence rule below (not a plain maximum).
- `materiality` = the **highest** any contributor emitted. One agent recognising that a shared observation actually matters is signal; the others simply may not have looked at that angle.
- `agents` field = union of contributors.
- `agent_classifications` field = the per-agent classification each contributor emitted (used by G4 below).

### Convergence — independent agreement raises certainty

Taking the plain maximum throws away the most useful thing a multi-agent pipeline produces. Agents review in separate contexts and cannot see each other's output, so N of them landing on the same observation is N independent confirmations, not one repeated guess.

```
base = max(contributor certainties)
n    = number of DISTINCT agents contributing to the merged finding

n == 1  → certainty = base
n == 2  → certainty = min(95, base + 5)
n >= 3  → certainty = min(95, base + 10)
```

Cap at 95 — never 100. Convergence is strong evidence, not proof; agents share a base model and can share a blind spot.

**This rule can rescue a finding from the `certainty < 80` gate**, which is the point. Three agents independently observing the same true-but-arguably-minor fact at 55–70 each would otherwise all be dropped in sub-step 1 — and because the gate runs *before* dedup, they are dropped before they ever get the chance to reinforce one another.

To make that possible, sub-step 1's gate is a **two-stage** filter:

1. Drop findings with `certainty < 40` outright — too speculative to be worth carrying.
2. Hold findings with `40 ≤ certainty < 80` in a **pending set** rather than discarding them. Run dedup (Section A) over `survivors ∪ pending`. Any pending finding whose post-convergence `certainty` reaches 80 rejoins the working set; the rest are dropped after dedup completes.

A finding rescued this way is usually a `[Question]`, not a MUST — high certainty that something is *true* combined with genuine uncertainty about whether it *matters* is exactly what a Question is for.

**Do not** apply convergence when contributors are not independent: findings from the same agent (already handled by same-agent dedup), or where one agent's prompt explicitly seeded the observation for another to check. Orchestrator-directed probes are confirmations of your own hypothesis, not independent discoveries — record them at the single agent's certainty.

### G4-pre — Factual disputes are settled before classification

**Run this before G4.** When contributors disagree, first ask *what kind* of disagreement it is:

- **Severity dispute** — the agents agree on what the code does and differ on how much it matters. G4 handles it.
- **Factual dispute** — the agents assert incompatible things about the repo: this convention is/is not already established, that sibling PR did/did not land, this symbol does/does not exist. **G4 must not touch this.**

A factual dispute has a right answer, and it is cheap to obtain. Measure it yourself — `git merge-base --is-ancestor`, `git grep` at an explicit ref, `gh pr view --json baseRefName` — then discard the losing agents' reasoning entirely and classify the finding **once**, from the fact. Record the measurement in the finding body: the author is owed the evidence, especially when it downgrades a MUST.

Why this cannot be left to G4: weakest-wins resolves a factual dispute by *opinion count*, and the mild opinion is not reliably the correct one. It gets the right answer only when the dissenting agent happens to also be the factually correct one. Invert that — two agents right, one wrong and mild — and weakest-wins silently suppresses a real MUST, with no trace in the output that a factual question was ever open. Either way the reviewer sees a confident classification resting on an unresolved fact.

Observed 2026-07-31: two agents reported a strict-validation commit as already merged to `master`, making an unvalidated map a MUST-grade regression; a third measured the ancestry and found it merged into a *collective* branch instead. Weakest-wins produced the correct Question — by luck, not by rule. `git merge-base --is-ancestor` settled it in one command.

If a fact genuinely cannot be measured, do not fall through to weakest-wins as a substitute: classify it a `[Question]`, state the open fact and what you tried, and let the author close it.

### G4 — Classification disagreement

Applies to **severity disputes only** — anything G4-pre did not already settle on the facts.

After merging, inspect `agent_classifications`:

- If all agents agree → use that classification.
- If agents disagree → pick the **weakest**: `QUESTION` beats `OPTIONAL` beats `MUST`. The reasoning: a Question means at least one agent thinks the rule's applicability is uncertain — that uncertainty should propagate to the reviewer.
- Annotate the finding with `disagreement: "Agent X: MUST 95%, Agent Y: Question 80% — downgraded to Question"`. This annotation is shown in the Step 7 local preview only (NOT posted to GitHub).
- When G4-pre settled a factual dispute, annotate with the measurement instead: `resolved: "Agent X asserted <claim>; measured <command> → <result>; classified <X> on the fact"`. Unlike the disagreement annotation, **this one belongs in the posted finding body**, not just the local preview.

---

## Section B — Pattern consolidation (G1)

After cross-agent dedup, group remaining findings by `(pattern, classification)` tuple.

For any group with size ≥ 2:

1. **Anchor selection.** Pick the (lowest file path lexicographically, lowest line number) tuple as the inline-comment anchor.
2. **Merge.** Produce a single consolidated finding:
   - `description`: keep the original short description (without locations).
   - `body`: append a `Locations to fix:` bullet list of every `(file, line, identifier)` from the merged set.
   - `certainty`: maximum of contributors. The convergence rule from Section A does **not** apply here — G1 groups the same pattern at *different locations*, so the members corroborate the pattern's breadth, not each other's accuracy.
   - `materiality`: maximum of contributors.
   - `agents`: union of contributors.
3. **Suggested-fix check.** If members of the group have **structurally different** `suggested_fix` shapes (different signatures, different return types, different surrounding context), **do NOT consolidate** — keep them as separate findings. Consolidation is only correct when the fix template is identical modulo identifier substitution. Example of valid consolidation: 8 methods all need a `#[\Override]` attribute prepended. Example of invalid consolidation: 3 methods all violate naming, but each needs a different rename.

### Why this exists

In production the same systemic issue (forgotten attribute, missing convention) often touches many methods/files. Emitting one inline comment per occurrence creates 8–10 separate review threads for what is logically one fix. The author has to read the same explanation 8 times. Consolidation puts it in one place with all locations listed.

---

## Section C — Prevalence calibration (G3)

For every finding whose `pattern_kind == "convention"` (the agent emitted "your code violates project pattern X"), the orchestrator runs a cheap codebase-prevalence probe before classifying as MUST.

### Probe algorithm

1. **Identify the structural sibling set.** From the finding's `file` path, derive a glob of structurally-similar files. Heuristics:
   - For a file at `src/Modules/<Mod>/Infrastructure/Repository/X.php` → glob `src/Modules/*/Infrastructure/Repository/*.php`.
   - For a file at `src/Modules/<Mod>/Domain/ValueObject/X.php` → glob `src/Modules/*/Domain/ValueObject/*.php`.
   - For a test file under `Test/Domain/Repository/` → glob `src/Modules/*/Test/**/*.php`.
   - When no obvious sibling glob, skip the probe — leave the finding at the agent's classification.
2. **Sample up to 10 files** from the glob via `ls` or `find`.
3. **Count adherence.** For each sample, grep for the pattern marker (the agent should provide a `pattern_marker` string — e.g., `#[\\Override]`, `// Arrange`, `final readonly`). `prevalence = matches / total_sampled`.

### Classification mapping

| Prevalence | New classification |
|------------|--------------------|
| ≥ 0.8 | Keep MUST (strong codebase convention) |
| 0.5 – 0.8 | Downgrade to `[Optional]` (mixed convention) |
| < 0.5 | **Drop the finding entirely** (not actually a convention) |

The downgrade/drop happens silently — the finding goes from MUST → Optional or disappears. The local preview shows the new classification only.

### When prevalence isn't applicable

- **Genuine bug findings** (Agent 2's "null pointer" / "race condition" / "security issue"): skip the probe. `certainty` stays as the agent emitted it.
- **Project-rule violations from explicit AGENTS.md/CLAUDE.md rules** (Agent 1's "the AGENTS.md says X is required"): skip the probe. The rule is documented — it's MUST regardless of how widely it's followed today.
- **Reviewer-memory rules** (loaded via G5): skip the *prevalence* probe. A memory rule is an explicit reviewer preference and doesn't need majority adoption to be valid — the reviewer may be introducing the convention deliberately. But skipping prevalence is **not** the same as being unfalsifiable: continue to [Section C-bis](#section-c-bis--memory-premise-verification-g9), which checks the rule's own stated premise.

---

## Section C-bis — Memory-premise verification (G9)

A memory rule can be wrong. Not wrong about the reviewer's taste — wrong about the **codebase fact it cites as its justification**. Section C deliberately exempts memory rules from prevalence dilution; this section exists so that exemption doesn't also make them unfalsifiable.

### The failure this prevents

Memories are written from a single incident and generalise as they're written. A reviewer asks for one attribute to be removed from one test class; the memory records "never use this attribute in this module" and adds a *reason* — "several classes here are excluded from coverage, so the attribute warns". Both halves then get applied together forever, including where the reason does not hold.

Because `pattern_kind: "memory"` bypasses prevalence and agents are told to treat memory rules as MUST-grade, multiple agents will independently emit a high-certainty MUST, and G4's weakest-wins tiebreak won't help — the agents *agree*. Nothing downstream can challenge it. The reviewer then receives a blocking demand built on a premise that a single `grep` would have refuted.

### Which memory rules have a premise to check

Only those whose body makes a **falsifiable claim about the codebase or its tooling**. Signals, in the rule's own text:

- A tooling/config assertion — "these paths are excluded from coverage", "the linter rejects this", "CI fails on X".
- A prevalence assertion — "the team removes these", "we don't use X anywhere", "every module does Y".
- A causal assertion — "X fails/warns because Y".

Rules with **no** factual premise — "use named parameters for multi-arg calls", "always add AAA comments", "prefer `private static` for stateless helpers" — are pure preference. There is nothing to verify. They keep their bypass and are unaffected by this section. **Do not** invent a prevalence test for a taste rule; that reintroduces exactly the dilution Section C exempts them from.

### Probe algorithm

1. **Extract the premise** as a single checkable proposition.
2. **Pick the cheapest decisive check.** Read the config file the rule refers to (`phpunit.xml`, `.eslintrc`, `deptrac.yaml`, CI workflow); or grep the sibling set for the claimed prevalence; or run the tool on one file. One command is normally enough — this is a cheap guard, not an investigation.
3. **Record the measurement verbatim.** The number or config excerpt goes in the finding body. A claim like "the memory looks stale" without a measurement is not a verification, and must not be used to downgrade anything.

Prefer to have the agent run this at Phase 2 time and report it (see SKILL.md Step 5), since it already has the file open. The orchestrator verifies only what came back unmeasured.

### Outcome mapping

| Premise check | Action |
|---------------|--------|
| **Holds** | Keep the agent's classification. Memory rule confirmed; no note needed. |
| **Fails** | Downgrade to `[Optional]`. Body must state the rule, the contradicting measurement, and that it is being raised for consistency only. Add a memory-correction candidate for Step 9. |
| **Cannot be checked cheaply** | Keep the classification but cap at `[Optional]` if it would otherwise be MUST, and say in the body that the premise is unverified. Never block a merge on an unverified premise. |
| **No premise present** (taste rule) | Skip this section entirely. Classification unchanged. |

### What a downgraded finding must say

Say both things plainly. The author needs to know the ask is soft and why; the reviewer needs to see their own rule was contradicted.

```markdown
**🟡 [Optional]** — <the rule's ask>

I have a recorded preference for <rule>, so flagging it — but the stated basis doesn't
hold here, so treat this as consistency-only rather than blocking:

- <the measurement, verbatim: config excerpt, prevalence count>
- <why that contradicts the rule's premise>

Your call entirely; the rule looks over-broad and I'll narrow it on my side.
```

Never silently drop the finding either. The reviewer wrote the rule for a reason, and the preference may still stand even with a broken justification — that judgement is theirs, so surface it as Optional and let them decide.

### Never downgrade on these grounds

- **The memory is old.** Age is not evidence. Verify or leave it alone.
- **The codebase mostly ignores the rule.** That's prevalence, which Section C deliberately exempts memory rules from. Only the rule's *own stated premise* is in scope here.
- **The finding feels pedantic.** That's `materiality`, settled by classification, not by premise verification.

---

## Section D — Prior skill-review suppression (G8b)

The orchestrator can detect its own past reviews on the PR and avoid re-emitting findings whose underlying rule has already been raised — even when the new occurrence is on a different file.

> **Principle: match by rule, not by location.** Two comments raising the same rule on different files are one conversation, not two. Threads should accumulate evidence over the PR's lifecycle, not fragment by file.

### Detection

A review is "skill-authored" when its body **starts** with the marker prefix:

```
_This code review was made automatically by Krzysztof Trzos Code Review AI Skill
```

(Note: the prefix is open-ended. v1.0.3 and earlier emitted exactly `… AI Skill._`. v1.0.4+ appends ` at <SHA> (memory <MTIME>)._`. Detection should be a prefix match on the open string above.)

(The marker is stable across all versions of the skill — see SKILL.md Step 8's top-level body template.)

### Input

`prior_skill_findings`, produced by `agents/previous-comments.md` in Step 4c. It has two collections:

- `prior_skill_findings.inline` — one entry per inline comment with `{comment_id, path, line, signature, classification, resolved}`
- `prior_skill_findings.general` — one entry per General Finding parsed from the body with `{review_id, signature, classification}`

Both collections use the same signature normalisation: lowercase, badge emoji stripped (`🔴 / 🟡 / 🔵`), leading classification token (`must / optional / question`) and surrounding punctuation stripped. The result is a topic key like `add // arrange / // act / // assert section comments to every test method`.

### Indexes

Build two indexes keyed by normalised signature:

- `inline_index: signature -> list of inline entries`
- `general_index: signature -> list of general entries`

### Action selection (four cases)

For each new candidate finding still in the working set after Step 6 sub-steps 1–8:

```
sig = normalise(candidate.signature)

if candidate.bucket == "inline":
    matches = inline_index.get(sig, [])
    unresolved = [m for m in matches if not m.resolved]
    same_file_unresolved = [m for m in unresolved if m.path == candidate.path]

    if same_file_unresolved:
        # Case 1 — same file, same rule, prior thread still open
        → Move to Existing Threads bucket: stance = "react", comment_id = same_file_unresolved[0].comment_id
    elif unresolved:
        # Case 2 — different file, same rule, prior thread still open
        → Move to Existing Threads bucket: stance = "reply", comment_id = unresolved[lowest].comment_id
          reply_body = cross-file rollup listing every new (file, line, locator) for this signature
    elif matches:
        # Case 3 — only resolved matches; the rule was addressed for prior locations, this is new ground
        → Keep as fresh inline finding
    else:
        # Case 5 — no match at all
        → Keep as fresh inline finding

elif candidate.bucket == "general":
    if sig in general_index:
        # Case 4 — same rule already in the prior review body; re-listing is noise
        → Drop the candidate entirely
    else:
        → Keep as a new General Finding
```

### Tie-breaking when multiple matches exist

For Case 2 (cross-file reply rollup), if `unresolved` has multiple entries on different files, pick the one with the **lowest** `comment_id` (the first prior comment chronologically). Rationale: rolling new locations into the oldest thread gives the longest-running conversation the full picture; the author has already engaged with whichever thread they care about.

### Classification escalation

When `candidate.classification` is **stricter** than the matched prior (e.g., the prior was `[Optional]`, the candidate is `MUST`):

- For Case 1 — promote to `stance = "reply"` with a body explaining the escalation, instead of a silent react.
- For Case 2 — same; the reply body should call out the escalation.
- For Cases 3 and 5 — already fresh, no change.
- For Case 4 — escalating a General Finding from `[Optional]` to `MUST` is rare; treat as Case 5 (keep fresh) and let the new posting carry the upgraded severity.

### Cross-file reply body template

```markdown
The same rule applies to additional locations in this PR:
- `<path>` — <short locator> (line <N>)
- `<path>` — <short locator> (line <N>)

Rolling into this thread instead of opening a parallel one.
```

No auto-generation notice on the reply (per SKILL.md — the notice lives only on top-level review bodies).

### Worked examples

| Case | Prior | Candidate | G8b action |
|------|-------|-----------|------------|
| 1 | Inline, unresolved, `FakeXTest.php:23`, sig `add aaa comments...` | Inline, `FakeXTest.php:23`, same sig | 👍 react on the prior |
| 2 | Inline, unresolved, `FakeXTest.php:23`, sig `add aaa comments...` | Inline, `EntityXTest.php:23`, same sig | Reply rollup on the prior |
| 3 | Inline, **resolved**, `FakeXTest.php:23`, sig `add aaa comments...` | Inline, `EntityXTest.php:23`, same sig | Fresh inline on `EntityXTest.php` |
| 4 | General Finding in prior body, sig `pr description mismatch` | General Finding, same sig | Drop entirely |
| 5 | No prior with this sig | Anything | Fresh, normal posting |

---

## Section E — Certainty vs materiality

A single `confidence` number cannot do both jobs it was being asked to do, and conflating them produces errors in **both** directions at once:

- A finding can be **certainly present but barely important** — a positional argument, a duplicated test. Scored on importance it lands at 40 and is dropped, even though it's a fact.
- A finding can be **important if true but doubtful** — "this looks like it could deadlock". Scored on importance it lands at 95 and posts as a MUST, on a hunch.

Agents therefore emit two independent scores.

| Field | Question it answers | Range | What it drives |
|-------|--------------------|-------|----------------|
| `certainty` | Is this observation factually true of the code as written? | 0–100 | The sub-step 1 gate, the convergence rule, display, sort order |
| `materiality` | If true, how much does it matter? | `high` / `medium` / `low` | Classification: MUST / `[Optional]` / `[Question]` |

### Scoring certainty

Score only "would a careful engineer reading this code agree the observation is accurate?"

- **95** — verified by reading the code or running the check. "This method has no `#[Override]`" after grepping it.
- **80–90** — clear from the diff, no plausible alternative reading.
- **50–79** — depends on context not visible in the diff (a caller's guarantees, runtime config). **Held pending** — survives only if convergence lifts it to 80.
- **< 40** — speculation. Dropped.

Verifying a claim is what moves certainty, not restating it more forcefully. If you can check it, check it, then score 95.

### Scoring materiality

- **high** → MUST. Wrong behaviour, data loss, a security hole, a broken published contract, or an explicit project/reviewer rule whose premise holds. Something the author must change before merge.
- **medium** → `[Optional]`. Real improvement, author's discretion: design smells, redundant tests, naming, conventions with mixed adoption.
- **low** → `[Question]`. Might be deliberate; you need the author's rationale before you'd know whether it's a defect.

### Note for both scores

They are genuinely independent — do not let one pull the other. `certainty: 95, materiality: low` is a perfectly normal finding (a fact that probably doesn't matter, so ask about it). So is `certainty: 85, materiality: high`. If you catch yourself raising `certainty` because the issue feels serious, stop: that's `materiality`.

### Backward compatibility

An agent that emits only a legacy `confidence` is handled as `certainty = confidence`, with `materiality` derived from its `classification` (MUST → high, OPTIONAL → medium, QUESTION → low). No agent output is rejected for using the old shape.

---

## Output shape after Step 6

After all consolidation passes, each finding in the cleaned list has the following shape. Step 7's pre-pass 7A then splits `body` into `problem` (1–3 sentences) and `why` (the rest, or `null`), keeping the original as `body_raw`; the preview and the posted comment are rendered from those. See `comment-style.md` for what belongs in each.

```
{
  "classification": "MUST" | "OPTIONAL" | "QUESTION",
  "certainty": 80-100,
  "materiality": "high" | "medium" | "low",
  "premise_check": {                            // only for pattern_kind "memory" with a factual premise
    "claim": "<the premise, as a proposition>",
    "verdict": "holds" | "fails" | "unverifiable",
    "measurement": "<verbatim config excerpt or prevalence count>"
  },
  "file": "<path>",
  "line": <int>,
  "description": "<short title — rendered as the comment's subject line>",
  "body": "<full body including any Locations-to-fix list>",
  "pattern": "<pattern name>",
  "pattern_kind": "bug" | "convention" | "design" | "project-rule" | "memory",
  "agents": ["bug-smell-scan", "jazi-craftsmanship", ...],
  "agent_classifications": {"bug-smell-scan": "MUST", "tactical-ddd": "QUESTION"},  // only when disagreement
  "consolidated_locations": [{"file": "...", "line": N, "identifier": "save()"}, ...],  // only after G1 merge
  "suggested_fix": "<code snippet>",
  "prior_review_comment_id": <int>,  // only if G8b matched a prior comment
  "stance": "react" | "reply" | "new",
  "reply_body": "<cross-file rollup text>"  // only when stance == "reply"
}
```
