import { sparringRules, type CoachingStyle } from '@ai-coach/domain';
import {
  FixedClassifier,
  FixedClock,
  InMemoryVault,
  ScriptedElaborationPartner,
  unusable,
} from '../../testing/in-memory.js';
import {
  NotSparrableError,
  UnavailableError,
  UnusableReplyError,
} from '../errors.js';
import { Elaborating } from './elaborating.js';

const TOKENS = '3.Resources/Concepts/Design tokens.md';
const CSS = '3.Resources/CSS/Custom properties.md';
const CHECKOUT = '1.Projects/Checkout/Checkout.md';
const A = 'Every other layer takes its values from tokens.';

const WHY =
  'Because a colour then changes in one place, every screen follows without a hunt.';
const CONNECT =
  'It is like [[Custom properties]] in CSS, one name for one value.';
const APPLY = 'In [[Checkout]], where the buttons still hard-code blue.';

function setup(
  classifier:
    | FixedClassifier
    | { classify(): Promise<CoachingStyle> } = new FixedClassifier('feynman'),
  noteStyle?: CoachingStyle,
) {
  const vault = new InMemoryVault();
  vault.put(TOKENS, 'Design tokens keep each decision in one named place.', {
    rawRole: null,
    concept: {
      assertions: [A],
      buzzwords: ['synergy'],
      passages: [],
      problems: [],
    },
    ...(noteStyle ? { style: noteStyle } : {}),
  });
  vault.put(CSS, 'Custom properties.');
  vault.put(CHECKOUT, 'Checkout.');
  vault.put('3.Resources/0.Raw/Book/Chapter.md', 'Raw.', {
    rawRole: 'chapter',
  });
  const partner = new ScriptedElaborationPartner();
  const elaborating = new Elaborating({
    notes: vault,
    sessions: vault,
    partner,
    classifier,
    rules: sparringRules(),
    clock: new FixedClock('2026-11-10'),
  });
  return { vault, partner, classifier, elaborating };
}

const QUESTIONS = {
  why: 'Why keep design values behind names at all?',
  connect: 'What do you already know that works like this?',
  apply: 'Where would you put this to work this month?',
};

describe('Elaborating', () => {
  it('asks the model for three questions and offers other notes to link, never raw text or itself', async () => {
    const { partner, elaborating } = setup();
    partner.questionReplies.push(QUESTIONS);
    const session = await elaborating.open('Design tokens');
    expect(session.questions).toEqual(QUESTIONS);
    expect(session.candidates.map((c) => c.path)).toEqual([CHECKOUT, CSS]);
  });

  it('replaces a question that gives the answer away, and falls back when the model fails', async () => {
    const { partner, elaborating } = setup();
    partner.questionReplies.push(
      {
        ...QUESTIONS,
        why: 'So every other layer takes its values from tokens, why?',
      },
      {
        ...QUESTIONS,
        why: 'Every other layer takes its values from tokens: what breaks?',
      },
    );
    const session = await elaborating.open(TOKENS);
    expect(session.questions.why).toBe(
      'Why is Design tokens built this way? What would break if it were not?',
    );
    expect(partner.questionRequests[1]!.rejected).toHaveLength(1);

    const failing = setup();
    failing.partner.questionReplies.push(
      new UnusableReplyError('elaboration partner', 'bad'),
    );
    expect((await failing.elaborating.open(TOKENS)).questions.connect).toBe(
      'What everyday thing is Design tokens like? Explain it without jargon.',
    );

    const offline = setup();
    offline.partner.questionReplies.push(
      new UnavailableError('ollama', 'not running'),
    );
    expect((await offline.elaborating.open(TOKENS)).questions.apply).toBe(
      'Where would you use Design tokens in your own work this month?',
    );
  });

  it('checks each answer: one rephrase for a buzzword, no copying, and the rule of its kind', async () => {
    const { partner, elaborating } = setup();
    partner.questionReplies.push(QUESTIONS);
    const session = await elaborating.open(TOKENS);
    expect(
      session.check('why', 'Pure synergy, so it works well everywhere.', []),
    ).toEqual({
      kind: 'rephrase',
      buzzwords: ['synergy'],
    });
    expect(session.check('why', 'It is tidy.', [])).toMatchObject({
      kind: 'incomplete',
    });
    expect(
      session.check(
        'connect',
        'Design tokens keep each decision in one named place.',
        [],
      ),
    ).toMatchObject({ kind: 'copied' });
    expect(session.check('connect', 'Like a style guide.', [])).toMatchObject({
      kind: 'incomplete',
    });
    expect(
      session.check(
        'connect',
        'Like itself.',
        session.links('[[Design tokens]]'),
      ),
    ).toMatchObject({
      kind: 'incomplete',
      message: expect.stringMatching(/does not count/),
    });
    expect(session.check('connect', CONNECT, session.links(CONNECT))).toEqual({
      kind: 'ok',
    });
  });

  it('resolves links by title, path or number from the offered list', async () => {
    const { partner, elaborating } = setup();
    partner.questionReplies.push(QUESTIONS);
    const session = await elaborating.open(TOKENS);
    expect(session.links(APPLY)).toEqual([CHECKOUT]);
    expect(session.links('See [[3.Resources/CSS/Custom properties]].')).toEqual(
      [CSS],
    );
    expect(session.links('Nothing linked.', [2])).toEqual([CSS]);
    expect(session.links('[[Nowhere]]', [9])).toEqual([]);
  });

  it('asks one follow-up on connect and apply, and up to two on why, never the same one twice except "Why?"', async () => {
    const { partner, elaborating } = setup();
    partner.questionReplies.push(QUESTIONS);
    partner.followUps.push('example', 'why', 'why', 'assumption', 'example');
    const session = await elaborating.open(TOKENS);
    expect(await session.followUp('apply', 'Somewhere.')).toBe('For example?');
    expect(await session.followUp('apply', 'Somewhere else.')).toBeNull();
    expect(await session.followUp('why', 'Because.')).toBe('Why?');
    expect(await session.followUp('why', 'Because, again.')).toBe('Why?');
    expect(await session.followUp('why', 'Because, thrice.')).toBeNull();
    expect(await session.followUp('connect', 'Like CSS.')).toBe(
      'What has to be true for that to work?',
    );
    expect(partner.followUpRequests.map((r) => r.asked)).toEqual([
      [],
      [],
      ['why'],
      [],
    ]);
  });

  it('drops a repeated "For example?" or assumption follow-up', async () => {
    const { partner, elaborating } = setup();
    partner.questionReplies.push(QUESTIONS);
    partner.followUps.push('assumption', 'assumption');
    const session = await elaborating.open(TOKENS);
    expect(await session.followUp('why', 'Because.')).toBe(
      'What has to be true for that to work?',
    );
    expect(await session.followUp('why', 'Because it holds.')).toBeNull();
  });

  it("words the questions in the note's style: --style, then frontmatter, then the classifier", async () => {
    const auto = setup(new FixedClassifier('cornell'));
    auto.partner.questionReplies.push(unusable());
    const cornell = await auto.elaborating.open(TOKENS);
    expect(cornell.style).toBe('cornell');
    expect(cornell.questions.connect).toBe(
      'Who else argues something close to Design tokens, and how do they differ?',
    );
    expect(auto.partner.questionRequests[0]!.style).toBe('cornell');

    const unused = new FixedClassifier('cornell');
    const framed = setup(unused, 'devil');
    framed.partner.questionReplies.push(unusable());
    expect((await framed.elaborating.open(TOKENS)).style).toBe('devil');
    expect(unused.classified).toEqual([]);

    const asked = setup(new FixedClassifier('cornell'), 'devil');
    asked.partner.questionReplies.push(unusable());
    const socratic = await asked.elaborating.open(TOKENS, 'socratic');
    expect(socratic.style).toBe('socratic');
    expect(socratic.questions.connect).toBe(
      'What is Design tokens close to but unlike, and where does it stop holding?',
    );
  });

  it('falls back to feynman when the classifier cannot be reached', async () => {
    const offline = setup({
      classify: async () => {
        throw new UnavailableError('ollama', 'not running');
      },
    });
    offline.partner.questionReplies.push(unusable());
    expect((await offline.elaborating.open(TOKENS)).style).toBe('feynman');
  });

  it('records the three answers only after confirmation', async () => {
    const { vault, partner, elaborating } = setup();
    partner.questionReplies.push(QUESTIONS);
    const session = await elaborating.open(TOKENS);
    const plan = await session.plan([
      {
        kind: 'apply',
        question: '',
        answer: APPLY,
        links: session.links(APPLY),
      },
      { kind: 'why', question: '', answer: WHY, links: [] },
      {
        kind: 'connect',
        question: '',
        answer: CONNECT,
        links: session.links(CONNECT),
      },
    ]);
    expect(plan.draft).toMatchObject({
      kind: 'elaborate',
      date: '2026-11-10',
      items: [
        {
          note: { path: TOKENS },
          answers: [
            { kind: 'why', question: QUESTIONS.why, answer: WHY },
            { kind: 'connect', question: QUESTIONS.connect, links: [CSS] },
            { kind: 'apply', question: QUESTIONS.apply, links: [CHECKOUT] },
          ],
        },
      ],
    });
    expect(vault.practices).toEqual([]);
    await session.record(plan);
    expect(vault.practices).toHaveLength(1);
  });

  it('refuses a plan missing a kind or breaking its rule, and a note that is not a concept', async () => {
    const { partner, elaborating } = setup();
    partner.questionReplies.push(QUESTIONS);
    const session = await elaborating.open(TOKENS);
    await expect(
      session.plan([{ kind: 'why', question: '', answer: WHY, links: [] }]),
    ).rejects.toThrow(/connect question exactly once/);
    await expect(
      session.plan([
        { kind: 'why', question: '', answer: WHY, links: [] },
        {
          kind: 'connect',
          question: '',
          answer: 'Like a guide.',
          links: [TOKENS],
        },
        { kind: 'apply', question: '', answer: APPLY, links: [CHECKOUT] },
      ]),
    ).rejects.toThrow(NotSparrableError);
    await expect(elaborating.open(CSS)).rejects.toThrow(NotSparrableError);
  });
});
