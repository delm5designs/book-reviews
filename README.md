# Book Reviews

A personal virtual library: a horizontal shelf of real books rendered in 3D,
each with its own spine, cover art and physical character. Built from a
Goodreads export and published to GitHub Pages. No backend and no database.

Implements the Virtual Library build guide. Two parts of that guide are
deliberately excluded from this build: the AI natural-language search endpoint
(Section 5) and the visitor recommendations database (Section 6). Search uses
the guide's documented no-AI fallback, which is plain client-side matching.

## How it works

```
data/goodreads_library_export.csv ──▶ scripts/build-shelf.ts ──▶ src/data/books.ts ──▶ 3D shelf ──▶ dist/ ──▶ GitHub Pages
```

- **`data/goodreads_library_export.csv`** is the single source of truth. Export it
  from Goodreads (*My Books → Import and export → Export Library*) and commit it.
- **`scripts/build-shelf.ts`** turns the CSV into `src/data/books.ts`. It keeps
  only the `read` and `currently-reading` shelves, addresses cover art by ISBN,
  and derives each book's physical properties (binding, finish, height, width,
  lean, depth, wear, lettering) from its page count plus a stable hash, so the
  shelf looks lived-in and renders identically on every build. It never copies
  *Private Notes*, and it never invents a book or a blurb.
- **Spine colours** ship as a deterministic warm fallback and are upgraded in the
  browser by sampling each cover's left edge (`src/lib/palette.ts`). The build
  step cannot do this: it has no browser and no network.
- **The shelf** (`src/components/Shelf.tsx`) curves the rail with perspective,
  loops seamlessly once the row is wide enough, and pans by wheel, drag or arrow
  keys. Hovering pulls a book forward with a floating metadata card; clicking
  slides it out of the shelf into a front-cover detail view.
- When the library is empty the site shows setup instructions. It never shows
  sample books.

## Local development

```sh
npm install
npm run dev        # regenerates books.ts, then starts Vite
npm run build      # type-checks, regenerates books.ts, builds to dist/
npm run lint
npm run shelf:build  # regenerate books.ts on its own; warns if the CSV is missing, fails if it is malformed
```

Requires Node 22.12 or newer (see `.nvmrc`).

## GitHub Actions

| Workflow | File | Trigger | What it does |
|---|---|---|---|
| Update shelf | `.github/workflows/update-shelf.yml` | every push and PR; manual | Validates the export, posts a per-shelf summary, type-checks, lints and builds (so it doubles as CI), and on `main` commits the regenerated `books.ts` |
| Deploy to GitHub Pages | `.github/workflows/deploy.yml` | push to `main`; manual | Builds with the correct Pages base path and deploys with `actions/deploy-pages` |

**One-time setup:** in the repository go to *Settings → Pages* and set
*Source* to **GitHub Actions**, not *Deploy from a branch*. The deploy
workflow reads that setting and cannot create it: the automatic workflow token
is not permitted to enable Pages, so the build fails with "Resource not
accessible by integration" until Source is set by hand. The site then lives at
`https://<owner>.github.io/<repo>/`.

*Deploy from a branch* publishes the repository's raw files instead of the
built site, which yields a blank page, because `index.html` points at
TypeScript sources that only exist compiled inside `dist/`.

## Updating the shelf

1. Export your library from Goodreads again.
2. Replace `data/goodreads_library_export.csv` (same filename) and push to `main`.
3. Both workflows run; the site is redeployed within a couple of minutes.

## Out of scope by design

- No AI search endpoint (build guide Section 5). Search is the guide's
  client-side fallback.
- No database or server component (build guide Section 6), so there is no
  visitor "Recommend a book" shelf.
- No invented or placeholder books, and no invented blurbs. The Goodreads export
  carries no descriptions and the build has no network, so `blurb` is empty and
  the detail view typesets the title and author instead.
