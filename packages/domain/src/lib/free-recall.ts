import { words } from './text.js';

export const FREE_RECALL_MIN_WORDS = 10;

const CLAIMS_TO_KNOW =
  /^\s*(?:yes[,.!]?\s*)?(?:i\s+(?:already\s+)?know\s+(?:this|that|it)|i\s+know|(?:i'?ve|i\s+have)\s+got\s+(?:this|it)|got\s+it|easy)\b/i;

export function freeRecallQuestion(title: string): string {
  return `Without looking: write down everything you remember about ${title.trim()}.`;
}

export function needsNeutralProbe(answer: string): boolean {
  return (
    CLAIMS_TO_KNOW.test(answer) || words(answer).length < FREE_RECALL_MIN_WORDS
  );
}

export function missedAssertions(
  assertions: readonly string[],
  covered: readonly string[],
): string[] {
  const done = new Set(covered);
  return assertions.filter((a) => !done.has(a));
}
