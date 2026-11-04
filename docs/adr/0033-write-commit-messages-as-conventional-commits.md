---
id: ADR-0033
title: 'Write commit messages as Conventional Commits, checked in pull requests'
status: proposed
date: 2026-11-04
supersedes: []
superseded_by: []
links: ['ADR-0001', 'ADR-0032']
---

# ADR-0033: Write commit messages as Conventional Commits, checked in pull requests

## Context

The history mixes styles: most commits are plain sentences ("Plan the vault with agent skills through the vault tools"), a few use a type prefix ("feat: add checkModel configuration …"). Nothing says which is right, so neither humans nor agents can rely on it. A typed history can be read at a glance (what was a fix, what only touched docs or CI) and is what release tooling such as `nx release` reads to write changelogs and pick versions.

## Decision

1. **Every commit message is a [Conventional Commit](https://www.conventionalcommits.org):** `type(scope): subject`, an optional body, optional footers.
2. **Types:** `feat` (a new ability for the user), `fix` (a bug fix), `docs`, `refactor`, `perf`, `test`, `build` (dependencies, Nx, packaging), `ci`, `chore`, `style` and `revert`.
3. **The scope is optional** and names the Nx project the change is about (`domain`, `application`, `adapter-ollama`, `cli`, `docs`, …). A change across projects leaves it out.
4. **The subject is imperative, starts lower-case, has no full stop**, and the header stays within 100 characters. The body says why, in prose.
5. **A breaking change** adds `!` after the type or scope and a `BREAKING CHANGE:` footer saying what the user must do.
6. **CI enforces it:** on every pull request, `commitlint` (with `@commitlint/config-conventional` and the type list above, in `commitlint.config.mjs`) checks each commit between the base and the head, and fails the run on a bad message. There is no local hook; `npx commitlint --from origin/main` checks a branch before it is pushed.
7. Commits already on `main` are not rewritten.

## Consequences

- The type of each change is visible in `git log --oneline`, and `nx release` can derive changelogs and versions later without a new convention.
- A pull request with a badly worded commit fails until the commit is reworded, which means rewriting the branch's history and force-pushing it.
- Agents working in the repository read the rule from `CLAUDE.md` and `AGENTS.md`.
- `@commitlint/cli` and `@commitlint/config-conventional` join the root dev dependencies.
