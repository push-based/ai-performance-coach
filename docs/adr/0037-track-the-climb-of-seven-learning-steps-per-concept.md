---
id: ADR-0037
title: 'Track the climb of seven learning steps on each concept note'
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links: ['ADR-0003', 'ADR-0007', 'ADR-0023', 'ADR-0028']
---

# ADR-0037: Track the climb of seven learning steps on each concept note

## Context

Reading something, or reading an AI summary of it, gives you fluency: the feeling that you understand. Mastery is being able to rebuild it from memory and explain it. The talk "Stop Chatting with Your Docs" shows the way from one to the other as a climb of seven steps, each harder than the last: Read, Group, Generate, Retrieve, Elaborate, Space and Teach. The steps come from _Building a Second Brain_ (Read), _Make It Stick_ (Group to Space) and the Protégé Effect (Teach). The rule behind them is that harder learning lasts longer, so the coach must never do a step for the learner.

ai-coach already covers parts of the climb: Distill and synthesis (ADR-0023, ADR-0028) come before it, `coach spar` is Retrieve, and the review ladder (ADR-0007) is Space. Nothing records which steps a learner has done on an idea, so neither the learner nor the coach can see the gaps. Later ADRs add the missing steps one by one; this one adds the record they share.

kb-template's ADR-KI-0068 gives the vault server the climb: it keeps each step's evidence, checks each step's rules when the evidence is written, and reports each concept's climb through its `climb` tool.

## Decision

1. **The climb belongs to a concept note.** The steps, in order, are `read`, `group`, `generate`, `retrieve`, `elaborate`, `space` and `teach`. The domain names them in `climb.ts`.
2. **The vault works out the climb, and the coach shows it.** A step is done only when the vault holds its evidence: a reading-notes file and chapter summary, a structure note, or a session. The coach asks kb-template's `climb` tool for each step's date and evidence, the next step, the steps skipped, and whether Teach is open, and it does not work any of that out again. The rules live in one place, beside the evidence, and the coach reaches them only through the vault server (ADR-0003).
3. **The order is a recommendation, not a lock.** Any step may run before an earlier one, and the climb names the earlier open steps as skipped, such as "Generate skipped". The one lock is the vault's: Teach waits for a passed spaced review, a spar passed at least a day after the attempt before it.
4. **The `climb:` summary in a concept note's frontmatter is the vault's to write**, from the evidence, in the same write as the evidence. The coach never writes it by hand. When the vault reports that a summary disagrees with its evidence, `coach climb` says so, and `coach climb --rebuild` previews the vault's `rebuild_climb` and, after the learner confirms, sets each stale summary to what the evidence gives.
5. **`coach climb [note …]`** shows the stairs for the concepts named (by title, path or coach_id), or for every concept note. Done steps are green, a done Teach is yellow, open steps are dim, and the line under each concept names the next step and, where one exists, the command for it. It is plain text so that it reads on a projector, and it writes nothing.

## Consequences

- A learner sees, per idea, which steps they have done and what comes next. The talk's slide becomes a real command.
- Retrieve and Space show from the sessions already in the vault. The other steps show as open until their commands land.
- `coach climb` needs a kb-template with ADR-KI-0068. An older server has no `climb` tool, and the command fails with the server's message.
- Each later step's command writes its evidence through a vault tool (`add_reading_notes`, `write_structure`, `record_session` with a session kind), with a preview (ADR-0009), and the vault sets the summary.
