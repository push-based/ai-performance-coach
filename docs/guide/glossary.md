# Glossary

The words ai-coach uses, in plain language.

## Buzzword

A word you may not hide behind when you explain an idea, such as "synergy" or "best practice". The coach asks you to rephrase when you use one. You set them per concept note, and globally with [`sparring.buzzwords`](configuration.md#settings).

## Climb

The seven steps from feeling you understand an idea to mastering it: **Read**, **Group**, **Generate**, **Retrieve**, **Elaborate**, **Space** and **Teach**. Each is harder than the last, and in each you do the work, not the model. `coach climb` shows which steps you've done on each [concept note](#concept-note). A step counts only when your vault holds the proof, such as your reading notes or a spar session. Retrieve is a [spar](#spar) session; Space is a spar session at least a day after the one before. Teach opens only after you pass such a spaced review.

## Coaching style

How the coach pushes you: `feynman`, `socratic`, `cornell` or `devil`. See [Coaching styles](coaching-styles.md).

## Concept note

A note holding one idea, in your own words, with its core assertions, buzzwords and quotes from the book. Concept notes live in `3.Resources/Concepts/` and are what you spar. You make them with `coach synthesize`.

## Core assertion

One of the key points of a concept note: what your explanation must cover to pass. They are drafted from your own summary and answers, never from the book, and you approve each one.

## Distill

Marking a chapter in Obsidian: bolding what matters, highlighting the best of it, and summarising the chapter in your own words.

## Free recall

Writing down everything you remember about an idea, with the note closed, before any question. `coach spar --free-recall` starts this way on a [concept note](#concept-note), then asks only about the [core assertions](#core-assertion) you left out. It is the Retrieve step of the [climb](#climb).

## Generate

Trying to answer before you see the answer: explaining a [concept note](#concept-note) from its title, or saying what a chapter will teach before you read it. You then mark each point as got it, wrong or missed, and correct each wrong guess in your own words. `coach generate` runs it. It is the Generate step of the [climb](#climb), and is never graded.

## Judge

The online model (Gemini) that gives a second, stricter verdict on your sparring answers. Also called **Tier 2**. It sees only the questions and your answers, never your notes.

## kb-template

A separate project that owns your vault. Its vault server (`docs-mcp`) is the only program that reads or writes vault files; ai-coach and the planning skills both ask it.

## PARA

The folder layout of your vault: Projects, Areas, Resources, Archive, plus an Inbox. ai-coach numbers them `0.Inbox` to `4.Archive`. See [how your vault is laid out](setup.md#how-your-vault-is-laid-out).

## Raw material

Converted books and other sources under `3.Resources/0.Raw/`. You read, mark and quote them, but never spar them directly.

## Review

Coming back to an idea when it's due. A new idea comes back the next day. Each pass pushes the next review further out; a fail brings it back tomorrow. When several ideas are due, their topics are mixed.

## Session

One recorded sparring round on one note: the questions, your answers and the verdict. Sessions live in your vault under `Coach/sessions/`.

## Spar

Explaining an idea to the local model, which asks follow-ups and gives a verdict. Also called **Tier 1**. It runs offline.

## Study

Working through the gaps of a failed round, with hints and the author's own words.

## Synthesize

Turning your marks on a book into concept notes, one idea each.

## Tier 1, Tier 2

The two models. **Tier 1** is the local sparring partner (Gemma on Ollama), which sees your notes and runs offline. **Tier 2** is the online judge (Gemini), which never sees your notes.

## Vault server

kb-template's `docs-mcp` program. ai-coach starts it for each command and talks to it over the [Model Context Protocol](https://modelcontextprotocol.io).
