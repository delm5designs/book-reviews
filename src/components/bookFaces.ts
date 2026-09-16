import type { Book } from '../types/book';

/**
 * Front-cover depth in un-scaled spine space.
 *
 * Kept for reference, but the cover width is derived per book instead: a fixed
 * value makes a tall hardcover and a short mass-market paperback the same
 * width, which reads as wrong.
 */
export const COVER_W = 178;

/** Real books are roughly two-thirds as wide as they are tall, by binding. */
const COVER_RATIO: Record<Book['binding'], number> = {
  hardcover: 0.7,
  paperback: 0.67,
  mass: 0.62,
};

/**
 * Cover width for a book, in the same space as its height.
 *
 * Callers multiply by whatever display scale they are using, so proportions
 * hold at any size.
 */
export function coverWidthFor(book: Book): number {
  return book.height * COVER_RATIO[book.binding];
}

/**
 * Spine lettering. The Morana system has two typefaces, so the data model's
 * third face falls back to the sans rather than inventing a monospace.
 */
export const faceFont = {
  serif: 'font-display',
  sans: 'font-sans',
  mono: 'font-sans',
} as const;
