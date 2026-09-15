/**
 * Build step: data/goodreads_library_export.csv -> src/data/books.json
 *
 * Runs automatically before `vite dev` / `vite build` (see package.json) and
 * in the "Update shelf" GitHub Actions workflow. It never invents data: when
 * the CSV is missing it writes an empty array and the UI shows an empty-shelf
 * state that explains how to add the export.
 *

 * A missing CSV is a warning (the site renders its empty state). A CSV that
 * exists but cannot be parsed, or lacks Goodreads' core columns, is an error.
 *
 * Privacy: the "Private Notes" column is deliberately NOT copied into the
 * public JSON. Everything else in the export is public on Goodreads already.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import type { Book, ShelfSummary } from '../src/types/book.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSV_PATH = resolve(ROOT, 'data/goodreads_library_export.csv');
const OUT_PATH = resolve(ROOT, 'src/data/books.json');

/** Column headers exactly as Goodreads writes them in its library export. */
type GoodreadsRow = Partial<Record<
  | 'Book Id'
  | 'Title'
  | 'Author'
  | 'Author l-f'
  | 'Additional Authors'
  | 'ISBN'
  | 'ISBN13'
  | 'My Rating'
  | 'Average Rating'
  | 'Publisher'
  | 'Binding'
  | 'Number of Pages'
  | 'Year Published'
  | 'Original Publication Year'
  | 'Date Read'
  | 'Date Added'
  | 'Bookshelves'
  | 'Bookshelves with positions'
  | 'Exclusive Shelf'
  | 'My Review'
  | 'Spoiler'
  | 'Private Notes'
  | 'Read Count'
  | 'Owned Copies',
  string
>>;

const REQUIRED_COLUMNS = ['Book Id', 'Title', 'Author', 'Exclusive Shelf'] as const;

const inGitHubActions = process.env.GITHUB_ACTIONS === 'true';

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function text(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/** Goodreads wraps ISBNs as `="0345391802"` so spreadsheets keep leading zeros. */
function isbn(value: string | undefined): string | null {
  const cleaned = (value ?? '').replace(/^="?|"?$/g, '').replace(/[^0-9Xx]/g, '');
  return cleaned.length > 0 ? cleaned.toUpperCase() : null;
}

function int(value: string | undefined): number | null {
  const n = Number.parseInt((value ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function float(value: string | undefined): number | null {
  const n = Number.parseFloat((value ?? '').trim());
  return Number.isFinite(n) ? n : null;
}

/** Goodreads dates are `YYYY/MM/DD`; normalise to ISO `YYYY-MM-DD`. */
function isoDate(value: string | undefined): string | null {
  const match = (value ?? '').trim().match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Reviews arrive with `<br/>` line breaks and occasional stray HTML. */
function review(value: string | undefined): string | null {
  const raw = text(value);
  if (!raw) return null;
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toBook(row: GoodreadsRow): Book | null {
  const id = text(row['Book Id']);
  const title = text(row['Title']);
  if (!id || !title) return null;

  const rating = int(row['My Rating']);

  return {
    id,
    title,
    author: text(row['Author']) ?? 'Unknown author',
    authorSortKey: text(row['Author l-f']) ?? text(row['Author']) ?? '',
    additionalAuthors: list(row['Additional Authors']),
    isbn: isbn(row['ISBN']),
    isbn13: isbn(row['ISBN13']),
    myRating: rating && rating > 0 ? rating : null,
    averageRating: float(row['Average Rating']),
    publisher: text(row['Publisher']),
    binding: text(row['Binding']),
    pages: int(row['Number of Pages']),
    yearPublished: int(row['Year Published']),
    originalPublicationYear: int(row['Original Publication Year']),
    dateRead: isoDate(row['Date Read']),
    dateAdded: isoDate(row['Date Added']),
    shelves: list(row['Bookshelves']).filter((s) => s !== row['Exclusive Shelf']),
    exclusiveShelf: text(row['Exclusive Shelf']) ?? 'read',
    review: review(row['My Review']),
    spoiler: (text(row['Spoiler']) ?? '').toLowerCase() === 'true',
    readCount: int(row['Read Count']) ?? 0,
  };
}

function summarise(books: Book[]): ShelfSummary {
  const byExclusiveShelf: Record<string, number> = {};
  for (const b of books) {
    byExclusiveShelf[b.exclusiveShelf] = (byExclusiveShelf[b.exclusiveShelf] ?? 0) + 1;
  }
  return {
    total: books.length,
    byExclusiveShelf,
    rated: books.filter((b) => b.myRating !== null).length,
    reviewed: books.filter((b) => b.review !== null).length,
  };
}

function write(books: Book[]): void {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(books, null, 2) + '\n');
}

function main(): void {
  if (!existsSync(CSV_PATH)) {
    const message = 'No Goodreads export at data/goodreads_library_export.csv - writing an empty shelf.';
    console.warn(inGitHubActions ? `::warning file=data/README.md::${message}` : `⚠ ${message}`);
    write([]);
    return;
  }

  const csv = readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, '');
  const parsed = Papa.parse<GoodreadsRow>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const hardErrors = parsed.errors.filter((e) => e.type !== 'FieldMismatch');
  if (hardErrors.length > 0) {
    fail(`CSV parse errors:\n${hardErrors.map((e) => `  row ${e.row ?? '?'}: ${e.message}`).join('\n')}`);
  }

  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    fail(`CSV is missing required Goodreads columns: ${missing.join(', ')}\nFound: ${headers.join(', ')}`);
  }

  const books: Book[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const row of parsed.data) {
    const book = toBook(row);
    if (!book) {
      skipped += 1;
      continue;
    }
    if (seen.has(book.id)) continue; // Goodreads occasionally duplicates rows across shelves
    seen.add(book.id);
    books.push(book);
  }

  // Newest reads first; unread items fall back to date added.
  books.sort((a, b) => {
    const ak = a.dateRead ?? a.dateAdded ?? '';
    const bk = b.dateRead ?? b.dateAdded ?? '';
    return bk.localeCompare(ak);
  });

  write(books);

  const summary = summarise(books);
  console.log(`✔ Wrote ${summary.total} books to src/data/books.json`);
  for (const [shelf, count] of Object.entries(summary.byExclusiveShelf).sort()) {
    console.log(`  ${shelf.padEnd(18)} ${count}`);
  }
  console.log(`  ${'rated'.padEnd(18)} ${summary.rated}`);
  console.log(`  ${'reviewed'.padEnd(18)} ${summary.reviewed}`);
  if (skipped > 0) console.log(`  skipped ${skipped} row(s) without an id/title`);

  // Machine-readable summary for the GitHub Actions step summary.
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `summary=${JSON.stringify(summary)}\n`, { flag: 'a' });
  }
}

main();
