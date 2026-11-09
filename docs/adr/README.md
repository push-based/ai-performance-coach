# Architecture decision records

Every important or major change to ai-coach ships with an ADR in this folder; ADR-0001 says which changes count. Copy `template.md`, take the next number, and add a line below.

| ADR                                                                               | Decision                                                                                         | Status                 |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------- |
| [0001](0001-record-important-changes-in-adrs.md)                                  | Record every important change in an architecture decision record                                 | accepted               |
| [0002](0002-two-tier-coach-offline-gemma-and-zero-knowledge-gemini.md)            | Coach in two tiers: offline Gemma, zero-knowledge Gemini Argon                                   | accepted               |
| [0003](0003-reach-the-vault-only-through-the-kb-template-mcp-server.md)           | Reach the vault only through kb-template's MCP vault server                                      | accepted               |
| [0004](0004-only-the-tier2-payload-leaves-the-machine.md)                         | Only the Tier 2 payload leaves the machine                                                       | superseded by ADR-0021 |
| [0005](0005-tier1-socratic-dialogue-rules.md)                                     | Run Tier 1 as a Socratic dialogue with banned buzzwords and bounded follow-ups                   | accepted               |
| [0006](0006-blind-claim-extraction-and-the-verdict-rule.md)                       | Judge Tier 2 by blind claim extraction, and pass only flawless answers                           | accepted               |
| [0007](0007-schedule-reviews-on-a-fixed-ladder-from-vault-history.md)             | Schedule reviews on a fixed ladder read from the vault's session history                         | accepted               |
| [0008](0008-hexagonal-architecture-enforced-by-nx-boundaries.md)                  | Structure ai-coach as ports and adapters, enforced by Nx module boundaries                       | accepted               |
| [0009](0009-a-terminal-cli-with-previews-before-every-write.md)                   | Drive the coach from a terminal CLI that previews every write                                    | accepted               |
| [0010](0010-test-each-layer-and-drop-server-dependent-tests-for-now.md)           | Test each layer on its own, and drop tests that need the kb-template server for now              | accepted               |
| [0011](0011-source-code-carries-no-comments.md)                                   | Source code carries no comments                                                                  | accepted               |
| [0012](0012-spar-book-chapters-never-the-book-index.md)                           | Spar book chapters, never the book index                                                         | superseded by ADR-0018 |
| [0013](0013-set-gemma-context-window-explicitly.md)                               | Set Gemma's context window explicitly and refuse prompts that would not fit                      | accepted               |
| [0014](0014-anchor-tier1-on-a-focus-and-keep-the-note-out-of-the-dialogue.md)     | Anchor Tier 1 on a focus, and keep the note out of the challenge and the dialogue                | accepted               |
| [0015](0015-load-secrets-from-a-git-ignored-env-file.md)                          | Load secrets from a git-ignored .env file                                                        | accepted               |
| [0016](0016-check-each-tier1-gap-against-the-transcript.md)                       | Check each Tier 1 gap against the transcript before it stands                                    | accepted               |
| [0017](0017-study-the-gaps-of-a-failed-round-with-hints-and-the-authors-words.md) | Study the gaps of a failed round with hints and the author's own words                           | accepted               |
| [0018](0018-keep-every-round-inside-its-chapter.md)                               | Spar concept notes against their core assertions; raw material is reference only                 | accepted               |
| [0019](0019-coaching-styles.md)                                                   | Coach in one of four styles, chosen per note                                                     | accepted               |
| [0020](0020-asking-for-help-in-study-never-costs-an-attempt.md)                   | Asking for help in study never costs an attempt, and a bad model reply never ends a session      | accepted               |
| [0021](0021-the-judge-may-see-core-assertions.md)                                 | Only the Tier 2 payload leaves the machine, and it may carry core assertions                     | accepted               |
| [0022](0022-keep-knowledge-notes-when-archiving-a-project.md)                     | Ask which knowledge notes to keep before archiving a project                                     | accepted               |
| [0023](0023-distill-concept-notes-from-the-learners-own-words.md)                 | Distill concept notes from the learner's own words, with the local model as helper               | accepted               |
| [0024](0024-drop-a-tier1-gap-only-on-the-learners-own-words.md)                   | Drop a Tier 1 gap only when the learner's own words cover it                                     | proposed               |
| [0025](0025-judge-each-answer-by-the-style-it-was-sparred-in.md)                  | Judge each answer by the bar of the style it was sparred in                                      | proposed               |
| [0026](0026-quote-whole-marked-sentences-and-ask-why-an-idea-matters.md)          | Quote whole marked sentences, ask why an idea matters, and never repeat a study quote            | proposed               |
| [0027](0027-check-each-core-assertion-on-a-larger-local-model.md)                 | Decide a concept round by checking each core assertion on a larger local model                   | proposed               |
| [0028](0028-call-making-concept-notes-synthesis.md)                               | Call making concept notes synthesis, and keep distillation for marking                           | proposed               |
| [0029](0029-plan-the-vault-with-agent-skills-through-the-vault-tools-only.md)     | Plan the vault with agent skills that use only the vault tools                                   | superseded by ADR-0030 |
| [0030](0030-plan-the-vault-with-the-full-set-of-vault-planning-tools.md)          | Plan the vault with the full set of vault planning tools, and pass every preview back on execute | proposed               |
| [0031](0031-plan-habits-as-definitions-checked-off-per-day-never-carried-over.md) | Plan habits as definitions checked off per day, never carried over                               | proposed               |
| [0032](0032-publish-the-docs-with-docusaurus-from-the-markdown-where-it-lives.md) | Publish the docs with Docusaurus, built from the Markdown where it lives                         | proposed               |
| [0033](0033-write-commit-messages-as-conventional-commits.md)                     | Write commit messages as Conventional Commits, checked in pull requests                          | proposed               |
| [0034](0034-split-the-docs-into-a-short-readme-a-guide-and-contributing.md)       | Split the docs into a short README, a user guide and a contributing guide                        | proposed               |
| [0035](0035-keep-day-plans-in-a-folder-per-month.md)                              | Keep day plans in a folder per month                                                             | proposed               |
| [0036](0036-fix-ticked-tasks-with-update-task-and-place-tasks-by-heading-path.md) | Fix ticked tasks with update_task, and place tasks by heading path                               | proposed               |
| [0037](0037-track-the-climb-of-seven-learning-steps-per-concept.md)               | Track the climb of seven learning steps on each concept note                                     | proposed               |
| [0038](0038-review-a-new-idea-the-next-day-and-mix-topics-in-the-due-queue.md)    | Review a new idea the next day, and mix topics in the due queue                                  | proposed               |
| [0039](0039-open-a-concept-round-with-free-recall-behind-an-option.md)            | Open a concept round with free recall, behind an option                                          | proposed               |
| [0040](0040-guess-before-you-look-with-coach-generate.md)                         | Guess before you look with coach generate, and correct every wrong guess                         | proposed               |
| [0041](0041-elaborate-a-concept-with-a-why-a-connection-and-a-use.md)             | Elaborate a concept with a why, a connection and a use, checked in code                          | proposed               |
| [0042](0042-group-a-books-concepts-into-the-learners-own-layers.md)               | Group a book's concepts into the learner's own layers, with embedded questions                   | proposed               |
| [0043](0043-read-a-chapter-page-by-page-and-write-down-what-resonates.md)         | Read a chapter page by page in the terminal, and write down what resonates                       | proposed               |
| [0044](0044-teach-a-student-that-knows-only-the-title-and-one-misconception.md)   | Teach a student that knows only the title and one misconception                                  | proposed               |
