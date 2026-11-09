---
id: ADR-0040
title: 'Guess before you look with coach generate, and correct every wrong guess'
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links: ['ADR-0014', 'ADR-0027', 'ADR-0037', 'ADR-0038']
---

# ADR-0040: Guess before you look with coach generate, and correct every wrong guess

## Context

Generate is the third step of the climb (ADR-0037). _Make It Stick_ calls generation "an attempt to answer a question or solve a problem before being shown the answer" (p. 208), and asks learners to explain the key ideas they expect before reading, then read to see if they were right (p. 209). A wrong guess helps only with correction: "When learners commit errors and are given corrective feedback, the errors are not learned" (p. 90).

kb-template's ADR-KI-0068 records a `generate` session: the prompt, the attempt, when the attempt was saved and when the answer was shown, and a mark for each core assertion. It refuses an attempt under 10 words unless it is `/idk`, an unmarked assertion and a `wrong` mark without a correction. It counts the step only when the attempt came before the reveal. Nothing in the coach let a learner make such an attempt.

## Decision

1. **`coach generate <note>` works on a concept note or on a raw book chapter.** For a concept it shows only the title. For a chapter it shows the book, chapter, section and pages, before the chapter is read.
2. **The attempt comes first, in code.** The learner writes at least 10 words, or `/idk`. The attempt is timestamped when it is accepted. The use case refuses to reveal anything before an attempt, and refuses an attempt after the reveal. The note's body and core assertions are not shown or sent to a model before the reveal (ADR-0014).
3. **Then the reveal.** For a concept, the core assertions. For a chapter, the learner reads it in Obsidian, then names its main points in their own words.
4. **Corrective feedback is required.** The learner marks every assertion or point `got it`, `wrong` or `missed`. Each `wrong` needs a one-line correction that does not copy the assertion (the verbatim check of `verbatimRunWords`). Then the check of ADR-0027 looks for each `got it` in the attempt. A `got it` the attempt does not contain is flagged, and the learner keeps it or changes it to `missed`. After `/idk`, every `got it` is flagged without asking a model.
5. **Not graded.** No pass or fail. A concept that has no review date and no sessions gets its first review after `ladder.firstReviewDays` (ADR-0038). Any other attempt schedules nothing.
6. The session is previewed and recorded through `record_session` with `kind: generate`, and the vault sets `climb.generate`.
7. Guessing a book's structure note, which the vault also accepts, is left for later.

## Consequences

- The learner can climb Generate on a concept, or on every concept of a chapter by guessing the chapter before reading it.
- Being wrong is expected, and is corrected in the learner's own words before anything is recorded.
- Session recording now has a second shape beside sparring: a `SessionLog.practise` port that later steps (Elaborate, Teach) use too, and a `Clock.now()` for the timestamps.
