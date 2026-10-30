# Submitting a Draft

Read this when the reviewer asks, later in the same session, to submit or publish a review this skill created as a `PENDING` draft. Typical requests: "publish it as approved", "submit with request changes", "resolve the fixed threads and post it". The reviewer may have deleted or edited comments on GitHub first, or told you what to drop.

GitHub's own *Submit review* button only publishes. It does not keep the Summary table true, resolve the threads that are done, post the reactions a draft could not hold, or tell this skill what the reviewer corrected. This flow does all four.

---

## The draft record

When Step 8 creates a draft, keep a record for the rest of the session:

- the review's numeric id and its `PRR_…` node id
- the body as created
- every comment the draft holds: id, `file:line` or thread, badge, signature
- the held reactions (comment id + reaction)
- `{threads_to_resolve}`, from the delta re-review when there was one
- the computed event

Everything below compares against this record.

## 1. Read the draft as it is now

```bash
gh api graphql -f query='
  query($id: ID!) {
    node(id: $id) {
      ... on PullRequestReview {
        state
        body
        comments(first: 100) { nodes { databaseId body replyTo { databaseId } } }
      }
    }
  }' -f id=<PRR_ node id>
```

If `state` is no longer `PENDING`, the reviewer already submitted it on GitHub. Say so and skip to step 5 (resolving) only if they asked for it.

A comment the reviewer deleted is simply missing from `comments`. A pending comment does not show in the REST `pulls/{pr}/comments` list either, so don't take its absence there as a deletion. Compare with the GraphQL list.

## 2. Rebuild the Summary table

Count the badges in what is left: the General Findings in the body, each pending inline comment, and each pending reply that carries a badge. Rewrite the Summary table from those counts. Drop a row whose count is now 0, and drop the whole table when nothing is left. Leave every other section of the body as it is. The reviewer may have edited it.

```bash
gh api -X PUT repos/{owner}/{repo}/pulls/{pr}/reviews/{review_id} --input body.json   # {"body": "..."}
```

A table that still says "1 Question" after the reviewer deleted that Question tells the author to look for something that isn't there.

## 3. Submit

Use the event the reviewer asked for. If they asked for none, recompute it from what is left with Step 8's rule. If the reviewer is the PR author and the event is `APPROVE`, use `COMMENT` and say why (Step 8, self-approval).

```bash
gh api -X POST repos/{owner}/{repo}/pulls/{pr}/reviews/{review_id}/events -f event=APPROVE
```

## 4. Post the held reactions

Now that the review is public, post each held reaction (Step 8, *Reaction*). Skip any whose finding the reviewer removed.

## 5. Resolve the threads that are done

Resolve every thread in `{threads_to_resolve}`, plus any the reviewer names:

```bash
gh api graphql -f query='mutation($t: ID!) { resolveReviewThread(input: {threadId: $t}) { thread { isResolved } } }' -f t=<PRRT_ id>
```

Skip a thread that still holds a reply of ours raising a point, such as a new `[Optional]` follow-up. Resolving it would fold that reply away before the author reads it. List each skipped thread and the reason in the report.

## 6. Hand the differences to Step 9

Compare the record with step 1 and with what the reviewer said:

| Difference | Step 9 signal |
|------------|---------------|
| A drafted comment is gone | Reviewer dropped a finding |
| A drafted comment's text changed substantially | Tone or terminology preference |
| The submitted event differs from the computed one | The finding that decided the event is not blocking (or is) |
| The reviewer said how the skill should post ("never write a section like that") | A feedback memory about posting |

Then run Step 9 as written. Ask about each signal, default `no`.

## 7. Report

One block: the review URL and its event, the Summary table as submitted, the threads resolved and those skipped (with reasons), the reactions posted, and the memory signals offered.
