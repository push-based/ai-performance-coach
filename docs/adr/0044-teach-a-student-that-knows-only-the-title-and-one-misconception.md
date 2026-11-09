---
id: ADR-0044
title: 'Teach a student that knows only the title and one misconception'
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links: ['ADR-0019', 'ADR-0027', 'ADR-0037', 'ADR-0038']
---

# ADR-0044: Teach a student that knows only the title and one misconception

## Context

Teach is the last step of the climb (ADR-0037). The talk credits the Protégé Effect to _Richard Feynman's Mental Models_ by Peter Hollins; that attribution has not been checked against the book yet, so the coach names the effect and quotes nothing from it. _Make It Stick_ backs the idea: explaining something to somebody else in your own words is elaboration (p. 207), how ably you can explain a text is an excellent cue for judging comprehension (p. 126), and experts skip steps a newcomer needs (pp. 115, 119).

In the `feynman` coaching style (ADR-0019) the coach is still the examiner. In Teach the roles flip: the coach plays a student who does not know the topic, and the learner leads. kb-template's ADR-KI-0068 records a `teach` session with its turns, the core assertion the student's misconception inverts, whether the learner corrected it, and the terms left undefined. It refuses one until the note has a passed spaced review, refuses a pass with the misconception uncorrected or a term undefined, and refuses a student turn that repeats the note's words the learner never said.

## Decision

1. **`coach teach <note>` opens only when the vault says Teach is open**: after a spar passed at least a day after the attempt before it. Otherwise it shows the vault's reason.
2. **The student knows only the title and one misconception.** Gemma drafts the misconception from the core assertions through a new `TeachPartner` port, as a plausible wrong version of one of them, and the coach keeps which assertion it inverts. A draft that repeats the assertion or copies the note is sent back once, then replaced by a fixed misconception; so is a failed or missing model. The learner never sees it in advance.
3. **The student's turns are fixed sentences chosen in code, never model output**, so the student cannot teach and never sees the note. After each turn of the lesson it does one of these, in this order:
   - states its misconception, once, when the lesson touches that assertion: "Oh, so …?";
   - asks what a term means, for a buzzword or the concept's own name used and not yet asked about: "Wait, what do you mean by …?";
   - asks for an example, once, if none has come yet;
   - otherwise listens.

   It asks at most `maxFollowUps + 2` questions, then says it is ready to explain back. When the learner types `/done`, or the questions run out, it first states its misconception if it has not yet.

4. **The explain-back is built in code from the learner's turns**: the first sentence of each, plus the misconception if it was not corrected, plus the terms still undefined. The learner then corrects anything wrong or missing. No model rephrases it.
5. **Correction must be explicit.** A misconception counts as corrected only when a reply to it, or the correction, contains a correction word ("no", "not", "actually", "wrong", …) and talks about the same thing. Silence is not a correction.
6. **The verdict is decided in code**: pass when the misconception was corrected, every core assertion appears in the lesson or the correction (checked per assertion on the check model, ADR-0027), and no term is left undefined. Otherwise fail, listing what was missed.
7. The lesson is recorded through `record_session` with `kind: teach`, with a next review from the Tier 1 ladder. On a pass the learner may save their own turns, without the student's, as a guideline note in a folder under `1.Projects` or `3.Resources` they pick, through `save_guideline`.
8. Judging a teach session on Tier 2 is left for later.

## Consequences

- The climb can be finished in the coach, with TEACH shown in yellow once passed.
- Because the student is scripted, it never invents facts, and every rule about it is checked in tests without a model.
- The student is less lively than a model playing a role, and the correction and "touches the assertion" checks are word-based, so an unusual phrasing can be missed.
