---
id: ADR-0037
title: 'Track the climb of seven learning steps on each concept note'
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links: ['ADR-0007', 'ADR-0009', 'ADR-0023', 'ADR-0028']
---

# ADR-0037: Track the climb of seven learning steps on each concept note

## Context

Reading something, or reading an AI summary of it, gives you fluency: the feeling that you understand. Mastery is being able to rebuild it from memory and explain it. The talk "Stop Chatting with Your Docs" shows the way from one to the other as a climb of seven steps, each harder than the last: Read, Group, Generate, Retrieve, Elaborate, Space and Teach. The steps come from _Building a Second Brain_ (Read), _Make It Stick_ (Group to Space) and the Protégé Effect (Teach). The rule behind them is that harder learning lasts longer, so the coach must never do a step for the learner.

ai-coach already covers parts of the climb: Distill and synthesis (ADR-0023, ADR-0028) come before it, `coach spar` is Retrieve, and the review ladder (ADR-0007) is Space. Nothing records which steps a learner has done on an idea, so neither the learner nor the coach can see the gaps. Later ADRs add the missing steps one by one; this one adds the record they share.

## Decision

1. **The climb belongs to a concept note.** The steps, in order, are `read`, `group`, `generate`, `retrieve`, `elaborate`, `space`, `teach`. The domain holds them in `climb.ts`, with `nextStep`, `canStart` and the skipped steps.
2. **A step is never done without evidence.** Each done step is a record of its date and its evidence: a session id, or the vault path that proves it.
3. **Retrieve and Space are rebuilt from the session history**, never read from frontmatter. Retrieve is the first Tier 1 session on the concept, pass or fail. Space is the first Tier 1 session at least 1 day after the previous one. A same-day re-spar is not Space.
4. **The other steps are recorded in the concept note's frontmatter**, as a map from step to date: `climb: { read: 2026-11-09, group: 2026-11-09, … }`, with the note as their evidence. Each later step's command writes its own date through kb-template, with a preview (ADR-0009), after it has written its evidence. The session files stay the source of truth for spar and judge results; when the frontmatter and the sessions disagree, the sessions win.
5. **The order is a recommendation, not a lock**, with two exceptions that are domain rules:
   - **Teach needs Space.** Teach unlocks only after a Tier 1 pass at least 1 day after the previous attempt. A recorded `teach` date without such a pass before it is ignored.
   - **Generate before reveal.** Generate counts only when the attempt was saved before the answer was shown. This is checked by the Generate command, in its own ADR.

   Any other step may run out of order. The climb view names the steps left open below the highest one done, such as "Generate skipped".

6. **`coach climb [note …]`** shows the stairs for the concepts named (by title, path or coach_id), or for every concept note. Done steps are green, a done Teach is yellow, open steps are dim, and the line under each concept names the next step. It is plain text so that it reads on a projector, and it writes nothing.

## Consequences

- A learner sees, per idea, which steps they have done and what comes next. The talk's slide becomes a real command.
- Retrieve and Space work today, from the sessions already in the vault. The other steps show as open until their commands land.
- Writing the `climb` map needs kb-template to set a nested frontmatter value on a concept note. `set_frontmatter` takes only flat values today, so the first command that records a step needs that change in kb-template first.
- kb-template returns YAML dates in the map as either `YYYY-MM-DD` or a full ISO timestamp; the coach reads both and ignores anything else.
