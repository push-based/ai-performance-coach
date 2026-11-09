---
id: ADR-0043
title: 'Read a chapter page by page in the terminal, and write down what resonates'
status: proposed
date: 2026-11-09
supersedes: []
superseded_by: []
links: ['ADR-0023', 'ADR-0028', 'ADR-0037']
---

# ADR-0043: Read a chapter page by page in the terminal, and write down what resonates

## Context

Read is the first step of the climb (ADR-0037). In _Building a Second Brain_, Tiago Forte asks readers to capture what resonates, in their own words, and to capture little: each layer of Progressive Summarization keeps about 10 to 20% of the one before. Reading alone gives fluency; taking notes while reading makes it a step. This is the step people most often hand to AI, so the coach must not summarise or suggest anything here.

Distill (ADR-0028) already lets the learner bold, highlight and summarise a chapter in Obsidian. Nothing guided a reading session. kb-template's ADR-KI-0068 adds `add_reading_notes`, which writes the learner's notes on one page of a chapter, keeps a note that shares six words in a row with the page as a quote, and warns past a fifth of the page's words. Read is done for a chapter once it has one own-words note and the learner's chapter summary, which `write_summary` writes.

## Decision

1. **`coach read [book] [chapter]` shows the chapter in the terminal, one page at a time.** This works on a projector and keeps the reading and the notes in one place; Obsidian is still where marks are made. Without a chapter, it opens the first chapter that is not complete. A chapter is given by its number or title.
2. **After each page, one question: "What resonated? Write it down in your own words."** One note per line; a blank line moves on. Nothing else is asked; why comes later, in Elaborate.
3. **A note is not a quote.** A note that shares `verbatimRunWords` or more words in a row with the page is shown as a quote, and the learner rewrites it or keeps it as a quote. Only own-words notes count for Read.
4. **Few notes.** When the notes on a page pass a fifth of its words, the coach says so, and does not block.
5. **At the end, a chapter summary of 1 to 3 sentences in the learner's own words**, refused when it copies the chapter. A chapter that already has a summary is not asked again.
6. **No model in this step**: no summary, no suggested notes, no key points.
7. The notes and summary are previewed together, then written: the summary first, so that the reading-notes write sees the complete evidence and sets `climb.read` on the concepts quoting the chapter; then each page's notes, each with its own fresh preview versions.

## Consequences

- The Read step happens in the coach, with the learner's own words checked against the page.
- A concept synthesized later from a read chapter starts with Read done, as the vault sets it on creation.
- Writing only a summary, to a chapter whose notes were written earlier, leaves its concepts' `climb:` summaries stale until `rebuild_climb` runs, because `write_summary` does not refresh them.
