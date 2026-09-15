import type { Book } from '../types/book';
import { BookCard } from './BookCard';

export function BookGrid({ books }: { books: Book[] }) {
  if (books.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500 dark:border-stone-700">
        Nothing on this shelf matches those filters.
      </p>
    );
  }
  return (
    <ul className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {books.map((b) => (
        <li key={b.id}>
          <BookCard book={b} />
        </li>
      ))}
    </ul>
  );
}
