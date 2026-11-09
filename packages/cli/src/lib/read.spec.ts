import { stripVTControlCharacters } from 'node:util';
import {
  ReadSession,
  type NoteDetails,
  type ReadingNotesInput,
} from '@ai-coach/application';
import { sparringRules } from '@ai-coach/domain';
import type { Coach } from './composition.js';
import { read } from './read.js';
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

const CH = '3.Resources/0.Raw/Books/Design/chapters/01 Layers.md';
const PAGE_1 =
  'Design tokens are named values for colour, spacing and type. Every other layer reads its values from the tokens and never hard-codes them.';

function coachWith(log: {
  notes: { input: ReadingNotesInput; execute: boolean }[];
  summaries: { text: string; execute: boolean }[];
}) {
  const chapter = {
    path: CH,
    title: 'Chapter 1: Layers',
    rawRole: 'chapter',
    body: `## Page 1\n\n${PAGE_1}\n\n## Page 2\n\nPrimitives are small.\n`,
  } as NoteDetails;
  const session = new ReadSession(
    {
      notes: {} as never,
      library: {
        addReadingNotes: async (input: ReadingNotesInput, execute: boolean) => {
          log.notes.push({ input, execute });
          return {
            path: '3.Resources/Reading notes/Design/Chapter 1- Layers.md',
            entries: [],
            warnings: [],
            climbs: [],
            versions: { a: '1' },
            executed: execute,
          };
        },
        writeSummary: async (_c: string, text: string, execute: boolean) => {
          log.summaries.push({ text, execute });
          return { warnings: [], executed: execute };
        },
      } as never,
      rules: sparringRules(),
    },
    'Design System Architecture',
    chapter,
  );
  return { reading: () => ({ open: async () => session }) } as unknown as Coach;
}

describe('coach read', () => {
  it('shows each page, takes notes, offers to rewrite a quote, and writes after a yes', async () => {
    const log = { notes: [], summaries: [] } as Parameters<typeof coachWith>[0];
    const term = new ScriptedTerminal([
      'named values for colour, spacing and type',
      'r',
      'one source of truth for every layer',
      '',
      '',
      'Values at the bottom, recipes on top.',
      '',
      'y',
    ]);
    await read(coachWith(log), term, ['Design System Architecture', '1']);
    const text = term.text();
    expect(text).toContain('Page 1');
    expect(text).toContain(PAGE_1);
    expect(text).toContain('That copies the page');
    expect(text).toContain('This completes Read');
    expect(text).toMatch(/Next: bold and highlight .* coach synthesize "/);
    expect(log.notes.filter((n) => n.execute)).toEqual([
      {
        input: {
          chapter: CH,
          page: 1,
          notes: ['one source of truth for every layer'],
        },
        execute: true,
      },
    ]);
    expect(log.summaries.map((s) => s.execute)).toEqual([false, true]);
  });

  it('keeps a quote when asked, and says it does not count yet', async () => {
    const log = { notes: [], summaries: [] } as Parameters<typeof coachWith>[0];
    const term = new ScriptedTerminal([
      'named values for colour, spacing and type',
      'k',
      '',
      '',
      '/skip',
      'n',
    ]);
    await read(coachWith(log), term, ['Design System Architecture']);
    expect(term.text()).toContain('Read counts once the chapter has a note');
    expect(log.notes.filter((n) => n.execute)).toEqual([]);
  });
});
