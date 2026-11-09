import { NotFoundError } from './errors.js';
import type { BookProgress, Library } from './ports/library.js';

function bare(ref: string): string {
  return ref.trim().replace(/\/+$/, '').toLowerCase();
}

export async function findBook(
  library: Library,
  book: string,
): Promise<BookProgress> {
  const wanted = bare(book);
  const books = await library.readingProgress();
  const found = books.filter(
    (b) =>
      b.title.toLowerCase() === wanted ||
      bare(b.folder) === wanted ||
      bare(b.index) === wanted,
  );
  if (!found.length)
    throw new NotFoundError(
      `No converted book matches "${book}"; known books: ${books.map((b) => b.title).join(', ') || 'none'}`,
    );
  if (found.length > 1)
    throw new NotFoundError(
      `"${book}" matches ${found.length} books: ${found.map((b) => b.title).join(', ')}`,
    );
  return found[0]!;
}
