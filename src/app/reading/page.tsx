import type { Metadata } from "next";
import ReadingList from "@/components/ReadingList";
import { getReadingList } from "@/lib/reading";

export const metadata: Metadata = {
  title: "Reading",
  description: "Articles and essays worth your time, with short summaries.",
};

export default function ReadingPage() {
  const items = getReadingList();

  return (
    <main className="mx-auto max-w-3xl px-4 pt-20 pb-28 sm:px-6 sm:pt-28">
      <header className="rise mb-14">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Reading
        </p>
        <h1 className="mt-4 display text-5xl leading-[var(--display-leading)] sm:text-6xl">
          Worth <span className="em">your time</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Articles and essays I&apos;ve read and keep coming back to, each with
          a short summary so you can decide if it&apos;s worth the click.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="text-muted">Nothing here yet — check back soon.</p>
      ) : (
        <ReadingList items={items} />
      )}
    </main>
  );
}
