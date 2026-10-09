import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getAllPosts, getPost, formatDate } from "@/lib/posts";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // Posts are sorted newest first
  const posts = getAllPosts();
  const i = posts.findIndex((p) => p.slug === slug);
  const newer = posts[i - 1];
  const older = posts[i + 1];

  return (
    <main className="mx-auto max-w-2xl px-4 pt-14 pb-28 sm:px-6 sm:pt-20">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" /> All writing
      </Link>

      <header className="rise mt-10 mb-12 border-b border-line pb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {formatDate(post.date)} · {post.readingMinutes} min read
        </p>
        <h1 className="mt-4 display text-4xl leading-[var(--display-leading)] sm:text-5xl">
          {post.title}
        </h1>
        {post.summary && (
          <p className="mt-5 text-lg leading-relaxed text-muted">
            {post.summary}
          </p>
        )}
        {post.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-pill border border-line px-2.5 py-0.5 font-mono text-[11px] text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <article
        className="prose"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      {post.original && (
        <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
          Originally posted on{" "}
          <a
            href={post.original}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4"
          >
            {/linkedin|lnkd\.in/.test(post.original) ? "LinkedIn" : new URL(post.original).hostname}
          </a>
          .
        </p>
      )}

      {(newer || older) && (
        <nav className="mt-20 grid gap-4 border-t border-line pt-8 sm:grid-cols-2">
          {older ? (
            <Link
              href={`/blog/${older.slug}`}
              className="group rounded-theme border border-line p-5 transition-colors hover:bg-surface"
            >
              <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted">
                <ArrowLeft className="h-3 w-3" /> Older
              </span>
              <span className="mt-2 block display text-xl group-hover:text-accent">
                {older.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {newer && (
            <Link
              href={`/blog/${newer.slug}`}
              className="group rounded-theme border border-line p-5 text-right transition-colors hover:bg-surface"
            >
              <span className="flex items-center justify-end gap-1 font-mono text-[11px] uppercase tracking-wider text-muted">
                Newer <ArrowRight className="h-3 w-3" />
              </span>
              <span className="mt-2 block display text-xl group-hover:text-accent">
                {newer.title}
              </span>
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
