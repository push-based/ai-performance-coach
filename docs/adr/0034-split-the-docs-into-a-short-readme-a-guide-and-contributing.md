---
id: ADR-0034
title: 'Split the docs into a short README, a user guide and a contributing guide'
status: proposed
date: 2026-11-04
supersedes: []
superseded_by: []
links: ['ADR-0001', 'ADR-0032']
---

# ADR-0034: Split the docs into a short README, a user guide and a contributing guide

## Context

The README had grown to 560 lines and served three readers at once: someone deciding whether to try ai-coach, someone setting it up or using it, and someone changing the code. Reference material (every command, every setting, every error) sat between the pitch and the quick start, so a newcomer had to scroll past it to learn what the project is, and a user had to scroll past the pitch to look something up. ADR-0032 published the README as the site's Getting started page, so the site inherited the same shape.

## Decision

1. **Each kind of doc has one home:**
   - `README.md` says what ai-coach is, how it works, how to start, and where to read on. It fits on one screen and holds no reference tables.
   - `docs/guide/` is the user guide: `setup`, `first-session`, `commands`, `coaching-styles`, `configuration`, `privacy`, `troubleshooting` and `glossary`.
   - `CONTRIBUTING.md` holds the developer commands, the house rules and where each kind of doc goes.
   - `ARCHITECTURE.md` and the package READMEs say how it is built; `docs/adr/` says why. The README's "how the pieces fit" and package map moved into `ARCHITECTURE.md`.
2. **Content moves, it is not dropped.** Every fact the old README stated is on exactly one of these pages; the others link to it.
3. **Pages are written for a newcomer:** each opens with who it is for and what the reader can do after it, uses "you", short sentences and the active voice, and links a term to the glossary instead of explaining it again. Tables are kept for reference lookups; steps are numbered lists.
4. **The site follows the split** (amending ADR-0032 Decision 3): the sidebar is Getting started (the README), Guide, Architecture, Packages, Planning with Claude Code, Contributing, Decisions. `docs/guide/*.md` and `CONTRIBUTING.md` join the site's sources; everything else in ADR-0032 stands.

## Consequences

- A newcomer reads one screen to know what ai-coach is and how to start; a user finds a command, setting or error by page name or search.
- A change to a command or setting now updates a guide page, not the README. Links to README sections from elsewhere point at the guide pages instead.
- There are more files to keep consistent, and the glossary has to keep up with new terms.
