import type { Book, ShelfSummary } from '../types/book';

export type ShelfFilter = 'all' | 'read' | 'currently-reading' | 'to-read';

export const SHELF_FILTERS: { value: ShelfFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'read', label: 'Read' },
  { value: 'currently-reading', label: 'Currently reading' },
  { value: 'to-read', label: 'Want to read' },
];

export type SortKey = 'date-read' | 'date-added' | 'rating' | 'title' | 'author';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date-read', label: 'Recently read' },
  { value: 'date-added', label: 'Recently added' },
  { value: 'rating', label: 'My rating' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
];

export interface ShelfQuery {
  shelf: ShelfFilter;
  search: string;
  sort: SortKey;
  tag: string | null;
}

/** Plain, client-side substring match. Deliberately not "smart". */
function matchesSearch(book: Book, needle: string): boolean {
  if (!needle) return true;
  const hay = [book.title, book.author, ...book.additionalAuthors, ...book.shelves, book.review ?? '']
    .join(' ')
    .toLowerCase();
  return needle
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

const byTitle = (a: Book, b: Book) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

function compare(sort: SortKey): (a: Book, b: Book) => number {
  switch (sort) {
    case 'date-read':
      return (a, b) => (b.dateRead ?? b.dateAdded ?? '').localeCompare(a.dateRead ?? a.dateAdded ?? '') || byTitle(a, b);
    case 'date-added':
      return (a, b) => (b.dateAdded ?? '').localeCompare(a.dateAdded ?? '') || byTitle(a, b);
    case 'rating':
      return (a, b) => (b.myRating ?? 0) - (a.myRating ?? 0) || byTitle(a, b);
    case 'title':
      return byTitle;
    case 'author':
      return (a, b) => a.authorSortKey.localeCompare(b.authorSortKey, undefined, { sensitivity: 'base' }) || byTitle(a, b);
  }
}

export function queryShelf(books: Book[], query: ShelfQuery): Book[] {
  const needle = query.search.trim();
  return books
    .filter((b) => query.shelf === 'all' || b.exclusiveShelf === query.shelf)
    .filter((b) => query.tag === null || b.shelves.includes(query.tag))
    .filter((b) => matchesSearch(b, needle))
    .sort(compare(query.sort));
}

export function summarise(books: Book[]): ShelfSummary {
  const byExclusiveShelf: Record<string, number> = {};
  for (const b of books) byExclusiveShelf[b.exclusiveShelf] = (byExclusiveShelf[b.exclusiveShelf] ?? 0) + 1;
  return {
    total: books.length,
    byExclusiveShelf,
    rated: books.filter((b) => b.myRating !== null).length,
    reviewed: books.filter((b) => b.review !== null).length,
  };
}

/** Custom (non-exclusive) shelves, most-used first. */
export function collectTags(books: Book[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const b of books) for (const s of b.shelves) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
