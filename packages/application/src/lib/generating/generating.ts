import {
  addDays,
  attempt,
  attemptCameFirst,
  checkMarks,
  correctionProblem,
  type GenerateAttempt,
  type Ladder,
  type MarkedAssertion,
  type SparringRules,
} from '@ai-coach/domain';
import { ApplicationError, NotSparrableError } from '../errors.js';
import { notePath } from '../history.js';
import type { SparringPartner } from '../ports/models.js';
import type { Clock } from '../ports/state.js';
import type {
  NoteDetails,
  NotesRepository,
  PracticeDraft,
  RecordedPractice,
  SessionLog,
} from '../ports/vault.js';

export interface GeneratingDeps {
  notes: NotesRepository;
  sessions: SessionLog;
  partner: SparringPartner;
  rules: SparringRules;
  ladder: Ladder;
  clock: Clock;
}

export type GenerateMode = 'concept' | 'chapter';

export interface GeneratePlan {
  draft: PracticeDraft;
  preview: RecordedPractice;
  counts: boolean;
}

export class GenerateSessionError extends ApplicationError {
  override readonly name = 'GenerateSessionError';
}

function shownFor(note: NoteDetails): string[] {
  if (!note.chapter) return [note.title];
  const { book, part, chapter, section, pages } = note.chapter;
  return [
    book,
    ...(part ? [part] : []),
    `Chapter ${chapter}${section ? `: ${section}` : ''}`,
    `pages ${pages}`,
  ];
}

export class GenerateSession {
  private attempted: (GenerateAttempt & { at: string }) | null = null;
  private revealedAt: string | null = null;

  constructor(
    private readonly deps: GeneratingDeps,
    readonly note: NoteDetails,
    readonly mode: GenerateMode,
  ) {}

  get shown(): string[] {
    return shownFor(this.note);
  }

  get prompt(): string {
    return this.mode === 'concept'
      ? `Before you see the note: explain "${this.note.title}" in your own words. What is it, how does it work, and why does it matter?`
      : `Before you read "${this.note.title}": what do you expect it to say, and how will it relate to what you already know?`;
  }

  get attemptText(): string | null {
    return this.attempted?.answer ?? null;
  }

  submit(text: string): GenerateAttempt {
    if (this.revealedAt)
      throw new GenerateSessionError(
        'The answer was already shown: an attempt now would not come first',
      );
    const made = attempt(text);
    this.attempted = { ...made, at: this.deps.clock.now() };
    return made;
  }

  correctionProblem(correction: string, assertion: string): string | null {
    return correctionProblem(
      correction,
      assertion,
      this.deps.rules.verbatimRunWords,
    );
  }

  reveal(): string[] {
    if (!this.attempted)
      throw new GenerateSessionError(
        'Write your attempt first: the answer is shown only after it is saved',
      );
    this.revealedAt ??= this.deps.clock.now();
    return this.mode === 'concept' ? [...this.note.concept!.assertions] : [];
  }

  async unsupported(marks: readonly MarkedAssertion[]): Promise<string[]> {
    const claimed = marks
      .filter((m) => m.mark === 'got it')
      .map((m) => m.assertion);
    if (!claimed.length || !this.attempted) return [];
    if (this.attempted.idk) return claimed;
    const covered = await this.deps.partner.coveredAssertions({
      note: { title: this.note.title, body: '' },
      rules: this.deps.rules,
      style: 'feynman',
      assertions: claimed,
      exchanges: [{ question: this.prompt, answer: this.attempted.answer }],
    });
    return claimed.filter((a) => !covered.includes(a));
  }

  async plan(
    points: readonly string[],
    marks: readonly MarkedAssertion[],
  ): Promise<GeneratePlan> {
    if (!this.attempted || !this.revealedAt)
      throw new GenerateSessionError(
        'Write your attempt and see the answer before marking it',
      );
    if (this.mode === 'chapter' && !points.length)
      throw new GenerateSessionError(
        'Name at least one point of the chapter to mark',
      );
    const checked = checkMarks(
      this.mode === 'concept' ? this.note.concept!.assertions : points,
      marks,
    );
    const today = this.deps.clock.today();
    const first =
      this.mode === 'concept' &&
      this.note.nextReview === null &&
      !this.note.sessions.length;
    const draft: PracticeDraft = {
      kind: 'generate',
      date: today,
      items: [
        {
          note: this.note.coachId
            ? { coachId: this.note.coachId }
            : { path: this.note.path },
          challenge: this.prompt,
          answer: this.attempted.answer,
          attemptedAt: this.attempted.at,
          revealedAt: this.revealedAt,
          idk: this.attempted.idk,
          marks: checked,
          ...(first
            ? {
                nextReview: addDays(today, this.deps.ladder.firstReviewDays),
              }
            : {}),
        },
      ],
    };
    return {
      draft,
      preview: await this.deps.sessions.practise(draft, false),
      counts: attemptCameFirst(this.attempted.at, this.revealedAt),
    };
  }

  record(plan: GeneratePlan): Promise<RecordedPractice> {
    return this.deps.sessions.practise(plan.draft, true);
  }
}

export class Generating {
  constructor(private readonly deps: GeneratingDeps) {}

  async open(ref: string): Promise<GenerateSession> {
    const note = await this.deps.notes.readNote(
      await notePath(this.deps.notes, ref),
    );
    if (note.bucket !== 'resources')
      throw new NotSparrableError(
        `${note.path}: Generate works on notes under 3.Resources`,
      );
    if (note.concept && !note.raw)
      return new GenerateSession(this.deps, note, 'concept');
    if (note.rawRole === 'chapter')
      return new GenerateSession(this.deps, note, 'chapter');
    throw new NotSparrableError(
      `${note.path} is neither a concept note nor a book chapter: Generate guesses a concept before seeing it, or a chapter before reading it`,
    );
  }
}
