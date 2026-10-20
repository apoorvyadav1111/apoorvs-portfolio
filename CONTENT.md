# Updating the site

All content lives in this repo. Edit, commit, push — Vercel redeploys in a minute or two.
Run `npm run dev` to preview at http://localhost:3000 first.

## Photos

1. Drop photos into `photos-inbox/` (JPEG, PNG, WebP, or iPhone HEIC).
2. Run `npm run photos`.
   Each photo is resized to 2560px, compressed, and stripped of all metadata,
   including GPS location. Camera details are saved to `src/data/photos.json` first.
3. In `src/data/photos.json`, set each new photo's `title` and `location`
   (optionally a `caption`). Reorder entries to change the gallery order.
   To show it on the globe, add approximate coordinates, e.g.
   `"coords": [37.75, -119.6]` (latitude, longitude; park- or city-level is
   plenty). Photos without `coords` simply stay off the globe.
4. Commit `public/photos/` and `src/data/photos.json`.

Originals are moved to `photos-inbox/added/`, which is never committed.

The globe's continent dots come from `node scripts/build-globe.mjs`; it only
needs re-running to change their density.

## Blog posts

1. `npm run post -- "Your post title"` creates `src/content/blog/your-post-title.md` as a draft.
2. Write in Markdown. Drafts are visible locally but hidden on the live site.
3. Delete the `draft: true` line to publish, then commit.

## Reading list

Add an entry to the top of `src/data/reading.json`:

```json
{
  "title": "Article title",
  "url": "https://…",
  "author": "Author name",
  "date": "2026-10-08",
  "summary": "What it's about, in a sentence or two.",
  "takeaway": "Optional: why it stuck with you.",
  "tags": ["distributed-systems"]
}
```

Add `"draft": true` to hide an entry from the live site.

## Everything else

- Name, headline, bio, links: `src/data/personal.json`
- Work history: `src/data/work.json`
- Projects: `src/data/projects.json`
- Look and feel: `src/themes/` (change `DEFAULT_THEME` in `src/themes/index.ts`)
- Font choices in the Appearance menu: `FONT_CHOICES` in `src/themes/index.ts` (new faces go in `src/themes/fonts.ts`)

## The console

Press <kbd>`</kbd> (or type `sudo`) anywhere on the site, or long-press the name
in the header on a phone, for a small shell: `help` lists what it can do.

- What it reads (`ls`, `cat`, `neofetch`…) comes from `/console.json`, built
  from the same content as the pages by `src/app/console.json/route.ts`.
  Nothing to update by hand: new posts, reading entries, projects and photos
  show up on the next build.
- Commands live in `src/components/console/commands.ts`. To add one, add an
  entry to `COMMANDS` with a `group`, `usage`, `about` and `run`; it appears in
  `help` and Tab completes it.
- Features visitors can switch off (`disable eggs`) are in `src/lib/features.ts`.
- `sudo su` is a playful unlock, not security: it lets a visitor wear any theme
  in any season for the rest of the tab. Nothing secret sits behind it.

## Doodles

Little full-screen things made for fun, listed on `/doodles` (`src/app/doodles/page.tsx`).

- Each doodle is its own page under `src/app/doodles/<name>/` and its own folder
  under `src/components/doodles/<name>/`, so its code only loads where it's played.
  Wrap it in `<Doodle title="…">` (`src/components/doodles/Doodle.tsx`) for the
  full-screen shell: the site steps aside, and Esc or "← doodles" goes back.
  Then add a card to `DOODLES` in `src/app/doodles/page.tsx`, and the page to
  `src/app/sitemap.ts`.
- Zen (`zen/`) draws a landscape under the seasonal sky and adds to it through
  plug-ins (`src/lib/sky.ts`; `wind.ts` is one).
- Fetch (`fetch/`): add a toy with one entry in `toys.ts` (its flight and look);
  the garden is `lawn.ts`, the camera `view.ts`, and how hard a flick throws is
  `POWER` in `FetchGame.tsx`.
