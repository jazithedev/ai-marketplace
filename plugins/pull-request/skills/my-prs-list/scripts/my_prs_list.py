#!/usr/bin/env python3
"""my-prs-list — a status board of the open pull requests you authored.

Pure/deterministic given its arguments and the fetched nodes. All GitHub access
goes through the single `_gh` subprocess wrapper (the only I/O boundary). No
config file and no inputs to resolve: `author:@me` is self-scoping, so a bare
run covers every repository you have access to.

One GraphQL search call returns every field the board needs, including each
PR's base and head branch, which is what makes stack detection possible.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

TRUNKS = frozenset({"master", "main", "develop", "development", "trunk"})
TICKET_RE = re.compile(r"\b([A-Z][A-Z0-9]{1,9}-\d+)\b")
MERGE_UNKNOWN = "UNKNOWN"
MAX_MERGE_ATTEMPTS = 3
MERGE_RETRY_SLEEP = 1.0
PAGE_SIZE = 100

QUERY = """
query($q: String!, $after: String) {
  search(query: $q, type: ISSUE, first: %d, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        number title url createdAt updatedAt isDraft
        baseRefName headRefName reviewDecision mergeStateStatus
        repository { nameWithOwner defaultBranchRef { name } }
        reviewRequests(first: 20) {
          nodes { requestedReviewer { ... on User { login } ... on Team { name } } }
        }
        latestReviews(first: 20) { nodes { state author { login } } }
        commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
      }
    }
  }
}
""" % PAGE_SIZE


class GhError(RuntimeError):
    """A gh CLI call failed or gh is unavailable."""


def _gh(args: list[str]) -> str:
    """Run `gh <args>`; return stdout. Raise GhError on failure. Sole I/O boundary."""
    try:
        proc = subprocess.run(["gh", *args], capture_output=True, text=True)
    except FileNotFoundError as exc:
        raise GhError("gh CLI not found. Install GitHub CLI and run `gh auth login`.") from exc
    if proc.returncode != 0:
        raise GhError(f"`gh {' '.join(args[:2])}` failed: {proc.stderr.strip()}")
    return proc.stdout


def build_search_query(repo: str | None, orgs: list[str]) -> str:
    """Compose the GitHub search query. Repeated qualifiers are OR-ed by GitHub."""
    terms = ["is:pr", "is:open", "author:@me", "archived:false"]
    if repo:
        terms.append(f"repo:{repo}")
    terms.extend(f"org:{org}" for org in orgs)
    return " ".join(terms)


def fetch_nodes(search_query: str) -> list[dict]:
    """Fetch every matching PR node, following search pagination."""
    nodes: list[dict] = []
    after: str | None = None
    while True:
        args = ["api", "graphql", "-f", f"query={QUERY}", "-f", f"q={search_query}"]
        if after:
            args += ["-f", f"after={after}"]
        payload = json.loads(_gh(args))
        search = payload["data"]["search"]
        nodes.extend(node for node in search["nodes"] if node.get("number"))
        page = search["pageInfo"]
        if not page["hasNextPage"]:
            return nodes
        after = page["endCursor"]


def fetch_prs(search_query: str, sleep=time.sleep) -> list[dict]:
    """Fetch nodes, re-querying while any merge state is still UNKNOWN.

    GitHub computes mergeStateStatus lazily: a cold query reports UNKNOWN for
    roughly half the rows and the next identical query reports the real value.
    """
    nodes: list[dict] = []
    for attempt in range(MAX_MERGE_ATTEMPTS):
        nodes = fetch_nodes(search_query)
        if not any(node.get("mergeStateStatus") == MERGE_UNKNOWN for node in nodes):
            return nodes
        if attempt < MAX_MERGE_ATTEMPTS - 1:
            sleep(MERGE_RETRY_SLEEP)
    return nodes


@dataclass(frozen=True)
class Pr:
    number: int
    title: str
    url: str
    repo: str
    default_branch: str
    created_at: str
    updated_at: str
    is_draft: bool
    base: str
    head: str
    decision: str | None
    merge_state: str
    checks: str | None
    requested: tuple[str, ...]
    reviews: tuple[tuple[str, str], ...]


def _requested(node: dict) -> tuple[str, ...]:
    names = []
    for req in (node.get("reviewRequests") or {}).get("nodes") or []:
        reviewer = req.get("requestedReviewer") or {}
        name = reviewer.get("login") or reviewer.get("name")
        if name:
            names.append(name)
    return tuple(sorted(set(names)))


def _reviews(node: dict) -> tuple[tuple[str, str], ...]:
    seen: dict[str, str] = {}
    for review in (node.get("latestReviews") or {}).get("nodes") or []:
        login = (review.get("author") or {}).get("login")
        state = review.get("state")
        if login and state:
            seen[login] = state
    return tuple(sorted(seen.items()))


def _checks(node: dict) -> str | None:
    commits = (node.get("commits") or {}).get("nodes") or []
    if not commits:
        return None
    rollup = (commits[0].get("commit") or {}).get("statusCheckRollup")
    return rollup.get("state") if rollup else None


def to_pr(node: dict) -> Pr:
    repository = node.get("repository") or {}
    default_ref = repository.get("defaultBranchRef") or {}
    return Pr(
        number=node["number"],
        title=node.get("title") or "",
        url=node.get("url") or "",
        repo=repository.get("nameWithOwner") or "",
        default_branch=default_ref.get("name") or "master",
        created_at=node.get("createdAt") or "",
        updated_at=node.get("updatedAt") or node.get("createdAt") or "",
        is_draft=bool(node.get("isDraft")),
        base=node.get("baseRefName") or "",
        head=node.get("headRefName") or "",
        decision=node.get("reviewDecision"),
        merge_state=node.get("mergeStateStatus") or MERGE_UNKNOWN,
        checks=_checks(node),
        requested=_requested(node),
        reviews=_reviews(node),
    )


def ticket_key(pr: Pr) -> str | None:
    """The ticket key a PR belongs to, read from its branch first, then its title."""
    for text in (pr.head, pr.title):
        match = TICKET_RE.search(text.upper() if text is pr.head else text)
        if match:
            return match.group(1)
    return None


@dataclass
class Row:
    kind: str                 # "ticket" | "branch" | "pr"
    depth: int
    label: str = ""
    pr: Pr | None = None
    parent_number: int | None = None
    children: list = field(default_factory=list)


def _children_map(prs: list[Pr]) -> tuple[dict[int, list[Pr]], list[Pr], dict[str, list[Pr]]]:
    """Split a repo's PRs into parent->children, true roots, and orphaned-base roots."""
    by_head: dict[str, Pr] = {pr.head: pr for pr in prs}
    children: dict[int, list[Pr]] = {}
    roots: list[Pr] = []
    orphans: dict[str, list[Pr]] = {}
    for pr in prs:
        parent = by_head.get(pr.base)
        if parent is not None and parent.number != pr.number:
            children.setdefault(parent.number, []).append(pr)
        elif pr.base in TRUNKS or pr.base == pr.default_branch:
            roots.append(pr)
        else:
            orphans.setdefault(pr.base, []).append(pr)
    return children, roots, orphans


def _walk(pr: Pr, depth: int, children: dict[int, list[Pr]], parent_number: int | None,
          out: list[Row]) -> None:
    out.append(Row(kind="pr", depth=depth, pr=pr, parent_number=parent_number))
    for child in sorted(children.get(pr.number, []), key=lambda p: p.created_at):
        _walk(child, depth + 1, children, pr.number, out)


def _tree_keys(pr: Pr, children: dict[int, list[Pr]]) -> list[str | None]:
    keys = [ticket_key(pr)]
    for child in children.get(pr.number, []):
        keys.extend(_tree_keys(child, children))
    return keys


def build_rows(prs: list[Pr]) -> list[Row]:
    """Order one repo's PRs into ticket groups, each holding indented stack trees."""
    children, roots, orphans = _children_map(prs)

    trees: list[tuple[str, list[Row]]] = []          # (group key, rows)
    for base, members in orphans.items():
        rows = [Row(kind="branch", depth=0, label=base)]
        keys: list[str | None] = []
        for member in sorted(members, key=lambda p: p.created_at):
            _walk(member, 1, children, None, rows)
            keys.extend(_tree_keys(member, children))
        trees.append((_first_key(keys), rows))
    for root in roots:
        rows: list[Row] = []
        _walk(root, 0, children, None, rows)
        trees.append((_first_key(_tree_keys(root, children)), rows))

    groups: dict[str, list[list[Row]]] = {}
    for key, rows in trees:
        groups.setdefault(key, []).append(rows)

    def newest(rows_list: list[list[Row]]) -> str:
        return max(row.pr.updated_at for rows in rows_list for row in rows if row.pr)

    out: list[Row] = []
    for key in sorted(groups, key=lambda k: newest(groups[k]), reverse=True):
        trees_in_group = sorted(groups[key], key=lambda rows: _oldest(rows))
        count = sum(1 for rows in trees_in_group for row in rows if row.pr)
        grouped = count > 1 or any(row.kind == "branch" for rows in trees_in_group for row in rows)
        if grouped:
            out.append(Row(kind="ticket", depth=0,
                           label=f"{key} ({count} PR{'s' if count != 1 else ''})"))
        for rows in trees_in_group:
            out.extend(rows)
    return out


def _oldest(rows: list[Row]) -> str:
    return min(row.pr.created_at for row in rows if row.pr)


def _first_key(keys: list[str | None]) -> str:
    for key in keys:
        if key:
            return key
    return "no ticket"


def days_since(timestamp: str, now: datetime) -> int:
    moment = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return max((now - moment).days, 0)


DECISIONS = {
    "APPROVED": "approved",
    "CHANGES_REQUESTED": "changes-req",
    "REVIEW_REQUIRED": "review-required",
}
CHECKS = {
    "SUCCESS": "pass",
    "FAILURE": "fail",
    "ERROR": "fail",
    "PENDING": "pending",
    "EXPECTED": "pending",
}
MERGE_STATES = {
    "CLEAN": "clean",
    "DIRTY": "CONFLICTS",
    "BEHIND": "behind",
    "BLOCKED": "blocked",
    "UNSTABLE": "unstable",
    "HAS_HOOKS": "hooks",
    "DRAFT": "draft",
    "UNKNOWN": "unknown",
}


def review_cell(pr: Pr) -> str:
    """Decision plus who produced it, or who is being waited on."""
    decision = DECISIONS.get(pr.decision or "", "—")
    if pr.reviews:
        dissent = [login for login, state in pr.reviews if state == "CHANGES_REQUESTED"]
        speakers = dissent if dissent and decision == "changes-req" else [l for l, _ in pr.reviews]
        detail = _names(speakers)
    elif pr.requested:
        detail = "asked: " + _names(pr.requested)
    else:
        detail = "nobody asked"
    return f"{decision} ({detail})"


def checks_cell(pr: Pr) -> str:
    """Check rollup, marked stale when conflicts stop new runs from ever appearing."""
    state = CHECKS.get(pr.checks or "", "—" if pr.checks is None else pr.checks.lower())
    if state != "—" and pr.merge_state == "DIRTY":
        return f"{state} (stale)"
    return state


def merge_cell(pr: Pr) -> str:
    return MERGE_STATES.get(pr.merge_state, pr.merge_state.lower())


def base_cell(row: Row) -> str:
    if row.parent_number:
        return f"↑ #{row.parent_number}"
    return _md_cell(_trim(row.pr.base, 24))


def _names(names, limit: int = 3) -> str:
    """Join reviewer names, collapsing a long tail so the cell stays narrow."""
    listed = list(names)
    if len(listed) <= limit:
        return ", ".join(listed)
    return ", ".join(listed[:limit]) + f" +{len(listed) - limit}"


def _trim(value: str, limit: int = 64) -> str:
    return value if len(value) <= limit else value[: limit - 1].rstrip() + "…"


def _md_cell(value: str) -> str:
    """Escape pipe and newline characters in Markdown table cells."""
    return value.replace("|", "\\|").replace("\n", " ").replace("\r", " ")


def indent(depth: int) -> str:
    return "" if depth == 0 else "\u00a0" * 2 * (depth - 1) + "└ "


HEAD = ["Date", "PR", "Title", "Base", "Review", "Waiting", "Checks", "Merge"]


def render_repo(repo: str, rows: list[Row], now: datetime) -> str:
    count = sum(1 for row in rows if row.pr)
    lines = [f"### {repo} — {count} open", "",
             "| " + " | ".join(HEAD) + " |",
             "|" + "|".join(["---"] * len(HEAD)) + "|"]
    for row in rows:
        if row.kind == "ticket":
            lines.append(f"| | | **{_md_cell(row.label)}** | | | | | |")
            continue
        if row.kind == "branch":
            branch = _md_cell(_trim(row.label, 48))
            lines.append(f"| | — | ┄ {branch} _(no open PR)_ | | | | | |")
            continue
        pr = row.pr
        title = indent(row.depth) + _md_cell(_trim(pr.title))
        if pr.is_draft:
            title += " _(draft)_"
        lines.append("| " + " | ".join([
            pr.created_at[:10], f"[#{pr.number}]({pr.url})", title, base_cell(row),
            _md_cell(review_cell(pr)), f"{days_since(pr.updated_at, now)}d",
            checks_cell(pr), merge_cell(pr),
        ]) + " |")
    return "\n".join(lines)


def footer(prs: list[Pr], repos: int) -> str:
    decisions = [pr.decision for pr in prs]
    conflicting = sum(1 for pr in prs if pr.merge_state == "DIRTY")
    failing = sum(1 for pr in prs if CHECKS.get(pr.checks or "") == "fail")
    drafts = sum(1 for pr in prs if pr.is_draft)
    parts = [
        f"{decisions.count('APPROVED')} approved",
        f"{decisions.count('CHANGES_REQUESTED')} changes-requested",
        f"{decisions.count('REVIEW_REQUIRED')} awaiting review",
        f"{drafts} draft",
        f"{conflicting} conflicting",
        f"{failing} failing checks",
    ]
    return (f"_{len(prs)} open PR{'s' if len(prs) != 1 else ''} you authored in "
            f"{repos} repo{'s' if repos != 1 else ''}: " + ", ".join(parts) + "._")


def render_board(prs: list[Pr], now: datetime) -> str:
    if not prs:
        return "_No open pull requests authored by you._"
    by_repo: dict[str, list[Pr]] = {}
    for pr in prs:
        by_repo.setdefault(pr.repo, []).append(pr)
    order = sorted(by_repo, key=lambda repo: max(pr.updated_at for pr in by_repo[repo]), reverse=True)
    blocks = [render_repo(repo, build_rows(by_repo[repo]), now) for repo in order]
    return "\n\n".join(blocks) + "\n\n" + footer(prs, len(by_repo))


def render_json(prs: list[Pr], now: datetime) -> str:
    payload = []
    for repo_prs in _grouped(prs).values():
        for row in build_rows(repo_prs):
            if not row.pr:
                continue
            pr = row.pr
            payload.append({
                "repo": pr.repo, "number": pr.number, "title": pr.title, "url": pr.url,
                "base": pr.base, "head": pr.head, "parent": row.parent_number,
                "depth": row.depth, "ticket": ticket_key(pr), "is_draft": pr.is_draft,
                "decision": pr.decision, "reviews": dict(pr.reviews),
                "requested": list(pr.requested), "checks": pr.checks,
                "checks_stale": pr.merge_state == "DIRTY" and pr.checks is not None,
                "merge_state": pr.merge_state, "created_at": pr.created_at,
                "updated_at": pr.updated_at, "waiting_days": days_since(pr.updated_at, now),
            })
    return json.dumps({"prs": payload, "total": len(payload)}, indent=2)


def _grouped(prs: list[Pr]) -> dict[str, list[Pr]]:
    by_repo: dict[str, list[Pr]] = {}
    for pr in prs:
        by_repo.setdefault(pr.repo, []).append(pr)
    return by_repo


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="my-prs-list", description=__doc__.splitlines()[0])
    parser.add_argument("--repo", metavar="OWNER/NAME", help="Only this repository.")
    parser.add_argument("--org", action="append", default=[], metavar="SLUG",
                        help="Only this organisation (repeatable).")
    parser.add_argument("--json", dest="as_json", action="store_true", help="Emit JSON only.")
    return parser


def run(args, now: datetime) -> str:
    prs = [to_pr(node) for node in fetch_prs(build_search_query(args.repo, args.org))]
    if args.as_json:
        return render_json(prs, now)
    return render_board(prs, now)


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        print(run(args, now=datetime.now(timezone.utc)))
    except GhError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
