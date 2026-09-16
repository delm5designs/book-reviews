import { useEffect, useState } from 'react';

const FULL = 'Welcome to my library';
const CHAR_MS = 95;

/** Types the heading one character at a time, with a caret that pulses once done. */
export function TypedTitle() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= FULL.length) return;
    const t = window.setTimeout(() => setCount((c) => c + 1), CHAR_MS);
    return () => window.clearTimeout(t);
  }, [count]);

  const done = count >= FULL.length;

  return (
    <h1
      aria-label={FULL}
      className="font-display text-[clamp(2.4rem,6vw,4.5rem)] font-light italic leading-[1.05] tracking-tight"
    >
      <span aria-hidden="true">{FULL.slice(0, count)}</span>
      <span
        aria-hidden="true"
        className={`ml-1 inline-block h-[0.78em] w-[2px] translate-y-[0.06em] bg-primary/70 ${done ? 'animate-caret' : ''}`}
      />
    </h1>
  );
}
