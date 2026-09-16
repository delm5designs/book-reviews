# Updating your library

Everything on the site comes from one file: `data/goodreads_library_export.csv`.
You never edit the website. You edit your library **on Goodreads**, download a
fresh export, and replace that one file. The site rebuilds and republishes
itself within a couple of minutes.

You do not need to install anything or type any commands.

---

## The short version

1. Make your changes on Goodreads (write a review, set a rating, add a book).
2. Goodreads → **My Books** → **Import and export** → **Export Library**.
3. Download the file. It will be called `goodreads_library_export.csv`.
4. On GitHub, open `data/goodreads_library_export.csv` and upload the new one
   over it (steps below).
5. Wait for the green tick. Your site is updated.

---

## Writing a review

On Goodreads, open the book and write your review there. Reviews live on
Goodreads; the site just displays them.

- The review appears when you click a book on the shelf, under the star rating.
- **Paragraph breaks are kept.** Press Enter twice between paragraphs and they
  will look the same on your site.
- If you tick Goodreads' **spoiler** box, the site hides the review behind a
  "Contains spoilers · show review" button.
- A book with no review simply shows nothing extra. Nothing breaks.

## Other things worth setting on Goodreads

| What you set | Where it shows up |
|---|---|
| Star rating | Stars in the detail view |
| Review | The text under the stars |
| **Date read** | "Finished Mar 2026" above the title, and the shelf's order |
| Shelves (tags) | The genre filter buttons |
| Marking a book "read" or "currently reading" | Whether it appears at all |

Two of these are worth your attention, because they are empty today:

- **No book has a date read.** Until you set some, the "most recently read"
  ordering is really alphabetical, and no book shows a finished date.
- **No book has shelf tags**, so every book falls back to "Nonfiction" and the
  genre filter only has one button. Tag books on Goodreads with any of
  `fiction`, `nonfiction`, `sci-fi`, `mystery`, `thriller`, `fantasy` or
  `romance` and the buttons appear on their own.

---

## Replacing the file on GitHub

1. Go to `https://github.com/delm5designs/book-reviews`.
2. Click the **data** folder.
3. Click **Add file**, then **Upload files**.
4. Drag in your newly downloaded `goodreads_library_export.csv`. Keep the
   filename exactly as Goodreads gave it, so it replaces the old file rather
   than sitting alongside it.
5. Scroll down and click **Commit changes**.

That is it. Two things then happen on their own:

- **Update shelf** checks the file and rewrites the site's data.
- **Deploy to GitHub Pages** rebuilds and republishes the site.

Watch them under the **Actions** tab. A green tick means your site is live at
<https://delm5designs.github.io/book-reviews/>. Give it a minute, and refresh
the page with Ctrl+Shift+R (Cmd+Shift+R on a Mac) so your browser fetches the
new version rather than its cached copy.

---

## One warning

**Do not open the CSV in Excel, Numbers or Google Sheets and save it.**

Spreadsheets rewrite dates into a local format and can mangle reviews that
contain commas, quotes or line breaks. The site copes with a re-saved export,
but it is a needless risk. Download from Goodreads and upload that file
untouched.

Also note the repository is **public**, so everything in the export is readable
by anyone. Goodreads' **Private Notes** column is never copied onto the website,
but it would still sit in the uploaded file, so keep that field empty.

---

## If something goes wrong

Go to the **Actions** tab and look at the most recent run.

- **A red X on "Update shelf"** means the file could not be read. The usual
  cause is uploading the wrong file, or a file that is not a Goodreads export.
  Re-download from Goodreads and upload again.
- **A red X on "Deploy to GitHub Pages"** means the site could not be
  published. Check *Settings → Pages* still has **Source: GitHub Actions**.
- **The site looks unchanged** is almost always browser cache. Hard-refresh
  with Ctrl+Shift+R, or open the site in a private window.

Click into the failed run and read the red step. If it is not obvious, send me
the error text and I will fix it.
