import { DEFAULT_LADDER, DomainError, sparringRules } from '@ai-coach/domain';
import {
  FixedClock,
  InMemoryVault,
  ScriptedPartner,
} from '../../testing/in-memory.js';
import { NotSparrableError } from '../errors.js';
import { GenerateSessionError, Generating } from './generating.js';

const TOKENS = '3.Resources/Concepts/Design tokens.md';
const CHAPTER = '3.Resources/0.Raw/Design System Architecture/Chapter 1.md';
const A = 'Tokens name each design decision once.';
const B = 'Primitives read tokens, never raw values.';
const ATTEMPT =
  'I think tokens are named colours and sizes that the whole system reads from one place.';

function setup() {
  const vault = new InMemoryVault();
  vault.put(TOKENS, 'NOTE-BODY-MARKER', {
    rawRole: null,
    concept: { assertions: [A, B], buzzwords: [], passages: [], problems: [] },
  });
  vault.put(CHAPTER, 'Raw text of chapter one.', {
    rawRole: 'chapter',
    chapter: {
      book: 'Design System Architecture',
      part: null,
      chapter: 1,
      section: 'Foundations',
      pages: '1-20',
    },
  });
  vault.put('3.Resources/Reading notes.md', 'Notes.');
  const partner = new ScriptedPartner();
  const generating = new Generating({
    notes: vault,
    sessions: vault,
    partner,
    rules: sparringRules(),
    ladder: DEFAULT_LADDER,
    clock: new FixedClock('2026-11-10'),
  });
  return { vault, partner, generating };
}

describe('Generating a concept before seeing it', () => {
  it('shows only the title, then records the attempt before the reveal, with every mark', async () => {
    const { vault, generating } = setup();
    const session = await generating.open('Design tokens');
    expect(session.mode).toBe('concept');
    expect(session.shown).toEqual(['Design tokens']);
    expect(session.prompt).toContain('"Design tokens"');
    expect(session.prompt).not.toContain('NOTE-BODY-MARKER');

    session.submit(ATTEMPT);
    expect(session.reveal()).toEqual([A, B]);
    const plan = await session.plan(
      [],
      [
        { assertion: A, mark: 'got it' },
        {
          assertion: B,
          mark: 'wrong',
          correction: 'They take every value from tokens.',
        },
      ],
    );
    expect(plan.counts).toBe(true);
    expect(plan.draft).toMatchObject({
      kind: 'generate',
      date: '2026-11-10',
      items: [
        {
          note: { path: TOKENS },
          answer: ATTEMPT,
          attemptedAt: '2026-11-10T09:00:00.000Z',
          revealedAt: '2026-11-10T09:00:01.000Z',
          idk: false,
          nextReview: '2026-11-11',
        },
      ],
    });
    expect(vault.practices).toEqual([]);
    await session.record(plan);
    expect(vault.practices.map((p) => p.draft.kind)).toEqual(['generate']);
  });

  it('never reveals before an attempt, and takes no attempt after a reveal', async () => {
    const { generating } = setup();
    const session = await generating.open(TOKENS);
    expect(() => session.reveal()).toThrow(GenerateSessionError);
    expect(() => session.submit('too short')).toThrow(DomainError);
    session.submit('/idk');
    session.reveal();
    expect(() => session.submit(ATTEMPT)).toThrow(GenerateSessionError);
  });

  it('refuses a wrong mark without a correction', async () => {
    const { generating } = setup();
    const session = await generating.open(TOKENS);
    session.submit(ATTEMPT);
    session.reveal();
    await expect(
      session.plan(
        [],
        [
          { assertion: A, mark: 'got it' },
          { assertion: B, mark: 'wrong' },
        ],
      ),
    ).rejects.toThrow(/needs a correction/);
  });

  it('flags a "got it" the attempt does not contain, without sending the note', async () => {
    const { partner, generating } = setup();
    partner.covered.push([A]);
    const session = await generating.open(TOKENS);
    session.submit(ATTEMPT);
    session.reveal();
    expect(
      await session.unsupported([
        { assertion: A, mark: 'got it' },
        { assertion: B, mark: 'got it' },
      ]),
    ).toEqual([B]);
    const request = partner.recallRequests[0]!;
    expect(JSON.stringify(request)).not.toContain('NOTE-BODY-MARKER');
    expect(request.exchanges).toEqual([
      { question: session.prompt, answer: ATTEMPT },
    ]);
  });

  it('flags every "got it" after /idk, without asking the model', async () => {
    const { partner, generating } = setup();
    const session = await generating.open(TOKENS);
    session.submit('/idk');
    session.reveal();
    expect(
      await session.unsupported([{ assertion: A, mark: 'got it' }]),
    ).toEqual([A]);
    expect(partner.recallRequests).toEqual([]);
  });

  it('schedules no review when the concept has one already', async () => {
    const { vault, generating } = setup();
    await vault.record(
      {
        tier: 1,
        date: '2026-11-09',
        items: [
          {
            note: { path: TOKENS },
            challenge: 'Q?',
            answer: 'A.',
            verdict: 'fail',
            gaps: [],
            nextReview: '2026-11-10',
          },
        ],
      },
      true,
    );
    const session = await generating.open(TOKENS);
    session.submit(ATTEMPT);
    session.reveal();
    const plan = await session.plan(
      [],
      [
        { assertion: A, mark: 'missed' },
        { assertion: B, mark: 'missed' },
      ],
    );
    expect(plan.draft.items[0]).not.toHaveProperty('nextReview');
    expect(plan.draft.items[0]!.note).toEqual({ coachId: 'c-1' });
  });
});

describe('Generating a chapter before reading it', () => {
  it('shows the chapter, then marks the points the learner names', async () => {
    const { generating } = setup();
    const session = await generating.open(CHAPTER);
    expect(session.mode).toBe('chapter');
    expect(session.shown).toEqual([
      'Design System Architecture',
      'Chapter 1: Foundations',
      'pages 1-20',
    ]);
    session.submit(ATTEMPT);
    expect(session.reveal()).toEqual([]);
    await expect(session.plan([], [])).rejects.toThrow(GenerateSessionError);
    const plan = await session.plan(
      ['Tokens come first'],
      [{ assertion: 'Tokens come first', mark: 'got it' }],
    );
    expect(plan.draft.items[0]).toMatchObject({ note: { path: CHAPTER } });
    expect(plan.draft.items[0]).not.toHaveProperty('nextReview');
  });

  it('refuses a note that is neither a concept nor a chapter', async () => {
    const { generating } = setup();
    await expect(generating.open('Reading notes')).rejects.toThrow(
      NotSparrableError,
    );
  });
});
