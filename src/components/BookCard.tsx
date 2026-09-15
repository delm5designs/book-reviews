import { useState } from 'react';
import type { Book } from '../types/book';
import { goodreadsUrl } from '../lib/covers';
import { formatDate } from '../lib/shelf';
import { BookCover } from './BookCover';
import { RatingStars } from './RatingStars';

const SHELF_LABEL: Record<string, string> = {
  read: 'Read',
  'currently-reading': 'Reading now',
  'to-read': 'Want to read',
};

const REVIEW_PREVIEW_CHARS = 280;

export function BookCard({ book }: { book: Book }) {
  const [expanded, setExpanded] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);

  const review = book.review;
  const isLong = (review?.length ?? 0) > REVIEW_PREVIEW_CHARS;
  const visibleReview = review && !expanded && isLong ? review.slice(0, REVIEW_PREVIEW_CHARS).trimEnd() + '…' : review;
  const dateRead = formatDate(book.dateRead);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
      <div className="flex gap-4">
        <div className="w-24 shrink-0 sm:w-28">
          <BookCover book={book} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg leading-snug">
            <a
              href={goodreadsUrl(book)}
              target="_blank"
              rel="noreferrer"
              className="hover:underline focus-visible:underline"
            >
              {book.title}
            </a>
          </h3>
          <p className="mt-0.5 truncate text-sm text-stone-600 dark:text-stone-400">
            {book.author}
            {book.additionalAuthors.length > 0 && <span> · with {book.additionalAuthors.join(', ')}</span>}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <RatingStars rating={book.myRating} />
            {book.averageRating !== null && (
              <span className="text-xs text-stone-500" title="Goodreads community average">
                avg {book.averageRating.toFixed(2)}
              </span>
            )}
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
            <div className="rounded-full bg-stone-100 px-2 py-0.5 dark:bg-stone-800">
              <dt className="sr-only">Shelf</dt>
              <dd>{SHELF_LABEL[book.exclusiveShelf] ?? book.exclusiveShelf}</dd>
            </div>
            {dateRead && (
              <div>
                <dt className="sr-only">Date read</dt>
                <dd>Read {dateRead}</dd>
              </div>
            )}
            {book.pages !== null && (
              <div>
                <dt className="sr-only">Pages</dt>
                <dd>{book.pages} pp</dd>
              </div>
            )}
            {book.originalPublicationYear !== null && (
              <div>
                <dt className="sr-only">First published</dt>
                <dd>{book.originalPublicationYear}</dd>
              </div>
            )}
            {book.readCount > 1 && (
              <div>
                <dt className="sr-only">Times read</dt>
                <dd>Read {book.readCount}×</dd>
              </div>
            )}
          </dl>
          {book.shelves.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1" aria-label="Shelves">
              {book.shelves.map((s) => (
                <li
                  key={s}
                  className="rounded border border-stone-200 px-1.5 py-0.5 text-[11px] text-stone-600 dark:border-stone-700 dark:text-stone-300"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {review && (
        <div className="border-t border-stone-100 pt-3 text-sm leading-relaxed text-stone-800 dark:border-stone-800 dark:text-stone-200">
          {book.spoiler && !spoilerRevealed ? (
            <button
              type="button"
              onClick={() => setSpoilerRevealed(true)}
              className="rounded-md bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            >
              This review contains spoilers — show it
            </button>
          ) : (
            <>
              <p className="whitespace-pre-line">{visibleReview}</p>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 text-xs font-medium text-sky-700 hover:underline dark:text-sky-400"
                  aria-expanded={expanded}
                >
                  {expanded ? 'Show less' : 'Read the full review'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}
