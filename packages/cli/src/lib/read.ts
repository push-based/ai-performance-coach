import type { PageNotes, ReadSession } from '@ai-coach/application';
import type { ReadingNote, Section } from '@ai-coach/domain';
import { UsageError } from './commands.js';
import type { Coach } from './composition.js';
import { confirm, paint, readAnswer, type Terminal } from './terminal.js';

async function notesFor(
  term: Terminal,
  session: ReadSession,
  section: Section,
): Promise<ReadingNote[] | null> {
  const notes: ReadingNote[] = [];
  for (;;) {
    const line = await term.ask('note> ');
    if (line === null || line.trim() === '/quit') return null;
    if (!line.trim()) break;
    const note = session.note(line, section);
    if (note.quote) {
      const keep = await term.ask(
        '      That copies the page. [r]ewrite it in your own words, or [k]eep it as a quote? ',
      );
      if (keep === null) return null;
      if (!keep.trim().toLowerCase().startsWith('k')) continue;
    }
    notes.push(note);
  }
  if (session.tooMuch(notes, section))
    term.print(
      paint(
        'yellow',
        'Your notes hold more than a fifth of this page. Keep only what resonates.',
      ),
    );
  return notes;
}

async function summaryFor(
  term: Terminal,
  session: ReadSession,
): Promise<string | null | undefined> {
  if (session.hasSummary) {
    term.print(paint('dim', 'This chapter already has your summary.'));
    return null;
  }
  term.print(
    'Sum the chapter up in 1 to 3 sentences, in your own words. /skip to leave it for later.',
  );
  for (;;) {
    const input = await readAnswer(term);
    if (input.kind === 'quit') return undefined;
    if (input.kind === 'skip') return null;
    const problem = session.summaryProblem(input.text);
    if (!problem) return input.text;
    term.print(paint('yellow', problem));
  }
}

async function pickBook(coach: Coach, term: Terminal): Promise<string | null> {
  const books = await coach.reading().books();
  if (!books.length) {
    term.print('No converted book yet. Convert one in kb-template first.');
    return null;
  }
  books.forEach((b, i) =>
    term.print(
      `${String(i + 1).padStart(3)}. ${b.title} ${paint('dim', `(${b.stage})`)}`,
    ),
  );
  const raw = await term.ask('Which book? ');
  if (raw === null || !raw.trim()) return null;
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1 || n > books.length)
    throw new UsageError(`Not on the list: ${raw}`);
  return books[n - 1]!.title;
}

export async function read(
  coach: Coach,
  term: Terminal,
  args: string[],
): Promise<void> {
  if (args.length > 2)
    throw new UsageError(
      'coach read [book] [chapter]: quote a book title that has spaces',
    );
  const book = args[0] ?? (await pickBook(coach, term));
  if (!book) return;
  const session = await coach.reading().open(book, args[1]);
  term.print(
    paint('bold', `── Read: ${session.book}, ${session.chapter.title}`),
  );
  term.print(
    paint(
      'dim',
      'Read each page. Then write down what resonated, in your own words, one note per line. A blank line moves on; /quit stops.',
    ),
  );

  const pages: PageNotes[] = [];
  for (const section of session.sections) {
    term.print();
    if (section.page !== null)
      term.print(paint('bold', `Page ${section.page}`));
    term.print(section.text);
    term.print(
      paint('cyan', 'What resonated? Write it down in your own words.'),
    );
    const notes = await notesFor(term, session, section);
    if (!notes) {
      term.print('Nothing was written.');
      return;
    }
    pages.push({ page: section.page, notes });
  }

  term.print();
  const summary = await summaryFor(term, session);
  if (summary === undefined) {
    term.print('Nothing was written.');
    return;
  }
  if (!pages.some((p) => p.notes.length) && summary === null) {
    term.print('No notes and no summary: nothing to write.');
    return;
  }

  const plan = await session.plan(pages, summary);
  term.print();
  for (const p of plan.pages) {
    term.print(
      `${paint('bold', p.check.path ?? 'reading notes')}${p.page !== null ? paint('dim', ` · page ${p.page}`) : ''}`,
    );
    for (const n of p.notes)
      term.print(
        `  - ${n.quote ? `“${n.text}” ${paint('dim', '(quote)')}` : n.text}`,
      );
    for (const w of p.check.warnings) term.print(paint('yellow', `  ${w}`));
  }
  if (plan.summary)
    term.print(`${paint('bold', 'Chapter summary')}: ${plan.summary.text}`);
  term.print(
    plan.counts
      ? paint(
          'dim',
          'This completes Read for the concept notes that quote this chapter.',
        )
      : paint(
          'yellow',
          'Read counts once the chapter has a note in your own words and your summary.',
        ),
  );
  if (!(await confirm(term, 'Write them?', true))) {
    term.print('Nothing was written.');
    return;
  }
  for (const path of await session.record(plan))
    term.print(paint('green', `Wrote ${path}.`));
}
