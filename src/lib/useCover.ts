import { useEffect, useMemo, useState } from 'react';
import type { Book } from '../types/book';

/**
 * Resolves the first cover URL that actually loads.
 *
 * Open Library 404s for plenty of ISBNs, and indexes covers per edition, so a
 * book's ISBN-13 can fail where its ISBN-10 succeeds. Probing in the browser is
 * the only way to know, because the build step has no network. Returns null
 * when no candidate loads, which is the signal to typeset a cover instead.
 */
export function useCover(book: Book): string | null {
  const candidates = useMemo(
    () => [book.cover, book.coverAlt].filter((c): c is string => Boolean(c)),
    [book.cover, book.coverAlt],
  );
  const key = candidates.join('|');

  const [resolved, setResolved] = useState<{ key: string; src: string } | null>(null);

  useEffect(() => {
    if (candidates.length === 0) return;
    let live = true;

    const tryAt = (i: number) => {
      if (!live || i >= candidates.length) return;
      const img = new Image();
      img.onload = () => {
        if (!live) return;
        // Open Library sometimes serves a 1x1 placeholder rather than a 404.
        if (img.naturalWidth > 2) {
          setResolved({ key, src: candidates[i] });
        } else {
          tryAt(i + 1);
        }
      };
      img.onerror = () => tryAt(i + 1);
      img.src = candidates[i];
    };

    tryAt(0);
    return () => {
      live = false;
    };
  }, [candidates, key]);

  // Derived rather than reset in the effect, so switching books never flashes
  // the previous book's artwork.
  return resolved?.key === key ? resolved.src : null;
}
