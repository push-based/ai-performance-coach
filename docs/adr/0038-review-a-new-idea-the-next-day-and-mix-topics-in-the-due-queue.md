---
id: ADR-0038
title: 'Review a new idea the next day, and mix topics in the due queue'
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links: ['ADR-0007', 'ADR-0037']
---

# ADR-0038: Review a new idea the next day, and mix topics in the due queue

## Context

Space is the sixth step of the climb (ADR-0037). _Make It Stick_ says new material "may need to be revisited within a day or so of your first encounter with it", then after several days or a week, then about once a month (p. 204). It also says to shuffle topics rather than practise one at a time (p. 66), and that anything you want to remember must keep coming back (p. 204).

The review ladder (ADR-0007) already fits most of this: a fail comes back after 1 day, a Tier 1 pass after 3, and Tier 2 passes after 7, 14, 30, 60, 120, 240 and 365 days, and the top rung repeats. Three gaps remained. A first spar that passed came back in 3 days, not the next day. A concept nobody had sparred was only listed as "never sparred", with no date. And the due queue was ordered by date alone, so ideas from one topic came back one after another.

kb-template's ADR-KI-0068 now makes a never-reviewed concept due the day after it was created and marks it as a first review. It also interleaves the due queue by group, or by book when there are no groups, the same way for the same day, and never drops a note from it. The next review date it uses is still the one the coach sends with each session.

## Decision

1. **A first spar comes back the next day.** When a note has no Tier 1 session yet, a Tier 1 pass schedules the next review after `ladder.firstReviewDays`, 1 by default, instead of `tier1PassDays`. A first fail still uses `failDays`. Every later spar uses the ladder as before.
2. **The coach shows the queue the vault orders.** `coach due` and `coach spar` keep the vault's order, which mixes groups and books, and do not sort it again. A concept due for its first review is marked "first review", and each due note shows its group, or its book when it has no group.
3. **No idea retires.** The top rung of the ladder repeats, and the vault never drops a note from the queue.
4. `ladder.firstReviewDays` is a new, optional key in the configuration file, a whole number of days of at least 1.

## Consequences

- A new idea comes back tomorrow, then after 3 days, then on the Tier 2 ladder: the book's tomorrow, next week and next month.
- A just-synthesized concept shows in `coach due` the next day, before it was ever sparred, and its review is the first spar.
- A due queue spread over several topics alternates between them, which makes each review a little harder and the learning more lasting.
- The interleaving and the first review date need a kb-template with ADR-KI-0068. With an older server, the queue comes back in date order and a new concept stays under "never sparred".
