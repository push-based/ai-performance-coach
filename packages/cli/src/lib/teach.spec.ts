import { stripVTControlCharacters } from 'node:util';
import {
  TeachSession,
  type GuidelineInput,
  type NoteDetails,
  type PracticeDraft,
} from '@ai-coach/application';
import { DEFAULT_LADDER, sparringRules } from '@ai-coach/domain';
import type { Coach } from './composition.js';
import { teach } from './teach.js';
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

const ASSERTIONS = [
  'Tokens are the named values of the system.',
  'Every other layer takes its values from tokens.',
];

function coachWith(
  covered: string[],
  log: {
    recorded: PracticeDraft[];
    guidelines: { input: GuidelineInput; execute: boolean }[];
  },
) {
  const note = {
    path: '3.Resources/Concepts/Design tokens.md',
    title: 'Design tokens',
    coachId: 'c-1',
    sessions: [],
    concept: {
      assertions: ASSERTIONS,
      buzzwords: [],
      passages: [],
      problems: [],
    },
  } as unknown as NoteDetails;
  const session = new TeachSession(
    {
      notes: {} as never,
      sessions: {
        practise: async (draft: PracticeDraft, execute: boolean) => {
          if (execute) log.recorded.push(draft);
          return {
            executed: execute,
            sessionId: 's-9',
            warnings: [],
            items: [],
          };
        },
      } as never,
      library: {
        saveGuideline: async (input: GuidelineInput, execute: boolean) => {
          log.guidelines.push({ input, execute });
          return {
            path: `${input.folder}/${input.title}.md`,
            warnings: [],
            executed: execute,
          };
        },
      } as never,
      teacher: {} as never,
      checker: { coveredAssertions: async () => covered } as never,
      rules: sparringRules({ buzzwords: [] }),
      ladder: DEFAULT_LADDER,
      clock: { today: () => '2026-11-17', now: () => '' },
    },
    note,
    { assertion: 1, text: "primitives don't use tokens" },
  );
  return {
    teaching: () => ({ open: async () => session }),
  } as unknown as Coach;
}

describe('coach teach', () => {
  it('runs the lesson, the explain-back and the correction, passes, records and saves a guideline', async () => {
    const log = {
      recorded: [] as PracticeDraft[],
      guidelines: [] as { input: GuidelineInput; execute: boolean }[],
    };
    const term = new ScriptedTerminal([
      'Every layer above takes its values from the tokens.',
      '',
      'No, primitives read every colour from the tokens.',
      '',
      'For example, a button takes brand blue from a token.',
      '',
      '/done',
      '/skip',
      'y',
      'y',
      '',
      '1.Projects/Checkout',
      'y',
    ]);
    await teach(coachWith(ASSERTIONS, log), term, ['Design tokens']);
    const text = term.text();
    expect(text).toContain(
      "student> Hi! I don't know anything about Design tokens.",
    );
    expect(text).toContain("student> Oh, so primitives don't use tokens?");
    expect(text).toContain('student> So, if I got it right:');
    expect(text).toContain('Teach passed');
    expect(log.recorded).toHaveLength(1);
    expect(log.guidelines.map((g) => g.execute)).toEqual([false, true]);
    expect(log.guidelines[1]!.input).toEqual({
      sessionId: 's-9',
      note: '3.Resources/Concepts/Design tokens.md',
      title: 'Design tokens guideline',
      folder: '1.Projects/Checkout',
    });
  });

  it('fails and lists the gaps when the misconception stands', async () => {
    const log = {
      recorded: [] as PracticeDraft[],
      guidelines: [] as { input: GuidelineInput; execute: boolean }[],
    };
    const term = new ScriptedTerminal([
      'Every layer above takes its values from the tokens.',
      '',
      'Sure, whatever.',
      '',
      '/done',
      '/skip',
      'n',
    ]);
    await teach(coachWith(ASSERTIONS, log), term, ['Design tokens']);
    expect(term.text()).toContain(
      "You left the student believing: primitives don't use tokens",
    );
    expect(log.recorded).toEqual([]);
  });
});
