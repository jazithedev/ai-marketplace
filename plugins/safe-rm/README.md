# Safe rm

A `PreToolUse` hook that stops Claude from running a recursive or forced `rm` on anything outside the project directory. It runs before the permission prompt, so a mistyped path never reaches you as a one-click approval.

## What it blocks

An `rm` with `-r`, `-R`, `-f`, `--recursive` or `--force` is blocked when any target resolves outside the project (or is the project root itself). It checks:

- every command in a chain (`&&`, `;`, `|`), also behind `sudo`, `env` or `xargs`
- `~`, `$HOME` and other variables, `..` and symlinks
- relative paths after a `cd` in the same command

Claude gets exit code `2` and a reason, and is told to ask you instead of retrying.

Allowed: `rm -rf build/cache`, plain `rm file.txt`, `git rm -r`, and any `rm` inside the project.

The project directory is `CLAUDE_PROJECT_DIR`, or the command's working directory when that is not set.

## Limits

It reads the command text only. It does not catch deletes hidden in `bash -c "..."`, scripts, `find -delete` or other languages. Use [sandbox mode](https://code.claude.com/docs/en/sandboxing) to restrict all writes.

Forced deletes in `/tmp` are blocked too, so Claude asks first.

## Installation

```
/plugin install safe-rm@ai-marketplace
```

Requires `python3` on `PATH`.

## Development

```
python3 -m unittest discover -s plugins/safe-rm/hooks -v
```
