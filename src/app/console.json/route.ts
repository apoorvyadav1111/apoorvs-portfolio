import personal from "@/data/personal.json";
import work from "@/data/work.json";
import projects from "@/data/projects.json";
import education from "@/data/education.json";
import { getAllPosts, getPostMarkdown } from "@/lib/posts";
import { getReadingList } from "@/lib/reading";
import { getPhotos } from "@/lib/photos";

// Everything the console (src/components/console) can read, built once into a
// static file at /console.json and fetched the first time the console opens,
// so none of it weighs on ordinary page loads. Drafts are left out in
// production, as everywhere else.
export const dynamic = "force-static";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Unique, file-name-friendly names for entries that don't have a slug of their own
function named<T>(items: T[], name: (item: T) => string) {
  const used = new Set<string>();
  return items.map((item) => {
    let slug = slugify(name(item)).slice(0, 48).replace(/-$/, "") || "untitled";
    for (let n = 2; used.has(slug); n++) slug = `${slug.replace(/-\d+$/, "")}-${n}`;
    used.add(slug);
    return { slug, ...item };
  });
}

export function GET() {
  return Response.json({
    personal,
    posts: getAllPosts().map((p) => ({
      slug: p.slug,
      title: p.title,
      date: p.date,
      summary: p.summary,
      tags: p.tags,
      minutes: p.readingMinutes,
      original: p.original,
      markdown: getPostMarkdown(p.slug),
    })),
    reading: named(getReadingList(), (r) => r.title),
    projects: named(projects, (p) => p.name),
    work: named(work, (w) => w.company),
    education,
    photos: getPhotos().map((p) => ({
      file: p.src.split("/").pop()!,
      title: p.title,
      location: p.location,
      caption: p.caption,
      taken: p.taken,
      camera: p.camera,
      settings: p.settings,
    })),
  });
}
