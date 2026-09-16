import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Book } from '../types/book';
import { useCover } from '../lib/useCover';
import { coverWidthFor } from './bookFaces';

export interface SpineRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The pull-out itself, and the pause before the panel follows it. */
const SLIDE_MS = 900;
const RETRACT_MS = 620;
const PANEL_DELAY_MS = 260;

interface BookDetailProps {
  books: Book[];
  index: number;
  rect: SpineRect;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function BookDetail({ books, index, rect, onIndexChange, onClose }: BookDetailProps) {
  const [out, setOut] = useState(false);
  const book = books[index];

  // Start in the shelf pose, then flip on the next frame so the transition runs.
  useEffect(() => {
    const id = requestAnimationFrame(() => setOut(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const retract = useCallback(() => {
    setOut(false);
    window.setTimeout(onClose, RETRACT_MS);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        retract();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onIndexChange((index - 1 + books.length) % books.length);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onIndexChange((index + 1) % books.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, books.length, onIndexChange, retract]);

  const pose = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const narrow = vw < 720;

    const coverH = narrow ? vh * 0.42 : Math.min(vh * 0.6, 520);
    // rect.height is the spine as drawn, which already carries the shelf's
    // display scale. The cover has to be derived from the book's own height,
    // or that scale gets applied twice and the cover comes out too narrow.
    const scale = coverH / rect.height;
    const coverW = coverWidthFor(book) * (coverH / book.height);

    // rotateY(-90deg) swings the hinged cover into view. The hinge is the
    // spine's right edge and the cover folds away from the reader, so after the
    // turn it occupies the space to the RIGHT of the spine's centre. The delta
    // therefore has to account for half the cover's scaled width.
    const spineCentreX = rect.left + rect.width / 2;
    const coverCentreX = spineCentreX + coverW / 2;
    const coverCentreY = rect.top + rect.height / 2;

    const targetX = narrow ? vw / 2 : vw * 0.32;
    const targetY = narrow ? vh * 0.34 : vh / 2;

    return { dx: targetX - coverCentreX, dy: targetY - coverCentreY, scale, coverW, coverH, narrow };
  }, [rect, book]);

  const shelfPose = 'translate3d(0,0,0) scale(1) rotateY(-26deg)';
  const outPose = `translate3d(${pose.dx}px, ${pose.dy}px, 0) scale(${pose.scale}) rotateY(-90deg)`;

  const shell: CSSProperties = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    transformStyle: 'preserve-3d',
    transform: out ? outPose : shelfPose,
    transition: `transform ${SLIDE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
  };

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label={`${book.title} by ${book.author}`}>
      <button
        type="button"
        aria-label="Close"
        onClick={retract}
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-page/75 backdrop-blur-xl transition-opacity duration-700"
        style={{ opacity: out ? 1 : 0 }}
      />

      <div className="pointer-events-none absolute inset-0" style={{ perspective: '1600px' }}>
        <div className="absolute" style={shell}>
          {/* The spine face, edge-on once the book has turned. */}
          <div className="absolute inset-0" style={{ background: book.spine }} />
          {/* The front cover, hinged at the spine's right edge. */}
          <div
            className="absolute top-0 left-full overflow-hidden"
            style={{
              width: coverWidthFor(book) * (rect.height / book.height),
              height: rect.height,
              transformOrigin: 'left center',
              transform: 'rotateY(90deg)',
              background: book.spine,
              color: book.ink,
              // Raised elevation is reserved for dialogs, which this is.
              boxShadow: 'var(--shadow-raised)',
            }}
          >
            <CoverArt book={book} />
          </div>
        </div>
      </div>

      <DetailPanel book={book} pose={pose} out={out} onClose={retract} onPrev={() => onIndexChange((index - 1 + books.length) % books.length)} onNext={() => onIndexChange((index + 1) % books.length)} />
    </div>
  );
}

/** Open Library 404s for plenty of ISBNs, so a book may set its own cover. */
function CoverArt({ book }: { book: Book }) {
  const cover = useCover(book);
  if (!cover) return <TypesetCover book={book} />;
  return <img src={cover} alt="" className="h-full w-full object-cover" />;
}

/** Shown when Open Library has no artwork: the book sets its own cover. */
function TypesetCover({ book }: { book: Book }) {
  return (
    <div className="flex h-full w-full flex-col justify-between p-[6%] text-center" style={{ background: book.spine }}>
      <span className="font-sans text-[6px] font-medium uppercase tracking-[0.2em] opacity-60">{book.publisher}</span>
      <span className="display text-[9px]">{book.title}</span>
      <span className="font-sans text-[5px] font-medium uppercase tracking-[0.2em] opacity-70">{book.author}</span>
    </div>
  );
}

interface DetailPanelProps {
  book: Book;
  pose: { coverW: number; coverH: number; narrow: boolean };
  out: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function DetailPanel({ book, pose, out, onClose, onPrev, onNext }: DetailPanelProps) {
  const style: CSSProperties = pose.narrow
    ? { left: '50%', top: `calc(34% + ${pose.coverH / 2}px + 28px)`, transform: 'translateX(-50%)', width: 'min(88vw, 420px)' }
    : { left: '52%', top: '50%', transform: 'translateY(-50%)', width: 'min(38vw, 440px)' };

  return (
    <div
      className="pointer-events-auto absolute"
      style={{
        ...style,
        opacity: out ? 1 : 0,
        transitionProperty: 'opacity, transform',
        transitionDuration: '700ms',
        transitionDelay: `${PANEL_DELAY_MS}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <p className="label">
        {book.finished ? `Finished ${book.finished}` : 'In the library'}
      </p>
      <h2 className="display mt-3 text-[clamp(28px,3.6vw,56px)] text-strong">{book.title}</h2>
      <p className="mt-3 text-muted">{book.author}</p>

      <p className="label-muted mt-5">
        {[book.year > 0 ? book.year : null, book.publisher || null, book.binding].filter(Boolean).join(' · ')}
      </p>

      <Rating value={book.rating} />

      {book.review ? (
        <Review text={book.review} spoiler={book.spoiler === true} />
      ) : (
        book.blurb && <p className="measure-body mt-5 text-body">{book.blurb}</p>
      )}

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="label-muted rounded-[2px] border border-rule px-4 py-2.5 transition-colors hover:border-reflective hover:text-reflective"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          className="label-muted rounded-[2px] border border-rule px-4 py-2.5 transition-colors hover:border-reflective hover:text-reflective"
        >
          Next →
        </button>
        <button
          type="button"
          onClick={onClose}
          className="label-muted px-3 py-2.5 transition-colors hover:text-strong"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/** My review, with paragraph breaks kept and spoilers held back until asked for. */
function Review({ text, spoiler }: { text: string; spoiler: boolean }) {
  const [revealed, setRevealed] = useState(!spoiler);

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="label-muted mt-5 rounded-[2px] border border-rule px-4 py-2.5 transition-colors hover:border-reflective hover:text-reflective"
      >
        Contains spoilers · show review
      </button>
    );
  }

  return (
    <div className="measure-body mt-5 overflow-y-auto pr-1 whitespace-pre-line text-body" style={{ maxHeight: '28vh' }}>
      {text}
    </div>
  );
}

function Rating({ value }: { value: number }) {
  if (value <= 0) {
    return <p className="label-muted mt-5">Unrated</p>;
  }
  return (
    <p className="mt-5 flex items-center gap-1 text-accent" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={`h-4 w-4 ${i < value ? 'fill-current' : 'fill-cream-500'}`} aria-hidden="true">
          <path d="M10 1.6l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.6l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
        </svg>
      ))}
    </p>
  );
}
