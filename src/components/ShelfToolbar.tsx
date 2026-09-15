import { SHELF_FILTERS, SORT_OPTIONS, type ShelfFilter, type ShelfQuery, type SortKey } from '../lib/shelf';
import type { ShelfSummary } from '../types/book';

interface ShelfToolbarProps {
  query: ShelfQuery;
  onChange: (next: ShelfQuery) => void;
  summary: ShelfSummary;
  tags: { tag: string; count: number }[];
  resultCount: number;
}

export function ShelfToolbar({ query, onChange, summary, tags, resultCount }: ShelfToolbarProps) {
  const set = <K extends keyof ShelfQuery>(key: K, value: ShelfQuery[K]) => onChange({ ...query, [key]: value });

  return (
    <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-stone-200 bg-stone-50/90 px-4 py-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Shelf">
          {SHELF_FILTERS.map(({ value, label }) => {
            const count = value === 'all' ? summary.total : (summary.byExclusiveShelf[value] ?? 0);
            const active = query.shelf === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => set('shelf', value as ShelfFilter)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  active
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-700 dark:hover:bg-stone-800'
                }`}
              >
                {label}
                <span className={`ml-1.5 text-xs ${active ? 'opacity-70' : 'text-stone-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[12rem]">
            <span className="sr-only">Search titles, authors, shelves and reviews</span>
            <input
              type="search"
              value={query.search}
              onChange={(e) => set('search', e.target.value)}
              placeholder="Search titles, authors, shelves, reviews…"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:border-stone-500 focus:outline-none dark:border-stone-700 dark:bg-stone-900"
            />
          </label>

          <label className="text-sm">
            <span className="sr-only">Sort by</span>
            <select
              value={query.sort}
              onChange={(e) => set('sort', e.target.value as SortKey)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
          </label>

          {tags.length > 0 && (
            <label className="text-sm">
              <span className="sr-only">Filter by shelf tag</span>
              <select
                value={query.tag ?? ''}
                onChange={(e) => set('tag', e.target.value || null)}
                className="max-w-[14rem] rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
              >
                <option value="">All tags</option>
                {tags.map(({ tag, count }) => (
                  <option key={tag} value={tag}>
                    {tag} ({count})
                  </option>
                ))}
              </select>
            </label>
          )}

          <span className="ml-auto text-xs text-stone-500" aria-live="polite">
            {resultCount} {resultCount === 1 ? 'book' : 'books'}
          </span>
        </div>
      </div>
    </div>
  );
}
