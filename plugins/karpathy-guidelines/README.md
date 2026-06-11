# Karpathy Guidelines

Behavioral guidelines that reduce the most common LLM coding mistakes — derived from Andrej Karpathy's observations on where LLMs go wrong when writing code.

## Features

- **Think before coding** — state assumptions, surface tradeoffs, and ask when something is unclear instead of guessing
- **Simplicity first** — the minimum code that solves the problem, nothing speculative
- **Surgical changes** — touch only what the request requires; don't refactor or "improve" adjacent code
- **Goal-driven execution** — turn vague tasks into verifiable success criteria and loop until they pass

## Installation

Users of this marketplace can install via:

```
/plugin install karpathy-guidelines@ai-marketplace
```

Or manually copy `skills/karpathy-guidelines/` to `~/.claude/skills/karpathy-guidelines/`.

## Usage

The skill activates when writing, reviewing, or refactoring code, steering toward
cautious, surgical, verifiable changes. For trivial tasks, use judgment — the
guidelines bias toward caution over speed.

## Source / Attribution

This skill was taken from the multica-ai public skills collection.

- **Packaged by:** multica-ai ([github.com/multica-ai](https://github.com/multica-ai))
- **Source:** https://github.com/multica-ai/andrej-karpathy-skills/blob/main/skills/karpathy-guidelines/SKILL.md
- **Guidelines derived from:** [Andrej Karpathy's observations on LLM coding pitfalls](https://x.com/karpathy/status/2015883857489522876)

See [`skills/karpathy-guidelines/references/source.md`](skills/karpathy-guidelines/references/source.md) for full provenance.
