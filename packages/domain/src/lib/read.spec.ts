import {
  hasChapterSummary,
  locateQuote,
  noteShare,
  readingNote,
  sections,
  sentenceCount,
  summaryProblem,
} from './read.js';

const PAGE_1 =
  'Design tokens are named values for colour, spacing and type. Every other layer reads its values from the tokens and never hard-codes them.';
const CHAPTER = [
  '---',
  'raw_role: chapter',
  '---',
  '# Chapter 1: Layers',
  '',
  '> [!summary]',
  '> Four layers on top of each other.',
  '',
  '## Page 1',
  '',
  PAGE_1,
  '',
  '## Page 2',
  '',
  'Primitives are the smallest building blocks.',
].join('\n');

describe('reading a chapter', () => {
  it('splits the chapter into its pages, without the summary', () => {
    expect(sections(CHAPTER)).toEqual([
      { page: 1, text: PAGE_1 },
      { page: 2, text: 'Primitives are the smallest building blocks.' },
    ]);
    expect(sections('Just one block of text.')).toEqual([
      { page: null, text: 'Just one block of text.' },
    ]);
    expect(hasChapterSummary(CHAPTER)).toBe(true);
    expect(hasChapterSummary('## Page 1\n\nText.')).toBe(false);
  });

  it('classes a six-word copy as a quote and a paraphrase as a note', () => {
    expect(
      readingNote('named values for colour, spacing and type', PAGE_1, 6),
    ).toEqual({
      text: 'named values for colour, spacing and type',
      quote: true,
    });
    expect(
      readingNote('everything below reads\none source of truth', PAGE_1, 6),
    ).toEqual({
      text: 'everything below reads one source of truth',
      quote: false,
    });
  });

  it('measures how much of a page the notes hold', () => {
    const notes = [readingNote('one source of truth', PAGE_1, 6)];
    expect(noteShare(notes, PAGE_1)).toBeCloseTo(4 / 24);
    expect(noteShare(notes, '')).toBe(0);
  });

  it('wants a summary of one to three sentences in the learner own words', () => {
    expect(sentenceCount('One. Two! Three? Four.')).toBe(4);
    expect(
      summaryProblem('Values at the bottom, recipes on top.', CHAPTER, 6),
    ).toBeNull();
    expect(summaryProblem('', CHAPTER, 6)).toMatch(/not 0/);
    expect(summaryProblem('A. B. C. D.', CHAPTER, 6)).toMatch(/not 4/);
    expect(
      summaryProblem(
        'Every other layer reads its values from the tokens.',
        CHAPTER,
        6,
      ),
    ).toMatch(/own words/);
  });
});

describe('locateQuote', () => {
  const body = [
    '> [!summary]',
    '> Tokens first, in my words.',
    '',
    '## Page 1',
    'Design tokens are named values for colour, spac-',
    'ing and type.',
    '',
    '## Page 2',
    'Every other layer reads its **values** from the tokens.',
  ].join('\n');

  it('finds the page of a quote across line breaks, hyphens and marks', () => {
    expect(
      locateQuote('named values for colour, spacing and type', body)?.page,
    ).toBe(1);
    expect(locateQuote('Every other layer reads its values', body)?.page).toBe(
      2,
    );
  });

  it('finds nothing for words the chapter does not hold, or only in its summary', () => {
    expect(locateQuote('named values for typography', body)).toBeNull();
    expect(locateQuote('Tokens first, in my words.', body)).toBeNull();
  });
});
