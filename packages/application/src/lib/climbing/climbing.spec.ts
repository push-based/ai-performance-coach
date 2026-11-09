import { InMemoryVault } from '../../testing/in-memory.js';
import { NotFoundError, NotSparrableError } from '../errors.js';
import { Climbing } from './climbing.js';

const TOKENS =
  '3.Resources/Concepts/Design System Architecture/Design tokens.md';
const PRIMITIVES =
  '3.Resources/Concepts/Design System Architecture/Primitives.md';
const CONCEPT = {
  assertions: ['Tokens name every design decision once.'],
  buzzwords: [],
  passages: [],
  problems: [],
};

async function spar(
  vault: InMemoryVault,
  path: string,
  date: string,
  verdict: 'pass' | 'fail',
) {
  await vault.record(
    {
      tier: 1,
      date,
      items: [
        {
          note: { path },
          challenge: 'What is a token?',
          answer: 'A named decision.',
          verdict,
          gaps: [],
          nextReview: date,
        },
      ],
    },
    true,
  );
}

function vaultWithConcepts(): InMemoryVault {
  const vault = new InMemoryVault();
  vault.put(TOKENS, 'Tokens.', {
    rawRole: null,
    concept: CONCEPT,
    climb: { read: '2026-11-09', group: '2026-11-09', teach: '2026-11-10' },
  });
  vault.put(PRIMITIVES, 'Primitives.', { rawRole: null, concept: CONCEPT });
  vault.put('3.Resources/Reading notes.md', 'Notes.');
  vault.put(
    '3.Resources/0.Raw/Design System Architecture/Chapter 1.md',
    'Raw.',
    { rawRole: 'chapter', concept: CONCEPT },
  );
  return vault;
}

describe('Climbing', () => {
  it('finds a concept by title, path or coach_id and builds its climb', async () => {
    const vault = vaultWithConcepts();
    await spar(vault, TOKENS, '2026-11-10', 'fail');
    const climbing = new Climbing(vault);

    const byTitle = await climbing.concept('design tokens');
    expect(byTitle.path).toBe(TOKENS);
    expect(byTitle.climb.done.map((r) => [r.step, r.evidence])).toEqual([
      ['read', TOKENS],
      ['group', TOKENS],
      ['retrieve', 's-2'],
    ]);
    expect(byTitle.next).toBe('generate');
    expect(byTitle.skipped).toEqual(['generate']);
    expect(byTitle.teach.ok).toBe(false);

    expect((await climbing.concept(TOKENS)).title).toBe('Design tokens');
    expect((await climbing.concept('c-1')).path).toBe(TOKENS);
  });

  it('unlocks teach after a passed review on a later day', async () => {
    const vault = vaultWithConcepts();
    await spar(vault, TOKENS, '2026-11-10', 'fail');
    await spar(vault, TOKENS, '2026-11-11', 'pass');
    const climb = await new Climbing(vault).concept('Design tokens');
    expect(climb.teach).toEqual({ ok: true });
    expect(climb.climb.done.map((r) => r.step)).toEqual([
      'read',
      'group',
      'retrieve',
      'space',
    ]);
  });

  it('refuses a note that is not a concept, and a name it cannot find', async () => {
    const climbing = new Climbing(vaultWithConcepts());
    await expect(climbing.concept('Reading notes')).rejects.toThrow(
      NotSparrableError,
    );
    await expect(climbing.concept('Design patterns')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('lists every concept note outside the raw material, by title', async () => {
    const climbs = await new Climbing(vaultWithConcepts()).concepts();
    expect(climbs.map((c) => c.title)).toEqual(['Design tokens', 'Primitives']);
    expect(climbs[1]!.next).toBe('read');
  });
});
