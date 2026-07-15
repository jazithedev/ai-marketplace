#!/usr/bin/env python3
"""pr-review-list — list PRs awaiting the invoking user's code review.

Pure/deterministic given its arguments. All GitHub access goes through the
single `_gh` subprocess wrapper (the only I/O boundary). No config file: team
slugs arrive as --team/--exclude-team; the repo from --repo or the cwd repo.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone

REAL_STATES = {"APPROVED", "COMMENTED", "CHANGES_REQUESTED", "DISMISSED"}
DEFAULT_STALE_DAYS = 120


class GhError(RuntimeError):
    """A gh CLI call failed or gh is unavailable."""


def _gh(args: list[str]) -> str:
    """Run `gh <args>`; return stdout. Raise GhError on failure. Sole I/O boundary."""
    try:
        proc = subprocess.run(["gh", *args], capture_output=True, text=True)
    except FileNotFoundError as exc:
        raise GhError("gh CLI not found. Install GitHub CLI and run `gh auth login`.") from exc
    if proc.returncode != 0:
        raise GhError(f"`gh {' '.join(args)}` failed: {proc.stderr.strip()}")
    return proc.stdout


def resolve_repo(repo_arg: str | None) -> tuple[str, str]:
    """Return (name_with_owner, org). --repo wins; else the cwd repo."""
    if repo_arg:
        name_with_owner = repo_arg.strip()
    else:
        name_with_owner = _gh(
            ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]
        ).strip()
    if "/" not in name_with_owner:
        raise GhError(
            "Could not resolve a repository. Run inside a GitHub repo or pass --repo OWNER/NAME."
        )
    return name_with_owner, name_with_owner.split("/", 1)[0]


def resolve_me(me_arg: str | None) -> str:
    if me_arg:
        return me_arg
    return _gh(["api", "user", "--jq", ".login"]).strip()


@dataclass(frozen=True)
class Team:
    slug: str
    name: str
    members: frozenset[str] = frozenset()


def fetch_team(org: str, slug: str, with_members: bool) -> Team:
    name = _gh(["api", f"orgs/{org}/teams/{slug}", "--jq", ".name"]).strip()
    members: frozenset[str] = frozenset()
    if with_members:
        out = _gh(["api", f"orgs/{org}/teams/{slug}/members", "--paginate", "--jq", ".[].login"])
        members = frozenset(line for line in out.splitlines() if line.strip())
    return Team(slug=slug, name=name, members=members)


def _search_numbers(query: str) -> set[int]:
    out = _gh(["api", "-X", "GET", "search/issues", "-f", f"q={query}",
               "--paginate", "--jq", ".items[].number"])
    return {int(line) for line in out.splitlines() if line.strip()}


def discover_candidates(repo: str, org: str, include_slugs: list[str],
                        members: frozenset[str], me: str,
                        include_closed: bool) -> set[int]:
    base = f"repo:{repo} is:pr" + ("" if include_closed else " is:open")
    numbers: set[int] = set()
    for slug in include_slugs:
        numbers |= _search_numbers(f"{base} team-review-requested:{org}/{slug}")
    for member in sorted(members | {me}):
        numbers |= _search_numbers(f"{base} review-requested:{member}")
    for member in sorted(members - {me}):
        numbers |= _search_numbers(f"{base} reviewed-by:{member}")
    return numbers


def enrich(repo: str, number: int) -> dict:
    fields = "number,title,author,createdAt,isDraft,state,url,reviewRequests,reviews"
    return json.loads(_gh(["pr", "view", str(number), "--repo", repo, "--json", fields]))


def _last_state_by_login(reviews: list[dict]) -> dict[str, str]:
    last: dict[str, str] = {}
    for review in reviews:
        login = (review.get("author") or {}).get("login")
        state = review.get("state")
        if login and state:
            last[login] = state
    return last


def compute_states(pr: dict, me: str, members: frozenset[str]) -> tuple[str, dict[str, str]]:
    author = (pr.get("author") or {}).get("login")
    last = _last_state_by_login(pr.get("reviews") or [])
    my_state = last.get(me, "NONE")
    teammate_states = {
        login: state
        for login, state in last.items()
        if login in members and login != author and login != me
    }
    return my_state, teammate_states


def _requested_names(pr: dict) -> set[str]:
    names = set()
    for req in pr.get("reviewRequests") or []:
        names.add(req.get("login") or req.get("name"))
    names.discard(None)
    return names


def in_scope(pr: dict, include_teams: list[Team], members: frozenset[str], me: str) -> bool:
    author = (pr.get("author") or {}).get("login")
    reqs = _requested_names(pr)
    _, teammate_states = compute_states(pr, me, members)
    personally_requested = me in reqs
    team_requested = any(team.name in reqs for team in include_teams)
    teammate_reviewed = any(state in REAL_STATES for state in teammate_states.values())
    teammate_requested = any(m in reqs for m in members if m != author and m != me)
    return personally_requested or team_requested or teammate_reviewed or teammate_requested


def exclusion_reason(pr: dict, exclude_teams: list[Team]) -> str:
    reqs = _requested_names(pr)
    if any(team.name in reqs for team in exclude_teams):
        return "out-of-scope team"
    return "no in-scope signal"


@dataclass
class Record:
    number: int
    title: str
    author: str
    created_at: str
    url: str
    state: str
    is_draft: bool
    my_state: str
    teammate_states: dict
    flags: list = field(default_factory=list)


def _age_days(created_at: str, now: datetime) -> int:
    created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    return (now - created).days


def compute_flags(pr: dict, my_state: str, teammate_states: dict,
                  stale_days: int, now: datetime) -> list[str]:
    flags: list[str] = []
    if pr.get("isDraft"):
        flags.append("draft")
    reviews = pr.get("reviews") or []
    if pr.get("state") == "OPEN" and not reviews and _age_days(pr["createdAt"], now) > stale_days:
        flags.append("stale")
    if any(state == "APPROVED" for state in teammate_states.values()):
        flags.append("teammate-approved")
    if my_state == "CHANGES_REQUESTED" or any(
        state == "CHANGES_REQUESTED" for state in teammate_states.values()
    ):
        flags.append("changes-requested")
    return flags


def build_record(pr: dict, me: str, members: frozenset[str],
                 stale_days: int, now: datetime) -> Record:
    my_state, teammate_states = compute_states(pr, me, members)
    return Record(
        number=pr["number"],
        title=pr["title"],
        author=(pr.get("author") or {}).get("login") or "",
        created_at=pr["createdAt"],
        url=pr["url"],
        state=pr["state"],
        is_draft=bool(pr.get("isDraft")),
        my_state=my_state,
        teammate_states=teammate_states,
        flags=compute_flags(pr, my_state, teammate_states, stale_days, now),
    )


def ball_with_author(repo: str, number: int, author: str) -> bool:
    """Check if the latest PR review comment is from the given author.

    Fetches PR comments, sorts by ISO timestamp, and returns True iff the latest
    comment's login matches the author. Returns False if no comments exist.
    """
    out = _gh(["api", f"repos/{repo}/pulls/{number}/comments", "--paginate",
               "--jq", r'.[] | "\(.created_at)\t\(.user.login)"'])
    lines = [line for line in out.splitlines() if line.strip()]
    if not lines:
        return False
    lines.sort()                                   # ISO-8601 sorts chronologically
    latest_login = lines[-1].split("\t", 1)[1]
    return latest_login == author


def select(records: list[Record], mode: str, include_drafts: bool, ball_lookup) -> list[Record]:
    """Filter records by mode, draft status, and (for attention mode) ball position.

    Modes:
    - "not_acted": keep only records with my_state == "NONE"
    - "attention": keep "NONE" records plus records with my_state in {COMMENTED, CHANGES_REQUESTED}
                   where ball_lookup(record) returns True
    - "full": keep all records

    Drafts are dropped unless include_drafts is True.
    ball_lookup is invoked ONLY for attention mode on records you've commented on.
    """
    kept: list[Record] = []
    for rec in records:
        if rec.is_draft and not include_drafts:
            continue
        if mode == "full" or rec.my_state == "NONE":
            kept.append(rec)
            continue
        if mode == "attention" and rec.my_state in ("COMMENTED", "CHANGES_REQUESTED") and ball_lookup(rec):
            kept.append(rec)
    return kept


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="pr-review-list", description=__doc__.splitlines()[0])
    p.add_argument("--team", action="append", required=True, metavar="SLUG",
                   help="In-scope team slug (repeatable).")
    p.add_argument("--exclude-team", action="append", default=[], metavar="SLUG",
                   help="Out-of-scope team slug the user also belongs to (repeatable).")
    p.add_argument("--repo", metavar="OWNER/NAME", help="Target repo (default: cwd repo).")
    p.add_argument("--me", metavar="LOGIN", help="Override auto-detected login (tests).")
    p.add_argument("--attention", action="store_true",
                   help="Also include PRs you commented on where the ball is back with you.")
    p.add_argument("--full-board", action="store_true",
                   help="Show all matched PRs with a status column.")
    p.add_argument("--include-drafts", action="store_true")
    p.add_argument("--include-closed", action="store_true")
    p.add_argument("--stale-days", type=int, default=DEFAULT_STALE_DAYS)
    p.add_argument("--json", dest="as_json", action="store_true", help="Emit JSON only.")
    return p


def _md_cell(value: str) -> str:
    """Escape pipe and newline characters in Markdown table cells."""
    return value.replace("|", "\\|").replace("\n", " ").replace("\r", " ")


def render_table(records: list[Record], full_board: bool, hidden: dict[str, int]) -> str:
    if not records:
        body = "_Nothing to review._"
    else:
        head = ["Date", "PR", "Title", "Author", "Teammate review", "My review"]
        if full_board:
            head.append("Status")
        head.append("Flags")
        lines = ["| " + " | ".join(head) + " |",
                 "|" + "|".join(["---"] * len(head)) + "|"]
        for r in sorted(records, key=lambda x: x.created_at, reverse=True):
            mates = ", ".join(f"{k}:{v}" for k, v in r.teammate_states.items()) or "—"
            row = [r.created_at[:10], f"[#{r.number}]({r.url})", _md_cell(r.title), _md_cell(r.author),
                   mates, r.my_state]
            if full_board:
                row.append(r.state)
            row.append(", ".join(r.flags) or "—")
            lines.append("| " + " | ".join(row) + " |")
        body = "\n".join(lines)
    footnote = _hidden_footnote(hidden)
    return body + ("\n\n" + footnote if footnote else "")


def _hidden_footnote(hidden: dict[str, int]) -> str:
    parts = [f"{count} {label}" for label, count in hidden.items() if count]
    total = sum(hidden.values())
    return f"_{total} hidden: {', '.join(parts)}._" if total else ""


def render_json(records: list[Record], hidden: dict[str, int]) -> str:
    return json.dumps({
        "prs": [
            {"number": r.number, "title": r.title, "author": r.author,
             "created_at": r.created_at, "url": r.url, "state": r.state,
             "my_state": r.my_state, "teammate_states": r.teammate_states,
             "flags": r.flags}
            for r in sorted(records, key=lambda x: x.created_at, reverse=True)
        ],
        "hidden": {k: v for k, v in hidden.items() if v},
    }, indent=2)


def run(args, now: datetime) -> str:
    repo, org = resolve_repo(args.repo)
    me = resolve_me(args.me)
    include_teams = [fetch_team(org, slug, with_members=True) for slug in args.team]
    exclude_teams = [fetch_team(org, slug, with_members=False) for slug in args.exclude_team]
    members: frozenset[str] = frozenset().union(*(t.members for t in include_teams)) \
        if include_teams else frozenset()

    numbers = discover_candidates(repo, org, args.team, members, me, args.include_closed)

    hidden = {"authored by you": 0, "out-of-scope team": 0, "no in-scope signal": 0}
    in_scope_prs: list[dict] = []
    for number in sorted(numbers):
        pr = enrich(repo, number)
        if (pr.get("author") or {}).get("login") == me:
            hidden["authored by you"] += 1  # never review your own PR
            continue
        if in_scope(pr, include_teams, members, me):
            in_scope_prs.append(pr)
        else:
            hidden[exclusion_reason(pr, exclude_teams)] += 1

    records = [build_record(pr, me, members, args.stale_days, now) for pr in in_scope_prs]
    mode = "full" if args.full_board else ("attention" if args.attention else "not_acted")
    kept = select(records, mode, args.include_drafts,
                  ball_lookup=lambda r: ball_with_author(repo, r.number, r.author))

    if args.as_json:
        return render_json(kept, hidden)
    return render_table(kept, args.full_board, hidden)


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
