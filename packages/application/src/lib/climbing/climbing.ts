import {
  JUDGE_FAILED,
  judgeFailedLatest,
  resourcesByCoachId,
} from '../history.js';
import type { PendingJudgements } from '../ports/state.js';
import type {
  ClimbRebuild,
  ConceptClimb,
  NotesRepository,
} from '../ports/vault.js';

export interface ClimbStatus extends ConceptClimb {
  waitingForJudge: boolean;
}

export class Climbing {
  constructor(
    private readonly notes: NotesRepository,
    private readonly pending: PendingJudgements,
  ) {}

  async concept(ref: string): Promise<ClimbStatus> {
    const note = ref.endsWith('.md')
      ? ref
      : ((await resourcesByCoachId(this.notes)).get(ref) ?? ref);
    const [climb] = await this.notes.climb(note);
    const [status] = await this.statuses([climb!]);
    return status!;
  }

  previewRebuild(): Promise<ClimbRebuild> {
    return this.notes.rebuildClimb(false);
  }

  rebuild(preview: ClimbRebuild): Promise<ClimbRebuild> {
    return this.notes.rebuildClimb(true, preview.versions);
  }

  async concepts(): Promise<ClimbStatus[]> {
    const climbs = await this.notes.climb();
    return this.statuses(
      [...climbs].sort((a, b) => a.title.localeCompare(b.title)),
    );
  }

  private async statuses(climbs: ConceptClimb[]): Promise<ClimbStatus[]> {
    const waiting = await this.waiting();
    return Promise.all(
      climbs.map(async (c) => ({
        ...c,
        teach: (await this.judgeFailed(c))
          ? { ok: false, reason: JUDGE_FAILED }
          : c.teach,
        waitingForJudge: waiting.has(c.path),
      })),
    );
  }

  private async judgeFailed(climb: ConceptClimb): Promise<boolean> {
    if (!climb.teach.ok) return false;
    return judgeFailedLatest(await this.notes.readNote(climb.path));
  }

  private async waiting(): Promise<Set<string>> {
    const ids = (await this.pending.list()).flatMap((s) => s.coachIds);
    if (!ids.length) return new Set();
    const paths = await resourcesByCoachId(this.notes);
    return new Set(
      ids.map((id) => paths.get(id)).filter((p): p is string => !!p),
    );
  }
}
