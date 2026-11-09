import {
  TeachingLesson,
  correctsMisconception,
  fallbackMisconception,
  hasExample,
  misconceptionProblem,
  type Misconception,
} from './teach.js';

const ASSERTIONS = [
  'Tokens are the named values of the system.',
  'Every other layer takes its values from tokens.',
];
const WRONG: Misconception = {
  assertion: 1,
  text: "primitives don't use tokens",
};

const lesson = (max = 5, terms = ['synergy', 'design tokens']) =>
  new TeachingLesson('Design tokens', terms, WRONG, ASSERTIONS[1]!, max);

describe('the student', () => {
  it('opens knowing only the title', () => {
    expect(lesson().turns).toEqual([
      {
        role: 'student',
        text: "Hi! I don't know anything about Design tokens. Can you teach me?",
      },
    ]);
  });

  it('asks what an undefined term means, once, and counts the answer as its definition', () => {
    const l = lesson();
    expect(
      l.learnerSays('Design tokens give you synergy across screens.'),
    ).toEqual({
      kind: 'term',
      term: 'synergy',
      text: 'Wait, what do you mean by "synergy"?',
    });
    expect(l.unresolvedTerms()).toEqual(['synergy', 'design tokens']);
    expect(
      l.learnerSays('I mean the screens all agree on one blue.').kind,
    ).toBe('term');
    expect(l.unresolvedTerms()).toEqual(['design tokens']);
  });

  it('asks for an example until one comes', () => {
    const l = lesson(5, []);
    expect(l.learnerSays('They keep the colours in one place.')).toMatchObject({
      kind: 'example',
    });
    expect(l.learnerSays('It saves time.')).toMatchObject({ kind: 'listen' });
    expect(hasExample('For example, the brand blue lives in one token.')).toBe(
      true,
    );
  });

  it('states its misconception once, when the lesson touches that assertion', () => {
    const l = lesson(5, []);
    expect(
      l.learnerSays('Every layer above takes its values from the tokens.'),
    ).toEqual({
      kind: 'misconception',
      text: "Oh, so primitives don't use tokens?",
    });
    expect(l.misconceptionStated).toBe(true);
    l.learnerSays('No, primitives read every colour from the tokens.');
    expect(l.misconceptionCorrected).toBe(true);
  });

  it('treats silence about the misconception as no correction', () => {
    const l = lesson(5, []);
    l.learnerSays('Every layer above takes its values from the tokens.');
    l.learnerSays('Anyway, there are four layers in total.');
    expect(l.misconceptionCorrected).toBe(false);
  });

  it('states the misconception before it is ready, when the lesson never touched it', () => {
    const l = lesson(1, []);
    expect(l.learnerSays('They are names, kept in one list.').kind).toBe(
      'example',
    );
    expect(l.learnerSays('For example, brand blue.').kind).toBe(
      'misconception',
    );
    expect(l.learnerSays('That is wrong, primitives use tokens.').kind).toBe(
      'ready',
    );
    expect(l.misconceptionCorrected).toBe(true);
  });
});

describe('the explain-back and the verdict', () => {
  it('carries the uncorrected misconception and open terms, as the demo shows', () => {
    const l = lesson(2, ['css variables']);
    l.learnerSays('Tokens are just CSS variables, nothing builds on them.');
    l.finish();
    l.learnerSays('Sure.');
    expect(l.explainBack()).toBe(
      'So, if I got it right: Tokens are just CSS variables, nothing builds on them; Sure. And primitives don\'t use tokens. I\'m still not sure what "css variables" means.',
    );
  });

  it('fails a lesson that never corrects the misconception, even with every assertion covered', () => {
    const l = lesson(3, []);
    l.learnerSays('Every layer above takes its values from the tokens.');
    l.learnerSays('Tokens name each value once.');
    expect(l.verdict(ASSERTIONS, ASSERTIONS)).toEqual({
      verdict: 'fail',
      gaps: ["You left the student believing: primitives don't use tokens"],
      corrected: false,
      unresolved: [],
    });
  });

  it('passes once the misconception is corrected in the correction, every assertion is taught and no term is open', () => {
    const l = lesson(3, ['synergy']);
    l.learnerSays('Every layer above takes its values from the tokens.');
    l.learnerSays('For example, the button reads brand blue from a token.');
    l.explainBack();
    l.correct(
      "Not right: primitives don't skip tokens, they read every value from them.",
    );
    expect(l.verdict(ASSERTIONS, ASSERTIONS).verdict).toBe('pass');
    expect(l.verdict(ASSERTIONS, [ASSERTIONS[0]!]).gaps).toEqual([
      `You did not teach: ${ASSERTIONS[1]}`,
    ]);
  });

  it('spots an explicit correction, and checks a drafted misconception', () => {
    expect(
      correctsMisconception(
        'No, primitives do use tokens.',
        WRONG,
        ASSERTIONS[1]!,
      ),
    ).toBe(true);
    expect(
      correctsMisconception('Primitives are boxes.', WRONG, ASSERTIONS[1]!),
    ).toBe(false);
    expect(misconceptionProblem(WRONG, ASSERTIONS, ASSERTIONS, 6)).toBeNull();
    expect(
      misconceptionProblem({ assertion: 5, text: 'x' }, ASSERTIONS, [], 6),
    ).toMatch(/no core assertion/);
    expect(
      misconceptionProblem(
        { assertion: 0, text: 'Tokens are the named values of the system.' },
        ASSERTIONS,
        [],
        6,
      ),
    ).toMatch(/repeats/);
    expect(fallbackMisconception('Design tokens').assertion).toBe(0);
  });
});
