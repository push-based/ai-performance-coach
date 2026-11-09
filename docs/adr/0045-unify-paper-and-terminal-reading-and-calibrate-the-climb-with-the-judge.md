---
id: ADR-0045
title: 'Unify paper and terminal reading in synthesis, and guard the climb with the judge'
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links:
  [
    'ADR-0002',
    'ADR-0006',
    'ADR-0023',
    'ADR-0028',
    'ADR-0037',
    'ADR-0043',
    'ADR-0044',
  ]
---

# ADR-0045: Unify paper and terminal reading in synthesis, and guard the climb with the judge

## Context

The learner reads a book in one of two ways. On paper: they add the chapter, write a first summary and reading notes, then bold and highlight in Obsidian (ADR-0028). In the terminal: `coach read` (ADR-0043) shows the chapter page by page and writes the learner's notes, kept quotes included, to a reading note through kb-template's `add_reading_notes`. Both should give `coach synthesize` (ADR-0023) the same material.

They did not. `Synthesizing.gather` read each of a book's notes as one 800-character block with no page, and `quotesFrom` took quotes only from bolds and highlights. A chapter read in the terminal, with no marks in the chapter file, gave synthesis no quotes, and the vault refuses a concept note without one. `add_reading_notes` writes each note as `- <date> · <text> — [[<chapter>#Page N|p. N]]`, and a kept quote as `“<text>” (quote)`; a kept quote shares six words in a row with the page, so it is not always the page word for word.

Book lookup also differed: `coach synthesize` matched a title, folder or index in any case and named the known books, while `coach read` and `coach group` matched the folder or index only exactly.

In the climb (ADR-0037), `coach spar` and `coach judge` (ADR-0002, ADR-0006) carry Retrieve and Space. `coach climb` did not say when a round waited for the judge, and `coach teach` (ADR-0044) opened on the vault's `climb.teach.ok` even when the judge had since failed the learner's latest round.

## Decision

1. **Paper and terminal reading meet at `coach synthesize`.** A book's reading notes are read line by line: `## Page N` headings set the page, each bullet is one note, and summaries, highlights and bolds are marks. The date prefix and the trailing chapter link that `add_reading_notes` writes are not part of the note; the link names the chapter to look in first.
2. **A quote in a reading note is a highlight of the chapter that holds it.** A kept quote (`“…”` or `"…"`), and a highlight or bold in a reading note long enough to be a quote, is looked up in the book's chapters, ignoring case, punctuation, line breaks and hyphenation. Found, it becomes a highlight or bold of that chapter on the page where it stands, so the vault checks it against the chapter. Not found, it stays a note in the learner's words, and synthesis falls back to searching the book for it.
3. **Book lookup is the same everywhere.** `findBook` matches a title, folder or index in any case, ignores trailing slashes, and names the known books when nothing matches. `coach read`, `coach group` and `coach synthesize` all use it.
4. **`coach climb` shows the judge's queue.** A concept with a session in `pending-judgement.json` is marked as waiting for `coach judge`.
5. **A failed judgement closes Teach.** When the latest session on a concept is a Tier 2 fail, `coach teach` refuses to open and `coach climb` gives that reason, even when the vault's climb says Teach is open. Passing a new round opens it again.
6. **Each step points to the next.** `coach read` points to marking in Obsidian and to `coach synthesize`; `coach synthesize` to `coach group` and `coach spar`; `coach group` to `coach climb`.

## Consequences

- A chapter read with `coach read` and no marks in Obsidian gives synthesis quotes, checked against the chapter like any highlight.
- Synthesis reads every chapter of a book at most once, and only when a reading note holds a quote it must place.
- A kept quote that paraphrases the page does not become a quote; it stays the learner's note.
- A Tier 1 pass that the judge later fails no longer opens Teach. The vault's `climb.teach` still says open in that case; the coach overrules it until kb-template computes it from the judge.
- `Climbing` now depends on `PendingJudgements`, and reads a concept's sessions when the vault says Teach is open.
