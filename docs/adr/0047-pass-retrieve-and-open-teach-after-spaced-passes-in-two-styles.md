---
id: ADR-0047
title: 'Count Retrieve only on a pass, and open Teach after spaced passes in two coaching styles'
status: proposed
date: 2026-11-11
supersedes: []
superseded_by: []
links: ['ADR-0003', 'ADR-0019', 'ADR-0025', 'ADR-0037', 'ADR-0044', 'ADR-0045']
---

# ADR-0047: Count Retrieve only on a pass, and open Teach after spaced passes in two coaching styles

## Context

The climb (ADR-0037) counts Retrieve on any spar of a concept, passed or failed, and opens Teach (ADR-0044) after one passed spaced review: a Tier 1 spar passed at least a day after the attempt before it. Both rules are worked out by kb-template's `climb` tool from the session files.

Two things make those bars too low. A failed first spar ticks Retrieve, so the stairs show an idea as retrieved that the learner could not explain. And one spaced pass is one pass in one coaching style (ADR-0019): the learner can recall the idea when it is asked one way. A Feynman pass shows they can explain how it works; it says nothing about where it stops holding, which is what a Socratic round asks. Teaching needs both.

Sessions do not record their style. The style of a Tier 1 round is kept only in the coach's local judge queue (ADR-0025), and is gone once the round is judged, so the vault cannot tell which styles a concept was passed in.

## Decision

1. **Retrieve counts only on a passed Tier 1 spar.** A failed spar is still recorded and still schedules a review; Retrieve stays open until a spar on the concept passes. The judge's verdict is not needed for the step, as for every other Tier 1 step.
2. **Every spar session records its style.** Each item of a Tier 1 spar session carries the style it was sparred in, and each item of a Tier 2 session the style the judge held it to. ai-coach sends `style` on every `record_session` item; kb-template stores it and returns it on `read_note`'s `history.entries`. Sessions recorded before this carry no style.
3. **Teach opens after spaced passes in two different styles.** The `climb` tool returns `spacedStyles`: the distinct styles of the concept's passed spaced reviews, a review without a recorded style counting for none. Teach is open when it holds at least two (`TEACH_STYLES` in the domain). Space itself still counts on any spaced spar, passed or failed.
4. **`coach spar` picks the second style.** With no `--style`, the coach resolves the note's own style as before (ADR-0019). When the concept's `spacedStyles` holds that style and fewer than two styles, it spars in a second style instead: `socratic`, or `feynman` when the note's own style is `socratic`. `--style` always wins.
5. **The coach enforces the two-style gate until the vault does.** As with the judge's failed round (ADR-0045), `coach climb` and `coach teach` keep Teach closed when `spacedStyles` holds fewer than two styles, even when the vault's climb says open, and name the styles passed so far. Retrieve is computed only by the vault, as ADR-0037 decided.

## Consequences

- Teach asks for at least two passed spaced spars on different days, so an idea takes at least three days from its first spar to Teach.
- Spaced passes recorded before this change count for no style. A learner who had Teach open spars the concept again, twice, before teaching it.
- Until kb-template ships `spacedStyles` and the stored style, `spacedStyles` reads as empty: Teach stays closed for every concept, and `coach spar` never switches style. Until it ships the Retrieve rule, `coach climb` still ticks Retrieve on a failed spar.
- The climb summaries in concept notes change once the vault counts Retrieve on a pass; `coach climb --rebuild` rewrites them after a preview.
- `Sparring.open` reads the concept's climb to pick its style, one more vault call per concept round.
- The second style is fixed, not chosen per note. `socratic` tests any claim against a counter-example, so it fits every kind of note; a learner who wants `devil` or `cornell` passes `--style`.
