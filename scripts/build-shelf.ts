/**
 * Build step: data/goodreads_library_export.csv -> src/data/books.ts
 *
 * Implements Section 4 of the Virtual Library build guide, offline. Runs
 * automatically before `vite dev` / `vite build` and in the "Update shelf"
 * workflow.
 *
 * It never invents books, and it never invents facts about them: blurbs and
 * cover-sampled colors are not fabricated here. Covers are addressed by ISBN,
 * which needs no lookup, and the spine palette is a deterministic fallback
 * that the browser upgrades by sampling the real cover art (src/lib/palette.ts).
 *
 * A missing CSV is a warning and writes an empty array, so the UI shows its
 * empty-shelf state. A malformed CSV is an error and fails the build.
 *
 * Accepts the raw Goodreads export and the common "opened in a spreadsheet and
 * re-saved" variant (locale-formatted dates, ISBN wrappers stripped, columns
 * missing).
 *
 * Privacy: "Private Notes" is deliberately never copied into the output.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import type { Book } from '../src/types/book.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSV_PATH = resolve(ROOT, 'data/goodreads_library_export.csv');
const OUT_PATH = resolve(ROOT, 'src/data/books.ts');

type GoodreadsRow = Partial<Record<string, string>>;

const REQUIRED_COLUMNS = ['Book Id', 'Title', 'Author', 'Exclusive Shelf'];

/** Section 4: only shelved-as-read and in-progress books reach the shelf. */
const INCLUDED_SHELVES = new Set(['read', 'currently-reading']);

const inGitHubActions = process.env.GITHUB_ACTIONS === 'true';

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function text(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

/** Goodreads wraps ISBNs as `="0345391802"` so spreadsheets keep leading zeros. */
function isbn(value: string | undefined): string {
  return (value ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();
}

function int(value: string | undefined): number | null {
  const n = Number.parseInt((value ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/** Goodreads writes 0 for "unknown" page counts and years. */
function positiveInt(value: string | undefined): number | null {
  const n = int(value);
  return n !== null && n > 0 ? n : null;
}

type DayMonthOrder = 'dmy' | 'mdy';

/**
 * Goodreads writes `YYYY/MM/DD`. A spreadsheet re-save turns that into a
 * locale format, so day/month order is detected once per file: a first field
 * over 12 must be a day, a second field over 12 must be a month.
 */
function detectDayMonthOrder(values: (string | undefined)[]): DayMonthOrder {
  let dayFirst = false;
  let monthFirst = false;
  for (const v of values) {
    const m = (v ?? '').trim().match(/^(\d{1,2})[/-](\d{1,2})[/-]\d{4}$/);
    if (!m) continue;
    if (Number(m[1]) > 12) dayFirst = true;
    if (Number(m[2]) > 12) monthFirst = true;
  }
  if (dayFirst && monthFirst) {
    console.warn('⚠ Dates mix day-first and month-first forms; assuming day/month/year.');
    return 'dmy';
  }
  return monthFirst ? 'mdy' : 'dmy';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Returns { sortKey: "YYYY-MM-DD", label: "Mon YYYY" }, or null. */
function parseDate(value: string | undefined, order: DayMonthOrder): { sortKey: string; label: string } | null {
  const v = (value ?? '').trim();
  const pad = (n: string) => n.padStart(2, '0');
  let y: string, mo: string, d: string;

  const ymd = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  const xyz = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ymd) {
    [y, mo, d] = [ymd[1], pad(ymd[2]), pad(ymd[3])];
  } else if (xyz) {
    const [day, month] = order === 'dmy' ? [xyz[1], xyz[2]] : [xyz[2], xyz[1]];
    [y, mo, d] = [xyz[3], pad(month), pad(day)];
  } else {
    return null;
  }

  const monthIndex = Number(mo) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { sortKey: `${y}-${mo}-${d}`, label: `${MONTHS[monthIndex]} ${y}` };
}

/**
 * Reviews arrive with `<br/>` line breaks, and a spreadsheet-saved export
 * carries real newlines inside the quoted field. Paragraph breaks must survive
 * both, so unlike text() this collapses only horizontal whitespace.
 */
function review(value: string | undefined): string {
  const raw = (value ?? '').trim();
  if (raw.length === 0) return '';
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function coverUrl(key: string): string {
  return `https://covers.openlibrary.org/b/isbn/${key}-L.jpg?default=false`;
}

/** Stable 32-bit hash, so every derived physical property is reproducible. */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A deterministic 0-1 stream from one seed, so each property varies independently. */
function rng(seed: string, salt: string): number {
  return (hash(`${seed}:${salt}`) % 10000) / 10000;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number, places = 0) => Number(n.toFixed(places));

/** Slug used as the stable id, matching the guide's `title-slug-index` shape. */
function slug(title: string, index: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28)
    .replace(/-$/, '');
  return `${base}-${index}`;
}

/**
 * Deterministic warm palette. The browser replaces these by sampling the real
 * cover art; this is the guide's documented fallback for when that is not
 * possible, and the only honest option at build time with no network.
 */
const CLOTH_HUES = [
  18, // oxblood
  26, // tan
  34, // ochre
  44, // mustard
  96, // olive
  142, // forest
  186, // teal
  212, // slate blue
  224, // navy
  348, // deep red
];

function palette(seed: string): { spine: string; band: string; ink: string } {
  const hue = CLOTH_HUES[Math.floor(rng(seed, 'hue') * CLOTH_HUES.length) % CLOTH_HUES.length];
  const light = 22 + rng(seed, 'light') * 16;
  const sat = 22 + rng(seed, 'sat') * 20;
  const spine = hslToHex(hue, sat, light);
  const band = hslToHex((hue + 16) % 360, sat + 16, Math.min(72, light + 26));
  return { spine, band, ink: light > 55 ? '#241f19' : '#faf7f0' };
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** Section 4's physical derivations, all driven by page count plus the hash. */
function physical(seed: string, pages: number | null): Pick<
  Book,
  'binding' | 'finish' | 'height' | 'width' | 'lean' | 'depth' | 'wear' | 'face' | 'caps'
> {
  const p = pages ?? 300;
  const binding: Book['binding'] = p > 420 ? 'hardcover' : p < 260 ? 'mass' : 'paperback';
  const finish: Book['finish'] =
    binding === 'hardcover' ? 'cloth' : rng(seed, 'finish') < 0.5 ? 'gloss' : 'matte';

  const heightRange =
    binding === 'hardcover' ? [236, 254] : binding === 'mass' ? [196, 210] : [214, 230];
  const height = Math.round(heightRange[0] + rng(seed, 'height') * (heightRange[1] - heightRange[0]));

  const jitter = (rng(seed, 'jitter') - 0.5) * 6;
  const width = Math.round(clamp(p * 0.055 + jitter, 16, 58));

  const faces: Book['face'][] = ['serif', 'sans', 'mono'];
  const faceRoll = rng(seed, 'face');
  const face = faces[faceRoll < 0.6 ? 0 : faceRoll < 0.85 ? 1 : 2];

  return {
    binding,
    finish,
    height,
    width,
    lean: round(-5 * rng(seed, 'lean'), 1),
    depth: round(-7 + rng(seed, 'depth') * 14, 1),
    wear: round(rng(seed, 'wear') * 0.35, 2),
    face,
    caps: rng(seed, 'caps') < 0.35,
  };
}

/**
 * Section 4's genre set. The export carries no shelf tags, so every book falls
 * to the documented default rather than being assigned a genre it never had.
 */
function genresFor(row: GoodreadsRow): string[] {
  const shelves = text(row['Bookshelves'])
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const map: Record<string, string> = {
    fiction: 'Fiction',
    'literary-fiction': 'Fiction',
    nonfiction: 'Nonfiction',
    'non-fiction': 'Nonfiction',
    'sci-fi': 'Sci-Fi',
    scifi: 'Sci-Fi',
    'science-fiction': 'Sci-Fi',
    mystery: 'Mystery & Thriller',
    thriller: 'Mystery & Thriller',
    fantasy: 'Fantasy',
    romance: 'Romance',
  };

  const found = [...new Set(shelves.map((s) => map[s]).filter(Boolean))];
  return found.length > 0 ? found : ['Nonfiction'];
}

function toBook(row: GoodreadsRow, index: number, order: DayMonthOrder): (Book & { sortKey: string }) | null {
  const title = text(row['Title']);
  if (!title || !text(row['Book Id'])) return null;
  if (!INCLUDED_SHELVES.has(text(row['Exclusive Shelf']))) return null;

  const id = slug(title, index);
  const seed = `${text(row['Book Id'])}:${title}`;
  const pages = positiveInt(row['Number of Pages']);
  const isbn13 = isbn(row['ISBN13']);
  const isbn10 = isbn(row['ISBN']);
  const keys = [...new Set([isbn13, isbn10].filter(Boolean))];
  const read = parseDate(row['Date Read'], order);
  const added = parseDate(row['Date Added'], order);
  const rating = int(row['My Rating']) ?? 0;

  return {
    id,
    title,
    author: text(row['Author']) || 'Unknown author',
    genres: genresFor(row),
    // ISBN-addressed covers need no API lookup. default=false makes Open
    // Library 404 rather than return a blank pixel, so the UI can fall back.
    cover: keys[0] ? coverUrl(keys[0]) : '',
    coverAlt: keys[1] ? coverUrl(keys[1]) : undefined,
    year: positiveInt(row['Original Publication Year']) ?? positiveInt(row['Year Published']) ?? 0,
    // Not fabricated: the export carries no description and this build has no
    // network. The detail view typesets title and author when blurb is empty.
    blurb: '',
    review: review(row['My Review']),
    spoiler: (text(row['Spoiler']) || '').toLowerCase() === 'true' ? true : undefined,
    rating: rating > 0 ? rating : 0,
    finished: read?.label ?? '',
    publisher: text(row['Publisher']),
    ...palette(seed),
    ...physical(seed, pages),
    sortKey: read?.sortKey ?? added?.sortKey ?? '',
  };
}

function serialise(books: Book[]): string {
  const body = books.map((b) => `  ${JSON.stringify(b)},`).join('\n');
  return `// GENERATED FILE - do not edit.
// Written by scripts/build-shelf.ts from data/goodreads_library_export.csv.
// Run \`npm run shelf:build\` after replacing the export.
import type { Book } from '../types/book';

export const books: Book[] = [
${body}
];
`;
}

function write(books: Book[]): void {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, serialise(books));
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

  const order = detectDayMonthOrder(parsed.data.flatMap((r) => [r['Date Read'], r['Date Added']]));

  const rows: (Book & { sortKey: string })[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const [i, row] of parsed.data.entries()) {
    const book = toBook(row, i, order);
    if (!book) {
      skipped += 1;
      continue;
    }
    if (seen.has(book.id)) continue;
    seen.add(book.id);
    rows.push(book);
  }

  // Newest finished date first, per Section 4.
  rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey) || a.title.localeCompare(b.title));

  const books: Book[] = rows.map((row) => {
    const book: Book & { sortKey?: string } = { ...row };
    delete book.sortKey;
    return book;
  });
  write(books);

  const withCover = books.filter((b) => b.cover !== '').length;
  const reviewed = books.filter((b) => b.review !== '').length;
  console.log(`✔ Wrote ${books.length} books to src/data/books.ts`);
  console.log(`  ${'with cover art'.padEnd(18)} ${withCover}`);
  console.log(`  ${'rated'.padEnd(18)} ${books.filter((b) => b.rating > 0).length}`);
  console.log(`  ${'with read date'.padEnd(18)} ${books.filter((b) => b.finished !== '').length}`);
  console.log(`  ${'reviewed'.padEnd(18)} ${reviewed}`);
  if (skipped > 0) console.log(`  skipped ${skipped} row(s): no id/title, or not on a read shelf`);

  if (process.env.GITHUB_OUTPUT) {
    const summary = {
      total: books.length,
      withCover,
      rated: books.filter((b) => b.rating > 0).length,
      reviewed,
    };
    writeFileSync(process.env.GITHUB_OUTPUT, `summary=${JSON.stringify(summary)}\n`, { flag: 'a' });
  }
}

main();
