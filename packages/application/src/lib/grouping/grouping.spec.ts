import { sparringRules } from '@ai-coach/domain';
import {
  InMemoryLibrary,
  InMemoryVault,
  ScriptedStructurePartner,
} from '../../testing/in-memory.js';
import { NotFoundError, UnavailableError } from '../errors.js';
import { Grouping, StructureError } from './grouping.js';

const BOOK = 'Design System Architecture';
const CONCEPTS = ['Design tokens', 'Primitives', 'Components', 'Patterns'].map(
  (t) => `3.Resources/Concepts/${t}.md`,
);
const LAYERS = [
  { name: 'Values', concepts: ['Design tokens'] },
  { name: 'Parts', concepts: ['Primitives'] },
  { name: 'Widgets', concepts: ['Components'] },
  { name: 'Recipes', concepts: ['Patterns'] },
];
const EDGES = [
  { from: 'Parts', to: 'Values' },
  { from: 'Widgets', to: 'Parts' },
  { from: 'Recipes', to: 'Widgets' },
];

function setup(concepts = CONCEPTS) {
  const vault = new InMemoryVault();
  for (const path of CONCEPTS) vault.put(path, 'Concept.');
  const library = new InMemoryLibrary(vault, [
    {
      index: `3.Resources/0.Raw/${BOOK}/text.md`,
      folder: `3.Resources/0.Raw/${BOOK}`,
      title: BOOK,
      author: null,
      stage: 'concepts',
      notes: [],
      concepts,
      chapters: [],
    },
  ]);
  const partner = new ScriptedStructurePartner();
  const grouping = new Grouping({
    notes: vault,
    library,
    partner,
    rules: sparringRules(),
  });
  return { library, partner, grouping };
}

describe('Grouping', () => {
  it('lists the book concepts by title only', async () => {
    const { grouping } = setup();
    const session = await grouping.open(BOOK.toLowerCase());
    expect(session.titles).toEqual([
      'Design tokens',
      'Primitives',
      'Components',
      'Patterns',
    ]);
    expect((await grouping.books()).map((b) => b.title)).toEqual([BOOK]);
  });

  it('refuses a book with fewer than two concepts, or none at all', async () => {
    await expect(
      setup(CONCEPTS.slice(0, 1)).grouping.open(BOOK),
    ).rejects.toThrow(StructureError);
    await expect(setup().grouping.open('Another book')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('asks the model about the learner structure, and drops any question that smuggles one in', async () => {
    const { partner, grouping } = setup();
    partner.replies.push([
      'Nothing builds on Recipes. Is that right?',
      'Should Patterns get a separate group for forms?',
      'Where would "Atoms" fit?',
      'Does a primitive ever use a component?',
      'Is Values really the bottom?',
    ]);
    const session = await grouping.open(BOOK);
    expect(await session.questions(LAYERS, EDGES)).toEqual([
      'Nothing builds on Recipes. Is that right?',
      'Does a primitive ever use a component?',
      'Is Values really the bottom?',
    ]);
    expect(partner.requests[0]).toMatchObject({ book: BOOK, max: 3 });
    expect(JSON.stringify(partner.requests[0])).not.toContain('Concept.');
  });

  it('asks nothing when the model cannot be reached', async () => {
    const { partner, grouping } = setup();
    partner.replies.push(new UnavailableError('ollama', 'down'));
    const session = await grouping.open(BOOK);
    expect(await session.questions(LAYERS, EDGES)).toEqual([]);
  });

  it('previews the four layers by path, then writes them with the preview versions', async () => {
    const { library, grouping } = setup();
    const session = await grouping.open(BOOK);
    const plan = await session.plan(LAYERS, EDGES);
    expect(library.structures[0]).toEqual({
      execute: false,
      input: {
        book: BOOK,
        groups: LAYERS.map((g, i) => ({
          name: g.name,
          concepts: [CONCEPTS[i]],
        })),
        buildsOn: EDGES,
      },
    });
    const done = await session.record(plan);
    expect(done.executed).toBe(true);
    expect(library.structures[1]!.execute).toBe(true);
  });

  it('refuses a cycle or an orphan before anything reaches the vault', async () => {
    const { library, grouping } = setup();
    const session = await grouping.open(BOOK);
    await expect(
      session.plan(LAYERS, [...EDGES, { from: 'Values', to: 'Recipes' }]),
    ).rejects.toThrow(/circle/);
    await expect(session.plan(LAYERS.slice(0, 3), [])).rejects.toThrow(
      /"Patterns" is in no group/,
    );
    expect(library.structures).toEqual([]);
  });
});
