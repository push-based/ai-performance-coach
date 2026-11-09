import { stripVTControlCharacters } from 'node:util';
import {
  ElaborateSession,
  type NoteDetails,
  type PracticeDraft,
} from '@ai-coach/application';
import { sparringRules, type FollowUp } from '@ai-coach/domain';
import type { Coach } from './composition.js';
import { elaborate } from './elaborate.js';
import type { Terminal } from './terminal.js';

class ScriptedTerminal implements Terminal {
  readonly output: string[] = [];
  constructor(private readonly inputs: string[]) {}
  print(text = ''): void {
    this.output.push(text);
  }
  async ask(prompt: string): Promise<string | null> {
    this.output.push(prompt);
    return this.inputs.length ? this.inputs.shift()! : null;
  }
  text(): string {
    return stripVTControlCharacters(this.output.join('\n'));
  }
}

const TOKENS = '3.Resources/Concepts/Design tokens.md';
const CSS = '3.Resources/CSS/Custom properties.md';
const CHECKOUT = '1.Projects/Checkout/Checkout.md';

const NOTE = {
  path: TOKENS,
  title: 'Design tokens',
  bucket: 'resources',
  container: 'Concepts',
  coachId: null,
  mastery: 'unsparred',
  nextReview: null,
  body: 'Design tokens keep each decision in one named place.',
  sessions: [],
  raw: false,
  rawRole: null,
  chapter: null,
  concept: {
    assertions: ['Every other layer takes its values from tokens.'],
    buzzwords: [],
    passages: [],
    problems: [],
  },
  style: null,
} as NoteDetails;

function coachWith(followUps: (FollowUp | null)[], recorded: PracticeDraft[]) {
  const session = new ElaborateSession(
    {
      notes: {} as never,
      sessions: {
        record: async () => {
          throw new Error('not used');
        },
        tier2Payload: async () => {
          throw new Error('not used');
        },
        practise: async (draft: PracticeDraft, execute: boolean) => {
          if (execute) recorded.push(draft);
          return {
            executed: execute,
            sessionId: 's-1',
            warnings: [],
            items: [],
          };
        },
      },
      partner: {
        questions: async () => {
          throw new Error('not used');
        },
        followUp: async () => followUps.shift() ?? null,
      },
      rules: sparringRules(),
      clock: { today: () => '2026-11-10', now: () => '' },
    },
    NOTE,
    {
      why: 'Why name design values?',
      connect: 'What is this like?',
      apply: 'Where would you use it?',
    },
    [
      { path: CHECKOUT, title: 'Checkout' },
      { path: CSS, title: 'Custom properties' },
    ],
  );
  return {
    elaborating: () => ({ open: async () => session }),
  } as unknown as Coach;
}

describe('coach elaborate', () => {
  it('asks why, connect and apply, checks each answer, and appends them after a yes', async () => {
    const recorded: PracticeDraft[] = [];
    const term = new ScriptedTerminal([
      'It is tidy.',
      '',
      'Because a colour then changes in one place and every screen follows.',
      '',
      'Like CSS variables.',
      '',
      '2',
      '',
      'In the checkout buttons.',
      '',
      '',
      'the checkout button set',
      'At work.',
      '',
      'y',
    ]);
    await elaborate(coachWith([null, null, 'example'], recorded), term, [
      'Design tokens',
    ]);
    const text = term.text();
    expect(text).toContain('Give a reason');
    expect(text).toContain('Connect it to something outside this note');
    expect(text).toContain('coach> For example?');
    expect(recorded).toHaveLength(1);
    const answers =
      recorded[0]!.kind === 'elaborate' ? recorded[0]!.items[0]!.answers : [];
    expect(answers.map((a) => a.kind)).toEqual(['why', 'connect', 'apply']);
    expect(answers[0]!.answer).toBe(
      'It is tidy.\nBecause a colour then changes in one place and every screen follows.',
    );
    expect(answers[1]!.links).toEqual([CSS]);
    expect(answers[2]).toMatchObject({
      answer: 'In the checkout buttons.\nAt work.',
      named: 'the checkout button set',
    });
  });

  it('records nothing when the learner quits', async () => {
    const recorded: PracticeDraft[] = [];
    const term = new ScriptedTerminal(['/quit']);
    await elaborate(coachWith([], recorded), term, ['Design tokens']);
    expect(term.text()).toContain('Nothing was recorded.');
    expect(recorded).toEqual([]);
  });
});
