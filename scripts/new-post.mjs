// Creates a draft blog post.
//
//   npm run post -- "Why I rebuilt Redis in Python"
//
// Writes src/content/blog/<slug>.md with today's date and `draft: true`.
// Drafts show at localhost while you write; delete the draft line to publish.
import fs from "node:fs";
import path from "node:path";

const title = process.argv.slice(2).join(" ").trim();
if (!title) {
  console.error('Usage: npm run post -- "Post title"');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const file = path.join("src/content/blog", `${slug}.md`);

if (fs.existsSync(file)) {
  console.error(`${file} already exists`);
  process.exit(1);
}

const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
fs.writeFileSync(
  file,
  `---
title: ${title}
date: ${today}
summary: One or two sentences shown in post lists and link previews.
tags: []
draft: true
---

Start writing here.
`,
);
console.log(`Created ${file}\nPreview at http://localhost:3000/blog/${slug}`);
