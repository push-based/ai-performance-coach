import type { GenerateSession } from '@ai-coach/application';
import { DomainError, parseMark, type MarkedAssertion } from '@ai-coach/domain';
import { UsageError } from './commands.js';
import type { Coach } from './composition.js';
import { confirm, paint, readAnswer, type Terminal } from './terminal.js';

async function attemptFirst(
  term: Terminal,
  session: GenerateSession,
): Promise<boolean> {
  for (;;) {
    const input = await readAnswer(term);
    if (input.kind !== 'answer') return false;
    try {
      session.submit(input.text);
      return true;
    } catch (err) {
      if (!(err instanceof DomainError)) throw err;
      term.print(paint('yellow', err.message));
    }
  }
}

async function chapterPoints(
  term: Terminal,
  session: GenerateSession,
): Promise<string[] | null> {
  term.print(
    `Now read ${paint('bold', session.note.path)} in Obsidian or with coach view.`,
  );
  if ((await term.ask('Press Enter when you have read it ')) === null)
    return null;
  term.print(
    "Name the chapter's main points in your own words, one per line. A blank line ends the list.",
  );
  const points: string[] = [];
  for (;;) {
    const line = await term.ask('point> ');
    if (line === null) return points.length ? points : null;
    if (!line.trim()) {
      if (points.length) return points;
      continue;
    }
    points.push(line.trim());
  }
}

async function markOne(
  term: Terminal,
  session: GenerateSession,
  point: string,
  index: number,
): Promise<MarkedAssertion | null> {
  term.print(`${String(index + 1).padStart(3)}. ${point}`);
  for (;;) {
    const raw = await term.ask('     [g]ot it, [w]rong or [m]issed? ');
    if (raw === null) return null;
    const mark = parseMark(raw);
    if (!mark) continue;
    if (mark !== 'wrong') return { assertion: point, mark };
    for (;;) {
      const correction = await term.ask('     correction> ');
      if (correction === null) return null;
      const problem = session.correctionProblem(correction, point);
      if (!problem) return { assertion: point, mark, correction };
      term.print(paint('yellow', `     ${problem}`));
    }
  }
}

export async function generate(
  coach: Coach,
  term: Terminal,
  args: string[],
): Promise<void> {
  if (args.length !== 1)
    throw new UsageError(
      'Name one concept note or book chapter: coach generate <note>',
    );
  const session = await coach.generating().open(args[0]!);
  term.print(paint('bold', `── Generate: try before you look`));
  for (const line of session.shown) term.print(`   ${line}`);
  term.print(`${paint('cyan', 'coach>')} ${session.prompt}`);
  term.print(
    paint(
      'dim',
      'Write your attempt, at least 10 words, or /idk. A blank line sends; /quit stops.',
    ),
  );
  if (!(await attemptFirst(term, session))) {
    term.print('Nothing was recorded.');
    return;
  }

  const revealed = session.reveal();
  term.print(paint('dim', 'Your attempt is saved. Now the answer.'));
  let points: string[];
  if (session.mode === 'concept') {
    points = revealed;
    term.print(
      'Mark each core assertion against what you wrote. A wrong one needs a one-line correction in your own words.',
    );
  } else {
    const named = await chapterPoints(term, session);
    if (!named) {
      term.print('Nothing was recorded.');
      return;
    }
    points = named;
    term.print('Mark each point against what you expected.');
  }

  const marks: MarkedAssertion[] = [];
  for (const [i, point] of points.entries()) {
    const mark = await markOne(term, session, point, i);
    if (!mark) {
      term.print('Nothing was recorded.');
      return;
    }
    marks.push(mark);
  }

  for (const assertion of await session.unsupported(marks)) {
    term.print(
      paint('yellow', `Your attempt does not seem to say: "${assertion}"`),
    );
    if (!(await confirm(term, 'Keep it as got it?'))) {
      const at = marks.findIndex((m) => m.assertion === assertion);
      marks[at] = { assertion, mark: 'missed' };
    }
  }

  const plan = await session.plan(points, marks);
  const count = (mark: MarkedAssertion['mark']) =>
    marks.filter((m) => m.mark === mark).length;
  term.print(
    `Your marks: ${count('got it')} got it, ${count('wrong')} wrong, ${count('missed')} missed. Not graded: being wrong is how this works.`,
  );
  const review = plan.draft.items[0]?.nextReview;
  if (review) term.print(paint('dim', `First review on ${review}.`));
  if (!plan.counts)
    term.print(
      paint(
        'yellow',
        'The answer was shown before the attempt was saved, so this does not count for Generate.',
      ),
    );
  for (const warning of plan.preview.warnings)
    term.print(paint('yellow', warning));
  if (!(await confirm(term, 'Record this attempt?', true))) {
    term.print('Nothing was recorded.');
    return;
  }
  const recorded = await session.record(plan);
  term.print(paint('green', `Recorded ${recorded.sessionId}.`));
  if (session.mode === 'concept')
    term.print(
      paint(
        'dim',
        `See the climb: coach climb ${JSON.stringify(session.note.title)}`,
      ),
    );
}
