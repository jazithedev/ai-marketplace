# Say less

A tone of voice for Claude. Everything it writes stays short, plain and easy to read for non-native English speakers, and keeps every fact, decision, risk and next step.

## Features

- **Always on**: a session-start hook loads the voice into every session, so replies, investigations, tickets and docs come out short the first time. You never ask for a second, shorter version.
- **One idea, one sentence**: repeated sentences and bullets that make the same point are merged.
- **Plain English**: short active sentences, common words, no idioms or AI-writing filler ("delve", "It's worth noting that").
- **Respects templates**: other skills keep their required sections; only the wording inside gets tighter. Code, commands, quotes and error messages are never changed.

## Installation

```
/plugin install say-less@ai-marketplace
```

Or copy `skills/say-less/` to `~/.claude/skills/say-less/`. Without the plugin hook, the skill only loads when Claude decides it fits the task.

## Usage

Nothing to run. Once installed, the voice applies from the next session.

To switch it:

```
/say-less:say-less off
/say-less:say-less on
```

`off` stops it for the current session and every new one, until you run `on`. The switch is a flag file at `~/.claude/say-less/off`.

## Source / Attribution

Written for this marketplace, informed by Alex Walters' [writing-editing-skill.md](https://github.com/alexwalters75/working_with_claude/blob/main/writing-editing-skill.md) and a company tone-of-voice guide with all company details removed. See [`skills/say-less/references/source.md`](skills/say-less/references/source.md).
