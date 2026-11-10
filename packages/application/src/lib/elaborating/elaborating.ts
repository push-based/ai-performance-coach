import {
  ELABORATION_KINDS,
  FOLLOW_UPS,
  elaborationProblem,
  fallbackQuestions,
  findBuzzwords,
  givesAway,
  linksIn,
  nextFollowUp,
  quotesSource,
  type CoachingStyle,
  type ElaborationKind,
  type ElaborationQuestions,
  type FollowUp,
  type SparringRules,
} from '@ai-coach/domain';
import {
  NotSparrableError,
  UnavailableError,
  UnusableReplyError,
} from '../errors.js';
import { notePath, referenceOf, resolveStyle } from '../history.js';
import type { ElaborationPartner, StyleClassifier } from '../ports/models.js';
import type { Clock } from '../ports/state.js';
import type {
  ElaborationDraft,
  NoteDetails,
  NotesRepository,
  PracticeDraft,
  RecordedPractice,
  SessionLog,
} from '../ports/vault.js';

export interface ElaboratingDeps {
  notes: NotesRepository;
  sessions: SessionLog;
  partner: ElaborationPartner;
  classifier: StyleClassifier;
  rules: SparringRules;
  clock: Clock;
}

export interface LinkCandidate {
  path: string;
  title: string;
}

export type AnswerCheck =
  | { kind: 'ok' }
  | { kind: 'rephrase'; buzzwords: string[] }
  | { kind: 'copied'; message: string }
  | { kind: 'incomplete'; message: string };

export interface ElaboratePlan {
  draft: PracticeDraft;
  preview: RecordedPractice;
}

const RAW = /(^|\/)0\.Raw\//;
const QUESTION_ATTEMPTS = 2;

export class ElaborateSession {
  private readonly rephrased = new Set<ElaborationKind>();
  private readonly followedUp = new Map<ElaborationKind, FollowUp[]>();
  private readonly sources: string[];
  private readonly buzzwords: string[];

  constructor(
    private readonly deps: ElaboratingDeps,
    readonly note: NoteDetails,
    readonly style: CoachingStyle,
    readonly questions: ElaborationQuestions,
    readonly candidates: LinkCandidate[],
  ) {
    const reference = referenceOf(note);
    this.sources = [
      note.body,
      ...reference.assertions,
      ...reference.passages.map((p) => p.text),
    ];
    this.buzzwords = [...deps.rules.buzzwords, ...reference.buzzwords];
  }

  links(text: string, picked: readonly number[] = []): string[] {
    const byTitle = new Map(
      this.candidates.map((c) => [c.title.toLowerCase(), c.path]),
    );
    const byPath = new Set(this.candidates.map((c) => c.path));
    const linked = linksIn(text).flatMap((target) => {
      const path = target.endsWith('.md') ? target : `${target}.md`;
      if (target === this.note.title || path === this.note.path)
        return [this.note.path];
      if (byPath.has(path)) return [path];
      const found = byTitle.get(target.toLowerCase());
      return found ? [found] : [];
    });
    const chosen = picked
      .map((n) => this.candidates[n - 1]?.path)
      .filter((p): p is string => !!p);
    return [...new Set([...linked, ...chosen])];
  }

  check(
    kind: ElaborationKind,
    answer: string,
    links: readonly string[],
    named?: string,
  ): AnswerCheck {
    const buzzwords = findBuzzwords(answer, this.buzzwords);
    if (
      buzzwords.length &&
      !this.rephrased.has(kind) &&
      this.deps.rules.maxRephrases > 0
    ) {
      this.rephrased.add(kind);
      return { kind: 'rephrase', buzzwords };
    }
    if (this.copies(answer)) {
      return {
        kind: 'copied',
        message: `Say it in your own words: your answer copies ${this.deps.rules.verbatimRunWords} or more words in a row from the note`,
      };
    }
    const problem = elaborationProblem(
      { kind, answer, links: [...links], named },
      this.note.path,
    );
    return problem ? { kind: 'incomplete', message: problem } : { kind: 'ok' };
  }

  copies(text: string): boolean {
    return this.sources.some((s) =>
      quotesSource(text, s, this.deps.rules.verbatimRunWords),
    );
  }

  async followUp(
    kind: ElaborationKind,
    answer: string,
  ): Promise<string | null> {
    const asked = this.followedUp.get(kind) ?? [];
    if (!nextFollowUp(kind, asked, 'why')) return null;
    let choice: FollowUp | null;
    try {
      choice = await this.deps.partner.followUp({
        rules: this.deps.rules,
        kind,
        question: this.questions[kind],
        answer,
        asked: [...asked],
      });
    } catch (err) {
      if (err instanceof UnavailableError) return null;
      throw err;
    }
    const next = nextFollowUp(kind, asked, choice);
    if (!next) return null;
    this.followedUp.set(kind, [...asked, next]);
    return FOLLOW_UPS[next];
  }

  async plan(answers: readonly ElaborationDraft[]): Promise<ElaboratePlan> {
    const ordered = ELABORATION_KINDS.map((kind) => {
      const found = answers.filter((a) => a.kind === kind);
      if (found.length !== 1)
        throw new NotSparrableError(`Answer the ${kind} question exactly once`);
      const a = found[0]!;
      if (this.copies(a.answer))
        throw new NotSparrableError(
          `The ${kind} answer copies the note: put it in your own words`,
        );
      const problem = elaborationProblem(
        { kind, answer: a.answer, links: a.links, named: a.named },
        this.note.path,
      );
      if (problem) throw new NotSparrableError(`${kind}: ${problem}`);
      return {
        ...a,
        question: this.questions[kind],
        links: a.links.filter((l) => l !== this.note.path),
      };
    });
    const draft: PracticeDraft = {
      kind: 'elaborate',
      date: this.deps.clock.today(),
      items: [
        {
          note: this.note.coachId
            ? { coachId: this.note.coachId }
            : { path: this.note.path },
          answers: ordered,
        },
      ],
    };
    return { draft, preview: await this.deps.sessions.practise(draft, false) };
  }

  record(plan: ElaboratePlan): Promise<RecordedPractice> {
    return this.deps.sessions.practise(plan.draft, true);
  }
}

export class Elaborating {
  constructor(private readonly deps: ElaboratingDeps) {}

  async open(ref: string, style?: CoachingStyle): Promise<ElaborateSession> {
    const note = await this.deps.notes.readNote(
      await notePath(this.deps.notes, ref),
    );
    if (!note.concept || note.raw || note.bucket !== 'resources')
      throw new NotSparrableError(
        `${note.path} is not a concept note: Elaborate works on a concept note's idea`,
      );
    const chosen = await this.styleOf(note, style);
    const [questions, candidates] = await Promise.all([
      this.questionsFor(note, chosen),
      this.candidatesFor(note),
    ]);
    return new ElaborateSession(this.deps, note, chosen, questions, candidates);
  }

  private async styleOf(
    note: NoteDetails,
    explicit?: CoachingStyle,
  ): Promise<CoachingStyle> {
    try {
      return await resolveStyle(
        note,
        this.deps.rules,
        this.deps.classifier,
        explicit,
      );
    } catch (err) {
      if (err instanceof UnavailableError || err instanceof UnusableReplyError)
        return 'feynman';
      throw err;
    }
  }

  private async questionsFor(
    note: NoteDetails,
    style: CoachingStyle,
  ): Promise<ElaborationQuestions> {
    const reference = referenceOf(note);
    const sources = [
      note.body,
      ...reference.assertions,
      ...reference.passages.map((p) => p.text),
    ];
    const fallback = fallbackQuestions(note.title, style);
    const chosen: Partial<ElaborationQuestions> = {};
    const rejected: string[] = [];
    for (let attempt = 0; attempt < QUESTION_ATTEMPTS; attempt++) {
      let asked: ElaborationQuestions;
      try {
        asked = await this.deps.partner.questions({
          note: reference.note,
          rules: this.deps.rules,
          style,
          assertions: reference.assertions,
          rejected: [...rejected],
        });
      } catch (err) {
        if (
          err instanceof UnusableReplyError ||
          err instanceof UnavailableError
        )
          break;
        throw err;
      }
      for (const kind of ELABORATION_KINDS) {
        if (chosen[kind]) continue;
        const question = asked[kind].trim();
        if (!question) continue;
        if (givesAway(question, sources, this.deps.rules.verbatimRunWords))
          rejected.push(question);
        else chosen[kind] = question;
      }
      if (ELABORATION_KINDS.every((k) => chosen[k])) break;
    }
    return {
      why: chosen.why ?? fallback.why,
      connect: chosen.connect ?? fallback.connect,
      apply: chosen.apply ?? fallback.apply,
    };
  }

  private async candidatesFor(note: NoteDetails): Promise<LinkCandidate[]> {
    const { notes } = await this.deps.notes.listNotes();
    return notes
      .filter(
        (n) =>
          n.path !== note.path &&
          !RAW.test(n.path) &&
          (n.bucket === 'projects' ||
            n.bucket === 'areas' ||
            n.bucket === 'resources'),
      )
      .map((n) => ({ path: n.path, title: n.title }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }
}
