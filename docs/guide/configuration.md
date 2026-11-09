# Configuration

Every setting ai-coach reads, where it looks for them, and what they do. Only the Gemma model is required; everything else has a sensible default.

## Where the file is found

ai-coach uses the first of these that exists:

1. the file given with `--config`,
2. `coach.config.json` in the current folder,
3. `$XDG_CONFIG_HOME/ai-coach/config.json` (by default `~/.config/ai-coach/config.json`).

Relative paths in the file are resolved from the file's folder, and `~` means your home folder. Unknown keys are refused, so a typo doesn't go unnoticed.

## A full example

```json
{
  "vault": "~/Documents/my-vault",
  "docsMcpBin": "~/projects/kb-template/packages/cli/bin/docs-mcp.js",
  "stateDir": "~/.local/state/ai-coach",

  "ollama": {
    "model": "gemma3:latest",
    "checkModel": "gemma3:12b",
    "host": "http://127.0.0.1:11434",
    "contextWindow": 16384
  },

  "judge": {
    "model": "gemini-4-argon",
    "fallbackModel": "gemini-3.8-flash",
    "thinkingLevel": "MEDIUM",
    "includeAssertions": true
  },

  "sparring": {
    "style": "auto",
    "maxFollowUps": 3,
    "maxRephrases": 2,
    "maxChallengeAttempts": 3,
    "verbatimRunWords": 6,
    "buzzwords": ["synergy", "leverage", "best practice"],
    "language": "English"
  },

  "ladder": {
    "firstReviewDays": 1,
    "failDays": 1,
    "tier1PassDays": 3,
    "tier2PassDays": [7, 14, 30, 60, 120, 240, 365]
  }
}
```

## Settings

| Setting                         | Default                                                    | Meaning                                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vault`                         | none                                                       | Your Obsidian vault. Set it: the server needs it.                                                                                                                                                                                       |
| `docsMcpBin`                    | `~/projects/kb-template/packages/cli/bin/docs-mcp.js`      | kb-template's server launcher.                                                                                                                                                                                                          |
| `stateDir`                      | `$XDG_STATE_HOME/ai-coach`, else `~/.local/state/ai-coach` | Where ai-coach keeps its own small state: the list of sessions waiting for the judge.                                                                                                                                                   |
| `ollama.model`                  | **required**                                               | The Gemma model, as listed by `ollama list`.                                                                                                                                                                                            |
| `ollama.checkModel`             | none                                                       | A larger Gemma model, e.g. `gemma3:12b`, that checks your answers against each core assertion of a concept note at the end of a round. Slower, but much fairer. Without it, `model` decides the round.                                  |
| `ollama.host`                   | `http://127.0.0.1:11434`                                   | Must be loopback.                                                                                                                                                                                                                       |
| `ollama.contextWindow`          | `16384`                                                    | How many tokens Gemma reads at once (at least 2048). Raise it if a long chapter is refused.                                                                                                                                             |
| `judge.model`                   | `gemini-4-argon`                                           | The judge model.                                                                                                                                                                                                                        |
| `judge.fallbackModel`           | none                                                       | Tried once when the main judge model is rate-limited or failing.                                                                                                                                                                        |
| `judge.thinkingLevel`           | `MEDIUM`                                                   | `MEDIUM` or `HIGH`: how hard the judge thinks.                                                                                                                                                                                          |
| `judge.includeAssertions`       | `true`                                                     | Whether the judge may see the idea's core assertions. See [Privacy](privacy.md).                                                                                                                                                        |
| `sparring.style`                | `auto`                                                     | `auto`, `feynman`, `socratic`, `cornell` or `devil`. See [Coaching styles](coaching-styles.md).                                                                                                                                         |
| `sparring.maxFollowUps`         | `3`                                                        | How many follow-up questions before the verdict.                                                                                                                                                                                        |
| `sparring.maxRephrases`         | `2`                                                        | How many times you can be asked to rephrase.                                                                                                                                                                                            |
| `sparring.maxChallengeAttempts` | `3`                                                        | How many times the coach may retry an opening question that quotes the note before skipping it.                                                                                                                                         |
| `sparring.verbatimRunWords`     | `6`                                                        | Copying this many words in a row from the note counts as reciting, not explaining.                                                                                                                                                      |
| `sparring.buzzwords`            | a built-in list                                            | Words you're not allowed to hide behind (replaces the built-in list).                                                                                                                                                                   |
| `sparring.socraticRules`        | none                                                       | Extra rules for the coach to follow, one sentence each.                                                                                                                                                                                 |
| `sparring.language`             | the note's language                                        | The language the coach speaks.                                                                                                                                                                                                          |
| `ladder`                        | `1`, `1`, `3`, `[7 … 365]`                                 | The [review schedule](first-session.md#6-come-back-when-its-due), in days: `firstReviewDays` after a first pass, `failDays` after a fail, `tier1PassDays` after a later Tier 1 pass, and `tier2PassDays` as you keep passing the judge. |

The judge's default model names follow what was available when they were set. If your key has other models, set `judge.model` and `judge.fallbackModel`.

## Environment variables

Environment variables override the file. Put them in `.env` in the repository root, or in your shell.

| Variable                      | Overrides                           |
| ----------------------------- | ----------------------------------- |
| `GEMINI_API_KEY`              | (the judge's key)                   |
| `DOCS_MCP_VAULT`              | `vault`                             |
| `DOCS_MCP_BIN`                | `docsMcpBin`                        |
| `OLLAMA_MODEL`                | `ollama.model`                      |
| `OLLAMA_CHECK_MODEL`          | `ollama.checkModel`                 |
| `OLLAMA_HOST`                 | `ollama.host`                       |
| `OLLAMA_NUM_CTX`              | `ollama.contextWindow`              |
| `GEMINI_JUDGE_MODEL`          | `judge.model`                       |
| `GEMINI_JUDGE_FALLBACK_MODEL` | `judge.fallbackModel`               |
| `GEMINI_JUDGE_THINKING_LEVEL` | `judge.thinkingLevel`               |
| `XDG_CONFIG_HOME`             | where the config file is looked for |
| `XDG_STATE_HOME`              | the default `stateDir`              |
