export const CLIMB_STEPS = [
  'read',
  'group',
  'generate',
  'retrieve',
  'elaborate',
  'space',
  'teach',
] as const;
export type ClimbStep = (typeof CLIMB_STEPS)[number];

export interface StepRecord {
  date: string;
  evidence: string;
}

export type ClimbSteps = Record<ClimbStep, StepRecord | null>;

export function isClimbStep(value: unknown): value is ClimbStep {
  return (CLIMB_STEPS as readonly unknown[]).includes(value);
}

export function doneSteps(steps: ClimbSteps): ClimbStep[] {
  return CLIMB_STEPS.filter((step) => steps[step] !== null);
}
