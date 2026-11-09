import { DomainError } from './errors.js';
import {
  attempt,
  attemptCameFirst,
  checkMarks,
  correctionProblem,
  parseMark,
} from './generate.js';

const A = 'Tokens name each design decision once.';
const B = 'Primitives read tokens, never raw values.';

describe('a Generate attempt', () => {
  it('needs ten words, or /idk', () => {
    expect(() => attempt('Tokens are variables.')).toThrow(DomainError);
    expect(attempt(' /IDK ')).toEqual({ answer: '/idk', idk: true });
    const text =
      'I expect tokens to be named values that every component reads from one place.';
    expect(attempt(text)).toEqual({ answer: text, idk: false });
  });

  it('counts only when it was saved before the reveal', () => {
    expect(
      attemptCameFirst('2026-11-10T09:00:00.000Z', '2026-11-10T09:01:00.000Z'),
    ).toBe(true);
    expect(
      attemptCameFirst('2026-11-10T09:01:00.000Z', '2026-11-10T09:00:00.000Z'),
    ).toBe(false);
  });
});

describe('marking the assertions', () => {
  it('reads g, w and m and their full names', () => {
    expect(parseMark('G')).toBe('got it');
    expect(parseMark('wrong')).toBe('wrong');
    expect(parseMark('m')).toBe('missed');
    expect(parseMark('maybe')).toBeNull();
  });

  it('marks every assertion once and corrects every wrong one', () => {
    expect(() =>
      checkMarks([A, B], [{ assertion: A, mark: 'got it' }]),
    ).toThrow(/not marked/);
    expect(() =>
      checkMarks(
        [A, B],
        [
          { assertion: A, mark: 'got it' },
          { assertion: B, mark: 'wrong' },
        ],
      ),
    ).toThrow(/needs a correction/);
    expect(
      checkMarks(
        [A, B],
        [
          { assertion: B, mark: 'wrong', correction: ' They use tokens. ' },
          { assertion: A, mark: 'missed', correction: 'ignored' },
        ],
      ),
    ).toEqual([
      { assertion: A, mark: 'missed' },
      { assertion: B, mark: 'wrong', correction: 'They use tokens.' },
    ]);
  });

  it('wants a correction in the learner own words', () => {
    expect(correctionProblem('', B, 6)).toMatch(/needs a correction/);
    expect(
      correctionProblem('Primitives read tokens, never raw values.', B, 6),
    ).toMatch(/own words/);
    expect(
      correctionProblem('A primitive takes its colours from tokens.', B, 6),
    ).toBeNull();
  });
});
