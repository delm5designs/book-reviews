import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Book } from '../types/book';
import { useCover } from '../lib/useCover';
import { coverWidthFor, faceFont } from './bookFaces';

/** Hover pose, per Section 7. The book pulls toward the reader and lifts. */
const PULL = 96;
const LIFT = -26;
/** Stops the card flickering while the transform moves under the pointer. */
const LEAVE_GRACE_MS = 90;

/** "Association for Talent Development" -> "ATD"; "Warner" -> "WAR". */
function publisherMark(publisher: string): string {
  const words = publisher.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .filter((w) => !/^(of|for|and|the|&)$/i.test(w))
    .map((w) => w[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
}

const finishSheen: Record<Book['finish'], string> = {
  cloth:
    'linear-gradient(90deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 28%, rgba(0,0,0,0.16) 62%, rgba(0,0,0,0.30) 100%)',
  gloss:
    'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.42) 16%, rgba(255,255,255,0.05) 34%, rgba(0,0,0,0.22) 74%, rgba(0,0,0,0.34) 100%)',
  matte:
    'linear-gradient(90deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 30%, rgba(0,0,0,0.13) 68%, rgba(0,0,0,0.24) 100%)',
};

const textures: Record<Book['finish'], string> = {
  cloth:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Cpath d='M0 0h6v1H0zM0 3h6v1H0z' fill='%23fff' opacity='0.05'/%3E%3Cpath d='M0 0v6h1V0zM3 0v6h1V0z' fill='%23000' opacity='0.05'/%3E%3C/svg%3E\")",
  gloss: 'none',
  matte:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='40' height='40' filter='url(%23n)' opacity='0.28'/%3E%3C/svg%3E\")",
};

interface BookSpineProps {
  book: Book;
  /** Display scale, so a small library still fills the shelf. */
  scale: number;
  onOpen: (el: HTMLElement) => void;
}

export function BookSpine({ book, scale, onOpen }: BookSpineProps) {
  const cover = useCover(book);
  const [hovered, setHovered] = useState(false);
  const [card, setCard] = useState<{ left: number; top: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const leaveTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const enter = () => {
    window.clearTimeout(leaveTimer.current);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setCard({ left: rect.left + rect.width / 2, top: rect.top - 14 });
    setHovered(true);
  };

  const leave = () => {
    leaveTimer.current = window.setTimeout(() => {
      setHovered(false);
      setCard(null);
    }, LEAVE_GRACE_MS);
  };

  const w = Math.round(book.width * scale);
  const h = Math.round(book.height * scale);
  const coverW = coverWidthFor(book) * scale;

  const lean = hovered ? 0 : book.lean;
  const translateZ = (hovered ? PULL : 0) + book.depth;
  const translateY = hovered ? LIFT : 0;

  const inner: CSSProperties = {
    width: w,
    height: h,
    transformStyle: 'preserve-3d',
    transform: `rotateY(var(--ry, 0deg)) rotateZ(${lean}deg) translateZ(${translateZ}px) translateY(${translateY}px)`,
    transition: 'transform 620ms cubic-bezier(0.16, 1, 0.3, 1)',
    background: book.spine,
    color: book.ink,
  };

  const showAuthor = book.width >= 44;
  const showPublisher = book.width >= 30;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        // The hit target never transforms, so the book cannot slide out from
        // under the pointer and start a hover/unhover loop.
        style={{ width: w, height: h, zIndex: hovered ? 40 : undefined, transformStyle: 'preserve-3d' }}
        className="relative shrink-0 cursor-pointer appearance-none border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-reflective"
        aria-label={`${book.title} by ${book.author}`}
        onMouseEnter={enter}
        onMouseLeave={leave}
        onFocus={enter}
        onBlur={leave}
        onClick={() => buttonRef.current && onOpen(buttonRef.current)}
      >
        <span className="absolute inset-0 block rounded-[2px] shadow-[0_18px_30px_-20px_rgb(27_20_32_/_0.75)]" style={inner}>
          {/* The cover art wraps around the spine's left edge, as a printed book does. */}
          {cover && (
            <span
              aria-hidden="true"
              className="absolute inset-0 block bg-cover bg-left"
              style={{ backgroundImage: `url(${cover})` }}
            />
          )}
          {/* The base colour settles over the wraparound so the spine reads as one
              object, but lightly enough that the artwork still shows through. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 block"
            style={{ background: book.spine, opacity: cover ? 0.42 : 1 }}
          />

          {/* Head and foot rules in the cover's accent. */}
          <span aria-hidden="true" className="absolute inset-x-0 block h-px" style={{ top: 9 * scale, background: book.band, opacity: 0.85 }} />
          <span aria-hidden="true" className="absolute inset-x-0 block h-px" style={{ top: 13 * scale, background: book.band, opacity: 0.45 }} />
          <span aria-hidden="true" className="absolute inset-x-0 block h-px" style={{ bottom: 22 * scale, background: book.band, opacity: 0.7 }} />

          <span
            aria-hidden="true"
            className={`absolute inset-x-0 flex items-center justify-center ${faceFont[book.face]}`}
            style={{ top: 26 * scale, bottom: 30 * scale }}
          >
            <span
              className={`block max-h-full overflow-hidden text-center leading-none ${book.caps ? 'uppercase tracking-[0.1em]' : ''}`}
              style={{
                writingMode: 'vertical-rl',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                fontSize: Math.min(12, Math.max(7.5, book.width * 0.4)) * scale,
                textShadow: '0 1px 0 rgba(0,0,0,0.35)',
              }}
            >
              {book.title}
            </span>
          </span>

          {showAuthor && (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 flex justify-center font-sans font-medium uppercase tracking-[0.2em] opacity-75"
              style={{ writingMode: 'vertical-rl', bottom: 30 * scale, fontSize: 8 * scale }}
            >
              {book.author}
            </span>
          )}

          {showPublisher && (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 flex justify-center font-sans font-medium uppercase tracking-[0.2em] opacity-55"
              style={{ bottom: 7 * scale, fontSize: 6 * scale }}
            >
              {publisherMark(book.publisher)}
            </span>
          )}

          {/* Texture and sheen sit OVER the lettering, so type looks printed into the material. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 block mix-blend-overlay"
            style={{ backgroundImage: textures[book.finish], opacity: book.finish === 'gloss' ? 0 : 0.5 }}
          />
          <span aria-hidden="true" className="absolute inset-0 block" style={{ background: finishSheen[book.finish] }} />
          <span
            aria-hidden="true"
            className="absolute inset-0 block"
            style={{
              opacity: book.wear,
              background:
                'linear-gradient(180deg, rgba(255,240,214,0.55) 0%, rgba(255,240,214,0) 26%), radial-gradient(120% 60% at 50% 100%, rgba(60,40,24,0.5), transparent 70%)',
            }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 block rounded-[2px]"
            style={{ boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.16), inset -1px 0 0 rgba(0,0,0,0.30)' }}
          />

          {/* The page block, laid back from the top edge so you see the paper receding. */}
          <span
            aria-hidden="true"
            className="absolute left-0 block"
            style={{
              bottom: '100%',
              width: w,
              height: coverW * 0.6,
              transformOrigin: 'bottom center',
              transform: 'rotateX(78deg)',
              background: 'linear-gradient(90deg, #efe6d4 0%, #ddd0b9 40%, #c9bba2 100%)',
              backgroundImage:
                'repeating-linear-gradient(90deg, rgba(120,100,70,0.16) 0 1px, transparent 1px 3px), linear-gradient(90deg, #efe6d4 0%, #ddd0b9 40%, #c9bba2 100%)',
            }}
          >
            {book.binding === 'hardcover' && (
              <span className="absolute inset-x-0 bottom-0 block h-[3px]" style={{ background: book.band ?? book.spine }} />
            )}
          </span>

          {/* The hinged front cover, folded flat until the book is pulled out. */}
          <span
            aria-hidden="true"
            className="absolute top-0 left-full block overflow-hidden"
            style={{
              width: coverW,
              height: h,
              transformOrigin: 'left center',
              transform: 'rotateY(90deg)',
              background: book.spine,
              backgroundImage: cover ? `url(${cover})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </span>
      </button>

      {card && hovered && <HoverCard book={book} cover={cover} left={card.left} top={card.top} />}
    </>
  );
}

/**
 * Portaled to the body so it floats above the filter bar and the shelf's
 * stacking contexts. It also carries the cover art: on a shelf you see spines,
 * so this is where a reader can actually look at the front of a book without
 * opening it.
 */
function HoverCard({
  book,
  cover,
  left,
  top,
}: {
  book: Book;
  cover: string | null;
  left: number;
  top: number;
}) {
  return createPortal(
    <div
      className="pointer-events-none fixed z-[100] w-[268px] -translate-x-1/2 -translate-y-full rounded-[2px] border border-rule bg-card px-5 py-4 backdrop-blur-sm"
      style={{ left, top, boxShadow: 'var(--shadow-card)' }}
      role="status"
    >
      {cover && (
        <img
          src={cover}
          alt=""
          className="mb-4 h-[200px] w-full rounded-[2px] object-cover"
        />
      )}
      <p className="display text-[23px] text-strong">{book.title}</p>
      <p className="mt-1.5 text-[14.5px] text-muted">{book.author}</p>
      <p className="label-muted mt-3">
        {[book.year > 0 ? book.year : null, book.binding, book.rating > 0 ? `${book.rating}/5` : 'unrated']
          .filter(Boolean)
          .join(' · ')}
      </p>
      {book.genres && book.genres.length > 0 && (
        <p className="label mt-1.5">{book.genres.join(' · ')}</p>
      )}
    </div>,
    document.body,
  );
}
