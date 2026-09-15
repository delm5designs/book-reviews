/**
 * Shown when src/data/books.json is empty - i.e. no Goodreads export has been
 * added yet. No sample books are ever shown; the site reflects the real library only.
 */
export function EmptyShelf() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-900/40">
        📚
      </div>
      <h2 className="font-serif text-2xl">The shelf is empty</h2>
      <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        This site is built from a Goodreads library export. Add yours as
        <code className="mx-1 rounded bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-800">
          data/goodreads_library_export.csv
        </code>
        and the shelf fills itself on the next build.
      </p>
      <ol className="mt-5 space-y-2 text-left text-sm text-stone-700 dark:text-stone-300">
        <li>
          <span className="font-medium">1.</span> On Goodreads open <em>My Books</em> → <em>Import and export</em> →{' '}
          <em>Export Library</em>.
        </li>
        <li>
          <span className="font-medium">2.</span> Save the downloaded file to the <code>data/</code> folder with its
          original name.
        </li>
        <li>
          <span className="font-medium">3.</span> Commit and push. The Update shelf and Deploy workflows do the rest.
        </li>
      </ol>
    </section>
  );
}
