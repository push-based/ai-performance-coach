import { COACHING_STYLES } from './coaching-style.js';
import {
  CONNECT_ANGLES,
  elaborationProblem,
  fallbackQuestions,
  nextFollowUp,
  givesAway,
  hasReason,
  linksIn,
} from './elaborate.js';

const SELF = '3.Resources/Concepts/Design tokens.md';

describe('elaboration rules', () => {
  it('wants a why answer to give a reason and what follows from it', () => {
    expect(
      hasReason('Because a colour changes in one place, every screen follows.'),
    ).toBe(true);
    expect(
      hasReason('Otherwise each team picks its own blue and the app drifts.'),
    ).toBe(true);
    expect(hasReason('It is nice and tidy.')).toBe(false);
    expect(hasReason('Because.')).toBe(false);
    expect(
      elaborationProblem(
        { kind: 'why', answer: 'Tokens are good.', links: [] },
        SELF,
      ),
    ).toMatch(/reason/);
  });

  it('wants a connect answer to link another note or name own work, never itself', () => {
    expect(
      elaborationProblem(
        { kind: 'connect', answer: 'Like a style guide.', links: [] },
        SELF,
      ),
    ).toMatch(/link another note/);
    expect(
      elaborationProblem(
        { kind: 'connect', answer: 'Like this.', links: [SELF] },
        SELF,
      ),
    ).toMatch(/does not count/);
    expect(
      elaborationProblem(
        {
          kind: 'connect',
          answer: 'Like CSS custom properties.',
          links: ['3.Resources/CSS/Custom properties.md'],
        },
        SELF,
      ),
    ).toBeNull();
    expect(
      elaborationProblem(
        {
          kind: 'connect',
          answer: 'Like our theme file.',
          links: [],
          named: 'the checkout theme file',
        },
        SELF,
      ),
    ).toBeNull();
  });

  it('wants an apply answer to name a concrete place or link a project', () => {
    expect(
      elaborationProblem(
        { kind: 'apply', answer: 'Somewhere at work.', links: [] },
        SELF,
      ),
    ).toMatch(/concrete place/);
    expect(
      elaborationProblem(
        {
          kind: 'apply',
          answer: 'In checkout.',
          links: ['1.Projects/Checkout/Checkout.md'],
        },
        SELF,
      ),
    ).toBeNull();
    expect(
      elaborationProblem(
        {
          kind: 'apply',
          answer: 'In the colour refactor.',
          links: ['3.Resources/CSS/Custom properties.md'],
        },
        SELF,
      ),
    ).toMatch(/concrete place/);
  });

  it('reads wikilinks, without aliases or headings', () => {
    expect(
      linksIn(
        'See [[Custom properties|vars]] and [[Checkout#Plan]] and [[Checkout]].',
      ),
    ).toEqual(['Custom properties', 'Checkout']);
  });

  it('spots a question that gives the answer away', () => {
    const sources = ['Every other layer takes its values from tokens.'];
    expect(
      givesAway(
        'Why does every other layer take its values from tokens?',
        sources,
        6,
      ),
    ).toBe(false);
    expect(
      givesAway(
        'So every other layer takes its values from tokens, why?',
        sources,
        6,
      ),
    ).toBe(true);
    expect(fallbackQuestions('Design tokens').why).toContain('Design tokens');
  });
});

describe('elaboration by style', () => {
  it('words the connect question for each style, and the others the same', () => {
    const connects = COACHING_STYLES.map(
      (s) => fallbackQuestions('Design tokens', s).connect,
    );
    expect(new Set(connects).size).toBe(COACHING_STYLES.length);
    for (const c of connects) expect(c).toContain('Design tokens');
    expect(fallbackQuestions('Design tokens', 'devil').why).toBe(
      fallbackQuestions('Design tokens').why,
    );
    expect(Object.keys(CONNECT_ANGLES).sort()).toEqual(
      [...COACHING_STYLES].sort(),
    );
  });

  it('allows two follow-ups on why and one elsewhere, and repeats only "Why?"', () => {
    expect(nextFollowUp('why', [], 'why')).toBe('why');
    expect(nextFollowUp('why', ['why'], 'why')).toBe('why');
    expect(nextFollowUp('why', ['why', 'why'], 'assumption')).toBeNull();
    expect(nextFollowUp('why', ['assumption'], 'assumption')).toBeNull();
    expect(nextFollowUp('why', ['example'], 'assumption')).toBe('assumption');
    expect(nextFollowUp('apply', ['example'], 'why')).toBeNull();
    expect(nextFollowUp('connect', [], null)).toBeNull();
  });
});
