// The content the console reads, from /console.json (built by
// src/app/console.json/route.ts). Fetched once, the first time it's needed.

export interface ConsoleData {
  personal: {
    name: string;
    title: string;
    location: string;
    currently: string;
    headline: string;
    bio: string;
    github: string;
    linkedin: string;
    url: string;
  };
  posts: {
    slug: string;
    title: string;
    date: string;
    summary: string;
    tags: string[];
    minutes: number;
    original?: string;
    markdown: string;
  }[];
  reading: {
    slug: string;
    title: string;
    url: string;
    author?: string;
    date: string;
    summary: string;
    takeaway?: string;
    tags?: string[];
    source: string;
  }[];
  projects: { slug: string; name: string; description: string; tech: string[]; github?: string; live?: string }[];
  work: { slug: string; title: string; company: string; location: string; period: string; summary: string; tech: string[] }[];
  education: { degree: string; school: string; location: string; period: string; note?: string }[];
  photos: {
    file: string;
    title: string;
    location?: string;
    caption?: string;
    taken?: string;
    camera?: string;
    settings?: string;
  }[];
}

let pending: Promise<ConsoleData> | null = null;
let loaded: ConsoleData | null = null;

export function loadData() {
  pending ??= fetch("/console.json")
    .then((r) => {
      if (!r.ok) throw new Error(`couldn't load the site's content (${r.status})`);
      return r.json() as Promise<ConsoleData>;
    })
    .then((d) => (loaded = d))
    .catch((e) => {
      pending = null; // try again next time
      throw e instanceof TypeError ? new Error("couldn't load the site's content (offline?)") : e;
    });
  return pending;
}

// For Tab completion, which can't wait: null until the first fetch lands
export const dataNow = () => loaded;
