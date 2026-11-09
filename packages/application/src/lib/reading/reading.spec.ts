import { sparringRules } from '@ai-coach/domain';
import { InMemoryLibrary, InMemoryVault } from '../../testing/in-memory.js';
import { NotFoundError, NotSparrableError } from '../errors.js';
import { Reading } from './reading.js';

const BOOK = 'Design System Architecture';
const FOLDER = `3.Resources/0.Raw/Books/${BOOK}`;
const CH1 = `${FOLDER}/chapters/01 Layers.md`;
const CH2 = `${FOLDER}/chapters/02 Themes.md`;
const PAGE_1 =
  'Design tokens are named values for colour, spacing and type. Every other layer reads its values from the tokens and never hard-codes them.';
const PAGE_2 =
  'Primitives are the smallest building blocks, such as a box, a text and an icon.';

function setup(summary = '') {
  const vault = new InMemoryVault();
  vault.put(
    CH1,
    `# Chapter 1\n\n${summary}## Page 1\n\n${PAGE_1}\n\n## Page 2\n\n${PAGE_2}\n`,
    { rawRole: 'chapter' },
  );
  vault.put(CH2, '## Page 3\n\nThemes.', { rawRole: 'chapter' });
  const library = new InMemoryLibrary(vault, [
    {
      index: `${FOLDER}/text.md`,
      folder: FOLDER,
      title: BOOK,
      author: null,
      stage: 'read',
      notes: [],
      concepts: [],
      chapters: [
        {
          path: CH1,
          title: 'Chapter 1: Layers',
          summary: false,
          state: 'complete',
        },
        {
          path: CH2,
          title: 'Chapter 2: Themes',
          summary: false,
          state: 'untouched',
        },
      ],
    },
  ]);
  const reading = new Reading({
    notes: vault,
    library,
    rules: sparringRules(),
  });
  return { library, reading };
}

describe('Reading', () => {
  it('opens the first unfinished chapter, or one by number or title', async () => {
    const { reading } = setup();
    expect((await reading.open(BOOK)).chapter.path).toBe(CH2);
    expect((await reading.open(BOOK.toLowerCase(), '1')).chapter.path).toBe(
      CH1,
    );
    expect((await reading.open(BOOK, 'chapter 1: layers')).chapter.path).toBe(
      CH1,
    );
    await expect(reading.open(BOOK, '9')).rejects.toThrow(NotFoundError);
  });

  it('shows the chapter page by page, and classes notes and quotes', async () => {
    const { reading } = setup();
    const session = await reading.open(BOOK, '1');
    expect(session.sections.map((s) => s.page)).toEqual([1, 2]);
    expect(session.hasSummary).toBe(false);
    const page = session.sections[0]!;
    expect(
      session.note('named values for colour, spacing and type', page).quote,
    ).toBe(true);
    expect(
      session.note('one source of truth for every layer', page).quote,
    ).toBe(false);
    expect(
      session.tooMuch(
        [
          session.note(
            'one source of truth for every layer above it all',
            page,
          ),
        ],
        page,
      ),
    ).toBe(true);
  });

  it('previews every page and the summary, and writes nothing before record', async () => {
    const { library, reading } = setup();
    const session = await reading.open(BOOK, '1');
    const [p1, p2] = session.sections;
    const plan = await session.plan(
      [
        { page: 1, notes: [session.note('one source of truth', p1!)] },
        { page: 2, notes: [] },
      ],
      'Values at the bottom, recipes on top.',
    );
    expect(plan.counts).toBe(true);
    expect(library.readingNotes.map((r) => r.execute)).toEqual([false]);
    expect(library.summaries.map((s) => s.execute)).toEqual([false]);
    expect(p2).toBeDefined();

    const written = await session.record(plan);
    expect(library.readingNotes.map((r) => r.execute)).toEqual([
      false,
      false,
      true,
    ]);
    expect(library.summaries.map((s) => s.execute)).toEqual([false, true]);
    expect(written).toEqual([CH1, '3.Resources/Reading notes/01 Layers.md']);
  });

  it('does not count a chapter with only quotes, or without a summary', async () => {
    const { reading } = setup();
    const session = await reading.open(BOOK, '1');
    const page = session.sections[0]!;
    const quotes = await session.plan(
      [
        {
          page: 1,
          notes: [
            session.note('named values for colour, spacing and type', page),
          ],
        },
      ],
      'Values at the bottom, recipes on top.',
    );
    expect(quotes.counts).toBe(false);
    const noSummary = await session.plan(
      [{ page: 1, notes: [session.note('one source of truth', page)] }],
      null,
    );
    expect(noSummary.counts).toBe(false);
  });

  it('counts the summary the chapter already has', async () => {
    const { reading } = setup('> [!summary]\n> Four layers.\n\n');
    const session = await reading.open(BOOK, '1');
    expect(session.hasSummary).toBe(true);
    const plan = await session.plan(
      [
        {
          page: 1,
          notes: [session.note('one source of truth', session.sections[0]!)],
        },
      ],
      null,
    );
    expect(plan.counts).toBe(true);
  });

  it('refuses a summary that copies the chapter, and an empty plan', async () => {
    const { reading } = setup();
    const session = await reading.open(BOOK, '1');
    await expect(
      session.plan([], 'Every other layer reads its values from the tokens.'),
    ).rejects.toThrow(NotSparrableError);
    await expect(session.plan([], null)).rejects.toThrow(/Nothing to write/);
  });
});
