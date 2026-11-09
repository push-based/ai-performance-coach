import {
  CLIMB_STEPS,
  doneSteps,
  isClimbStep,
  type ClimbSteps,
} from './climb.js';

describe('the climb', () => {
  it('has seven steps, from read to teach', () => {
    expect(CLIMB_STEPS).toEqual([
      'read',
      'group',
      'generate',
      'retrieve',
      'elaborate',
      'space',
      'teach',
    ]);
    expect(isClimbStep('space')).toBe(true);
    expect(isClimbStep('skim')).toBe(false);
  });

  it('lists the steps that have evidence, in climb order', () => {
    const steps = Object.fromEntries(
      CLIMB_STEPS.map((s) => [s, null]),
    ) as ClimbSteps;
    steps.retrieve = { date: '2026-11-10', evidence: 's-1' };
    steps.read = { date: '2026-11-09', evidence: 'Reading notes/Ch 1.md' };
    expect(doneSteps(steps)).toEqual(['read', 'retrieve']);
  });
});
