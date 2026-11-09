import {
  conceptDraft,
  extractMarks,
  extractNoteItems,
  quotable,
  quotesFrom,
  type MaterialItem,
} from './synthesis.js';
import { DomainError } from './errors.js';

const CHAPTER = [
  '# Chapter 6: Distill',
  '',
  'From [[text|Book]], pages 98–99.',
  '',
  '> [!summary]',
  '> Layers let me grasp a note',
  '> in seconds.',
  '',
  '## Page 98',
  'Notes need **discoverability for the future**. Most of this page is plain text.',
  '**Bold the main points, then ==highlight the best of what is bolded== later.**',
  '',
  '> [!summary] Page idea: formatting marks the layers.',
  '',
  '## Page 99',
  'A __second bold style__ and ==a highlight that spans',
  'two lines of the page==.',
].join('\n');

describe('extractMarks', () => {
  it('finds the chapter summary, page summaries, highlights and bolds with their pages', () => {
    expect(extractMarks(CHAPTER)).toEqual([
      {
        kind: 'summary',
        text: 'Layers let me grasp a note in seconds.',
        page: null,
      },
      {
        kind: 'summary',
        text: 'Page idea: formatting marks the layers.',
        page: 98,
      },
      {
        kind: 'highlight',
        text: 'highlight the best of what is bolded',
        page: 98,
        within:
          'Bold the main points, then highlight the best of what is bolded later.',
      },
      { kind: 'bold', text: 'discoverability for the future', page: 98 },
      {
        kind: 'bold',
        text: 'Bold the main points, then highlight the best of what is bolded later.',
        page: 98,
      },
      {
        kind: 'highlight',
        text: 'a highlight that spans two lines of the page',
        page: 99,
      },
      { kind: 'bold', text: 'second bold style', page: 99 },
    ]);
  });

  it('joins a bold or highlight that the converter split line by line', () => {
    const page = [
      '## Page 100',
      '**The technique is simple: you highlight the ==main points of a note==, and then**',
      '**highlight the main points of those highlights, so you can easily tell them apart.**',
      '**To enhance the discover-**',
      '**ability of this note, I add a ==second layer of==**',
      '**==distillation==**. Plain text.',
    ].join('\n');
    expect(extractMarks(page)).toEqual([
      {
        kind: 'highlight',
        text: 'main points of a note',
        page: 100,
        within:
          'The technique is simple: you highlight the main points of a note, and then highlight the main points of those highlights, so you can easily tell them apart. To enhance the discoverability of this note, I add a second layer of distillation',
      },
      {
        kind: 'highlight',
        text: 'second layer of distillation',
        page: 100,
        within:
          'The technique is simple: you highlight the main points of a note, and then highlight the main points of those highlights, so you can easily tell them apart. To enhance the discoverability of this note, I add a second layer of distillation',
      },
      {
        kind: 'bold',
        text: 'The technique is simple: you highlight the main points of a note, and then highlight the main points of those highlights, so you can easily tell them apart. To enhance the discoverability of this note, I add a second layer of distillation',
        page: 100,
      },
    ]);
  });

  it('finds nothing in an untouched chapter', () => {
    expect(extractMarks('## Page 1\nPlain text only.')).toEqual([]);
  });
});

describe('quotesFrom', () => {
  const item = (
    id: number,
    kind: MaterialItem['kind'],
    text: string,
    page: number | null = 98,
  ): MaterialItem => ({
    id,
    kind,
    text,
    note: 'raw/ch6.md',
    chapter: 'Chapter 6',
    page,
  });

  it('prefers highlights, skips short or repeated text, summaries and notes', () => {
    expect(
      quotesFrom([
        item(1, 'bold', 'notes need discoverability for the future'),
        item(2, 'highlight', 'highlight the best of what is bolded'),
        item(3, 'bold', 'too short to quote'),
        item(4, 'summary', 'My own words are never a quote.'),
        item(5, 'note', 'A reading note is never a quote either.', null),
        item(6, 'highlight', 'Highlight the best of what is bolded'),
      ]),
    ).toEqual([
      {
        note: 'raw/ch6.md',
        quote: 'highlight the best of what is bolded',
        pages: '98',
      },
      {
        note: 'raw/ch6.md',
        quote: 'notes need discoverability for the future',
        pages: '98',
      },
    ]);
  });

  it('quotes the bolded sentence around a short highlight, once', () => {
    const sentence =
      'The technique is simple: you highlight the main points of a note.';
    expect(
      quotesFrom([
        { ...item(1, 'highlight', 'main points'), within: sentence },
        { ...item(2, 'highlight', 'a note'), within: sentence },
        item(3, 'bold', sentence),
        item(4, 'highlight', 'second layer of'),
      ]),
    ).toEqual([{ note: 'raw/ch6.md', quote: sentence, pages: '98' }]);
  });
});

describe('conceptDraft', () => {
  const valid = {
    title: ' Progressive Summarization ',
    summary: 'Layers let me grasp a note in seconds.',
    assertions: ['Each layer is smaller than the last.', ' '],
    buzzwords: ['distill', 'distill'],
    passages: [
      {
        note: 'raw/ch6.md',
        quote: 'highlight the best of what is bolded',
        pages: '98',
      },
    ],
    fromNotes: ['0.Inbox/Reading.md', '0.Inbox/Reading.md'],
  };

  it('trims, removes empty assertions and duplicate buzzwords and notes', () => {
    expect(conceptDraft(valid)).toEqual({
      ...valid,
      title: 'Progressive Summarization',
      assertions: ['Each layer is smaller than the last.'],
      buzzwords: ['distill'],
      fromNotes: ['0.Inbox/Reading.md'],
    });
  });

  it('refuses a concept the vault would refuse', () => {
    expect(() => conceptDraft({ ...valid, summary: ' ' })).toThrow(
      /summary in your own words/,
    );
    expect(() => conceptDraft({ ...valid, assertions: [] })).toThrow(
      DomainError,
    );
    expect(() =>
      conceptDraft({ ...valid, assertions: Array(7).fill('A claim.') }),
    ).toThrow(/1 to 6/);
    expect(() =>
      conceptDraft({ ...valid, buzzwords: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    ).toThrow(/at most 5/);
    expect(() => conceptDraft({ ...valid, passages: [] })).toThrow(/1 to 12/);
    expect(() =>
      conceptDraft({ ...valid, passages: [{ note: 'x', quote: 'tiny' }] }),
    ).toThrow(/at least 12/);
  });
});

describe('extractNoteItems', () => {
  const CH =
    '3.Resources/0.Raw/Books/Brad Frost/Atomic Design/chapters/02 Tokens';

  it('reads the reading notes coach read writes, page by page, with kept quotes as highlights', () => {
    const body = [
      '---',
      'type: reading-notes',
      `chapter: "${CH}.md"`,
      '---',
      '',
      '# Reading notes: Tokens',
      '',
      `From [[${CH}|Atomic Design, Tokens]].`,
      '',
      '## Page 1',
      `- 2026-11-09 · one source of truth for every layer — [[${CH}#Page 1|p. 1]]`,
      `- 2026-11-09 · “named values for colour, spacing and type” (quote) — [[${CH}#Page 1|p. 1]]`,
      '',
      '## Notes',
      `- 2026-11-10 · tokens are the contract between design and code — [[${CH}|Tokens]]`,
    ].join('\n');
    expect(extractNoteItems(body)).toEqual([
      {
        kind: 'note',
        text: 'one source of truth for every layer',
        page: 1,
        source: `${CH}.md`,
      },
      {
        kind: 'highlight',
        text: 'named values for colour, spacing and type',
        page: 1,
        source: `${CH}.md`,
      },
      {
        kind: 'note',
        text: 'tokens are the contract between design and code',
        page: null,
        source: `${CH}.md`,
      },
    ]);
  });

  it('reads a freeform paper note with bullets, prose, bolds, highlights and a summary', () => {
    const body = [
      '> [!summary]',
      '> Tokens hold the values; components only point at them.',
      '',
      'Read on paper on the train, see [[Design systems]].',
      '',
      '- a **token is a name** for a value',
      '- ==every layer reads from the tokens==',
      '- "Every other layer reads its values from the tokens"',
    ].join('\n');
    expect(extractNoteItems(body)).toEqual([
      {
        kind: 'summary',
        text: 'Tokens hold the values; components only point at them.',
        page: null,
      },
      {
        kind: 'note',
        text: 'Read on paper on the train, see Design systems.',
        page: null,
      },
      { kind: 'bold', text: 'token is a name', page: null },
      { kind: 'note', text: 'a token is a name for a value', page: null },
      {
        kind: 'highlight',
        text: 'every layer reads from the tokens',
        page: null,
      },
      {
        kind: 'highlight',
        text: 'Every other layer reads its values from the tokens',
        page: null,
      },
    ]);
  });

  it('cuts a long paragraph to a note excerpt', () => {
    const [item] = extractNoteItems('word '.repeat(400));
    expect(item!.kind).toBe('note');
    expect(item!.text.length).toBe(800);
  });

  it('tells a quotable passage from a fragment', () => {
    expect(quotable('named values for colour, spacing')).toBe(true);
    expect(quotable('token is a name')).toBe(false);
  });
});
