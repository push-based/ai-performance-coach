# ai-coach

[![CI](https://github.com/push-based/ai-performance-coach/actions/workflows/ci.yml/badge.svg)](https://github.com/push-based/ai-performance-coach/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-site-2f6f5e)](https://push-based.github.io/ai-performance-coach/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**A study partner that makes you explain what you've read, in your own words, until you really understand it.**

You read a book and mark what matters. ai-coach turns your marks into a few clear ideas, then quizzes you on them like a demanding tutor. It never gives you the answer. It pushes back on vague answers and buzzwords, tells you what you missed, and brings each idea back when you're about to forget it.

It works on your own notes in an [Obsidian](https://obsidian.md) vault, and the sparring runs **entirely on your machine**.

```text
$ npm run coach -- spar

coach> Explain, as if to a newcomer, why a note is distilled in layers rather than all at once.
you> You bold what matters on the first pass, then highlight the best of the bold,
...  so later you can read just the highlights.
...
coach> You said "the best of the bold". What makes one bolded sentence better than
       another when you come back to the note months later?
```

_(An illustration: the questions depend on your note and the model.)_

## How it works

```text
  read ──► distill ──► synthesize ──► spar ──► judge ──► study
                                        ▲                   │
                                        └──── review ◄──────┘
```

1. **Read and distill** a book in Obsidian: bold what matters, highlight the best, summarise each chapter.
2. **Synthesize** your marks into concept notes, one idea each, in your words.
3. **Spar:** explain an idea to a local model ([Gemma](https://ai.google.dev/gemma) on [Ollama](https://ollama.com)). It asks follow-ups and gives a verdict. Offline.
4. **Judge:** an online model (Gemini) checks your answers for gaps. It sees only the questions and your answers, never your notes.
5. **Study** what you missed, then **review** when the idea is due. Ideas you know well come back less often.

The same vault can also hold your plans: [Claude Code skills](.claude/skills/README.md) plan your year down to your day.

## Quick start

You need Node.js 24+, an Obsidian vault, [Ollama](https://ollama.com), and a built checkout of kb-template (see [Status](#status)).

```sh
npm install && npx nx run-many -t build
ollama pull gemma3
cp coach.config.example.json coach.config.json   # set vault, docsMcpBin, ollama.model
npm run coach -- init                            # set up the vault folders
npm run coach -- due                             # see what to study today
```

The [setup guide](docs/guide/setup.md) explains each step, and [your first session](docs/guide/first-session.md) walks you through the whole loop.

## Learn more

| I want to…                     | Read                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------- |
| Install and connect everything | [Setup](docs/guide/setup.md)                                                      |
| Try the loop on a real book    | [Your first session](docs/guide/first-session.md)                                 |
| Look up a command or a setting | [Commands](docs/guide/commands.md) · [Configuration](docs/guide/configuration.md) |
| Pick how the coach pushes me   | [Coaching styles](docs/guide/coaching-styles.md)                                  |
| Know what leaves my machine    | [Privacy](docs/guide/privacy.md)                                                  |
| Fix an error                   | [Troubleshooting](docs/guide/troubleshooting.md)                                  |
| Understand a term              | [Glossary](docs/guide/glossary.md)                                                |
| Plan my week with Claude Code  | [Planning skills](.claude/skills/README.md)                                       |
| See how it's built, and why    | [Architecture](ARCHITECTURE.md) · [Decisions](docs/adr/README.md)                 |
| Change the code                | [Contributing](CONTRIBUTING.md)                                                   |

Everything is also on the [documentation site](https://push-based.github.io/ai-performance-coach/), with search.

## Status

ai-coach is a personal project, used daily and still changing. It needs **kb-template**, which owns the vault and is not public yet, so it can't run without a checkout of it. Small local models make mistakes: treat a sparring verdict as a first opinion, which is what the judge is for.

## License

[MIT](LICENSE) © 2026 push-based. kb-template is a separate project with its own license.
