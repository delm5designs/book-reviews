import { useEffect, useMemo, useState } from 'react';
import type { Book } from '../types/book';

const DEBOUNCE_MS = 180;
const MIN_QUERY = 2;

interface LibraryFilterProps {
  books: Book[];
  /** null means "show everything". */
  onChange: (visible: Book[] | null) => void;
}

/**
 * Search and genre pills.
 *
 * This brief excludes the AI search endpoint, so this is the guide's
 * documented fallback: plain client-side matching over title, author, genres
 * and blurb. The controls are identical; only the ranking is dumber.
 */
export function LibraryFilter({ books, onChange }: LibraryFilterProps) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [genre, setGenre] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of books) for (const g of b.genres ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [books]);

  const matched = useMemo(() => {
    const active = debounced.length >= MIN_QUERY;
    if (!active && genre === null) return null;

    const terms = debounced.toLowerCase().split(/\s+/).filter(Boolean);
    return books.filter((b) => {
      if (genre !== null && !(b.genres ?? []).includes(genre)) return false;
      if (!active) return true;
      const hay = [b.title, b.author, b.publisher, ...(b.genres ?? []), b.blurb].join(' ').toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [books, debounced, genre]);

  useEffect(() => {
    onChange(matched);
  }, [matched, onChange]);

  const searching = debounced.length >= MIN_QUERY;

  return (
    <div className="mt-6 w-full">
      <div className="relative max-w-xl">
        <label htmlFor="library-search" className="sr-only">
          What are you looking for?
        </label>
        <input
          id="library-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you looking for?"
          className="w-full border-0 border-b border-border bg-transparent pb-3 font-display text-[clamp(1.1rem,2.2vw,1.5rem)] font-light italic outline-none transition-colors placeholder:text-muted/70 focus:border-primary"
        />
        <p className="mt-2 h-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted" aria-live="polite">
          {searching && matched ? `${matched.length} found` : ''}
        </p>
      </div>

      {genres.length > 0 && (
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto whitespace-nowrap">
          <Pill active={genre === null} onClick={() => setGenre(null)} label="All" count={books.length} />
          {genres.map((g) => (
            <Pill
              key={g.name}
              active={genre === g.name}
              onClick={() => setGenre(genre === g.name ? null : g.name)}
              label={g.name}
              count={g.count}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
        active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:border-primary/60 hover:text-foreground'
      }`}
    >
      {label}
      <span className="ml-2 opacity-60">{count}</span>
    </button>
  );
}
