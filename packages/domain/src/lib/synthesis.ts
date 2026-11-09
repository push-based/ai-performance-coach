import { DomainError } from './errors.js';

export type MarkKind = 'highlight' | 'bold' | 'summary';

export interface Mark {
  kind: MarkKind;
  text: string;
  page: number | null;
  within?: string;
}

export type MaterialKind = MarkKind | 'note';

export interface NoteMark {
  kind: MaterialKind;
  text: string;
  page: number | null;
  within?: string;
  source?: string;
}

export interface MaterialItem {
  id: number;
  kind: MaterialKind;
  text: string;
  note: string;
  chapter: string;
  page: number | null;
  within?: string;
}

export interface ConceptPassageDraft {
  note: string;
  quote: string;
  pages?: string;
}

export interface ConceptDraft {
  title: string;
  summary: string;
  assertions: string[];
  buzzwords: string[];
  passages: ConceptPassageDraft[];
  fromNotes: string[];
}

export const MAX_ASSERTIONS = 6;
export const MAX_BUZZWORDS = 5;
export const MAX_PASSAGES = 12;
export const MIN_QUOTE = 12;
export const MIN_QUOTE_WORDS = 5;
export const MAX_NOTE_CHARS = 800;
export const WHY_IT_MATTERS =
  'Why does this idea matter: what problem does it solve, or what goes wrong without it?';

const SUMMARY = /^>[ \t]*\[!summary\][^\n]*(?:\n>[^\n]*)*/gim;
const HIGHLIGHT = /==(?=\S)(?:(?!\n[ \t]*\n)[\s\S])*?\S==/g;
const BOLD = /(\*\*|__)(?=\S)(?:(?!\n[ \t]*\n)[\s\S])*?\S\1/g;
const BOLD_RUN = /(\*\*|__)[ \t]*\n[ \t]*\1/g;
const HIGHLIGHT_RUN = /==[ \t]*\n[ \t]*==/g;
const FRONT = /^---\n[\s\S]*?\n---\n?/;
const HEADING = /^#{1,6}[ \t]+(.*?)[ \t]*$/;
const PAGE_TITLE = /^Page (\d+)$/;
const BULLET = /^[ \t]*[-*+][ \t]+(.+)$/;
const DATED = /^\d{4}-\d{2}-\d{2}[ \t]*·[ \t]*/;
const LINKED =
  /[ \t]+[—–-][ \t]+\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\][ \t]*$/;
const KEPT = /^[“"](.+)[”"](?:[ \t]*\(quote\))?$/;
const ORIGIN = /^From \[\[[^\]]*\]\]\.?$/;
const LINK = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;

function clean(text: string): string {
  return text
    .replace(/==|\*\*|__/g, '')
    .replace(/(\p{L})-[ \t]*\n[ \t]*(\p{Ll})/gu, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinRuns(text: string): string {
  return text.replace(BOLD_RUN, '\n').replace(HIGHLIGHT_RUN, '\n');
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function summaries(text: string): string[] {
  return [...text.matchAll(SUMMARY)]
    .map((m) => {
      const [first, ...rest] = m[0].split('\n');
      return [
        first!.replace(/^>[ \t]*\[!summary\][-+]?/i, ''),
        ...rest.map((l) => l.replace(/^>[ \t]?/, '')),
      ]
        .join(' ')
        .trim();
    })
    .filter(Boolean)
    .map(clean);
}

function marksOn(text: string, page: number | null): Mark[] {
  const marks: Mark[] = summaries(text).map((s) => ({
    kind: 'summary',
    text: s,
    page,
  }));
  const author = joinRuns(text.replace(SUMMARY, ''));
  const bolds = [...author.matchAll(BOLD)].map((m) => ({
    from: m.index,
    to: m.index + m[0].length,
    text: clean(m[0]),
  }));
  const highlighted: [number, number][] = [];
  for (const m of author.matchAll(HIGHLIGHT)) {
    const from = m.index;
    const to = m.index + m[0].length;
    highlighted.push([from, to]);
    const bold = bolds.find((b) => from >= b.from && to <= b.to);
    marks.push({
      kind: 'highlight',
      text: clean(m[0]),
      page,
      ...(bold ? { within: bold.text } : {}),
    });
  }
  for (const bold of bolds) {
    const inside = highlighted.some(
      ([from, to]) => bold.from >= from && bold.to <= to,
    );
    if (!inside) marks.push({ kind: 'bold', text: bold.text, page });
  }
  return marks.filter((m) => m.text);
}

export function extractMarks(body: string): Mark[] {
  const parts = body.split(/^(?=## Page \d+[ \t]*$)/m);
  return parts.flatMap((part) => {
    const heading = /^## Page (\d+)[ \t]*\n?/.exec(part);
    return heading
      ? marksOn(part.slice(heading[0].length), Number(heading[1]))
      : summaries(part).map((s): Mark => ({
          kind: 'summary',
          text: s,
          page: null,
        }));
  });
}

function plain(text: string): string {
  return clean(
    text.replace(LINK, (_, target: string, label?: string) => label ?? target),
  );
}

function sourcePath(target: string): string {
  const path = target.trim();
  return path.endsWith('.md') ? path : `${path}.md`;
}

function withNote(
  marks: readonly Mark[],
  text: string,
  page: number | null,
  source?: string,
): NoteMark[] {
  const from = source ? { source } : {};
  const items: NoteMark[] = marks.map((m) => ({ ...m, ...from }));
  const note = plain(text).slice(0, MAX_NOTE_CHARS);
  if (note && !marks.some((m) => m.text === note))
    items.push({ kind: 'note', text: note, page, ...from });
  return items;
}

function bulletItems(line: string, page: number | null): NoteMark[] {
  const linked = LINKED.exec(line);
  const source = linked ? sourcePath(linked[1]!) : undefined;
  const text = (linked ? line.slice(0, linked.index) : line)
    .replace(DATED, '')
    .trim();
  const kept = KEPT.exec(text);
  if (!kept) return withNote(marksOn(text, page), text, page, source);
  const quote = clean(kept[1]!);
  return quote
    ? [{ kind: 'highlight', text: quote, page, ...(source ? { source } : {}) }]
    : [];
}

function paragraphItems(text: string, page: number | null): NoteMark[] {
  if (ORIGIN.test(text.trim())) return [];
  const marks = marksOn(text, page);
  return text.trimStart().startsWith('>') ? marks : withNote(marks, text, page);
}

export function extractNoteItems(body: string): NoteMark[] {
  const items: NoteMark[] = [];
  let page: number | null = null;
  let block: string[] = [];
  const flush = () => {
    if (block.length) items.push(...paragraphItems(block.join('\n'), page));
    block = [];
  };
  for (const line of body.replace(FRONT, '').split('\n')) {
    const heading = HEADING.exec(line);
    const bullet = BULLET.exec(line);
    if (heading) {
      flush();
      const numbered = PAGE_TITLE.exec(heading[1]!);
      page = numbered ? Number(numbered[1]) : null;
    } else if (bullet) {
      flush();
      items.push(...bulletItems(bullet[1]!, page));
    } else if (!line.trim()) flush();
    else block.push(line);
  }
  flush();
  return items.filter((i) => i.text);
}

export function quotable(text: string): boolean {
  return text.length >= MIN_QUOTE && wordCount(text) >= MIN_QUOTE_WORDS;
}

export function quotesFrom(
  items: readonly MaterialItem[],
): ConceptPassageDraft[] {
  const ranked = [
    ...items
      .filter((i) => i.kind === 'highlight')
      .map((i) => ({ ...i, text: i.within ?? i.text })),
    ...items.filter((i) => i.kind === 'bold'),
  ];
  const kept: string[] = [];
  const quotes: ConceptPassageDraft[] = [];
  for (const item of ranked) {
    const key = item.text.toLowerCase();
    if (!quotable(item.text)) continue;
    if (kept.some((k) => k.includes(key))) continue;
    kept.push(key);
    quotes.push({
      note: item.note,
      quote: item.text,
      ...(item.page !== null ? { pages: String(item.page) } : {}),
    });
    if (quotes.length === MAX_PASSAGES) break;
  }
  return quotes;
}

export function conceptDraft(input: ConceptDraft): ConceptDraft {
  const title = input.title.trim();
  const summary = input.summary.trim();
  const assertions = input.assertions.map((a) => a.trim()).filter(Boolean);
  const buzzwords = [
    ...new Set(input.buzzwords.map((b) => b.trim()).filter(Boolean)),
  ];
  if (!title) throw new DomainError('A concept needs a title');
  if (!summary)
    throw new DomainError('A concept needs a summary in your own words');
  if (assertions.length < 1 || assertions.length > MAX_ASSERTIONS) {
    throw new DomainError(
      `A concept needs 1 to ${MAX_ASSERTIONS} core assertions, got ${assertions.length}`,
    );
  }
  if (buzzwords.length > MAX_BUZZWORDS) {
    throw new DomainError(
      `A concept bans at most ${MAX_BUZZWORDS} buzzwords, got ${buzzwords.length}`,
    );
  }
  if (input.passages.length < 1 || input.passages.length > MAX_PASSAGES) {
    throw new DomainError(
      `A concept needs 1 to ${MAX_PASSAGES} source passages, got ${input.passages.length}`,
    );
  }
  const short = input.passages.find((p) => p.quote.trim().length < MIN_QUOTE);
  if (short)
    throw new DomainError(
      `A quote needs at least ${MIN_QUOTE} characters: "${short.quote}"`,
    );
  return {
    title,
    summary,
    assertions,
    buzzwords,
    passages: input.passages.map((p) => ({ ...p, quote: p.quote.trim() })),
    fromNotes: [...new Set(input.fromNotes)],
  };
}
