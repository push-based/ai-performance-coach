import {
  CLIMB_STEPS,
  DEFAULT_LADDER,
  sparringRules,
  type ClimbSteps,
} from '@ai-coach/domain';
import {
  FixedClock,
  InMemoryLibrary,
  InMemoryVault,
  ScriptedPartner,
  ScriptedTeachPartner,
} from '../../testing/in-memory.js';
import { NotSparrableError, UnavailableError } from '../errors.js';
import { JUDGE_FAILED } from '../history.js';
import { Teaching } from './teaching.js';

const TOKENS = '3.Resources/Concepts/Design tokens.md';
const ASSERTIONS = [
  'Tokens are the named values of the system.',
  'Every other layer takes its values from tokens.',
];

function setup(open = true) {
  const vault = new InMemoryVault();
  vault.put(
    TOKENS,
    'NOTE-BODY-MARKER design tokens keep every value in one place.',
    {
      rawRole: null,
      concept: {
        assertions: ASSERTIONS,
        buzzwords: [],
        passages: [],
        problems: [],
      },
    },
  );
  vault.climbs.push({
    path: TOKENS,
    title: 'Design tokens',
    steps: Object.fromEntries(CLIMB_STEPS.map((s) => [s, null])) as ClimbSteps,
    stored: null,
    current: true,
    next: 'teach',
    skipped: [],
    spacedPass: open ? { date: '2026-11-10', evidence: 's-2' } : null,
    teach: open
      ? { ok: true }
      : { ok: false, reason: 'Teach needs a passed spaced review.' },
  });
  const teacher = new ScriptedTeachPartner();
  const checker = new ScriptedPartner();
  const library = new InMemoryLibrary(vault);
  const teaching = new Teaching({
    notes: vault,
    sessions: vault,
    library,
    teacher,
    checker,
    rules: sparringRules({ buzzwords: ['synergy'] }),
    ladder: DEFAULT_LADDER,
    clock: new FixedClock('2026-11-17'),
  });
  return { vault, teacher, checker, library, teaching };
}

async function round(
  vault: InMemoryVault,
  tier: 1 | 2,
  verdict: 'pass' | 'fail',
) {
  await vault.record(
    {
      tier,
      date: '2026-11-16',
      items: [
        {
          note: { path: TOKENS },
          challenge: 'What is a token?',
          answer: 'A named value.',
          verdict,
          gaps: [],
          nextReview: '2026-11-30',
        },
      ],
    },
    true,
  );
}

describe('Teaching', () => {
  it('refuses a concept whose latest round the judge failed, until it is passed again', async () => {
    const { vault, teacher, teaching } = setup();
    await round(vault, 1, 'pass');
    await round(vault, 2, 'fail');
    await expect(teaching.open(TOKENS)).rejects.toThrow(
      new NotSparrableError(JUDGE_FAILED),
    );
    await round(vault, 1, 'pass');
    teacher.replies.push({ assertion: 1, text: "primitives don't use tokens" });
    await expect(teaching.open(TOKENS)).resolves.toBeDefined();
  });

  it('refuses a concept without a passed spaced review, with the vault reason', async () => {
    const { teaching } = setup(false);
    await expect(teaching.open('Design tokens')).rejects.toThrow(
      new NotSparrableError('Teach needs a passed spaced review.'),
    );
  });

  it('gives the student one drafted misconception, and replaces one that copies the note', async () => {
    const { teacher, teaching } = setup();
    teacher.replies.push(
      { assertion: 0, text: 'design tokens keep every value in one place' },
      { assertion: 1, text: "primitives don't use tokens" },
    );
    const session = await teaching.open(TOKENS);
    expect(session.lesson.misconception).toEqual({
      assertion: 1,
      text: "primitives don't use tokens",
    });
    expect(teacher.requests[0]!.assertions).toEqual(ASSERTIONS);
    expect(teacher.requests[1]!.rejected).toHaveLength(1);
    expect(session.opening).toBe(
      "Hi! I don't know anything about Design tokens. Can you teach me?",
    );
  });

  it('falls back to a fixed misconception when the model is not running', async () => {
    const { teacher, teaching } = setup();
    teacher.replies.push(new UnavailableError('ollama', 'down'));
    const session = await teaching.open(TOKENS);
    expect(session.lesson.misconception.assertion).toBe(0);
  });

  it('runs a lesson to a pass, keeps the note out of every student turn, and records it', async () => {
    const { vault, teacher, checker, library, teaching } = setup();
    teacher.replies.push({ assertion: 1, text: "primitives don't use tokens" });
    checker.covered.push([...ASSERTIONS]);
    const session = await teaching.open(TOKENS);
    expect(
      session.say('Every layer above takes its values from the tokens.').kind,
    ).toBe('misconception');
    session.say('No, primitives read every colour from the tokens.');
    session.say('For example, the button takes brand blue from a token.');
    session.finish();
    session.explainBack();
    const plan = await session.conclude();
    expect(plan.verdict.verdict).toBe('pass');
    const item = plan.draft.kind === 'teach' ? plan.draft.items[0]! : null;
    expect(item).toMatchObject({
      corrected: true,
      unresolvedTerms: [],
      verdict: 'pass',
      nextReview: '2026-11-20',
    });
    for (const turn of item!.turns.filter((t) => t.role === 'student'))
      expect(turn.text).not.toContain('NOTE-BODY-MARKER');
    expect(JSON.stringify(checker.recallRequests)).not.toContain(
      'NOTE-BODY-MARKER',
    );
    const recorded = await session.record(plan);
    expect(vault.practices.map((p) => p.draft.kind)).toEqual(['teach']);
    await session.guideline(
      recorded.sessionId,
      'Tokens guideline',
      '1.Projects/Checkout',
      true,
    );
    expect(library.guidelines[0]).toMatchObject({
      input: { note: TOKENS, title: 'Tokens guideline' },
      execute: true,
    });
  });

  it('fails a lesson that leaves the misconception standing, and lists what was missed', async () => {
    const { teacher, checker, teaching } = setup();
    teacher.replies.push({ assertion: 1, text: "primitives don't use tokens" });
    checker.covered.push([ASSERTIONS[0]!]);
    const session = await teaching.open(TOKENS);
    session.say('Tokens are just CSS variables, it is all synergy.');
    session.say('It just means it all fits.');
    session.finish();
    session.say('Sure.');
    expect(session.explainBack()).toContain("primitives don't use tokens");
    const plan = await session.conclude();
    expect(plan.verdict.verdict).toBe('fail');
    expect(plan.verdict.gaps).toEqual([
      "You left the student believing: primitives don't use tokens",
      `You did not teach: ${ASSERTIONS[1]}`,
    ]);
  });
});
