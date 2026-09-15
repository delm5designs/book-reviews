# Book Reviews

A personal bookshelf and review site, generated from a Goodreads library export
and published to GitHub Pages. No backend, no database, no AI: a static
React + TypeScript + Tailwind site built with Vite.

## How it works

```
data/goodreads_library_export.csv ──▶ scripts/build-shelf.ts ──▶ src/data/books.json ──▶ React UI ──▶ dist/ ──▶ GitHub Pages
```

- **`data/goodreads_library_export.csv`** is the single source of truth. Export it
  from Goodreads (*My Books → Import and export → Export Library*) and commit it.
- **`scripts/build-shelf.ts`** normalises the CSV into `src/data/books.json`
  (strips Goodreads' `="…"` ISBN wrappers, converts dates to ISO, cleans review
  markup, drops duplicate rows, and never copies *Private Notes*). It runs
  automatically before `npm run dev` and `npm run build`. It accepts both the raw
  Goodreads download and an export that has been re-saved by a spreadsheet, where
  dates come back in a locale format and columns may be missing.
- **The UI** (`src/`) renders the shelf with filters for Goodreads' exclusive
  shelves (read / currently reading / want to read), custom shelf tags, plain
  text search, and sorting. Covers come from Open Library by ISBN, with a
  generated fallback tile when none exists.
- When `books.json` is empty the site shows an empty-shelf page with setup
  instructions. It never shows sample books.

## Local development

```sh
npm install
npm run dev        # regenerates books.json, then starts Vite
npm run build      # type-checks, regenerates books.json, builds to dist/
npm run lint
npm run shelf:build  # regenerate books.json on its own; warns if the CSV is missing, fails if it is malformed
```

Requires Node 22.12 or newer (see `.nvmrc`).

## GitHub Actions

| Workflow | File | Trigger | What it does |
|---|---|---|---|
| Update shelf | `.github/workflows/update-shelf.yml` | every push and PR; manual | Validates the export, posts a per-shelf summary, type-checks, lints and builds (so it doubles as CI), and on `main` commits the regenerated `books.json` |
| Deploy to GitHub Pages | `.github/workflows/deploy.yml` | push to `main`; manual | Builds with the correct Pages base path and deploys with `actions/deploy-pages` |

**One-time setup:** in the repository go to *Settings → Pages* and set
*Source* to **GitHub Actions**. The site then lives at
`https://<owner>.github.io/<repo>/`.

## Updating the shelf

1. Export your library from Goodreads again.
2. Replace `data/goodreads_library_export.csv` (same filename) and push to `main`.
3. Both workflows run; the site is redeployed within a couple of minutes.

## Out of scope by design

- No AI search endpoint.
- No database or server component.
- No invented or placeholder books.
