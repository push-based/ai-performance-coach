import type {
  ClimbStep,
  MarkedAssertion,
  ClimbSteps,
  CoachingStyle,
  Mastery,
  ParaBucket,
  Tier,
  Tier2Payload,
  Verdict,
} from '@ai-coach/domain';

export interface NoteSummary {
  path: string;
  title: string;
  bucket: ParaBucket | null;
  container: string | null;
  coachId: string | null;
  mastery: Mastery;
  nextReview: string | null;
}

export interface SessionEntry {
  sessionId: string;
  tier: Tier;
  date: string;
  verdict: Verdict;
  gaps: string[];
  nextReview: string;
}

export interface BookChapter {
  book: string;
  part: string | null;
  chapter: number;
  section: string | null;
  pages: string;
}

export interface ConceptPassage {
  quote: string;
  note: string;
  pages: string | null;
  found: boolean;
}

export interface ConceptDetails {
  assertions: string[];
  buzzwords: string[];
  passages: ConceptPassage[];
  problems: string[];
}

export type RawRole = 'index' | 'chapter' | null;

export interface NoteDetails extends NoteSummary {
  body: string;
  sessions: SessionEntry[];
  raw: boolean;
  rawRole: RawRole;
  chapter: BookChapter | null;
  concept: ConceptDetails | null;
  style: CoachingStyle | null;
}

export interface InvalidSession {
  file: string;
  error: string;
}

export interface NoteListing {
  counts: Record<ParaBucket | 'out_of_place', number>;
  notes: NoteSummary[];
  invalidSessions: InvalidSession[];
}

export interface DueReport {
  today: string;
  due: {
    path: string;
    title: string;
    concept?: boolean;
    coachId: string | null;
    nextReview: string;
    mastery: Mastery;
    firstReview?: boolean;
    book?: string | null;
    group?: string | null;
  }[];
  unsparred: { path: string; title: string; concept?: boolean }[];
  orphaned: { coachId: string; lastSession: string | null }[];
  invalidSessions: InvalidSession[];
}

export interface StepEvidence {
  date: string;
  evidence: string;
}

export interface ConceptClimb {
  path: string;
  title: string;
  steps: ClimbSteps;
  stored: Record<ClimbStep, string | null> | null;
  current: boolean;
  next: ClimbStep | null;
  skipped: ClimbStep[];
  spacedPass: StepEvidence | null;
  teach: { ok: boolean; reason?: string };
}

export interface NotesRepository {
  listNotes(filter?: {
    bucket?: ParaBucket | 'out_of_place';
  }): Promise<NoteListing>;
  readNote(path: string): Promise<NoteDetails>;
  dueForReview(today: string): Promise<DueReport>;
  climb(note?: string): Promise<ConceptClimb[]>;
}

export type NoteRef = { path: string } | { coachId: string };

export interface SessionItemDraft {
  note: NoteRef;
  challenge: string;
  answer: string;
  verdict: Verdict;
  gaps: string[];
  nextReview: string;
}

export interface SessionDraft {
  tier: Tier;
  date: string;
  items: SessionItemDraft[];
}

export interface RecordedSession {
  executed: boolean;
  sessionId: string;
  items: {
    notePath: string;
    coachId: string;
    verdict: Verdict;
    nextReview: string;
  }[];
}

export interface GenerateItemDraft {
  note: NoteRef;
  challenge: string;
  answer: string;
  attemptedAt: string;
  revealedAt: string;
  idk: boolean;
  marks: MarkedAssertion[];
  nextReview?: string;
}

export interface ElaborationDraft {
  kind: 'why' | 'connect' | 'apply';
  question: string;
  answer: string;
  links: string[];
  named?: string;
}

export interface ElaborateItemDraft {
  note: NoteRef;
  answers: ElaborationDraft[];
  nextReview?: string;
}

export interface TeachTurn {
  role: 'learner' | 'student';
  text: string;
}

export interface TeachItemDraft {
  note: NoteRef;
  turns: TeachTurn[];
  misconception: { assertion: number; text: string };
  corrected: boolean;
  unresolvedTerms: string[];
  verdict: Verdict;
  gaps: string[];
  nextReview: string;
}

export type PracticeDraft =
  | { kind: 'generate'; date: string; items: GenerateItemDraft[] }
  | { kind: 'elaborate'; date: string; items: ElaborateItemDraft[] }
  | { kind: 'teach'; tier: Tier; date: string; items: TeachItemDraft[] };

export interface RecordedPractice {
  executed: boolean;
  sessionId: string;
  warnings: string[];
  items: { notePath: string; coachId: string | null }[];
}

export interface SessionLog {
  record(draft: SessionDraft, execute: boolean): Promise<RecordedSession>;
  practise(draft: PracticeDraft, execute: boolean): Promise<RecordedPractice>;
  tier2Payload(
    sessionId: string,
    options?: { includeAssertions?: boolean },
  ): Promise<Tier2Payload>;
}

export type FilingAction =
  | { op: 'rename'; from: string; to: string }
  | { op: 'create'; to: string }
  | { op: 'move'; from: string; to: string }
  | { op: 'write'; to: string }
  | { op: 'remove_empty'; from: string };

export interface KeepSuggestion {
  path: string;
  to: string;
  reasons: string[];
}

export interface FilingPlan {
  actions: FilingAction[];
  collisions: string[];
  warnings: string[];
  suggestions?: KeepSuggestion[];
  executed: boolean;
}

export type FilingRequest =
  | { kind: 'file'; path: string; to: string }
  | { kind: 'capture'; title: string; body: string }
  | {
      kind: 'archive';
      project: string;
      keep?: { note: string; to?: string }[];
    }
  | { kind: 'init' };

export interface VaultFiling {
  plan(request: FilingRequest, execute: boolean): Promise<FilingPlan>;
}
