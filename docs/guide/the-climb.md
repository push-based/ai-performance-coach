# The climb

This page is for you if you've made your first [concept notes](glossary.md#concept-note) and want to know what to do with them next. It explains the seven steps of the [climb](glossary.md#climb), the command for each, and what counts as done. You can read [Your first session](first-session.md) first, but you don't have to.

## Why a climb

Reading a book, or an AI summary of it, makes an idea feel familiar. That feeling is fluency, and it fades in days. Knowing an idea means you can rebuild it from memory, link it to what you already know, and explain it to someone else.

The climb is the way from one to the other, in seven steps:

| Step         | You…                                                 | Command                                  |
| ------------ | ---------------------------------------------------- | ---------------------------------------- |
| 1. Read      | write down what resonated, and sum up a chapter      | `coach read`                             |
| 2. Group     | sort a book's ideas into layers you name             | `coach group`                            |
| 3. Generate  | guess an idea before you look at it                  | `coach generate`                         |
| 4. Retrieve  | explain the idea from memory                         | `coach spar`, then `coach judge`         |
| 5. Elaborate | say why it works, what it's like, where you'd use it | `coach elaborate`                        |
| 6. Space     | explain it again after a gap                         | `coach due`, `coach spar`, `coach judge` |
| 7. Teach     | teach it to a student who gets it wrong              | `coach teach`                            |

Each step is harder than the one before, and that's the point: the harder you work to recall something, the longer it stays. So in every step **you** do the work. The model asks questions, checks your answer, and plays a student. It never summarises the book for you, writes your notes, or tells you the answer before you've tried.

The steps come from three places: _Building a Second Brain_ by Tiago Forte (Read, and the marking that comes before it), _Make It Stick_ by Brown, Roediger and McDaniel (Group to Space), and the [Protégé Effect](glossary.md#protégé-effect) (Teach).

## The big picture

The climb works on concept notes. Before it, you turn a book into concept notes; inside it, you climb each one.

```text
 A BOOK                                         ONE CONCEPT NOTE
 ──────                                         ────────────────
 read it ──┬── on paper, marked in Obsidian ─┐
           └── in the terminal: coach read ──┴─► coach synthesize ──► 3.Resources/Concepts/<Idea>.md
                                                                          │
     1 Read ─► 2 Group ─► 3 Generate ─► 4 Retrieve ─► 5 Elaborate ─► 6 Space ─► 7 Teach
                                          │                           │
                                     spar + judge               due + spar + judge
```

Run `coach climb` at any time to see where each idea stands:

```text
$ npm run coach -- climb

Design tokens            ✓ Read  ✓ Group  ✓ Generate  ✓ Retrieve  · Elaborate  · Space  · Teach
                         next: elaborate · a round waits for the judge: `coach judge`
Primitives               ✓ Read  · Group  · Generate  · Retrieve  ✓ Elaborate  · Space  · Teach
                         next: group · Group skipped, Generate skipped, Retrieve skipped
```

A tick means your vault holds the proof for that step. A dot means it's still open. The line below names the next step, the command for it where there is one, the steps you've skipped, and whether a spar round is still waiting for the [judge](glossary.md#judge).

## Before the climb: from a book to concept notes

### Two ways to read

You can read a chapter in whichever way suits you. Both end in the same place.

**On paper, then Obsidian.** Read the chapter in the book. In the chapter's note in your vault, bold (`**…**`) what matters and highlight (`==…==`) the best of the bold. That's [distilling](glossary.md#distill). Then add a chapter summary of 1 to 3 sentences, and any notes of your own in a note that links the book.

**In the terminal.** Run `coach read "<book>"`. The coach shows the chapter one page at a time. After each page, write down what resonated, one note per line, in your own words. At the end, sum the chapter up in 1 to 3 sentences. A note that copies six words in a row from the page is a quote: you can rewrite it or keep it as a quote. You can still bold and highlight in Obsidian afterwards.

The coach reads both the same way. A quote you kept in `coach read`, or a passage you copied into a paper note in quotation marks, counts as a highlight of the chapter it comes from. The coach looks it up in the chapter, finds its page, and the [vault server](glossary.md#vault-server) checks it's really there before it goes into a concept note. A "quote" that isn't word for word in the book stays one of your notes.

### Synthesize

```sh
npm run coach -- synthesize "<book>"
```

The coach gathers every summary, highlight, bold and note you made on the book, and groups them into a few ideas. For each idea you pick, you write a summary in your own words and answer a few questions. The coach drafts the idea's [core assertions](glossary.md#core-assertion) from **your** words, never from the book, and picks quotes from your marks. You check everything in a preview before the concept note is written. See [Your first session](first-session.md#2-synthesize-turn-marks-into-ideas) for each step.

## The seven steps

The order is a recommendation, not a lock. You can do any step before an earlier one; `coach climb` then lists the earlier ones as skipped. Only Teach waits for something: spaced spars you passed in two different [coaching styles](coaching-styles.md).

A step counts when your vault holds its proof: a reading note, a structure note, or a recorded session. The vault server works that out and keeps a `climb:` summary in each concept note's frontmatter. You never edit it. If it ever disagrees with the proof, `coach climb` says so and `coach climb --rebuild` fixes it, after a preview.

### 1. Read

**What you do:** read the chapter an idea comes from, write down what resonated in your own words, and sum the chapter up.

**Command:** `coach read [book] [chapter]`, or the paper path above. A chapter is given by its number or title. Without one, the coach opens the first chapter you haven't finished.

**Counts when** the chapter has at least one note in your own words and your chapter summary. Quotes alone don't count. Read then counts for every concept note that quotes that chapter, including ones you synthesize later.

**Why:** you can't climb what you haven't taken in. Writing it in your own words, and keeping little (about a fifth of a page at most), makes you decide what matters. No model is used in this step at all.

### 2. Group

**What you do:** sort all of a book's concept notes into 2 to 7 groups that you name, and say which group builds on which, such as `primitives → tokens`.

**Command:** `coach group [book]`.

**Counts when** the concept is in a group of the book's [structure note](glossary.md#structure-note).

**Why:** a list of ideas is hard to remember, a structure is easy. Naming the layers yourself builds the frame each idea hangs on. The coach checks the rules (no empty group, no cycles, every concept in one group) and may ask up to three questions about your structure, but it never proposes groups or names. `coach due` uses your groups to mix topics in a review.

### 3. Generate

**What you do:** explain an idea from its title alone, before you look. Then see the core assertions and mark each one as got it, wrong or missed. Correct each wrong one in your own words.

**Command:** `coach generate <note>`. You can also run it on a book chapter before you read it, to guess what it will say.

**Counts when** a generate session is recorded on the note, with your guess made before the reveal and every wrong point corrected.

**Why:** a guess, even a wrong one, makes the answer stick when you see it. You need at least 10 words, or `/idk` when you truly have no idea. It's not graded. A new idea you generate on comes back for its first review the next day.

### 4. Retrieve

**What you do:** explain the idea from memory to the sparring partner, with the note closed.

**Command:** `coach spar <note>`, then `coach judge` when you're online. Add `--free-recall` to start by writing down everything you remember; the coach then asks only about what you left out. See [Free recall](glossary.md#free-recall).

**Counts when** you pass a spar on the note. A failed spar is still recorded and still schedules a review, but Retrieve stays open until you pass one. The pass from `coach spar` is enough; the judge doesn't have to agree first.

**Why:** pulling an idea out of memory is what makes it stay there. Re-reading doesn't.

Retrieve runs on the two [tiers](glossary.md#tier-1-tier-2):

- **Tier 1, `coach spar`**, runs offline on your machine. The coach asks you to explain the idea, pushes back on [buzzwords](glossary.md#buzzword) and copied words, asks follow-ups, and checks each core assertion. Its verdict is a first opinion, and the session joins the judge's queue.
- **Tier 2, `coach judge`**, runs online. The judge sees only the questions and your answers, never your notes ([Privacy](privacy.md)). It splits your answer into claims and passes it only if nothing is wrong, hand-waved or missing.

If either tier fails you, run `coach study <note>` to work through the gaps with hints and the author's words.

### 5. Elaborate

**What you do:** answer three questions about the idea: **why** it works that way, what it's **like** or unlike, and where you'd **use** it.

**Command:** `coach elaborate <note>`. Add `--style` to word the questions in another [coaching style](coaching-styles.md) for this run.

**Counts when** an elaborate session is recorded. Your answers are added to the note under `## My elaborations`.

**Why:** an idea tied to what you already know is easier to find again. Each answer is checked in code: _why_ needs a reason ("because", "so that", "otherwise"), _like_ needs a link to another note as `[[Title]]` or something named from your own work, and _use_ needs a concrete place, such as a project, a team or a decision. It's not graded.

**The note's style words the _like_ question.** It's the same style spar uses for the note:

| Style      | The _like_ question asks…                                        |
| ---------- | ---------------------------------------------------------------- |
| `feynman`  | what everyday thing it's like, explained without jargon          |
| `socratic` | what it's close to but unlike, and where it stops holding        |
| `cornell`  | who else argues something close, and how they differ             |
| `devil`    | what does the same job, and where this idea breaks or costs more |

**Follow-ups dig into your reasons.** After an answer, the coach may ask one of three fixed questions: "Why?", "For example?", or "What has to be true for that to work?". Your _why_ answer can get two of them, so a reason can be asked for its own reason. The others get one. These are Socratic questions, but nothing here is a test: the coach never argues back or grades you.

### 6. Space

**What you do:** come back to the idea after a gap, and spar it again.

**Command:** `coach due` shows what's due today. Then `coach spar`, and `coach judge` when you're online.

**Counts when** you spar the idea at least a day after your previous attempt on it, passed or failed. A judgement doesn't count: the judge grades an answer you already gave, so it isn't a new recall. To open Teach, you need spaced spars you **passed** in **two different styles**.

**The coach switches the style for you.** Once you've passed a spaced spar in the note's own style, `coach spar` uses a second style for the note until you pass in that one too: `socratic`, or `feynman` when the note's own style is `socratic`. After that it goes back to the note's own style. `--style` always wins, so you can pick the second style yourself, for example `coach spar "Design tokens" --style devil`.

Two styles ask about the same idea from two angles, such as how it works and where it stops holding. Passing both shows you know the idea, not one way of asking about it.

**Why:** recalling something just as you're about to forget it is what makes it last. The coach mixes topics when several ideas are due, so two ideas from the same group or book don't come one after the other.

Every result moves the next review along the ladder:

| Result                     | Next review                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| First spar passed          | tomorrow                                                         |
| Failed                     | tomorrow                                                         |
| Later spar passed (Tier 1) | in 3 days                                                        |
| Judge passed (Tier 2)      | one rung up: 7, 14, 30, 60, 120, 240, then every 365 days        |
| Judge failed               | tomorrow, and one rung down for each gap it found (at least one) |

Only the judge moves you up the long ladder: a spar pass alone never takes an idea beyond 3 days. You can change every number with [`ladder`](configuration.md#settings).

### 7. Teach

**What you do:** teach the idea to a student who knows only its title and believes one wrong thing about it.

**Command:** `coach teach <note>`. Type `/done` when you've taught it.

**Opens when** you've passed spaced spars in two different styles. A spaced spar is one at least a day after the attempt before it. It closes again if the judge failed your latest round on the idea: spar it and pass again first. `coach climb` tells you what's in the way, and which styles you've passed so far.

**Counts when** you pass a lesson. You pass when you corrected the student's wrong belief out loud ("no, actually…"), taught every core assertion, and explained every term you used. At the end the student explains back what it understood, and you fix anything wrong.

**Why:** explaining to someone else shows you every gap you skipped over. The student's lines are fixed sentences, so it can't teach you, and it never sees your note. After a pass you can save what you taught as a guideline note in a project or in Resources. That's where your learning turns into something you use.

## Where to go next

- [Commands](commands.md) lists every command and option.
- [Configuration](configuration.md) changes the review ladder and the sparring rules.
- [Glossary](glossary.md) explains each term.
- [Decisions](../adr/README.md) explain why the climb works this way, from ADR-0037 to ADR-0047.
