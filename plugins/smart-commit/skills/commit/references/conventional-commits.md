# Conventional Commits — General Rules

Based on the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification. For project-specific commit types, scopes, and examples, consult the project's `CONTRIBUTING.md`.

## Message Structure

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

## Type

- **Required.** A noun prefix such as `feat`, `fix`, etc.
- The spec defines only two types: `feat` (new feature → SemVer MINOR) and `fix` (bug fix → SemVer PATCH). All other types (e.g., `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`) are permitted but not mandated by the spec.
- Projects typically define their allowed types in `CONTRIBUTING.md`.

## Scope

- **Optional.** A noun in parentheses after the type describing the section of the codebase affected.
- Example: `fix(parser): handle empty input`

## Description

- **Required.** A short summary immediately following the colon and space after the type/scope prefix.
- Community best practices (not spec-mandated): imperative mood, under 50 characters, no trailing period, start with lowercase.

## Body

- **Optional.** Must begin one blank line after the description.
- Free-form; may consist of any number of newline-separated paragraphs.
- Best practice: explain **what** and **why**, not **how**; wrap at 72 characters.

## Footer(s)

- **Optional.** One or more footers, one blank line after the body.
- Each footer follows git-trailer format: a word token, then either `:<space>` or `<space>#` as separator, then a string value.
- Tokens MUST use `-` in place of whitespace (e.g., `Acked-by`, `Reviewed-by`). Exception: `BREAKING CHANGE` may be used as a token without hyphenation.
- A footer's value may contain spaces and newlines; parsing terminates when the next valid token/separator pair is observed.
- Common project-specific footers: `Refs: #NNN`, `Fixes: #NNN`, `Closes: #NNN`.

## Breaking Changes

A breaking change (SemVer MAJOR) can be indicated by **either or both**:

1. **`!` after the type/scope, before the colon:** `<type>(<scope>)!: <description>`
2. **`BREAKING CHANGE:` footer** — must be uppercase; `BREAKING-CHANGE:` is a valid synonym.

When using only `!`, the description itself should explain the breaking change. When using only the footer, the footer value provides the explanation. Both may be used together.

## Case Sensitivity

All elements are case-insensitive **except** `BREAKING CHANGE` which must be uppercase.
