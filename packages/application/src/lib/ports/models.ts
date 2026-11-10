import type {
  CoachingStyle,
  ElaborationKind,
  ElaborationQuestions,
  FollowUp,
  Misconception,
  Exchange,
  ItemJudgement,
  Note,
  SparringRules,
  Tier2Payload,
  Verdict,
} from '@ai-coach/domain';

export interface ChallengeRequest {
  note: Note;
  rules: SparringRules;
  style: CoachingStyle;
  assertions: string[];
  rejected: string[];
}

export interface OpeningChallenge {
  focus: string;
  scope: string[];
  jargon: string[];
  challenge: string;
}

export interface NextTurnRequest {
  note: Note;
  rules: SparringRules;
  style: CoachingStyle;
  focus: string;
  scope: readonly string[];
  assertions: readonly string[];
  exchanges: readonly Exchange[];
  followUpsLeft: number;
  rejected: string[];
}

export type NextTurn =
  | { action: 'probe'; question: string }
  | { action: 'conclude'; verdict: Verdict; gaps: string[]; feedback: string };

export interface RecallCheckRequest {
  note: Note;
  rules: SparringRules;
  style: CoachingStyle;
  assertions: readonly string[];
  exchanges: readonly Exchange[];
}

export interface SparringPartner {
  openingChallenge(request: ChallengeRequest): Promise<OpeningChallenge>;
  nextTurn(request: NextTurnRequest): Promise<NextTurn>;
  coveredAssertions(request: RecallCheckRequest): Promise<string[]>;
}

export interface JudgeReport {
  model: string;
  items: ItemJudgement[];
}

export interface Judge {
  judge(payload: Tier2Payload): Promise<JudgeReport>;
}

export interface StudyRequest {
  note: Note;
  rules: SparringRules;
  style: CoachingStyle;
  assertions: string[];
  gap: string;
}

export interface StudyCheck {
  closed: boolean;
  nudge: string;
}

export interface StyleClassifier {
  classify(note: Note, rules: SparringRules): Promise<CoachingStyle>;
}

export interface StudyPartner {
  clue(request: StudyRequest): Promise<string>;
  hint(request: StudyRequest): Promise<string>;
  quote(request: StudyRequest): Promise<string>;
  check(request: StudyRequest & { explanation: string }): Promise<StudyCheck>;
}

export interface ElaborationRequest {
  note: Note;
  rules: SparringRules;
  style: CoachingStyle;
  assertions: readonly string[];
  rejected: string[];
}

export interface FollowUpRequest {
  rules: SparringRules;
  kind: ElaborationKind;
  question: string;
  answer: string;
  asked: FollowUp[];
}

export interface ElaborationPartner {
  questions(request: ElaborationRequest): Promise<ElaborationQuestions>;
  followUp(request: FollowUpRequest): Promise<FollowUp | null>;
}

export interface MisconceptionRequest {
  rules: SparringRules;
  title: string;
  assertions: readonly string[];
  rejected: string[];
}

export interface TeachPartner {
  misconception(request: MisconceptionRequest): Promise<Misconception>;
}
