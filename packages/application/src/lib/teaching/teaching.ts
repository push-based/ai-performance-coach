import {
  TeachingLesson,
  fallbackMisconception,
  misconceptionProblem,
  scheduleReview,
  type Ladder,
  type Misconception,
  type SparringRules,
  type StudentMove,
  type TeachVerdict,
} from '@ai-coach/domain';
import {
  NotSparrableError,
  UnavailableError,
  UnusableReplyError,
} from '../errors.js';
import {
  JUDGE_FAILED,
  judgeFailedLatest,
  notePath,
  referenceOf,
  teachGate,
  tier2History,
} from '../history.js';
import type { GuidelineCheck, Library } from '../ports/library.js';
import type { SparringPartner, TeachPartner } from '../ports/models.js';
import type { Clock } from '../ports/state.js';
import type {
  NoteDetails,
  NotesRepository,
  PracticeDraft,
  RecordedPractice,
  SessionLog,
} from '../ports/vault.js';

export interface TeachingDeps {
  notes: NotesRepository;
  sessions: SessionLog;
  library: Library;
  teacher: TeachPartner;
  checker: SparringPartner;
  rules: SparringRules;
  ladder: Ladder;
  clock: Clock;
}

export interface TeachPlan {
  draft: PracticeDraft;
  preview: RecordedPractice;
  verdict: TeachVerdict;
}

const DRAFT_ATTEMPTS = 2;

export class TeachSession {
  readonly lesson: TeachingLesson;

  constructor(
    private readonly deps: TeachingDeps,
    readonly note: NoteDetails,
    misconception: Misconception,
  ) {
    const assertions = note.concept!.assertions;
    this.lesson = new TeachingLesson(
      note.title,
      [...deps.rules.buzzwords, ...note.concept!.buzzwords],
      misconception,
      assertions[misconception.assertion]!,
      deps.rules.maxFollowUps + 2,
    );
  }

  get opening(): string {
    return this.lesson.turns[0]!.text;
  }

  say(text: string): StudentMove {
    return this.lesson.learnerSays(text);
  }

  finish(): StudentMove {
    return this.lesson.finish();
  }

  explainBack(): string {
    return this.lesson.explainBack();
  }

  correct(text: string): void {
    this.lesson.correct(text);
  }

  async conclude(): Promise<TeachPlan> {
    const assertions = this.note.concept!.assertions;
    const turns = this.lesson.turns;
    const exchanges = turns.flatMap((t, i) =>
      t.role === 'learner'
        ? [{ question: turns[i - 1]?.text ?? '', answer: t.text }]
        : [],
    );
    const covered = await this.deps.checker.coveredAssertions({
      note: { title: this.note.title, body: '' },
      rules: this.deps.rules,
      style: 'feynman',
      assertions,
      exchanges,
    });
    const verdict = this.lesson.verdict(assertions, covered);
    const today = this.deps.clock.today();
    const draft: PracticeDraft = {
      kind: 'teach',
      tier: 1,
      date: today,
      items: [
        {
          note: this.note.coachId
            ? { coachId: this.note.coachId }
            : { path: this.note.path },
          turns,
          misconception: this.lesson.misconception,
          corrected: verdict.corrected,
          unresolvedTerms: verdict.unresolved,
          verdict: verdict.verdict,
          gaps: verdict.gaps,
          nextReview: scheduleReview(
            {
              tier: 1,
              verdict: verdict.verdict,
              gaps: verdict.gaps.length,
              date: today,
              tier2History: tier2History(this.note),
            },
            this.deps.ladder,
          ).nextReview,
        },
      ],
    };
    return {
      draft,
      preview: await this.deps.sessions.practise(draft, false),
      verdict,
    };
  }

  record(plan: TeachPlan): Promise<RecordedPractice> {
    return this.deps.sessions.practise(plan.draft, true);
  }

  guideline(
    sessionId: string,
    title: string,
    folder: string,
    execute: boolean,
  ): Promise<GuidelineCheck> {
    return this.deps.library.saveGuideline(
      { sessionId, note: this.note.path, title, folder },
      execute,
    );
  }
}

export class Teaching {
  constructor(private readonly deps: TeachingDeps) {}

  async open(ref: string): Promise<TeachSession> {
    const note = await this.deps.notes.readNote(
      await notePath(this.deps.notes, ref),
    );
    if (!note.concept || note.raw || !note.concept.assertions.length)
      throw new NotSparrableError(
        `${note.path} is not a concept note with core assertions: Teach works on a concept`,
      );
    const [climb] = await this.deps.notes.climb(note.path);
    const gate = climb
      ? teachGate(climb)
      : {
          ok: false,
          reason:
            'Teach needs a passed spaced review: spar it again after a gap first',
        };
    if (!gate.ok) throw new NotSparrableError(gate.reason!);
    if (judgeFailedLatest(note)) throw new NotSparrableError(JUDGE_FAILED);
    return new TeachSession(this.deps, note, await this.misconception(note));
  }

  private async misconception(note: NoteDetails): Promise<Misconception> {
    const reference = referenceOf(note);
    const sources = [
      note.body,
      ...reference.assertions,
      ...reference.passages.map((p) => p.text),
    ];
    const rejected: string[] = [];
    for (let attempt = 0; attempt < DRAFT_ATTEMPTS; attempt++) {
      let drafted: Misconception;
      try {
        drafted = await this.deps.teacher.misconception({
          rules: this.deps.rules,
          title: note.title,
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
      const problem = misconceptionProblem(
        drafted,
        reference.assertions,
        sources,
        this.deps.rules.verbatimRunWords,
      );
      if (!problem) return { ...drafted, text: drafted.text.trim() };
      rejected.push(drafted.text);
    }
    return fallbackMisconception(note.title);
  }
}
