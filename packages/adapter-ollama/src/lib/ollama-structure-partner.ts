import type {
  StructurePartner,
  StructureQuestionRequest,
} from '@ai-coach/application';
import { z } from 'zod';
import { OllamaClient, type OllamaOptions } from './ollama-client.js';
import { structureQuestionsMessages } from './prompts.js';

const Questions = z.object({ questions: z.array(z.string()) });

export class OllamaStructurePartner implements StructurePartner {
  private readonly client: OllamaClient;

  constructor(options: OllamaOptions) {
    this.client = new OllamaClient(options, 'structure partner');
  }

  async questions(request: StructureQuestionRequest): Promise<string[]> {
    const reply = await this.client.json(
      structureQuestionsMessages(request, this.client.nonce()),
      Questions,
    );
    return reply.questions
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, request.max);
  }
}
