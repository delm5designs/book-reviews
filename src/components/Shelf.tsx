import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Book } from '../types/book';
import { BookSpine } from './BookSpine';
import { BookDetail, type SpineRect } from './BookDetail';

/** Below this width the row cannot fill the viewport, so looping would show duplicates. */
const LOOP_THRESHOLD = 2600;
const MAX_ROTATION = 34;
const ARROW_STEP = 320;
const GAP = 2;

interface ShelfProps {
  books: Book[];
  /** Id of a freshly shelved book, animated in and scrolled to. */
  justAdded?: string | null;
}

export function Shelf({ books, justAdded = null }: ShelfProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [open, setOpen] = useState<{ index: number; rect: SpineRect } | null>(null);

  const rowWidth = books.reduce((sum, b) => sum + b.width + GAP, 0);
  const looping = rowWidth > LOOP_THRESHOLD;
  const copies = looping ? 3 : 1;

  /** Curve the rail: spines rotate away from the reader with distance from centre. */
  const curve = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const mid = rail.clientWidth / 2;
    const spines = rail.querySelectorAll<HTMLElement>('[data-spine]');
    for (const spine of spines) {
      const box = spine.getBoundingClientRect();
      const railBox = rail.getBoundingClientRect();
      const centre = box.left - railBox.left + box.width / 2;
      const t = Math.max(-1, Math.min(1, (centre - mid) / mid));
      // The easing keeps the middle of the rail flat and bends only the edges.
      const ry = -Math.sign(t) * Math.pow(Math.abs(t), 1.35) * MAX_ROTATION;
      spine.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    }
  }, []);

  // Start in the middle copy so the reader can scroll either way immediately.
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (looping) rail.scrollLeft = rail.scrollWidth / 3;
    curve();
  }, [looping, curve, books]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const onScroll = () => {
      if (looping) {
        const segment = rail.scrollWidth / 3;
        if (rail.scrollLeft < segment * 0.5) rail.scrollLeft += segment;
        else if (rail.scrollLeft > segment * 1.5) rail.scrollLeft -= segment;
      }
      curve();
    };

    // Vertical wheel gestures drive the rail sideways; passive:false to preventDefault.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      rail.scrollLeft += e.deltaY;
    };

    rail.addEventListener('scroll', onScroll, { passive: true });
    rail.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      rail.removeEventListener('scroll', onScroll);
      rail.removeEventListener('wheel', onWheel);
    };
  }, [looping, curve]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const ro = new ResizeObserver(() => {
      setOverflowing(rail.scrollWidth > rail.clientWidth + 4);
      curve();
    });
    ro.observe(rail);
    return () => ro.disconnect();
  }, [curve, books]);

  // Drag to pan.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let dragging = false;
    let startX = 0;
    let startScroll = 0;

    const down = (e: PointerEvent) => {
      dragging = true;
      startX = e.clientX;
      startScroll = rail.scrollLeft;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      rail.scrollLeft = startScroll - (e.clientX - startX);
    };
    const end = () => {
      dragging = false;
    };

    rail.addEventListener('pointerdown', down);
    rail.addEventListener('pointermove', move);
    rail.addEventListener('pointerup', end);
    rail.addEventListener('pointerleave', end);
    return () => {
      rail.removeEventListener('pointerdown', down);
      rail.removeEventListener('pointermove', move);
      rail.removeEventListener('pointerup', end);
      rail.removeEventListener('pointerleave', end);
    };
  }, []);

  // Arrow keys pan the rail, but only while no book is pulled out.
  useEffect(() => {
    if (open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const rail = railRef.current;
      if (!rail) return;
      rail.scrollLeft += e.key === 'ArrowRight' ? ARROW_STEP : -ARROW_STEP;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Bring a newly shelved book into view so its arrival is visible.
  useEffect(() => {
    if (!justAdded) return;
    const el = railRef.current?.querySelector<HTMLElement>(`[data-book-id="${CSS.escape(justAdded)}"]`);
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [justAdded]);

  const openAt = (index: number, el: HTMLElement) => {
    const box = el.getBoundingClientRect();
    setOpen({ index, rect: { left: box.left, top: box.top, width: box.width, height: box.height } });
  };

  return (
    <div className="relative">
      <div
        ref={railRef}
        className={`no-scrollbar flex items-end gap-[2px] overflow-x-auto overflow-y-visible pt-16 pb-6 ${
          overflowing ? '' : 'justify-center'
        }`}
        style={{ perspective: '1400px', perspectiveOrigin: '50% 65%' }}
      >
        {Array.from({ length: copies }, (_, copy) =>
          books.map((book, index) => (
            <div
              key={`${copy}-${book.id}`}
              data-spine
              data-book-id={book.id}
              className={justAdded === book.id ? 'animate-shelve-in' : undefined}
              style={{ '--spine-w': `${book.width}px` } as React.CSSProperties}
            >
              <BookSpine book={book} onOpen={(el) => openAt(index, el)} />
            </div>
          )),
        )}
      </div>

      {/* The shelf itself: a line of light where the books meet the wood, and the
          shadow they cast. On a short row it tucks in to the width of the books,
          so the boards never run on past the last spine. */}
      <div
        className="pointer-events-none absolute bottom-4 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent"
        style={overflowing ? { left: 0, right: 0 } : { left: '50%', width: rowWidth + 160, transform: 'translateX(-50%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 h-4 bg-gradient-to-b from-foreground/8 to-transparent"
        style={overflowing ? { left: 0, right: 0 } : { left: '50%', width: rowWidth + 120, transform: 'translateX(-50%)' }}
      />

      {overflowing && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
        </>
      )}

      {open && (
        <BookDetail
          books={books}
          index={open.index}
          rect={open.rect}
          onIndexChange={(index) => setOpen((o) => (o ? { ...o, index } : o))}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
