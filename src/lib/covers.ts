import type { Book } from '../types/book';

/**
 * Goodreads exports carry no cover URLs. Open Library serves covers by ISBN
 * with no API key; `default=false` makes it return 404 instead of a 1x1 pixel
 * when it has nothing, so the <img onError> fallback fires.
 */
export function coverUrl(book: Book, size: 'S' | 'M' | 'L' = 'M'): string | null {
  const key = book.isbn13 ?? book.isbn;
  if (!key) return null;
  return `https://covers.openlibrary.org/b/isbn/${key}-${size}.jpg?default=false`;
}

export function goodreadsUrl(book: Book): string {
  return `https://www.goodreads.com/book/show/${book.id}`;
}

/** Deterministic hue per book so cover-less tiles stay visually distinct. */
export function fallbackHue(book: Book): number {
  let hash = 0;
  for (const ch of book.title) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}
