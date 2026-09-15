import { useState } from 'react';
import type { Book } from '../types/book';
import { coverUrl, fallbackHue } from '../lib/covers';

export function BookCover({ book }: { book: Book }) {
  const url = coverUrl(book);
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    const hue = fallbackHue(book);
    return (
      <div
        className="flex aspect-[2/3] w-full flex-col justify-between rounded-md p-3 text-left shadow-inner"
        style={{
          background: `linear-gradient(160deg, hsl(${hue} 35% 30%), hsl(${(hue + 40) % 360} 40% 18%))`,
        }}
        aria-hidden="true"
      >
        <span className="font-serif text-sm leading-snug text-white/95 line-clamp-4">{book.title}</span>
        <span className="text-[11px] uppercase tracking-wide text-white/70 line-clamp-2">{book.author}</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`Cover of ${book.title}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="aspect-[2/3] w-full rounded-md bg-stone-200 object-cover shadow-md dark:bg-stone-800"
    />
  );
}
