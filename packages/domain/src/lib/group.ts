import { DomainError } from './errors.js';
import { fold } from './text.js';

export const MIN_GROUPS = 2;
export const MAX_GROUPS = 7;
export const MAX_STRUCTURE_QUESTIONS = 3;

export interface ConceptGroup {
  name: string;
  concepts: string[];
}

export interface BuildsOn {
  from: string;
  to: string;
}

const EDGE = /^(.+?)\s*(?:→|->|=>|\bbuilds on\b)\s*(.+)$/i;
const QUOTED = /["“'‘]([^"”'’]{2,})["”'’]/g;
const PROPOSES =
  /\b(?:new|another|separate|extra|additional|its own|their own|a fifth|a sixth|a seventh)\s+(?:group|layer|category|level|bucket)\b|\b(?:create|add|introduce|make|form|split\s+\w+\s+into)\s+(?:a|an|two|three)?\s*(?:new\s+)?(?:group|layer|category|level|bucket)s?\b|\brename\b|\bcall (?:it|them)\b/i;

const same = (a: string, b: string) => fold(a.trim()) === fold(b.trim());

export function parseGroupLine(
  line: string,
  titles: readonly string[],
): ConceptGroup {
  const colon = line.indexOf(':');
  if (colon < 1)
    throw new DomainError(`Write a group as "name: concept, concept": ${line}`);
  const name = line.slice(0, colon).trim();
  const concepts = line
    .slice(colon + 1)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const n = Number(part);
      if (Number.isInteger(n) && n >= 1 && n <= titles.length)
        return titles[n - 1]!;
      const title = titles.find((t) => same(t, part));
      if (!title)
        throw new DomainError(`"${part}" is not one of the concepts listed`);
      return title;
    });
  return { name, concepts };
}

export function parseEdgeLine(line: string): BuildsOn {
  const match = EDGE.exec(line.trim());
  if (!match)
    throw new DomainError(
      `Write what builds on what as "components → primitives": ${line}`,
    );
  return { from: match[1]!.trim(), to: match[2]!.trim() };
}

export function findCycle(
  groups: readonly ConceptGroup[],
  edges: readonly BuildsOn[],
): string[] | null {
  const names = groups.map((g) => g.name);
  const canonical = (n: string) => names.find((x) => same(x, n)) ?? n;
  const next = new Map<string, string[]>();
  for (const e of edges) {
    const from = canonical(e.from);
    next.set(from, [...(next.get(from) ?? []), canonical(e.to)]);
  }
  const state = new Map<string, 'open' | 'done'>();
  const path: string[] = [];
  const visit = (node: string): string[] | null => {
    if (state.get(node) === 'done') return null;
    if (state.get(node) === 'open')
      return [...path.slice(path.indexOf(node)), node];
    state.set(node, 'open');
    path.push(node);
    for (const to of next.get(node) ?? []) {
      const cycle = visit(to);
      if (cycle) return cycle;
    }
    path.pop();
    state.set(node, 'done');
    return null;
  };
  for (const name of names) {
    const cycle = visit(name);
    if (cycle) return cycle;
  }
  return null;
}

export function structureProblems(
  groups: readonly ConceptGroup[],
  edges: readonly BuildsOn[],
  titles: readonly string[],
): string[] {
  const problems: string[] = [];
  if (groups.length < MIN_GROUPS || groups.length > MAX_GROUPS)
    problems.push(
      `Sort the concepts into ${MIN_GROUPS} to ${MAX_GROUPS} groups, not ${groups.length}`,
    );
  const names = groups.map((g) => g.name);
  for (const g of groups) {
    if (!g.name) problems.push('Every group needs a name');
    if (!g.concepts.length) problems.push(`Group "${g.name}" is empty`);
  }
  for (const [i, name] of names.entries())
    if (names.findIndex((n) => same(n, name)) !== i)
      problems.push(`Two groups are called "${name}"`);
  for (const title of titles) {
    const homes = groups.filter((g) => g.concepts.some((c) => same(c, title)));
    if (!homes.length) problems.push(`"${title}" is in no group`);
    if (homes.length > 1)
      problems.push(
        `"${title}" is in ${homes.length} groups: ${homes.map((g) => g.name).join(', ')}`,
      );
  }
  const known = (n: string) => names.some((x) => same(x, n));
  for (const e of edges) {
    if (!known(e.from) || !known(e.to))
      problems.push(`"${e.from} → ${e.to}" names a group that does not exist`);
    else if (same(e.from, e.to))
      problems.push(`"${e.from}" cannot build on itself`);
  }
  if (!problems.length) {
    const cycle = findCycle(groups, edges);
    if (cycle)
      problems.push(
        `"Builds on" is a layering, so it cannot go round in a circle: ${cycle.join(' → ')}`,
      );
  }
  return problems;
}

export function questionAllowed(
  question: string,
  groups: readonly ConceptGroup[],
  edges: readonly BuildsOn[],
  titles: readonly string[],
): boolean {
  if (!question.trim() || PROPOSES.test(question)) return false;
  const names = groups.map((g) => g.name);
  for (const m of question.matchAll(QUOTED)) {
    const quoted = m[1]!;
    if (![...names, ...titles].some((n) => same(n, quoted))) return false;
  }
  const folded = fold(question);
  for (const a of names)
    for (const b of names) {
      if (same(a, b) || edges.some((e) => same(e.from, a) && same(e.to, b)))
        continue;
      const [x, y] = [fold(a), fold(b)];
      if (
        [`${x} → ${y}`, `${x} -> ${y}`, `${x} builds on ${y}`].some((s) =>
          folded.includes(s),
        )
      )
        return false;
    }
  return true;
}
