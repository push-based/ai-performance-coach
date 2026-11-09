import { CLIMB_STEPS, type ClimbSteps } from '@ai-coach/domain';
import { InMemoryVault } from '../../testing/in-memory.js';
import { VaultRefusedError } from '../errors.js';
import type { ConceptClimb } from '../ports/vault.js';
import { Climbing } from './climbing.js';

const TOKENS = '3.Resources/Concepts/Design tokens.md';
const PRIMITIVES = '3.Resources/Concepts/Primitives.md';

function climbOf(path: string, title: string): ConceptClimb {
  return {
    path,
    title,
    steps: Object.fromEntries(CLIMB_STEPS.map((s) => [s, null])) as ClimbSteps,
    stored: null,
    current: true,
    next: 'read',
    skipped: [],
    spacedPass: null,
    teach: { ok: false, reason: 'Teach needs a passed spaced review' },
  };
}

async function vaultWithConcepts(): Promise<InMemoryVault> {
  const vault = new InMemoryVault();
  vault.put(TOKENS, 'Tokens.');
  vault.put(PRIMITIVES, 'Primitives.');
  await vault.record(
    {
      tier: 1,
      date: '2026-11-10',
      items: [
        {
          note: { path: TOKENS },
          challenge: 'What is a token?',
          answer: 'A named design decision.',
          verdict: 'fail',
          gaps: [],
          nextReview: '2026-11-11',
        },
      ],
    },
    true,
  );
  vault.climbs.push(
    climbOf(TOKENS, 'Design tokens'),
    climbOf(PRIMITIVES, 'Primitives'),
  );
  return vault;
}

describe('Climbing', () => {
  it('asks the vault for one concept by title, path or coach_id', async () => {
    const climbing = new Climbing(await vaultWithConcepts());
    expect((await climbing.concept('Design tokens')).path).toBe(TOKENS);
    expect((await climbing.concept(TOKENS)).title).toBe('Design tokens');
    expect((await climbing.concept('c-1')).path).toBe(TOKENS);
  });

  it('passes on the vault refusing a note that is not a concept', async () => {
    const climbing = new Climbing(await vaultWithConcepts());
    await expect(climbing.concept('Design patterns')).rejects.toThrow(
      VaultRefusedError,
    );
  });

  it('lists every concept by title', async () => {
    const vault = await vaultWithConcepts();
    vault.climbs.reverse();
    const climbs = await new Climbing(vault).concepts();
    expect(climbs.map((c) => c.title)).toEqual(['Design tokens', 'Primitives']);
  });
});
