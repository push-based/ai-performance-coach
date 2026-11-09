---
id: ADR-0039
title: 'Open a concept round with free recall, behind an option'
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links: ['ADR-0005', 'ADR-0014', 'ADR-0017', 'ADR-0027', 'ADR-0037']
---

# ADR-0039: Open a concept round with free recall, behind an option

## Context

Retrieve is the fourth step of the climb (ADR-0037): recalling an idea with the material closed. _Make It Stick_ says retrieval "strengthens the memory and interrupts forgetting" (p. 3), that even a failed recall helps when you restudy afterwards (p. 202), and that not supplying the answer yourself feeds the illusion of knowing (p. 210).

`coach spar` already keeps the note out of the dialogue (ADR-0014) and decides a concept round by checking each core assertion on a larger local model (ADR-0027). But it opens with a model-written challenge about one angle of the idea, so the learner answers a cue instead of recalling everything they know. A learner who knows the idea well also has to work through follow-ups on points they had already covered.

## Decision

1. **`coach spar --free-recall` opens a concept round with free recall.** The first question is fixed in code: "Without looking: write down everything you remember about <title>." It names only the title. No model writes it, and it goes through the same quote check as any challenge.
2. **The recall is scored per core assertion**, with the check of ADR-0027, through a new `SparringPartner.coveredAssertions` port. An assertion counts as covered only when the check model says so and its evidence is a sentence the learner actually wrote. Without a check model, Gemma checks.
3. **The follow-ups target only what the recall missed.** The focus and scope of the round become the missed assertions, and the end-of-round check covers them. When the recall covers every assertion, the round passes at once.
4. **"I know this", or a recall shorter than 10 words, gets one neutral probe** (`NEUTRAL_PROBE`) and never a hint. The two answers are then scored together.
5. **Everything else stays**: buzzword rephrases and the verbatim check (ADR-0005), the follow-up limit, the Tier 1 verdict, the Tier 2 judge, and the offer to study after a fail (ADR-0017). The session records the recall question as the challenge, so the judge sees it like any other.
6. Free recall is off by default, and a note without core assertions opens with a normal challenge. It becomes the default for concept notes in a later ADR, once it has been tried.

## Consequences

- A round on an idea the learner knows is short, and the effort goes where the gaps are.
- A recall that misses things still gives a full round, so a failed recall is followed by the restudy the book asks for.
- The opening costs one check per core assertion before the first follow-up, so the first reply is slower, more so with a check model.
- The coach's sparring partner has one more method, and any other implementation of the port must provide it.
