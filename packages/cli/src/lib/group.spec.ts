import { stripVTControlCharacters } from 'node:util';
import { GroupSession, type StructureInput } from '@ai-coach/application';
import { sparringRules } from '@ai-coach/domain';
import type { Coach } from './composition.js';
import { group } from './group.js';
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

const BOOK = 'Design System Architecture';
const TITLES = ['Design tokens', 'Primitives', 'Components', 'Patterns'];

function coachWith(
  written: { input: StructureInput; execute: boolean }[],
  questions: string[] = [],
) {
  const session = new GroupSession(
    {
      notes: {} as never,
      library: {
        readingProgress: async () => [],
        findPassages: async () => [],
        createConcept: async () => {
          throw new Error('not used');
        },
        addReadingNotes: async () => {
          throw new Error('not used');
        },
        writeSummary: async () => {
          throw new Error('not used');
        },
        saveGuideline: async () => {
          throw new Error('not used');
        },
        writeStructure: async (input: StructureInput, execute: boolean) => {
          written.push({ input, execute });
          return {
            path: `3.Resources/Concepts/Structures/${BOOK}.md`,
            warnings: ['nothing builds on "Recipes"'],
            climbs: ['a', 'b', 'c', 'd'],
            versions: {},
            executed: execute,
          };
        },
      },
      partner: { questions: async () => questions },
      rules: sparringRules(),
    },
    BOOK,
    TITLES.map((title) => ({
      path: `3.Resources/Concepts/${title}.md`,
      title,
    })),
  );
  return {
    grouping: () => ({ open: async () => session }),
  } as unknown as Coach;
}

const LAYERS = [
  'Values: 1',
  'Parts: Primitives',
  'Widgets: components',
  'Recipes: 4',
  '',
  'Parts → Values',
  'Widgets -> Parts',
  'Recipes builds on Widgets',
  '',
];

describe('coach group', () => {
  it('takes the learner groups and layers, and writes the structure after a yes', async () => {
    const written: { input: StructureInput; execute: boolean }[] = [];
    const term = new ScriptedTerminal([...LAYERS, 'y']);
    await group(coachWith(written), term, [BOOK]);
    expect(term.text()).toContain('nothing builds on "Recipes"');
    expect(written.map((w) => w.execute)).toEqual([false, true]);
    expect(written[1]!.input.groups[0]).toEqual({
      name: 'Values',
      concepts: ['3.Resources/Concepts/Design tokens.md'],
    });
    expect(written[1]!.input.buildsOn).toHaveLength(3);
    expect(term.text()).toContain('See the climb: coach climb');
  });

  it('shows the rule broken and asks again, then asks the questions and lets the learner revise', async () => {
    const written: { input: StructureInput; execute: boolean }[] = [];
    const term = new ScriptedTerminal([
      'Values: 1, 2',
      'Rest: 3',
      '',
      '',
      ...LAYERS,
      'Yes, nothing does.',
      '',
      'n',
      'n',
    ]);
    await group(
      coachWith(written, ['Nothing builds on Recipes. Right?']),
      term,
      [BOOK],
    );
    const text = term.text();
    expect(text).toContain('"Patterns" is in no group');
    expect(text).toContain('coach> Nothing builds on Recipes. Right?');
    expect(written.map((w) => w.execute)).toEqual([false]);
    expect(text).toContain('Nothing was written.');
  });
});
