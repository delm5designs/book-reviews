import type { Book } from '../types/book';

export type CoverPalette = Pick<Book, 'spine' | 'band' | 'ink'>;

/**
 * Samples a cover's left edge into a spine color, per Section 7.
 *
 * The build step cannot do this: it has no browser and no network. So each
 * book ships with a deterministic fallback palette and the real artwork
 * upgrades it here, once the image has loaded.
 *
 * Resolves to null when the image is missing, blocked, or tainted by CORS.
 */
export function readCoverPalette(src: string): Promise<CoverPalette | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const w = 80;
        const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(samplePalette(ctx.getImageData(0, 0, w, h), w, h));
      } catch {
        // A tainted canvas throws on getImageData. The fallback palette stands.
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function samplePalette(data: ImageData, w: number, h: number): CoverPalette {
  const px = data.data;
  const edgeW = Math.max(1, Math.round(w * 0.06));

  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < edgeW; x += 1) {
      const i = (y * w + x) * 4;
      r += px[i];
      g += px[i + 1];
      b += px[i + 2];
      n += 1;
    }
  }
  const spine = { r: r / n, g: g / n, b: b / n };

  // The accent is the most saturated pixel of middling luminance, so it reads
  // as ink on the artwork rather than as a highlight or a shadow.
  let best = spine;
  let bestScore = -1;
  for (let i = 0; i < px.length; i += 4) {
    const pr = px[i];
    const pg = px[i + 1];
    const pb = px[i + 2];
    const max = Math.max(pr, pg, pb);
    const min = Math.min(pr, pg, pb);
    const lum = luminance(pr, pg, pb);
    if (lum < 0.25 || lum > 0.75) continue;
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat > bestScore) {
      bestScore = sat;
      best = { r: pr, g: pg, b: pb };
    }
  }

  const spineLum = luminance(spine.r, spine.g, spine.b);
  return {
    spine: toHex(spine),
    band: toHex(best),
    ink: spineLum > 0.55 ? '#241f19' : '#faf7f0',
  };
}

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const c = (x: number) =>
    Math.round(Math.min(255, Math.max(0, x)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
