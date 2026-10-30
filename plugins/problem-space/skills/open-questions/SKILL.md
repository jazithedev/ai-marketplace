---
name: open-questions
description: Turns a problem analysis into a short, natural list of the open questions people must answer before work can go ahead — only the decisions and facts the source doesn't already answer or already ask, scoped to that piece of work, written the way a colleague would write them. Use it when the user explicitly asks for it — runs /problem-space:open-questions, or says things like "generate me a set of questions to answer", "what do we still need to ask", "list the open questions for the PM", "what needs answering before refinement". If no problem-analyst analysis exists in the conversation yet, it runs /problem-space:problem-analyst first. Do not use it on your own initiative, for clarifying questions you need before doing a task, or to interview the user one question at a time.
---

# Open questions

Produce the list a thoughtful colleague would send before a piece of work can start: every decision and missing fact that only people can supply, and nothing else, in as few questions as that takes.

The reader is busy and will answer in a thread or a meeting. Each question they skim past because it is vague, rhetorical, already answered somewhere, or a duplicate of another one costs their attention and makes the real ones easier to miss. So the list is short because it is selective, not because it is compressed.

## 1. Start from an analysis

Look for a `/problem-space:problem-analyst` analysis earlier in the conversation. The questions come from it: its assumptions to validate, risks and unknowns, undecided business rules, and anywhere two sources disagree.

If there is none, run `/problem-space:problem-analyst` on whatever the user gave you (ticket, document, description), then continue here in the same turn. Do not write questions from the raw input — the useful questions come from the gaps the analysis finds, especially where the current behaviour differs from what the input assumes.

Do not show that analysis in full. The user asked for questions, and a long analysis above the list buries it. Instead, open with 3 to 5 short lines of what the analysis found that the reader would not know from the input alone — mostly where the current behaviour differs from what the input assumes ("The ticket says owners only; today admins and billing contacts can export too"). Then the list. If the user wants the full analysis, they will ask.

## 2. Keep only what is truly open

Most weak lists fail here: they re-ask what the source already says. Re-read the source itself — the ticket, its description, action points and comments, not just the analysis — and test each candidate against it.

**Already answered in the source?** Drop it. If the ticket says who the endpoint is for, or who owns a decision, that is not open, even if the analysis flagged it as an assumption.

**Already listed as open in the source?** Drop it. Action points, open questions, TBDs and "to confirm" items are already being asked; repeating them is noise. This holds even when you would phrase them better. Don't mention that you left them out, either: the reader knows what the source already asks.

**Outside this piece of work?** Drop it. The list serves the work item the source describes: what it delivers and what its acceptance criteria cover. For an API endpoint ticket, how the front end shows an error, undo, success metrics and budget belong to other people's tickets, even though they are real questions.

**Could I find the answer myself**, in the code, the documents, or the ticket's links?

- If yes, find it. Then drop the question, or use the answer as context inside a question that still needs a person ("Today the limit is 50 per customer per day; what should it be?").
- Questions about what exists today ("Do we store X?", "What happens when Y?") are almost always lookups. Check, and if you truly cannot, say what you checked and ask the narrower thing that remains.
- If only a person can decide or knows it — a product choice, a priority, a business rule, a number nobody has set, a fact held by another team — keep it.

Also drop questions that are rhetorical, nice-to-know, or about how to build it. Implementation choices belong to the people building it, later.

## 3. Merge

Merge questions that are parts of one decision, which the same person would answer in one breath. Never join unrelated questions just to shorten the list: "Are guests in scope, and should search cover all workspaces?" is two questions sharing one number. Sub-choices of one decision become one question that names the options: "Write from an instruction, polish the user's draft, or both? If both, are they separate actions?"

There is no target count. Two sharp questions beat ten padded ones. If nothing is left after step 2, say so in one sentence ("Nothing is open beyond what the ticket already lists.") — that is a useful answer, not a failure. Fifteen or more means questions still overlap, can be looked up, or belong to other work.

Merging must not lose anything. Every distinct thing that needs an answer is still asked somewhere, and every fact a reader needs to answer it is still there.

## 4. Group and order

Number the questions so people can reply "2: yes". With five or fewer, use one plain numbered list — headings over two questions look like a form. With six or more, group them by topic under short plain headings (Scope, Limits, Rollout …) and number straight through across groups. If most headings would sit over a single question, drop the headings.

Put first the questions that decide whether the work happens at all, or what it is. Then the ones that shape it. Details last.

### Non-blocking questions

Some questions must not hold up the estimate or the start of the work. A question is non-blocking only if both are true:

- Every reasonable answer changes only a value, a wording or a setting, never the scope, the contract or the amount of work.
- It has a safe default, usually today's behaviour, so the work can start and the answer can come later.

When in doubt, it is blocking. If even one option adds work, the question is blocking. A question wrongly marked non-blocking gets skipped, and the surprise lands mid-work.

Put non-blocking questions at the very end of the list, after any groups, still numbered straight through. Start each one with "Non-blocking:" and end it with its default, so silence is a valid answer:

> 6. Non-blocking: should the confirmation email keep today's subject line, or mention the title? Unless someone says otherwise, I'll keep today's.

Blocking questions get no label. Don't explain the classification anywhere in the output.

## 5. Write it like a person

Read the finished list as if a colleague had written it. If anything looks generated, rewrite it.

- No markers, labels, emoji, owner names, priority tags or "blocking" flags. A person signals what matters by the order and, if needed, one plain sentence. The only exception is the "Non-blocking:" label from step 4.
- Each question can be answered as written. When the options are known, name them. When a current value matters, state it in a short clause.
- Use the reader's words, not code identifiers, unless the readers are engineers.
- Put one sentence right before the questions, two only if really needed, saying the way a person would that you have questions. Write a new one each time, fitted to the work, never a fixed phrase. For example: "I went through the current code for this, and a few things still aren't clear to me:", "Before we pick this up, I'd like to check a couple of things:" or, for a single question, "One thing I'm not sure about:".
- Apart from that sentence and the findings lines from step 1, at most one short sentence after the list, and only if a person would write it (for example, which questions matter most). No offers to post, share or expand.

## 6. Suggestions, only when asked

Do not suggest answers unless the user asks for a suggestion. When they do, add it to the question it answers, as a short remark after the question, not as a separate block or paragraph:

> 5. If the patron doesn't borrow in time, does the offer go to the next person automatically? I suggest yes, so copies don't sit idle. I'd also add this to the acceptance criteria; they don't cover it yet.

- Always write "I suggest". Never "Our suggestion", "We suggest" or "Recommendation:".
- Keep it to the choice and one reason. The question already holds the context.
- If the answer sets behaviour the acceptance criteria don't cover yet, say in the same remark that it belongs in them. Skip this when the criteria already cover it or the answer changes nothing they describe.
- On a non-blocking question, the default is not a suggestion and is always stated. If your suggestion is the default, write only the default. If it differs, write the "I suggest" remark and make the suggestion the default: "I suggest mentioning the title, so patrons can tell emails apart. Unless someone says otherwise, I'll go with that."

Show the list in the chat and stop. Posting it anywhere is a separate request.

See `references/example.md` for a full before-and-after.
