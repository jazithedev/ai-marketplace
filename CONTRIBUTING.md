# Contributing

## Adding a New Plugin

1. Create a directory under `plugins/` with your plugin name (lowercase, hyphens):

```
plugins/my-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── my-skill/
│       └── SKILL.md
└── README.md
```

2. Create `.claude-plugin/plugin.json`:

```json
{
  "name": "my-plugin",
  "description": "What the plugin does",
  "author": {
    "name": "Your Name"
  }
}
```

3. Create your skill(s) in `skills/<skill-name>/SKILL.md` with proper frontmatter:

```yaml
---
name: skill-name
description: When Claude should use this skill
allowed-tools: Bash(git diff:*), Read, Grep
---

# Skill instructions here...
```

4. Add the plugin entry to `.claude-plugin/marketplace.json`.

5. Submit a pull request.

## Adding a Mod

A mod changes Claude Code's own interface or behaviour (a pane, a band above the prompt, hooks on tool calls) instead of adding a skill. Its layout differs from a skill plugin:

```
plugins/my-mod/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   ├── hooks.json        # { "modules": ["./register.tsx"] }
│   └── register.tsx
├── types/index.d.ts      # only when the mod keeps $.state values
└── README.md
```

Check it with `claude plugin validate plugins/my-mod` and `claude plugin test plugins/my-mod` before submitting, then add the marketplace entry as above.

## Guidelines

- One plugin per logical domain (e.g., git workflow, testing, deployment)
- Skills must have clear, descriptive `description` fields for proper auto-invocation
- Follow [Conventional Commits](https://www.conventionalcommits.org/) for your contributions
- Test your skill locally before submitting (place it in `~/.claude/skills/` to verify)
- Keep SKILL.md focused and under 500 lines — use supporting files for reference material