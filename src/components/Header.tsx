import type { ShelfSummary } from '../types/book';

export function Header({ summary }: { summary: ShelfSummary }) {
  const read = summary.byExclusiveShelf['read'] ?? 0;
  return (
    <header className="mx-auto max-w-6xl px-4 pt-10 pb-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Bookshelf</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Book Reviews</h1>
      <p className="mt-3 max-w-2xl text-stone-600 dark:text-stone-400">
        What I've read, what I'm reading, and what I thought of it. Built from my Goodreads library.
      </p>
      {summary.total > 0 && (
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <Stat label={read === 1 ? 'book read' : 'books read'} value={read} />
          {summary.rated > 0 && <Stat label="rated" value={summary.rated} />}
          {summary.reviewed > 0 && <Stat label="reviewed" value={summary.reviewed} />}
        </dl>
      )}
    </header>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dd className="font-serif text-2xl">{value}</dd>
      <dt className="text-stone-500">{label}</dt>
    </div>
  );
}
