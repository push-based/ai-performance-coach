import type { CoachingStyle } from './coaching-style.js';
import { quotesSource, words } from './text.js';

export const ELABORATION_KINDS = ['why', 'connect', 'apply'] as const;
export type ElaborationKind = (typeof ELABORATION_KINDS)[number];

export type ElaborationQuestions = Record<ElaborationKind, string>;

export const FOLLOW_UPS = {
  why: 'Why?',
  example: 'For example?',
  assumption: 'What has to be true for that to work?',
} as const;
export type FollowUp = keyof typeof FOLLOW_UPS;

export const MAX_FOLLOW_UPS: Record<ElaborationKind, number> = {
  why: 2,
  connect: 1,
  apply: 1,
};

export function nextFollowUp(
  kind: ElaborationKind,
  asked: readonly FollowUp[],
  choice: FollowUp | null,
): FollowUp | null {
  if (!choice || asked.length >= MAX_FOLLOW_UPS[kind]) return null;
  if (choice !== 'why' && asked.includes(choice)) return null;
  return choice;
}

export const CONNECT_ANGLES: Record<CoachingStyle, string> = {
  feynman:
    'an everyday thing the idea is like, so the learner can explain it without jargon',
  socratic:
    'something close to the idea that it is unlike, or a case where the idea stops holding',
  cornell:
    'another author, book or note that argues something close, and how the two differ',
  devil:
    'something the learner already knows that does the same job, and where the idea breaks or costs more than it',
};

export const MIN_REASON_WORDS = 3;

const CAUSAL =
  /\b(because|so that|so|otherwise|therefore|thus|hence|since|which means|that means|as a result|or else|without (?:it|them|this|that)|leads? to|causes?|in order to)\b/i;

const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;

function connectQuestion(title: string, style: CoachingStyle): string {
  switch (style) {
    case 'feynman':
      return `What everyday thing is ${title} like? Explain it without jargon.`;
    case 'socratic':
      return `What is ${title} close to but unlike, and where does it stop holding?`;
    case 'cornell':
      return `Who else argues something close to ${title}, and how do they differ?`;
    case 'devil':
      return `What that you already know does the same job as ${title}, and where does ${title} break or cost more?`;
  }
}

export function fallbackQuestions(
  title: string,
  style: CoachingStyle = 'feynman',
): ElaborationQuestions {
  const t = title.trim();
  return {
    why: `Why is ${t} built this way? What would break if it were not?`,
    connect: connectQuestion(t, style),
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
