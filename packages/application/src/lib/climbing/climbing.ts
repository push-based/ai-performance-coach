import {
  buildClimb,
  canStart,
  nextStep,
  skippedSteps,
  type Climb,
  type ClimbStep,
} from '@ai-coach/domain';
import { NotFoundError, NotSparrableError } from '../errors.js';
import type { NoteDetails, NotesRepository } from '../ports/vault.js';

export interface ConceptClimb {
  path: string;
  title: string;
  climb: Climb;
  next: ClimbStep | null;
  skipped: ClimbStep[];
  teach: { ok: boolean; reason?: string };
}

const RAW = /(^|\/)0\.Raw\//;

export function climbOf(note: NoteDetails): ConceptClimb {
  const climb = buildClimb({
    conceptId: note.coachId ?? note.path,
    recorded: note.climb,
    recordedIn: note.path,
    attempts: note.sessions
      .filter((s) => s.tier === 1)
      .map((s) => ({
        date: s.date,
        verdict: s.verdict,
        evidence: s.sessionId,
      })),
  });
  return {
    path: note.path,
    title: note.title,
    climb,
    next: nextStep(climb),
    skipped: skippedSteps(climb),
    teach: canStart(climb, 'teach'),
  };
}

export class Climbing {
  constructor(private readonly notes: NotesRepository) {}

  async concept(ref: string): Promise<ConceptClimb> {
    const { notes } = await this.notes.listNotes({ bucket: 'resources' });
    const title = ref.trim().toLowerCase();
    const matches = notes.filter(
      (n) =>
        n.path === ref || n.coachId === ref || n.title.toLowerCase() === title,
    );
    if (!matches.length)
      throw new NotFoundError(`No Resources note matches "${ref}"`);
    if (matches.length > 1) {
      throw new NotFoundError(
        `"${ref}" matches ${matches.length} notes, give its path: ${matches.map((n) => n.path).join(', ')}`,
      );
    }
    const note = await this.notes.readNote(matches[0]!.path);
    if (!note.concept) {
      throw new NotSparrableError(
        `${note.path} is not a concept note: the climb belongs to concept notes, made with coach synthesize`,
      );
    }
    return climbOf(note);
  }

  async concepts(): Promise<ConceptClimb[]> {
    const { notes } = await this.notes.listNotes({ bucket: 'resources' });
    const details = await Promise.all(
      notes
        .filter((n) => !RAW.test(n.path))
        .map((n) => this.notes.readNote(n.path)),
    );
    return details
      .filter((n) => n.concept && !n.raw)
      .map(climbOf)
      .sort((a, b) => a.title.localeCompare(b.title));
  }
}
