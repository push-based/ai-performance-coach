import { stripVTControlCharacters } from 'node:util';
import type { ClimbStatus } from '@ai-coach/application';
import { CLIMB_STEPS, type ClimbStep, type ClimbSteps } from '@ai-coach/domain';
import { climb } from './climb.js';
import type { Coach } from './composition.js';
import type { Terminal } from './terminal.js';

class ScriptedTerminal implements Terminal {
  readonly output: string[] = [];
  print(text = ''): void {
    this.output.push(text);
  }
  async ask(): Promise<string | null> {
    return null;
  }
  text(): string {
    return stripVTControlCharacters(this.output.join('\n'));
  }
}

const TOKENS = '3.Resources/Concepts/Design tokens.md';

function steps(...done: ClimbStep[]): ClimbSteps {
  return Object.fromEntries(
    CLIMB_STEPS.map((s) => [
      s,
      done.includes(s) ? { date: '2026-11-10', evidence: 's-1' } : null,
    ]),
  ) as ClimbSteps;
}

function tokens(overrides: Partial<ClimbStatus> = {}): ClimbStatus {
  return {
    path: TOKENS,
    title: 'Design tokens',
    steps: steps('read', 'group', 'generate', 'retrieve'),
    stored: null,
    current: true,
    next: 'elaborate',
    skipped: [],
    spacedPass: null,
    spacedStyles: [],
    teach: { ok: false, reason: 'Teach needs a passed spaced review' },
    waitingForJudge: false,
    ...overrides,
  };
}

function coachWith(climbs: ClimbStatus[], asked: string[] = []): Coach {
  return {
    climbing: () => ({
      concept: async (ref: string) => {
        asked.push(ref);
        return climbs[0]!;
      },
      concepts: async () => climbs,
    }),
  } as unknown as Coach;
}

describe('coach climb', () => {
  it('shows the stairs for one concept and the next step', async () => {
    const term = new ScriptedTerminal();
    const asked: string[] = [];
    await climb(coachWith([tokens()], asked), term, ['Design tokens']);
    expect(asked).toEqual(['Design tokens']);
    expect(term.text()).toBe(
      [
        'Design tokens            ✓ Read  ✓ Group  ✓ Generate  ✓ Retrieve  · Elaborate  · Space  · Teach',
        '                         next: elaborate',
      ].join('\n'),
    );
  });

  it('names the spar command for retrieve, and the skipped steps', async () => {
    const term = new ScriptedTerminal();
    await climb(
      coachWith([
        tokens({
          title: 'Primitives',
          steps: steps('read', 'elaborate'),
          next: 'group',
          skipped: ['group', 'generate', 'retrieve'],
        }),
        tokens({
          title: 'Components',
          steps: steps('read', 'group', 'generate'),
          next: 'retrieve',
        }),
      ]),
      term,
      [],
    );
    const text = term.text();
    expect(text).toContain(
      'next: group · Group skipped, Generate skipped, Retrieve skipped',
    );
    expect(text).toContain(`next: retrieve · \`coach spar "${TOKENS}"\``);
  });

  it('explains why teach is locked, and paints a finished climb', async () => {
    const locked = new ScriptedTerminal();
    await climb(
      coachWith([
        tokens({
          steps: steps(
            'read',
            'group',
            'generate',
            'retrieve',
            'elaborate',
            'space',
          ),
          next: 'teach',
        }),
      ]),
      locked,
      ['Design tokens'],
    );
    expect(locked.text()).toContain('Teach needs a passed spaced review');

    const finished = new ScriptedTerminal();
    await climb(
      coachWith([
        tokens({
          steps: steps(...CLIMB_STEPS),
          next: null,
          teach: { ok: true },
        }),
      ]),
      finished,
      ['Design tokens'],
    );
    expect(finished.text()).toContain('✓ Teach');
    expect(finished.text()).toContain('all seven steps done');
  });

  it('warns when the stored summary disagrees with the evidence', async () => {
    const term = new ScriptedTerminal();
    await climb(coachWith([tokens({ current: false })]), term, []);
    expect(term.text()).toContain('coach climb --rebuild');
  });

  it('says how to get concept notes when there are none', async () => {
    const term = new ScriptedTerminal();
    await climb(coachWith([]), term, []);
    expect(term.text()).toContain('coach synthesize');
  });
});

describe('coach climb and the judge', () => {
  it('says when a round waits for the judge', async () => {
    const term = new ScriptedTerminal();
    await climb(coachWith([tokens({ waitingForJudge: true })]), term, []);
    expect(term.text()).toContain(
      'next: elaborate · a round waits for the judge: `coach judge`',
    );
  });
});

describe('coach climb --rebuild', () => {
  it('lists the stale summaries, and rebuilds them with the preview versions after a yes', async () => {
    const calls: unknown[] = [];
    const preview = {
      climbs: [TOKENS],
      versions: { [TOKENS]: 'v1' },
      executed: false,
    };
    const coach = {
      climbing: () => ({
        previewRebuild: async () => preview,
        rebuild: async (p: unknown) => {
          calls.push(p);
          return { ...preview, executed: true };
        },
      }),
    } as unknown as Coach;
    const term = new ScriptedTerminal();
    term.ask = async () => 'y';
    await climb(coach, term, [], { rebuild: true });
    expect(term.text()).toContain(TOKENS);
    expect(term.text()).toContain('Rebuilt 1 climb summaries.');
    expect(calls).toEqual([preview]);
  });
});
