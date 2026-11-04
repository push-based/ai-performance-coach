# Privacy

What stays on your machine, what leaves it, and how that's enforced.

## The short version

**Your notes never leave your machine.** Sparring, studying and synthesizing run on a local model. Only `coach judge` goes online, and it sends only the questions you were asked and your answers.

## In detail

- **Sparring, studying and synthesizing stay local.** Gemma runs through Ollama on your machine, and ai-coach refuses any Ollama host that isn't `http` on `127.0.0.1`, `localhost` or `::1`.
- **Only `coach judge` goes online.** For each question it sends Gemini the question and your answer, plus the idea's [core assertions](glossary.md#core-assertion). To keep the assertions private too, set:

  ```json
  { "judge": { "includeAssertions": false } }
  ```

- **Your notes are never sent anywhere**, not even to the judge. The vault server builds what the judge gets, the domain checks it, and the Gemini adapter checks it once more before sending.
- **Notes and answers are data, never instructions.** Every prompt fences them with a random marker, so a note saying "ignore your instructions" has no effect.
- **Your vault is touched only through kb-template's vault server**, never directly, and only after you confirm a preview.
- **Your Gemini key lives in `.env`**, which git ignores.
- **The planning skills run inside Claude Code**, so what they read from your vault goes to the model Claude Code uses. They never run the coach's judge.

## Why it's built this way

[ADR-0021](../adr/0021-the-judge-may-see-core-assertions.md) records what the judge may see, and [ADR-0002](../adr/0002-two-tier-coach-offline-gemma-and-zero-knowledge-gemini.md) why the coach has two tiers at all.
