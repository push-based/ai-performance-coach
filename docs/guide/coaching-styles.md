# Coaching styles

The coach can push you in four different ways. Pick the one that fits what you're learning, or let the coach pick.

| Style      | Pushes you to…                                                 | Good for                         |
| ---------- | -------------------------------------------------------------- | -------------------------------- |
| `feynman`  | explain it in plain words, as if to a beginner, with no jargon | technical ideas, how things work |
| `socratic` | defend your claims against counter-examples                    | arguments and beliefs            |
| `cornell`  | state the author's thesis and how they argue for it            | book chapters, essays            |
| `devil`    | name failure modes, trade-offs and when the idea doesn't apply | methods and best practices       |

## Where the style applies

The style is used in the steps of the [climb](the-climb.md) where the coach talks to you about one idea:

| Step               | What the style changes                                          |
| ------------------ | --------------------------------------------------------------- |
| Retrieve and Space | how `coach spar` challenges and probes you, and what passes     |
| (after a spar)     | the bar `coach judge` holds you to, and how `coach study` hints |
| Elaborate          | how `coach elaborate` asks what the idea is like or unlike      |

Read and Group use no style. Generate and Teach always use `feynman`: in Generate it only checks your guess, and Teach is the Feynman technique by design.

## How the style is chosen

The first of these that is set wins:

1. `--style` on the command line, for `spar`, `study` and `elaborate`,
2. a `style:` field in the note's frontmatter,
3. [`sparring.style`](configuration.md#settings) in your configuration,
4. otherwise the coach picks one by reading the note.

To fix a style for one note, add it to the note's frontmatter:

```yaml
---
style: devil
---
```

The judge holds each answer to the bar of the style it was sparred in, so a plain-words Feynman answer isn't failed for skipping the author's argument.
