interface RatingStarsProps {
  rating: number | null;
  /** Shown as a tooltip / for screen readers. */
  label?: string;
}

export function RatingStars({ rating, label }: RatingStarsProps) {
  if (rating === null) {
    return <span className="text-xs text-stone-400 dark:text-stone-500">Not rated</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 text-amber-500"
      role="img"
      aria-label={label ?? `${rating} out of 5 stars`}
      title={label ?? `${rating} / 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${i < rating ? 'fill-current' : 'fill-stone-300 dark:fill-stone-700'}`}
          aria-hidden="true"
        >
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L10 14.9l-5.3 2.8 1.1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}
