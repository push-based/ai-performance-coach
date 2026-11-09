import { stripVTControlCharacters } from 'node:util';
import { attempt, type MarkedAssertion } from '@ai-coach/domain';
import type { Coach } from './composition.js';
import { generate } from './generate.js';
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

const A = 'Tokens name each design decision once.';
const B = 'Primitives read tokens, never raw values.';

function coachWith(
  mode: 'concept' | 'chapter',
  log: { submitted: string[]; planned: MarkedAssertion[][]; recorded: number },
  unsupported: string[] = [],
): Coach {
  let revealed = false;
  const session = {
    mode,
    note: {
      title: 'Design tokens',
      path: '3.Resources/Concepts/Design tokens.md',
    },
    shown: ['Design tokens'],
    prompt: 'Before you see the note: explain "Design tokens".',
    submit: (text: string) => {
      const made = attempt(text);
      log.submitted.push(made.answer);
      return made;
    },
    reveal: () => {
      revealed = true;
      return mode === 'concept' ? [A, B] : [];
    },
    correctionProblem: (correction: string) =>
      correction.includes('raw values') ? 'Put it in your own words' : null,
    unsupported: async () => unsupported,
    plan: async (_points: string[], marks: MarkedAssertion[]) => {
      log.planned.push(marks);
      return {
        draft: { kind: 'generate', items: [{ nextReview: '2026-11-11' }] },
        preview: { sessionId: 's-1', warnings: [], executed: false, items: [] },
        counts: revealed,
      };
    },
    record: async () => {
      log.recorded++;
      return { sessionId: 's-1', warnings: [], executed: true, items: [] };
    },
  };
  return {
    generating: () => ({ open: async () => session }),
  } as unknown as Coach;
}

const ATTEMPT =
  'I think tokens are named colours and sizes the whole system reads from one place.';

describe('coach generate', () => {
  it('takes an attempt of ten words, reveals, marks, corrects and records', async () => {
    const log = {
      submitted: [] as string[],
      planned: [] as MarkedAssertion[][],
      recorded: 0,
    };
    const term = new ScriptedTerminal([
      'tokens are variables',
      '',
      ATTEMPT,
      '',
      'g',
      'w',
      'Primitives read tokens, never raw values.',
      'A primitive takes every colour from a token.',
      'y',
    ]);
    await generate(coachWith('concept', log), term, ['Design tokens']);
    const text = term.text();
    expect(text).toContain('An attempt is at least 10 words');
    expect(text.indexOf('Your attempt is saved')).toBeLessThan(text.indexOf(A));
    expect(text).toContain('Put it in your own words');
    expect(log.submitted).toEqual([ATTEMPT]);
    expect(log.planned[0]).toEqual([
      { assertion: A, mark: 'got it' },
      {
        assertion: B,
        mark: 'wrong',
        correction: 'A primitive takes every colour from a token.',
      },
    ]);
    expect(text).toContain('First review on 2026-11-11.');
    expect(log.recorded).toBe(1);
  });

  it('turns a flagged "got it" into missed unless the learner keeps it', async () => {
    const log = {
      submitted: [] as string[],
      planned: [] as MarkedAssertion[][],
      recorded: 0,
    };
    const term = new ScriptedTerminal([ATTEMPT, '', 'g', 'g', 'n', 'n']);
    await generate(coachWith('concept', log, [B]), term, ['Design tokens']);
    expect(term.text()).toContain(`Your attempt does not seem to say: "${B}"`);
    expect(log.planned[0]).toEqual([
      { assertion: A, mark: 'got it' },
      { assertion: B, mark: 'missed' },
    ]);
    expect(log.recorded).toBe(0);
  });

  it('asks for the chapter points after the reading', async () => {
    const log = {
      submitted: [] as string[],
      planned: [] as MarkedAssertion[][],
      recorded: 0,
    };
    const term = new ScriptedTerminal([
      '/idk',
      '',
      '',
      'Tokens come first',
      '',
      'm',
      'y',
    ]);
    await generate(coachWith('chapter', log), term, ['Chapter 1']);
    expect(term.text()).toContain("Name the chapter's main points");
    expect(log.planned[0]).toEqual([
      { assertion: 'Tokens come first', mark: 'missed' },
    ]);
  });

  it('records nothing when the learner quits before an attempt', async () => {
    const log = {
      submitted: [] as string[],
      planned: [] as MarkedAssertion[][],
      recorded: 0,
    };
    const term = new ScriptedTerminal(['/quit']);
    await generate(coachWith('concept', log), term, ['Design tokens']);
    expect(term.text()).toContain('Nothing was recorded.');
    expect(log.planned).toEqual([]);
  });
});
