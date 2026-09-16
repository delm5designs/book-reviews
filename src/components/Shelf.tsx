import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Book } from "../types/book";
import { BookSpine } from "./BookSpine";
import { BookDetail, type SpineRect } from "./BookDetail";

/** Below this width the row cannot fill the viewport, so looping would show duplicates. */
const LOOP_THRESHOLD = 2600;
const MAX_ROTATION = 34;
const ARROW_STEP = 320;
const GAP = 2;
/** How much of the rail a short row should try to fill, and how tall books may get. */
const TARGET_FILL = 0.76;
/** Space kept below the books for the board, its shadow and the footer. */
const BOTTOM_ROOM = 156;
const MAX_SCALE = 3;

interface ShelfProps {
  books: Book[];
  /** Id of a freshly shelved book, animated in and scrolled to. */
  justAdded?: string | null;
}

export function Shelf({ books, justAdded = null }: ShelfProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [scale, setScale] = useState(1);
  const [open, setOpen] = useState<{ index: number; rect: SpineRect } | null>(
    null,
  );

  const baseWidth = books.reduce((sum, b) => sum + b.width + GAP, 0);
  const tallest = books.reduce((max, b) => Math.max(max, b.height), 1);
  const rowWidth = baseWidth * scale;
  const looping = rowWidth > LOOP_THRESHOLD;
  const copies = looping ? 3 : 1;

  /**
   * A small library would otherwise sit as a thumbnail-sized clump in the
   * middle of a wide rail, which also flattens the curve: every book ends up
   * near the centre, where rotation is zero, so no front covers ever turn
   * toward the reader. Grow the books until the row fills the rail, bounded by
   * how tall a book may get before it crowds the viewport.
   */
  const measureScale = useCallback(() => {
    const rail = railRef.current;
    if (!rail || baseWidth === 0) return;
    const byWidth = (rail.clientWidth * TARGET_FILL) / baseWidth;
    // Only the room left below the header is available, otherwise tall books
    // run off the bottom of the page.
    const railTop = rail.getBoundingClientRect().top;
    const room = Math.max(220, window.innerHeight - railTop - BOTTOM_ROOM);
    const byHeight = room / tallest;
    setScale(Math.max(1, Math.min(byWidth, byHeight, MAX_SCALE)));
  }, [baseWidth, tallest]);

  /** Curve the rail: spines rotate away from the reader with distance from centre. */
  const curve = useCallback(() => {
    const rail = railRef.current;
    const track = trackRef.current;
    if (!rail || !track) return;
    const railBox = rail.getBoundingClientRect();
    const mid = rail.clientWidth / 2;
    const spines = track.querySelectorAll<HTMLElement>("[data-spine]");
    if (spines.length === 0) return;

    // Measure against whichever is narrower, the rail or the row itself, so a
    // centred short row still bends away at its ends instead of sitting flat.
    const first = spines[0].getBoundingClientRect();
    const last = spines[spines.length - 1].getBoundingClientRect();
    const contentHalf = Math.max(1, (last.right - first.left) / 2);
    const half = Math.min(mid, contentHalf);

    for (const spine of spines) {
      const box = spine.getBoundingClientRect();
      const centre = box.left - railBox.left + box.width / 2;
      const t = Math.max(-1, Math.min(1, (centre - mid) / half));
      // The easing keeps the middle of the rail flat and bends only the edges.
      const ry = -Math.sign(t) * Math.pow(Math.abs(t), 1.35) * MAX_ROTATION;
      spine.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    }
  }, []);

  // React owns the style prop on each spine, so it discards the --ry custom
  // property that curve() sets imperatively. Without this the books would snap
  // flat on every re-render and no front cover would ever turn into view.
  useLayoutEffect(() => {
    curve();
  });

  // Start in the middle copy so the reader can scroll either way immediately.
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    measureScale();
    if (looping) rail.scrollLeft = rail.scrollWidth / 3;
    curve();
  }, [looping, curve, measureScale, books]);

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

    rail.addEventListener("scroll", onScroll, { passive: true });
    rail.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      rail.removeEventListener("scroll", onScroll);
      rail.removeEventListener("wheel", onWheel);
    };
  }, [looping, curve]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const ro = new ResizeObserver(() => {
      setOverflowing(rail.scrollWidth > rail.clientWidth + 4);
      measureScale();
      curve();
    });
    ro.observe(rail);

    const onResize = () => measureScale();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [curve, measureScale, books]);

  /**
   * Drag to pan, with momentum.
   *
   * Letting go used to stop the rail dead, which reads as a jam rather than a
   * shelf. The velocity of the last few pointer samples carries on and decays
   * exponentially, so the rail coasts and settles instead of stopping flat.
   */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    // Recent pointer samples, newest last. A short window keeps the throw
    // faithful to how the drag ended rather than how it began.
    let samples: { x: number; t: number }[] = [];
    let frame = 0;

    const stopGlide = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const glide = (velocity: number) => {
      let v = velocity;
      let last = performance.now();

      const step = (now: number) => {
        const dt = Math.min(48, now - last);
        last = now;
        rail.scrollLeft -= v * dt;
        // Halves roughly every 130ms, so the rail eases to rest.
        v *= Math.exp(-dt / 190);
        frame = Math.abs(v) > 0.008 ? requestAnimationFrame(step) : 0;
      };
      frame = requestAnimationFrame(step);
    };

    const down = (e: PointerEvent) => {
      stopGlide();
      dragging = true;
      startX = e.clientX;
      startScroll = rail.scrollLeft;
      samples = [{ x: e.clientX, t: performance.now() }];
    };

    const move = (e: PointerEvent) => {
      if (!dragging) return;
      rail.scrollLeft = startScroll - (e.clientX - startX);
      const now = performance.now();
      samples.push({ x: e.clientX, t: now });
      while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
    };

    const end = () => {
      if (!dragging) return;
      dragging = false;
      if (reduced || samples.length < 2) return;

      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = last.t - first.t;
      // Pausing before letting go means the reader placed the rail rather than
      // threw it, so there is nothing to carry.
      if (dt <= 0 || performance.now() - last.t > 70) return;

      const v = (last.x - first.x) / dt;
      if (Math.abs(v) > 0.05) glide(v);
    };

    rail.addEventListener("pointerdown", down);
    rail.addEventListener("pointermove", move);
    rail.addEventListener("pointerup", end);
    rail.addEventListener("pointercancel", end);
    rail.addEventListener("pointerleave", end);
    rail.addEventListener("wheel", stopGlide, { passive: true });

    return () => {
      stopGlide();
      rail.removeEventListener("pointerdown", down);
      rail.removeEventListener("pointermove", move);
      rail.removeEventListener("pointerup", end);
      rail.removeEventListener("pointercancel", end);
      rail.removeEventListener("pointerleave", end);
      rail.removeEventListener("wheel", stopGlide);
    };
  }, []);

  // Arrow keys pan the rail, but only while no book is pulled out.
  useEffect(() => {
    if (open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const rail = railRef.current;
      if (!rail) return;
      rail.scrollLeft += e.key === "ArrowRight" ? ARROW_STEP : -ARROW_STEP;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Bring a newly shelved book into view so its arrival is visible.
  useEffect(() => {
    if (!justAdded) return;
    const el = trackRef.current?.querySelector<HTMLElement>(
      `[data-book-id="${CSS.escape(justAdded)}"]`,
    );
    el?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [justAdded]);

  const openAt = (index: number, el: HTMLElement) => {
    const box = el.getBoundingClientRect();
    setOpen({
      index,
      rect: {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      },
    });
  };

  return (
    <div className="relative">
      <div ref={railRef} className="no-scrollbar overflow-x-auto pt-16">
        <div
          ref={trackRef}
          className={`flex items-end gap-[2px] ${overflowing ? "" : "justify-center"}`}
          // Perspective lives here, not on the scroll container: `overflow`
          // forces transform-style to flat, and a flat ancestor collapses every
          // hinged cover to nothing, because a plane turned 90 degrees has no
          // width once it is flattened.
          style={{
            perspective: "1400px",
            perspectiveOrigin: "50% 65%",
            transformStyle: "preserve-3d",
          }}
        >
          {Array.from({ length: copies }, (_, copy) =>
            books.map((book, index) => (
              <div
                key={`${copy}-${book.id}`}
                data-spine
                data-book-id={book.id}
                className={
                  justAdded === book.id ? "animate-shelve-in" : undefined
                }
                // The 3D context has to run unbroken from the rail's perspective
                // down to each hinged cover. A flat wrapper anywhere in between
                // culls the cover, because a plane turned 90 degrees projects to
                // nothing once it is flattened.
                style={
                  {
                    "--spine-w": `${book.width * scale}px`,
                    transformStyle: "preserve-3d",
                  } as React.CSSProperties
                }
              >
                <BookSpine
                  book={book}
                  scale={scale}
                  onOpen={(el) => openAt(index, el)}
                />
              </div>
            )),
          )}
        </div>
      </div>

      {/* The board the books stand on: a hairline where they meet it, then a
          sunken surface catching their shadow. On a short row the board tucks in
          to the width of the books, so it never runs on past the last spine. */}
      <div
        className="pointer-events-none relative mx-auto"
        style={overflowing ? undefined : { width: Math.round(rowWidth) + 160 }}
      >
        <div className="h-px" style={{ background: "var(--rule)" }} />
        <div
          className="h-7 bg-sunken"
          style={{ boxShadow: "inset 0 9px 12px -11px rgb(27 20 32 / 0.65)" }}
        />
        <div className="h-px opacity-60" style={{ background: "var(--rule)" }} />
      </div>

      {overflowing && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-page to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-page to-transparent" />
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
