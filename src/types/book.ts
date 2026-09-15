/**
 * Shape of one book after the Goodreads CSV has been normalised by
 * scripts/build-shelf.ts. This is the only contract between the data
 * pipeline and the UI; keep both sides in sync when changing it.
 */

/** Goodreads' three built-in exclusive shelves. Custom exclusive shelves are kept as plain strings. */
export type ExclusiveShelf = 'read' | 'currently-reading' | 'to-read' | (string & {});

export interface Book {
  /** Goodreads "Book Id" - stable per edition. */
  id: string;
  title: string;
  author: string;
  /** Goodreads "Author l-f" (last, first) - handy for sorting. */
  authorSortKey: string;
  additionalAuthors: string[];
  /** ISBN-10 with Goodreads' `="..."` wrapper stripped; null when absent. */
  isbn: string | null;
  isbn13: string | null;
  /** 1-5, or null when unrated (Goodreads exports 0 for unrated). */
  myRating: number | null;
  averageRating: number | null;
  publisher: string | null;
  binding: string | null;
  pages: number | null;
  yearPublished: number | null;
  originalPublicationYear: number | null;
  /** ISO date (YYYY-MM-DD) or null. */
  dateRead: string | null;
  dateAdded: string | null;
  /** Non-exclusive shelves (tags) from the "Bookshelves" column. */
  shelves: string[];
  exclusiveShelf: ExclusiveShelf;
  /** "My Review" with Goodreads' <br/> markup normalised to newlines; null when empty. */
  review: string | null;
  spoiler: boolean;
  readCount: number;
}

export interface ShelfSummary {
  total: number;
  byExclusiveShelf: Record<string, number>;
  rated: number;
  reviewed: number;
}
