import { useCallback, useEffect, useMemo, useState } from 'react';
import { books as library } from './data/books';
import type { Book } from './types/book';
import { readCoverPalette } from './lib/palette';
import { TypedTitle } from './components/TypedTitle';
import { LibraryFilter } from './components/LibraryFilter';
import { Shelf } from './components/Shelf';

export default function App() {
  const shelved = useCoverPalettes(library);
  const [visible, setVisible] = useState<Book[] | null>(null);

  const shown = visible ?? shelved;
  const handleChange = useCallback((next: Book[] | null) => setVisible(next), []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-page">
      {/* A slow cream haze, so the paper never looks flat. */}
      <div
        aria-hidden="true"
        className="animate-drift pointer-events-none absolute -top-1/3 left-1/2 h-[120vh] w-[120vw] -translate-x-1/2 rounded-full"
        style={{ background: 'radial-gradient(closest-side, var(--color-cream-300), transparent 68%)', opacity: 0.55 }}
      />

      <div className="relative">
        <header className="animate-rise mx-auto w-full max-w-[1140px] px-[5vw] pt-10">
          <p className="label rail-label">A personal archive</p>
          <div className="mt-3">
            <TypedTitle />
          </div>
          <p className="label-muted mt-4">
            {library.length} {library.length === 1 ? 'volume' : 'volumes'}
          </p>

          {library.length > 0 && <LibraryFilter books={shelved} onChange={handleChange} />}
        </header>

        <main className="mt-2 pb-2">
          {library.length === 0 ? (
            <EmptyShelf />
          ) : shown.length === 0 ? (
            <p className="display py-24 text-center text-[28px] text-muted">No books match</p>
          ) : (
            <Shelf books={shown} />
          )}
        </main>

        <footer className="label-muted px-[5vw] pb-10 text-center opacity-70">
          Built from a Goodreads export · Covers via Open Library
        </footer>
      </div>
    </div>
  );
}

/**
 * Upgrades each book's fallback palette by sampling its real cover art.
 *
 * The build step has no browser, so it ships deterministic colors; this
 * replaces them once the artwork loads. Books whose covers are missing or
 * blocked simply keep the fallback.
 */
function useCoverPalettes(books: Book[]): Book[] {
  const [sampled, setSampled] = useState<Record<string, Pick<Book, 'spine' | 'band' | 'ink'>>>({});

  useEffect(() => {
    let live = true;
    const withCovers = books.filter((b) => b.cover);

    void Promise.all(
      withCovers.map(async (book) => {
        const palette =
          (await readCoverPalette(book.cover)) ??
          (book.coverAlt ? await readCoverPalette(book.coverAlt) : null);
        if (live && palette) setSampled((prev) => ({ ...prev, [book.id]: palette }));
      }),
    );

    return () => {
      live = false;
    };
  }, [books]);

  return useMemo(() => books.map((b) => (sampled[b.id] ? { ...b, ...sampled[b.id] } : b)), [books, sampled]);
}

function EmptyShelf() {
  return (
    <section className="mx-auto max-w-lg px-6 py-24 text-center">
      <h2 className="display text-[40px]">The shelves are empty</h2>
      <p className="measure-body mx-auto mt-5 text-muted">
        This library is built from a Goodreads export. Add yours as
        <code className="mx-1.5 rounded-[2px] bg-sunken px-1.5 py-0.5 text-[14.5px] text-strong">
          data/goodreads_library_export.csv
        </code>
        and the shelves fill themselves on the next build.
      </p>
      <p className="label-muted mt-6">Goodreads → My Books → Import and export → Export Library</p>
    </section>
  );
}
