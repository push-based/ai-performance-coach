import { parseArgs } from 'node:util';
import { OfflineViolationError } from '@ai-coach/adapter-ollama';
import { ApplicationError } from '@ai-coach/application';
import {
  COACHING_STYLES,
  DomainError,
  isCoachingStyle,
} from '@ai-coach/domain';
import {
  archive,
  capture,
  due,
  file,
  init,
  judge,
  list,
  spar,
  study,
  UsageError,
  view,
  type CommandOptions,
} from './commands.js';
import {
  composeCoach,
  type AdapterOverrides,
  type Coach,
} from './composition.js';
import { synthesize } from './synthesize.js';
import { climb } from './climb.js';
import { generate } from './generate.js';
import { elaborate } from './elaborate.js';
import { group } from './group.js';
import { read } from './read.js';
import { teach } from './teach.js';
import { ConfigError, loadConfig } from './config.js';
import { paint, type Terminal } from './terminal.js';

export const USAGE = `coach: a Socratic sparring partner for your notes

  coach [due]                 what is due for review, and what was never sparred
  coach list                  every Resources note with its mastery
  coach spar [ref ...]        Tier 1, offline: spar due notes, or notes by path or coach_id
  coach judge [session ...]   Tier 2, online: judge the Tier 1 sessions waiting for it
  coach study <ref>           work through the gaps of a chapter's latest failed session
  coach read [book] [chapter] read a chapter page by page and write down what resonated, then sum it up
  coach synthesize [book]     turn your marks and reading notes on a book into concept notes
  coach climb [note ...]      the seven learning steps done on each concept note, and the next one
                              (--rebuild sets every climb: summary back to what the evidence shows)
  coach group [book]          sort a book's concepts into your own groups and say what builds on what
  coach generate <note>       guess a concept, or a chapter before reading it, then check and correct the guess
  coach elaborate <note>      say why a concept matters, what it connects to, and where you would use it
  coach teach <note>          teach a concept to a student who knows only its title, after a passed spaced review
  coach file <note> <folder>  move a note into a PARA folder (shows a preview first)
  coach capture <title>       write a new note into 0.Inbox
  coach archive <project>     move a project from 1.Projects into 4.Archive
  coach init                  bring the vault onto the five PARA folders
  coach view                  open the vault graph in the browser

Options: --style feynman|socratic|cornell|devil, --free-recall, --config <file>, --today YYYY-MM-DD, --help

--free-recall opens spar on a concept note by asking you to write down everything you remember, then asks only about what you missed.

Styles: feynman (plain words, no jargon), socratic (counter-examples), cornell (the author's thesis and argument), devil (failure modes and trade-offs).
Without --style, a note's style: frontmatter, then sparring.style in the config, then automatic choice.`;

export interface CliDeps extends AdapterOverrides {
  term: Terminal;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

const COMMANDS: Record<
  string,
  (
    coach: Coach,
    term: Terminal,
    args: string[],
    options: CommandOptions,
  ) => Promise<void>
> = {
  due: (coach, term) => due(coach, term),
  list: (coach, term) => list(coach, term),
  spar,
  judge,
  study,
  synthesize,
  climb,
  generate,
  elaborate,
  group,
  read,
  teach,
  file,
  capture,
  archive,
  init: (coach, term) => init(coach, term),
};

function isKnown(err: unknown): err is Error {
  return (
    err instanceof ApplicationError ||
    err instanceof DomainError ||
    err instanceof ConfigError ||
    err instanceof UsageError ||
    err instanceof OfflineViolationError
  );
}

export async function run(argv: string[], deps: CliDeps): Promise<number> {
  const { term } = deps;
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        config: { type: 'string' },
        today: { type: 'string' },
        style: { type: 'string' },
        'free-recall': { type: 'boolean' },
        rebuild: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (err) {
    term.print(`${(err as Error).message}\n\n${USAGE}`);
    return 2;
  }
  const [command = 'due', ...args] = parsed.positionals;
  if (parsed.values.help || command === 'help') {
    term.print(USAGE);
    return 0;
  }
  const handler = COMMANDS[command];
  if (!handler && command !== 'view') {
    term.print(`Unknown command: ${command}\n\n${USAGE}`);
    return 2;
  }
  const style = parsed.values.style;
  if (style !== undefined && !isCoachingStyle(style)) {
    term.print(`--style must be one of ${COACHING_STYLES.join(', ')}`);
    return 2;
  }
  const today = parsed.values.today;
  if (today && !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    term.print('--today must be YYYY-MM-DD');
    return 2;
  }

  let coach: Coach | undefined;
  try {
    const config = loadConfig({
      file: parsed.values.config,
      env: deps.env,
      cwd: deps.cwd,
    });
    if (!handler) {
      await view(config, term);
      return 0;
    }
    coach = await composeCoach(config, today, deps);
    await handler(coach, term, args, {
      style,
      freeRecall: parsed.values['free-recall'],
      rebuild: parsed.values.rebuild,
    });
    return 0;
  } catch (err) {
    term.print(
      paint(
        'red',
        isKnown(err) ? err.message : String((err as Error)?.stack ?? err),
      ),
    );
    return 1;
  } finally {
    await coach?.close();
  }
}
