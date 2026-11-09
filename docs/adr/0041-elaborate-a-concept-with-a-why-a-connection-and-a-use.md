---
id: ADR-0041
title: 'Elaborate a concept with a why, a connection and a use, checked in code'
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links: ['ADR-0005', 'ADR-0026', 'ADR-0037']
---

# ADR-0041: Elaborate a concept with a why, a connection and a use, checked in code

## Context

Elaborate is the fifth step of the climb (ADR-0037). _Make It Stick_ calls elaboration "the process of finding additional layers of meaning in new material": relating it to what you already know, explaining it in your own words, and relating it to your life (p. 207). It "multiplies the mental cues available to you for later recall" (p. 207).

ADR-0026 already asks why an idea matters, inside a sparring round. Nothing required an answer to reach outside the concept. kb-template's ADR-KI-0068 records an `elaborate` session with one `why`, one `connect` and one `apply` answer, checks each one, and appends them, dated, under `## My elaborations` in the concept note.

## Decision

1. **`coach elaborate <note>` asks three questions about a concept note, one of each kind:** why it is built that way, what it is like or unlike, and where the learner would use it this month.
2. **Gemma words the questions from the note, through a new `ElaborationPartner` port, and never answers them.** A question that shares a run of `verbatimRunWords` words with the note's body, core assertions or quotes gives the answer away. It is sent back once as rejected, then replaced by a fixed question. When the model cannot be reached or replies with nothing usable, the fixed questions are used.
3. **Each answer is checked in code before it is accepted:**
   - a buzzword gets one rephrase, as in sparring (ADR-0005);
   - an answer that copies the note is refused;
   - `why` needs a reason: a causal connective such as "because", "so that" or "otherwise", followed by what follows from it;
   - `connect` needs a link to another note of the vault, or a named thing from the learner's own work. A link to the concept note itself does not count;
   - `apply` needs a concrete place: a named project, file, team or decision, or a link to a note under `1.Projects`.

   Links are written as `[[Title]]` in the answer, or picked by number from the notes the command lists.

4. **One follow-up at most per answer, and only "Why?" or "For example?".** The model chooses between them or none; the words are fixed in code, so it cannot add an answer of its own. When it cannot be reached, there is no follow-up.
5. The three answers are previewed, then recorded through `record_session` with `kind: elaborate`. The vault appends them to the note and sets `climb.elaborate`. Elaborate is not graded and schedules no review.

## Consequences

- Every elaborated concept carries the learner's own reasons, connections and uses, in the note, where Obsidian links them back.
- The rules are literal: a reason without a causal word is asked for again, and a close paraphrase of the note without a six-word run passes.
- The coach has a fifth model port, and a command that still works, with fixed questions, when Gemma is not running.
