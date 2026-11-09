import {
  freeRecallQuestion,
  missedAssertions,
  needsNeutralProbe,
} from './free-recall.js';

describe('free recall', () => {
  it('asks for everything remembered, naming only the title', () => {
    expect(freeRecallQuestion(' Design tokens ')).toBe(
      'Without looking: write down everything you remember about Design tokens.',
    );
  });

  it('probes an answer that only claims to know, or is too short', () => {
    expect(needsNeutralProbe('I know this')).toBe(true);
    expect(needsNeutralProbe('i already know it, tokens are variables')).toBe(
      true,
    );
    expect(needsNeutralProbe('Got it.')).toBe(true);
    expect(needsNeutralProbe('Tokens are named values.')).toBe(true);
    expect(
      needsNeutralProbe(
        'Tokens name each design decision once, so every primitive and component reads the same value from one place.',
      ),
    ).toBe(false);
  });

  it('keeps the assertions the recall did not cover, in their order', () => {
    expect(missedAssertions(['a', 'b', 'c'], ['c', 'a'])).toEqual(['b']);
    expect(missedAssertions(['a'], ['a'])).toEqual([]);
  });
});
