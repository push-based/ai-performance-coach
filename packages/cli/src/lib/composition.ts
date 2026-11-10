import { GeminiJudge } from '@ai-coach/adapter-gemini';
import {
  FilePendingJudgements,
  SystemClock,
} from '@ai-coach/adapter-local-state';
import {
  OllamaElaborationPartner,
  OllamaStructurePartner,
  OllamaTeachPartner,
  OllamaSynthesisPartner,
  OllamaSparringPartner,
  OllamaStudyPartner,
  OllamaStyleClassifier,
} from '@ai-coach/adapter-ollama';
import { McpVault } from '@ai-coach/adapter-vault-mcp';
import {
  Climbing,
  Elaborating,
  Generating,
  Grouping,
  Reading,
  Teaching,
  Synthesizing,
  Filing,
  Judging,
  Review,
  Sparring,
  Studying,
  type Clock,
  type ElaborationPartner,
  type StructurePartner,
  type TeachPartner,
  type SynthesisPartner,
  type Judge,
  type SparringPartner,
  type StudyPartner,
  type StyleClassifier,
} from '@ai-coach/application';
import { ollamaOptions, type CoachConfig } from './config.js';

export interface Coach {
  clock: Clock;
  review: Review;
  filing: Filing;
  sparring(): Sparring;
  judging(): Judging;
  studying(): Studying;
  synthesizing(): Synthesizing;
  climbing(): Climbing;
  generating(): Generating;
  elaborating(): Elaborating;
  grouping(): Grouping;
  reading(): Reading;
  teaching(): Teaching;
  close(): Promise<void>;
}

export interface AdapterOverrides {
  partner?: (config: CoachConfig) => SparringPartner;
  judge?: (config: CoachConfig) => Judge;
  studyPartner?: (config: CoachConfig) => StudyPartner;
  classifier?: (config: CoachConfig) => StyleClassifier;
  synthesisPartner?: (config: CoachConfig) => SynthesisPartner;
  elaborationPartner?: (config: CoachConfig) => ElaborationPartner;
  structurePartner?: (config: CoachConfig) => StructurePartner;
  teachPartner?: (config: CoachConfig) => TeachPartner;
}

export async function composeCoach(
  config: CoachConfig,
  today: string | undefined,
  overrides: AdapterOverrides = {},
): Promise<Coach> {
  const vault = await McpVault.connect({
    serverBin: config.docsMcpBin,
    vault: config.vault,
  });
  const pending = new FilePendingJudgements(config.stateDir);
  const classifier = () =>
    overrides.classifier?.(config) ??
    new OllamaStyleClassifier(ollamaOptions(config));

  const clock = new SystemClock(today);
  const partner = () =>
    overrides.partner?.(config) ??
    new OllamaSparringPartner(ollamaOptions(config), config.ollama.checkModel);

  return {
    clock,
    review: new Review(vault, pending),
    filing: new Filing(vault),
    sparring: () =>
      new Sparring({
        notes: vault,
        sessions: vault,
        pending,
        partner: partner(),
        classifier: classifier(),
        rules: config.sparring,
        ladder: config.ladder,
      }),
    studying: () =>
      new Studying({
        notes: vault,
        partner:
          overrides.studyPartner?.(config) ??
          new OllamaStudyPartner(ollamaOptions(config)),
        classifier: classifier(),
        rules: config.sparring,
      }),
    synthesizing: () =>
      new Synthesizing({
        notes: vault,
        library: vault,
        partner:
          overrides.synthesisPartner?.(config) ??
          new OllamaSynthesisPartner(ollamaOptions(config)),
        rules: config.sparring,
      }),
    judging: () =>
      new Judging({
        notes: vault,
        sessions: vault,
        pending,
        judge:
          overrides.judge?.(config) ??
          new GeminiJudge({
            model: config.judge.model,
            fallbackModel: config.judge.fallbackModel,
            thinkingLevel: config.judge.thinkingLevel,
          }),
        ladder: config.ladder,
        includeAssertions: config.judge.includeAssertions,
      }),
    climbing: () => new Climbing(vault, pending),
    teaching: () =>
      new Teaching({
        notes: vault,
        sessions: vault,
        library: vault,
        teacher:
          overrides.teachPartner?.(config) ??
          new OllamaTeachPartner(ollamaOptions(config)),
        checker: partner(),
        rules: config.sparring,
        ladder: config.ladder,
        clock,
      }),
    reading: () =>
      new Reading({ notes: vault, library: vault, rules: config.sparring }),
    grouping: () =>
      new Grouping({
        notes: vault,
        library: vault,
        partner:
          overrides.structurePartner?.(config) ??
          new OllamaStructurePartner(ollamaOptions(config)),
        rules: config.sparring,
      }),
    elaborating: () =>
      new Elaborating({
        notes: vault,
        sessions: vault,
        partner:
          overrides.elaborationPartner?.(config) ??
          new OllamaElaborationPartner(ollamaOptions(config)),
        classifier: classifier(),
        rules: config.sparring,
        clock,
      }),
    generating: () =>
      new Generating({
        notes: vault,
        sessions: vault,
        partner: partner(),
        rules: config.sparring,
        ladder: config.ladder,
        clock,
      }),
    close: () => vault.close(),
  };
}
