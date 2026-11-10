import type { ElaborateSession, ElaborationDraft } from '@ai-coach/application';
import { ELABORATION_KINDS, type ElaborationKind } from '@ai-coach/domain';
import { UsageError, type CommandOptions } from './commands.js';
import type { Coach } from './composition.js';
import { confirm, paint, readAnswer, type Terminal } from './terminal.js';

const LIST_LIMIT = 30;

async function extras(
  term: Terminal,
): Promise<{ picks: number[]; named?: string } | null> {
  const raw = await term.ask(
    'link> numbers from the list, separated by spaces (blank for none): ',
  );
  if (raw === null) return null;
  const picks = raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const named = await term.ask(
    'named> or name a thing from your own work: a project, file, team or decision (blank for none): ',
  );
  if (named === null) return null;
  return { picks, ...(named.trim() ? { named: named.trim() } : {}) };
}

async function answerOne(
  term: Terminal,
  session: ElaborateSession,
  kind: ElaborationKind,
): Promise<ElaborationDraft | null> {
  term.print();
  term.print(`${paint('cyan', 'coach>')} ${session.questions[kind]}`);
  let text = '';
  let picks: number[] = [];
  let named: string | undefined;
  let askedExtras = false;
  for (;;) {
    const input = await readAnswer(term);
    if (input.kind !== 'answer') return null;
    text = text ? `${text}\n${input.text}` : input.text;
    let result = session.check(kind, text, session.links(text, picks), named);
    if (result.kind === 'incomplete' && kind !== 'why' && !askedExtras) {
      askedExtras = true;
      term.print(paint('yellow', result.message));
      const more = await extras(term);
      if (!more) return null;
      picks = more.picks;
      named = more.named;
      result = session.check(kind, text, session.links(text, picks), named);
    }
    if (result.kind === 'ok') break;
    if (result.kind === 'rephrase') {
      term.print(
        paint(
          'yellow',
          `No buzzwords: ${result.buzzwords.join(', ')}. Say it again in plain words.`,
        ),
      );
      text = '';
    } else if (result.kind === 'copied') {
      term.print(paint('yellow', result.message));
      text = '';
    } else {
      term.print(paint('yellow', result.message));
      term.print(paint('dim', 'Add to your answer:'));
    }
  }

  for (
    let followUp = await session.followUp(kind, text);
    followUp;
    followUp = await session.followUp(kind, text)
  ) {
    term.print(`${paint('cyan', 'coach>')} ${followUp}`);
    const input = await readAnswer(term);
    if (input.kind === 'quit') return null;
    if (input.kind !== 'answer') break;
    if (session.copies(input.text))
      term.print(paint('yellow', 'That copies the note, so it is left out.'));
    else text = `${text}\n${input.text}`;
  }
  return {
    kind,
    question: session.questions[kind],
    answer: text,
    links: session.links(text, picks),
    ...(named ? { named } : {}),
  };
}

export async function elaborate(
  coach: Coach,
  term: Terminal,
  args: string[],
  options: CommandOptions = {},
): Promise<void> {
  if (args.length !== 1)
    throw new UsageError('Name one concept note: coach elaborate <note>');
  const session = await coach.elaborating().open(args[0]!, options.style);
  term.print(
    `${paint('bold', `── Elaborate: ${session.note.title}, in your own words`)} ${paint('dim', `(${session.style} style)`)}`,
  );
  term.print(
    paint(
      'dim',
      'Three questions: why, what it connects to, and where you would use it. Link notes as [[Title]]. A blank line sends; /quit stops.',
    ),
  );
  const shown = session.candidates.slice(0, LIST_LIMIT);
  if (shown.length) {
    term.print(paint('dim', 'Notes you can link:'));
    shown.forEach((c, i) =>
      term.print(
        paint('dim', `${String(i + 1).padStart(4)}. ${c.title}  ${c.path}`),
      ),
    );
  }

  const answers: ElaborationDraft[] = [];
  for (const kind of ELABORATION_KINDS) {
    const answer = await answerOne(term, session, kind);
    if (!answer) {
      term.print('Nothing was recorded.');
      return;
    }
    answers.push(answer);
  }

  const plan = await session.plan(answers);
  term.print();
  term.print(
    `These go under ${paint('bold', '## My elaborations')} in ${session.note.path}:`,
  );
  for (const a of answers) {
    term.print(`  ${paint('cyan', a.kind)} ${a.answer.replace(/\n/g, ' ')}`);
    const where = [...a.links, ...(a.named ? [a.named] : [])];
    if (where.length) term.print(paint('dim', `      → ${where.join(', ')}`));
  }
  for (const warning of plan.preview.warnings)
    term.print(paint('yellow', warning));
  if (!(await confirm(term, 'Append them to the note?', true))) {
    term.print('Nothing was recorded.');
    return;
  }
  const recorded = await session.record(plan);
  term.print(paint('green', `Recorded ${recorded.sessionId}.`));
  term.print(
    paint(
      'dim',
      `See the climb: coach climb ${JSON.stringify(session.note.title)}`,
    ),
  );
}
