import {
  PARA_BUCKETS,
  type ConceptDraft,
  type ElaborationQuestions,
  type FollowUp,
  type Misconception,
  type Exchange,
  type MaterialItem,
  type CoachingStyle,
  type Note,
  type SparringRules,
  tier2Payload,
  type Mastery,
  type ParaBucket,
  type Tier2Payload,
} from '@ai-coach/domain';
import {
  NotFoundError,
  UnusableReplyError,
  VaultRefusedError,
} from '../lib/errors.js';
import type {
  ElaborationPartner,
  ElaborationRequest,
  FollowUpRequest,
  Judge,
  MisconceptionRequest,
  TeachPartner,
  JudgeReport,
  NextTurn,
  NextTurnRequest,
  ChallengeRequest,
  OpeningChallenge,
  RecallCheckRequest,
  StudyCheck,
  StudyPartner,
  StudyRequest,
  StyleClassifier,
  SparringPartner,
} from '../lib/ports/models.js';
import type {
  BookProgress,
  ConceptCheck,
  SynthesisPartner,
  IdeaProposal,
  Library,
  PassageHit,
  GuidelineCheck,
  GuidelineInput,
  ReadingNotesCheck,
  ReadingNotesInput,
  StructureCheck,
  StructureInput,
  SummaryCheck,
  StructurePartner,
  StructureQuestionRequest,
} from '../lib/ports/library.js';
import type {
  Clock,
  PendingJudgements,
  PendingSession,
} from '../lib/ports/state.js';
import type {
  ClimbRebuild,
  ConceptClimb,
  DueReport,
  PracticeDraft,
  RecordedPractice,
  FilingPlan,
  FilingRequest,
  NoteDetails,
  NoteListing,
  NotesRepository,
  NoteSummary,
  RecordedSession,
  SessionDraft,
  SessionEntry,
  SessionLog,
  VaultFiling,
  BookChapter,
  ConceptDetails,
  RawRole,
} from '../lib/ports/vault.js';

const FOLDERS: Record<string, ParaBucket> = {
  '0.Inbox': 'inbox',
  '1.Projects': 'projects',
  '2.Areas': 'areas',
  '3.Resources': 'resources',
  '4.Archive': 'archive',
};

interface StoredNote {
  path: string;
  title: string;
  body: string;
  coachId: string | null;
  raw: boolean;
  rawRole: RawRole;
  chapter: BookChapter | null;
  concept: ConceptDetails | null;
  style: CoachingStyle | null;
}

interface StoredSession {
  sessionId: string;
  tier: 1 | 2;
  date: string;
  items: {
    coachId: string;
    challenge: string;
    answer: string;
    verdict: 'pass' | 'fail';
    gaps: string[];
    nextReview: string;
  }[];
}

export class InMemoryVault implements NotesRepository, SessionLog, VaultFiling {
  readonly notes = new Map<string, StoredNote>();
  readonly sessions: StoredSession[] = [];
  readonly climbs: ConceptClimb[] = [];
  readonly practices: { draft: PracticeDraft; sessionId: string }[] = [];
  readonly refusals: string[] = [];
  private ids = 0;

  constructor(notes: Record<string, string> = {}) {
    for (const [path, body] of Object.entries(notes)) this.put(path, body);
  }

  put(
    path: string,
    body: string,
    raw: {
      rawRole: RawRole;
      chapter?: BookChapter;
      style?: CoachingStyle;
      concept?: ConceptDetails;
      raw?: boolean;
    } = {
      rawRole: null,
    },
  ): void {
    const title = path.split('/').pop()!.replace(/\.md$/, '');
    this.notes.set(path, {
      path,
      title,
      body,
      coachId: null,
      rawRole: raw.rawRole,
      raw: raw.raw ?? path.includes('/0.Raw/'),
      chapter: raw.chapter ?? null,
      concept: raw.concept ?? null,
      style: raw.style ?? null,
    });
  }

  private bucket(path: string): ParaBucket | null {
    return path.includes('/') ? (FOLDERS[path.split('/')[0]!] ?? null) : null;
  }

  private entries(coachId: string | null): SessionEntry[] {
    if (!coachId) return [];
    return this.sessions.flatMap((s) =>
      s.items
        .filter((i) => i.coachId === coachId)
        .map((i) => ({
          sessionId: s.sessionId,
          tier: s.tier,
          date: s.date,
          verdict: i.verdict,
          gaps: i.gaps,
          nextReview: i.nextReview,
        })),
    );
  }

  private summary(note: StoredNote): NoteSummary {
    const entries = this.entries(note.coachId);
    const latest = (tier: 1 | 2) =>
      entries.filter((e) => e.tier === tier).at(-1)?.verdict;
    const mastery: Mastery = !entries.length
      ? 'unsparred'
      : latest(2) === 'pass'
        ? 'tier2_passed'
        : latest(1) === 'pass'
          ? 'tier1_passed'
          : 'attempted';
    const parts = note.path.split('/');
    return {
      path: note.path,
      title: note.title,
      bucket: this.bucket(note.path),
      container: parts.length > 2 ? parts[1]! : null,
      coachId: note.coachId,
      mastery,
      nextReview: entries.at(-1)?.nextReview ?? null,
    };
  }

  async listNotes(
    filter: { bucket?: ParaBucket | 'out_of_place' } = {},
  ): Promise<NoteListing> {
    const all = [...this.notes.values()].map((n) => this.summary(n));
    const counts = Object.fromEntries(
      [...PARA_BUCKETS, 'out_of_place'].map((b) => [b, 0]),
    ) as NoteListing['counts'];
    for (const n of all) counts[n.bucket ?? 'out_of_place']++;
    return {
      counts,
      notes: all.filter(
        (n) => !filter.bucket || (n.bucket ?? 'out_of_place') === filter.bucket,
      ),
      invalidSessions: [],
    };
  }

  async readNote(path: string): Promise<NoteDetails> {
    const note = this.notes.get(path);
    if (!note) throw new VaultRefusedError(`Note not found: ${path}`);
    return {
      ...this.summary(note),
      body: note.body,
      sessions: this.entries(note.coachId),
      raw: note.raw,
      rawRole: note.rawRole,
      chapter: note.chapter,
      concept: note.concept,
      style: note.style,
    };
  }

  async practise(
    draft: PracticeDraft,
    execute: boolean,
  ): Promise<RecordedPractice> {
    const refusal = this.refusals.shift();
    if (refusal)
      throw new VaultRefusedError(`record_session refused: ${refusal}`);
    const items = draft.items.map((item) => {
      const note =
        'path' in item.note
          ? this.notes.get(item.note.path)
          : [...this.notes.values()].find(
              (n) => n.coachId === (item.note as { coachId: string }).coachId,
            );
      if (!note || this.bucket(note.path) !== 'resources') {
        throw new VaultRefusedError(
          `record_session refused: ${JSON.stringify(item.note)} is not a Resources note`,
        );
      }
      return note;
    });
    const sessionId = `s-${++this.ids}`;
    if (execute) {
      for (const note of items)
        if (!note.raw && !note.coachId) note.coachId = `c-${++this.ids}`;
      this.practices.push({ draft: structuredClone(draft), sessionId });
    }
    return {
      executed: execute,
      sessionId,
      warnings: [],
      items: items.map((n) => ({ notePath: n.path, coachId: n.coachId })),
    };
  }

  readonly rebuilds: boolean[] = [];

  async rebuildClimb(
    execute: boolean,
    versions?: Record<string, string>,
  ): Promise<ClimbRebuild> {
    this.rebuilds.push(execute);
    if (execute && !versions)
      throw new VaultRefusedError('rebuild_climb: versions missing');
    const stale = this.climbs.filter((c) => !c.current).map((c) => c.path);
    if (execute) for (const c of this.climbs) c.current = true;
    return { climbs: stale, versions: { stale: 'v1' }, executed: execute };
  }

  async climb(note?: string): Promise<ConceptClimb[]> {
    if (note === undefined) return this.climbs;
    const found = this.climbs.filter(
      (c) => c.path === note || c.title === note,
    );
    if (!found.length)
      throw new VaultRefusedError(`climb: ${note} is not a concept note`);
    return found;
  }

  async dueForReview(today: string): Promise<DueReport> {
    const resources = [...this.notes.values()]
      .filter((n) => this.bucket(n.path) === 'resources' && !n.raw)
      .map((n) => this.summary(n));
    return {
      today,
      due: resources
        .filter((n) => n.coachId && n.nextReview && n.nextReview <= today)
        .map((n) => ({
          path: n.path,
          title: n.title,
          coachId: n.coachId!,
          nextReview: n.nextReview!,
          mastery: n.mastery,
        })),
      unsparred: resources
        .filter((n) => n.mastery === 'unsparred')
        .map((n) => ({ path: n.path, title: n.title })),
      orphaned: [],
      invalidSessions: [],
    };
  }

  async record(
    draft: SessionDraft,
    execute: boolean,
  ): Promise<RecordedSession> {
    const resolved = draft.items.map((item) => {
      const note =
        'path' in item.note
          ? this.notes.get(item.note.path)
          : [...this.notes.values()].find(
              (n) => n.coachId === (item.note as { coachId: string }).coachId,
            );
      if (!note || this.bucket(note.path) !== 'resources') {
        throw new VaultRefusedError(
          `record_session refused: ${JSON.stringify(item.note)} is not a Resources note`,
        );
      }
      return { item, note, coachId: note.coachId ?? `c-${++this.ids}` };
    });
    const sessionId = `s-${++this.ids}`;
    if (execute) {
      for (const r of resolved) r.note.coachId = r.coachId;
      this.sessions.push({
        sessionId,
        tier: draft.tier,
        date: draft.date,
        items: resolved.map(({ item, coachId }) => ({
          coachId,
          challenge: item.challenge,
          answer: item.answer,
          verdict: item.verdict,
          gaps: item.gaps,
          nextReview: item.nextReview,
        })),
      });
    }
    return {
      executed: execute,
      sessionId,
      items: resolved.map(({ item, note, coachId }) => ({
        notePath: note.path,
        coachId,
        verdict: item.verdict,
        nextReview: item.nextReview,
      })),
    };
  }

  async tier2Payload(
    sessionId: string,
    options: { includeAssertions?: boolean } = {},
  ): Promise<Tier2Payload> {
    const session = this.sessions.find((s) => s.sessionId === sessionId);
    if (!session)
      throw new VaultRefusedError(`Session not found: ${sessionId}`);
    const include = options.includeAssertions === true;
    const byCoachId = new Map(
      [...this.notes.values()].map((n) => [
        n.coachId,
        n.concept?.assertions ?? [],
      ]),
    );
    return tier2Payload(
      {
        items: session.items.map((i) => ({
          challenge: i.challenge,
          answer: i.answer,
          ...(include
            ? { coreAssertions: byCoachId.get(i.coachId) ?? [] }
            : {}),
        })),
      },
      { allowAssertions: include },
    );
  }

  async plan(request: FilingRequest, execute: boolean): Promise<FilingPlan> {
    if (request.kind !== 'file')
      throw new NotFoundError(`InMemoryVault does not support ${request.kind}`);
    const to = `${request.to}/${request.path.split('/').pop()}`;
    if (execute) {
      const note = this.notes.get(request.path)!;
      this.notes.delete(request.path);
      this.notes.set(to, { ...note, path: to });
    }
    return {
      actions: [{ op: 'move', from: request.path, to }],
      collisions: [],
      warnings: [],
      executed: execute,
    };
  }
}

export class ScriptedPartner implements SparringPartner {
  readonly challengeRequests: ChallengeRequest[] = [];
  readonly turnRequests: NextTurnRequest[] = [];
  readonly challenges: (string | OpeningChallenge | Error)[] = [];
  readonly turns: (NextTurn | Error)[] = [];
  readonly recallRequests: RecallCheckRequest[] = [];
  readonly covered: (string[] | Error)[] = [];

  async openingChallenge(request: ChallengeRequest): Promise<OpeningChallenge> {
    this.challengeRequests.push(structuredClone(request));
    const next = this.challenges.shift();
    if (next === undefined)
      throw new Error('ScriptedPartner ran out of challenges');
    if (next instanceof Error) throw next;
    return typeof next === 'string'
      ? {
          focus: "The note's central idea.",
          scope: [],
          jargon: [],
          challenge: next,
        }
      : next;
  }

  async nextTurn(request: NextTurnRequest): Promise<NextTurn> {
    this.turnRequests.push(structuredClone(request));
    const next = this.turns.shift();
    if (next === undefined) throw new Error('ScriptedPartner ran out of turns');
    if (next instanceof Error) throw next;
    return next;
  }

  async coveredAssertions(request: RecallCheckRequest): Promise<string[]> {
    this.recallRequests.push(structuredClone(request));
    const next = this.covered.shift();
    if (next === undefined)
      throw new Error('ScriptedPartner ran out of recall checks');
    if (next instanceof Error) throw next;
    return next;
  }
}

export class ScriptedJudge implements Judge {
  readonly payloads: Tier2Payload[] = [];
  readonly reports: JudgeReport[] = [];

  async judge(payload: Tier2Payload): Promise<JudgeReport> {
    this.payloads.push(payload);
    const next = this.reports.shift();
    if (!next) throw new Error('ScriptedJudge ran out of reports');
    return next;
  }
}

export class InMemoryPending implements PendingJudgements {
  readonly sessions: PendingSession[] = [];

  async list(): Promise<PendingSession[]> {
    return this.sessions.map((s) => ({ ...s, coachIds: [...s.coachIds] }));
  }

  async add(session: PendingSession): Promise<void> {
    await this.remove(session.sessionId);
    this.sessions.push(session);
  }

  async remove(sessionId: string): Promise<void> {
    const i = this.sessions.findIndex((s) => s.sessionId === sessionId);
    if (i >= 0) this.sessions.splice(i, 1);
  }
}

export class FixedClock implements Clock {
  private ticks = 0;

  constructor(public date: string) {}

  today(): string {
    return this.date;
  }

  now(): string {
    return new Date(
      Date.parse(`${this.date}T09:00:00.000Z`) + 1000 * this.ticks++,
    ).toISOString();
  }
}

export class ScriptedStudyPartner implements StudyPartner {
  readonly hints: string[] = [];
  readonly quotes: string[] = [];
  readonly checks: StudyCheck[] = [];
  readonly checked: string[] = [];

  readonly hintedFrom: string[] = [];
  readonly failing = new Set<string>();
  readonly requests: StudyRequest[] = [];
  readonly styles: string[] = [];

  async clue(request: StudyRequest): Promise<string> {
    if (this.failing.has('clue'))
      throw new UnusableReplyError('study partner', 'unusable');
    this.styles.push(request.style);
    return `Clue for ${request.gap}`;
  }

  async hint(request: StudyRequest): Promise<string> {
    if (this.failing.has('hint'))
      throw new UnusableReplyError('study partner', 'unusable');
    this.hintedFrom.push(request.note.title);
    return this.hints.shift() ?? `Hint about ${request.gap}?`;
  }

  async quote(_request: StudyRequest): Promise<string> {
    return this.quotes.shift() ?? '';
  }

  async check(
    request: StudyRequest & { explanation: string },
  ): Promise<StudyCheck> {
    this.requests.push(request);
    if (this.failing.has('check'))
      throw new UnusableReplyError('study partner', 'unusable');
    this.checked.push(request.explanation);
    const next = this.checks.shift();
    if (!next) throw new Error('ScriptedStudyPartner ran out of checks');
    return next;
  }
}

export class FixedClassifier implements StyleClassifier {
  readonly classified: string[] = [];

  constructor(private readonly style: CoachingStyle = 'feynman') {}

  async classify(note: Note, _rules: SparringRules): Promise<CoachingStyle> {
    this.classified.push(note.title);
    return this.style;
  }
}

export class InMemoryLibrary implements Library {
  readonly created: ConceptDraft[] = [];
  readonly searches: { query: string; within?: string }[] = [];

  constructor(
    private readonly vault: InMemoryVault,
    readonly books: BookProgress[] = [],
    readonly hits: PassageHit[] = [],
  ) {}

  readonly readingNotes: { input: ReadingNotesInput; execute: boolean }[] = [];
  readonly summaries: { chapter: string; text: string; execute: boolean }[] =
    [];
  readonly structures: { input: StructureInput; execute: boolean }[] = [];
  readonly structureWarnings: string[] = [];

  async readingProgress(book?: string): Promise<BookProgress[]> {
    return this.books.filter((b) => !book || b.folder === book);
  }

  async addReadingNotes(
    input: ReadingNotesInput,
    execute: boolean,
    versions?: Record<string, string>,
  ): Promise<ReadingNotesCheck> {
    this.readingNotes.push({ input: structuredClone(input), execute });
    if (execute && !versions)
      throw new VaultRefusedError('add_reading_notes: versions missing');
    const body = this.vault.notes.get(input.chapter)?.body ?? '';
    return {
      path: `3.Resources/Reading notes/${input.chapter.split('/').pop()}`,
      entries: input.notes.map((text) => ({
        text,
        quote: body.toLowerCase().includes(text.toLowerCase()),
      })),
      warnings: [],
      climbs: [],
      versions: { 'reading.md': `v${this.readingNotes.length}` },
      executed: execute,
    };
  }

  async writeSummary(
    chapter: string,
    text: string,
    execute: boolean,
  ): Promise<SummaryCheck> {
    this.summaries.push({ chapter, text, execute });
    return { warnings: [], executed: execute };
  }

  readonly guidelines: { input: GuidelineInput; execute: boolean }[] = [];

  async saveGuideline(
    input: GuidelineInput,
    execute: boolean,
  ): Promise<GuidelineCheck> {
    this.guidelines.push({ input: structuredClone(input), execute });
    return {
      path: `${input.folder}/${input.title}.md`,
      warnings: [],
      executed: execute,
    };
  }

  async writeStructure(
    input: StructureInput,
    execute: boolean,
    versions?: Record<string, string>,
  ): Promise<StructureCheck> {
    this.structures.push({ input: structuredClone(input), execute });
    if (execute && !versions)
      throw new VaultRefusedError('write_structure: versions missing');
    return {
      path: `3.Resources/Concepts/Structures/${input.book}.md`,
      warnings: [...this.structureWarnings],
      climbs: input.groups.flatMap((g) => g.concepts),
      versions: { 'structure.md': 'v1' },
      executed: execute,
    };
  }

  async findPassages(
    query: string,
    options: { within?: string; limit?: number } = {},
  ): Promise<PassageHit[]> {
    this.searches.push({ query, within: options.within });
    return this.hits
      .filter((h) => !options.within || h.note.startsWith(options.within))
      .slice(0, options.limit ?? 10);
  }

  async createConcept(
    draft: ConceptDraft,
    execute: boolean,
  ): Promise<ConceptCheck> {
    const fold = (text: string) =>
      text
        .replace(/==|\*\*|__/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase();
    const path = `3.Resources/Concepts/${draft.title}.md`;
    const passages = draft.passages.map((p) => {
      const body = this.vault.notes.get(p.note)?.body;
      const found = !!body && fold(body).includes(fold(p.quote));
      return {
        note: p.note,
        quote: p.quote,
        pages: p.pages ?? null,
        found,
        problem: found ? null : 'not found in the note',
      };
    });
    if (passages.some((p) => !p.found)) {
      throw new VaultRefusedError(
        'create_concept refused: a quote was not found',
      );
    }
    const collisions = this.vault.notes.has(path) ? [path] : [];
    const executed = execute && !collisions.length;
    if (executed) {
      this.created.push(draft);
      this.vault.put(path, draft.summary, {
        rawRole: null,
        concept: {
          assertions: draft.assertions,
          buzzwords: draft.buzzwords,
          passages: draft.passages.map((p) => ({
            note: p.note,
            quote: p.quote,
            pages: p.pages ?? null,
            found: true,
          })),
          problems: [],
        },
      });
    }
    return { path, collisions, passages, executed };
  }
}

export class ScriptedSynthesisPartner implements SynthesisPartner {
  ideas: IdeaProposal[] | Error = [];
  questions: string[] | Error = [];
  assertions: string[] | Error = [];
  buzzwords: string[] | Error = [];
  readonly seen: { summary?: string; answers?: readonly Exchange[] }[] = [];

  private reply<T>(value: T | Error): T {
    if (value instanceof Error) throw value;
    return value;
  }

  async proposeIdeas(_request: {
    material: readonly MaterialItem[];
  }): Promise<IdeaProposal[]> {
    return this.reply(this.ideas);
  }

  async gapQuestions(request: { summary: string }): Promise<string[]> {
    this.seen.push({ summary: request.summary });
    return this.reply(this.questions);
  }

  async draftAssertions(request: {
    summary: string;
    answers: readonly Exchange[];
  }): Promise<string[]> {
    this.seen.push({ summary: request.summary, answers: request.answers });
    return this.reply(this.assertions);
  }

  async suggestBuzzwords(_request: { title: string }): Promise<string[]> {
    return this.reply(this.buzzwords);
  }
}

export const unusable = (): UnusableReplyError =>
  new UnusableReplyError('model', 'scripted unusable reply');

export class ScriptedElaborationPartner implements ElaborationPartner {
  readonly questionRequests: ElaborationRequest[] = [];
  readonly followUpRequests: FollowUpRequest[] = [];
  readonly questionReplies: (ElaborationQuestions | Error)[] = [];
  readonly followUps: (FollowUp | null)[] = [];

  async questions(request: ElaborationRequest): Promise<ElaborationQuestions> {
    this.questionRequests.push(structuredClone(request));
    const next = this.questionReplies.shift();
    if (next === undefined)
      throw new UnusableReplyError('elaboration partner', 'no reply');
    if (next instanceof Error) throw next;
    return next;
  }

  async followUp(request: FollowUpRequest): Promise<FollowUp | null> {
    this.followUpRequests.push(structuredClone(request));
    return this.followUps.shift() ?? null;
  }
}

export class ScriptedStructurePartner implements StructurePartner {
  readonly requests: StructureQuestionRequest[] = [];
  readonly replies: (string[] | Error)[] = [];

  async questions(request: StructureQuestionRequest): Promise<string[]> {
    this.requests.push(structuredClone(request));
    const next = this.replies.shift() ?? [];
    if (next instanceof Error) throw next;
    return next;
  }
}

export class ScriptedTeachPartner implements TeachPartner {
  readonly requests: MisconceptionRequest[] = [];
  readonly replies: (Misconception | Error)[] = [];

  async misconception(request: MisconceptionRequest): Promise<Misconception> {
    this.requests.push(structuredClone(request));
    const next = this.replies.shift();
    if (next === undefined)
      throw new UnusableReplyError('teach partner', 'no reply');
    if (next instanceof Error) throw next;
    return next;
  }
}
