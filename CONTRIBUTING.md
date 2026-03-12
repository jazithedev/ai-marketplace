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

## Guidelines

- One plugin per logical domain (e.g., git workflow, testing, deployment)
- Skills must have clear, descriptive `description` fields for proper auto-invocation
- Follow [Conventional Commits](https://www.conventionalcommits.org/) for your contributions
- Test your skill locally before submitting (place it in `~/.claude/skills/` to verify)
- Keep SKILL.md focused and under 500 lines — use supporting files for reference material