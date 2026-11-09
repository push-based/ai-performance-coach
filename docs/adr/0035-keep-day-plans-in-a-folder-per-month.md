---
id: ADR-0035
title: 'Keep day plans in a folder per month'
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links: ['ADR-0030', 'ADR-0031']
---

# ADR-0035: Keep day plans in a folder per month

## Context

The planning skills address day plans by path, for example to tick a habit check or append to a day's log (ADR-0030, ADR-0031). Until now that path was `Plans/Daily/YYYY-MM-DD.md`, one flat folder that grows by one note a day. The user finds that folder hard to use and asked for day plans grouped by month. kb-template owns the vault layout, and its ADR-KI-0067 moves day plans into a year folder and a month folder named by number and name, such as `Plans/Daily/2026/11-November/2026-11-09.md`, so Obsidian lists the months in order with their names.

## Decision

1. The skills name a day plan as `Plans/Daily/<year>/<month number>-<month name>/YYYY-MM-DD.md`, for example `Plans/Daily/2026/11-November/2026-11-09.md`, wherever they pass a day plan's path to a vault tool.
2. A skill takes a day plan's path from the tool output (`plan_period`, `plan_days`, `planning_overview`) when it has one, because a vault that has not run `init_vault` yet keeps its old days at the flat path.
3. Year, quarter, month and week plans keep their paths.

## Consequences

- A month's day plans sit together in one folder in Obsidian.
- The user runs `init_vault` once to move existing day plans, and sets the Periodic Notes daily format to `YYYY/M-MMMM/YYYY-MM-DD` so that Obsidian creates new days in the same place.
- The skills need kb-template with ADR-KI-0067. An older server writes day plans at the flat path, and the paths in the skills then point at notes that do not exist.
