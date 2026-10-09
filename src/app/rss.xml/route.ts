import { getAllPosts } from "@/lib/posts";
import personal from "@/data/personal.json";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const items = getAllPosts()
    .filter((p) => !p.draft)
    .map(
      (p) => `    <item>
      <title>${escape(p.title)}</title>
      <link>${origin}/blog/${p.slug}</link>
      <guid>${origin}/blog/${p.slug}</guid>
      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escape(p.summary)}</description>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(personal.name)} — Writing</title>
    <link>${origin}/blog</link>
    <description>Notes on systems, networking, and the things I build.</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
