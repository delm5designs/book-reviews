/**
 * The Book model from the Virtual Library build guide, Section 3.
 *
 * The physical fields are what make each spine look like an individual
 * object rather than a flat rectangle. They are derived, never hand-written:
 * scripts/build-shelf.ts computes them from the Goodreads export.
 */
export type Book = {
  id: string;
  title: string;
  author: string;
  genres?: string[];
  /** Real cover art. Empty string when the export carried no usable ISBN. */
  cover: string;
  /**
   * A second candidate, from the other ISBN in the export. Open Library
   * indexes covers per edition, so the ISBN-13 can 404 where the ISBN-10
   * resolves, and vice versa.
   */
  coverAlt?: string;
  year: number;
  blurb: string;
  /** 0 means unrated. */
  rating: number;
  /** e.g. "Jul 2026". Empty when the export has no read date. */
  finished: string;
  publisher: string;
  binding: 'hardcover' | 'paperback' | 'mass';
  /** Spine surface material. */
  finish: 'cloth' | 'gloss' | 'matte';
  /** Base spine color. Upgraded in the browser by sampling the cover's left edge. */
  spine: string;
  /** Accent pulled from the cover art. */
  band?: string;
  /** Lettering color. */
  ink: string;
  face: 'serif' | 'sans' | 'mono';
  caps?: boolean;
  /** Spine width in px. */
  width: number;
  /** Spine height in px. */
  height: number;
  /** Degrees of lean on the shelf. */
  lean: number;
  /** How far forward/back the book sits, px. */
  depth: number;
  /** 0-1 edge wear and ink fade. */
  wear: number;
};
