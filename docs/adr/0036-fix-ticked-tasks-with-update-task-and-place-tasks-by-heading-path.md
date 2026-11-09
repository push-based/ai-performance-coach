---
id: ADR-0036
title: 'Fix ticked tasks with update_task, and place tasks by heading path'
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links: ['ADR-0030']
---

# ADR-0036: Fix ticked tasks with update_task, and place tasks by heading path

## Context

The planning skills write the vault only through the life-vault tools (ADR-0030). In the week of 2026-11-02 four gaps turned into hand edits or retries. A ticked task's text could not be fixed, because `update_task` matched open tasks only. A preview's line number was refused when passed back as an address. `add_tasks` could not reach one of several sections with the same heading, and its previews did not show where a line would land. kb-template's ADR-KI-0066 closes these gaps.

## Decision

1. The skills fix a done or cancelled task's text with `update_task` and `include_closed: true`, never with a hand edit or `edit_note`. `edit_note` now refuses any change to a task line.
2. A preview's `line` is an address, in the same numbering as `planning_overview`. `fileLine` is shown to the user and never passed back.
3. The skills show the user a preview's `under` and `above`, so they can see where a line lands.
4. `add_tasks` reaches a section by a heading path such as `Robotics: Machinekind/Marketing`, and sets a created heading's level with `level`.

## Consequences

- Fewer hand edits: renaming a ticked task is a tool call.
- `.claude/skills/vault-planning/tools.md` describes these arguments. The skills need kb-template with ADR-KI-0066; an older server rejects `include_closed` and `level`.
