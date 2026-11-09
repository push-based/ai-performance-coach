import type { GroupSession } from '@ai-coach/application';
import {
  DomainError,
  MAX_GROUPS,
  MIN_GROUPS,
  parseEdgeLine,
  parseGroupLine,
  type BuildsOn,
  type ConceptGroup,
} from '@ai-coach/domain';
import { UsageError } from './commands.js';
import type { Coach } from './composition.js';
import { confirm, paint, readAnswer, type Terminal } from './terminal.js';

async function readLines<T>(
  term: Terminal,
  prompt: string,
  parse: (line: string) => T,
): Promise<T[] | null> {
  const out: T[] = [];
  for (;;) {
    const line = await term.ask(prompt);
    if (line === null) return null;
    if (line.trim() === '/quit') return null;
    if (!line.trim()) return out;
    try {
      out.push(parse(line));
    } catch (err) {
      if (!(err instanceof DomainError)) throw err;
      term.print(paint('yellow', err.message));
    }
  }
}

async function readStructure(
  term: Terminal,
  session: GroupSession,
): Promise<{ groups: ConceptGroup[]; buildsOn: BuildsOn[] } | null> {
  for (;;) {
    term.print(
      `Sort these into ${MIN_GROUPS} to ${MAX_GROUPS} groups, one per line, as ${paint('bold', 'name: concept, concept')}. Name each group in your own words; numbers work for concepts. A blank line ends.`,
    );
    const groups = await readLines(term, 'group> ', (line) =>
      parseGroupLine(line, session.titles),
    );
    if (!groups) return null;
    term.print(
      `Which group builds on which? One per line, as ${paint('bold', 'components → primitives')}. A blank line ends.`,
    );
    const buildsOn = await readLines(term, 'edge> ', parseEdgeLine);
    if (!buildsOn) return null;
    const problems = session.problems(groups, buildsOn);
    if (!problems.length) return { groups, buildsOn };
    for (const p of problems) term.print(paint('yellow', p));
    term.print(paint('dim', 'Enter the groups and layers again.'));
  }
}

async function pickBook(coach: Coach, term: Terminal): Promise<string | null> {
  const books = await coach.grouping().books();
  if (!books.length) {
    term.print(
      'No book has two or more concept notes yet. Make them with coach synthesize.',
    );
    return null;
  }
  books.forEach((b, i) =>
    term.print(
      `${String(i + 1).padStart(3)}. ${b.title} ${paint('dim', `(${b.concepts?.length ?? 0} concepts)`)}`,
    ),
  );
  const raw = await term.ask('Which book? ');
  const n = Number(raw?.trim());
  if (!Number.isInteger(n) || n < 1 || n > books.length) {
    if (raw === null || !raw.trim()) return null;
    throw new UsageError(`Not on the list: ${raw}`);
  }
  return books[n - 1]!.title;
}

export async function group(
  coach: Coach,
  term: Terminal,
  args: string[],
): Promise<void> {
  const book = args.length ? args.join(' ') : await pickBook(coach, term);
  if (!book) return;
  const session = await coach.grouping().open(book);
  term.print(paint('bold', `── Group: ${session.book}`));
  session.titles.forEach((t, i) =>
    term.print(`${String(i + 1).padStart(4)}. ${t}`),
  );

  let structure = await readStructure(term, session);
  if (!structure) {
    term.print('Nothing was written.');
    return;
  }
  const questions = await session.questions(
    structure.groups,
    structure.buildsOn,
  );
  if (questions.length) {
    term.print(paint('dim', 'Some questions about your structure:'));
    for (const q of questions) {
      term.print(`${paint('cyan', 'coach>')} ${q}`);
      const input = await readAnswer(term);
      if (input.kind === 'quit') {
        term.print('Nothing was written.');
        return;
      }
    }
    if (await confirm(term, 'Change your groups or layers?')) {
      structure = await readStructure(term, session);
      if (!structure) {
        term.print('Nothing was written.');
        return;
      }
    }
  }

  const plan = await session.plan(structure.groups, structure.buildsOn);
  term.print();
  term.print(
    `Write ${paint('bold', plan.check.path ?? 'the structure note')}:`,
  );
  for (const g of plan.groups)
    term.print(`  ${paint('cyan', g.name)}: ${g.concepts.join(', ')}`);
  for (const e of plan.buildsOn)
    term.print(paint('dim', `  ${e.from} builds on ${e.to}`));
  for (const w of plan.check.warnings) term.print(paint('yellow', w));
  term.print(
    paint(
      'dim',
      `Each concept note gets its group, and ${plan.check.climbs.length} get the Group step of their climb.`,
    ),
  );
  if (!(await confirm(term, 'Write the structure note?', true))) {
    term.print('Nothing was written.');
    return;
  }
  const done = await session.record(plan);
  term.print(paint('green', `Wrote ${done.path}.`));
}
