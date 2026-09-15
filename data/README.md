# Library data

Drop your Goodreads export here as **`goodreads_library_export.csv`** (the exact
filename Goodreads gives you).

How to get it: Goodreads → *My Books* → *Import and export* (left sidebar, under
Tools) → *Export Library*. Download the file when it is ready.

What happens next:

- `npm run shelf:build` (run automatically before `dev` and `build`) turns the CSV
  into `src/data/books.json`.
- Pushing an updated CSV to `main` triggers the **Update shelf** workflow, which
  validates the file and commits the regenerated JSON, and the **Deploy** workflow,
  which publishes the site to GitHub Pages.

The `Private Notes` column is never copied into the site output.
