import { resourcesByCoachId } from '../history.js';
import type {
  ClimbRebuild,
  ConceptClimb,
  NotesRepository,
} from '../ports/vault.js';

export class Climbing {
  constructor(private readonly notes: NotesRepository) {}

  async concept(ref: string): Promise<ConceptClimb> {
    const note = ref.endsWith('.md')
      ? ref
      : ((await resourcesByCoachId(this.notes)).get(ref) ?? ref);
    const [climb] = await this.notes.climb(note);
    return climb!;
  }

  previewRebuild(): Promise<ClimbRebuild> {
    return this.notes.rebuildClimb(false);
  }

  rebuild(preview: ClimbRebuild): Promise<ClimbRebuild> {
    return this.notes.rebuildClimb(true, preview.versions);
  }

  async concepts(): Promise<ConceptClimb[]> {
    const climbs = await this.notes.climb();
    return [...climbs].sort((a, b) => a.title.localeCompare(b.title));
  }
}
