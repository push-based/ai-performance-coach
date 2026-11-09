import { NEUTRAL_PROBE, sparringRules } from '@ai-coach/domain';
import { ScriptedPartner } from '../../testing/in-memory.js';
import { ChallengeLeakError, UnavailableError } from '../errors.js';
import { SparringConversation } from './conversation.js';

const NOTE = {
  title: 'Event loop',
  body: 'Microtasks always drain completely before the event loop picks the next macrotask.',
};
const REF = {
  note: NOTE,
  text: NOTE.body,
  assertions: [],
  buzzwords: [],
  passages: [],
  sources: [],
};
const CHALLENGE = 'What decides which queued callback runs next, and why?';
const LEAK =
  'Why do microtasks always drain completely before the event loop moves on?';

const conclude = (verdict: 'pass' | 'fail', gaps: string[] = []) => ({
  action: 'conclude' as const,
  verdict,
  gaps,
  feedback: 'ok',
});

describe('SparringConversation', () => {
  it('runs challenge, probe and verdict through the partner port', async () => {
    const partner = new ScriptedPartner();
    partner.challenges.push(CHALLENGE);
    partner.turns.push(
      { action: 'probe', question: 'What would starve?' },
      conclude('pass'),
    );
    const c = new SparringConversation(
      partner,
      REF,
      sparringRules(),
      'feynman',
    );

    expect(await c.start()).toEqual({ kind: 'challenge', question: CHALLENGE });
    expect(await c.answer('Microtasks first.')).toEqual({
      kind: 'probe',
      question: 'What would starve?',
    });
    expect(await c.answer('Timers.')).toMatchObject({
      kind: 'verdict',
      verdict: 'pass',
    });
    expect(c.result().answer).toBe(
      'Microtasks first.\n\nFollow-up: What would starve?\nAnswer: Timers.',
    );
    expect(partner.turnRequests[0]).toMatchObject({
      followUpsLeft: 3,
      exchanges: [{ answer: 'Microtasks first.' }],
    });
  });

  it('asks again with the rejected challenge when one quotes the note, and gives up after the limit', async () => {
    const partner = new ScriptedPartner();
    partner.challenges.push(LEAK, CHALLENGE);
    const c = new SparringConversation(
      partner,
      REF,
      sparringRules(),
      'feynman',
    );
    await c.start();
    expect(partner.challengeRequests.map((r) => r.rejected)).toEqual([
      [],
      [LEAK],
    ]);

    const leaky = new ScriptedPartner();
    leaky.challenges.push(LEAK, LEAK);
    await expect(
      new SparringConversation(
        leaky,
        REF,
        sparringRules({ maxChallengeAttempts: 2 }),
        'feynman',
      ).start(),
    ).rejects.toBeInstanceOf(ChallengeLeakError);
  });

  it('replaces a follow-up that keeps quoting the note with a neutral probe', async () => {
    const partner = new ScriptedPartner();
    partner.challenges.push(CHALLENGE);
    partner.turns.push(
      { action: 'probe', question: LEAK },
      { action: 'probe', question: LEAK },
    );
    const c = new SparringConversation(
      partner,
      REF,
      sparringRules(),
      'feynman',
    );
    await c.start();

    expect(await c.answer('Microtasks.')).toEqual({
      kind: 'probe',
      question: NEUTRAL_PROBE,
    });
    expect(partner.turnRequests[1]!.rejected).toEqual([LEAK]);
  });

  it('handles buzzwords locally without calling the partner', async () => {
    const partner = new ScriptedPartner();
    partner.challenges.push(CHALLENGE);
    const c = new SparringConversation(
      partner,
      REF,
      sparringRules(),
      'feynman',
    );
    await c.start();

    expect(await c.answer('It just works, magic.')).toMatchObject({
      kind: 'rephrase',
      buzzwords: ['magic', 'just works'],
    });
    expect(partner.turnRequests).toEqual([]);
  });

  it('concludes when the follow-ups run out even if the partner wants to probe', async () => {
    const partner = new ScriptedPartner();
    partner.challenges.push(CHALLENGE);
    partner.turns.push(
      { action: 'probe', question: 'Why?' },
      { action: 'probe', question: 'And?' },
    );
    const c = new SparringConversation(
      partner,
      REF,
      sparringRules({ maxFollowUps: 1 }),
      'feynman',
    );
    await c.start();
    await c.answer('a');
    expect(await c.answer('b')).toMatchObject({
      kind: 'verdict',
      verdict: 'fail',
    });
    expect(partner.turnRequests[1]!.followUpsLeft).toBe(0);
  });

  it('keeps the answer pending when the partner is unavailable, so it can be sent again', async () => {
    const partner = new ScriptedPartner();
    partner.challenges.push(CHALLENGE);
    partner.turns.push(
      new UnavailableError('sparring partner', 'Ollama is down'),
      conclude('pass'),
    );
    const c = new SparringConversation(
      partner,
      REF,
      sparringRules(),
      'feynman',
    );
    await c.start();

    await expect(c.answer('Microtasks first.')).rejects.toBeInstanceOf(
      UnavailableError,
    );
    expect(await c.answer('Microtasks first.')).toMatchObject({
      kind: 'verdict',
    });
    expect(c.result().exchanges).toHaveLength(1);
  });

  it('keeps the dialogue on the focus the partner named, in every later request', async () => {
    const partner = new ScriptedPartner();
    partner.challenges.push({
      focus: 'Microtasks drain before the next task.',
      scope: ['Microtask ordering', ' '],
      jargon: [],
      challenge: CHALLENGE,
    });
    partner.turns.push(
      { action: 'probe', question: LEAK },
      { action: 'probe', question: 'Why first?' },
      conclude('pass'),
    );
    const c = new SparringConversation(
      partner,
      REF,
      sparringRules(),
      'feynman',
    );
    await c.start();
    await c.answer('Microtasks.');
    await c.answer('Because the queue drains.');
    expect(partner.turnRequests.map((r) => r.scope)).toEqual([
      ['Microtask ordering'],
      ['Microtask ordering'],
      ['Microtask ordering'],
    ]);
    expect(partner.turnRequests.map((r) => r.focus)).toEqual([
      'Microtasks drain before the next task.',
      'Microtasks drain before the next task.',
      'Microtasks drain before the next task.',
    ]);
  });

  it('bans the jargon the partner names for a feynman round', async () => {
    const partner = new ScriptedPartner();
    partner.challenges.push({
      focus: 'F',
      scope: [],
      jargon: ['macrotask'],
      challenge: CHALLENGE,
    });
    const c = new SparringConversation(
      partner,
      REF,
      sparringRules(),
      'feynman',
    );
    await c.start();
    expect(await c.answer('The macrotask waits.')).toMatchObject({
      kind: 'rephrase',
      buzzwords: ['macrotask'],
    });
    expect(partner.challengeRequests[0]!.style).toBe('feynman');
  });

  it('spars a concept against its assertions, banning its buzzwords in feynman and grounding gaps in it', async () => {
    const concept = {
      note: {
        title: 'Event loop',
        body: 'Microtasks drain before the next task.',
      },
      text: 'Microtasks drain before the next task. Timers wait for the microtask queue.',
      assertions: ['Microtasks drain before the next task.'],
      buzzwords: ['event loop'],
      passages: [],
      sources: [],
    };
    const partner = new ScriptedPartner();
    partner.challenges.push(CHALLENGE);
    partner.turns.push({
      action: 'conclude',
      verdict: 'fail',
      gaps: [
        'You did not explain why timers wait for the microtask queue.',
        'You did not explain quantum lattices.',
      ],
      feedback: 'Close.',
    });
    const c = new SparringConversation(
      partner,
      concept,
      sparringRules(),
      'feynman',
    );
    await c.start();
    expect(partner.challengeRequests[0]!.assertions).toEqual([
      'Microtasks drain before the next task.',
    ]);
    expect(await c.answer('The event loop does it.')).toMatchObject({
      kind: 'rephrase',
      buzzwords: ['event loop'],
    });
    expect(
      await c.answer('Promise callbacks run before timer callbacks.'),
    ).toMatchObject({
      kind: 'verdict',
      verdict: 'fail',
      gaps: [
        'You did not explain why timers wait for the microtask queue.',
        'Leaned on buzzwords instead of mechanism: event loop',
      ],
    });
  });

  it('keeps a fail failing with its closest gap when no gap is grounded in the note', async () => {
    const concept = {
      note: {
        title: 'Event loop',
        body: 'Microtasks drain before the next task.',
      },
      text: 'Microtasks drain before the next task. Timers wait for the microtask queue.',
      assertions: ['Microtasks drain before the next task.'],
      buzzwords: [],
      passages: [],
      sources: [],
    };
    const partner = new ScriptedPartner();
    partner.challenges.push(CHALLENGE);
    partner.turns.push({
      action: 'conclude',
      verdict: 'fail',
      gaps: [
        'You did not explain quantum lattices.',
        'The transcript does not explain the purpose of timers.',
      ],
      feedback: 'Close.',
    });
    const c = new SparringConversation(
      partner,
      concept,
      sparringRules(),
      'cornell',
    );
    await c.start();
    expect(await c.answer('Promises go first.')).toMatchObject({
      kind: 'verdict',
      verdict: 'fail',
      gaps: ['The transcript does not explain the purpose of timers.'],
    });
  });
});

describe('SparringConversation with a free-recall opening', () => {
  const ASSERTIONS = [
    'Microtasks drain completely before the next macrotask.',
    'A long chain of microtasks can starve rendering and timers.',
  ];
  const CONCEPT = { ...REF, assertions: ASSERTIONS };
  const RECALL =
    'Promise callbacks run before the next timer callback, all of them, every time the stack is empty.';

  const open = (partner: ScriptedPartner, reference = CONCEPT) =>
    new SparringConversation(partner, reference, sparringRules(), 'feynman', {
      freeRecall: true,
    });

  it('opens with the recall question, without asking the model for a challenge', async () => {
    const partner = new ScriptedPartner();
    const c = open(partner);
    expect(await c.start()).toEqual({
      kind: 'challenge',
      question:
        'Without looking: write down everything you remember about Event loop.',
    });
    expect(c.freeRecall).toBe(true);
    expect(partner.challengeRequests).toEqual([]);
  });

  it('asks follow-ups only about the assertions the recall missed', async () => {
    const partner = new ScriptedPartner();
    partner.covered.push([ASSERTIONS[0]!]);
    partner.turns.push({ action: 'probe', question: 'What could starve?' });
    const c = open(partner);
    await c.start();
    expect(await c.answer(RECALL)).toEqual({
      kind: 'probe',
      question: 'What could starve?',
    });
    expect(partner.recallRequests[0]).toMatchObject({
      assertions: ASSERTIONS,
      exchanges: [{ answer: RECALL }],
    });
    expect(partner.turnRequests[0]).toMatchObject({
      assertions: [ASSERTIONS[1]],
      scope: [ASSERTIONS[1]],
    });
  });

  it('passes at once when the recall covers every assertion', async () => {
    const partner = new ScriptedPartner();
    partner.covered.push([...ASSERTIONS]);
    const c = open(partner);
    await c.start();
    expect(await c.answer(RECALL)).toMatchObject({
      kind: 'verdict',
      verdict: 'pass',
      gaps: [],
    });
    expect(partner.turnRequests).toEqual([]);
  });

  it('meets "I know this" with one neutral probe and no hint, then scores both answers', async () => {
    const partner = new ScriptedPartner();
    partner.covered.push([]);
    partner.turns.push(conclude('fail', ['You did not explain: starving']));
    const c = open(partner);
    await c.start();
    expect(await c.answer('I know this.')).toEqual({
      kind: 'probe',
      question: NEUTRAL_PROBE,
    });
    await c.answer('Still nothing much.');
    expect(partner.recallRequests).toHaveLength(1);
    expect(partner.recallRequests[0]!.exchanges.map((e) => e.answer)).toEqual([
      'I know this.',
      'Still nothing much.',
    ]);
  });

  it('lets the learner answer the recall again when the check fails', async () => {
    const partner = new ScriptedPartner();
    partner.covered.push(new Error('model down'), [...ASSERTIONS]);
    const c = open(partner);
    await c.start();
    await expect(c.answer(RECALL)).rejects.toThrow('model down');
    expect(await c.answer(RECALL)).toMatchObject({ verdict: 'pass' });
  });

  it('opens with a normal challenge on a note without core assertions', async () => {
    const partner = new ScriptedPartner();
    partner.challenges.push(CHALLENGE);
    const c = open(partner, REF);
    expect(await c.start()).toEqual({ kind: 'challenge', question: CHALLENGE });
    expect(c.freeRecall).toBe(false);
  });
});
