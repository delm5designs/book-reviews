import { useMemo, useState } from 'react';
import booksJson from './data/books.json';
import type { Book } from './types/book';
import { collectTags, queryShelf, summarise, type ShelfQuery } from './lib/shelf';
import { Header } from './components/Header';
import { ShelfToolbar } from './components/ShelfToolbar';
import { BookGrid } from './components/BookGrid';
import { EmptyShelf } from './components/EmptyShelf';

// books.json is generated from data/goodreads_library_export.csv by scripts/build-shelf.ts.
const BOOKS = booksJson as Book[];

const DEFAULT_QUERY: ShelfQuery = { shelf: 'all', search: '', sort: 'date-read', tag: null };

export default function App() {
  const [query, setQuery] = useState<ShelfQuery>(DEFAULT_QUERY);

  const summary = useMemo(() => summarise(BOOKS), []);
  const tags = useMemo(() => collectTags(BOOKS), []);
  const visible = useMemo(() => queryShelf(BOOKS, query), [query]);

  return (
    <div className="min-h-screen">
      <Header summary={summary} />
      <main className="mx-auto max-w-6xl px-4 pb-16">
        {BOOKS.length === 0 ? (
          <EmptyShelf />
        ) : (
          <>
            <ShelfToolbar query={query} onChange={setQuery} summary={summary} tags={tags} resultCount={visible.length} />
            <BookGrid books={visible} />
          </>
        )}
      </main>
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500 dark:border-stone-800">
        Data from a Goodreads library export · Covers via Open Library
      </footer>
    </div>
  );
}
