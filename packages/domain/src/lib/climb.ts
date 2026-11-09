import { DomainError } from './errors.js';
import { addDays } from './review-ladder.js';
import type { Verdict } from './vocabulary.js';

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

export const SPACING_DAYS = 1;

export const EVIDENCED_BY_SESSIONS: readonly ClimbStep[] = [
  'retrieve',
  'space',
];

export type ClimbDates = Partial<Record<ClimbStep, string>>;

export interface StepRecord {
  step: ClimbStep;
  date: string;
  evidence: string;
}

export interface Climb {
  conceptId: string;
  done: StepRecord[];
  spacedPass: StepRecord | null;
}

export interface Attempt {
  date: string;
  verdict: Verdict;
  evidence: string;
}

export interface ClimbInput {
  conceptId: string;
  recorded: ClimbDates;
  recordedIn: string;
  attempts: readonly Attempt[];
}

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})(?:$|T)/;

export function isClimbStep(value: unknown): value is ClimbStep {
  return (CLIMB_STEPS as readonly unknown[]).includes(value);
}

function isoDate(value: unknown): string | null {
  const match = typeof value === 'string' ? DATE_PREFIX.exec(value) : null;
  if (!match) return null;
  try {
    return addDays(match[1]!, 0);
  } catch {
    return null;
  }
}

export function climbDates(value: unknown): ClimbDates {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return {};
  const dates: ClimbDates = {};
  for (const [key, raw] of Object.entries(value)) {
    const date = isoDate(raw);
    if (isClimbStep(key) && date) dates[key] = date;
  }
  return dates;
}

export function stepRecord(
  step: ClimbStep,
  date: string,
  evidence: string,
): StepRecord {
  if (!evidence.trim())
    throw new DomainError(`The ${step} step needs evidence to count as done`);
  const day = isoDate(date);
  if (!day) throw new DomainError(`Not a YYYY-MM-DD date: ${date}`);
  return { step, date: day, evidence: evidence.trim() };
}

function byDate(attempts: readonly Attempt[]): Attempt[] {
  return [...attempts].sort((a, b) => a.date.localeCompare(b.date));
}

export function spacedAttempts(attempts: readonly Attempt[]): Attempt[] {
  const sorted = byDate(attempts);
  return sorted.filter(
    (a, i) => i > 0 && a.date >= addDays(sorted[i - 1]!.date, SPACING_DAYS),
  );
}

export function buildClimb(input: ClimbInput): Climb {
  const sorted = byDate(input.attempts);
  const spaced = spacedAttempts(sorted);
  const first = sorted[0];
  const firstSpaced = spaced[0];
  const pass = spaced.find((a) => a.verdict === 'pass');
  const spacedPass = pass
    ? stepRecord('space', pass.date, pass.evidence)
    : null;

  const done: StepRecord[] = [];
  for (const step of CLIMB_STEPS) {
    if (step === 'retrieve') {
      if (first) done.push(stepRecord(step, first.date, first.evidence));
      continue;
    }
    if (step === 'space') {
      if (firstSpaced)
        done.push(stepRecord(step, firstSpaced.date, firstSpaced.evidence));
      continue;
    }
    const date = input.recorded[step];
    if (!date) continue;
    if (step === 'teach' && (!spacedPass || date < spacedPass.date)) continue;
    done.push(stepRecord(step, date, input.recordedIn));
  }
  return { conceptId: input.conceptId, done, spacedPass };
}

export function isDone(climb: Climb, step: ClimbStep): boolean {
  return climb.done.some((r) => r.step === step);
}

export function nextStep(climb: Climb): ClimbStep | null {
  return CLIMB_STEPS.find((step) => !isDone(climb, step)) ?? null;
}

export function skippedSteps(climb: Climb): ClimbStep[] {
  const highest = Math.max(
    -1,
    ...climb.done.map((r) => CLIMB_STEPS.indexOf(r.step)),
  );
  return CLIMB_STEPS.slice(0, highest).filter((step) => !isDone(climb, step));
}

export function canStart(
  climb: Climb,
  step: ClimbStep,
): { ok: boolean; reason?: string } {
  if (step === 'teach' && !climb.spacedPass) {
    return {
      ok: false,
      reason: `Teach needs a passed review at least ${SPACING_DAYS} day after the previous attempt: spar it again on a later day first`,
    };
  }
  return { ok: true };
}
