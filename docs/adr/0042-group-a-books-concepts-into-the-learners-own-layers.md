---
id: ADR-0042
title: "Group a book's concepts into the learner's own layers, with embedded questions"
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links: ['ADR-0023', 'ADR-0028', 'ADR-0037']
---

# ADR-0042: Group a book's concepts into the learner's own layers, with embedded questions

## Context

Group is the second step of the climb (ADR-0037). _Make It Stick_ calls it structure building: extracting the salient ideas from new material into a coherent mental framework. "High structure-builders learn new material better than low structure-builders" (p. 153), and when questions are embedded in the material, low structure-builders do as well as high ones (p. 155). So the coach's job is to ask the questions that build the frame, never to hand over the frame.

Synthesis (ADR-0023, ADR-0028) makes one concept note per idea, but nothing grouped them or said what builds on what. kb-template's ADR-KI-0068 writes a book's structure note at `3.Resources/Concepts/Structures/<book>.md` with `write_structure`. It refuses fewer than 2 or more than 7 groups, an empty group, a concept in no group or in two, an edge to a missing group, a group building on itself, and a cycle. It warns when a group is named after a heading of the book, sets `group:` on each concept note, and sets `climb.group`.

## Decision

1. **`coach group [book]` lists the book's concept notes by title only**: those that quote or link the book, as `reading_progress` reports them. Without a book, the learner picks one that has two or more concepts.
2. **The learner builds the structure.** They type the groups as `name: concept, concept`, naming each group in their own words; concepts are given by title or by their number in the list. Then they say what builds on what, as `components → primitives`, `->` or `builds on`.
3. **The structure rules are checked in code before anything else**, the same rules the vault checks: 2 to 7 groups, no empty group, every concept in exactly one group, edges only between existing groups, no group building on itself, and no cycle, which is shown.
4. **Then up to 3 embedded questions about the learner's own structure**, from Gemma through a new `StructurePartner` port. The model sees the concept titles, the groups and the edges, never a note. Each question is checked in code, and dropped when it proposes a group, layer or name, quotes a name the learner did not use, or names an edge the learner did not make. The learner answers each question for themselves and may then enter the structure again. When the model cannot be reached, there are no questions.
5. The structure note is previewed with the vault's warnings, then written with the preview's versions.

## Consequences

- A book's concepts get a frame in the learner's own words, which Obsidian shows as a structure note and the due queue uses to mix topics (ADR-0038).
- The model can only ask; the code drops a question that tries to supply a structure.
- A concept created after grouping is left out of the structure until the learner groups the book again, as ADR-KI-0068 notes.
