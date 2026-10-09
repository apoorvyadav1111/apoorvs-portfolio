import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, formatDate } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes on systems, networking, and the things I build.",
};

export default function BlogIndex() {
  const posts = getAllPosts();
  const byYear = new Map<string, typeof posts>();
  for (const post of posts) {
    const year = post.date.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), post]);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-20 pb-28 sm:px-6 sm:pt-28">
      <header className="rise mb-16">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Writing
        </p>
        <h1 className="mt-4 display text-5xl sm:text-6xl">
          Notes from the <span className="em">workbench</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Long-form notes on distributed systems, networking, and the side
          projects I build to understand them.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted">Nothing published yet — check back soon.</p>
      ) : (
        [...byYear].map(([year, yearPosts]) => (
          <section key={year} className="mb-12">
            <h2 className="mb-2 border-b border-line pb-3 font-mono text-xs text-muted">
              {year}
            </h2>
            <ul>
              {yearPosts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group -mx-3 block rounded-theme px-3 py-5 transition-colors hover:bg-surface"
                  >
                    <div className="flex items-baseline justify-between gap-6">
                      <h3 className="display text-2xl transition-colors group-hover:text-accent">
                        {post.title}
                        {post.draft && (
                          <span className="ml-3 align-middle font-sans text-[10px] font-medium uppercase tracking-widest text-accent">
                            Draft
                          </span>
                        )}
                      </h3>
                      <span className="hidden shrink-0 font-mono text-xs text-muted sm:block">
                        {formatDate(post.date, "short")}
                      </span>
                    </div>
                    <p className="mt-1.5 text-muted">{post.summary}</p>
                    <p className="mt-3 font-mono text-[11px] text-muted sm:hidden">
                      {formatDate(post.date, "short")} · {post.readingMinutes}{" "}
                      min read
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
