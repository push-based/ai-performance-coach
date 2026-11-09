import {
  MAX_STRUCTURE_QUESTIONS,
  questionAllowed,
  structureProblems,
  type BuildsOn,
  type ConceptGroup,
  type SparringRules,
} from '@ai-coach/domain';
import {
  NotSparrableError,
  UnavailableError,
  UnusableReplyError,
} from '../errors.js';
import type {
  BookProgress,
  Library,
  StructureCheck,
  StructurePartner,
} from '../ports/library.js';
import type { NotesRepository } from '../ports/vault.js';
import { findBook } from '../books.js';

export interface GroupingDeps {
  notes: NotesRepository;
  library: Library;
  partner: StructurePartner;
  rules: SparringRules;
}

export interface ConceptTitle {
  path: string;
  title: string;
}

export interface StructurePlan {
  groups: ConceptGroup[];
  buildsOn: BuildsOn[];
  check: StructureCheck;
}

export class StructureError extends NotSparrableError {}

export class GroupSession {
  constructor(
    private readonly deps: GroupingDeps,
    readonly book: string,
    readonly concepts: ConceptTitle[],
  ) {}

  get titles(): string[] {
    return this.concepts.map((c) => c.title);
  }

  problems(groups: readonly ConceptGroup[], buildsOn: readonly BuildsOn[]) {
    return structureProblems(groups, buildsOn, this.titles);
  }

  async questions(
    groups: readonly ConceptGroup[],
    buildsOn: readonly BuildsOn[],
  ): Promise<string[]> {
    let asked: string[];
    try {
      asked = await this.deps.partner.questions({
        rules: this.deps.rules,
        book: this.book,
        groups,
        buildsOn,
        max: MAX_STRUCTURE_QUESTIONS,
      });
    } catch (err) {
      if (err instanceof UnusableReplyError || err instanceof UnavailableError)
        return [];
      throw err;
    }
    return asked
      .filter((q) => questionAllowed(q, groups, buildsOn, this.titles))
      .slice(0, MAX_STRUCTURE_QUESTIONS);
  }

  async plan(
    groups: readonly ConceptGroup[],
    buildsOn: readonly BuildsOn[],
  ): Promise<StructurePlan> {
    const problems = this.problems(groups, buildsOn);
    if (problems.length) throw new StructureError(problems.join('; '));
    const check = await this.deps.library.writeStructure(
      this.input(groups, buildsOn),
      false,
    );
    return { groups: [...groups], buildsOn: [...buildsOn], check };
  }

  record(plan: StructurePlan): Promise<StructureCheck> {
    return this.deps.library.writeStructure(
      this.input(plan.groups, plan.buildsOn),
      true,
      plan.check.versions,
    );
  }

  private input(
    groups: readonly ConceptGroup[],
    buildsOn: readonly BuildsOn[],
  ) {
    const pathOf = (title: string) =>
      this.concepts.find((c) => c.title === title)?.path ?? title;
    return {
      book: this.book,
      groups: groups.map((g) => ({
        name: g.name,
        concepts: g.concepts.map(pathOf),
      })),
      buildsOn: buildsOn.map((e) => ({ from: e.from, to: e.to })),
    };
  }
}

export class Grouping {
  constructor(private readonly deps: GroupingDeps) {}

  async books(): Promise<BookProgress[]> {
    const books = await this.deps.library.readingProgress();
    return books.filter((b) => (b.concepts?.length ?? 0) >= 2);
  }

  async open(book: string): Promise<GroupSession> {
    const progress = await findBook(this.deps.library, book);
    const { notes } = await this.deps.notes.listNotes({ bucket: 'resources' });
    const titles = new Map(notes.map((n) => [n.path, n.title]));
    const concepts = (progress.concepts ?? []).map((path) => ({
      path,
      title: titles.get(path) ?? path.replace(/^.*\//, '').replace(/\.md$/, ''),
    }));
    if (concepts.length < 2)
      throw new StructureError(
        `${progress.title} has ${concepts.length} concept note(s): grouping needs at least two. Make them with coach synthesize`,
      );
    return new GroupSession(this.deps, progress.title, concepts);
  }
}
