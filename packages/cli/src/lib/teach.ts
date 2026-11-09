import type { TeachSession } from '@ai-coach/application';
import { UsageError } from './commands.js';
import type { Coach } from './composition.js';
import { confirm, paint, readAnswer, type Terminal } from './terminal.js';

const DONE = '/done';

type LessonInput =
  { kind: 'answer'; text: string } | { kind: 'done' } | { kind: 'quit' };

async function readTurn(term: Terminal): Promise<LessonInput> {
  const lines: string[] = [];
  for (;;) {
    const line = await term.ask(lines.length ? '... ' : 'you> ');
    if (line === null)
      return lines.length
        ? { kind: 'answer', text: lines.join('\n') }
        : { kind: 'quit' };
    const trimmed = line.trim();
    if (!lines.length && trimmed === '/quit') return { kind: 'quit' };
    if (!lines.length && (trimmed === DONE || trimmed === '/skip'))
      return { kind: 'done' };
    if (!trimmed) {
      if (lines.length) return { kind: 'answer', text: lines.join('\n') };
      continue;
    }
    lines.push(line);
  }
}

async function lesson(term: Terminal, session: TeachSession): Promise<boolean> {
  for (;;) {
    const input = await readTurn(term);
    if (input.kind === 'quit') return false;
    const move =
      input.kind === 'done' ? session.finish() : session.say(input.text);
    term.print(`${paint('magenta', 'student>')} ${move.text}`);
    if (move.kind === 'ready') return true;
  }
}

async function saveGuideline(
  term: Terminal,
  session: TeachSession,
  sessionId: string,
): Promise<void> {
  if (!(await confirm(term, 'Save this lesson as a guideline?'))) return;
  const title =
    (await term.ask(`Title [${session.note.title} guideline]: `))?.trim() ||
    `${session.note.title} guideline`;
  const folder =
    (
      await term.ask(
        'Folder under 1.Projects or 3.Resources [3.Resources/Guidelines]: ',
      )
    )?.trim() || '3.Resources/Guidelines';
  const preview = await session.guideline(sessionId, title, folder, false);
  term.print(
    `Your own turns, without the student's, go to ${paint('bold', preview.path ?? folder)}.`,
  );
  for (const w of preview.warnings) term.print(paint('yellow', w));
  if (!(await confirm(term, 'Write it?', true))) return;
  const done = await session.guideline(sessionId, title, folder, true);
  term.print(paint('green', `Wrote ${done.path}.`));
}

export async function teach(
  coach: Coach,
  term: Terminal,
  args: string[],
): Promise<void> {
  if (args.length !== 1)
    throw new UsageError('Name one concept note: coach teach <note>');
  const session = await coach.teaching().open(args[0]!);
  term.print(paint('bold', `── Teach: ${session.note.title}`));
  term.print(
    paint(
      'dim',
      `You lead. The student knows only the title and may believe something wrong. Explain, answer its questions, and correct it. A blank line sends; ${DONE} when you have taught it; /quit stops.`,
    ),
  );
  term.print(`${paint('magenta', 'student>')} ${session.opening}`);
  if (!(await lesson(term, session))) {
    term.print('Nothing was recorded.');
    return;
  }

  term.print(`${paint('magenta', 'student>')} ${session.explainBack()}`);
  term.print(
    'Correct anything wrong or missing in what the student said back. /skip if it is right.',
  );
  const correction = await readAnswer(term);
  if (correction.kind === 'quit') {
    term.print('Nothing was recorded.');
    return;
  }
  if (correction.kind === 'answer') session.correct(correction.text);

  term.print(paint('dim', '       checking the lesson…'));
  const plan = await session.conclude();
  if (plan.verdict.verdict === 'pass') {
    term.print(
      paint(
        'yellow',
        'Teach passed: the student understood, and its misconception is gone.',
      ),
    );
  } else {
    term.print(paint('red', 'Teach failed:'));
    for (const gap of plan.verdict.gaps) term.print(`  - ${gap}`);
    term.print(
      paint('dim', 'Go back over these, then spar or teach the note again.'),
    );
  }
  for (const w of plan.preview.warnings) term.print(paint('yellow', w));
  if (!(await confirm(term, 'Record this lesson?', true))) {
    term.print('Nothing was recorded.');
    return;
  }
  const recorded = await session.record(plan);
  term.print(paint('green', `Recorded ${recorded.sessionId}.`));
  if (plan.verdict.verdict === 'pass')
    await saveGuideline(term, session, recorded.sessionId);
  term.print(
    paint(
      'dim',
      `See the climb: coach climb ${JSON.stringify(session.note.title)}`,
    ),
  );
}
