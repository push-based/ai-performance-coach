# Commands

Every command, option and key the `coach` CLI understands. Run any command as:

```sh
npm run coach -- <command>
```

**Every change to your vault is shown first.** Nothing is written, moved or recorded until you confirm.

## Commands

| Command                | What it does                                                                                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `due`                  | What's due for review today, and what has never been sparred. The default when you type no command.                                                                                                                                                                    |
| `list`                 | Every note in Resources with how well you know it: unsparred, attempted, Tier 1 passed, Tier 2 passed.                                                                                                                                                                 |
| `synthesize [book]`    | Turn your marks and reading notes on a book into concept notes. Without a book, you pick one from a list.                                                                                                                                                              |
| `climb [note …]`       | The seven learning steps you've done on each concept note, and the next one. Name notes by title, path or coach id, or leave them out to see every concept. See [Climb](glossary.md#climb).                                                                            |
| `group [book]`         | Sort a book's concept notes into 2 to 7 groups you name yourself, and say which group builds on which. The coach may ask a few questions about your structure, then writes it as the book's [structure note](glossary.md#structure-note).                              |
| `generate <note>`      | Guess before you look. Explain a concept from its title alone, or what a book chapter will say before you read it. Then see the answer, mark each point got it, wrong or missed, and correct what you got wrong. Not graded. See [Generate](glossary.md#generate).     |
| `elaborate <note>`     | Answer three questions about a concept note in your own words: why it's built that way, what it's like, and where you'd use it. Link other notes as `[[Title]]`. The answers are added to the note under `## My elaborations`. See [Elaborate](glossary.md#elaborate). |
| `spar [note …]`        | Tier 1, offline. Spar the notes that are due, or the notes you name (by path or coach id).                                                                                                                                                                             |
| `judge [session …]`    | Tier 2, online. Judge the sparring sessions waiting for it.                                                                                                                                                                                                            |
| `study <note>`         | Work through the gaps from a note's latest failed session.                                                                                                                                                                                                             |
| `capture <title>`      | Write a quick note into `0.Inbox`. End it with a line holding a single `.`.                                                                                                                                                                                            |
| `file <note> <folder>` | Move a note into a PARA folder, e.g. `file "0.Inbox/Idea.md" 3.Resources/TypeScript`. Without arguments, lists what's waiting to be filed.                                                                                                                             |
| `archive <project>`    | Move a finished project into `4.Archive`. It first asks which concept and sparred notes to keep in Resources.                                                                                                                                                          |
| `init`                 | Set up the five PARA folders in your vault.                                                                                                                                                                                                                            |
| `view`                 | Open the vault graph in your browser at http://127.0.0.1:4747/, where you can also mark chapters. `/plans` shows your plans.                                                                                                                                           |

## Options

| Option               | Meaning                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--style <style>`    | Coach in this style for this run. See [Coaching styles](coaching-styles.md).                                                                                                                            |
| `--free-recall`      | With `spar`: open each concept note by writing down everything you remember about it, with the note closed. The coach then asks only about what you missed. See [Free recall](glossary.md#free-recall). |
| `--config <file>`    | Use a different configuration file.                                                                                                                                                                     |
| `--today YYYY-MM-DD` | Pretend it's another day, e.g. to see what will be due next week.                                                                                                                                       |
| `--help`, `-h`       | Show the command list.                                                                                                                                                                                  |

## While you answer

| Type                  | To                                                                |
| --------------------- | ----------------------------------------------------------------- |
| an empty line         | send your answer (answers can span several lines)                 |
| `/skip`               | skip this note, question or gap                                   |
| `/quit`               | stop; nothing is recorded unless you confirm it                   |
| `/hint` or "teach me" | in study: get a clue and the author's words, without losing a try |

## Exit codes

| Code | Meaning                                      |
| ---- | -------------------------------------------- |
| `0`  | success                                      |
| `1`  | an error the coach explained                 |
| `2`  | a usage error: unknown command or bad option |
