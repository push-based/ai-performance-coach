import type { MisconceptionRequest, TeachPartner } from '@ai-coach/application';
import type { Misconception } from '@ai-coach/domain';
import { z } from 'zod';
import { OllamaClient, type OllamaOptions } from './ollama-client.js';
import { misconceptionMessages } from './prompts.js';

const Reply = z.object({ assertion: z.number().int(), text: z.string() });

export class OllamaTeachPartner implements TeachPartner {
  private readonly client: OllamaClient;

  constructor(options: OllamaOptions) {
    this.client = new OllamaClient(options, 'teach partner');
  }

  async misconception(request: MisconceptionRequest): Promise<Misconception> {
    const reply = await this.client.json(
      misconceptionMessages(request, this.client.nonce()),
      Reply,
    );
    return { assertion: reply.assertion - 1, text: reply.text.trim() };
  }
}
