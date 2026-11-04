---
id: ADR-0032
title: 'Publish the docs with Docusaurus, built from the Markdown where it lives'
status: proposed
date: 2026-11-04
supersedes: []
superseded_by: []
links: ['ADR-0001', 'ADR-0008', 'ADR-0011']
---

# ADR-0032: Publish the docs with Docusaurus, built from the Markdown where it lives

## Context

The documentation is about a dozen Markdown files spread over the repository: `README.md`, `ARCHITECTURE.md`, one README per package, the planning skills guide in `.claude/skills/` with its `vault-planning/conventions.md`, and the ADRs in `docs/adr/`. They read well on GitHub one at a time, but there is no navigation across them, no search, and no stable URL to share for "how to set up the coach" or "why the judge never sees your notes".

Each file must stay readable on GitHub, links between files must work there, and nobody should have to keep a second copy in step. Obsidian callouts (`> [!TIP]`) and ASCII diagrams are part of how the files are written.

## Decision

1. **The site is a Docusaurus app in `apps/docs`**, an Nx project named `docs` (tag `type:docs`) with `build`, `serve`, `serve-static` and `lint` targets. `apps/*` joins the npm workspaces; the app's dependencies live in its own `package.json`.
2. **The Markdown files are the only source.** One docs plugin instance is rooted at the repository and reads the files in place through an `include` list in `apps/docs/src/sources.mjs`. Nothing is copied or synced. Because every page is in one instance, Docusaurus resolves `.md` links between them natively, so a link written for GitHub (`../../README.md#set-it-up`, `docs/adr/0029-….md`) works on the site unchanged.
3. **The source files carry no site metadata.** Slugs, sidebar labels and the ADR status classes are added at build time by `markdown.parseFrontMatter` from `pageFor` in `sources.mjs`. The sidebar is Getting started, Architecture, Packages, Planning with Claude Code, Decisions; packages and ADRs are listed from the file system, so a new one appears without editing the site.
4. **Three remark plugins adapt GitHub Markdown, and change no file:** Obsidian callouts become admonitions; a relative link to a repository file that is not on the site (`LICENSE`, `coach.config.example.json`, `vault-planning/rules.md`) becomes its GitHub URL; each ADR gets a status banner from its frontmatter, with links to the ADRs that supersede it or that it supersedes. The sidebar shows each ADR's status as a badge.
5. **Files are parsed as CommonMark, not MDX** (`markdown.format: 'detect'`), so `<`, `{` and ASCII diagrams render as written. Code blocks never wrap and scroll sideways.
6. **A broken link fails the build:** `onBrokenLinks`, `onBrokenAnchors` and `markdown.hooks.onBrokenMarkdownLinks` (where Docusaurus 3.10 moved `onBrokenMarkdownLinks`) are all `throw`.
7. **Search is local** (`@easyops-cn/docusaurus-search-local`); no external service sees the docs or the queries.
8. **`.github/workflows/docs.yml` builds the site on every pull request and push, and deploys `main` to GitHub Pages** at `https://push-based.github.io/ai-performance-coach/`. Pages must be set to deploy from GitHub Actions in the repository settings.
9. kb-template's documentation stays in its own repository. Versioned docs wait for releases.

## Consequences

- A README edit changes the site on the next build; there is no second copy to forget.
- Renaming or moving a documented file, or adding a new kind of page, means updating `INCLUDE` and `pageFor` in `sources.mjs`.
- A link that works on GitHub but not on the site, or a heading anchor that no longer exists, now fails the build in pull requests.
- Obsidian callout types without a Docusaurus equivalent are mapped to the nearest admonition.
- The workspace carries Docusaurus and React as dependencies of `apps/docs`, which the coach itself never imports.
