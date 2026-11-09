import { extractMarks } from './synthesis.js';
import { quotesSource, words } from './text.js';

export const NOTE_SHARE_LIMIT = 0.2;
export const MIN_SUMMARY_SENTENCES = 1;
export const MAX_SUMMARY_SENTENCES = 3;

export interface Section {
  page: number | null;
  text: string;
}

export interface ReadingNote {
  text: string;
  quote: boolean;
}

const PAGE = /^## Page (\d+)[ \t]*$/m;
const FRONT = /^---\n[\s\S]*?\n---\n?/;
const SUMMARY_CALLOUT = /^>[ \t]*\[!summary\][^\n]*(?:\n>[^\n]*)*/gim;

export function sections(body: string): Section[] {
  const text = body.replace(FRONT, '');
  const parts = text.split(/^(?=## Page \d+[ \t]*$)/m);
  const pages = parts
    .map((part): Section | null => {
      const heading = PAGE.exec(part);
      if (!heading || heading.index !== 0) return null;
      return {
        page: Number(heading[1]),
        text: part.slice(heading[0].length).replace(SUMMARY_CALLOUT, '').trim(),
      };
    })
    .filter((s): s is Section => s !== null && s.text.length > 0);
  if (pages.length) return pages;
  const whole = text.replace(SUMMARY_CALLOUT, '').trim();
  return whole ? [{ page: null, text: whole }] : [];
}

export function hasChapterSummary(body: string): boolean {
  return extractMarks(body).some(
    (m) => m.kind === 'summary' && m.page === null,
  );
}

export function readingNote(
  text: string,
  section: string,
  runWords: number,
): ReadingNote {
  const note = text.trim().replace(/\s*\n\s*/g, ' ');
  return { text: note, quote: quotesSource(note, section, runWords) };
}

export function noteShare(
  notes: readonly ReadingNote[],
  section: string,
): number {
  const total = words(section).length;
  if (!total) return 0;
  return words(notes.map((n) => n.text).join(' ')).length / total;
}

export function sentenceCount(text: string): number {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => words(s).length > 0).length;
}

export function summaryProblem(
  summary: string,
  chapter: string,
  runWords: number,
): string | null {
  const count = sentenceCount(summary);
  if (count < MIN_SUMMARY_SENTENCES || count > MAX_SUMMARY_SENTENCES)
    return `Sum the chapter up in ${MIN_SUMMARY_SENTENCES} to ${MAX_SUMMARY_SENTENCES} sentences, not ${count}`;
  if (quotesSource(summary, chapter, runWords))
    return `Use your own words: the summary copies ${runWords} or more words in a row from the chapter`;
  return null;
}
