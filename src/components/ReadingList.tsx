"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { ReadingItem } from "@/lib/reading";

const monthLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

export default function ReadingList({ items }: { items: ReadingItem[] }) {
  const [tag, setTag] = useState<string | null>(null);
  const tags = [...new Set(items.flatMap((i) => i.tags ?? []))].sort();
  const visible = tag ? items.filter((i) => i.tags?.includes(tag)) : items;

  const byMonth = new Map<string, ReadingItem[]>();
  for (const item of visible) {
    const key = monthLabel(item.date);
    byMonth.set(key, [...(byMonth.get(key) ?? []), item]);
  }

  return (
    <>
      {tags.length > 1 && (
        <div className="mb-12 flex flex-wrap gap-2">
          {[null, ...tags].map((t) => (
            <button
              key={t ?? "all"}
              onClick={() => setTag(t)}
              className={`rounded-pill border px-3 py-1 font-mono text-xs transition-colors ${
                tag === t
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-line text-muted hover:border-fg hover:text-fg"
              }`}
            >
              {t ? `#${t}` : `All (${items.length})`}
            </button>
          ))}
        </div>
      )}

      {[...byMonth].map(([month, monthItems]) => (
        <section key={month} className="mb-14">
          <h2 className="mb-2 border-b border-line pb-3 font-mono text-xs uppercase tracking-wider text-muted">
            {month}
          </h2>
          <ul className="divide-y divide-line">
            {monthItems.map((item) => (
              <li key={item.url} className="py-7">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-start gap-2"
                >
                  <h3 className="display text-2xl leading-snug transition-colors group-hover:text-accent">
                    {item.title}
                    {item.draft && (
                      <span className="ml-3 align-middle font-sans text-[10px] font-medium uppercase tracking-widest text-accent">
                        Draft
                      </span>
                    )}
                  </h3>
                  <ArrowUpRight className="mt-1.5 h-5 w-5 shrink-0 text-muted transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                </a>
                <p className="mt-1 font-mono text-xs text-muted">
                  {[item.author, item.source].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-4 leading-relaxed">{item.summary}</p>
                {item.takeaway && (
                  <p className="mt-4 border-l-[3px] border-accent pl-4 text-muted">
                    <span className="font-medium text-fg">Why it stuck: </span>
                    {item.takeaway}
                  </p>
                )}
                {item.tags && item.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3 font-mono text-[11px] text-muted">
                    {item.tags.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTag(t)}
                        className="transition-colors hover:text-accent"
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
