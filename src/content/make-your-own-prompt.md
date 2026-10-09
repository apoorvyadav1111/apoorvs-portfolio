Build me a personal website that I can deploy for free on Vercel.

Before writing any code, ask me a few questions, one at a time: my name and what I do, which sections I want, a few sites or styles I like, and where my content lives today (LinkedIn posts, photos, a résumé).

Stack: Next.js (App Router), TypeScript and Tailwind CSS. Keep all content in the repo as Markdown and JSON, so updating the site is just a commit, and write a short CONTENT.md explaining how to add each kind of content.

Sections (adapt these to my answers):
- Home: a short headline in my own words, a bio, my experience and selected projects.
- Writing: Markdown posts with dates, tags and reading time. When I paste a LinkedIn post, add it word for word with a link back to the original.
- Reading: articles I recommend, each with a 2–3 sentence summary that you check against the article itself.
- Photos: a gallery with a full-screen viewer (swipe, pinch to zoom, keyboard). Add a script that resizes my photos and strips all metadata, especially GPS location, before they're committed.
- Optional: a dotted globe showing roughly where my photos were taken.

Design:
- Give it a distinctive look that feels chosen by a person, not a template. Show me two or three directions before committing to one.
- Make themes pluggable (colors, fonts and corner style in one file each), with light and dark mode and an appearance menu visitors can use.
- Mobile-first, accessible (keyboard, screen readers, reduced motion) and fast: lazy-load images and anything heavy.

Polish: link-preview images for sharing, a sitemap, and a credits note for the fonts and libraries used.

Work in small steps. After each one, run the site, check it in a browser at phone and desktop widths, and tell me what changed. Commit each feature separately so I can undo any of them, and don't publish anything until I say so.
