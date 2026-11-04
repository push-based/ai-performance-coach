# Troubleshooting

Find the message you see, then try the fix next to it. Messages are shortened; `…` stands for the part that changes.

## Setup and connections

| You see                                                         | Try                                                                                                                                                         |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `No Gemma model configured`                                     | Set `ollama.model` to a name from `ollama list`.                                                                                                            |
| `Ollama is not reachable`                                       | Start Ollama (`ollama serve` or the app).                                                                                                                   |
| `Tier 1 runs offline: the Ollama host must be http on loopback` | ai-coach only talks to Ollama on your own machine. Point `ollama.host` at `127.0.0.1` or `localhost`.                                                       |
| `Could not start the vault server`                              | Check `docsMcpBin` points at kb-template's `docs-mcp.js`, and that kb-template is built (`pnpm run build`). The error includes the end of the server's log. |
| `unexpected response from the vault server`                     | Your kb-template build and ai-coach disagree on a tool's reply. Pull and rebuild kb-template.                                                               |
| `config.json: …` with a setting name                            | The file has a typo or an unknown key. The message names it.                                                                                                |

## Sparring and synthesizing

| You see                                                           | Try                                                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `This note needs about N tokens, but Gemma's context window is …` | Raise `ollama.contextWindow`, or spar a shorter note.                               |
| `only notes under 3.Resources can be sparred`                     | File the note into Resources first: `coach file <note> 3.Resources/<topic>`.        |
| `… is raw material: spar a concept note that quotes it instead`   | Book chapters are source material. Run `coach synthesize` to make a concept note.   |
| `Nothing marked in … yet`                                         | Bold or highlight some passages, or write a chapter summary, then synthesize again. |
| `A concept note needs at least one core assertion`                | Keep at least one of the drafted assertions, or type your own.                      |

## The judge

| You see                 | Try                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------- |
| A quota or server error | Try again later, or set `judge.fallbackModel`. Your sessions stay queued until judged. |
| An unknown model        | Set `judge.model` and `judge.fallbackModel` to models your key has.                    |

## Still stuck?

Small local models make mistakes. Every reply is checked and retried once, and [`ollama.checkModel`](configuration.md#settings) makes the end-of-round verdict fairer, but a sparring verdict is a first opinion. If it looks wrong, run `coach judge` for a second one.
