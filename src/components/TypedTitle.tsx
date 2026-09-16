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
  // One italic word per line is the brand's limit, so only the last word leans.
  const split = FULL.lastIndexOf(' ');
  const typed = FULL.slice(0, count);
  const roman = typed.slice(0, Math.min(count, split));
  const italic = count > split ? typed.slice(split) : '';

  return (
    <h1 aria-label={FULL} className="display text-[clamp(40px,7vw,80px)]">
      <span aria-hidden="true">{roman}</span>
      <span aria-hidden="true" className="italic">
        {italic}
      </span>
      <span
        aria-hidden="true"
        className={`ml-1 inline-block h-[0.72em] w-[2px] translate-y-[0.04em] bg-reflective/70 ${done ? 'animate-caret' : ''}`}
      />
    </h1>
  );
}
