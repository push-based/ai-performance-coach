import { quotesSource, words } from './text.js';

export const ELABORATION_KINDS = ['why', 'connect', 'apply'] as const;
export type ElaborationKind = (typeof ELABORATION_KINDS)[number];

export type ElaborationQuestions = Record<ElaborationKind, string>;

export const FOLLOW_UPS = {
  why: 'Why?',
  example: 'For example?',
} as const;
export type FollowUp = keyof typeof FOLLOW_UPS;

export const MIN_REASON_WORDS = 3;

const CAUSAL =
  /\b(because|so that|so|otherwise|therefore|thus|hence|since|which means|that means|as a result|or else|without (?:it|them|this|that)|leads? to|causes?|in order to)\b/i;

const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;

export function fallbackQuestions(title: string): ElaborationQuestions {
  const t = title.trim();
  return {
    why: `Why is ${t} built this way? What would break if it were not?`,
    connect: `What that you already know is ${t} like, or unlike?`,
    apply: `Where would you use ${t} in your own work this month?`,
  };
}

export function linksIn(text: string): string[] {
  return [...new Set([...text.matchAll(WIKILINK)].map((m) => m[1]!.trim()))];
}

export function hasReason(answer: string): boolean {
  const match = CAUSAL.exec(answer);
  if (!match) return false;
  const after = answer.slice(match.index + match[0].length);
  return words(after).length >= MIN_REASON_WORDS;
}

export function givesAway(
  question: string,
  sources: readonly string[],
  runWords: number,
): boolean {
  return sources.some((s) => quotesSource(question, s, runWords));
}

export interface ElaborationAnswer {
  kind: ElaborationKind;
  answer: string;
  links: string[];
  named?: string;
}

export function elaborationProblem(
  given: ElaborationAnswer,
  self: string,
): string | null {
  const links = given.links.filter((l) => l !== self);
  const named = given.named?.trim();
  switch (given.kind) {
    case 'why':
      return hasReason(given.answer)
        ? null
        : 'Give a reason: say why with "because", "so that" or "otherwise", and what follows from it';
    case 'connect':
      return links.length || named
        ? null
        : 'Connect it to something outside this note: link another note, or name a thing from your own work. A link to this note does not count';
    case 'apply':
      return links.some((l) => l.startsWith('1.Projects/')) || named
        ? null
        : 'Name a concrete place: a project, file, team or decision, or link a note under 1.Projects';
  }
}
