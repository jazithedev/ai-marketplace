#!/usr/bin/env python3
import json
import os
import shlex
import sys

SEPARATORS = {";", "&&", "||", "|", "&", "(", ")"}
PREFIXES = {"sudo", "doas", "env", "command", "nohup", "time", "nice", "xargs", "exec"}


def tokenize(command):
    lexer = shlex.shlex(command, posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    try:
        return list(lexer)
    except ValueError:
        return command.split()


def is_destructive(args):
    flags = [a for a in args if a.startswith("-")]
    if {"--recursive", "--force"} & set(flags):
        return True
    return any(c in "rRf" for f in flags if not f.startswith("--") for c in f[1:])


def resolve(target, cwd):
    return os.path.realpath(os.path.join(cwd, os.path.expanduser(os.path.expandvars(target))))


def is_inside(path, root):
    return path != root and path.startswith(root.rstrip("/") + "/")


def find_violation(command, cwd, root):
    tokens = tokenize(command)
    i = 0
    while i < len(tokens):
        at_command_start = i == 0 or tokens[i - 1] in SEPARATORS | PREFIXES
        if at_command_start and tokens[i] == "cd" and i + 1 < len(tokens) and tokens[i + 1] not in SEPARATORS:
            cwd = resolve(tokens[i + 1], cwd)
            i += 2
            continue
        if not at_command_start or os.path.basename(tokens[i]) != "rm":
            i += 1
            continue
        j = i + 1
        args = []
        while j < len(tokens) and tokens[j] not in SEPARATORS:
            args.append(tokens[j])
            j += 1
        if is_destructive(args):
            for target in (a for a in args if not a.startswith("-")):
                if not is_inside(resolve(target, cwd), root):
                    return target
        i = j
    return None


def main():
    data = json.load(sys.stdin)
    command = data.get("tool_input", {}).get("command", "")
    cwd = os.path.realpath(data.get("cwd") or os.getcwd())
    root = os.path.realpath(os.environ.get("CLAUDE_PROJECT_DIR") or cwd)
    target = find_violation(command, cwd, root)
    if target is None:
        return 0
    print(
        f"safe-rm blocked a recursive or forced rm outside the project ({root}): {target}. "
        "Do not retry it another way. Tell the user what you wanted to delete and why, and let them run it.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
