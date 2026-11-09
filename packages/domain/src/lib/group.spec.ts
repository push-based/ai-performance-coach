import { DomainError } from './errors.js';
import {
  findCycle,
  parseEdgeLine,
  parseGroupLine,
  questionAllowed,
  structureProblems,
  type BuildsOn,
  type ConceptGroup,
} from './group.js';

const TITLES = ['Design tokens', 'Primitives', 'Components', 'Patterns'];
const LAYERS: ConceptGroup[] = [
  { name: 'Values', concepts: ['Design tokens'] },
  { name: 'Parts', concepts: ['Primitives'] },
  { name: 'Widgets', concepts: ['Components'] },
  { name: 'Recipes', concepts: ['Patterns'] },
];
const EDGES: BuildsOn[] = [
  { from: 'Parts', to: 'Values' },
  { from: 'Widgets', to: 'Parts' },
  { from: 'Recipes', to: 'Widgets' },
];

describe('reading a structure', () => {
  it('reads a group by concept titles or list numbers', () => {
    expect(parseGroupLine('Values: design tokens, 2', TITLES)).toEqual({
      name: 'Values',
      concepts: ['Design tokens', 'Primitives'],
    });
    expect(() => parseGroupLine('Values design tokens', TITLES)).toThrow(
      DomainError,
    );
    expect(() => parseGroupLine('Values: Typography', TITLES)).toThrow(
      /not one of the concepts/,
    );
  });

  it('reads an edge with an arrow or "builds on"', () => {
    expect(parseEdgeLine('Widgets → Parts')).toEqual({
      from: 'Widgets',
      to: 'Parts',
    });
    expect(parseEdgeLine('recipes builds on widgets')).toEqual({
      from: 'recipes',
      to: 'widgets',
    });
    expect(() => parseEdgeLine('Widgets and Parts')).toThrow(DomainError);
  });
});

describe('the rules of a structure', () => {
  it('passes the four demo layers with three edges', () => {
    expect(structureProblems(LAYERS, EDGES, TITLES)).toEqual([]);
  });

  it('rejects too few groups, an empty group and an orphan or doubled concept', () => {
    expect(
      structureProblems([{ name: 'All', concepts: TITLES }], [], TITLES),
    ).toEqual(['Sort the concepts into 2 to 7 groups, not 1']);
    const problems = structureProblems(
      [
        { name: 'Values', concepts: ['Design tokens', 'Primitives'] },
        { name: 'Parts', concepts: ['Primitives'] },
        { name: 'Empty', concepts: [] },
      ],
      [],
      TITLES,
    );
    expect(problems).toContain('Group "Empty" is empty');
    expect(problems).toContain('"Components" is in no group');
    expect(problems).toContain('"Primitives" is in 2 groups: Values, Parts');
  });

  it('rejects edges to missing groups, onto themselves, and cycles, naming the cycle', () => {
    expect(
      structureProblems(LAYERS, [{ from: 'Parts', to: 'Atoms' }], TITLES),
    ).toEqual(['"Parts → Atoms" names a group that does not exist']);
    expect(
      structureProblems(LAYERS, [{ from: 'Parts', to: 'parts' }], TITLES),
    ).toEqual(['"Parts" cannot build on itself']);
    const cyclic = [...EDGES, { from: 'Values', to: 'Recipes' }];
    expect(findCycle(LAYERS, cyclic)).toEqual([
      'Values',
      'Recipes',
      'Widgets',
      'Parts',
      'Values',
    ]);
    expect(structureProblems(LAYERS, cyclic, TITLES)[0]).toMatch(
      /circle: Values → Recipes → Widgets → Parts → Values/,
    );
  });
});

describe('embedded questions', () => {
  it('keeps questions about the learner own groups and edges', () => {
    expect(
      questionAllowed(
        'Nothing builds on "Recipes". Is that right?',
        LAYERS,
        EDGES,
        TITLES,
      ),
    ).toBe(true);
    expect(
      questionAllowed(
        'You put Primitives with Parts, yet does a primitive ever use a component?',
        LAYERS,
        EDGES,
        TITLES,
      ),
    ).toBe(true);
  });

  it('drops a question that proposes a group or an edge the learner did not make', () => {
    expect(
      questionAllowed(
        'Should Patterns get a separate group for forms?',
        LAYERS,
        EDGES,
        TITLES,
      ),
    ).toBe(false);
    expect(
      questionAllowed(
        'Where would "Atoms" fit in this?',
        LAYERS,
        EDGES,
        TITLES,
      ),
    ).toBe(false);
    expect(
      questionAllowed(
        'Have you considered that Recipes → Values directly?',
        LAYERS,
        EDGES,
        TITLES,
      ),
    ).toBe(false);
  });
});
