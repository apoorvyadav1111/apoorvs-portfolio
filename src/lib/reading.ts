import entries from "@/data/reading.json";

export interface ReadingItem {
  title: string;
  url: string;
  author?: string;
  date: string; // when you read it, YYYY-MM-DD
  summary: string;
  takeaway?: string; // your own note on why it mattered
  tags?: string[];
  draft?: boolean;
  source: string; // derived from the url
}

// Drafts are visible while developing locally, hidden in production builds.
const showDrafts = process.env.NODE_ENV !== "production";

export function getReadingList(): ReadingItem[] {
  return (entries as Omit<ReadingItem, "source">[])
    .filter((e) => showDrafts || !e.draft)
    .map((e) => ({ ...e, source: new URL(e.url).hostname.replace(/^www\./, "") }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
