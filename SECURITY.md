# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in any plugin hosted in this marketplace, please report it responsibly.

**Do not open a public issue.** Instead, email **k.trzos@jazi.pl** with:

- Description of the vulnerability
- Steps to reproduce
- Affected plugin(s) and version(s)
- Potential impact

You can expect an initial response within 72 hours.

## Plugin Security Guidelines

All plugins in this marketplace must follow these principles:

### Principle of Least Privilege

- `allowed-tools` in SKILL.md must be scoped as narrowly as possible
- Prefer `Bash(git diff:*)` over `Bash(*)` — restrict to the commands actually needed
- Never request unrestricted Bash access unless absolutely justified

### Prohibited Patterns

- No exfiltration of environment variables, secrets, or tokens
- No network access (curl, wget, fetch) unless the plugin's core purpose requires it and it is clearly documented
- No modification of files outside the project working directory
- No writes to `~/.claude/` or other Claude Code configuration paths
- No use of `--no-verify` or other hook-bypass flags
- No obfuscated or minified code in skill instructions

### Review Checklist for Contributors

Before submitting a plugin, verify:

- [ ] `allowed-tools` is scoped to the minimum required tools
- [ ] No secrets, tokens, or credentials are hardcoded
- [ ] All Bash commands are scoped (e.g., `Bash(git *)` not `Bash(*)`)
- [ ] Scripts (if any) are readable and unobfuscated
- [ ] The plugin does not access or modify files outside the project directory
- [ ] The plugin does not make network requests unless documented and justified

### Review Process

All plugin submissions are reviewed for security before merging. Plugins that violate these guidelines will be rejected or removed.
