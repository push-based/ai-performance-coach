import { DomainError } from './errors.js';
import { quotesSource, words } from './text.js';

export const ASSERTION_MARKS = ['got it', 'wrong', 'missed'] as const;
export type AssertionMark = (typeof ASSERTION_MARKS)[number];

export const MIN_ATTEMPT_WORDS = 10;
export const IDK = '/idk';

export interface MarkedAssertion {
  assertion: string;
  mark: AssertionMark;
  correction?: string;
}

export interface GenerateAttempt {
  answer: string;
  idk: boolean;
}

export function isIdk(answer: string): boolean {
  return answer.trim().toLowerCase() === IDK;
}

export function attempt(answer: string): GenerateAttempt {
  const text = answer.trim();
  if (isIdk(text)) return { answer: IDK, idk: true };
  if (words(text).length < MIN_ATTEMPT_WORDS) {
    throw new DomainError(
      `An attempt is at least ${MIN_ATTEMPT_WORDS} words. Write what you expect, even if you are unsure, or type ${IDK}`,
    );
  }
  return { answer: text, idk: false };
}

export function parseMark(input: string): AssertionMark | null {
  const key = input.trim().toLowerCase();
  if (key === 'g' || key === 'got it' || key === 'got') return 'got it';
  if (key === 'w' || key === 'wrong') return 'wrong';
  if (key === 'm' || key === 'missed') return 'missed';
  return null;
}

export function correctionProblem(
  correction: string,
  assertion: string,
  runWords: number,
): string | null {
  if (!correction.trim())
    return 'A wrong guess needs a correction, in one line of your own words';
  if (quotesSource(correction, assertion, runWords))
    return `Put the correction in your own words: it copies ${runWords} or more words in a row`;
  return null;
}

export function checkMarks(
  assertions: readonly string[],
  marks: readonly MarkedAssertion[],
): MarkedAssertion[] {
  const byAssertion = new Map(marks.map((m) => [m.assertion, m]));
  if (byAssertion.size !== marks.length)
    throw new DomainError('Each assertion is marked once');
  const unknown = marks.find((m) => !assertions.includes(m.assertion));
  if (unknown)
    throw new DomainError(`Not one of the points: "${unknown.assertion}"`);
  const open = assertions.find((a) => !byAssertion.has(a));
  if (open) throw new DomainError(`"${open}" is not marked yet`);
  const uncorrected = marks.find(
    (m) => m.mark === 'wrong' && !m.correction?.trim(),
  );
  if (uncorrected)
    throw new DomainError(
      `"${uncorrected.assertion}" is marked wrong and needs a correction`,
    );
  return assertions.map((a) => {
    const m = byAssertion.get(a)!;
    return m.mark === 'wrong'
      ? { assertion: a, mark: m.mark, correction: m.correction!.trim() }
      : { assertion: a, mark: m.mark };
  });
}

export function attemptCameFirst(
  attemptedAt: string,
  revealedAt: string,
): boolean {
  return Date.parse(attemptedAt) < Date.parse(revealedAt);
}
