import {
  buildClimb,
  canStart,
  climbDates,
  nextStep,
  skippedSteps,
  spacedAttempts,
  stepRecord,
  type Attempt,
  type ClimbInput,
} from './climb.js';
import { DomainError } from './errors.js';

const NOTE = '3.Resources/Concepts/Design System Architecture/Design tokens.md';

function climbOf(input: Partial<ClimbInput> = {}) {
  return buildClimb({
    conceptId: 'c-tokens',
    recorded: {},
    recordedIn: NOTE,
    attempts: [],
    ...input,
  });
}

const attempt = (
  date: string,
  verdict: Attempt['verdict'],
  evidence = `s-${date}`,
): Attempt => ({ date, verdict, evidence });

describe('climbDates', () => {
  it('reads each step date from the frontmatter map', () => {
    expect(
      climbDates({
        read: '2026-11-09',
        group: '2026-11-09T00:00:00.000Z',
        teach: null,
      }),
    ).toEqual({ read: '2026-11-09', group: '2026-11-09' });
  });

  it('ignores unknown steps, bad dates and anything that is not a map', () => {
    expect(climbDates({ skim: '2026-11-09', read: '2026-02-30' })).toEqual({});
    expect(climbDates('read')).toEqual({});
    expect(climbDates(['read'])).toEqual({});
    expect(climbDates(undefined)).toEqual({});
  });
});

describe('stepRecord', () => {
  it('never marks a step done without evidence', () => {
    expect(() => stepRecord('read', '2026-11-09', ' ')).toThrow(DomainError);
  });
});

describe('spacedAttempts', () => {
  it('counts an attempt at least a day after the previous one', () => {
    const attempts = [
      attempt('2026-11-10', 'fail'),
      attempt('2026-11-10', 'pass', 's-again'),
      attempt('2026-11-11', 'pass'),
    ];
    expect(spacedAttempts(attempts)).toEqual([attempt('2026-11-11', 'pass')]);
  });
});

describe('buildClimb', () => {
  it('takes retrieve from the first session, pass or fail', () => {
    const climb = climbOf({ attempts: [attempt('2026-11-10', 'fail')] });
    expect(climb.done).toEqual([
      { step: 'retrieve', date: '2026-11-10', evidence: 's-2026-11-10' },
    ]);
  });

  it('does not count a same-day re-spar as space', () => {
    const climb = climbOf({
      attempts: [attempt('2026-11-10', 'fail'), attempt('2026-11-10', 'pass')],
    });
    expect(climb.done.map((r) => r.step)).toEqual(['retrieve']);
    expect(climb.spacedPass).toBeNull();
  });

  it('takes space from the first spaced review, and the gate from the first spaced pass', () => {
    const climb = climbOf({
      attempts: [
        attempt('2026-11-10', 'pass'),
        attempt('2026-11-11', 'fail'),
        attempt('2026-11-14', 'pass'),
      ],
    });
    expect(climb.done.find((r) => r.step === 'space')?.date).toBe('2026-11-11');
    expect(climb.spacedPass?.date).toBe('2026-11-14');
  });

  it('rebuilds retrieve and space from the sessions, whatever the frontmatter says', () => {
    const climb = climbOf({
      recorded: { retrieve: '2026-11-01', space: '2026-11-02' },
    });
    expect(climb.done).toEqual([]);
  });

  it('keeps the other recorded steps, with the note as their evidence', () => {
    const climb = climbOf({
      recorded: { read: '2026-11-09', generate: '2026-11-10' },
    });
    expect(climb.done).toEqual([
      { step: 'read', date: '2026-11-09', evidence: NOTE },
      { step: 'generate', date: '2026-11-10', evidence: NOTE },
    ]);
  });

  it('drops a recorded teach that has no passed spaced review before it', () => {
    expect(
      climbOf({ recorded: { teach: '2026-11-12' } }).done.map((r) => r.step),
    ).toEqual([]);
    const early = climbOf({
      recorded: { teach: '2026-11-10' },
      attempts: [attempt('2026-11-09', 'pass'), attempt('2026-11-11', 'pass')],
    });
    expect(early.done.map((r) => r.step)).not.toContain('teach');
    const after = climbOf({
      recorded: { teach: '2026-11-11' },
      attempts: [attempt('2026-11-09', 'pass'), attempt('2026-11-11', 'pass')],
    });
    expect(after.done.map((r) => r.step)).toContain('teach');
  });
});

describe('nextStep and skippedSteps', () => {
  it('starts at read and ends with null when all seven are done', () => {
    expect(nextStep(climbOf())).toBe('read');
    const climb = climbOf({
      recorded: {
        read: '2026-11-09',
        group: '2026-11-09',
        generate: '2026-11-10',
        elaborate: '2026-11-10',
        teach: '2026-11-17',
      },
      attempts: [attempt('2026-11-10', 'pass'), attempt('2026-11-17', 'pass')],
    });
    expect(nextStep(climb)).toBeNull();
    expect(skippedSteps(climb)).toEqual([]);
  });

  it('names the open steps below the highest one done', () => {
    const climb = climbOf({
      recorded: { read: '2026-11-09' },
      attempts: [attempt('2026-11-10', 'fail')],
    });
    expect(nextStep(climb)).toBe('group');
    expect(skippedSteps(climb)).toEqual(['group', 'generate']);
  });
});

describe('canStart', () => {
  it('lets every step but teach run out of order', () => {
    const climb = climbOf();
    for (const step of [
      'read',
      'group',
      'generate',
      'retrieve',
      'elaborate',
      'space',
    ] as const) {
      expect(canStart(climb, step)).toEqual({ ok: true });
    }
  });

  it('locks teach until a review passes at least a day after the previous attempt', () => {
    const sameDay = climbOf({
      attempts: [attempt('2026-11-10', 'pass'), attempt('2026-11-10', 'pass')],
    });
    expect(canStart(sameDay, 'teach').ok).toBe(false);
    expect(canStart(sameDay, 'teach').reason).toMatch(/later day/);
    const spaced = climbOf({
      attempts: [attempt('2026-11-10', 'fail'), attempt('2026-11-11', 'pass')],
    });
    expect(canStart(spaced, 'teach')).toEqual({ ok: true });
  });
});
