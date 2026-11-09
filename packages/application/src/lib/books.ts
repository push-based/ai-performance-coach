import { NotFoundError } from './errors.js';
import type { BookProgress, Library } from './ports/library.js';

export async function findBook(
  library: Library,
  book: string,
): Promise<BookProgress> {
  const wanted = book.trim().toLowerCase();
  const found = (await library.readingProgress()).filter(
    (b) =>
      b.title.toLowerCase() === wanted || b.folder === book || b.index === book,
  );
  if (!found.length) throw new NotFoundError(`No book matches "${book}"`);
  if (found.length > 1)
    throw new NotFoundError(
      `"${book}" matches ${found.length} books: ${found.map((b) => b.title).join(', ')}`,
    );
  return found[0]!;
}
