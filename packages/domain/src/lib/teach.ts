import { DomainError } from './errors.js';
import { findBuzzwords, fold, quotesSource, words } from './text.js';
import type { Verdict } from './vocabulary.js';

export interface Misconception {
  assertion: number;
  text: string;
}

export type TeachRole = 'learner' | 'student';

export interface TeachTurnRecord {
  role: TeachRole;
  text: string;
}

export type StudentMove =
  | { kind: 'term'; term: string; text: string }
  | { kind: 'example'; text: string }
  | { kind: 'misconception'; text: string }
  | { kind: 'listen'; text: string }
  | { kind: 'ready'; text: string };

export interface TeachVerdict {
  verdict: Verdict;
  gaps: string[];
  corrected: boolean;
  unresolved: string[];
}

const EXAMPLE =
  /\b(for example|for instance|e\.g\.|such as|imagine|say you|let's say|like when|picture)\b/i;
const CORRECTION =
  /\b(no|nope|not|isn't|aren't|doesn't|don't|never|wrong|actually|the other way|rather|instead|incorrect|not quite)\b|n't\b/i;
const STOP = new Set(
  'that this with from they them their there what when where which while have has had were been being into than then also only just more most some such very your yours about would could should does each other because these those'.split(
    ' ',
  ),
);

function content(text: string): Set<string> {
  return new Set(words(text).filter((w) => w.length >= 4 && !STOP.has(w)));
}

export function sharesIdea(text: string, idea: string, min = 2): boolean {
  const mine = content(text);
  return [...content(idea)].filter((w) => mine.has(w)).length >= min;
}

export function hasExample(text: string): boolean {
  return EXAMPLE.test(text);
}

export function correctsMisconception(
  reply: string,
  misconception: Misconception,
  assertion: string,
): boolean {
  return (
    CORRECTION.test(reply) &&
    (sharesIdea(reply, misconception.text, 1) ||
      sharesIdea(reply, assertion, 1))
  );
}

export function misconceptionProblem(
  candidate: Misconception,
  assertions: readonly string[],
  sources: readonly string[],
  runWords: number,
): string | null {
  if (
    !Number.isInteger(candidate.assertion) ||
    candidate.assertion < 0 ||
    candidate.assertion >= assertions.length
  )
    return 'names no core assertion';
  const text = candidate.text.trim();
  if (!text) return 'is empty';
  if (fold(text) === fold(assertions[candidate.assertion]!))
    return 'repeats the assertion instead of getting it wrong';
  if (sources.some((s) => quotesSource(text, s, runWords)))
    return 'copies the note';
  return null;
}

export function fallbackMisconception(title: string): Misconception {
  return {
    assertion: 0,
    text: `${title.trim()} is just a naming habit, and nothing really depends on it`,
  };
}

export const STUDENT_OPENING = (title: string) =>
  `Hi! I don't know anything about ${title.trim()}. Can you teach me?`;
const ASK_TERM = (term: string) => `Wait, what do you mean by "${term}"?`;
const ASK_EXAMPLE = 'Can you give me an example?';
const STATE = (m: Misconception) =>
  `Oh, so ${m.text.trim().replace(/[.?!]+$/, '')}?`;
const LISTEN = 'OK, go on.';
const READY = 'I think I get it. Let me explain it back to you.';

function firstSentence(text: string): string {
  const one = text.trim().split(/(?<=[.!?])\s+/)[0] ?? '';
  return one.replace(/[.!?]+$/, '');
}

export class TeachingLesson {
  private readonly log: TeachTurnRecord[] = [];
  private readonly defined = new Set<string>();
  private readonly asked = new Set<string>();
  private questions = 0;
  private stated = false;
  private corrected = false;
  private pending: 'misconception' | { term: string } | null = null;
  private askedExample = false;
  private finished = false;

  constructor(
    readonly title: string,
    private readonly terms: readonly string[],
    readonly misconception: Misconception,
    private readonly assertion: string,
    private readonly maxQuestions: number,
  ) {
    if (maxQuestions < 1)
      throw new DomainError('The student needs at least one question');
    this.log.push({ role: 'student', text: STUDENT_OPENING(title) });
  }

  get turns(): TeachTurnRecord[] {
    return this.log.map((t) => ({ ...t }));
  }

  get learnerText(): string {
    return this.log
      .filter((t) => t.role === 'learner')
      .map((t) => t.text)
      .join('\n');
  }

  get misconceptionCorrected(): boolean {
    return this.corrected;
  }

  get misconceptionStated(): boolean {
    return this.stated;
  }

  unresolvedTerms(): string[] {
    return findBuzzwords(this.learnerText, [...this.terms]).filter(
      (t) => !this.defined.has(t),
    );
  }

  learnerSays(text: string): StudentMove {
    if (this.finished) throw new DomainError('The lesson is over');
    const said = text.trim();
    if (!said) throw new DomainError('Say something to teach the student');
    this.log.push({ role: 'learner', text: said });
    if (this.pending === 'misconception') {
      if (correctsMisconception(said, this.misconception, this.assertion))
        this.corrected = true;
    } else if (this.pending) this.defined.add(this.pending.term);
    this.pending = null;

    if (this.questions >= this.maxQuestions) return this.ready();

    if (!this.stated && sharesIdea(said, this.assertion)) return this.state();

    const term = findBuzzwords(this.learnerText, [...this.terms]).find(
      (t) => !this.defined.has(t) && !this.asked.has(t),
    );
    if (term) {
      this.asked.add(term);
      this.pending = { term };
      return this.student({ kind: 'term', term, text: ASK_TERM(term) });
    }

    if (!this.askedExample && !hasExample(this.learnerText)) {
      this.askedExample = true;
      return this.student({ kind: 'example', text: ASK_EXAMPLE });
    }

    this.log.push({ role: 'student', text: LISTEN });
    return { kind: 'listen', text: LISTEN };
  }

  finish(): StudentMove {
    if (this.finished) throw new DomainError('The lesson is over');
    return this.ready();
  }

  explainBack(): string {
    const said = this.log
      .filter((t) => t.role === 'learner')
      .map((t) => firstSentence(t.text))
      .filter(Boolean);
    const parts = [`So, if I got it right: ${said.join('; ')}.`];
    if (!this.corrected)
      parts.push(
        `And ${this.misconception.text.trim().replace(/[.?!]+$/, '')}.`,
      );
    const open = this.unresolvedTerms();
    if (open.length)
      parts.push(
        `I'm still not sure what ${open.map((t) => `"${t}"`).join(' and ')} means.`,
      );
    const text = parts.join(' ');
    this.log.push({ role: 'student', text });
    return text;
  }

  correct(text: string): void {
    const said = text.trim();
    if (!said) return;
    this.log.push({ role: 'learner', text: said });
    if (
      !this.corrected &&
      correctsMisconception(said, this.misconception, this.assertion)
    )
      this.corrected = true;
    for (const term of findBuzzwords(said, [...this.terms]))
      this.defined.add(term);
  }

  verdict(
    assertions: readonly string[],
    covered: readonly string[],
  ): TeachVerdict {
    const missed = assertions.filter((a) => !covered.includes(a));
    const unresolved = this.unresolvedTerms();
    const gaps = [
      ...(this.corrected
        ? []
        : [
            `You left the student believing: ${this.misconception.text.trim()}`,
          ]),
      ...missed.map((a) => `You did not teach: ${a}`),
      ...unresolved.map((t) => `You used "${t}" without saying what it means`),
    ];
    return {
      verdict: gaps.length ? 'fail' : 'pass',
      gaps,
      corrected: this.corrected,
      unresolved,
    };
  }

  private state(): StudentMove {
    this.stated = true;
    this.pending = 'misconception';
    return this.student({
      kind: 'misconception',
      text: STATE(this.misconception),
    });
  }

  private ready(): StudentMove {
    if (!this.stated) return this.state();
    this.finished = true;
    this.log.push({ role: 'student', text: READY });
    return { kind: 'ready', text: READY };
  }

  private student<T extends StudentMove>(move: T): T {
    this.questions++;
    this.log.push({ role: 'student', text: move.text });
    return move;
  }
}
