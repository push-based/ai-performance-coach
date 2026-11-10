import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { UnusableReplyError } from '@ai-coach/application';
import { sparringRules } from '@ai-coach/domain';
import { OllamaElaborationPartner } from './ollama-elaboration-partner.js';
import { OllamaStructurePartner } from './ollama-structure-partner.js';

const NOTE = {
  title: 'Design tokens',
  body: 'Tokens name each decision once. NOTE-BODY-MARKER',
};

describe('OllamaElaborationPartner', () => {
  const replies: string[] = [];
  const sent: { messages: { content: string }[] }[] = [];
  let server: Server;
  let host: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => (raw += chunk));
      req.on('end', () => {
        sent.push(JSON.parse(raw));
        res.writeHead(200, { 'content-type': 'application/json' }).end(
          JSON.stringify({
            message: { role: 'assistant', content: replies.shift() ?? '' },
            done: true,
          }),
        );
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    host = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(() => {
    replies.length = 0;
    sent.length = 0;
  });

  it('asks for a why, a connect and an apply question, with the note fenced as data', async () => {
    replies.push(
      JSON.stringify({
        why: ' Why name values at all? ',
        connect: 'What is this like?',
        apply: 'Where would you use it?',
      }),
    );
    const partner = new OllamaElaborationPartner({ model: 'g', host });
    expect(
      await partner.questions({
        note: NOTE,
        rules: sparringRules(),
        style: 'feynman',
        assertions: [],
        rejected: ['Old question?'],
      }),
    ).toEqual({
      why: 'Why name values at all?',
      connect: 'What is this like?',
      apply: 'Where would you use it?',
    });
    const prompt = sent[0]!.messages.map((m) => m.content).join('\n');
    expect(prompt).toContain('untrusted data');
    expect(prompt).toContain('Old question?');
    expect(prompt).toContain('an everyday thing the idea is like');
  });

  it("asks the connect question from the angle of the note's style", async () => {
    replies.push(
      JSON.stringify({ why: 'Why?', connect: 'Unlike what?', apply: 'Where?' }),
    );
    const partner = new OllamaElaborationPartner({ model: 'g', host });
    await partner.questions({
      note: NOTE,
      rules: sparringRules(),
      style: 'socratic',
      assertions: [],
      rejected: [],
    });
    const prompt = sent[0]!.messages.map((m) => m.content).join('\n');
    expect(prompt).toContain('a case where the idea stops holding');
    expect(prompt).toContain('socratic style');
  });

  it('picks "why", "example", the assumption or nothing as the follow-up, and nothing on a bad reply', async () => {
    const partner = new OllamaElaborationPartner({ model: 'g', host });
    const request = {
      rules: sparringRules(),
      kind: 'apply' as const,
      question: 'Where?',
      answer: 'At work.',
      asked: [],
    };
    replies.push('2');
    expect(await partner.followUp(request)).toBe('example');
    replies.push('1');
    expect(await partner.followUp(request)).toBe('why');
    replies.push('3');
    expect(await partner.followUp(request)).toBe('assumption');
    replies.push('4');
    expect(await partner.followUp(request)).toBeNull();
    replies.push('nonsense');
    expect(await partner.followUp(request)).toBeNull();
    const prompt = sent[0]!.messages.map((m) => m.content).join('\n');
    expect(prompt).not.toContain('NOTE-BODY-MARKER');
    expect(prompt).not.toContain('Already asked');
    replies.push('4');
    await partner.followUp({ ...request, kind: 'why', asked: ['why'] });
    expect(
      sent
        .at(-1)!
        .messages.map((m) => m.content)
        .join('\n'),
    ).toContain('Already asked: "Why?"');
  });

  it('reports an unusable question reply', async () => {
    replies.push('not json', 'still not json');
    const partner = new OllamaElaborationPartner({ model: 'g', host });
    await expect(
      partner.questions({
        note: NOTE,
        rules: sparringRules(),
        style: 'feynman',
        assertions: [],
        rejected: [],
      }),
    ).rejects.toThrow(UnusableReplyError);
  });
});

describe('OllamaStructurePartner', () => {
  let server: Server;
  let host: string;
  const sent: { messages: { content: string }[] }[] = [];
  let reply = '';

  beforeAll(async () => {
    server = createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => (raw += chunk));
      req.on('end', () => {
        sent.push(JSON.parse(raw));
        res.writeHead(200, { 'content-type': 'application/json' }).end(
          JSON.stringify({
            message: { role: 'assistant', content: reply },
            done: true,
          }),
        );
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    host = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it('asks about the learner structure, sending only names and titles, and caps the questions', async () => {
    reply = JSON.stringify({
      questions: [
        ' Nothing builds on Recipes. Right? ',
        '',
        'Q2?',
        'Q3?',
        'Q4?',
      ],
    });
    const partner = new OllamaStructurePartner({ model: 'g', host });
    expect(
      await partner.questions({
        rules: sparringRules(),
        book: 'Design System Architecture',
        groups: [
          { name: 'Values', concepts: ['Design tokens'] },
          { name: 'Recipes', concepts: ['Patterns'] },
        ],
        buildsOn: [{ from: 'Recipes', to: 'Values' }],
        max: 3,
      }),
    ).toEqual(['Nothing builds on Recipes. Right?', 'Q2?', 'Q3?']);
    const prompt = sent[0]!.messages.map((m) => m.content).join('\n');
    expect(prompt).toContain('"name":"Values"');
    expect(prompt).toContain('Never propose a new group');
  });
});
