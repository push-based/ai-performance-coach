# Contributing

How to build, test and change ai-coach. For how it's put together, read [ARCHITECTURE.md](ARCHITECTURE.md) first; for why, the [decision records](docs/adr/README.md).

## Build and test

The workspace is an [Nx](https://nx.dev) monorepo. After `npm install`:

```sh
npx nx run-many -t build          # build everything
npx nx run-many -t test           # run every test
npx nx run-many -t lint typecheck # check style, types and package boundaries
npx nx format:check               # check formatting
npx nx test @ai-coach/domain      # test one package
npx nx graph                      # see how the packages depend on each other
```

Tests don't need Ollama, Gemini or kb-template: each layer is tested with fakes or a local stub server. The vault adapter has no automated tests yet ([ADR-0010](docs/adr/0010-test-each-layer-and-drop-server-dependent-tests-for-now.md)), so try changes to it against a copy of a vault.

CI runs format, lint, test, build and typecheck on every push to `main` and every pull request.

## Documentation

The [documentation site](https://push-based.github.io/ai-performance-coach/) is built from the Markdown in this repository and deploys from `main` ([ADR-0032](docs/adr/0032-publish-the-docs-with-docusaurus-from-the-markdown-where-it-lives.md)). Edit the files where they are; `apps/docs` only arranges them.

```sh
npx nx serve docs                 # preview the site while you edit
npx nx build docs                 # build it and check every link
```

| What you're writing            | Where it goes                                                  |
| ------------------------------ | -------------------------------------------------------------- |
| What ai-coach is, how to start | [`README.md`](README.md): keep it to one screen                |
| How to use it                  | [`docs/guide/`](docs/guide/setup.md)                           |
| How to work on it              | this file                                                      |
| How it's built                 | [`ARCHITECTURE.md`](ARCHITECTURE.md) and each package's README |
| Why it's built that way        | [`docs/adr/`](docs/adr/README.md)                              |
| Planning with Claude Code      | [`.claude/skills/README.md`](.claude/skills/README.md)         |

Write for someone new: say who a page is for and what they'll be able to do, use short sentences and "you", and link a term to the [glossary](docs/guide/glossary.md) instead of explaining it twice ([ADR-0034](docs/adr/0034-split-the-docs-into-a-short-readme-a-guide-and-contributing.md)).

## House rules

- **Important changes come with a decision record** in [`docs/adr/`](docs/adr/README.md), in the same commit. ADR-0001 says what counts. Start from `docs/adr/template.md`. Accepted records are never rewritten, only superseded.
- **No comments in source code.** Names and tests carry the meaning (ADR-0011).
- **Commit messages follow [Conventional Commits](https://www.conventionalcommits.org)**: `feat(cli): add the review command`, `fix(domain): …`, `docs: …`, `build: …`. CI checks every commit in a pull request (ADR-0033); `npx commitlint --from origin/main` checks yours before you push.
- **Rules go in the domain, not in prompts.** If a model could talk its way past it, it belongs in code.
- **New vault abilities belong in kb-template**, not in `adapter-vault-mcp`, which only wraps what the server offers.
- **Never point tests or experiments at your real vault.** Use a copy.
