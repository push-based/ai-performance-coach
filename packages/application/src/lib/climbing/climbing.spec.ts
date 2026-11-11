import { CLIMB_STEPS, type ClimbSteps } from '@ai-coach/domain';
import { InMemoryPending, InMemoryVault } from '../../testing/in-memory.js';
import { VaultRefusedError } from '../errors.js';
import { JUDGE_FAILED } from '../history.js';
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
    spacedStyles: [],
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
    const climbing = new Climbing(
      await vaultWithConcepts(),
      new InMemoryPending(),
    );
    expect((await climbing.concept('Design tokens')).path).toBe(TOKENS);
    expect((await climbing.concept(TOKENS)).title).toBe('Design tokens');
    expect((await climbing.concept('c-1')).path).toBe(TOKENS);
  });

  it('passes on the vault refusing a note that is not a concept', async () => {
    const climbing = new Climbing(
      await vaultWithConcepts(),
      new InMemoryPending(),
    );
    await expect(climbing.concept('Design patterns')).rejects.toThrow(
      VaultRefusedError,
    );
  });

  it('lists every concept by title', async () => {
    const vault = await vaultWithConcepts();
    vault.climbs.reverse();
    const climbs = await new Climbing(vault, new InMemoryPending()).concepts();
    expect(climbs.map((c) => c.title)).toEqual(['Design tokens', 'Primitives']);
  });

  it('marks the concepts that have a round waiting for the judge', async () => {
    const vault = await vaultWithConcepts();
    const pending = new InMemoryPending();
    await pending.add({
      sessionId: 's-2',
      date: '2026-11-10',
      coachIds: ['c-1', 'c-9'],
    });
    const climbs = await new Climbing(vault, pending).concepts();
    expect(climbs.map((c) => [c.title, c.waitingForJudge])).toEqual([
      ['Design tokens', true],
      ['Primitives', false],
    ]);
  });

  it('locks Teach when the judge failed the latest round', async () => {
    const vault = await vaultWithConcepts();
    vault.climbs[0]!.teach = { ok: true };
    vault.climbs[0]!.spacedStyles = ['feynman', 'socratic'];
    await vault.record(
      {
        tier: 2,
        date: '2026-11-11',
        items: [
          {
            note: { path: TOKENS },
            challenge: 'What is a token?',
            answer: 'A named design decision.',
            verdict: 'fail',
            gaps: ['hand-waving'],
            nextReview: '2026-11-12',
          },
        ],
      },
      true,
    );
    const climbing = new Climbing(vault, new InMemoryPending());
    expect((await climbing.concept(TOKENS)).teach).toEqual({
      ok: false,
      reason: JUDGE_FAILED,
    });
  });

  it('keeps Teach closed until spaced passes in two styles', async () => {
    const vault = await vaultWithConcepts();
    vault.climbs[0]!.teach = { ok: true };
    vault.climbs[0]!.spacedStyles = ['feynman'];
    const climbing = new Climbing(vault, new InMemoryPending());
    expect((await climbing.concept(TOKENS)).teach.reason).toMatch(
      /2 different styles \(passed so far in feynman\)/,
    );
    vault.climbs[0]!.spacedStyles = ['feynman', 'devil'];
    expect((await climbing.concept(TOKENS)).teach).toEqual({ ok: true });
  });
});
