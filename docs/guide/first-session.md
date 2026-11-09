# Your first session

This page takes one book through the whole loop: distill, synthesize, spar, judge, study and review, then the rest of the climb. You need a working [setup](setup.md) and a book that kb-template has converted into your vault.

Say you've read _Building a Second Brain_, and kb-template has turned it into chapter notes under `3.Resources/0.Raw/Books/…`.

## 1. Distill: mark what matters

In Obsidian, or in the graph view (`npm run coach -- view`):

1. **Bold** the sentences that matter.
2. ==Highlight== the best of them with `==…==`.
3. Add a summary of each chapter in your own words:

```markdown
> [!summary]
> Notes only pay off if future me can find their point fast, so I distill them in layers.
```

## 2. Synthesize: turn marks into ideas

```sh
npm run coach -- synthesize
```

The coach lists your books, groups your marks into a few ideas and lets you pick one. For each idea:

1. You write a summary in your own words.
2. The coach asks up to two questions about anything your marks say that your summary leaves out, then always asks why the idea matters. `/skip` passes.
3. It drafts the idea's **[core assertions](glossary.md#core-assertion)**, the key points you'll be tested on, from _your_ summary and answers, never from the book. You keep, drop (`d`) or rewrite each one.
4. It suggests **[buzzwords](glossary.md#buzzword)** you won't be allowed to hide behind.
5. It picks **quotes** from your highlights, and the vault server checks they really are in the book.
6. You see a preview. The [concept note](glossary.md#concept-note) is written to `3.Resources/Concepts/` only if you say yes.

## 3. Spar: explain it

```sh
npm run coach -- spar
```

Pick a note. The coach asks you to explain the idea. Type your answer; **an empty line sends it**. The coach may then:

- ask you to **rephrase**, if you used a buzzword or copied the note word for word,
- ask **follow-up questions** about what's missing, up to three,
- give a **verdict**: pass, or fail with the gaps it found.

At the end you see a preview of the session and confirm to record it. If you failed, the coach offers to study the gaps right away.

Sparring runs on your machine and needs no internet. How hard the coach pushes depends on the [coaching style](coaching-styles.md).

## 4. Judge: get a second opinion

When you're online:

```sh
npm run coach -- judge
```

The judge checks every recorded session that is still waiting. It passes an answer only if no claim is wrong or hand-waved and nothing the question asked is missing. It never sees your notes; [Privacy](privacy.md) lists exactly what it gets.

## 5. Study what you missed

```sh
npm run coach -- study <note>
```

You work through the gaps from the note's latest failed session. Type `/hint` or "teach me" for a clue and the author's own words; asking for help never costs you a try.

## 6. Come back when it's due

```sh
npm run coach -- due
```

Every result moves the next review:

| Result                    | Next review                                                   |
| ------------------------- | ------------------------------------------------------------- |
| Failed                    | tomorrow                                                      |
| Passed for the first time | tomorrow                                                      |
| Passed sparring (Tier 1)  | in 3 days                                                     |
| Passed the judge (Tier 2) | 7 days, then 14, 30, 60, 120, 240 and 365 as you keep passing |

A new concept note is due the day after you made it, marked "first review" in `coach due`. When several ideas are due, the coach mixes their topics, so two ideas from the same group or book don't come one after the other. You can change every number in [`ladder`](configuration.md#settings).

## 7. Climb the rest of the way

Sparring and coming back after a gap are two of the seven steps of the [climb](glossary.md#climb). The others each have a command, and `coach climb` shows where each idea stands:

```sh
npm run coach -- read "Building a Second Brain"     # read a chapter and note what resonates
npm run coach -- group "Building a Second Brain"    # sort its concepts into your own layers
npm run coach -- generate "Progressive Summarization"  # guess before you look
npm run coach -- elaborate "Progressive Summarization" # why, what it's like, where you'd use it
npm run coach -- teach "Progressive Summarization"     # teach it, after a passed review on a later day
npm run coach -- climb
```

## Why it's strict

The rules that decide a verdict live in code, not in prompts. A model saying "pass" is overruled when flaws remain, and an answer that copies six words in a row from the note counts as reciting, not explaining.

## Next

- [Commands](commands.md) lists everything else the coach can do.
- [Configuration](configuration.md) tunes the rules to how you learn.
