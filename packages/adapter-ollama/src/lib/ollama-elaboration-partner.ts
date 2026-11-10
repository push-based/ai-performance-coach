import {
  UnusableReplyError,
  type ElaborationPartner,
  type ElaborationRequest,
  type FollowUpRequest,
} from '@ai-coach/application';
import type { ElaborationQuestions, FollowUp } from '@ai-coach/domain';
import { z } from 'zod';
import { OllamaClient, type OllamaOptions } from './ollama-client.js';
import { elaborationQuestionsMessages, followUpMessages } from './prompts.js';

const Questions = z.object({
  why: z.string().min(1),
  connect: z.string().min(1),
  apply: z.string().min(1),
});

const CHOICES: (FollowUp | null)[] = ['why', 'example', 'assumption', null];

export class OllamaElaborationPartner implements ElaborationPartner {
  private readonly client: OllamaClient;

  constructor(options: OllamaOptions) {
    this.client = new OllamaClient(options, 'elaboration partner');
  }

  async questions(request: ElaborationRequest): Promise<ElaborationQuestions> {
    const reply = await this.client.json(
      elaborationQuestionsMessages(request, this.client.nonce()),
      Questions,
    );
    return {
      why: reply.why.trim(),
      connect: reply.connect.trim(),
      apply: reply.apply.trim(),
    };
  }

  async followUp(request: FollowUpRequest): Promise<FollowUp | null> {
    try {
      const choice = await this.client.choice(
        followUpMessages(request, this.client.nonce()),
        CHOICES.length,
      );
      return choice === null ? null : CHOICES[choice]!;
    } catch (err) {
      if (err instanceof UnusableReplyError) return null;
      throw err;
    }
  }
}
