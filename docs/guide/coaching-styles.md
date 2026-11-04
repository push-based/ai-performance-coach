# Coaching styles

The coach can push you in four different ways. Pick the one that fits what you're learning, or let the coach pick.

| Style      | Pushes you to…                                                 | Good for                         |
| ---------- | -------------------------------------------------------------- | -------------------------------- |
| `feynman`  | explain it in plain words, as if to a beginner, with no jargon | technical ideas, how things work |
| `socratic` | defend your claims against counter-examples                    | arguments and beliefs            |
| `cornell`  | state the author's thesis and how they argue for it            | book chapters, essays            |
| `devil`    | name failure modes, trade-offs and when the idea doesn't apply | methods and best practices       |

## How the style is chosen

The first of these that is set wins:

1. `--style` on the command line,
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
