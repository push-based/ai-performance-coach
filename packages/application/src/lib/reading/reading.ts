import {
  NOTE_SHARE_LIMIT,
  hasChapterSummary,
  noteShare,
  readingNote,
  sections,
  summaryProblem,
  type ReadingNote,
  type Section,
  type SparringRules,
} from '@ai-coach/domain';
import { findBook } from '../books.js';
import { NotFoundError, NotSparrableError } from '../errors.js';
import type {
  BookProgress,
  Library,
  ReadingNotesCheck,
  SummaryCheck,
} from '../ports/library.js';
import type { NoteDetails, NotesRepository } from '../ports/vault.js';

export interface ReadingDeps {
  notes: NotesRepository;
  library: Library;
  rules: SparringRules;
}

export interface PageNotes {
  page: number | null;
  notes: ReadingNote[];
}

export interface ReadPlan {
  pages: {
    page: number | null;
    notes: ReadingNote[];
    check: ReadingNotesCheck;
  }[];
  summary: { text: string; check: SummaryCheck } | null;
  counts: boolean;
}

export class ReadSession {
  readonly sections: Section[];
  readonly hasSummary: boolean;

  constructor(
    private readonly deps: ReadingDeps,
    readonly book: string,
    readonly chapter: NoteDetails,
  ) {
    this.sections = sections(chapter.body);
    this.hasSummary = hasChapterSummary(chapter.body);
  }

  get text(): string {
    return this.sections.map((s) => s.text).join('\n\n');
  }

  note(text: string, section: Section): ReadingNote {
    return readingNote(text, section.text, this.deps.rules.verbatimRunWords);
  }

  tooMuch(notes: readonly ReadingNote[], section: Section): boolean {
    return noteShare(notes, section.text) > NOTE_SHARE_LIMIT;
  }

  summaryProblem(text: string): string | null {
    return summaryProblem(text, this.text, this.deps.rules.verbatimRunWords);
  }

  async plan(
    pages: readonly PageNotes[],
    summary: string | null,
  ): Promise<ReadPlan> {
    const written = pages.filter((p) => p.notes.length);
    if (summary !== null) {
      const problem = this.summaryProblem(summary);
      if (problem) throw new NotSparrableError(problem);
    }
    if (!written.length && summary === null)
      throw new NotSparrableError('Nothing to write: no notes and no summary');
    const checked = [];
    for (const p of written) {
      checked.push({
        ...p,
        check: await this.deps.library.addReadingNotes(
          {
            chapter: this.chapter.path,
            page: p.page,
            notes: p.notes.map((n) => n.text),
          },
          false,
        ),
      });
    }
    const summaryCheck =
      summary === null
        ? null
        : {
            text: summary.trim(),
            check: await this.deps.library.writeSummary(
              this.chapter.path,
              summary.trim(),
              false,
            ),
          };
    const ownWords = written.some((p) => p.notes.some((n) => !n.quote));
    return {
      pages: checked,
      summary: summaryCheck,
      counts: ownWords && (this.hasSummary || summaryCheck !== null),
    };
  }

  async record(plan: ReadPlan): Promise<string[]> {
    const written: string[] = [];
    if (plan.summary) {
      await this.deps.library.writeSummary(
        this.chapter.path,
        plan.summary.text,
        true,
      );
      written.push(this.chapter.path);
    }
    for (const p of plan.pages) {
      const input = {
        chapter: this.chapter.path,
        page: p.page,
        notes: p.notes.map((n) => n.text),
      };
      const fresh = await this.deps.library.addReadingNotes(input, false);
      const done = await this.deps.library.addReadingNotes(
        input,
        true,
        fresh.versions,
      );
      if (done.path && !written.includes(done.path)) written.push(done.path);
    }
    return written;
  }
}

export class Reading {
  constructor(private readonly deps: ReadingDeps) {}

  async books(): Promise<BookProgress[]> {
    return (await this.deps.library.readingProgress()).filter(
      (b) => b.chapters.length,
    );
  }

  async open(book: string, chapter?: string): Promise<ReadSession> {
    const progress = await findBook(this.deps.library, book);
    if (!progress.chapters.length)
      throw new NotFoundError(`${progress.title} has no chapters`);
    const wanted = chapter?.trim();
    const n = Number(wanted);
    const picked = !wanted
      ? (progress.chapters.find((c) => c.state !== 'complete') ??
        progress.chapters[0]!)
      : Number.isInteger(n) && n >= 1 && n <= progress.chapters.length
        ? progress.chapters[n - 1]!
        : progress.chapters.find(
            (c) =>
              c.path === wanted ||
              c.title.toLowerCase() === wanted!.toLowerCase(),
          );
    if (!picked)
      throw new NotFoundError(`${progress.title} has no chapter "${chapter}"`);
    const note = await this.deps.notes.readNote(picked.path);
    if (note.rawRole !== 'chapter')
      throw new NotSparrableError(`${picked.path} is not a book chapter`);
    return new ReadSession(this.deps, progress.title, note);
  }
}
