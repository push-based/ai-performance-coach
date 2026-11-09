import type { ConceptClimb } from '@ai-coach/application';
import { CLIMB_STEPS, type ClimbStep } from '@ai-coach/domain';
import type { Coach } from './composition.js';
import type { CommandOptions } from './commands.js';
import { confirm, paint, type Terminal } from './terminal.js';

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
  if (!c.steps[step]) return paint('dim', `· ${LABEL[step]}`);
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
  const indent = ' '.repeat(width + 1);
  return [
    `${c.title.padEnd(width)} ${CLIMB_STEPS.map((s) => stepLabel(c, s)).join('  ')}`,
    `${indent}${paint('dim', nextLine(c))}`,
    ...(c.current
      ? []
      : [
          `${indent}${paint('yellow', 'the climb: summary in the note does not match its evidence; coach climb --rebuild fixes it')}`,
        ]),
  ];
}

async function rebuild(coach: Coach, term: Terminal): Promise<void> {
  const climbing = coach.climbing();
  const preview = await climbing.previewRebuild();
  if (!preview.climbs.length) {
    term.print('Every climb: summary already matches its evidence.');
    return;
  }
  term.print('These climb: summaries will be set to what the evidence shows:');
  for (const path of preview.climbs) term.print(`  ${path}`);
  if (!(await confirm(term, 'Rebuild them?', true))) {
    term.print('Nothing was changed.');
    return;
  }
  const done = await climbing.rebuild(preview);
  term.print(paint('green', `Rebuilt ${done.climbs.length} climb summaries.`));
}

export async function climb(
  coach: Coach,
  term: Terminal,
  args: string[],
  options: CommandOptions = {},
): Promise<void> {
  if (options.rebuild) return rebuild(coach, term);
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
