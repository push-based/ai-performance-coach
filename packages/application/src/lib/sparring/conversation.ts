import {
  ChallengeQuotesNoteError,
  NEUTRAL_PROBE,
  SparringRound,
  closestGap,
  freeRecallQuestion,
  groundedIn,
  missedAssertions,
  needsNeutralProbe,
  type Note,
  type SparringResult,
  type CoachingStyle,
  type SparringRules,
  type Verdict,
} from '@ai-coach/domain';
import { ChallengeLeakError } from '../errors.js';
import type { Reference } from '../history.js';
import type { SparringPartner } from '../ports/models.js';

export type Turn =
  | { kind: 'challenge'; question: string }
  | { kind: 'rephrase'; question: string; buzzwords: string[] }
  | { kind: 'probe'; question: string }
  | { kind: 'verdict'; verdict: Verdict; gaps: string[]; feedback: string };

export interface ConversationOptions {
  freeRecall?: boolean;
}

type Recall = 'off' | 'open' | 'probed' | 'scored';

function teaches(assertions: readonly string[]): string {
  return `This note teaches that ${assertions.map((a) => a.trim().replace(/\.$/, '')).join('; ')}.`;
}

export class SparringConversation {
  private round: SparringRound;
  private readonly note: Note;
  private focus = '';
  private scope: string[] = [];
  private assertions: readonly string[];
  private recall: Recall = 'off';

  constructor(
    private readonly partner: SparringPartner,
    private readonly reference: Reference,
    private readonly rules: SparringRules,
    readonly style: CoachingStyle,
    private readonly options: ConversationOptions = {},
  ) {
    this.note = reference.note;
    this.assertions = reference.assertions;
    this.round = SparringRound.over(this.note, rules);
  }

  get freeRecall(): boolean {
    return this.recall !== 'off';
  }

  get isConcluded(): boolean {
    return this.round.isConcluded;
  }

  async start(): Promise<Turn> {
    if (this.options.freeRecall && this.assertions.length) {
      const question = freeRecallQuestion(this.reference.note.title);
      if (!this.round.quotesNote(question)) {
        this.round.open(question);
        this.recall = 'open';
        this.focus = teaches(this.assertions);
        this.scope = [...this.assertions];
        return { kind: 'challenge', question };
      }
    }
    const rejected: string[] = [];
    for (
      let attempt = 0;
      attempt < this.rules.maxChallengeAttempts;
      attempt++
    ) {
      const { focus, scope, jargon, challenge } =
        await this.partner.openingChallenge({
          note: this.note,
          rules: this.rules,
          style: this.style,
          assertions: [...this.assertions],
          rejected: [...rejected],
        });
      const banned =
        this.style === 'feynman'
          ? [...jargon, ...this.reference.buzzwords]
          : jargon;
      if (banned.length) {
        this.round = SparringRound.over(this.note, {
          ...this.rules,
          buzzwords: [...this.rules.buzzwords, ...banned],
        });
      }
      try {
        this.round.open(challenge);
        this.focus = focus.trim();
        this.scope = scope.map((idea) => idea.trim()).filter(Boolean);
        return { kind: 'challenge', question: this.round.pendingQuestion! };
      } catch (err) {
        if (!(err instanceof ChallengeQuotesNoteError)) throw err;
        rejected.push(challenge);
      }
    }
    throw new ChallengeLeakError(
      `The sparring partner quoted the note in its challenge ${rejected.length} time(s); nothing was recorded`,
    );
  }

  async answer(text: string): Promise<Turn> {
    const submission = this.round.submit(text);
    if (submission.kind === 'rephrase') return submission;
    if (this.recall === 'open' || this.recall === 'probed')
      return this.afterRecall(text);
    return this.nextTurn();
  }

  private async afterRecall(text: string): Promise<Turn> {
    if (
      this.recall === 'open' &&
      needsNeutralProbe(text) &&
      this.round.followUpsLeft > 0
    ) {
      this.recall = 'probed';
      this.round.probe(NEUTRAL_PROBE);
      return { kind: 'probe', question: NEUTRAL_PROBE };
    }
    let covered: string[];
    try {
      covered = await this.partner.coveredAssertions({
        note: this.note,
        rules: this.rules,
        style: this.style,
        assertions: this.assertions,
        exchanges: this.round.transcript,
      });
    } catch (err) {
      this.round.withdrawLastAnswer();
      throw err;
    }
    const recall = this.recall;
    this.recall = 'scored';
    const missed = missedAssertions(this.assertions, covered);
    if (!missed.length) {
      return {
        kind: 'verdict',
        ...this.round.conclude(
          'pass',
          [],
          'Your recall covered every core assertion, with the note closed.',
        ),
      };
    }
    const before = {
      assertions: this.assertions,
      focus: this.focus,
      scope: this.scope,
    };
    this.assertions = missed;
    this.focus = teaches(missed);
    this.scope = [...missed];
    try {
      return await this.nextTurn();
    } catch (err) {
      this.recall = recall;
      this.assertions = before.assertions;
      this.focus = before.focus;
      this.scope = before.scope;
      throw err;
    }
  }

  private async nextTurn(): Promise<Turn> {
    const followUpsLeft = this.round.followUpsLeft;
    let next;
    try {
      next = await this.partner.nextTurn({
        note: this.note,
        rules: this.rules,
        style: this.style,
        focus: this.focus,
        scope: this.scope,
        assertions: this.assertions,
        exchanges: this.round.transcript,
        followUpsLeft,
        rejected: [],
      });
    } catch (err) {
      this.round.withdrawLastAnswer();
      throw err;
    }

    if (next.action === 'probe' && followUpsLeft > 0) {
      const question = await this.acceptableProbe(next.question);
      this.round.probe(question);
      return { kind: 'probe', question };
    }

    const conclusion =
      next.action === 'conclude'
        ? this.round.conclude(
            next.verdict,
            this.groundedGaps(next.verdict, next.gaps),
            next.feedback,
          )
        : this.round.conclude(
            'fail',
            [`You did not answer this follow-up: ${next.question.trim()}`],
            'The follow-ups ran out before the idea was fully explained.',
          );
    return { kind: 'verdict', ...conclusion };
  }

  result(): SparringResult {
    return this.round.result();
  }

  private groundedGaps(verdict: Verdict, gaps: string[]): string[] {
    const grounded = gaps.filter((gap) => groundedIn(this.reference.text, gap));
    return grounded.length || verdict === 'pass'
      ? grounded
      : closestGap(this.reference.text, gaps);
  }

  private async acceptableProbe(question: string): Promise<string> {
    if (question.trim() && !this.round.quotesNote(question))
      return question.trim();
    const retry = await this.partner.nextTurn({
      note: this.note,
      rules: this.rules,
      style: this.style,
      focus: this.focus,
      scope: this.scope,
      assertions: this.assertions,
      exchanges: this.round.transcript,
      followUpsLeft: 1,
      rejected: [question],
    });
    const rewritten = retry.action === 'probe' ? retry.question.trim() : '';
    return rewritten && !this.round.quotesNote(rewritten)
      ? rewritten
      : NEUTRAL_PROBE;
  }
}
