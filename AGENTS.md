<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Architecture decisions

Every important or major change ships with an ADR in `docs/adr/`, in the same commit; ADR-0001 lists what counts. Read `docs/adr/README.md` before changing anything, copy `docs/adr/template.md` for a new decision, and never rewrite an accepted ADR: supersede it with a new one. Source code carries no comments (ADR-0011).

# Commits

Commit messages follow Conventional Commits (ADR-0033): `type(scope): subject`, with type one of `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `style` or `revert`, an optional scope naming the Nx project (`domain`, `cli`, `docs`, …), and a lower-case imperative subject without a full stop. A breaking change adds `!` after the type and a `BREAKING CHANGE:` footer. CI checks every commit in a pull request with commitlint; run `npx commitlint --from origin/main` to check locally.

# Documentation

Each kind of doc has one home (ADR-0034): `README.md` is the one-screen front door, `docs/guide/` is how to use ai-coach (commands, configuration, privacy, troubleshooting, glossary), `CONTRIBUTING.md` is how to work on it, `ARCHITECTURE.md` and package READMEs are how it is built, `docs/adr/` is why. Change a command or setting in its guide page, not the README. Write for a newcomer: say who the page is for, use "you" and short sentences, and link terms to `docs/guide/glossary.md`. Run `npx nx build docs` after editing docs; it fails on broken links.
