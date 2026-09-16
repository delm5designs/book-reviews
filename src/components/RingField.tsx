/**
 * The Morana ring motif: four orbits turning in alternating directions, with a
 * ring expanding through them on its own cycle.
 *
 * Purely decorative, and always cropped by its frame. Timings, sizes and the
 * pulse are specified by the guidelines; see the `.ring-field` rules in
 * index.css.
 */
export function RingField({ scale = 3.4, opacity = 0.5 }: { scale?: number; opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      className="ring-field pointer-events-none absolute inset-0"
      style={{ '--ring-scale': scale, opacity } as React.CSSProperties}
    >
      <span className="ring-pulse" />
      <div className="ring ring-4">
        <span className="ring-node" />
      </div>
      <div className="ring ring-3">
        <span className="ring-node" />
      </div>
      <div className="ring ring-2">
        <span className="ring-node" />
      </div>
      <div className="ring ring-1">
        <span className="ring-node" />
      </div>
    </div>
  );
}
