import type { ConceptClimb } from '@ai-coach/application';
import { CLIMB_STEPS, isDone, type ClimbStep } from '@ai-coach/domain';
import type { Coach } from './composition.js';
import { paint, type Terminal } from './terminal.js';

const LABEL: Record<ClimbStep, string> = {
  read: 'Read',
  group: 'Group',
  generate: 'Generate',
  retrieve: 'Retrieve',
  elaborate: 'Elaborate',
  space: 'Space',
  teach: 'Teach',
};

const TITLE_WIDTH = 24;

function command(step: ClimbStep, path: string): string | null {
  if (step === 'retrieve' || step === 'space')
    return `coach spar ${JSON.stringify(path)}`;
  return null;
}

function stepLabel(c: ConceptClimb, step: ClimbStep): string {
  if (!isDone(c.climb, step)) return paint('dim', `· ${LABEL[step]}`);
  return paint(step === 'teach' ? 'yellow' : 'green', `✓ ${LABEL[step]}`);
}

function nextLine(c: ConceptClimb): string {
  const parts: string[] = [];
  if (c.next === null) parts.push('all seven steps done');
  else if (c.next === 'teach' && !c.teach.ok) parts.push(c.teach.reason!);
  else {
    const run = command(c.next, c.path);
    parts.push(`next: ${c.next}${run ? ` · \`${run}\`` : ''}`);
  }
  if (c.skipped.length)
    parts.push(c.skipped.map((s) => `${LABEL[s]} skipped`).join(', '));
  return parts.join(' · ');
}

export function stairs(c: ConceptClimb, width = TITLE_WIDTH): string[] {
  return [
    `${c.title.padEnd(width)} ${CLIMB_STEPS.map((s) => stepLabel(c, s)).join('  ')}`,
    `${' '.repeat(width + 1)}${paint('dim', nextLine(c))}`,
  ];
}

export async function climb(
  coach: Coach,
  term: Terminal,
  args: string[],
): Promise<void> {
  const climbing = coach.climbing();
  const climbs = args.length
    ? await Promise.all(args.map((ref) => climbing.concept(ref)))
    : await climbing.concepts();
  if (!climbs.length) {
    term.print(
      'No concept notes yet. Make them from a book with coach synthesize.',
    );
    return;
  }
  const width = Math.max(TITLE_WIDTH, ...climbs.map((c) => c.title.length));
  for (const c of climbs) for (const line of stairs(c, width)) term.print(line);
}
