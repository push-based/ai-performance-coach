import {
  MAX_ASSERTIONS,
  MAX_BUZZWORDS,
  MIN_QUOTE,
  WHY_IT_MATTERS,
  conceptDraft,
  extractMarks,
  extractNoteItems,
  fold,
  locateQuote,
  quotable,
  quotesFrom,
  type ConceptDraft,
  type ConceptPassageDraft,
  type Exchange,
  type MaterialItem,
  type SparringRules,
} from '@ai-coach/domain';
import { findBook } from '../books.js';
import { UnusableReplyError } from '../errors.js';
import type {
  BookProgress,
  ConceptCheck,
  SynthesisPartner,
  IdeaProposal,
  Library,
} from '../ports/library.js';
import type { NoteDetails, NotesRepository } from '../ports/vault.js';

export interface Idea {
  title: string;
  items: MaterialItem[];
}

export interface SynthesizingDeps {
  notes: NotesRepository;
  library: Library;
  partner: SynthesisPartner;
  rules: SparringRules;
}

const MAX_IDEAS = 6;
const MAX_QUESTIONS = 2;

interface Located {
  path: string;
  title: string;
  page: number | null;
}

type Item = Omit<MaterialItem, 'id'>;

function quoteFromSnippet(snippet: string): string | null {
  const trimmed = snippet.replace(/^…\s*/, '').replace(/\s*…$/, '').trim();
  const sentences = trimmed.match(/[A-Z][^.!?]*[.!?]/g) ?? [];
  const best = sentences.sort((a, b) => b.length - a.length)[0] ?? trimmed;
  return best.length >= MIN_QUOTE ? best.trim() : null;
}

function unique(items: readonly Item[]): Item[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [item.kind, item.note, fold(item.text)].join('\u0000');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class Synthesizing {
  constructor(private readonly deps: SynthesizingDeps) {}

  books(): Promise<BookProgress[]> {
    return this.deps.library.readingProgress();
  }

  book(ref: string): Promise<BookProgress> {
    return findBook(this.deps.library, ref);
  }

  async gather(book: BookProgress): Promise<MaterialItem[]> {
    const read = new Map<string, Promise<NoteDetails>>();
    const chapter = (path: string) => {
      if (!read.has(path)) read.set(path, this.deps.notes.readNote(path));
      return read.get(path)!;
    };
    const items: Item[] = [];
    for (const c of book.chapters.filter((c) => c.state !== 'untouched')) {
      for (const mark of extractMarks((await chapter(c.path)).body))
        items.push({ ...mark, note: c.path, chapter: c.title });
    }
    for (const path of book.notes) {
      const note = await this.deps.notes.readNote(path);
      for (const { source, ...item } of extractNoteItems(note.body)) {
        const own = { note: path, chapter: note.title };
        if (item.kind !== 'highlight' && item.kind !== 'bold') {
          items.push({ ...item, ...own });
          continue;
        }
        const quote = item.within ?? item.text;
        const found = quotable(quote)
          ? await this.locate(quote, book, chapter, source)
          : null;
        items.push(
          found
            ? {
                ...item,
                page: found.page ?? item.page,
                note: found.path,
                chapter: found.title,
              }
            : { kind: 'note', text: item.text, page: item.page, ...own },
        );
      }
    }
    return unique(items).map((item, i) => ({ ...item, id: i + 1 }));
  }

  private async locate(
    quote: string,
    book: BookProgress,
    chapter: (path: string) => Promise<NoteDetails>,
    hint?: string,
  ): Promise<Located | null> {
    const ordered = [...book.chapters].sort(
      (a, b) => Number(b.path === hint) - Number(a.path === hint),
    );
    for (const c of ordered) {
      const section = locateQuote(quote, (await chapter(c.path)).body);
      if (section) return { path: c.path, title: c.title, page: section.page };
    }
    return null;
  }

  async ideas(material: readonly MaterialItem[]): Promise<Idea[]> {
    const byId = new Map(material.map((m) => [m.id, m]));
    let proposals: IdeaProposal[] = [];
    try {
      proposals = await this.deps.partner.proposeIdeas({
        rules: this.deps.rules,
        material,
        max: MAX_IDEAS,
      });
    } catch (err) {
      if (!(err instanceof UnusableReplyError)) throw err;
    }
    const ideas = proposals
      .map((p) => ({
        title: p.title.trim(),
        items: [...new Set(p.items)]
          .map((id) => byId.get(id))
          .filter((m): m is MaterialItem => !!m),
      }))
      .filter((idea) => idea.title && idea.items.length)
      .slice(0, MAX_IDEAS);
    if (ideas.length) return ideas;
    const byChapter = new Map<string, MaterialItem[]>();
    for (const item of material) {
      byChapter.set(item.chapter, [
        ...(byChapter.get(item.chapter) ?? []),
        item,
      ]);
    }
    return [...byChapter].map(([title, items]) => ({ title, items }));
  }

  async questions(idea: Idea, summary: string): Promise<string[]> {
    return [...(await this.gapQuestions(idea, summary)), WHY_IT_MATTERS];
  }

  private async gapQuestions(idea: Idea, summary: string): Promise<string[]> {
    try {
      const asked = await this.deps.partner.gapQuestions({
        rules: this.deps.rules,
        title: idea.title,
        summary,
        material: idea.items,
        max: MAX_QUESTIONS,
      });
      return asked
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, MAX_QUESTIONS);
    } catch (err) {
      if (err instanceof UnusableReplyError) return [];
      throw err;
    }
  }

  async assertions(
    idea: Idea,
    summary: string,
    answers: readonly Exchange[],
  ): Promise<string[]> {
    try {
      const drafted = await this.deps.partner.draftAssertions({
        rules: this.deps.rules,
        title: idea.title,
        summary,
        answers,
        max: MAX_ASSERTIONS,
      });
      return drafted
        .map((a) => a.trim())
        .filter(Boolean)
        .slice(0, MAX_ASSERTIONS);
    } catch (err) {
      if (err instanceof UnusableReplyError) return [];
      throw err;
    }
  }

  async buzzwords(idea: Idea): Promise<string[]> {
    try {
      const suggested = await this.deps.partner.suggestBuzzwords({
        rules: this.deps.rules,
        title: idea.title,
        material: idea.items,
        max: MAX_BUZZWORDS,
      });
      return [...new Set(suggested.map((b) => b.trim()).filter(Boolean))].slice(
        0,
        MAX_BUZZWORDS,
      );
    } catch (err) {
      if (err instanceof UnusableReplyError) return [];
      throw err;
    }
  }

  async passages(
    idea: Idea,
    book: BookProgress,
  ): Promise<ConceptPassageDraft[]> {
    const marked = quotesFrom(idea.items);
    if (marked.length) return marked;
    const found: ConceptPassageDraft[] = [];
    for (const item of idea.items.filter(
      (i) => i.kind === 'note' || i.kind === 'summary',
    )) {
      const hits = await this.deps.library.findPassages(
        item.text.slice(0, 200),
        {
          within: book.folder,
          limit: 2,
        },
      );
      for (const hit of hits) {
        const quote = quoteFromSnippet(hit.snippet);
        if (quote && !found.some((f) => f.quote === quote)) {
          found.push({
            note: hit.note,
            quote,
            ...(hit.page !== null ? { pages: String(hit.page) } : {}),
          });
        }
      }
      if (found.length >= 3) break;
    }
    return found.slice(0, 3);
  }

  draft(input: ConceptDraft): ConceptDraft {
    return conceptDraft(input);
  }

  async preview(draft: ConceptDraft): Promise<ConceptCheck> {
    return this.deps.library.createConcept(conceptDraft(draft), false);
  }

  async create(draft: ConceptDraft): Promise<ConceptCheck> {
    return this.deps.library.createConcept(conceptDraft(draft), true);
  }
}
