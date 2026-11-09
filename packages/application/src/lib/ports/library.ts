import type {
  BuildsOn,
  ConceptDraft,
  ConceptGroup,
  Exchange,
  MaterialItem,
  SparringRules,
} from '@ai-coach/domain';

export type ChapterState = 'untouched' | 'in_progress' | 'complete';

export interface BookProgress {
  index: string;
  folder: string;
  title: string;
  author: string | null;
  stage: string;
  notes: string[];
  concepts?: string[];
  chapters: {
    path: string;
    title: string;
    summary: boolean;
    state: ChapterState;
  }[];
}

export interface PassageHit {
  note: string;
  title: string;
  page: number | null;
  snippet: string;
}

export interface ConceptCheck {
  path: string | null;
  collisions: string[];
  passages: {
    note: string;
    quote: string;
    pages: string | null;
    found: boolean;
    problem: string | null;
  }[];
  executed: boolean;
}

export interface StructureInput {
  book: string;
  groups: { name: string; concepts: string[] }[];
  buildsOn: BuildsOn[];
}

export interface StructureCheck {
  path: string | null;
  warnings: string[];
  climbs: string[];
  versions: Record<string, string>;
  executed: boolean;
}

export interface ReadingNotesInput {
  chapter: string;
  page: number | null;
  notes: string[];
}

export interface ReadingNotesCheck {
  path: string | null;
  entries: { text: string; quote: boolean }[];
  warnings: string[];
  climbs: string[];
  versions: Record<string, string>;
  executed: boolean;
}

export interface SummaryCheck {
  warnings: string[];
  executed: boolean;
}

export interface Library {
  readingProgress(book?: string): Promise<BookProgress[]>;
  addReadingNotes(
    input: ReadingNotesInput,
    execute: boolean,
    versions?: Record<string, string>,
  ): Promise<ReadingNotesCheck>;
  writeSummary(
    chapter: string,
    text: string,
    execute: boolean,
  ): Promise<SummaryCheck>;
  writeStructure(
    input: StructureInput,
    execute: boolean,
    versions?: Record<string, string>,
  ): Promise<StructureCheck>;
  findPassages(
    query: string,
    options: { within?: string; limit?: number },
  ): Promise<PassageHit[]>;
  createConcept(draft: ConceptDraft, execute: boolean): Promise<ConceptCheck>;
}

export interface IdeaProposal {
  title: string;
  items: number[];
}

export interface SynthesisPartner {
  proposeIdeas(request: {
    rules: SparringRules;
    material: readonly MaterialItem[];
    max: number;
  }): Promise<IdeaProposal[]>;
  gapQuestions(request: {
    rules: SparringRules;
    title: string;
    summary: string;
    material: readonly MaterialItem[];
    max: number;
  }): Promise<string[]>;
  draftAssertions(request: {
    rules: SparringRules;
    title: string;
    summary: string;
    answers: readonly Exchange[];
    max: number;
  }): Promise<string[]>;
  suggestBuzzwords(request: {
    rules: SparringRules;
    title: string;
    material: readonly MaterialItem[];
    max: number;
  }): Promise<string[]>;
}

export interface StructureQuestionRequest {
  rules: SparringRules;
  book: string;
  groups: readonly ConceptGroup[];
  buildsOn: readonly BuildsOn[];
  max: number;
}

export interface StructurePartner {
  questions(request: StructureQuestionRequest): Promise<string[]>;
}
