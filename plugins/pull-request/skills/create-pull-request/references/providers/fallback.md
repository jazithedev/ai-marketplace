# Provider: fallback (Bitbucket, Gitea, self-hosted, unknown)

No supported CLI is assumed. The skill still does everything git-side — branch creation,
cherry-picks, pushes are universal — then hands the user pre-filled creation links and exact
content instead of calling a provider API.

## What still runs

- All of SKILL.md Steps 0–4 (context, pre-flight, analysis, plan + confirmation).
- All `git` work from the approved plan: branches created, commits cherry-picked, everything
  pushed with `-u`.

## What degrades

For each PR the plan called for, print — ready to copy-paste:

1. A **creation URL** when the host is recognized:
   - Bitbucket: `https://bitbucket.org/<workspace>/<repo>/pull-requests/new?source=<head>&dest=<base>`
   - Gitea/Forgejo: `https://<host>/<owner>/<repo>/compare/<base>...<head>`
   - Unknown host: name the head and base branches and let the user drive their UI.
2. The exact **title**.
3. The full **body** (from the template), in a fenced block.
4. A reminder to create it as a **draft** if the provider supports drafts.

## Stacks are gated here

Do **not** build the collective + chain shape on a fallback provider:

- The chain's merge flow depends on auto-retargeting of dependent PRs when a base branch is
  merged and deleted. That behavior is verified for GitHub and GitLab only; on other
  providers a merge can leave dependents pointing at a deleted branch (or auto-decline them).
- Resume mode's `edit-pr-body` backfill has no CLI to run through.

When the plan would be a stack, tell the user why, and offer:

- **single-PR mode** on this provider (fully supported, including the degraded hand-off), or
- proceeding anyway with the git-side chain plus manual PR creation and **manual** retarget
  management at every merge — only if they explicitly accept that burden.
